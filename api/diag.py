import firebase_admin
from firebase_admin import credentials, firestore, storage
from app.config import Config

firebase_admin.initialize_app(credentials.Certificate(Config.FIREBASE_CREDENCIALES),
                              {'storageBucket': Config.FIREBASE_BUCKET})
print('Proyecto:', firebase_admin.get_app().project_id)

try:
    ref = firestore.client().collection('diagnostico').document('prueba')
    ref.set({'ok': True})
    print('✅ Firestore escribe:', ref.get().to_dict())
    ref.delete()
except Exception as e:
    print('❌ Firestore:', type(e).__name__, e)

try:
    blob = storage.bucket().blob('diagnostico/prueba.txt')
    blob.upload_from_string('hola', content_type='text/plain')
    print('✅ Storage escribe en', storage.bucket().name)
    blob.delete()
except Exception as e:
    print('❌ Storage:', type(e).__name__, e)