import time

from flask import Blueprint, jsonify, request

from .auth import admin_required
from .servicios import servicios
from .validacion import (ErrorValidacion, datos_entrada, genero, lista_entrada,
                         subir_imagen, texto)

bp = Blueprint('artistas', __name__, url_prefix='/artists')


def publica_artista(a):
    return {'id': a['id'], 'nombre': a['nombre'], 'descripcion': a.get('descripcion', ''),
            'generos': a.get('generos', []), 'foto_url': a.get('foto_url')}


def _validar(data, parcial, s, artista_id=None):
    limpio = {}
    if 'nombre' in data or not parcial:
        nombre = texto(data, 'nombre', max_len=80)
        # No se permiten dos artistas con el mismo nombre (sin importar mayúsculas)
        repetido = s.artistas.listar(nombre_normalizado=nombre.lower())
        otros = [a for a in repetido if a['id'] != artista_id]
        if otros:
            raise ErrorValidacion(f'Ya existe un artista llamado "{otros[0]["nombre"]}"', 409)
        limpio['nombre'] = nombre
        limpio['nombre_normalizado'] = nombre.lower()
    if 'descripcion' in data or not parcial:
        limpio['descripcion'] = texto(data, 'descripcion', requerido=False, max_len=1000)
    generos = lista_entrada(data, 'generos')
    if generos is not None:
        limpio['generos'] = [genero(g, 'generos') for g in generos]
    elif not parcial:
        limpio['generos'] = []
    return limpio


def _propagar_nombre(s, artista_id, nombre):
    """Las canciones y álbumes guardan una copia del nombre: se actualiza."""
    for c in s.canciones.listar(artista_id=artista_id):
        s.canciones.actualizar(c['id'], {'artista_nombre': nombre})
    for c in s.canciones.listar_contiene('invitados_ids', artista_id):
        invitados = [{**i, 'nombre': nombre} if i['id'] == artista_id else i
                     for i in c.get('invitados', [])]
        s.canciones.actualizar(c['id'], {'invitados': invitados})
    for a in s.albumes.listar(artista_id=artista_id):
        s.albumes.actualizar(a['id'], {'artista_nombre': nombre})


@bp.errorhandler(ErrorValidacion)
def _error(e):
    return jsonify({'error': str(e)}), e.codigo


@bp.get('')
def listar_artistas():
    q = (request.args.get('q') or '').strip().lower()
    artistas = sorted(servicios().artistas.listar(), key=lambda a: a['nombre_normalizado'])
    if q:
        artistas = [a for a in artistas if q in a['nombre_normalizado']]
    return jsonify([publica_artista(a) for a in artistas]), 200


@bp.get('/<artista_id>')
def obtener_artista(artista_id):
    from .albumes import publica_album
    from .canciones import publica_cancion
    s = servicios()
    a = s.artistas.obtener(artista_id)
    if a is None:
        return jsonify({'error': 'Artista no encontrado'}), 404
    albumes = sorted(s.albumes.listar(artista_id=artista_id),
                     key=lambda x: x['anio_lanzamiento'], reverse=True)
    return jsonify({
        **publica_artista(a),
        'albumes': [publica_album(x) for x in albumes],
        'canciones': [publica_cancion(c) for c in s.canciones.listar(artista_id=artista_id)],
        'apariciones': [publica_cancion(c)
                        for c in s.canciones.listar_contiene('invitados_ids', artista_id)],
    }), 200


@bp.post('')
@admin_required
def crear_artista():
    s = servicios()
    datos = _validar(datos_entrada(), False, s)
    artista_id = s.artistas.nuevo_id()
    datos.update(subir_imagen(s.storage, 'foto', f'artistas/{artista_id}'))
    datos.setdefault('foto_url', None)
    datos['creado_ts'] = time.time()
    s.artistas.crear(artista_id, datos)
    return jsonify({'id': artista_id, 'message': 'Artista creado',
                    'artista': publica_artista({**datos, 'id': artista_id})}), 201


@bp.put('/<artista_id>')
@admin_required
def actualizar_artista(artista_id):
    s = servicios()
    actual = s.artistas.obtener(artista_id)
    if actual is None:
        return jsonify({'error': 'Artista no encontrado'}), 404
    datos = _validar(datos_entrada(), True, s, artista_id)
    datos.update(subir_imagen(s.storage, 'foto', f'artistas/{artista_id}', actual))
    if not datos:
        return jsonify({'error': 'No enviaste ningún campo para actualizar'}), 400
    s.artistas.actualizar(artista_id, datos)
    if 'nombre' in datos and datos['nombre'] != actual['nombre']:
        _propagar_nombre(s, artista_id, datos['nombre'])
    return jsonify({'message': 'Artista actualizado',
                    'artista': publica_artista(s.artistas.obtener(artista_id))}), 200


@bp.delete('/<artista_id>')
@admin_required
def eliminar_artista(artista_id):
    s = servicios()
    actual = s.artistas.obtener(artista_id)
    if actual is None:
        return jsonify({'error': 'Artista no encontrado'}), 404
    n_albumes = len(s.albumes.listar(artista_id=artista_id))
    n_canciones = len(s.canciones.listar(artista_id=artista_id)) + \
        len(s.canciones.listar_contiene('invitados_ids', artista_id))
    if n_albumes or n_canciones:
        return jsonify({'error': f'No se puede eliminar: tiene {n_albumes} álbum(es) y '
                                 f'{n_canciones} canción(es). Elimínalos o muévelos primero.'}), 409
    if actual.get('foto_ruta'):
        s.storage.eliminar(actual['foto_ruta'])
    s.artistas.eliminar(artista_id)
    return jsonify({'message': 'Artista eliminado'}), 200