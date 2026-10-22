# APIMusic — API

API REST de APIMusic, un catálogo musical para escuchar canciones, guardar favoritas y generar playlists que caben en el tiempo que tengas. Está hecha en Flask y usa Firebase: Firestore para los datos, Storage para audios e imágenes y Authentication para las cuentas. Las sesiones usan un JWT propio. La consume la web de [`../web`](../web).

- **Un usuario** puede registrarse con correo (lo confirma con un código de 6 dígitos) o con Google, iniciar sesión, recuperar la contraseña, editar su nombre, explorar canciones, artistas, álbumes y géneros, buscar, marcar favoritas y generar playlists por duración y género.
- **Un admin** puede hacer todo eso y además crear, editar y borrar artistas, álbumes y canciones, con subida de audio mp3 e imágenes.

## Índice

1. [Stack](#stack)
2. [Arquitectura](#arquitectura)
3. [Puesta en marcha](#puesta-en-marcha)
4. [Variables de entorno](#variables-de-entorno)
5. [Autenticación](#autenticación)
6. [Referencia de endpoints](#referencia-de-endpoints)
   - [Generales](#generales)
   - [Auth](#auth)
   - [Canciones](#canciones)
   - [Artistas](#artistas)
   - [Álbumes](#álbumes)
   - [Géneros](#géneros)
   - [Playlists](#playlists)
   - [Favoritos](#favoritos)
7. [Ejemplos con curl](#ejemplos-con-curl)
8. [Correos](#correos)
9. [Tests](#tests)
10. [Estructura de carpetas](#estructura-de-carpetas)
11. [Despliegue (opcional)](#despliegue-opcional)

---

## Stack

| Pieza | Para qué |
|---|---|
| **Python 3.9 o superior** (probado con 3.13) | Lo exigen Flask 3.1 y firebase-admin 7, que son las versiones que instala `requirements.txt` (no tiene versiones fijas). |
| **Flask** | Servidor HTTP, blueprints y manejo de errores. |
| **flask-cors** | Permite que la web, servida desde otro origen, llame a la API. |
| **firebase-admin** | Firestore, Storage, la creación de cuentas y la verificación de los ID token de Google. |
| **requests** | Llama a la API REST de Firebase Auth (`accounts:signInWithPassword`) para comprobar correo y clave. |
| **PyJWT** | Genera y valida los tokens de sesión (HS256). |
| **mutagen** | Lee la duración real de los mp3. |
| **python-dotenv** | Carga el archivo `.env`. |
| **pytest** | Tests. |

Además usa la biblioteca estándar para el resto: `smtplib`/`ssl` para el correo, y `hmac`, `hashlib` y `secrets` para los códigos.

## Arquitectura

### App factory

[`app/__init__.py`](app/__init__.py) expone `create_app(config=None, servicios=None)`:

1. Carga `Config` ([`app/config.py`](app/config.py)), que lee el `.env`, y le aplica encima el diccionario `config` si se lo pasas.
2. Configura CORS con `CORS_ORIGENES`.
3. Si no recibe `servicios`, los crea conectándose a Firebase (`crear_servicios_firebase`). Luego los guarda en `app.extensions['servicios']`.
4. Registra los blueprints `auth`, `artistas`, `albumes`, `canciones`, `playlists` y `favoritos`, más las rutas `/` y `/genres` y los manejadores de errores 404, 405 y 413, que responden en JSON.

Los endpoints nunca importan Firebase directamente. Piden sus dependencias con `servicios()` ([`app/servicios/__init__.py`](app/servicios/__init__.py)), que devuelve el objeto guardado en la app.

### Inyección de dependencias con `Servicios`

`Servicios` es un `dataclass` con ocho dependencias. Cada una tiene dos implementaciones con la misma interfaz:

| Campo | Para qué | Producción (Firebase) | Tests (memoria) |
|---|---|---|---|
| `canciones` | Colección `canciones` | `ColeccionFirestore(db, 'canciones')` | `ColeccionMemoria` |
| `artistas` | Colección `artistas` | `ColeccionFirestore(db, 'artistas')` | `ColeccionMemoria` |
| `albumes` | Colección `albumes` | `ColeccionFirestore(db, 'albumes')` | `ColeccionMemoria` |
| `usuarios` | Perfiles (`usuarios/{uid}`) y favoritos (`usuarios/{uid}/favoritos/{cancion_id}`) | `UsuariosFirestore` | `UsuariosMemoria` |
| `verificaciones` | Códigos pendientes, guardados como hash | `ColeccionFirestore(db, 'verificaciones')` | `ColeccionMemoria` |
| `correo` | Envío de correos | `CorreoSMTP`, o `CorreoConsola` si no hay `SMTP_HOST` | `CorreoMemoria` (guarda los enviados en una lista) |
| `storage` | Subir y borrar archivos | `StorageFirebase` | `StorageMemoria` (devuelve URLs `https://storage.test/...`) |
| `auth` | Crear cuentas, verificar claves y tokens de Google, cambiar claves | `AuthFirebase` | `AuthMemoria` |

Las implementaciones están en [`app/servicios/firebase.py`](app/servicios/firebase.py), [`app/servicios/memoria.py`](app/servicios/memoria.py), [`app/servicios/correo.py`](app/servicios/correo.py) y [`app/repos/`](app/repos/).

Los tests llaman a `create_app({...}, servicios=crear_servicios_memoria())`. Por eso **no tocan Firebase ni envían correos**, no necesitan `serviceAccountKey.json` ni internet, y tardan unos 2 segundos.

**Nota sobre Firestore:** `ColeccionFirestore.listar()` manda a Firestore solo el primer filtro y aplica el resto en Python. Así no hacen falta índices compuestos. Los resultados se ordenan por `creado_ts`, es decir, por orden de creación.

## Puesta en marcha

Todos los comandos se ejecutan dentro de la carpeta `api/`.

### 1. Entorno virtual y dependencias

**Windows (PowerShell):**

```powershell
cd api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

> Si PowerShell bloquea el script de activación, ejecuta una vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

**Linux / Mac:**

```bash
cd api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Configurar Firebase

En la [consola de Firebase](https://console.firebase.google.com/):

1. **Crea el proyecto.**
2. **Firestore Database:** créala en modo producción, en la región que prefieras. La API accede con la cuenta de servicio, que ignora las reglas de seguridad.
3. **Storage:** actívalo. Para eso el proyecto debe estar en el **plan Blaze** (pago por uso). El bucket se llama algo como `tu-proyecto.firebasestorage.app` y va en `FIREBASE_BUCKET`.
4. **Authentication → Método de acceso:** activa **Correo electrónico/contraseña** y **Google**. En *Configuración → Dominios autorizados* agrega el dominio de la web (`localhost` ya viene incluido).
5. **Cuenta de servicio:** en *Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada*. Guarda el JSON como `api/serviceAccountKey.json`. Ya está en `.gitignore`: **nunca lo subas al repositorio**.
6. **Clave de API web:** está en *Configuración del proyecto → General* y va en `FIREBASE_WEB_API_KEY`. La API la necesita para el login con correo y clave.
7. **Roles de IAM:** la cuenta que genera Firebase (`firebase-adminsdk-xxxxx@tu-proyecto.iam.gserviceaccount.com`) normalmente ya tiene el rol *Firebase Admin SDK Administrator Service Agent*. Si Firestore responde **403 / PermissionDenied**, entra a [Google Cloud Console → IAM](https://console.cloud.google.com/iam-admin/iam), edita esa cuenta y agrega:
   - **Cloud Datastore User** (`roles/datastore.user`): leer y escribir en Firestore.
   - **Storage Object Admin** (`roles/storage.objectAdmin`): subir y borrar archivos, si Storage también falla.
   - **Firebase Authentication Admin** (`roles/firebaseauth.admin`): crear cuentas y cambiar claves, si Auth falla.

   Los cambios de IAM pueden tardar un par de minutos en aplicarse. Para comprobar la conexión, corre `python diag.py`: escribe y borra un documento de prueba en Firestore y un archivo en Storage, y muestra ✅ o ❌ para cada uno.

### 3. Archivo `.env`

```powershell
Copy-Item .env.example .env      # Linux/Mac: cp .env.example .env
```

Llénalo con tus valores. Todas las variables se explican en [Variables de entorno](#variables-de-entorno). Para generar una `SECRET_KEY`:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

### 4. Crear el primer admin

Las cuentas nuevas siempre se crean con el rol `usuario`. Para crear un admin:

1. Registra la cuenta normalmente, desde la web o con `POST /auth/register`. Si quieres, confírmala.
2. Conviértela en admin:

   ```powershell
   python crear_admin.py correo@ejemplo.com
   ```

   El script busca la cuenta en Firebase Auth y escribe `rol: 'admin'` en `usuarios/{uid}` (con `merge`). Si la cuenta no existe, termina con el mensaje *"No existe una cuenta con … Regístrala primero."*
3. **Vuelve a iniciar sesión.** El rol viaja dentro del JWT, así que el token anterior sigue diciendo `usuario`.

> `crear_admin.py` carga las credenciales con `credentials.Certificate`, así que siempre necesita el archivo de `FIREBASE_CREDENCIALES`.

### 5. Ejecutar

```powershell
python run.py
```

La API queda en **http://localhost:5000** (escucha en `0.0.0.0:5000` con `debug=True`). La web la busca por defecto en `http://127.0.0.1:5000` (`VITE_API_URL` en `web/.env`). Para probar que responde:

```powershell
curl.exe http://localhost:5000/
```

### 6. Tests

```powershell
pytest -q
```

No necesitan Firebase ni `.env`. Más detalles en [Tests](#tests).

## Variables de entorno

Se leen en [`app/config.py`](app/config.py). La plantilla está en [`.env.example`](.env.example).

| Variable | Para qué sirve | ¿Obligatoria? | Por defecto |
|---|---|---|---|
| `SECRET_KEY` | Firma los JWT (HS256) y sirve de clave HMAC para los hash de los códigos. Si la cambias, se invalidan todas las sesiones y los códigos pendientes. | **Sí** en la práctica: el valor por defecto es público. | `cambia_esta_clave_en_el_env_2026` |
| `JWT_HORAS` | Cuántas horas dura un token de sesión. | No | `24` |
| `FIREBASE_CREDENCIALES` | Ruta al JSON de la cuenta de servicio. Si el archivo no existe, se usan las credenciales por defecto de Google Cloud (ver [Despliegue](#despliegue-opcional)). | En local, sí | `serviceAccountKey.json` |
| `FIREBASE_BUCKET` | Bucket de Storage (sin `gs://`). | **Sí**: sin él, la app no arranca. | `''` |
| `FIREBASE_WEB_API_KEY` | Clave de API web de Firebase, para comprobar correo y clave en `/auth/login`. | **Sí** para el login con correo | `''` |
| `CORS_ORIGENES` | Origen permitido por CORS: `*` o **una sola** URL (por ejemplo `http://localhost:5173`). | No | `*` |
| `NOMBRE_APP` | Nombre que aparece en los asuntos, el remitente y las plantillas de correo. | No | `APIMusic` |
| `LOGO_URL` | URL pública de un PNG para la cabecera de los correos. Si está vacía, se usa un círculo verde con ♫. | No | `''` |
| `WEB_URL` | Enlace del botón «Empezar a escuchar» del correo de bienvenida. | No | `http://localhost:5173` |
| `SMTP_HOST` | Servidor SMTP. **Si está vacío, los correos (con los códigos) se imprimen en la consola de la API** en lugar de enviarse. | No | `''` |
| `SMTP_PUERTO` | `587` usa STARTTLS y `465` usa SSL directo. | No | `587` |
| `SMTP_USUARIO` | Usuario para iniciar sesión en el servidor SMTP. | Si hay `SMTP_HOST` | `''` |
| `SMTP_CLAVE` | Clave SMTP. En Gmail es una contraseña de aplicación. | Si hay `SMTP_HOST` | `''` |
| `CORREO_REMITENTE` | Dirección que aparece en «De:». Si está vacía, se usa `SMTP_USUARIO`. | No | `''` |

Estos valores están fijos en `Config` y no se leen del `.env`:

| Constante | Valor |
|---|---|
| `CODIGO_MINUTOS` | 15: vigencia de un código |
| `CODIGO_INTENTOS` | 5: intentos por código |
| `CODIGO_ESPERA_SEGUNDOS` | 60: espera mínima entre reenvíos |
| `MAX_CONTENT_LENGTH` | 20 MB por petición (si se supera, responde 413) |
| `MAX_AUDIO_MB` | 15 |
| `MAX_PORTADA_MB` | 2 (aplica a portadas y fotos) |
| `GENEROS` | `rock, pop, salsa, vallenato, reggaeton, jazz, electronica, rap, clasica, otro` |

### Modo consola (sin SMTP)

Si dejas `SMTP_HOST=` vacío, la API usa `CorreoConsola`, que imprime cada correo en la terminal donde corre `python run.py`:

```
============================================================
📧 Correo para ana@example.com
Asunto: 123456 es tu código de APIMusic

Hola Ana,

Tu código para confirmar tu cuenta de APIMusic es: 123456
...
============================================================
```

Sirve para desarrollar sin configurar correo.

### Contraseña de aplicación de Gmail

Gmail no deja usar tu contraseña normal por SMTP. Para la cuenta que va a enviar los correos:

1. Activa la **verificación en dos pasos** en <https://myaccount.google.com/security>. Sin ella no aparece la opción del paso siguiente.
2. Entra a <https://myaccount.google.com/apppasswords>, escribe un nombre (por ejemplo `APIMusic`) y pulsa **Crear**.
3. Copia la clave de 16 letras en `SMTP_CLAVE`. Los espacios no importan.
4. Usa `SMTP_HOST=smtp.gmail.com`, `SMTP_PUERTO=587`, y pon esa misma cuenta en `SMTP_USUARIO` y `CORREO_REMITENTE`.

Si el envío falla (clave incorrecta, sin internet o límite diario de Gmail), los endpoints que mandan códigos responden **502** y el error queda en el log. El correo de bienvenida, en cambio, falla en silencio, porque la cuenta ya quedó lista.

## Autenticación

### JWT

- Algoritmo **HS256**, firmado con `SECRET_KEY`.
- Contenido: `{"uid", "email", "rol", "exp"}`. Dura `JWT_HORAS` horas (24 por defecto).
- Se manda en la cabecera: `Authorization: Bearer <token>`.
- Errores:

  | Código | Mensaje | Cuándo |
  |---|---|---|
  | 401 | `Token ausente: usa Bearer <token>` | No hay token o la cabecera está mal formada |
  | 401 | `Token expirado` | El token venció |
  | 401 | `Token inválido` | Firma incorrecta o faltan `exp`, `uid` o `rol` |
  | 403 | `Solo un administrador puede hacer esto` | Endpoint de admin y `rol != 'admin'` |

- El rol se lee **del token**, no de Firestore. Si cambias el rol de alguien, el cambio aplica desde su siguiente inicio de sesión.

Todos los endpoints que inician sesión (`/auth/verify`, `/auth/login`, `/auth/google` y `/auth/reset`) devuelven la misma estructura:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "usuario": {
    "uid": "abc123",
    "email": "ana@example.com",
    "nombres": "Ana María",
    "apellidos": "Pérez",
    "nombre": "Ana María Pérez",
    "rol": "usuario",
    "foto_url": null,
    "proveedor": "password"
  }
}
```

`proveedor` vale `password` o `google`.

### Roles

| Rol | Cómo se obtiene | Puede |
|---|---|---|
| `usuario` | Cualquier registro, por correo o por Google | Endpoints públicos más perfil, favoritos y playlists |
| `admin` | Solo con `python crear_admin.py <correo>` | Todo lo anterior más crear, editar y borrar artistas, álbumes y canciones |

### Registro con código de 6 dígitos

1. `POST /auth/register` crea la cuenta en Firebase Auth y el perfil en `usuarios/{uid}` con `verificado: false`. Luego envía un código **sin devolver token**.
2. El código se genera con `secrets` y **solo se guarda su hash**: `HMAC-SHA256(SECRET_KEY, "uid:codigo")`, en `verificaciones/{uid}`.
3. Reglas:
   - El código **vence en 15 minutos** (410).
   - Da **5 intentos**. Cada fallo responde `Te quedan N intento(s)` y, agotados los intentos, responde 429.
   - Hay que **esperar 60 segundos** entre reenvíos con `/auth/resend` (429 con `espera_segundos`).
   - Cada reenvío genera un código nuevo que reemplaza al anterior y reinicia los intentos.
4. `POST /auth/verify` con el código correcto marca la cuenta como verificada (en el perfil y en Firebase Auth), borra el código, envía el correo de bienvenida y **abre sesión**.
5. Si alguien se registra otra vez con un correo que todavía no confirmó, la API le reenvía un código nuevo (200) en lugar de devolver 409.

### Login

`POST /auth/login` comprueba el correo y la clave contra Firebase Auth (con `FIREBASE_WEB_API_KEY`):

- Credenciales malas: **401**.
- Cuenta sin confirmar: **403** con `{"requiere_verificacion": true, "email": ...}`, para que la web muestre la pantalla del código.
- Si la cuenta se creó a mano en la consola de Firebase y no tiene perfil, se le crea uno con el rol `usuario`, ya verificado.

### Login con Google

1. La web usa el SDK de Firebase Auth con el proveedor de Google (popup) y obtiene un **ID token de Firebase**.
2. Lo envía a `POST /auth/google` como `{"id_token": "..."}`.
3. La API lo valida con `firebase_admin.auth.verify_id_token` y exige que `sign_in_provider == 'google.com'`.
4. Si el usuario es nuevo, crea el perfil (el primer nombre va en `nombres` y el resto en `apellidos`), envía la bienvenida y responde **201**. Si ya existía, responde **200**. Además, si el perfil tenía un registro por correo pendiente, lo marca como verificado y completa la foto si no tenía una.

### Recuperar la contraseña

1. `POST /auth/forgot {"email"}` siempre responde **200 con el mismo mensaje**, exista o no la cuenta (*"Si hay una cuenta con ese correo, te enviamos un código…"*). Si la cuenta existe, envía un código de recuperación, que se guarda aparte del de registro (`verificaciones/reset_{uid}`, con hash `uid:reset:codigo`). Tiene las mismas reglas: 15 minutos, 5 intentos y 60 segundos de espera.
2. `POST /auth/reset {"email", "codigo", "clave"}` cambia la clave en Firebase Auth, borra el código y **abre sesión**.
   - Si la cuenta todavía no estaba confirmada, queda confirmada, porque el código llegó a su correo.
   - Si el correo no existe, responde 410, igual que con un código vencido.
   - El código de registro **no sirve** para restablecer la clave.

## Referencia de endpoints

Convenciones:

- Las respuestas son JSON. Los errores tienen la forma `{"error": "mensaje"}`.
- Acceso: **público** (sin token), **usuario** (cualquier token válido) o **admin** (token con `rol: admin`). Un endpoint de usuario o admin responde 401 si el token falta, está vencido o es inválido, y uno de admin responde además 403 si el usuario no es admin.
- Los endpoints que reciben JSON necesitan `Content-Type: application/json`. Sin esa cabecera, el cuerpo se ignora y responden 400.
- En los endpoints que reciben JSON **o** multipart, una lista de ids en multipart puede enviarse repitiendo el campo (`invitados_ids=a&invitados_ids=b`) o separada por comas (`invitados_ids=a,b`). En JSON es una lista de textos. Los ids repetidos y vacíos se eliminan.

**Formatos de archivo:**

| Campo | Tipos aceptados (según el `Content-Type` del archivo) | Máximo |
|---|---|---|
| `audio` | `audio/mpeg`, `audio/mp3` → se guarda como `.mp3` | 15 MB |
| `portada`, `foto` | `image/jpeg`, `image/png`, `image/webp` | 2 MB |
| Petición completa | — | 20 MB (413 `El archivo es demasiado grande`) |

Si el archivo no cumple, la respuesta es 400 con mensajes como `audio debe ser de tipo: audio/mpeg, audio/mp3`, `portada no puede pesar más de 2 MB` o `audio está vacío`.

**Rutas de Storage:**

| Archivo | Ruta |
|---|---|
| Audio de canción | `canciones/{id}/audio.mp3` |
| Portada de canción | `canciones/{id}/portada.{ext}` |
| Foto de artista | `artistas/{id}/foto.{ext}` |
| Portada de álbum | `albumes/{id}/portada.{ext}` |

Las respuestas incluyen solo la URL pública (con token de descarga), nunca la ruta interna. Cuando se reemplaza o se borra un archivo, también se borra el anterior.

### Generales

| Método | Ruta | Acceso | Respuesta |
|---|---|---|---|
| GET | `/` | público | `{"message": "Bienvenido a APIMusic 🎵", "recursos": ["/auth", "/songs", ...]}` |
| — | ruta inexistente | — | 404 `{"error": "Ruta no encontrada"}` |
| — | método no admitido | — | 405 `{"error": "Método no permitido"}` |

### Auth

#### `POST /auth/register` — público

```json
{ "email": "ana@example.com", "clave": "secreta1", "nombres": "Ana María", "apellidos": "Pérez" }
```

Validaciones:

- `email`: debe tener un formato válido. Se guarda en minúsculas y sin espacios.
- `clave`: mínimo 6 caracteres.
- `nombres` y `apellidos`: obligatorios, máximo 60 caracteres. Solo admiten letras (incluye tildes, ü y ñ), espacios, `'`, `.` y `-`. Los espacios repetidos se reducen a uno.

**201**

```json
{ "message": "Te enviamos un código de 6 dígitos a ana@example.com", "email": "ana@example.com", "requiere_verificacion": true }
```

| Código | Cuándo |
|---|---|
| 200 | El correo ya estaba registrado sin confirmar: se reenvía un código (misma forma que el 201) |
| 400 | El cuerpo no es JSON o un campo es inválido |
| 409 | `Ya existe una cuenta con ese correo` (ya confirmada) |
| 502 | No se pudo enviar el correo |

#### `POST /auth/verify` — público

```json
{ "email": "ana@example.com", "codigo": "123456" }
```

**200**: sesión (`token` y `usuario`). Además envía el correo de bienvenida.

| Código | Cuándo |
|---|---|
| 400 | Falta el email o el código no tiene 6 dígitos (`Envía el email y el código de 6 dígitos`), o el código es incorrecto (`Código incorrecto. Te quedan N intento(s)`) |
| 404 | `No hay un registro pendiente con ese correo` |
| 409 | `Esta cuenta ya está confirmada, inicia sesión` |
| 410 | `El código expiró, pide uno nuevo` |
| 429 | `Demasiados intentos, pide un código nuevo` |

#### `POST /auth/resend` — público

```json
{ "email": "ana@example.com" }
```

**200**: `{"message": "Te enviamos un código nuevo", "email": ..., "requiere_verificacion": true}`

| Código | Cuándo |
|---|---|
| 400 | Email inválido |
| 404 | No hay un registro pendiente |
| 409 | La cuenta ya está confirmada |
| 429 | `{"error": "Espera N s para pedir otro código", "espera_segundos": N}` |
| 502 | Falló el envío del correo |

#### `POST /auth/login` — público

```json
{ "email": "ana@example.com", "clave": "secreta1" }
```

**200**: sesión.

| Código | Cuándo |
|---|---|
| 400 | `Escribe un email válido y una clave de mínimo 6 caracteres` |
| 401 | `Credenciales inválidas` |
| 403 | `{"error": "Confirma tu correo antes de entrar", "requiere_verificacion": true, "email": ...}` |

#### `POST /auth/google` — público

```json
{ "id_token": "<ID token de Firebase obtenido con Google>" }
```

**201** si el usuario es nuevo y **200** si ya existía. En ambos casos devuelve la sesión.

| Código | Cuándo |
|---|---|
| 400 | `Falta id_token` |
| 401 | `Token de Google inválido o expirado`, o `El token no viene de Google` |

#### `POST /auth/forgot` — público

```json
{ "email": "ana@example.com" }
```

**200**, exista o no la cuenta:

```json
{ "message": "Si hay una cuenta con ese correo, te enviamos un código para restablecer tu contraseña", "email": "ana@example.com" }
```

| Código | Cuándo |
|---|---|
| 400 | Email inválido |
| 429 | Pediste otro código hace menos de 60 s (`espera_segundos`) |
| 502 | Falló el envío del correo |

#### `POST /auth/reset` — público

```json
{ "email": "ana@example.com", "codigo": "654321", "clave": "nuevaClave1" }
```

**200**: sesión con la nueva clave.

| Código | Cuándo |
|---|---|
| 400 | Formato de email o código incorrecto, clave de menos de 6 caracteres, o código incorrecto (con los intentos restantes) |
| 410 | El código venció, ya se usó, o el correo no existe |
| 429 | Se agotaron los intentos |

#### `GET /auth/me` — usuario

**200**: el objeto `usuario` (sin token). **404** si el perfil no existe.

#### `PUT /auth/me` — usuario

```json
{ "nombres": "Ana", "apellidos": "Pérez Gómez" }
```

Puedes enviar uno o los dos campos. Tienen las mismas reglas que en el registro. El correo y el rol no se pueden cambiar.

**200**: `{"message": "Perfil actualizado", "usuario": {...}}`

| Código | Cuándo |
|---|---|
| 400 | El cuerpo no es JSON, no viene ningún campo, o un nombre es inválido |
| 404 | Usuario no encontrado |

### Canciones

Forma pública de una canción:

```json
{
  "id": "Xy12...",
  "titulo": "La Bicicleta",
  "genero": "vallenato",
  "anio_lanzamiento": 2016,
  "duracion_segundos": 228,
  "numero_pista": 3,
  "audio_url": "https://firebasestorage.googleapis.com/v0/b/.../o/canciones%2FXy12%2Faudio.mp3?alt=media&token=...",
  "portada_url": "https://firebasestorage.googleapis.com/...",
  "artista": { "id": "Ab34...", "nombre": "Carlos Vives" },
  "invitados": [ { "id": "Cd56...", "nombre": "Shakira" } ],
  "album": { "id": "Ef78...", "titulo": "Vives" }
}
```

`album` es `null` si la canción no pertenece a un álbum. `portada_url` puede ser `null`.

#### `GET /songs` — público

Parámetros de consulta, todos opcionales y combinables:

| Parámetro | Efecto |
|---|---|
| `genero` | Filtra por género exacto (sin distinguir mayúsculas) |
| `album_id` | Solo canciones de ese álbum |
| `artist_id` | Canciones donde el artista es **principal o invitado** |
| `q` | Busca el texto (sin distinguir mayúsculas) en el título, el artista, el título del álbum y los nombres de los invitados |

**200**: lista de canciones en orden de creación. Si se filtra por `artist_id`, primero vienen las canciones donde el artista es principal y después aquellas donde es invitado.

#### `GET /songs/<id>` — público

**200**: una canción. **404** `Canción no encontrada`.

#### `POST /songs` — admin, **solo `multipart/form-data`**

| Campo | Tipo | Reglas |
|---|---|---|
| `titulo` | texto | Obligatorio, máximo 120 caracteres |
| `artista_id` | texto | Obligatorio, debe existir |
| `genero` | texto | Obligatorio, uno de los de `/genres` |
| `anio_lanzamiento` | entero | 1900 hasta el año actual. **Obligatorio si no hay `album_id`**; si hay álbum y no lo envías, se usa el año del álbum |
| `album_id` | texto | Opcional, debe existir. Vacío significa sencillo suelto |
| `numero_pista` | entero | Opcional, entre 1 y 99 |
| `invitados_ids` | lista | Opcional, **máximo 5**, todos deben existir. Si el artista principal está en la lista, se quita |
| `duracion_segundos` | entero > 0 | Opcional. Solo se usa si mutagen no puede leer la duración del mp3 |
| `audio` | archivo | **Obligatorio**, mp3, máximo 15 MB |
| `portada` | archivo | Opcional, jpg, png o webp, máximo 2 MB |

**201**

```json
{ "id": "Xy12...", "message": "Canción creada", "cancion": { ... } }
```

| Código | Cuándo |
|---|---|
| 400 | No es multipart (`Envía multipart/form-data con el audio`), falta el audio, un campo es inválido, `artista_id`, `album_id` o un invitado no existe, hay más de 5 invitados, o `No se pudo leer la duración del mp3; envía duracion_segundos` |
| 401 / 403 | Sin token o no es admin |
| 413 | La petición pesa más de 20 MB |

#### `PUT /songs/<id>` — admin, JSON o multipart

La actualización es **parcial**: solo cambian los campos que envíes, con las mismas reglas que al crear.

- Para quitar el álbum, envía `album_id` vacío (`""`).
- Para quitar a todos los invitados, envía `invitados_ids: []` en JSON. En multipart, envía el campo vacío.
- Si cambias el artista principal y este estaba entre los invitados, se quita de la lista de invitados.
- Si envías un `audio` nuevo (solo en multipart), reemplaza al anterior y se vuelve a leer la duración. Si no se puede leer, se usa `duracion_segundos` o se conserva la duración anterior.
- Si envías una `portada` nueva, reemplaza a la anterior.

**200**: `{"message": "Canción actualizada", "cancion": {...}}`

| Código | Cuándo |
|---|---|
| 400 | Un campo es inválido, o `No enviaste ningún campo para actualizar` |
| 404 | La canción no existe |

#### `DELETE /songs/<id>` — admin

Borra el documento, su audio y su portada en Storage. **200** `{"message": "Canción eliminada"}`, o **404**.

Si la canción estaba en favoritos de alguien, desaparece de su lista la próxima vez que la consulte.

### Artistas

Forma pública:

```json
{ "id": "Ab34...", "nombre": "Carlos Vives", "descripcion": "", "generos": ["vallenato", "pop"], "foto_url": null }
```

#### `GET /artists` — público

Parámetro opcional `q`: el nombre contiene ese texto. **200**: lista ordenada alfabéticamente, sin distinguir mayúsculas.

#### `GET /artists/<id>` — público

**200**: el artista más tres listas:

- `albumes`: sus álbumes, del más reciente al más antiguo.
- `canciones`: canciones donde es el artista principal.
- `apariciones`: canciones donde aparece como invitado (feat.).

**404** `Artista no encontrado`.

#### `POST /artists` — admin, JSON o multipart

| Campo | Reglas |
|---|---|
| `nombre` | Obligatorio, máximo 80 caracteres. **Único sin distinguir mayúsculas**: `shakira ` choca con `Shakira` |
| `descripcion` | Opcional, máximo 1000 caracteres |
| `generos` | Opcional. Lista de géneros válidos |
| `foto` | Opcional, solo en multipart. jpg, png o webp, máximo 2 MB |

**201**: `{"id": ..., "message": "Artista creado", "artista": {...}}`

| Código | Cuándo |
|---|---|
| 400 | Un campo es inválido o un género no está permitido |
| 409 | `Ya existe un artista llamado "…"` |

#### `PUT /artists/<id>` — admin, JSON o multipart

Actualización parcial. **Si cambias el nombre, se actualiza en todas las canciones donde es principal, en las que aparece como invitado y en sus álbumes**, que guardan una copia del nombre. Una `foto` nueva reemplaza a la anterior.

**200**: `{"message": "Artista actualizado", "artista": {...}}`

| Código | Cuándo |
|---|---|
| 400 | Un campo es inválido o no se envió ningún campo |
| 404 | El artista no existe |
| 409 | El nombre ya existe |

#### `DELETE /artists/<id>` — admin

**Solo se puede borrar si el artista no tiene álbumes ni canciones**, contando también las canciones donde es invitado. Si tiene alguno, responde:

**409**

```json
{ "error": "No se puede eliminar: tiene 1 álbum(es) y 3 canción(es). Elimínalos o muévelos primero." }
```

Si se puede borrar, borra también su foto. **200** `{"message": "Artista eliminado"}`, o **404**.

### Álbumes

Forma pública:

```json
{ "id": "Ef78...", "titulo": "Vives", "tipo": "album", "anio_lanzamiento": 2017, "portada_url": null, "artista": { "id": "Ab34...", "nombre": "Carlos Vives" } }
```

#### `GET /albums` — público

Parámetro opcional `artist_id`. **200**: lista del más reciente al más antiguo.

#### `GET /albums/<id>` — público

**200**: el álbum más:

- `total_canciones`
- `duracion_total_segundos`
- `canciones`: ordenadas por `numero_pista`. Las que no tienen número van al final, en orden de creación.

**404** `Álbum no encontrado`.

#### `POST /albums` — admin, JSON o multipart

| Campo | Reglas |
|---|---|
| `titulo` | Obligatorio, máximo 120 caracteres. **Un artista no puede tener dos álbumes con el mismo título**, sin distinguir mayúsculas |
| `artista_id` | Obligatorio, debe existir |
| `anio_lanzamiento` | Obligatorio, 1900 hasta el año actual |
| `tipo` | `album`, `ep` o `sencillo`. Por defecto, `album` |
| `portada` | Opcional, solo en multipart. jpg, png o webp, máximo 2 MB |

**201**: `{"id": ..., "message": "Álbum creado", "album": {...}}`

| Código | Cuándo |
|---|---|
| 400 | Un campo es inválido, el tipo no existe o el artista no existe |
| 409 | `Ese artista ya tiene un álbum llamado "…"` |

#### `PUT /albums/<id>` — admin, JSON o multipart

Actualización parcial. **Si cambias el título o la portada, se actualizan en todas las canciones del álbum.** Las canciones sin portada propia muestran la del álbum.

**200**: `{"message": "Álbum actualizado", "album": {...}}`. También puede responder **400**, **404** o **409**, en los mismos casos que al crear.

#### `DELETE /albums/<id>` — admin

**Solo se puede borrar si el álbum no tiene canciones.** Si tiene alguna, responde:

**409**

```json
{ "error": "No se puede eliminar: tiene N canción(es). Elimínalas o cámbialas de álbum primero." }
```

Si se puede borrar, borra también su portada. **200** `{"message": "Álbum eliminado"}`, o **404**.

### Géneros

#### `GET /genres` — público

**200**

```json
["rock", "pop", "salsa", "vallenato", "reggaeton", "jazz", "electronica", "rap", "clasica", "otro"]
```

### Playlists

#### `POST /playlists/generate` — usuario

```json
{ "duracion_max_minutos": 12, "genero": "rock" }
```

| Campo | Reglas |
|---|---|
| `duracion_max_minutos` | **Entero JSON** (no texto) entre 1 y 600 |
| `genero` | Opcional. Si no se envía, se usan todos los géneros |

**Cómo se arma la playlist:** recorre las canciones del género **en orden de creación** y agrega cada una **solo si todavía cabe** en el tiempo que queda. Cuando una no cabe, la salta y sigue con la siguiente. El resultado es determinista, no aleatorio, y nunca supera el límite.

Por ejemplo, con un límite de 12 minutos (720 s) y canciones de rock de 354, 391 y 301 s: la de 354 s entra, la de 391 s no (sumaría 745), la de 301 s sí. Total: 655 s, es decir, 10:55.

**200**

```json
{
  "genero": "rock",
  "duracion_max": "12:00",
  "total_canciones": 2,
  "duracion_total_segundos": 655,
  "duracion_total": "10:55",
  "tiempo_restante_segundos": 65,
  "canciones": [ { ... }, { ... } ]
}
```

| Código | Cuándo |
|---|---|
| 400 | `Envía un objeto JSON`, `duracion_max_minutos debe ser un entero entre 1 y 600`, o `genero no permitido…` |
| 404 | `No hay canciones que cumplan las condiciones pedidas` |

### Favoritos

Los favoritos son de cada usuario. Se guardan en `usuarios/{uid}/favoritos/{cancion_id}`.

| Método | Ruta | Acceso | Respuesta |
|---|---|---|---|
| GET | `/me/favorites` | usuario | **200**: lista de canciones (forma pública). Las canciones que ya fueron borradas se omiten |
| PUT | `/me/favorites/<cancion_id>` | usuario | **200** `{"message": "Agregada a favoritos"}`. Si ya estaba, no se duplica. **404** si la canción no existe |
| DELETE | `/me/favorites/<cancion_id>` | usuario | **200** `{"message": "Quitada de favoritos"}`, aunque no estuviera en la lista |

## Ejemplos con curl

Estos comandos funcionan igual en **PowerShell** y en **bash**:

- En PowerShell usa siempre `curl.exe`, porque `curl` es un alias de `Invoke-WebRequest`. En Linux/Mac escribe `curl` o `curl.exe` según tu sistema.
- Cada comando va en una sola línea, porque la continuación de línea cambia entre shells.
- Los cuerpos JSON van en archivos (`-d "@archivo.json"`), porque PowerShell 5.1 rompe las comillas dobles dentro de los argumentos.

Crea estos archivos en `api/` con tu editor, guardados en UTF-8:

`registro.json`

```json
{ "email": "ana@example.com", "clave": "secreta1", "nombres": "Ana", "apellidos": "Perez" }
```

`verificar.json` (cambia el código por el que recibiste)

```json
{ "email": "ana@example.com", "codigo": "123456" }
```

`login.json`

```json
{ "email": "ana@example.com", "clave": "secreta1" }
```

`playlist.json`

```json
{ "duracion_max_minutos": 30, "genero": "vallenato" }
```

**1. Registrarse.** Responde 201 y envía el código, o lo imprime en la consola si no hay SMTP.

```powershell
curl.exe -X POST http://localhost:5000/auth/register -H "Content-Type: application/json" -d "@registro.json"
```

**2. Verificar el código.** Responde 200 con `token`.

```powershell
curl.exe -X POST http://localhost:5000/auth/verify -H "Content-Type: application/json" -d "@verificar.json"
```

**3. Iniciar sesión** y guardar el token en una variable:

```powershell
# PowerShell
$TOKEN = (curl.exe -s -X POST http://localhost:5000/auth/login -H "Content-Type: application/json" -d "@login.json" | ConvertFrom-Json).token
```

```bash
# bash (requiere jq)
TOKEN=$(curl -s -X POST http://localhost:5000/auth/login -H "Content-Type: application/json" -d "@login.json" | jq -r .token)
```

`-H "Authorization: Bearer $TOKEN"` funciona igual en las dos shells. Para los pasos 4 a 6, la cuenta debe ser admin (`python crear_admin.py ana@example.com`) y hay que repetir el paso 3 para obtener un token nuevo.

**4. Crear un artista (admin).** Toma el `id` de la respuesta.

```powershell
curl.exe -X POST http://localhost:5000/artists -H "Authorization: Bearer $TOKEN" -F "nombre=Carlos Vives" -F "generos=vallenato,pop" -F "foto=@foto.jpg;type=image/jpeg"
```

**5. (Opcional) Crear un álbum (admin):**

```powershell
curl.exe -X POST http://localhost:5000/albums -H "Authorization: Bearer $TOKEN" -F "titulo=Vives" -F "artista_id=ID_DEL_ARTISTA" -F "anio_lanzamiento=2017" -F "tipo=album" -F "portada=@portada.png;type=image/png"
```

**6. Subir una canción (admin, multipart):**

```powershell
curl.exe -X POST http://localhost:5000/songs -H "Authorization: Bearer $TOKEN" -F "titulo=La Bicicleta" -F "artista_id=ID_DEL_ARTISTA" -F "genero=vallenato" -F "anio_lanzamiento=2016" -F "invitados_ids=ID_INVITADO_1,ID_INVITADO_2" -F "audio=@cancion.mp3;type=audio/mpeg" -F "portada=@portada.jpg;type=image/jpeg"
```

> Indica siempre `;type=audio/mpeg` en el mp3. curl no reconoce esa extensión y lo enviaría como `application/octet-stream`, y la API lo rechazaría con 400.
> Si agregas `album_id=...`, puedes omitir `anio_lanzamiento` (se usa el del álbum) y `portada` (se muestra la del álbum).

**7. Generar una playlist (cualquier usuario):**

```powershell
curl.exe -X POST http://localhost:5000/playlists/generate -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "@playlist.json"
```

Otras consultas útiles:

```powershell
curl.exe "http://localhost:5000/songs?q=vives&genero=vallenato"
curl.exe -X PUT http://localhost:5000/me/favorites/ID_CANCION -H "Authorization: Bearer $TOKEN"
curl.exe http://localhost:5000/me/favorites -H "Authorization: Bearer $TOKEN"
```

## Correos

Las plantillas están en [`app/servicios/correo.py`](app/servicios/correo.py). Cada una devuelve `(texto, html)` y se envían como un mensaje `multipart/alternative`: los clientes que no muestran HTML ven el texto plano.

| Plantilla | Cuándo se envía | Asunto |
|---|---|---|
| `plantilla_codigo` | Registro, reenvío y nuevo registro sin confirmar | `123456 es tu código de APIMusic` |
| `plantilla_bienvenida` | Al confirmar el correo, o en el primer login con Google | `¡Bienvenido a APIMusic, Ana! 🎧` |
| `plantilla_recuperacion` | `/auth/forgot` | `123456 es tu código para restablecer tu contraseña` |

Diseño:

- Tema oscuro con acento verde `#1ed760`. La tarjeta mide como máximo 480 px.
- Cabecera con el logo y `NOMBRE_APP`.
- En los correos con código, cada dígito va en su propia casilla, con un aviso «Vence en 15 minutos» y una nota de seguridad.
- El correo de bienvenida lista lo que se puede hacer en la app e incluye un botón «Empezar a escuchar →» que apunta a `WEB_URL`.
- El HTML está hecho **con tablas y estilos en línea, sin `<style>` ni flexbox**, porque es lo único que Gmail, Outlook y Apple Mail muestran de la misma forma. Un test comprueba que no haya `<style`.
- **`LOGO_URL` debe ser la URL pública de un PNG**, accesible sin iniciar sesión: por ejemplo, un archivo en Storage con token de descarga o en la carpeta `public/` de la web ya desplegada. Gmail no muestra SVG ni imágenes en `localhost`. Si `LOGO_URL` está vacía, se muestra un círculo verde con ♫ hecho en HTML.

## Tests

```powershell
pytest -q            # todos
pytest -q tests/test_auth.py               # un archivo
pytest -q -k playlist                      # por nombre
```

Usan `create_app` con servicios en memoria: no tocan Firebase, no envían correos y no necesitan `.env`.

**Resultado actual:** `103 passed in 1.78s` (Python 3.13.3).

| Archivo | Tests | Qué cubre |
|---|---|---|
| [`test_auth.py`](tests/test_auth.py) | 27 | `/` y `/genres`; que el registro envíe el código sin dar token; que el código no se guarde en texto plano; login 403 antes de confirmar; verificar y luego hacer login; conteo de intentos y 429; código vencido (410); espera entre reenvíos y reemplazo del código; registrarse otra vez sin confirmar; correo ya confirmado (409); validaciones del registro; login con Google (crea el perfil, confirma un registro pendiente, token inválido); `/auth/me` GET y PUT; token expirado; token firmado con otra clave |
| [`test_canciones.py`](tests/test_canciones.py) | 33 | Crear con portada; duración leída del mp3; mp3 ilegible sin duración; falta de audio; JSON en vez de multipart; campos inválidos; artista, álbum o invitado inexistente; tipo de audio incorrecto; invitados con duplicados y con el artista principal; portada y año heredados del álbum; portada propia frente a la del álbum; sencillo sin año; permisos 401 y 403; listar y filtrar (`genero`, `q`, `artist_id` como principal o invitado); actualización parcial, de invitados, quitar el álbum, reemplazar el audio; borrar la canción y sus archivos; texto con «SQL» que se guarda tal cual |
| [`test_artistas_albumes.py`](tests/test_artistas_albumes.py) | 17 | Artista con foto; nombre repetido (409); validaciones; permisos; orden alfabético y búsqueda; perfil con álbumes, canciones y apariciones; propagación al renombrar; no se borra un artista con canciones; borrar un artista libre. Álbum: crear, validaciones, título repetido para el mismo artista, orden de pistas y totales, propagación del título y la portada a las canciones, filtro por artista, no se borra con canciones, 404 |
| [`test_playlists_favoritos.py`](tests/test_playlists_favoritos.py) | 12 | Playlist de rock de 12 minutos (la que no cabe se salta), todos los géneros, errores 400 y 404, sin token; flujo de favoritos (sin duplicados, son de cada usuario, se quitan), favorito de una canción borrada, canción inexistente, sin token |
| [`test_recuperar.py`](tests/test_recuperar.py) | 8 | Flujo completo de recuperación (la clave vieja deja de servir); correo inexistente responde igual y no envía nada; límite de intentos; el código sirve una sola vez; espera entre envíos; el código de registro no sirve para restablecer; la recuperación también confirma una cuenta pendiente; validaciones |
| [`test_correo.py`](tests/test_correo.py) | 6 | `CorreoSMTP` arma el mensaje con STARTTLS, login y partes de texto y HTML (con un SMTP falso); casillas y logo en la plantilla; respaldo sin logo; bienvenida al verificar; con Google la bienvenida se envía solo la primera vez; si falla el SMTP responde 502 y se puede reintentar |

**Fixtures y ayudas de [`conftest.py`](tests/conftest.py):**

| Nombre | Qué hace |
|---|---|
| `servicios` | `crear_servicios_memoria()`, nuevos en cada test |
| `client` | Cliente de pruebas de Flask con `TESTING` y una `SECRET_KEY` de pruebas |
| `registrar(email, clave, nombres, apellidos)` | Registra y confirma una cuenta leyendo el código del correo en memoria. Devuelve la respuesta de `/auth/verify` |
| `usuario` | Cabecera `Authorization` de un usuario normal (`ana@test.com`) |
| `admin` | Registra a `dario@test.com`, le pone `rol: admin` en memoria (lo mismo que hace `crear_admin.py`), inicia sesión y devuelve la cabecera |
| `artista(nombre)` | Crea el artista (o reutiliza uno ya creado) y devuelve su id |
| `album(titulo, nombre_artista, anio, portada)` | Crea un álbum en multipart y devuelve su id |
| `crear(artista_nombre, **campos)` | Crea una canción como admin y devuelve su id |
| `mp3_falso(segundos)` | Genera bytes de un mp3 mínimo válido que mutagen puede leer |
| `form_cancion(...)` | Arma el multipart de una canción, como el panel de admin |
| `codigo_enviado(servicios, email)` | Saca el código de 6 dígitos del último correo enviado a ese email |

## Estructura de carpetas

```
api/
├── app/
│   ├── __init__.py            # create_app: config, CORS, servicios, blueprints, /, /genres y errores JSON
│   ├── config.py              # Clase Config: lee el .env y define límites, tiempos y géneros
│   ├── auth.py                # Blueprint /auth: JWT, decoradores token/admin, registro, códigos, login, Google, recuperación, perfil
│   ├── canciones.py           # Blueprint /songs: CRUD, subida de audio y portada, invitados, filtros y búsqueda
│   ├── artistas.py            # Blueprint /artists: CRUD, nombre único, propagación del nombre, perfil del artista
│   ├── albumes.py             # Blueprint /albums: CRUD, tipos, título único por artista, tracklist ordenado
│   ├── playlists.py           # Blueprint /playlists: generador por duración y género
│   ├── favoritos.py           # Blueprint /me/favorites: listar, agregar y quitar
│   ├── validacion.py          # Lectura de JSON o multipart, validadores, archivos, duración del mp3
│   ├── repos/
│   │   ├── firestore_repo.py  # ColeccionFirestore y UsuariosFirestore (con subcolección de favoritos)
│   │   └── memoria_repo.py    # Las mismas interfaces guardadas en diccionarios, para los tests
│   └── servicios/
│       ├── __init__.py        # Dataclass Servicios y servicios() para obtenerlos desde la app
│       ├── firebase.py        # StorageFirebase, AuthFirebase, _credenciales y crear_servicios_firebase
│       ├── memoria.py         # StorageMemoria, AuthMemoria y crear_servicios_memoria
│       └── correo.py          # CorreoSMTP, CorreoConsola, CorreoMemoria y las plantillas HTML
├── tests/
│   ├── conftest.py            # Fixtures (client, usuario, admin, artista, album, crear...) y ayudas
│   └── test_*.py              # Tests por área (ver la sección Tests)
├── run.py                     # Arranca el servidor de desarrollo en 0.0.0.0:5000
├── crear_admin.py             # Convierte una cuenta existente en admin
├── diag.py                    # Diagnóstico: prueba escribir en Firestore y en Storage con tus credenciales
├── requirements.txt           # Dependencias, sin versiones fijas
├── .env.example               # Plantilla de variables de entorno
├── .gitignore                 # Ignora .env, serviceAccountKey.json, entornos virtuales y cachés
├── .env                       # (local, no se sube) tus valores reales
└── serviceAccountKey.json     # (local, no se sube) credenciales de la cuenta de servicio
```

## Despliegue (opcional)

Para Cloud Run u otro servicio de Google Cloud:

- **No hace falta `serviceAccountKey.json`.** `_credenciales()` ([`app/servicios/firebase.py`](app/servicios/firebase.py)) usa el archivo solo si existe. Si no existe, usa `credentials.ApplicationDefault()`, es decir, la cuenta de servicio con la que corre el servicio. Dale a esa cuenta los mismos roles que se describen en el [paso 2](#2-configurar-firebase). La excepción es `crear_admin.py`, que siempre necesita el archivo; ejecútalo desde tu PC.
- Configura las variables como variables de entorno del servicio. Guarda `SECRET_KEY`, `SMTP_CLAVE` y `FIREBASE_WEB_API_KEY` en Secret Manager.
- **Ajusta `CORS_ORIGENES`** al dominio real de la web (por ejemplo `https://apimusic.example.com`) y **`WEB_URL`** a esa misma URL, para que el botón del correo de bienvenida no apunte a `localhost`.
- Agrega el dominio de la web en *Authentication → Configuración → Dominios autorizados*, para que funcione el login con Google.
- `run.py` arranca el servidor de desarrollo de Flask con `debug=True` en el puerto 5000. En producción usa un servidor WSGI, por ejemplo `gunicorn "app:create_app()"`, que no está en `requirements.txt`. Haz que escuche en el puerto que indica la variable `PORT` de Cloud Run, o configura el servicio para usar el 5000.
