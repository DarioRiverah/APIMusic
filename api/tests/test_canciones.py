import io

import pytest

from .conftest import form_cancion, mp3_falso


@pytest.fixture
def post_form(client, admin, artista):
    def _post(headers=None, artista_id=None, **campos):
        return client.post('/songs', data=form_cancion(artista_id or artista(), **campos),
                           headers=headers or admin, content_type='multipart/form-data')
    return _post


# ---------- Crear ----------
def test_crear_con_portada(post_form, servicios):
    r = post_form(portada=b'\xff\xd8imagen')
    assert r.status_code == 201
    c = r.get_json()['cancion']
    assert c['audio_url'].endswith('/audio.mp3')
    assert c['portada_url'].endswith('/portada.jpg')
    assert c['artista']['nombre'] == 'Carlos Vives'
    assert c['album'] is None and c['invitados'] == []
    assert 'audio_ruta' not in c                       # no se exponen rutas internas
    assert len(servicios.storage.archivos) == 2


def test_duracion_se_lee_del_mp3(post_form):
    r = post_form(audio=mp3_falso(200), duracion_segundos=None)
    assert r.status_code == 201
    assert r.get_json()['cancion']['duracion_segundos'] == 200


def test_sin_duracion_y_mp3_ilegible(post_form):
    assert post_form(duracion_segundos=None).status_code == 400


def test_crear_sin_audio(post_form):
    assert post_form(audio=None).status_code == 400


def test_crear_con_json_en_vez_de_form(client, admin):
    assert client.post('/songs', json={'titulo': 'x'}, headers=admin).status_code == 400


@pytest.mark.parametrize('campo,valor', [
    ('titulo', ''), ('genero', 'metal-cumbia'), ('anio_lanzamiento', '1800'),
    ('anio_lanzamiento', 'dos mil'), ('duracion_segundos', '0'), ('numero_pista', '0'),
])
def test_crear_datos_invalidos(post_form, campo, valor):
    r = post_form(**{campo: valor})
    assert r.status_code == 400
    assert 'error' in r.get_json()


def test_artista_inexistente(post_form):
    r = post_form(artista_id='no-existe')
    assert r.status_code == 400
    assert 'artista_id' in r.get_json()['error']


def test_audio_tipo_incorrecto(client, admin, artista):
    data = form_cancion(artista(), audio=None)
    data['audio'] = (io.BytesIO(b'hola'), 'virus.exe', 'application/octet-stream')
    r = client.post('/songs', data=data, headers=admin, content_type='multipart/form-data')
    assert r.status_code == 400


# ---------- Featuring ----------
def test_cancion_con_invitados(post_form, artista):
    karol, nicki = artista('Karol G'), artista('Nicki Minaj')
    r = post_form(artista_id=karol, titulo='Tusa', genero='reggaeton',
                  invitados_ids=[nicki, karol, nicki])        # repetidos y principal se limpian
    assert r.status_code == 201
    c = r.get_json()['cancion']
    assert c['artista']['nombre'] == 'Karol G'
    assert c['invitados'] == [{'id': nicki, 'nombre': 'Nicki Minaj'}]


def test_invitado_inexistente(post_form):
    assert post_form(invitados_ids=['fantasma']).status_code == 400


# ---------- Álbum ----------
def test_cancion_en_album_hereda_portada_y_anio(post_form, album):
    alb = album('Vives', anio=2017, portada=b'\x89PNGportada')
    r = post_form(album_id=alb, anio_lanzamiento=None, numero_pista=3)
    assert r.status_code == 201
    c = r.get_json()['cancion']
    assert c['album']['titulo'] == 'Vives'
    assert c['anio_lanzamiento'] == 2017
    assert c['portada_url'].endswith('albumes/' + alb + '/portada.png')
    assert c['numero_pista'] == 3


def test_portada_propia_gana_a_la_del_album(post_form, album):
    alb = album(portada=b'\x89PNGportada')
    c = post_form(album_id=alb, portada=b'\xff\xd8propia').get_json()['cancion']
    assert c['portada_url'].endswith('/portada.jpg')


def test_sencillo_sin_album_requiere_anio(post_form):
    assert post_form(anio_lanzamiento=None).status_code == 400


def test_album_inexistente(post_form):
    assert post_form(album_id='nada').status_code == 400


# ---------- Permisos ----------
def test_crear_sin_token(client, artista):
    r = client.post('/songs', data=form_cancion(artista()), content_type='multipart/form-data')
    assert r.status_code == 401


def test_usuario_normal_no_puede_crear(post_form, usuario):
    assert post_form(headers=usuario).status_code == 403


def test_usuario_normal_no_puede_borrar(client, usuario, crear):
    cid = crear()
    assert client.delete(f'/songs/{cid}', headers=usuario).status_code == 403


# ---------- Listar / consultar ----------
def test_listar_y_filtrar(client, crear, artista):
    crear()
    crear('Queen', titulo='Bohemian Rhapsody', genero='rock', anio_lanzamiento=1975)
    crear('Karol G', titulo='Tusa', genero='reggaeton', invitados_ids=[artista('Queen')])
    assert len(client.get('/songs').get_json()) == 3
    assert len(client.get('/songs?genero=rock').get_json()) == 1
    assert client.get('/songs?q=queen').get_json()[0]['titulo'] == 'Bohemian Rhapsody'
    # Queen aparece como principal en una y como invitado en otra
    titulos = {c['titulo'] for c in client.get(f'/songs?artist_id={artista("Queen")}').get_json()}
    assert titulos == {'Bohemian Rhapsody', 'Tusa'}
    assert client.get('/songs?q=nada').get_json() == []


def test_obtener(client, crear):
    cid = crear()
    r = client.get(f'/songs/{cid}')
    assert r.status_code == 200
    assert r.get_json()['artista']['nombre'] == 'Carlos Vives'


def test_obtener_inexistente(client):
    assert client.get('/songs/no-existe').status_code == 404


# ---------- Actualizar ----------
def test_actualizar_parcial_json(client, admin, crear):
    cid = crear()
    r = client.put(f'/songs/{cid}', json={'titulo': 'La Bicicleta (Remix)'}, headers=admin)
    assert r.status_code == 200
    c = client.get(f'/songs/{cid}').get_json()
    assert c['titulo'] == 'La Bicicleta (Remix)'
    assert c['artista']['nombre'] == 'Carlos Vives'     # lo demás no cambia


def test_actualizar_invitados_y_quitar_album(client, admin, crear, artista, album):
    alb = album()
    cid = crear(album_id=alb)
    shakira = artista('Shakira')
    c = client.put(f'/songs/{cid}', json={'invitados_ids': [shakira], 'album_id': ''},
                   headers=admin).get_json()['cancion']
    assert c['invitados'][0]['nombre'] == 'Shakira'
    assert c['album'] is None
    c = client.put(f'/songs/{cid}', json={'invitados_ids': []}, headers=admin).get_json()['cancion']
    assert c['invitados'] == []


def test_actualizar_reemplaza_audio(client, admin, crear, servicios):
    cid = crear()
    r = client.put(f'/songs/{cid}', headers=admin, content_type='multipart/form-data',
                   data={'audio': (io.BytesIO(mp3_falso(100)), 'n.mp3', 'audio/mpeg')})
    assert r.status_code == 200
    assert r.get_json()['cancion']['duracion_segundos'] == 100
    assert servicios.storage.archivos[f'canciones/{cid}/audio.mp3'][0] == mp3_falso(100)


def test_actualizar_invalido(client, admin, crear):
    cid = crear()
    assert client.put(f'/songs/{cid}', json={'genero': 'x'}, headers=admin).status_code == 400
    assert client.put(f'/songs/{cid}', json={}, headers=admin).status_code == 400


def test_actualizar_inexistente(client, admin):
    assert client.put('/songs/nada', json={'titulo': 'x'}, headers=admin).status_code == 404


# ---------- Eliminar ----------
def test_eliminar_borra_archivos_y_el_otro_permanece(client, admin, crear, servicios):
    id1 = crear(portada=b'img')
    id2 = crear(titulo='Otra')
    assert client.delete(f'/songs/{id1}', headers=admin).status_code == 200
    assert client.get(f'/songs/{id1}').status_code == 404
    assert client.get(f'/songs/{id2}').status_code == 200
    assert not any(r.startswith(f'canciones/{id1}/') for r in servicios.storage.archivos)


def test_eliminar_inexistente(client, admin):
    assert client.delete('/songs/nada', headers=admin).status_code == 404


# ---------- Seguridad ----------
def test_texto_malicioso_se_guarda_tal_cual(client, crear):
    cid = crear(titulo="x'); DROP TABLE canciones; --")
    assert client.get(f'/songs/{cid}').get_json()['titulo'] == "x'); DROP TABLE canciones; --"
    assert len(client.get('/songs').get_json()) == 1