from flask import Blueprint, g, jsonify

from .auth import token_required
from .canciones import _publica
from .servicios import servicios

bp = Blueprint('favoritos', __name__, url_prefix='/me/favorites')


@bp.get('')
@token_required
def listar_favoritos():
    s = servicios()
    canciones = []
    for cancion_id in s.usuarios.listar_favoritos(g.usuario['uid']):
        c = s.canciones.obtener(cancion_id)
        if c:                                   # ignora canciones ya borradas
            canciones.append(_publica(c))
    return jsonify(canciones), 200


@bp.put('/<cancion_id>')
@token_required
def agregar_favorito(cancion_id):
    s = servicios()
    if s.canciones.obtener(cancion_id) is None:
        return jsonify({'error': 'Canción no encontrada'}), 404
    s.usuarios.agregar_favorito(g.usuario['uid'], cancion_id)
    return jsonify({'message': 'Agregada a favoritos'}), 200


@bp.delete('/<cancion_id>')
@token_required
def quitar_favorito(cancion_id):
    servicios().usuarios.quitar_favorito(g.usuario['uid'], cancion_id)
    return jsonify({'message': 'Quitada de favoritos'}), 200