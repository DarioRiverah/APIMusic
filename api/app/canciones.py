import time

from flask import Blueprint, current_app, jsonify, request

from .auth import admin_required
from .servicios import servicios
from .validacion import (TIPOS_AUDIO, ErrorValidacion, anio, datos_entrada, duracion_mp3,
                         entero, es_formulario, genero, lista_entrada, subir_imagen,
                         texto, vacio, validar_archivo)

bp = Blueprint('canciones', __name__, url_prefix='/songs')
MAX_INVITADOS = 5


def publica_cancion(c):
    """Forma pública de una canción: datos anidados, sin rutas internas de Storage.
    Si la canción no tiene portada propia, usa la del álbum."""
    return {
        'id': c['id'],
        'titulo': c['titulo'],
        'genero': c['genero'],
        'anio_lanzamiento': c['anio_lanzamiento'],
        'duracion_segundos': c['duracion_segundos'],
        'numero_pista': c.get('numero_pista'),
        'audio_url': c['audio_url'],
        'portada_url': c.get('portada_url') or c.get('album_portada_url'),
        'artista': {'id': c['artista_id'], 'nombre': c['artista_nombre']},
        'invitados': c.get('invitados', []),
        'album': ({'id': c['album_id'], 'titulo': c['album_titulo']}
                  if c.get('album_id') else None),
    }


_publica = publica_cancion      # nombre usado por playlists y favoritos


def _validar(data, parcial, s, actual=None):
    limpio = {}
    if 'titulo' in data or not parcial:
        limpio['titulo'] = texto(data, 'titulo')
    if 'genero' in data or not parcial:
        limpio['genero'] = genero(data.get('genero'))

    # Artista principal
    if 'artista_id' in data or not parcial:
        artista = s.artistas.obtener(texto(data, 'artista_id'))
        if artista is None:
            raise ErrorValidacion('artista_id no corresponde a ningún artista')
        limpio['artista_id'] = artista['id']
        limpio['artista_nombre'] = artista['nombre']
    principal = limpio.get('artista_id', actual and actual['artista_id'])

    # Artistas invitados (featuring)
    invitados_ids = lista_entrada(data, 'invitados_ids')
    if invitados_ids is not None or not parcial:
        invitados_ids = [i for i in (invitados_ids or []) if i != principal]
        if len(invitados_ids) > MAX_INVITADOS:
            raise ErrorValidacion(f'Máximo {MAX_INVITADOS} artistas invitados')
        invitados = []
        for i in invitados_ids:
            a = s.artistas.obtener(i)
            if a is None:
                raise ErrorValidacion(f'El artista invitado {i} no existe')
            invitados.append({'id': a['id'], 'nombre': a['nombre']})
        limpio['invitados_ids'] = invitados_ids
        limpio['invitados'] = invitados
    elif 'artista_id' in limpio and actual and principal in actual.get('invitados_ids', []):
        # Si el nuevo principal estaba como invitado, se quita de invitados
        limpio['invitados_ids'] = [i for i in actual['invitados_ids'] if i != principal]
        limpio['invitados'] = [i for i in actual['invitados'] if i['id'] != principal]

    # Álbum (opcional: sin álbum = sencillo suelto)
    album = None
    if 'album_id' in data or not parcial:
        if vacio(data.get('album_id')):
            limpio.update(album_id=None, album_titulo=None, album_portada_url=None)
        else:
            album = s.albumes.obtener(texto(data, 'album_id'))
            if album is None:
                raise ErrorValidacion('album_id no corresponde a ningún álbum')
            limpio.update(album_id=album['id'], album_titulo=album['titulo'],
                          album_portada_url=album.get('portada_url'))

    # Año: si no se envía y hay álbum, se toma el del álbum
    if not vacio(data.get('anio_lanzamiento')):
        limpio['anio_lanzamiento'] = anio(data)
    elif not parcial:
        if album is None:
            raise ErrorValidacion('anio_lanzamiento es obligatorio si la canción no tiene álbum')
        limpio['anio_lanzamiento'] = album['anio_lanzamiento']

    if 'numero_pista' in data:
        if vacio(data.get('numero_pista')):
            limpio['numero_pista'] = None
        else:
            n = entero(data.get('numero_pista'))
            if n is None or not (1 <= n <= 99):
                raise ErrorValidacion('numero_pista debe ser un entero entre 1 y 99')
            limpio['numero_pista'] = n
    elif not parcial:
        limpio['numero_pista'] = None

    if not vacio(data.get('duracion_segundos')):
        d = entero(data.get('duracion_segundos'))
        if d is None or d <= 0:
            raise ErrorValidacion('duracion_segundos debe ser un entero mayor que 0')
        limpio['duracion_segundos'] = d
    return limpio


def _subir_audio(s, cancion_id, actual=None):
    archivo = request.files.get('audio')
    if not archivo or not archivo.filename:
        return None, None
    contenido, ext, tipo = validar_archivo(
        archivo, TIPOS_AUDIO, current_app.config['MAX_AUDIO_MB'], 'audio')
    if actual and actual.get('audio_ruta'):
        s.storage.eliminar(actual['audio_ruta'])
    ruta = f'canciones/{cancion_id}/audio.{ext}'
    return {'audio_url': s.storage.subir(ruta, contenido, tipo), 'audio_ruta': ruta}, contenido


@bp.errorhandler(ErrorValidacion)
def _error(e):
    return jsonify({'error': str(e)}), e.codigo


@bp.get('')
def listar_canciones():
    s = servicios()
    genero_f = (request.args.get('genero') or '').strip().lower() or None
    album_id = request.args.get('album_id') or None
    artista_id = request.args.get('artist_id') or None
    q = (request.args.get('q') or '').strip().lower()

    if artista_id:      # como principal o como invitado
        canciones = s.canciones.listar(artista_id=artista_id, genero=genero_f, album_id=album_id)
        canciones += [c for c in s.canciones.listar_contiene('invitados_ids', artista_id)
                      if (not genero_f or c['genero'] == genero_f)
                      and (not album_id or c.get('album_id') == album_id)]
    else:
        canciones = s.canciones.listar(genero=genero_f, album_id=album_id)
    if q:
        def coincide(c):
            textos = [c['titulo'], c['artista_nombre'], c.get('album_titulo') or '',
                      *[i['nombre'] for i in c.get('invitados', [])]]
            return any(q in t.lower() for t in textos)
        canciones = [c for c in canciones if coincide(c)]
    return jsonify([publica_cancion(c) for c in canciones]), 200


@bp.get('/<cancion_id>')
def obtener_cancion(cancion_id):
    c = servicios().canciones.obtener(cancion_id)
    if c is None:
        return jsonify({'error': 'Canción no encontrada'}), 404
    return jsonify(publica_cancion(c)), 200


@bp.post('')
@admin_required
def crear_cancion():
    if not es_formulario():
        return jsonify({'error': 'Envía multipart/form-data con el audio'}), 400
    s = servicios()
    datos = _validar(datos_entrada(), False, s)
    if not request.files.get('audio') or not request.files['audio'].filename:
        raise ErrorValidacion('audio es obligatorio')

    cancion_id = s.canciones.nuevo_id()
    # Se valida todo antes de subir para no dejar archivos huérfanos en Storage
    archivo = request.files['audio']
    contenido, ext, tipo = validar_archivo(
        archivo, TIPOS_AUDIO, current_app.config['MAX_AUDIO_MB'], 'audio')
    duracion = duracion_mp3(contenido) or datos.get('duracion_segundos')
    if not duracion:
        raise ErrorValidacion('No se pudo leer la duración del mp3; envía duracion_segundos')
    datos['duracion_segundos'] = duracion

    ruta = f'canciones/{cancion_id}/audio.{ext}'
    datos['audio_url'] = s.storage.subir(ruta, contenido, tipo)
    datos['audio_ruta'] = ruta
    datos.update(subir_imagen(s.storage, 'portada', f'canciones/{cancion_id}'))
    datos.setdefault('portada_url', None)
    datos['creado_ts'] = time.time()
    s.canciones.crear(cancion_id, datos)
    return jsonify({'id': cancion_id, 'message': 'Canción creada',
                    'cancion': publica_cancion({**datos, 'id': cancion_id})}), 201


@bp.put('/<cancion_id>')
@admin_required
def actualizar_cancion(cancion_id):
    s = servicios()
    actual = s.canciones.obtener(cancion_id)
    if actual is None:
        return jsonify({'error': 'Canción no encontrada'}), 404
    datos = _validar(datos_entrada(), True, s, actual)

    audio, contenido = _subir_audio(s, cancion_id, actual)
    if audio:
        datos.update(audio)
        datos['duracion_segundos'] = duracion_mp3(contenido) or \
            datos.get('duracion_segundos') or actual['duracion_segundos']
    datos.update(subir_imagen(s.storage, 'portada', f'canciones/{cancion_id}', actual))

    if not datos:
        return jsonify({'error': 'No enviaste ningún campo para actualizar'}), 400
    s.canciones.actualizar(cancion_id, datos)
    return jsonify({'message': 'Canción actualizada',
                    'cancion': publica_cancion(s.canciones.obtener(cancion_id))}), 200


@bp.delete('/<cancion_id>')
@admin_required
def eliminar_cancion(cancion_id):
    s = servicios()
    actual = s.canciones.obtener(cancion_id)
    if actual is None:
        return jsonify({'error': 'Canción no encontrada'}), 404
    for campo in ('audio_ruta', 'portada_ruta'):
        if actual.get(campo):
            s.storage.eliminar(actual[campo])
    s.canciones.eliminar(cancion_id)
    return jsonify({'message': 'Canción eliminada'}), 200