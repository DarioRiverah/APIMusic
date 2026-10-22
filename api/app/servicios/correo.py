"""Envío de correos: SMTP real, consola (desarrollo) o memoria (pruebas)."""
import smtplib
import ssl
from email.message import EmailMessage


class CorreoSMTP:
    """Funciona con Gmail (contraseña de aplicación), Brevo, Outlook, etc."""

    def __init__(self, host, puerto, usuario, clave, remitente, nombre='APIMusic'):
        self.host, self.puerto = host, int(puerto)
        self.usuario, self.clave = usuario, clave
        self.remitente = remitente or usuario
        self.nombre = nombre                    # lo que ve el usuario como remitente

    def enviar(self, destino, asunto, texto, html=None):
        msg = EmailMessage()
        msg['From'] = f'{self.nombre} <{self.remitente}>'
        msg['To'] = destino
        msg['Subject'] = asunto
        msg.set_content(texto)
        if html:
            msg.add_alternative(html, subtype='html')
        contexto = ssl.create_default_context()
        if self.puerto == 465:
            with smtplib.SMTP_SSL(self.host, self.puerto, context=contexto, timeout=15) as smtp:
                smtp.login(self.usuario, self.clave)
                smtp.send_message(msg)
        else:
            with smtplib.SMTP(self.host, self.puerto, timeout=15) as smtp:
                smtp.starttls(context=contexto)
                smtp.login(self.usuario, self.clave)
                smtp.send_message(msg)


class CorreoConsola:
    """Sin SMTP configurado: imprime el correo en la terminal de la API."""

    def enviar(self, destino, asunto, texto, html=None):
        print(f'\n{"=" * 60}\n📧 Correo para {destino}\nAsunto: {asunto}\n\n{texto}\n{"=" * 60}\n',
              flush=True)


class CorreoMemoria:
    """Para pruebas: guarda los correos enviados."""

    def __init__(self):
        self.enviados = []

    def enviar(self, destino, asunto, texto, html=None):
        self.enviados.append({'destino': destino, 'asunto': asunto, 'texto': texto, 'html': html})


# =====================================================================
#  PLANTILLAS HTML
#  Hechas con tablas y estilos en línea: es lo único que respetan Gmail,
#  Outlook y Apple Mail por igual (no admiten <style> externos ni flexbox).
# =====================================================================
VERDE = '#1ed760'
FONDO = '#0b0b0b'
TARJETA = '#171717'
TEXTO_TENUE = '#a7a7a7'
FUENTE = "'Helvetica Neue',Helvetica,Arial,sans-serif"


def _logo(app, logo_url):
    if logo_url:
        return (f'<img src="{logo_url}" width="40" height="40" alt="{app}" '
                f'style="display:block;border:0;border-radius:50%">')
    # Respaldo si no hay imagen pública: círculo verde con una nota
    return (f'<div style="width:40px;height:40px;border-radius:50%;background:{VERDE};color:#000;'
            f'font-size:22px;line-height:40px;text-align:center;font-weight:700">&#9835;</div>')


def _marco(app, logo_url, preheader, contenido, pie):
    """Estructura común: fondo, tarjeta con cabecera de marca y pie."""
    return f"""\
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>{app}</title>
</head>
<body style="margin:0;padding:0;background:{FONDO};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:{FONDO}">{preheader}&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{FONDO}" style="background:{FONDO}">
<tr><td align="center" style="padding:32px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px">
    <tr><td style="background:{TARJETA};border-radius:16px;overflow:hidden">
      <!-- Cabecera de marca -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
        bgcolor="#123d24" style="background:#123d24;background-image:linear-gradient(160deg,#1f6b3d 0%,#123d24 45%,{TARJETA} 100%)">
        <tr><td style="padding:28px 32px 26px">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="vertical-align:middle">{_logo(app, logo_url)}</td>
            <td style="vertical-align:middle;padding-left:12px;font-family:{FUENTE};font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px">{app}</td>
          </tr></table>
        </td></tr>
      </table>
      <!-- Contenido -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding:8px 32px 32px;font-family:{FUENTE};color:#fff">{contenido}</td></tr>
      </table>
    </td></tr>
    <!-- Pie -->
    <tr><td style="padding:24px 24px 0;font-family:{FUENTE};font-size:12px;line-height:18px;color:#6a6a6a;text-align:center">
      {pie}<br>&copy; {app} &middot; Hecho con &#9835; en Tunja, Colombia
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>"""


def _casillas(codigo):
    """Cada dígito en su propia casilla con borde verde."""
    return ''.join(
        f'<td style="padding:0 3px"><div style="width:44px;height:56px;line-height:56px;'
        f'background:#232323;border:1px solid #2f2f2f;border-bottom:3px solid {VERDE};border-radius:10px;'
        f'font-family:\'SF Mono\',Menlo,Consolas,monospace;font-size:28px;font-weight:700;color:#fff;'
        f'text-align:center">{d}</div></td>' for d in codigo)


def plantilla_codigo(nombre, codigo, minutos, app='APIMusic', logo_url=None):
    texto = (f'Hola {nombre},\n\nTu código para confirmar tu cuenta de {app} es: {codigo}\n\n'
             f'Vence en {minutos} minutos. Si no fuiste tú, ignora este correo.')
    casillas = _casillas(codigo)
    contenido = f"""\
<h1 style="margin:16px 0 8px;font-size:26px;line-height:32px;font-weight:800;letter-spacing:-0.5px">Confirma tu correo</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:23px;color:{TEXTO_TENUE}">
  Hola <strong style="color:#fff">{nombre}</strong> &#128075; Estás a un paso de empezar a escuchar.
  Escribe este código en la app para activar tu cuenta:</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto"><tr>{casillas}</tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:20px auto 0"><tr>
  <td style="background:#10331f;border-radius:99px;padding:7px 14px;font-size:13px;color:{VERDE};font-weight:700">
    &#9201;&nbsp; Vence en {minutos} minutos</td>
</tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px">
  <tr><td style="border-top:1px solid #2a2a2a;padding-top:20px;font-size:13px;line-height:20px;color:{TEXTO_TENUE}">
    &#128274; <strong style="color:#d6d6d6">Por tu seguridad:</strong> nunca te pediremos este código
    por chat, llamada ni otro correo. Si no creaste una cuenta en {app}, ignora este mensaje.
  </td></tr>
</table>"""
    pie = f'Recibiste este correo porque alguien se registró en {app} con esta dirección.'
    return texto, _marco(app, logo_url, f'Tu código es {codigo} · vence en {minutos} min', contenido, pie)


def plantilla_bienvenida(nombre, app='APIMusic', web_url='http://localhost:5173', logo_url=None):
    texto = (f'¡Hola {nombre}!\n\nTu cuenta de {app} ya está lista. Entra y empieza a escuchar: {web_url}\n\n'
             f'- Guarda tus canciones favoritas con el corazón\n- Genera playlists que caben justo en tu tiempo\n'
             f'- Explora artistas y álbumes')
    def fila(emoji, titulo, desc):
        return f"""\
<tr><td style="padding:0 0 14px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td width="44" style="vertical-align:top"><div style="width:36px;height:36px;line-height:36px;border-radius:10px;background:#232323;text-align:center;font-size:18px">{emoji}</div></td>
    <td style="vertical-align:top;font-size:14px;line-height:20px;color:{TEXTO_TENUE}">
      <strong style="color:#fff;font-size:15px">{titulo}</strong><br>{desc}</td>
  </tr></table>
</td></tr>"""
    contenido = f"""\
<h1 style="margin:16px 0 8px;font-size:26px;line-height:32px;font-weight:800;letter-spacing:-0.5px">¡Bienvenido, {nombre}! &#127881;</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:23px;color:{TEXTO_TENUE}">
  Tu cuenta ya está confirmada. Esto es lo que puedes hacer en {app}:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  {fila('&#127911;', 'Escucha sin límites', 'Busca por canción, artista, álbum o género.')}
  {fila('&#128154;', 'Tus me gusta', 'Toca el corazón y arma tu colección personal.')}
  {fila('&#10024;', 'Generar playlist', 'Dinos cuánto tiempo tienes y la armamos justo a la medida.')}
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:14px 0 0"><tr>
  <td style="border-radius:99px;background:{VERDE}">
    <a href="{web_url}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:{FUENTE};font-size:15px;font-weight:800;color:#000;text-decoration:none;border-radius:99px">Empezar a escuchar &rarr;</a>
  </td>
</tr></table>"""
    pie = f'Recibiste este correo porque creaste una cuenta en {app}.'
    return texto, _marco(app, logo_url, f'Tu cuenta de {app} está lista', contenido, pie)


def plantilla_recuperacion(nombre, codigo, minutos, app='APIMusic', logo_url=None):
    texto = (f'Hola {nombre},\n\nTu código para restablecer tu contraseña de {app} es: {codigo}\n\n'
             f'Vence en {minutos} minutos. Si no lo pediste, ignora este correo: tu contraseña sigue igual.')
    contenido = f"""\
<h1 style="margin:16px 0 8px;font-size:26px;line-height:32px;font-weight:800;letter-spacing:-0.5px">Restablece tu contraseña</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:23px;color:{TEXTO_TENUE}">
  Hola <strong style="color:#fff">{nombre}</strong>, recibimos una solicitud para cambiar la contraseña
  de tu cuenta. Escribe este código en la app para crear una nueva:</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto"><tr>{_casillas(codigo)}</tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:20px auto 0"><tr>
  <td style="background:#10331f;border-radius:99px;padding:7px 14px;font-size:13px;color:{VERDE};font-weight:700">
    &#9201;&nbsp; Vence en {minutos} minutos</td>
</tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px">
  <tr><td style="border-top:1px solid #2a2a2a;padding-top:20px;font-size:13px;line-height:20px;color:{TEXTO_TENUE}">
    &#128274; <strong style="color:#d6d6d6">¿No fuiste tú?</strong> Ignora este correo: tu contraseña
    no cambia hasta que alguien escriba este código. Nunca lo compartas con nadie.
  </td></tr>
</table>"""
    pie = f'Recibiste este correo porque alguien pidió restablecer la contraseña de tu cuenta en {app}.'
    return texto, _marco(app, logo_url, f'Tu código es {codigo} · vence en {minutos} min', contenido, pie)