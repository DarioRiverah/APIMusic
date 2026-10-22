import pytest

SEMILLA = [
    dict(artista_nombre='Carlos Vives', titulo='La Bicicleta', genero='vallenato',
         anio_lanzamiento=2016, duracion_segundos=228),
    dict(artista_nombre='Queen', titulo='Bohemian Rhapsody', genero='rock',
         anio_lanzamiento=1975, duracion_segundos=354),
    dict(artista_nombre='Eagles', titulo='Hotel California', genero='rock',
         anio_lanzamiento=1976, duracion_segundos=391),
    dict(artista_nombre='Nirvana', titulo='Smells Like Teen Spirit', genero='rock',
         anio_lanzamiento=1991, duracion_segundos=301),
    dict(artista_nombre='Marc Anthony', titulo='Vivir Mi Vida', genero='salsa',
         anio_lanzamiento=2013, duracion_segundos=251),
]


@pytest.fixture
def ids(crear):
    return [crear(**c) for c in SEMILLA]


# ---------- Playlists ----------
def test_playlist_rock_12_minutos(client, usuario, ids):
    r = client.post('/playlists/generate', headers=usuario,
                    json={'duracion_max_minutos': 12, 'genero': 'rock'})
    assert r.status_code == 200
    d = r.get_json()
    # 354 entra, 391 se pasa (745 > 720), 301 entra -> 655 s
    assert [c['titulo'] for c in d['canciones']] == \
        ['Bohemian Rhapsody', 'Smells Like Teen Spirit']
    assert d['duracion_total'] == '10:55'
    assert d['tiempo_restante_segundos'] == 65


def test_playlist_todos_los_generos(client, usuario, ids):
    d = client.post('/playlists/generate', headers=usuario,
                    json={'duracion_max_minutos': 10}).get_json()
    assert d['genero'] == 'todos'
    assert d['duracion_total'] == '9:42'


@pytest.mark.parametrize('body,codigo', [
    ({'duracion_max_minutos': 3, 'genero': 'rock'}, 404),
    ({'duracion_max_minutos': 30, 'genero': 'jazz'}, 404),
    ({}, 400),
    ({'duracion_max_minutos': '12'}, 400),
    ({'duracion_max_minutos': 12, 'genero': "rock' OR '1'='1"}, 400),
])
def test_playlist_errores(client, usuario, ids, body, codigo):
    assert client.post('/playlists/generate', json=body,
                       headers=usuario).status_code == codigo


def test_playlist_sin_token(client):
    assert client.post('/playlists/generate',
                       json={'duracion_max_minutos': 5}).status_code == 401


# ---------- Favoritos ----------
def test_favoritos_flujo(client, usuario, admin, ids):
    assert client.get('/me/favorites', headers=usuario).get_json() == []
    assert client.put(f'/me/favorites/{ids[1]}', headers=usuario).status_code == 200
    client.put(f'/me/favorites/{ids[1]}', headers=usuario)          # repetido no duplica
    client.put(f'/me/favorites/{ids[4]}', headers=usuario)
    favs = client.get('/me/favorites', headers=usuario).get_json()
    assert [f['titulo'] for f in favs] == ['Bohemian Rhapsody', 'Vivir Mi Vida']
    # Los favoritos son de cada usuario
    assert client.get('/me/favorites', headers=admin).get_json() == []
    client.delete(f'/me/favorites/{ids[1]}', headers=usuario)
    assert len(client.get('/me/favorites', headers=usuario).get_json()) == 1


def test_favorito_de_cancion_borrada_desaparece(client, usuario, admin, ids):
    client.put(f'/me/favorites/{ids[0]}', headers=usuario)
    client.delete(f'/songs/{ids[0]}', headers=admin)
    assert client.get('/me/favorites', headers=usuario).get_json() == []


def test_favorito_inexistente(client, usuario):
    assert client.put('/me/favorites/nada', headers=usuario).status_code == 404


def test_favoritos_sin_token(client):
    assert client.get('/me/favorites').status_code == 401