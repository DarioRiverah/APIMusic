import io


# ---------- Artistas ----------
def test_crear_artista_con_foto(client, admin, servicios):
    r = client.post('/artists', headers=admin, content_type='multipart/form-data', data={
        'nombre': 'Shakira', 'descripcion': 'Cantante barranquillera',
        'generos': ['pop', 'rock'], 'foto': (io.BytesIO(b'\xff\xd8foto'), 'f.jpg', 'image/jpeg')})
    assert r.status_code == 201
    a = r.get_json()['artista']
    assert a['generos'] == ['pop', 'rock']
    assert a['foto_url'].endswith('/foto.jpg')
    assert len(servicios.storage.archivos) == 1


def test_artista_nombre_repetido(client, admin, artista):
    artista('Shakira')
    r = client.post('/artists', json={'nombre': 'shakira '}, headers=admin)
    assert r.status_code == 409


def test_artista_invalido(client, admin):
    assert client.post('/artists', json={'nombre': ''}, headers=admin).status_code == 400
    assert client.post('/artists', json={'nombre': 'X', 'generos': ['polka']},
                       headers=admin).status_code == 400


def test_artista_requiere_admin(client, usuario):
    assert client.post('/artists', json={'nombre': 'X'}).status_code == 401
    assert client.post('/artists', json={'nombre': 'X'}, headers=usuario).status_code == 403


def test_listar_y_buscar_artistas(client, artista):
    artista('Shakira'), artista('Juanes'), artista('Carlos Vives')
    nombres = [a['nombre'] for a in client.get('/artists').get_json()]
    assert nombres == ['Carlos Vives', 'Juanes', 'Shakira']       # orden alfabético
    assert len(client.get('/artists?q=sha').get_json()) == 1


def test_perfil_artista(client, artista, album, crear):
    alb = album('Vives', 'Carlos Vives')
    crear(album_id=alb)
    crear('Karol G', titulo='Feat', genero='reggaeton', invitados_ids=[artista('Carlos Vives')])
    p = client.get(f'/artists/{artista("Carlos Vives")}').get_json()
    assert [a['titulo'] for a in p['albumes']] == ['Vives']
    assert [c['titulo'] for c in p['canciones']] == ['La Bicicleta']
    assert [c['titulo'] for c in p['apariciones']] == ['Feat']


def test_renombrar_artista_actualiza_canciones_y_albumes(client, admin, artista, album, crear):
    alb = album()
    cid = crear(album_id=alb)
    otra = crear('Karol G', titulo='Feat', genero='reggaeton',
                 invitados_ids=[artista('Carlos Vives')])
    r = client.put(f'/artists/{artista("Carlos Vives")}', json={'nombre': 'C. Vives'},
                   headers=admin)
    assert r.status_code == 200
    assert client.get(f'/songs/{cid}').get_json()['artista']['nombre'] == 'C. Vives'
    assert client.get(f'/songs/{otra}').get_json()['invitados'][0]['nombre'] == 'C. Vives'
    assert client.get(f'/albums/{alb}').get_json()['artista']['nombre'] == 'C. Vives'


def test_no_borra_artista_con_canciones(client, admin, artista, crear):
    crear()
    r = client.delete(f'/artists/{artista()}', headers=admin)
    assert r.status_code == 409


def test_borrar_artista_libre(client, admin, artista):
    aid = artista('Nadie')
    assert client.delete(f'/artists/{aid}', headers=admin).status_code == 200
    assert client.get(f'/artists/{aid}').status_code == 404
    assert client.delete(f'/artists/{aid}', headers=admin).status_code == 404


# ---------- Álbumes ----------
def test_crear_album(client, admin, artista):
    r = client.post('/albums', json={'titulo': 'El Dorado', 'artista_id': artista('Shakira'),
                                     'anio_lanzamiento': 2017, 'tipo': 'album'}, headers=admin)
    assert r.status_code == 201
    a = r.get_json()['album']
    assert a['artista']['nombre'] == 'Shakira' and a['portada_url'] is None


def test_album_invalido(client, admin, artista):
    base = {'titulo': 'X', 'artista_id': artista(), 'anio_lanzamiento': 2017}
    assert client.post('/albums', json={**base, 'artista_id': 'nada'},
                       headers=admin).status_code == 400
    assert client.post('/albums', json={**base, 'tipo': 'mixtape'},
                       headers=admin).status_code == 400
    assert client.post('/albums', json={**base, 'anio_lanzamiento': 3000},
                       headers=admin).status_code == 400


def test_album_repetido_mismo_artista(client, admin, album, artista):
    album('Vives')
    r = client.post('/albums', json={'titulo': 'VIVES', 'artista_id': artista(),
                                     'anio_lanzamiento': 2017}, headers=admin)
    assert r.status_code == 409


def test_tracklist_ordenado(client, album, crear):
    alb = album()
    crear(titulo='Pista 2', album_id=alb, numero_pista=2)
    crear(titulo='Sin número', album_id=alb)
    crear(titulo='Pista 1', album_id=alb, numero_pista=1)
    d = client.get(f'/albums/{alb}').get_json()
    assert [c['titulo'] for c in d['canciones']] == ['Pista 1', 'Pista 2', 'Sin número']
    assert d['total_canciones'] == 3
    assert d['duracion_total_segundos'] == 228 * 3


def test_cambiar_portada_album_actualiza_canciones(client, admin, album, crear):
    alb = album()
    cid = crear(album_id=alb)
    assert client.get(f'/songs/{cid}').get_json()['portada_url'] is None
    r = client.put(f'/albums/{alb}', headers=admin, content_type='multipart/form-data',
                   data={'titulo': 'Vives (Deluxe)',
                         'portada': (io.BytesIO(b'\x89PNG'), 'p.png', 'image/png')})
    assert r.status_code == 200
    c = client.get(f'/songs/{cid}').get_json()
    assert c['album']['titulo'] == 'Vives (Deluxe)'
    assert c['portada_url'].endswith('/portada.png')


def test_listar_albumes_por_artista(client, album, artista):
    album('Vives', 'Carlos Vives', 2017)
    album('El Dorado', 'Shakira', 2017)
    assert len(client.get('/albums').get_json()) == 2
    assert len(client.get(f'/albums?artist_id={artista("Shakira")}').get_json()) == 1


def test_no_borra_album_con_canciones(client, admin, album, crear):
    alb = album()
    cid = crear(album_id=alb)
    assert client.delete(f'/albums/{alb}', headers=admin).status_code == 409
    client.delete(f'/songs/{cid}', headers=admin)
    assert client.delete(f'/albums/{alb}', headers=admin).status_code == 200


def test_album_inexistente(client):
    assert client.get('/albums/nada').status_code == 404