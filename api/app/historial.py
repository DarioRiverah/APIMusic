import time

from flask import Blueprint, g, jsonify, request

from .auth import token_required
from .canciones import _publica
from .servicios import servicios

bp = Blueprint('historial', __name__, url_prefix='/me/history')


@bp.post('')
@token_required
def registrar_escucha():
    """La web lo llama cuando empieza a sonar una canción. Alimenta al DJ."""
    data = request.get_json(silent=True) or {}
    cancion_id = data.get('cancion_id')
    if not isinstance(cancion_id, str) or not cancion_id.strip():
        return jsonify({'error': 'Envía cancion_id'}), 400
    s = servicios()
    if s.canciones.obtener(cancion_id) is None:
        return jsonify({'error': 'Canción no encontrada'}), 404
    s.usuarios.agregar_historial(g.usuario['uid'], cancion_id, time.time())
    return jsonify({'message': 'Escucha registrada'}), 201


@bp.get('')
@token_required
def listar_historial():
    """Escuchado recientemente (sin repetir), de lo más nuevo a lo más viejo."""
    s = servicios()
    vistos, canciones = set(), []
    for cancion_id in s.usuarios.listar_historial(g.usuario['uid'], 100):
        if cancion_id in vistos:
            continue
        vistos.add(cancion_id)
        c = s.canciones.obtener(cancion_id)
        if c:
            canciones.append(_publica(c))
        if len(canciones) == 30:
            break
    return jsonify(canciones), 200
