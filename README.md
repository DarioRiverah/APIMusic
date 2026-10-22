<div align="center">

# 🎵 APIMusic

**Plataforma de streaming de música tipo Spotify: API REST en Flask + reproductor web en React, sobre Firebase.**

[**▶ Ver demo en vivo**](https://apimusic-mvp.web.app) · [Documentación de la API](api/README.md) · [Documentación de la web](web/README.md)

![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-API-000000?logo=flask)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Firestore%20·%20Storage%20·%20Auth-FFCA28?logo=firebase&logoColor=black)
![Cloud Run](https://img.shields.io/badge/Google%20Cloud-Run-4285F4?logo=googlecloud&logoColor=white)

</div>

---

## ¿Qué es?

APIMusic es un MVP de una plataforma para escuchar música. Los usuarios crean su cuenta, exploran artistas y álbumes, guardan sus canciones favoritas y generan playlists que caben justo en el tiempo que tienen. Los administradores gestionan todo el catálogo desde un panel dentro de la misma app.

### Para usuarios
- 🔐 Registro con código de confirmación por correo, inicio de sesión con **Google** y recuperación de contraseña.
- 🎧 Reproductor global con cola, aleatorio, repetir, barra de progreso y controles desde la pantalla de bloqueo del celular.
- 🔎 Búsqueda por canción, artista, álbum o género.
- 💚 "Tus me gusta" para guardar favoritas.
- ✨ **Generar playlist**: dices cuántos minutos tienes (y si quieres, un género) y arma una lista que cabe en ese tiempo.
- 📱 Diseño adaptado a celular, con barra inferior al estilo de la app de Spotify.

### Para administradores (`/admin`)
- Crear, editar y eliminar **canciones** (subiendo el mp3), **artistas** (con foto y géneros) y **álbumes** (álbum, EP o sencillo).
- Artistas invitados (feat.), número de pista y portada heredada del álbum.
- Subida de archivos con barra de progreso.

---

## Arquitectura

```
┌──────────────────────────┐        HTTPS + JWT        ┌───────────────────────────┐
│   web/  (React + Vite)   │ ────────────────────────▶ │   api/  (Flask + Gunicorn) │
│   Firebase Hosting       │                            │   Google Cloud Run         │
└────────────┬─────────────┘                            └─────────────┬─────────────┘
             │ Login con Google (ID token)                           │ firebase-admin
             ▼                                                        ▼
      ┌───────────────┐                    ┌───────────────┬───────────────┬────────────────┐
      │ Firebase Auth │ ◀───────────────── │   Firestore   │    Storage    │  Gmail (SMTP)  │
      └───────────────┘                    │    (datos)    │ (mp3 e imgs)  │   (códigos)    │
                                           └───────────────┴───────────────┴────────────────┘
```

- La **web** no habla directo con la base de datos: todo pasa por la API. Firebase en el navegador solo se usa para el botón de Google.
- La **API** valida, guarda en Firestore, sube los archivos a Storage y emite su propio **JWT** (con rol `usuario` o `admin`).
- Los servicios se inyectan (`Servicios`), así que los **104 tests** corren con implementaciones en memoria, sin tocar Firebase ni enviar correos.

---

## Estructura

```
APIMusic/
├── api/            API REST en Flask      → ver api/README.md
│   ├── app/        blueprints, servicios (Firebase / memoria), plantillas de correo
│   ├── tests/      pytest (104 pruebas)
│   ├── Dockerfile  imagen para Cloud Run
│   └── crear_admin.py
├── web/            Reproductor + panel admin en React → ver web/README.md
│   ├── src/        páginas, componentes y contextos (auth, catálogo, favoritos, reproductor)
│   └── public/     favicon y logo de los correos
└── README.md
```

---

## Inicio rápido (local)

**Requisitos:** Python 3.12+, Node 20.19+ y un proyecto de Firebase con Firestore, Storage y Authentication (correo/contraseña y Google).

```bash
# 1. API
cd api
python -m venv .venv
.venv\Scripts\activate          # Windows  (Linux/Mac: source .venv/bin/activate)
pip install -r requirements.txt
cp .env.example .env            # llena las variables y coloca serviceAccountKey.json
python crear_admin.py tu@correo.com
python run.py                   # http://127.0.0.1:5000

# 2. Web (en otra terminal)
cd web
npm install
cp .env.example .env            # VITE_API_URL y las claves web de Firebase
npm run dev                     # http://localhost:5173
```

Los pasos detallados, las variables de entorno y la referencia de endpoints están en [`api/README.md`](api/README.md) y [`web/README.md`](web/README.md).

### Pruebas
```bash
cd api
pytest -q
```

---

## Despliegue

| Parte | Servicio | Comando |
|---|---|---|
| API | Google Cloud Run | `gcloud run deploy apimusic-api --source . --region us-central1 --env-vars-file env.yaml` |
| Web | Firebase Hosting | `npm run build && firebase deploy --only hosting` |

En Cloud Run no se sube `serviceAccountKey.json`: la API usa las credenciales de la cuenta de servicio del propio Cloud Run.

---

## Seguridad

- Las contraseñas las maneja **Firebase Auth**; la API nunca las guarda.
- Los códigos de verificación se guardan solo como **hash HMAC**, vencen en 15 minutos, admiten 5 intentos y tienen 60 segundos de espera entre reenvíos.
- La recuperación de contraseña no revela si un correo está registrado.
- Las llaves (`serviceAccountKey.json`, `.env`, `env.yaml`) están en `.gitignore` y nunca se suben al repositorio.

---

## Autor

**Darío Sebastián Rivera Sáenz**
Ingeniería de Sistemas, Universidad Santo Tomás, Tunja 🇨🇴