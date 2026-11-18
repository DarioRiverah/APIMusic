"""DJ de UnderTone: arma una sesión de bloques de canciones con lo que dice el DJ entre ellos.

1. Selección: con los me gusta y el historial del usuario saca su artista y género favoritos.
2. Frases: plantillas en español con variables (no usa IA paga).
3. Voz: Google Text-to-Speech (Chirp 3 HD) con caché y un tope mensual de caracteres por
   debajo del plan gratis. Si se llega al tope, o la voz está apagada, la web usa la voz del navegador.
"""
import datetime
import hashlib
import random
import re
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from flask import Blueprint, current_app, g, jsonify, request

from .auth import admin_required, token_required
from .canciones import _publica
from .servicios import servicios

bp = Blueprint('dj', __name__, url_prefix='/dj')
POR_BLOQUE = 4
MAX_BLOQUES = 3
try:
    ZONA = ZoneInfo('America/Bogota')
except ZoneInfoNotFoundError:      # Windows sin el paquete tzdata: Colombia es UTC-5 todo el año
    ZONA = datetime.timezone(datetime.timedelta(hours=-5))

NOMBRE_GENERO = {'electronica': 'electrónica', 'clasica': 'música clásica', 'reggaeton': 'reggaetón',
                 'otro': 'variado'}

# Las frases se escriben como se hablan: comas, puntos suspensivos y [pause short]
# (pausas de Chirp 3 HD). Para mostrarlas en pantalla o para la voz del navegador
# se quitan las pausas con limpiar().
SALUDOS = {
    'manana': ['¡Buenos días, {nombre}! [pause short] Aquí {dj}, tu DJ en UnderTone.',
               '¡Hola, hola, {nombre}! [pause short] Arrancamos el día con {dj}.',
               '¡Qué más, {nombre}! Buenos días… [pause short] {dj} al mando, vamos a arrancar.'],
    'tarde': ['¡Buenas tardes, {nombre}! [pause short] Aquí {dj}, lista para acompañarte.',
              'Bueno, {nombre}… [pause short] ¿qué tal va esa tarde? Soy {dj}.',
              '¡Hola, {nombre}! {dj} por acá… [pause short] y te tengo algo bueno.'],
    'noche': ['¡Buenas noches, {nombre}! [pause short] Aquí {dj}, para cerrar el día con buena música.',
              'Ya es de noche, {nombre}… [pause short] Soy {dj}, y esto apenas empieza.',
              '¡Qué más, {nombre}! [pause short] {dj} en la noche de UnderTone.'],
}

# {cancion} y {con} son la primera canción del bloque y quiénes la cantan
INTROS = {
    'favoritas': ['Empezamos con una que ya tiene tu corazón… [pause short] {cancion}, de {con}.',
                  'Uff, esta te la sabes. [pause short] {cancion}, de {con}… y siguen más de tus favoritas.',
                  'Primero, tus me gusta. [pause short] Abre {cancion}, de {con}.'],
    'artista': ['Se nota que {artista} está en tu rotación… [pause short] así que aquí va {cancion}.',
                'Últimamente le has dado mucho play a {artista}. [pause short] Seguimos con {cancion}.'],
    'genero': ['Ojo, que viene bloque de {genero}… [pause short] arrancando con {cancion}, de {con}.',
               'Tu género del momento es {genero}, ¿cierto? [pause short] Pues va {cancion}, de {con}.',
               'Bueno… [pause short] más {genero}, que sé que te gusta. Suena {cancion}, de {con}.'],
    'descubrir': ['Ahora, algo que todavía no has escuchado aquí… [pause short] {cancion}, de {con}. A ver qué te parece.',
                  'Hora de descubrir. [pause short] Te presento {cancion}, de {con}. Si te gusta, ya sabes: corazón.',
                  'Esta no ha sonado en tu cuenta… todavía. [pause short] {cancion}, de {con}.'],
    'mix': ['Seguimos con un poco de todo… [pause short] empezando por {cancion}, de {con}.',
            'Cambiamos un poco el ritmo. [pause short] Suena {cancion}, de {con}.',
            'Y para seguir el viaje… [pause short] {cancion}, de {con}.'],
}

# Si la canción ya es favorita (y el bloque no es de favoritas), Lia lo comenta
YA_FAVORITA = [' Y esa ya la tienes en tus me gusta.', ' Una de tus favoritas, por cierto.']

_PAUSA = re.compile(r'\s*\[pause(?: short| long)?\]\s*')


def limpiar(texto):
    """Quita las marcas de pausa: así se ve en pantalla y lo lee la voz del navegador."""
    return re.sub(r'\s{2,}', ' ', _PAUSA.sub(' ', texto)).strip()


def _quienes(c):
    """'Karol G', 'Karol G con Nicki Minaj' o 'Karol G, Feid y Nicki Minaj'."""
    nombres = [c['artista_nombre']] + [i['nombre'] for i in c.get('invitados', [])]
    if len(nombres) == 1:
        return nombres[0]
    if len(nombres) == 2:
        return f'{nombres[0]} con {nombres[1]}'
    return ', '.join(nombres[:-1]) + f' y {nombres[-1]}'


def _momento(hora):
    return 'manana' if 5 <= hora < 12 else 'tarde' if 12 <= hora < 19 else 'noche'


def _gustos(canciones, favoritos, historial):
    """Cuenta artistas y géneros: un me gusta pesa 3, una escucha pesa 1."""
    artistas, generos = Counter(), Counter()
    por_id = {c['id']: c for c in canciones}
    for ids, peso in ((favoritos, 3), (historial, 1)):
        for cid in ids:
            c = por_id.get(cid)
            if c:
                artistas[(c['artista_id'], c['artista_nombre'])] += peso
                generos[c['genero']] += peso
    return artistas, generos


def armar_bloques(canciones, favoritos, historial, vibra, rnd):
    """Devuelve [{tipo, variables, canciones}] sin repetir canciones entre bloques."""
    favs = set(favoritos)
    escuchadas = set(historial)
    recientes = set(historial[:15])
    artistas, generos = _gustos(canciones, favoritos, historial)
    top_artista = artistas.most_common(1)[0][0] if artistas else None
    top_genero = generos.most_common(1)[0][0] if generos else None
    usadas = set()

    def tomar(candidatas):
        libres = [c for c in candidatas if c['id'] not in usadas]
        rnd.shuffle(libres)
        libres.sort(key=lambda c: c['id'] in recientes)      # lo recién oído, al final
        elegidas = libres[:POR_BLOQUE]
        usadas.update(c['id'] for c in elegidas)
        return elegidas

    def de_artista(aid):
        return [c for c in canciones if c['artista_id'] == aid or aid in c.get('invitados_ids', [])]

    planes = []
    if vibra in current_app.config['GENEROS']:
        planes = [('genero', [c for c in canciones if c['genero'] == vibra], {'genero': vibra}),
                  ('mix', canciones, {})]
    elif vibra == 'descubrir':
        nuevas = [c for c in canciones if c['id'] not in escuchadas and c['id'] not in favs]
        planes = [('descubrir', nuevas, {}), ('mix', canciones, {})]
    elif vibra == 'favoritas':
        planes = [('favoritas', [c for c in canciones if c['id'] in favs], {}),
                  ('artista', de_artista(top_artista[0]) if top_artista else [], {}),
                  ('mix', canciones, {})]
    else:   # mix personalizado
        planes = [('favoritas', [c for c in canciones if c['id'] in favs], {}),
                  ('genero', [c for c in canciones if c['genero'] == top_genero] if top_genero else [],
                   {'genero': top_genero}),
                  ('descubrir', [c for c in canciones if c['id'] not in escuchadas and c['id'] not in favs], {}),
                  ('mix', canciones, {})]

    bloques = []
    for tipo, candidatas, variables in planes:
        if len(bloques) == MAX_BLOQUES:
            break
        elegidas = tomar(candidatas)
        if not elegidas:
            continue
        if tipo in ('favoritas', 'artista'):
            nombres = Counter(c['artista_nombre'] for c in elegidas)
            variables = {'artista': (top_artista[1] if top_artista and tipo == 'artista'
                                     else nombres.most_common(1)[0][0])}
        bloques.append({'tipo': tipo, 'variables': variables, 'canciones': elegidas})
    # Si el catálogo es pequeño, el último bloque de mix rellena hasta tener algo que sonar
    if not bloques:
        elegidas = tomar(canciones)
        if elegidas:
            bloques.append({'tipo': 'mix', 'variables': {}, 'canciones': elegidas})
    return bloques


def frase_para(bloque, primero, nombre, dj, hora, rnd, favoritos=()):
    """Devuelve la frase con marcas de pausa (para Google)."""
    primera = bloque['canciones'][0]
    variables = {'nombre': nombre, 'dj': dj, 'cancion': primera['titulo'], 'con': _quienes(primera),
                 **bloque['variables']}
    if 'genero' in variables:
        variables['genero'] = NOMBRE_GENERO.get(variables['genero'], variables['genero'])
    texto = rnd.choice(INTROS[bloque['tipo']]).format(**variables)
    if bloque['tipo'] != 'favoritas' and primera['id'] in favoritos:
        texto += rnd.choice(YA_FAVORITA)
    if primero:
        texto = rnd.choice(SALUDOS[_momento(hora)]).format(**variables) + ' ' + texto
    return texto


# ---------- Voz con tope y caché ----------
def _mes():
    return datetime.datetime.now(ZONA).strftime('%Y-%m')


def caracteres_usados(s):
    return (s.dj.obtener(f'uso_{_mes()}') or {}).get('caracteres', 0)


def voces_para(s, textos):
    """Devuelve {texto: url | None}. Reusa audios ya generados y no se pasa del tope mensual."""
    cfg = current_app.config
    resultado, pendientes = {}, []
    for t in textos:
        clave = hashlib.sha1(f'{s.voz.voz}|{getattr(s.voz, "velocidad", 1)}|{t}'.encode()).hexdigest()
        guardado = s.dj.obtener(f'voz_{clave}')
        if guardado:
            resultado[t] = guardado['url']                 # caché: no cuesta nada
        else:
            pendientes.append((t, clave))
    disponibles = cfg['TTS_LIMITE_MENSUAL'] - caracteres_usados(s)
    permitidos = []
    for t, clave in pendientes:
        if len(t) <= disponibles:
            permitidos.append((t, clave))
            disponibles -= len(t)
        else:
            resultado[t] = None                            # tope alcanzado: voz del navegador
    if permitidos:
        log = current_app.logger          # los hilos no tienen el contexto de Flask
        with ThreadPoolExecutor(max_workers=3) as hilos:
            audios = list(hilos.map(lambda p: _sintetizar(s, p[0], log), permitidos))
        for (t, clave), audio in zip(permitidos, audios):
            if audio is None:
                resultado[t] = None
                continue
            s.dj.incrementar(f'uso_{_mes()}', 'caracteres', len(t))
            url = s.storage.subir(f'dj/voz/{clave}.mp3', audio, 'audio/mpeg')
            s.dj.crear(f'voz_{clave}', {'url': url, 'caracteres': len(t)})
            resultado[t] = url
    return resultado


def _sintetizar(s, texto, log):
    try:
        return s.voz.sintetizar(texto)
    except Exception as e:      # sin voz de Google: la web usa la del navegador
        log.warning('Voz del DJ no disponible: %s', e)
        return None


@bp.post('/session')
@token_required
def sesion():
    data = request.get_json(silent=True) or {}
    vibra = (data.get('vibra') or 'mix').strip().lower()
    hora = data.get('hora')
    if type(hora) is not int or not 0 <= hora <= 23:
        hora = datetime.datetime.now(ZONA).hour
    s = servicios()
    cfg = current_app.config
    uid = g.usuario['uid']
    canciones = s.canciones.listar()
    if not canciones:
        return jsonify({'error': 'Todavía no hay canciones para el DJ'}), 404

    rnd = random.Random()
    favoritos = s.usuarios.listar_favoritos(uid)
    bloques = armar_bloques(canciones, favoritos, s.usuarios.listar_historial(uid, 100), vibra, rnd)
    perfil = s.usuarios.obtener(uid) or {}
    nombre = (perfil.get('nombres') or 'amigo').split()[0]
    for i, b in enumerate(bloques):
        b['marcado'] = frase_para(b, i == 0, nombre, cfg['NOMBRE_DJ'], hora, rnd, set(favoritos))
        b['frase'] = limpiar(b['marcado'])

    # Voz de Google solo si está activa y el usuario no ha abusado hoy
    voz = 'navegador'
    urls = {}
    if s.voz is not None:
        hoy = datetime.datetime.now(ZONA).strftime('%Y-%m-%d')
        s.dj.incrementar(f'dia_{uid}_{hoy}', 'sesiones')
        if (s.dj.obtener(f'dia_{uid}_{hoy}') or {}).get('sesiones', 0) <= cfg['DJ_SESIONES_VOZ_DIA']:
            urls = voces_para(s, [b['marcado'] for b in bloques])
            if any(urls.values()):
                voz = 'google'

    return jsonify({
        'dj': cfg['NOMBRE_DJ'],
        'vibra': vibra,
        'voz': voz,
        'bloques': [{'tipo': b['tipo'], 'frase': b['frase'], 'audio_url': urls.get(b['marcado']),
                     'canciones': [_publica(c) for c in b['canciones']]} for b in bloques],
    }), 200


@bp.get('/usage')
@admin_required
def uso():
    """Para el admin: cuántos caracteres de voz van este mes y cuál es el tope."""
    s = servicios()
    return jsonify({'mes': _mes(), 'caracteres': caracteres_usados(s),
                    'limite': current_app.config['TTS_LIMITE_MENSUAL'],
                    'gratis_google': 1_000_000, 'voz_activa': s.voz is not None}), 200
