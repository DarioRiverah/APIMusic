import datetime

import jwt
import pytest

from .conftest import codigo_enviado

NUEVO = {'email': 'pepe@test.com', 'clave': 'clave123', 'nombres': 'José Luis',
         'apellidos': 'Rodríguez'}


def test_home(client):
    assert client.get('/').status_code == 200
    assert 'rock' in client.get('/genres').get_json()


# ---------- Registro + código ----------
def test_registro_envia_codigo_y_no_da_token(client, servicios):
    r = client.post('/auth/register', json={**NUEVO, 'email': 'Pepe@Test.com '})
    assert r.status_code == 201
    d = r.get_json()
    assert d['requiere_verificacion'] is True and 'token' not in d
    correo = servicios.correo.enviados[-1]
    assert correo['destino'] == 'pepe@test.com'
    assert codigo_enviado(servicios, 'pepe@test.com') in correo['asunto']
    # El código no se guarda en texto plano
    v = list(servicios.verificaciones.datos.values())[0]
    assert codigo_enviado(servicios, 'pepe@test.com') not in str(v)


def test_login_antes_de_verificar_da_403(client):
    client.post('/auth/register', json=NUEVO)
    r = client.post('/auth/login', json={'email': NUEVO['email'], 'clave': NUEVO['clave']})
    assert r.status_code == 403
    assert r.get_json()['requiere_verificacion'] is True


def test_verificar_y_luego_login(client, servicios):
    client.post('/auth/register', json=NUEVO)
    r = client.post('/auth/verify', json={'email': NUEVO['email'],
                                          'codigo': codigo_enviado(servicios, NUEVO['email'])})
    assert r.status_code == 200
    u = r.get_json()['usuario']
    assert u['nombres'] == 'José Luis' and u['apellidos'] == 'Rodríguez'
    assert u['nombre'] == 'José Luis Rodríguez' and u['rol'] == 'usuario'
    assert u['uid'] in servicios.auth.verificados
    r = client.post('/auth/login', json={'email': NUEVO['email'], 'clave': NUEVO['clave']})
    assert r.status_code == 200 and 'token' in r.get_json()


def test_codigo_incorrecto_cuenta_intentos(client):
    client.post('/auth/register', json=NUEVO)
    for restantes in (4, 3, 2, 1):
        r = client.post('/auth/verify', json={'email': NUEVO['email'], 'codigo': '000000'})
        assert r.status_code == 400 and f'{restantes} intento' in r.get_json()['error']
    client.post('/auth/verify', json={'email': NUEVO['email'], 'codigo': '000000'})
    r = client.post('/auth/verify', json={'email': NUEVO['email'], 'codigo': '000000'})
    assert r.status_code == 429


def test_codigo_vencido(client, servicios):
    client.post('/auth/register', json=NUEVO)
    for v in servicios.verificaciones.datos.values():
        v['expira_ts'] = 0
    r = client.post('/auth/verify', json={'email': NUEVO['email'],
                                          'codigo': codigo_enviado(servicios, NUEVO['email'])})
    assert r.status_code == 410


def test_reenviar_respeta_espera_y_cambia_codigo(client, servicios):
    client.post('/auth/register', json=NUEVO)
    viejo = codigo_enviado(servicios, NUEVO['email'])
    r = client.post('/auth/resend', json={'email': NUEVO['email']})
    assert r.status_code == 429 and r.get_json()['espera_segundos'] > 0
    for v in servicios.verificaciones.datos.values():
        v['enviado_ts'] -= 120                              # simula que pasaron 2 minutos
    assert client.post('/auth/resend', json={'email': NUEVO['email']}).status_code == 200
    nuevo = codigo_enviado(servicios, NUEVO['email'])
    if nuevo != viejo:      # el código viejo deja de servir
        r = client.post('/auth/verify', json={'email': NUEVO['email'], 'codigo': viejo})
        assert r.status_code == 400
    r = client.post('/auth/verify', json={'email': NUEVO['email'], 'codigo': nuevo})
    assert r.status_code == 200


def test_registrarse_otra_vez_sin_confirmar_reenvia(client, servicios):
    client.post('/auth/register', json=NUEVO)
    r = client.post('/auth/register', json=NUEVO)
    assert r.status_code == 200 and r.get_json()['requiere_verificacion']
    assert len(servicios.correo.enviados) == 2


def test_registro_correo_ya_confirmado(client, usuario):
    r = client.post('/auth/register', json={**NUEVO, 'email': 'ana@test.com'})
    assert r.status_code == 409


def test_verificar_cuenta_ya_confirmada(client, usuario):
    r = client.post('/auth/verify', json={'email': 'ana@test.com', 'codigo': '123456'})
    assert r.status_code == 409


@pytest.mark.parametrize('cambio', [
    {'email': 'malo'}, {'clave': '123'}, {'nombres': ''}, {'apellidos': '   '},
    {'nombres': 'R2-D2'}, {'apellidos': 'x' * 61}, {'nombres': None},
])
def test_registro_invalido(client, cambio):
    assert client.post('/auth/register', json={**NUEVO, **cambio}).status_code == 400


def test_verificar_datos_invalidos(client):
    assert client.post('/auth/verify', json={'email': 'a@b.co', 'codigo': '12'}).status_code == 400
    assert client.post('/auth/verify', json={'email': 'x@y.co', 'codigo': '123456'}).status_code == 404


# ---------- Login ----------
def test_login_credenciales_malas(client, usuario):
    r = client.post('/auth/login', json={'email': 'ana@test.com', 'clave': 'malaaa'})
    assert r.status_code == 401


def test_login_datos_invalidos(client):
    assert client.post('/auth/login', json={}).status_code == 400


# ---------- Google ----------
def test_google_crea_perfil(client, servicios):
    servicios.auth.tokens_google['tok-1'] = {
        'uid': 'g-123', 'email': 'laura@gmail.com', 'nombre': 'Laura Sofía Méndez',
        'foto_url': 'https://foto/laura.jpg'}
    r = client.post('/auth/google', json={'id_token': 'tok-1'})
    assert r.status_code == 201
    u = r.get_json()['usuario']
    assert u['nombres'] == 'Laura' and u['apellidos'] == 'Sofía Méndez'
    assert u['proveedor'] == 'google' and u['foto_url'] == 'https://foto/laura.jpg'
    # Segunda vez: ya existe, no lo duplica
    assert client.post('/auth/google', json={'id_token': 'tok-1'}).status_code == 200


def test_google_confirma_registro_pendiente(client, servicios):
    client.post('/auth/register', json=NUEVO)
    uid = servicios.auth.uid_por_email(NUEVO['email'])
    servicios.auth.tokens_google['tok-2'] = {'uid': uid, 'email': NUEVO['email'],
                                             'nombre': 'José', 'foto_url': None}
    assert client.post('/auth/google', json={'id_token': 'tok-2'}).status_code == 200
    r = client.post('/auth/login', json={'email': NUEVO['email'], 'clave': NUEVO['clave']})
    assert r.status_code == 200


def test_google_token_invalido(client):
    assert client.post('/auth/google', json={'id_token': 'falso'}).status_code == 401
    assert client.post('/auth/google', json={}).status_code == 400


# ---------- Perfil ----------
def test_yo_y_editar_perfil(client, usuario):
    r = client.get('/auth/me', headers=usuario)
    assert r.status_code == 200 and r.get_json()['nombres'] == 'Ana María'
    r = client.put('/auth/me', json={'apellidos': 'Pérez'}, headers=usuario)
    assert r.status_code == 200
    assert r.get_json()['usuario']['nombre'] == 'Ana María Pérez'
    assert client.put('/auth/me', json={}, headers=usuario).status_code == 400
    assert client.put('/auth/me', json={'nombres': '123'}, headers=usuario).status_code == 400


def test_yo_sin_token(client):
    assert client.get('/auth/me').status_code == 401


def test_token_expirado(client):
    vencido = jwt.encode({'uid': 'x', 'rol': 'admin',
                          'exp': datetime.datetime.now(datetime.timezone.utc)
                          - datetime.timedelta(minutes=1)},
                         'clave_de_pruebas_muy_larga_1234567890', algorithm='HS256')
    r = client.get('/auth/me', headers={'Authorization': f'Bearer {vencido}'})
    assert r.status_code == 401
    assert r.get_json()['error'] == 'Token expirado'


def test_token_falsificado_como_admin(client):
    falso = jwt.encode({'uid': 'x', 'rol': 'admin',
                        'exp': datetime.datetime.now(datetime.timezone.utc)
                        + datetime.timedelta(hours=1)},
                       'otra_clave_cualquiera_de_32_bytes!!', algorithm='HS256')
    r = client.delete('/songs/abc', headers={'Authorization': f'Bearer {falso}'})
    assert r.status_code == 401