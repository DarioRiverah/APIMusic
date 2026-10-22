import datetime
import hashlib
import hmac
import re
import secrets
import time
from functools import wraps

import jwt
from flask import Blueprint, current_app, g, jsonify, request

from .servicios import servicios
from .servicios.correo import plantilla_bienvenida, plantilla_codigo, plantilla_recuperacion
from .servicios.firebase import ErrorAuth

bp = Blueprint('auth', __name__, url_prefix='/auth')
EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
NOMBRE_RE = re.compile(r"^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$")


# ---------- JWT ----------
def generar_token(uid, email, rol):
    return jwt.encode({
        'uid': uid, 'email': email, 'rol': rol,
        'exp': datetime.datetime.now(datetime.timezone.utc)
               + datetime.timedelta(hours=current_app.config['JWT_HORAS'])
    }, current_app.config['SECRET_KEY'], algorithm='HS256')


def token_required(f):
    @wraps(f)
    def decorador(*args, **kwargs):
        partes = request.headers.get('Authorization', '').split()
        if len(partes) != 2 or partes[0].lower() != 'bearer':
            return jsonify({'error': 'Token ausente: usa Bearer <token>'}), 401
        try:
            g.usuario = jwt.decode(partes[1], current_app.config['SECRET_KEY'],
                                   algorithms=['HS256'],
                                   options={'require': ['exp', 'uid', 'rol']})
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expirado'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token inválido'}), 401
        return f(*args, **kwargs)
    return decorador


def admin_required(f):
    @wraps(f)
    @token_required
    def decorador(*args, **kwargs):
        if g.usuario.get('rol') != 'admin':
            return jsonify({'error': 'Solo un administrador puede hacer esto'}), 403
        return f(*args, **kwargs)
    return decorador


# ---------- Utilidades ----------
def usuario_publico(uid, perfil):
    nombres = perfil.get('nombres') or perfil.get('nombre', '')
    apellidos = perfil.get('apellidos', '')
    return {'uid': uid, 'email': perfil['email'], 'nombres': nombres, 'apellidos': apellidos,
            'nombre': f'{nombres} {apellidos}'.strip(), 'rol': perfil.get('rol', 'usuario'),
            'foto_url': perfil.get('foto_url'), 'proveedor': perfil.get('proveedor', 'password')}


def respuesta_sesion(uid, perfil, codigo=200):
    usuario = usuario_publico(uid, perfil)
    return jsonify({'token': generar_token(uid, usuario['email'], usuario['rol']),
                    'usuario': usuario}), codigo


def _email(data):
    email = data.get('email') if isinstance(data, dict) else None
    if not isinstance(email, str) or not EMAIL_RE.match(email.strip()):
        return None
    return email.strip().lower()


def _nombre(data, campo):
    valor = data.get(campo)
    if not isinstance(valor, str) or not valor.strip():
        return None, f'{campo} es obligatorio'
    valor = ' '.join(valor.split())
    if len(valor) > 60 or not NOMBRE_RE.match(valor):
        return None, f'{campo} solo puede tener letras y máximo 60 caracteres'
    return valor, None


def _hash_codigo(uid, codigo, proposito='verificar'):
    clave = current_app.config['SECRET_KEY'].encode()
    base = f'{uid}:{codigo}' if proposito == 'verificar' else f'{uid}:{proposito}:{codigo}'
    return hmac.new(clave, base.encode(), hashlib.sha256).hexdigest()


def _id_codigo(uid, proposito):
    """El código de confirmar correo y el de recuperar clave se guardan por separado."""
    return uid if proposito == 'verificar' else f'{proposito}_{uid}'


def _enviar_codigo(s, uid, email, nombres, proposito='verificar'):
    """Genera un código de 6 dígitos, guarda solo su hash y lo envía por correo."""
    cfg = current_app.config
    codigo = f'{secrets.randbelow(1_000_000):06d}'
    ahora = time.time()
    doc_id = _id_codigo(uid, proposito)
    datos = {'email': email, 'codigo_hash': _hash_codigo(uid, codigo, proposito), 'intentos': 0,
             'enviado_ts': ahora, 'expira_ts': ahora + cfg['CODIGO_MINUTOS'] * 60}
    if s.verificaciones.obtener(doc_id):
        s.verificaciones.actualizar(doc_id, datos)
    else:
        s.verificaciones.crear(doc_id, datos)
    if proposito == 'reset':
        plantilla, asunto = plantilla_recuperacion, f'{codigo} es tu código para restablecer tu contraseña'
    else:
        plantilla, asunto = plantilla_codigo, f'{codigo} es tu código de {cfg["NOMBRE_APP"]}'
    texto, html = plantilla(nombres, codigo, cfg['CODIGO_MINUTOS'], cfg['NOMBRE_APP'],
                            cfg['LOGO_URL'] or None)
    try:
        s.correo.enviar(email, asunto, texto, html)
    except Exception as e:
        current_app.logger.error('No se pudo enviar el código a %s: %s', email, e)
        raise ErrorCorreo()


def _comprobar_codigo(s, uid, codigo, proposito='verificar'):
    """Devuelve None si el código es correcto, o la respuesta de error lista para retornar."""
    cfg = current_app.config
    doc_id = _id_codigo(uid, proposito)
    v = s.verificaciones.obtener(doc_id)
    if v is None or time.time() > v['expira_ts']:
        return jsonify({'error': 'El código expiró, pide uno nuevo'}), 410
    if v['intentos'] >= cfg['CODIGO_INTENTOS']:
        return jsonify({'error': 'Demasiados intentos, pide un código nuevo'}), 429
    if not hmac.compare_digest(v['codigo_hash'], _hash_codigo(uid, codigo, proposito)):
        intentos = v['intentos'] + 1
        s.verificaciones.actualizar(doc_id, {'intentos': intentos})
        restantes = cfg['CODIGO_INTENTOS'] - intentos
        return jsonify({'error': f'Código incorrecto. Te quedan {restantes} intento(s)'
                        if restantes else 'Código incorrecto. Pide un código nuevo'}), 400
    return None


class ErrorCorreo(Exception):
    """Falló el envío por SMTP (clave mala, sin internet, límite de Gmail...)."""


@bp.errorhandler(ErrorCorreo)
def _error_correo(_):
    return jsonify({'error': 'No pudimos enviar el correo con el código. '
                             'Intenta de nuevo en unos minutos.'}), 502


def _enviar_bienvenida(s, email, nombres):
    """Correo de bienvenida. Si falla no importa: la cuenta ya quedó lista."""
    cfg = current_app.config
    texto, html = plantilla_bienvenida(nombres, cfg['NOMBRE_APP'], cfg['WEB_URL'], cfg['LOGO_URL'] or None)
    try:
        s.correo.enviar(email, f'¡Bienvenido a {cfg["NOMBRE_APP"]}, {nombres.split()[0]}! 🎧', texto, html)
    except Exception as e:
        current_app.logger.warning('No se pudo enviar la bienvenida a %s: %s', email, e)


def _pendiente(email, mensaje, codigo):
    return jsonify({'message': mensaje, 'email': email, 'requiere_verificacion': True}), codigo


# ---------- Registro con correo ----------
@bp.post('/register')
def registro():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({'error': 'Envía un objeto JSON'}), 400
    email = _email(data)
    if not email:
        return jsonify({'error': 'email no es válido'}), 400
    clave = data.get('clave')
    if not isinstance(clave, str) or len(clave) < 6:
        return jsonify({'error': 'clave debe tener mínimo 6 caracteres'}), 400
    nombres, error = _nombre(data, 'nombres')
    if error:
        return jsonify({'error': error}), 400
    apellidos, error = _nombre(data, 'apellidos')
    if error:
        return jsonify({'error': error}), 400

    s = servicios()
    try:
        uid = s.auth.registrar(email, clave, f'{nombres} {apellidos}')
    except ErrorAuth:
        # Si ya se registró pero no confirmó, se le reenvía el código
        uid = s.auth.uid_por_email(email)
        perfil = s.usuarios.obtener(uid) if uid else None
        if perfil and perfil.get('verificado') is False:
            _enviar_codigo(s, uid, email, perfil.get('nombres', ''))
            return _pendiente(email, 'Ya tenías un registro sin confirmar: te enviamos un código nuevo', 200)
        return jsonify({'error': 'Ya existe una cuenta con ese correo'}), 409

    s.usuarios.crear(uid, {'email': email, 'nombres': nombres, 'apellidos': apellidos,
                           'rol': 'usuario', 'verificado': False, 'proveedor': 'password'})
    _enviar_codigo(s, uid, email, nombres)
    return _pendiente(email, f'Te enviamos un código de 6 dígitos a {email}', 201)


@bp.post('/verify')
def verificar_codigo():
    data = request.get_json(silent=True) or {}
    email = _email(data)
    codigo = str(data.get('codigo', '')).strip()
    if not email or not re.fullmatch(r'\d{6}', codigo):
        return jsonify({'error': 'Envía el email y el código de 6 dígitos'}), 400

    s = servicios()
    uid = s.auth.uid_por_email(email)
    perfil = s.usuarios.obtener(uid) if uid else None
    if perfil is None:
        return jsonify({'error': 'No hay un registro pendiente con ese correo'}), 404
    if perfil.get('verificado', True):
        return jsonify({'error': 'Esta cuenta ya está confirmada, inicia sesión'}), 409
    error = _comprobar_codigo(s, uid, codigo)
    if error:
        return error

    s.usuarios.actualizar(uid, {'verificado': True})
    s.auth.marcar_verificado(uid)
    s.verificaciones.eliminar(uid)
    _enviar_bienvenida(s, email, perfil.get('nombres') or email.split('@')[0])
    return respuesta_sesion(uid, {**perfil, 'verificado': True})


@bp.post('/resend')
def reenviar_codigo():
    email = _email(request.get_json(silent=True) or {})
    if not email:
        return jsonify({'error': 'email no es válido'}), 400
    s = servicios()
    uid = s.auth.uid_por_email(email)
    perfil = s.usuarios.obtener(uid) if uid else None
    if perfil is None:
        return jsonify({'error': 'No hay un registro pendiente con ese correo'}), 404
    if perfil.get('verificado', True):
        return jsonify({'error': 'Esta cuenta ya está confirmada, inicia sesión'}), 409
    v = s.verificaciones.obtener(uid)
    espera = current_app.config['CODIGO_ESPERA_SEGUNDOS']
    if v and time.time() - v['enviado_ts'] < espera:
        faltan = int(espera - (time.time() - v['enviado_ts'])) + 1
        return jsonify({'error': f'Espera {faltan} s para pedir otro código',
                        'espera_segundos': faltan}), 429
    _enviar_codigo(s, uid, email, perfil.get('nombres', ''))
    return _pendiente(email, 'Te enviamos un código nuevo', 200)


# ---------- Recuperar contraseña ----------
MENSAJE_OLVIDO = 'Si hay una cuenta con ese correo, te enviamos un código para restablecer tu contraseña'


@bp.post('/forgot')
def olvide_clave():
    """Siempre responde lo mismo, exista o no la cuenta: así nadie puede
    usar este endpoint para averiguar qué correos están registrados."""
    email = _email(request.get_json(silent=True) or {})
    if not email:
        return jsonify({'error': 'email no es válido'}), 400
    s = servicios()
    uid = s.auth.uid_por_email(email)
    if uid:
        v = s.verificaciones.obtener(_id_codigo(uid, 'reset'))
        espera = current_app.config['CODIGO_ESPERA_SEGUNDOS']
        if v and time.time() - v['enviado_ts'] < espera:
            faltan = int(espera - (time.time() - v['enviado_ts'])) + 1
            return jsonify({'error': f'Espera {faltan} s para pedir otro código',
                            'espera_segundos': faltan}), 429
        perfil = s.usuarios.obtener(uid) or {}
        _enviar_codigo(s, uid, email, perfil.get('nombres') or email.split('@')[0], 'reset')
    return jsonify({'message': MENSAJE_OLVIDO, 'email': email}), 200


@bp.post('/reset')
def restablecer_clave():
    data = request.get_json(silent=True) or {}
    email = _email(data)
    codigo = str(data.get('codigo', '')).strip()
    clave = data.get('clave')
    if not email or not re.fullmatch(r'\d{6}', codigo):
        return jsonify({'error': 'Envía el email y el código de 6 dígitos'}), 400
    if not isinstance(clave, str) or len(clave) < 6:
        return jsonify({'error': 'clave debe tener mínimo 6 caracteres'}), 400

    s = servicios()
    uid = s.auth.uid_por_email(email)
    if not uid:      # mismo error que un código vencido: no revela si la cuenta existe
        return jsonify({'error': 'El código expiró, pide uno nuevo'}), 410
    error = _comprobar_codigo(s, uid, codigo, 'reset')
    if error:
        return error

    s.auth.cambiar_clave(uid, clave)
    s.verificaciones.eliminar(_id_codigo(uid, 'reset'))
    perfil = s.usuarios.obtener(uid)
    if perfil is None:       # cuenta creada en la consola de Firebase
        perfil = {'email': email, 'nombres': email.split('@')[0], 'apellidos': '',
                  'rol': 'usuario', 'verificado': True, 'proveedor': 'password'}
        s.usuarios.crear(uid, perfil)
    elif perfil.get('verificado') is False:
        # El código llegó a su correo, así que también queda confirmado
        s.usuarios.actualizar(uid, {'verificado': True})
        s.auth.marcar_verificado(uid)
        s.verificaciones.eliminar(uid)
        perfil = {**perfil, 'verificado': True}
    return respuesta_sesion(uid, perfil)


# ---------- Inicio de sesión ----------
@bp.post('/login')
def login():
    data = request.get_json(silent=True) or {}
    email = _email(data)
    clave = data.get('clave')
    if not email or not isinstance(clave, str) or len(clave) < 6:
        return jsonify({'error': 'Escribe un email válido y una clave de mínimo 6 caracteres'}), 400
    s = servicios()
    try:
        uid = s.auth.verificar(email, clave)
    except ErrorAuth:
        return jsonify({'error': 'Credenciales inválidas'}), 401
    perfil = s.usuarios.obtener(uid)
    if perfil is None:      # cuenta creada en la consola de Firebase, sin perfil aún
        perfil = {'email': email, 'nombres': email.split('@')[0], 'apellidos': '',
                  'rol': 'usuario', 'verificado': True, 'proveedor': 'password'}
        s.usuarios.crear(uid, perfil)
    if perfil.get('verificado', True) is False:
        return jsonify({'error': 'Confirma tu correo antes de entrar',
                        'requiere_verificacion': True, 'email': email}), 403
    return respuesta_sesion(uid, perfil)


@bp.post('/google')
def login_google():
    data = request.get_json(silent=True) or {}
    id_token = data.get('id_token')
    if not isinstance(id_token, str) or not id_token:
        return jsonify({'error': 'Falta id_token'}), 400
    s = servicios()
    try:
        google = s.auth.verificar_google(id_token)
    except ErrorAuth as e:
        return jsonify({'error': str(e)}), 401
    uid = google['uid']
    perfil = s.usuarios.obtener(uid)
    if perfil is None:
        partes = google['nombre'].split()
        perfil = {'email': google['email'], 'rol': 'usuario', 'verificado': True,
                  'proveedor': 'google', 'foto_url': google.get('foto_url'),
                  'nombres': ' '.join(partes[:1]) or google['email'].split('@')[0],
                  'apellidos': ' '.join(partes[1:])}
        s.usuarios.crear(uid, perfil)
        _enviar_bienvenida(s, perfil['email'], perfil['nombres'])
        return respuesta_sesion(uid, perfil, 201)
    cambios = {}
    if perfil.get('verificado') is False:       # Google ya confirmó el correo
        cambios['verificado'] = True
        s.verificaciones.eliminar(uid)
    if not perfil.get('foto_url') and google.get('foto_url'):
        cambios['foto_url'] = google['foto_url']
    if cambios:
        s.usuarios.actualizar(uid, cambios)
        perfil = {**perfil, **cambios}
    return respuesta_sesion(uid, perfil)


# ---------- Perfil ----------
@bp.get('/me')
@token_required
def yo():
    perfil = servicios().usuarios.obtener(g.usuario['uid'])
    if perfil is None:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    return jsonify(usuario_publico(g.usuario['uid'], perfil)), 200


@bp.put('/me')
@token_required
def actualizar_perfil():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({'error': 'Envía un objeto JSON'}), 400
    cambios = {}
    for campo in ('nombres', 'apellidos'):
        if campo in data:
            valor, error = _nombre(data, campo)
            if error:
                return jsonify({'error': error}), 400
            cambios[campo] = valor
    if not cambios:
        return jsonify({'error': 'Envía nombres y/o apellidos'}), 400
    s = servicios()
    uid = g.usuario['uid']
    if s.usuarios.obtener(uid) is None:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    s.usuarios.actualizar(uid, cambios)
    return jsonify({'message': 'Perfil actualizado',
                    'usuario': usuario_publico(uid, s.usuarios.obtener(uid))}), 200