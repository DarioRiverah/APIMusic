from flask import Blueprint, current_app, jsonify, request

from .auth import token_required
from .canciones import _publica
from .servicios import servicios

bp = Blueprint('playlists', __name__, url_prefix='/playlists')


def formato_mmss(segundos):
    return f'{segundos // 60}:{segundos % 60:02d}'


@bp.post('/generate')
@token_required
def generar_playlist():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({'error': 'Envía un objeto JSON'}), 400
    minutos = data.get('duracion_max_minutos')
    if type(minutos) is not int or not (1 <= minutos <= 600):
        return jsonify({'error': 'duracion_max_minutos debe ser un entero '
                                 'entre 1 y 600'}), 400
    genero = data.get('genero')
    generos = current_app.config['GENEROS']
    if genero is not None:
        if not isinstance(genero, str) or genero.strip().lower() not in generos:
            return jsonify({'error': 'genero no permitido. Usa uno de: '
                            + ', '.join(generos)}), 400
        genero = genero.strip().lower()

    limite = minutos * 60
    playlist, total = [], 0
    # Recorre en orden de creación y agrega solo las que caben en el tiempo
    for c in servicios().canciones.listar(genero=genero):
        if total + c['duracion_segundos'] <= limite:
            playlist.append(_publica(c))
            total += c['duracion_segundos']

    if not playlist:
        return jsonify({'error': 'No hay canciones que cumplan las '
                                 'condiciones pedidas'}), 404
    return jsonify({
        'genero': genero or 'todos',
        'duracion_max': formato_mmss(limite),
        'total_canciones': len(playlist),
        'duracion_total_segundos': total,
        'duracion_total': formato_mmss(total),
        'tiempo_restante_segundos': limite - total,
        'canciones': playlist,
    }), 200