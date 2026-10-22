"""Implementaciones en memoria para pruebas (no tocan Firebase)."""
import uuid

from . import Servicios
from .firebase import ErrorAuth
from ..repos.memoria_repo import ColeccionMemoria, UsuariosMemoria
from .correo import CorreoMemoria


class StorageMemoria:
    def __init__(self):
        self.archivos = {}

    def subir(self, ruta, contenido, content_type):
        self.archivos[ruta] = (contenido, content_type)
        return f'https://storage.test/{ruta}'

    def eliminar(self, ruta):
        self.archivos.pop(ruta, None)


class AuthMemoria:
    def __init__(self):
        self.cuentas = {}       # email -> (uid, clave)
        self.verificados = set()
        self.tokens_google = {}  # token -> {'uid', 'email', 'nombre', 'foto_url'}

    def uid_por_email(self, email):
        cuenta = self.cuentas.get(email)
        return cuenta[0] if cuenta else None

    def marcar_verificado(self, uid):
        self.verificados.add(uid)
        
    def cambiar_clave(self, uid, clave):
        for email, (u, _) in self.cuentas.items():
            if u == uid:
                self.cuentas[email] = (uid, clave)
                return

    def verificar_google(self, id_token):
        if id_token not in self.tokens_google:
            raise ErrorAuth('Token de Google inválido o expirado')
        return self.tokens_google[id_token]

    def registrar(self, email, clave, nombre):
        if email in self.cuentas:
            raise ErrorAuth('Ya existe una cuenta con ese correo')
        uid = uuid.uuid4().hex
        self.cuentas[email] = (uid, clave)
        return uid

    def verificar(self, email, clave):
        cuenta = self.cuentas.get(email)
        if not cuenta or cuenta[1] != clave:
            raise ErrorAuth('Credenciales inválidas')
        return cuenta[0]


def crear_servicios_memoria():
    return Servicios(canciones=ColeccionMemoria(), artistas=ColeccionMemoria(),
                     albumes=ColeccionMemoria(), usuarios=UsuariosMemoria(),
                     verificaciones=ColeccionMemoria(), correo=CorreoMemoria(),
                     storage=StorageMemoria(), auth=AuthMemoria())