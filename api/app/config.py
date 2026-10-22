import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'cambia_esta_clave_en_el_env_2026')
    JWT_HORAS = int(os.getenv('JWT_HORAS', '24'))
    FIREBASE_CREDENCIALES = os.getenv('FIREBASE_CREDENCIALES', 'serviceAccountKey.json')
    FIREBASE_BUCKET = os.getenv('FIREBASE_BUCKET', '')          # apimusic-mvp.firebasestorage.app
    FIREBASE_WEB_API_KEY = os.getenv('FIREBASE_WEB_API_KEY', '')
    _origenes = [o.strip() for o in os.getenv('CORS_ORIGENES', '*').split(',') if o.strip()]
    CORS_ORIGENES = '*' if _origenes in ([], ['*']) else _origenes
    NOMBRE_APP = os.getenv('NOMBRE_APP', 'APIMusic')
    LOGO_URL = os.getenv('LOGO_URL', '')                 # URL pública del logo PNG (opcional)
    WEB_URL = os.getenv('WEB_URL', 'http://localhost:5173')   # botón "Empezar a escuchar"

    # Correo (si SMTP_HOST está vacío, los códigos se imprimen en la consola)
    SMTP_HOST = os.getenv('SMTP_HOST', '')
    SMTP_PUERTO = int(os.getenv('SMTP_PUERTO', '587'))
    SMTP_USUARIO = os.getenv('SMTP_USUARIO', '')
    SMTP_CLAVE = os.getenv('SMTP_CLAVE', '')
    CORREO_REMITENTE = os.getenv('CORREO_REMITENTE', '')
    CODIGO_MINUTOS = 15             # vigencia del código de confirmación
    CODIGO_INTENTOS = 5             # intentos antes de pedir uno nuevo
    CODIGO_ESPERA_SEGUNDOS = 60     # tiempo mínimo entre reenvíos
    MAX_CONTENT_LENGTH = 20 * 1024 * 1024                       # 20 MB por petición

    GENEROS = ('rock', 'pop', 'salsa', 'vallenato', 'reggaeton', 'jazz',
               'electronica', 'rap', 'clasica', 'otro')
    MAX_AUDIO_MB = 15
    MAX_PORTADA_MB = 2