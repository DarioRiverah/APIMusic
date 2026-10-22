"""Convierte una cuenta en administrador.
Uso:  python crear_admin.py correo@ejemplo.com
(La cuenta debe existir: regístrala primero con POST /auth/register)"""
import sys

import firebase_admin
from firebase_admin import auth, credentials, firestore

from app.config import Config

if len(sys.argv) != 2:
    sys.exit('Uso: python crear_admin.py correo@ejemplo.com')

firebase_admin.initialize_app(credentials.Certificate(Config.FIREBASE_CREDENCIALES))
email = sys.argv[1].strip().lower()
try:
    user = auth.get_user_by_email(email)
except auth.UserNotFoundError:
    sys.exit(f'No existe una cuenta con {email}. Regístrala primero.')

firestore.client().collection('usuarios').document(user.uid).set(
    {'email': email, 'nombre': user.display_name or email, 'rol': 'admin'}, merge=True)
print(f'✅ {email} ahora es admin. Vuelve a iniciar sesión para obtener el token nuevo.')