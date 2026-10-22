"""Implementaciones reales: Firestore, Firebase Storage y Firebase Auth."""
import os
import uuid
from urllib.parse import quote

import firebase_admin
import requests
from firebase_admin import auth as fb_auth, credentials, firestore, storage

from . import Servicios
from ..repos.firestore_repo import ColeccionFirestore, UsuariosFirestore
from .correo import CorreoConsola, CorreoSMTP


class ErrorAuth(Exception):
    """Credenciales inválidas o correo repetido."""


class StorageFirebase:
    def __init__(self, bucket):
        self.bucket = bucket

    def subir(self, ruta, contenido, content_type):
        blob = self.bucket.blob(ruta)
        token = str(uuid.uuid4())
        blob.metadata = {'firebaseStorageDownloadTokens': token}
        blob.upload_from_string(contenido, content_type=content_type)
        # URL pública con token (la misma que da getDownloadURL en el SDK cliente)
        return (f'https://firebasestorage.googleapis.com/v0/b/{self.bucket.name}'
                f'/o/{quote(ruta, safe="")}?alt=media&token={token}')

    def eliminar(self, ruta):
        blob = self.bucket.blob(ruta)
        if blob.exists():
            blob.delete()


class AuthFirebase:
    URL_LOGIN = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword'

    def __init__(self, web_api_key):
        self.web_api_key = web_api_key

    def registrar(self, email, clave, nombre):
        try:
            user = fb_auth.create_user(email=email, password=clave, display_name=nombre)
        except fb_auth.EmailAlreadyExistsError:
            raise ErrorAuth('Ya existe una cuenta con ese correo')
        return user.uid

    def uid_por_email(self, email):
        try:
            return fb_auth.get_user_by_email(email).uid
        except fb_auth.UserNotFoundError:
            return None

    def marcar_verificado(self, uid):
        fb_auth.update_user(uid, email_verified=True)
    
    def cambiar_clave(self, uid, clave):
        fb_auth.update_user(uid, password=clave)

    def verificar_google(self, id_token):
        """Valida el ID token que entrega Firebase Auth (Google) en el navegador."""
        try:
            datos = fb_auth.verify_id_token(id_token)
        except Exception:
            raise ErrorAuth('Token de Google inválido o expirado')
        if datos.get('firebase', {}).get('sign_in_provider') != 'google.com':
            raise ErrorAuth('El token no viene de Google')
        return {'uid': datos['uid'], 'email': datos.get('email', '').lower(),
                'nombre': datos.get('name') or '', 'foto_url': datos.get('picture')}

    def verificar(self, email, clave):
        r = requests.post(f'{self.URL_LOGIN}?key={self.web_api_key}', timeout=10,
                          json={'email': email, 'password': clave,
                                'returnSecureToken': True})
        if r.status_code != 200:
            raise ErrorAuth('Credenciales inválidas')
        return r.json()['localId']


def _credenciales(ruta):
    """En tu PC usa el serviceAccountKey.json. Si algún día lo despliegas en Cloud Run,
    ese archivo no existe y se usan las credenciales del servicio."""
    if ruta and os.path.exists(ruta):
        return credentials.Certificate(ruta)
    return credentials.ApplicationDefault()


def crear_servicios_firebase(config):
    if not firebase_admin._apps:
        firebase_admin.initialize_app(_credenciales(config['FIREBASE_CREDENCIALES']),
                                      {'storageBucket': config['FIREBASE_BUCKET']})
    db = firestore.client()
    return Servicios(
        canciones=ColeccionFirestore(db, 'canciones'),
        artistas=ColeccionFirestore(db, 'artistas'),
        albumes=ColeccionFirestore(db, 'albumes'),
        usuarios=UsuariosFirestore(db),
        verificaciones=ColeccionFirestore(db, 'verificaciones'),
        correo=(CorreoSMTP(config['SMTP_HOST'], config['SMTP_PUERTO'], config['SMTP_USUARIO'],
                           config['SMTP_CLAVE'], config['CORREO_REMITENTE'], config['NOMBRE_APP'])
                if config['SMTP_HOST'] else CorreoConsola()),
        storage=StorageFirebase(storage.bucket()),
        auth=AuthFirebase(config['FIREBASE_WEB_API_KEY']),
    )