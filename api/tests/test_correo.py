from app.servicios import correo as modulo
from app.servicios.correo import CorreoSMTP, plantilla_codigo


class SMTPFalso:
    enviados = []

    def __init__(self, host, puerto, **kw):
        self.host, self.puerto = host, puerto

    def __enter__(self):
        return self

    def __exit__(self, *a):
        pass

    def starttls(self, context=None):
        self.tls = True

    def login(self, usuario, clave):
        self.usuario = usuario

    def send_message(self, msg):
        SMTPFalso.enviados.append((self, msg))


def test_smtp_arma_el_mensaje(monkeypatch):
    monkeypatch.setattr(modulo.smtplib, 'SMTP', SMTPFalso)
    texto, html = plantilla_codigo('Ana', '123456', 15)
    CorreoSMTP('smtp.gmail.com', 587, 'yo@gmail.com', 'clave-app', '').enviar(
        'ana@test.com', '123456 es tu código', texto, html)
    conexion, msg = SMTPFalso.enviados[-1]
    assert conexion.tls and conexion.usuario == 'yo@gmail.com'
    assert msg['To'] == 'ana@test.com' and 'yo@gmail.com' in msg['From']
    assert '123456' in msg.get_body(('plain',)).get_content()
    assert '123456' in msg.get_body(('html',)).get_content()
    
    

# ---------- Plantillas ----------
def test_plantilla_codigo_casillas_y_logo():
    from app.servicios.correo import plantilla_codigo
    texto, html = plantilla_codigo('Laura', '482913', 15, 'APIMusic', 'https://cdn/logo.png')
    assert 'es: 482913' in texto
    for d in '482913':
        assert f'>{d}</div></td>' in html                 # cada dígito en su casilla
    assert 'src="https://cdn/logo.png"' in html
    assert 'Vence en 15 minutos' in html and 'Laura' in html
    assert '<style' not in html                            # solo estilos en línea (Gmail/Outlook)


def test_plantilla_sin_logo_usa_respaldo():
    from app.servicios.correo import plantilla_codigo
    _, html = plantilla_codigo('Ana', '000111', 15)
    assert '<img' not in html and '&#9835;' in html


def test_bienvenida_al_verificar(client, servicios):
    from .conftest import codigo_enviado
    client.post('/auth/register', json={'email': 'luz@test.com', 'clave': 'secreta1',
                                        'nombres': 'Luz Marina', 'apellidos': 'Paz'})
    client.post('/auth/verify', json={'email': 'luz@test.com',
                                      'codigo': codigo_enviado(servicios, 'luz@test.com')})
    ultimo = servicios.correo.enviados[-1]
    assert ultimo['destino'] == 'luz@test.com' and 'Bienvenido' in ultimo['asunto']
    assert 'Luz' in ultimo['asunto'] and 'Empezar a escuchar' in ultimo['html']


def test_bienvenida_con_google_solo_la_primera_vez(client, servicios):
    servicios.auth.tokens_google['t'] = {'uid': 'g1', 'email': 'g@gmail.com',
                                         'nombre': 'Gabo Ruiz', 'foto_url': None}
    client.post('/auth/google', json={'id_token': 't'})
    client.post('/auth/google', json={'id_token': 't'})
    bienvenidas = [c for c in servicios.correo.enviados if 'Bienvenido' in c['asunto']]
    assert len(bienvenidas) == 1


def test_si_falla_el_smtp_responde_502_y_se_puede_reintentar(client, servicios):
    def roto(*a, **k):
        raise OSError('sin internet')
    original = servicios.correo.enviar
    servicios.correo.enviar = roto
    datos = {'email': 'eva@test.com', 'clave': 'secreta1', 'nombres': 'Eva', 'apellidos': 'Sol'}
    r = client.post('/auth/register', json=datos)
    assert r.status_code == 502 and 'correo' in r.get_json()['error']
    servicios.correo.enviar = original                     # vuelve el internet
    r = client.post('/auth/register', json=datos)          # reintento: reenvía el código
    assert r.status_code == 200 and r.get_json()['requiere_verificacion']