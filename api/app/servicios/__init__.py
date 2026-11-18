from dataclasses import dataclass
from typing import Any


@dataclass
class Servicios:
    canciones: Any      # colección 'canciones'
    artistas: Any       # colección 'artistas'
    albumes: Any        # colección 'albumes'
    usuarios: Any       # usuarios y favoritos
    verificaciones: Any # códigos de confirmación de correo pendientes
    correo: Any         # envío de correos
    storage: Any        # subida/borrado de archivos
    auth: Any           # registro y verificación de credenciales
    dj: Any = None      # colección 'dj': caché de voces y contadores de uso
    voz: Any = None     # texto a voz (Google Chirp 3 HD) o None = voz del navegador


def servicios():
    from flask import current_app
    return current_app.extensions['servicios']