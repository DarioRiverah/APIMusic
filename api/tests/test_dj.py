from flask import current_app


def catalogo(crear):
    """6 salsas de Willie Colón, 4 vallenatos de Carlos Vives y 3 rock de Queen."""
    ids = {'salsa': [crear('Willie Colón', titulo=f'Salsa {i}', genero='salsa') for i in range(6)],
           'vallenato': [crear('Carlos Vives', titulo=f'Vallenato {i}') for i in range(4)],
           'rock': [crear('Queen', titulo=f'Rock {i}', genero='rock') for i in range(3)]}
    return ids


def sesion(client, headers, **cuerpo):
    return client.post('/dj/session', json={'hora': 15, **cuerpo}, headers=headers)


# ---------- Historial ----------
def test_historial_registra_y_lista_sin_repetir(client, usuario, crear):
    a, b = crear(titulo='Uno'), crear(titulo='Dos')
    for cid in (a, b, a):
        assert client.post('/me/history', json={'cancion_id': cid}, headers=usuario).status_code == 201
    titulos = [c['titulo'] for c in client.get('/me/history', headers=usuario).get_json()]
    assert titulos == ['Uno', 'Dos']


def test_historial_validaciones(client, usuario):
    assert client.post('/me/history', json={}, headers=usuario).status_code == 400
    assert client.post('/me/history', json={'cancion_id': 'nada'}, headers=usuario).status_code == 404
    assert client.post('/me/history', json={'cancion_id': 'x'}).status_code == 401


# ---------- Selección ----------
def test_dj_sin_canciones(client, usuario):
    assert sesion(client, usuario).status_code == 404


def test_dj_requiere_sesion(client):
    assert client.post('/dj/session', json={}).status_code == 401


def test_mix_empieza_por_favoritas_y_sigue_con_el_genero(client, usuario, crear):
    ids = catalogo(crear)
    for cid in ids['salsa'][:2]:
        client.put(f'/me/favorites/{cid}', headers=usuario)
    r = sesion(client, usuario)
    assert r.status_code == 200
    datos = r.get_json()
    tipos = [b['tipo'] for b in datos['bloques']]
    assert tipos[0] == 'favoritas' and tipos[1] == 'genero'
    assert all(c['genero'] == 'salsa' for c in datos['bloques'][1]['canciones'])
    from app.dj import SALUDOS, limpiar
    saludos = [limpiar(t.format(nombre='Ana', dj='Lia')) for t in SALUDOS['tarde']]   # hora=15
    assert any(datos['bloques'][0]['frase'].startswith(t) for t in saludos)
    # Nombra la primera canción del bloque y quién la canta
    for b in datos['bloques']:
        assert b['canciones'][0]['titulo'] in b['frase']
        assert b['canciones'][0]['artista']['nombre'] in b['frase']
        assert '[pause' not in b['frase']                     # en pantalla va limpia
    todas = [c['id'] for b in datos['bloques'] for c in b['canciones']]
    assert len(todas) == len(set(todas))                      # sin repetir canciones


def test_vibra_por_genero(client, usuario, crear):
    catalogo(crear)
    datos = sesion(client, usuario, vibra='rock').get_json()
    assert datos['bloques'][0]['tipo'] == 'genero'
    assert {c['genero'] for c in datos['bloques'][0]['canciones']} == {'rock'}


def test_vibra_descubrir_evita_lo_escuchado(client, usuario, crear):
    ids = catalogo(crear)
    for cid in ids['salsa']:
        client.post('/me/history', json={'cancion_id': cid}, headers=usuario)
    datos = sesion(client, usuario, vibra='descubrir').get_json()
    assert datos['bloques'][0]['tipo'] == 'descubrir'
    assert not {c['id'] for c in datos['bloques'][0]['canciones']} & set(ids['salsa'])


def test_catalogo_pequeno_igual_suena(client, usuario, crear):
    crear(titulo='Única')
    datos = sesion(client, usuario).get_json()
    assert [c['titulo'] for b in datos['bloques'] for c in b['canciones']] == ['Única']


# ---------- Voz: caché y tope ----------
def test_voz_de_google_con_cache(client, usuario, crear, servicios):
    catalogo(crear)
    datos = sesion(client, usuario).get_json()
    assert datos['voz'] == 'google'
    assert all(b['audio_url'].startswith('https://storage.test/dj/voz/') for b in datos['bloques'])
    llamadas = len(servicios.voz.llamadas)
    gastado = servicios.dj.obtener(next(k for k in servicios.dj.datos if k.startswith('uso_')))['caracteres']
    assert gastado == sum(len(t) for t in servicios.voz.llamadas)
    # A Google le llegan las pausas de Chirp 3 HD
    assert any('[pause short]' in t for t in servicios.voz.llamadas)
    # Misma frase otra vez -> sale de la caché, no se vuelve a pedir a Google
    from app.dj import voces_para
    with client.application.app_context():
        primera = voces_para(servicios, ['Hola [pause short] mundo'])
        otra = voces_para(servicios, ['Hola [pause short] mundo'])
    assert primera == otra
    assert len(servicios.voz.llamadas) == llamadas + 1


def test_tope_mensual_pasa_a_voz_del_navegador(client, usuario, crear, servicios):
    catalogo(crear)
    client.application.config['TTS_LIMITE_MENSUAL'] = 10        # casi nada
    datos = sesion(client, usuario).get_json()
    assert datos['voz'] == 'navegador'
    assert all(b['audio_url'] is None for b in datos['bloques'])
    assert servicios.voz.llamadas == []


def test_limite_de_sesiones_con_voz_por_dia(client, usuario, crear, servicios):
    catalogo(crear)
    client.application.config['DJ_SESIONES_VOZ_DIA'] = 1
    assert sesion(client, usuario).get_json()['voz'] == 'google'
    assert sesion(client, usuario).get_json()['voz'] == 'navegador'


def test_si_google_falla_igual_responde(client, usuario, crear, servicios):
    catalogo(crear)
    servicios.voz.falla = True
    datos = sesion(client, usuario).get_json()
    assert datos['voz'] == 'navegador' and datos['bloques']


def test_voz_apagada(client, usuario, crear, servicios):
    catalogo(crear)
    servicios.voz = None
    assert sesion(client, usuario).get_json()['voz'] == 'navegador'


def test_uso_solo_admin(client, usuario, admin):
    assert client.get('/dj/usage', headers=usuario).status_code == 403
    r = client.get('/dj/usage', headers=admin).get_json()
    with client.application.app_context():
        assert r['limite'] == current_app.config['TTS_LIMITE_MENSUAL'] < r['gratis_google']


# ---------- Frases ----------
def test_frase_con_invitados_y_favorita():
    import random
    from app.dj import frase_para, limpiar
    c = {'id': 'x', 'titulo': 'TQG', 'artista_nombre': 'Karol G', 'invitados': [{'id': 'n', 'nombre': 'Nicki Minaj'}]}
    bloque = {'tipo': 'mix', 'variables': {}, 'canciones': [c]}
    texto = limpiar(frase_para(bloque, False, 'Ana', 'Lia', 15, random.Random(1), {'x'}))
    assert 'TQG, de Karol G con Nicki Minaj' in texto
    assert texto.endswith(('me gusta.', 'por cierto.'))


def test_limpiar_quita_pausas():
    from app.dj import limpiar
    assert limpiar('Hola… [pause short] ¿qué tal? [pause long] Bien') == 'Hola… ¿qué tal? Bien'
