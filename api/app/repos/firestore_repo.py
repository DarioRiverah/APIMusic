from firebase_admin import firestore
from google.cloud.firestore_v1.base_query import FieldFilter


def _a_dict(doc):
    data = doc.to_dict()
    data['id'] = doc.id
    data.pop('creado_en', None)
    return data


class ColeccionFirestore:
    """CRUD genérico sobre una colección (canciones, artistas, albumes)."""

    def __init__(self, db, nombre):
        self.col = db.collection(nombre)

    def nuevo_id(self):
        return self.col.document().id

    def listar(self, **filtros):
        """filtros: campo=valor (igualdad). Usa solo un filtro para no
        necesitar índices compuestos; el resto se filtra en Python."""
        consulta = self.col
        filtros = {k: v for k, v in filtros.items() if v is not None}
        if filtros:
            campo, valor = next(iter(filtros.items()))
            consulta = consulta.where(filter=FieldFilter(campo, '==', valor))
        docs = [_a_dict(d) for d in consulta.stream()]
        docs = [d for d in docs if all(d.get(k) == v for k, v in filtros.items())]
        return sorted(docs, key=lambda d: d.get('creado_ts', 0))

    def listar_contiene(self, campo, valor):
        consulta = self.col.where(filter=FieldFilter(campo, 'array_contains', valor))
        return sorted((_a_dict(d) for d in consulta.stream()),
                      key=lambda d: d.get('creado_ts', 0))

    def obtener(self, doc_id):
        doc = self.col.document(doc_id).get()
        return _a_dict(doc) if doc.exists else None

    def crear(self, doc_id, data):
        self.col.document(doc_id).set({**data, 'creado_en': firestore.SERVER_TIMESTAMP})

    def actualizar(self, doc_id, data):
        self.col.document(doc_id).update(data)

    def eliminar(self, doc_id):
        self.col.document(doc_id).delete()


class UsuariosFirestore:
    def __init__(self, db):
        self.col = db.collection('usuarios')

    def obtener(self, uid):
        doc = self.col.document(uid).get()
        return {**doc.to_dict(), 'uid': uid} if doc.exists else None

    def crear(self, uid, data):
        self.col.document(uid).set(data)
        
    def actualizar(self, uid, data):
        self.col.document(uid).set(data, merge=True)

    def listar_favoritos(self, uid):
        return [d.id for d in self.col.document(uid).collection('favoritos').stream()]

    def agregar_favorito(self, uid, cancion_id):
        self.col.document(uid).collection('favoritos').document(cancion_id).set(
            {'agregado_en': firestore.SERVER_TIMESTAMP})

    def quitar_favorito(self, uid, cancion_id):
        self.col.document(uid).collection('favoritos').document(cancion_id).delete()