"""Texto a voz para el DJ: Google Cloud Text-to-Speech (voces Chirp 3 HD) o memoria (pruebas)."""
import base64
import os

import requests


class ErrorVoz(Exception):
    """Google no pudo generar el audio (API apagada, sin permisos, sin internet...)."""


class VozGoogle:
    URL = 'https://texttospeech.googleapis.com/v1/text:synthesize'
    ALCANCE = ['https://www.googleapis.com/auth/cloud-platform']

    def __init__(self, voz, ruta_credenciales=None, velocidad=1.0):
        self.voz = voz
        self.velocidad = velocidad              # 1.0 normal; un poco más rápido suena más animado                          # p. ej. es-US-Chirp3-HD-Kore
        self.idioma = '-'.join(voz.split('-')[:2])
        self.ruta = ruta_credenciales
        self._cred = None

    def _token(self):
        """En tu PC usa el serviceAccountKey.json; en Cloud Run, la cuenta del servicio."""
        import google.auth
        from google.auth.transport.requests import Request
        if self._cred is None:
            if self.ruta and os.path.exists(self.ruta):
                from google.oauth2 import service_account
                self._cred = service_account.Credentials.from_service_account_file(
                    self.ruta, scopes=self.ALCANCE)
            else:
                self._cred, _ = google.auth.default(scopes=self.ALCANCE)
        if not self._cred.valid:
            self._cred.refresh(Request())
        return self._cred.token

    def sintetizar(self, texto):
        """Devuelve el mp3 como bytes. Si el texto trae [pause short] va como markup (pausas de Chirp 3 HD)."""
        try:
            r = requests.post(self.URL, timeout=20, headers={'Authorization': f'Bearer {self._token()}'},
                              json={'input': {'markup' if '[pause' in texto else 'text': texto},
                                    'voice': {'languageCode': self.idioma, 'name': self.voz},
                                    'audioConfig': {'audioEncoding': 'MP3', 'speakingRate': self.velocidad}})
        except Exception as e:
            raise ErrorVoz(f'No se pudo conectar con Text-to-Speech: {e}')
        if r.status_code != 200:
            raise ErrorVoz(f'Text-to-Speech respondió {r.status_code}: {r.text[:300]}')
        return base64.b64decode(r.json()['audioContent'])


class VozMemoria:
    """Para pruebas: no llama a Google, guarda lo que se pidió."""

    voz = 'es-US-Chirp3-HD-Prueba'

    def __init__(self):
        self.llamadas = []
        self.falla = False

    def sintetizar(self, texto):
        if self.falla:
            raise ErrorVoz('Falla simulada')
        self.llamadas.append(texto)
        return b'ID3-mp3-de-prueba'
