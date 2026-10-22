"""Utilidades de validación y de lectura de la petición, compartidas por los blueprints."""
import datetime
import io

from flask import current_app, request

TIPOS_AUDIO = {'audio/mpeg': 'mp3', 'audio/mp3': 'mp3'}
TIPOS_IMAGEN = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp'}


class ErrorValidacion(Exception):
    """Dato inválido: se responde 400 (o el código indicado) con el mensaje."""

    def __init__(self, mensaje, codigo=400):
        super().__init__(mensaje)
        self.codigo = codigo


# ---------- Lectura de la petición ----------
def es_formulario():
    return request.mimetype == 'multipart/form-data'


def datos_entrada():
    """Devuelve el cuerpo como dict, venga en JSON o en multipart."""
    if es_formulario():
        return request.form.to_dict()
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ErrorValidacion('Envía un objeto JSON o un formulario')
    return data


def lista_entrada(data, campo):
    """Lee una lista de ids. En formulario puede venir repetido (campo=a&campo=b)
    o separado por comas. Devuelve None si el campo no se envió."""
    if es_formulario():
        if campo not in request.form:
            return None
        valores = []
        for v in request.form.getlist(campo):
            valores += [x.strip() for x in v.split(',')]
    else:
        if campo not in data:
            return None
        valores = data[campo]
        if not isinstance(valores, list) or not all(isinstance(v, str) for v in valores):
            raise ErrorValidacion(f'{campo} debe ser una lista de textos')
        valores = [v.strip() for v in valores]
    vistos = []
    for v in valores:
        if v and v not in vistos:
            vistos.append(v)
    return vistos


# ---------- Validadores de campos ----------
def texto(data, campo, requerido=True, max_len=120):
    valor = data.get(campo)
    if valor is None or (isinstance(valor, str) and not valor.strip() and not requerido):
        if requerido:
            raise ErrorValidacion(f'{campo} debe ser un texto no vacío')
        return ''
    if not isinstance(valor, str) or not valor.strip():
        raise ErrorValidacion(f'{campo} debe ser un texto no vacío')
    if len(valor.strip()) > max_len:
        raise ErrorValidacion(f'{campo} no puede tener más de {max_len} caracteres')
    return valor.strip()


def entero(valor):
    """Acepta int de JSON o texto numérico de un formulario."""
    if type(valor) is int:
        return valor
    if isinstance(valor, str) and valor.strip().lstrip('-').isdigit():
        return int(valor.strip())
    return None


def anio(data, campo='anio_lanzamiento'):
    valor = entero(data.get(campo))
    actual = datetime.date.today().year
    if valor is None or not (1900 <= valor <= actual):
        raise ErrorValidacion(f'{campo} debe ser un entero entre 1900 y {actual}')
    return valor


def genero(valor, campo='genero'):
    generos = current_app.config['GENEROS']
    if not isinstance(valor, str) or valor.strip().lower() not in generos:
        raise ErrorValidacion(f'{campo} no permitido. Usa uno de: {", ".join(generos)}')
    return valor.strip().lower()


def vacio(valor):
    return valor is None or (isinstance(valor, str) and not valor.strip())


# ---------- Archivos ----------
def validar_archivo(archivo, tipos, max_mb, nombre):
    """Devuelve (bytes, extension, content_type). Lanza ErrorValidacion si no sirve."""
    if archivo is None or archivo.filename == '':
        raise ErrorValidacion(f'{nombre} es obligatorio')
    if archivo.mimetype not in tipos:
        raise ErrorValidacion(f'{nombre} debe ser de tipo: {", ".join(tipos)}')
    contenido = archivo.read()
    if len(contenido) == 0:
        raise ErrorValidacion(f'{nombre} está vacío')
    if len(contenido) > max_mb * 1024 * 1024:
        raise ErrorValidacion(f'{nombre} no puede pesar más de {max_mb} MB')
    return contenido, tipos[archivo.mimetype], archivo.mimetype


def imagen_enviada(campo):
    archivo = request.files.get(campo)
    return archivo if archivo and archivo.filename else None


def subir_imagen(storage, campo, carpeta, actual=None, nombre_archivo=None):
    """Si viene una imagen en `campo`, la valida, borra la anterior y la sube.
    Devuelve {campo_url, campo_ruta} para guardar, o {} si no se envió nada."""
    archivo = imagen_enviada(campo)
    if not archivo:
        return {}
    contenido, ext, tipo = validar_archivo(
        archivo, TIPOS_IMAGEN, current_app.config['MAX_PORTADA_MB'], campo)
    if actual and actual.get(f'{campo}_ruta'):
        storage.eliminar(actual[f'{campo}_ruta'])
    ruta = f'{carpeta}/{nombre_archivo or campo}.{ext}'
    return {f'{campo}_url': storage.subir(ruta, contenido, tipo), f'{campo}_ruta': ruta}


def duracion_mp3(contenido):
    """Lee la duración real del mp3; None si no se puede."""
    try:
        from mutagen.mp3 import MP3
        return max(1, round(MP3(io.BytesIO(contenido)).info.length))
    except Exception:
        return None