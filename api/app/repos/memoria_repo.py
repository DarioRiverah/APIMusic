import copy
import uuid


class ColeccionMemoria:
    def __init__(self):
        self.datos = {}

    def nuevo_id(self):
        return uuid.uuid4().hex[:20]

    def _todos(self):
        return [{**copy.deepcopy(d), 'id': i} for i, d in self.datos.items()]

    def listar(self, **filtros):
        filtros = {k: v for k, v in filtros.items() if v is not None}
        docs = [d for d in self._todos() if all(d.get(k) == v for k, v in filtros.items())]
        return sorted(docs, key=lambda d: d.get('creado_ts', 0))

    def listar_contiene(self, campo, valor):
        docs = [d for d in self._todos() if valor in (d.get(campo) or [])]
        return sorted(docs, key=lambda d: d.get('creado_ts', 0))

    def obtener(self, doc_id):
        d = self.datos.get(doc_id)
        return {**copy.deepcopy(d), 'id': doc_id} if d else None

    def crear(self, doc_id, data):
        self.datos[doc_id] = copy.deepcopy(data)

    def actualizar(self, doc_id, data):
        self.datos[doc_id].update(copy.deepcopy(data))

    def eliminar(self, doc_id):
        self.datos.pop(doc_id, None)


class UsuariosMemoria:
    def __init__(self):
        self.datos = {}
        self.favoritos = {}

    def obtener(self, uid):
        u = self.datos.get(uid)
        return {**u, 'uid': uid} if u else None

    def crear(self, uid, data):
        self.datos[uid] = dict(data)
    
    def actualizar(self, uid, data):
        self.datos.setdefault(uid, {}).update(data)

    def listar_favoritos(self, uid):
        return list(self.favoritos.get(uid, []))

    def agregar_favorito(self, uid, cancion_id):
        favs = self.favoritos.setdefault(uid, [])
        if cancion_id not in favs:
            favs.append(cancion_id)

    def quitar_favorito(self, uid, cancion_id):
        if cancion_id in self.favoritos.get(uid, []):
            self.favoritos[uid].remove(cancion_id)