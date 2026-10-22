import time

from flask import Blueprint, jsonify, request

from .auth import admin_required
from .servicios import servicios
from .validacion import ErrorValidacion, anio, datos_entrada, subir_imagen, texto

bp = Blueprint('albumes', __name__, url_prefix='/albums')
TIPOS_ALBUM = ('album', 'ep', 'sencillo')


def publica_album(a):
    return {'id': a['id'], 'titulo': a['titulo'], 'tipo': a['tipo'],
            'anio_lanzamiento': a['anio_lanzamiento'], 'portada_url': a.get('portada_url'),
            'artista': {'id': a['artista_id'], 'nombre': a['artista_nombre']}}


def orden_pistas(canciones):
    """Primero por número de pista; las que no tienen número van al final."""
    return sorted(canciones, key=lambda c: (c.get('numero_pista') or 10_000,
                                            c.get('creado_ts', 0)))


def _validar(data, parcial, s, album_id=None, actual=None):
    limpio = {}
    if 'titulo' in data or not parcial:
        limpio['titulo'] = texto(data, 'titulo')
    if 'artista_id' in data or not parcial:
        artista = s.artistas.obtener(texto(data, 'artista_id'))
        if artista is None:
            raise ErrorValidacion('artista_id no corresponde a ningún artista')
        limpio['artista_id'] = artista['id']
        limpio['artista_nombre'] = artista['nombre']
    if 'anio_lanzamiento' in data or not parcial:
        limpio['anio_lanzamiento'] = anio(data)
    if 'tipo' in data or not parcial:
        tipo = (data.get('tipo') or 'album')
        if not isinstance(tipo, str) or tipo.strip().lower() not in TIPOS_ALBUM:
            raise ErrorValidacion(f'tipo debe ser uno de: {", ".join(TIPOS_ALBUM)}')
        limpio['tipo'] = tipo.strip().lower()
    # Un artista no puede tener dos álbumes con el mismo título
    titulo = limpio.get('titulo', actual and actual['titulo'])
    artista_id = limpio.get('artista_id', actual and actual['artista_id'])
    if 'titulo' in limpio or 'artista_id' in limpio:
        repetidos = [a for a in s.albumes.listar(artista_id=artista_id)
                     if a['titulo'].lower() == titulo.lower() and a['id'] != album_id]
        if repetidos:
            raise ErrorValidacion(f'Ese artista ya tiene un álbum llamado "{titulo}"', 409)
    return limpio


@bp.errorhandler(ErrorValidacion)
def _error(e):
    return jsonify({'error': str(e)}), e.codigo


@bp.get('')
def listar_albumes():
    artista_id = request.args.get('artist_id') or None
    albumes = servicios().albumes.listar(artista_id=artista_id)
    albumes.sort(key=lambda a: a['anio_lanzamiento'], reverse=True)
    return jsonify([publica_album(a) for a in albumes]), 200


@bp.get('/<album_id>')
def obtener_album(album_id):
    from .canciones import publica_cancion
    s = servicios()
    a = s.albumes.obtener(album_id)
    if a is None:
        return jsonify({'error': 'Álbum no encontrado'}), 404
    canciones = orden_pistas(s.canciones.listar(album_id=album_id))
    return jsonify({
        **publica_album(a),
        'total_canciones': len(canciones),
        'duracion_total_segundos': sum(c['duracion_segundos'] for c in canciones),
        'canciones': [publica_cancion(c) for c in canciones],
    }), 200


@bp.post('')
@admin_required
def crear_album():
    s = servicios()
    datos = _validar(datos_entrada(), False, s)
    album_id = s.albumes.nuevo_id()
    datos.update(subir_imagen(s.storage, 'portada', f'albumes/{album_id}'))
    datos.setdefault('portada_url', None)
    datos['creado_ts'] = time.time()
    s.albumes.crear(album_id, datos)
    return jsonify({'id': album_id, 'message': 'Álbum creado',
                    'album': publica_album({**datos, 'id': album_id})}), 201


@bp.put('/<album_id>')
@admin_required
def actualizar_album(album_id):
    s = servicios()
    actual = s.albumes.obtener(album_id)
    if actual is None:
        return jsonify({'error': 'Álbum no encontrado'}), 404
    datos = _validar(datos_entrada(), True, s, album_id, actual)
    datos.update(subir_imagen(s.storage, 'portada', f'albumes/{album_id}', actual))
    if not datos:
        return jsonify({'error': 'No enviaste ningún campo para actualizar'}), 400
    s.albumes.actualizar(album_id, datos)
    # Las canciones guardan copia del título y la portada del álbum
    copia = {}
    if 'titulo' in datos:
        copia['album_titulo'] = datos['titulo']
    if 'portada_url' in datos:
        copia['album_portada_url'] = datos['portada_url']
    if copia:
        for c in s.canciones.listar(album_id=album_id):
            s.canciones.actualizar(c['id'], copia)
    return jsonify({'message': 'Álbum actualizado',
                    'album': publica_album(s.albumes.obtener(album_id))}), 200


@bp.delete('/<album_id>')
@admin_required
def eliminar_album(album_id):
    s = servicios()
    actual = s.albumes.obtener(album_id)
    if actual is None:
        return jsonify({'error': 'Álbum no encontrado'}), 404
    n = len(s.canciones.listar(album_id=album_id))
    if n:
        return jsonify({'error': f'No se puede eliminar: tiene {n} canción(es). '
                                 'Elimínalas o cámbialas de álbum primero.'}), 409
    if actual.get('portada_ruta'):
        s.storage.eliminar(actual['portada_ruta'])
    s.albumes.eliminar(album_id)
    return jsonify({'message': 'Álbum eliminado'}), 200