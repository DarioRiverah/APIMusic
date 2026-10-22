import io
import re

import pytest

from app import create_app
from app.servicios.memoria import crear_servicios_memoria


def mp3_falso(segundos):
    """mp3 mínimo válido (frames MPEG1 Layer III 128 kbps) que mutagen sabe leer."""
    frame = bytes([0xFF, 0xFB, 0x90, 0x64]) + bytes(413)   # 1 frame = 0.026122 s
    return frame * round(segundos / 0.026122)


def form_cancion(artista_id, audio=b'no-es-un-mp3', portada=None, **campos):
    """Arma el multipart que manda el panel admin para una canción."""
    data = {'titulo': 'La Bicicleta', 'artista_id': artista_id, 'genero': 'vallenato',
            'anio_lanzamiento': '2016', 'duracion_segundos': '228'}
    invitados = campos.pop('invitados_ids', None)
    data.update({k: str(v) for k, v in campos.items()})
    data = {k: v for k, v in data.items() if v != 'None'}
    if invitados is not None:
        data['invitados_ids'] = invitados or ''         # lista -> campo repetido
    if audio is not None:
        data['audio'] = (io.BytesIO(audio), 'cancion.mp3', 'audio/mpeg')
    if portada is not None:
        data['portada'] = (io.BytesIO(portada), 'portada.jpg', 'image/jpeg')
    return data


def codigo_enviado(servicios, email):
    """Saca el código de 6 dígitos del último correo enviado a `email`."""
    correo = [c for c in servicios.correo.enviados if c['destino'] == email][-1]
    return re.search(r'\b(\d{6})\b', correo['texto']).group(1)


@pytest.fixture
def servicios():
    return crear_servicios_memoria()


@pytest.fixture
def client(servicios):
    app = create_app({'TESTING': True,
                      'SECRET_KEY': 'clave_de_pruebas_muy_larga_1234567890'},
                     servicios=servicios)
    with app.test_client() as c:
        yield c


@pytest.fixture
def registrar(client, servicios):
    """Registra y confirma una cuenta; devuelve la respuesta de /auth/verify."""
    def _registrar(email='ana@test.com', clave='secreta1', nombres='Ana María',
                   apellidos='Pérez Gómez'):
        r = client.post('/auth/register', json={'email': email, 'clave': clave,
                                                'nombres': nombres, 'apellidos': apellidos})
        assert r.status_code == 201, r.get_json()
        r = client.post('/auth/verify', json={'email': email,
                                              'codigo': codigo_enviado(servicios, email)})
        assert r.status_code == 200, r.get_json()
        return r.get_json()
    return _registrar


@pytest.fixture
def usuario(registrar):
    return {'Authorization': f"Bearer {registrar()['token']}"}


@pytest.fixture
def admin(client, servicios, registrar):
    uid = registrar('dario@test.com', 'cloud2026', 'Darío Sebastián', 'Rivera')['usuario']['uid']
    servicios.usuarios.datos[uid]['rol'] = 'admin'          # lo que hace crear_admin.py
    r = client.post('/auth/login', json={'email': 'dario@test.com', 'clave': 'cloud2026'})
    return {'Authorization': f"Bearer {r.get_json()['token']}"}


@pytest.fixture
def artista(client, admin):
    """artista('Queen') -> id. Si ya existe lo reutiliza."""
    cache = {}

    def _artista(nombre='Carlos Vives', **campos):
        if nombre not in cache:
            r = client.post('/artists', json={'nombre': nombre, **campos}, headers=admin)
            assert r.status_code == 201, r.get_json()
            cache[nombre] = r.get_json()['id']
        return cache[nombre]
    return _artista


@pytest.fixture
def album(client, admin, artista):
    """album('Vives', 'Carlos Vives') -> id."""
    def _album(titulo='Vives', nombre_artista='Carlos Vives', anio=2017, portada=None):
        data = {'titulo': titulo, 'artista_id': artista(nombre_artista),
                'anio_lanzamiento': str(anio), 'tipo': 'album'}
        if portada:
            data['portada'] = (io.BytesIO(portada), 'p.png', 'image/png')
        r = client.post('/albums', data=data, headers=admin, content_type='multipart/form-data')
        assert r.status_code == 201, r.get_json()
        return r.get_json()['id']
    return _album


@pytest.fixture
def crear(client, admin, artista):
    """Crea una canción como admin y devuelve su id.
    Acepta artista='Queen' (nombre) para no tener que crear el artista a mano."""
    def _crear(artista_nombre='Carlos Vives', **campos):
        campos.pop('artista', None)
        r = client.post('/songs', data=form_cancion(artista(artista_nombre), **campos),
                        headers=admin, content_type='multipart/form-data')
        assert r.status_code == 201, r.get_json()
        return r.get_json()['id']
    return _crear