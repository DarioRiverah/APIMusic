from .conftest import codigo_enviado


def pedir_codigo(client, email='ana@test.com'):
    return client.post('/auth/forgot', json={'email': email})


def test_flujo_completo_cambia_la_clave_y_abre_sesion(client, servicios, registrar):
    registrar()
    r = pedir_codigo(client)
    assert r.status_code == 200
    correo = servicios.correo.enviados[-1]
    assert 'restablecer' in correo['asunto'] and 'Restablece tu contraseña' in correo['html']
    r = client.post('/auth/reset', json={'email': 'ana@test.com', 'clave': 'nueva123',
                                         'codigo': codigo_enviado(servicios, 'ana@test.com')})
    assert r.status_code == 200 and r.get_json()['token']
    assert client.post('/auth/login', json={'email': 'ana@test.com', 'clave': 'secreta1'}).status_code == 401
    assert client.post('/auth/login', json={'email': 'ana@test.com', 'clave': 'nueva123'}).status_code == 200


def test_correo_inexistente_responde_igual_y_no_envia_nada(client, servicios):
    r = pedir_codigo(client, 'nadie@test.com')
    assert r.status_code == 200 and 'Si hay una cuenta' in r.get_json()['message']
    assert servicios.correo.enviados == []


def test_codigo_incorrecto_y_limite_de_intentos(client, servicios, registrar):
    registrar()
    pedir_codigo(client)
    bueno = codigo_enviado(servicios, 'ana@test.com')
    malo = '000000' if bueno != '000000' else '111111'
    for _ in range(5):
        r = client.post('/auth/reset', json={'email': 'ana@test.com', 'codigo': malo, 'clave': 'nueva123'})
        assert r.status_code == 400
    r = client.post('/auth/reset', json={'email': 'ana@test.com', 'codigo': bueno, 'clave': 'nueva123'})
    assert r.status_code == 429


def test_el_codigo_solo_sirve_una_vez(client, servicios, registrar):
    registrar()
    pedir_codigo(client)
    datos = {'email': 'ana@test.com', 'clave': 'nueva123',
             'codigo': codigo_enviado(servicios, 'ana@test.com')}
    assert client.post('/auth/reset', json=datos).status_code == 200
    assert client.post('/auth/reset', json=datos).status_code == 410


def test_espera_entre_reenvios(client, registrar):
    registrar()
    assert pedir_codigo(client).status_code == 200
    r = pedir_codigo(client)
    assert r.status_code == 429 and r.get_json()['espera_segundos'] > 0


def test_codigo_de_registro_no_sirve_para_cambiar_clave(client, servicios):
    client.post('/auth/register', json={'email': 'eva@test.com', 'clave': 'secreta1',
                                        'nombres': 'Eva', 'apellidos': 'Sol'})
    codigo_registro = codigo_enviado(servicios, 'eva@test.com')
    r = client.post('/auth/reset', json={'email': 'eva@test.com', 'codigo': codigo_registro,
                                         'clave': 'nueva123'})
    assert r.status_code == 410


def test_recuperar_tambien_confirma_una_cuenta_pendiente(client, servicios):
    client.post('/auth/register', json={'email': 'eva@test.com', 'clave': 'secreta1',
                                        'nombres': 'Eva', 'apellidos': 'Sol'})
    pedir_codigo(client, 'eva@test.com')
    r = client.post('/auth/reset', json={'email': 'eva@test.com', 'clave': 'nueva123',
                                         'codigo': codigo_enviado(servicios, 'eva@test.com')})
    assert r.status_code == 200
    assert client.post('/auth/login', json={'email': 'eva@test.com', 'clave': 'nueva123'}).status_code == 200


def test_validaciones(client):
    assert pedir_codigo(client, 'no-es-correo').status_code == 400
    r = client.post('/auth/reset', json={'email': 'a@test.com', 'codigo': '12', 'clave': 'nueva123'})
    assert r.status_code == 400
    r = client.post('/auth/reset', json={'email': 'a@test.com', 'codigo': '123456', 'clave': '123'})
    assert r.status_code == 400
    r = client.post('/auth/reset', json={'email': 'nadie@test.com', 'codigo': '123456', 'clave': 'nueva123'})
    assert r.status_code == 410