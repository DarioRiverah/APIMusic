# UnderTone · Web

Reproductor de música de UnderTone, hecho con React 19, Vite 8, React Router 7 y Firebase Auth (solo para el login con Google). Toda la información viene de la API Flask que está en [`../api`](../api).

## Qué se puede hacer

**Usuario**
- Crear una cuenta con correo y confirmarla con un código, o entrar con Google.
- Ver en el inicio la tarjeta de **DJ Lia**, las canciones agregadas hace poco, los álbumes y los artistas.
- Escuchar a **DJ Lia**: escoge una vibra (mix, favoritas, descubrir o un género), arma la sesión y presenta cada bloque con voz.
- Buscar canciones, artistas y álbumes (sin importar las tildes) y explorar por género.
- Abrir el perfil de un artista (canciones, discografía, apariciones como invitado) y el detalle de un álbum.
- Marcar canciones como "Me gusta" y escucharlas en la playlist **Tus me gusta**.
- **Generar una playlist** que quepa en los minutos que indique, con un género opcional.
- Editar su nombre y apellidos en el perfil, y cerrar sesión.
- Personalizar la app en **Ajustes**: color, tema de la barra de reproducción, grosor, fondo, letra, brillo, vidrio, animaciones, temporizador de sueño y voz del DJ.

**Admin** (además de todo lo anterior)
- Entrar al panel `/admin` desde el menú lateral.
- Crear, editar y eliminar canciones (mp3 de hasta 15 MB, portada, artistas invitados, álbum y número de pista), artistas (foto, descripción, géneros) y álbumes (portada, tipo, año).
- Ver la barra de subida con el progreso de cada archivo.

## Requisitos

- **Node.js 20.19 o superior** (o 22.12 o superior). Lo exigen Vite 8, `@vitejs/plugin-react` y oxlint.
- La **API de `../api` corriendo**. Por defecto la web la busca en `http://127.0.0.1:5000`.

## Cómo correrlo

```bash
cp .env.example .env    # y completa los valores (ver abajo)
npm install
npm run dev             # servidor de desarrollo en http://localhost:5173
npm run build           # build de producción en dist/
npm run preview         # sirve el build para probarlo
npm run lint            # oxlint
```

## Variables de entorno

Van en `web/.env` (no se sube al repositorio). La plantilla es [`.env.example`](.env.example). Vite solo expone al navegador las variables que empiezan con `VITE_`.

| Variable | Qué es | Dónde se consigue |
|---|---|---|
| `VITE_API_URL` | URL base de la API Flask, sin `/` al final. | Donde corre la API. En local: `http://127.0.0.1:5000`. |
| `VITE_FIREBASE_API_KEY` | Clave web del proyecto de Firebase. | Consola de Firebase → ⚙️ Configuración del proyecto → General → *Tus apps* → app web → objeto `firebaseConfig`, campo `apiKey`. |
| `VITE_FIREBASE_AUTH_DOMAIN` | Dominio que abre la ventana de Google. | Mismo `firebaseConfig`, campo `authDomain` (`<proyecto>.firebaseapp.com`). |
| `VITE_FIREBASE_PROJECT_ID` | ID del proyecto de Firebase. | Mismo `firebaseConfig`, campo `projectId`. |
| `VITE_FIREBASE_APP_ID` | ID de la app web registrada. | Mismo `firebaseConfig`, campo `appId`. |

Para que funcione "Continuar con Google" también hay que:
1. Activar el proveedor **Google** en Firebase → Authentication → Sign-in method.
2. Agregar el dominio donde se sirve la web en Authentication → Settings → *Authorized domains* (`localhost` ya viene incluido).

Si faltan `VITE_FIREBASE_API_KEY` o `VITE_FIREBASE_AUTH_DOMAIN`, el botón de Google no aparece y solo queda el login con correo.

## La API y el primer admin

La web no guarda datos propios: catálogo, usuarios, favoritos y archivos pasan por la API. Para levantarla, sigue las instrucciones de `../api`.

Todas las cuentas nuevas son de usuario. Para convertir una en admin:

1. Regístrala desde la web (o con `POST /auth/register`) y confírmala.
2. Desde la carpeta `api/`, ejecuta:
   ```bash
   python crear_admin.py correo@ejemplo.com
   ```
3. Cierra sesión y vuelve a entrar para recibir el token con el rol nuevo. Aparecerá **Panel de admin** en el menú.

## Estructura

```
web/
├── index.html                  HTML base: fuente Inter, favicon y metadatos
├── vite.config.js              Configuración de Vite (plugin de React)
├── .oxlintrc.json              Reglas del linter
├── .env.example                Plantilla de variables de entorno
├── public/
│   ├── favicon.svg             Logo de UnderTone (ícono de la pestaña)
│   └── logo-correo.png         Logo en PNG para los correos
└── src/
    ├── main.jsx                Punto de entrada: monta AjustesProvider + Router + AuthProvider + App
    ├── ajustes.jsx             Contexto de Ajustes: se guarda en localStorage y se aplica como variables CSS
    ├── App.jsx                 Rutas y guardas (sin sesión / con sesión / solo admin)
    ├── api.js                  Cliente HTTP de la API, sesión en localStorage y helpers de formato
    ├── auth.jsx                Contexto de sesión: login, registro, verificación, Google, recuperar clave
    ├── catalogo.jsx            Contexto que carga canciones, artistas, álbumes y géneros una vez
    ├── favoritos.jsx           Contexto con los ids de "Tus me gusta"
    ├── reproductor.jsx         Contexto del reproductor global (un solo <audio>, la cola, el temporizador y el modo DJ)
    ├── voz-dj.js               Hace hablar al DJ: audio de la API o, si no hay, la voz del navegador
    ├── firebase.js             Popup de Google con Firebase; solo devuelve el ID token
    ├── index.css               Todos los estilos de la app
    ├── components/
    │   ├── AuthCaja.jsx        Marco de las pantallas de login/registro y botón de Google
    │   ├── BarraReproductor.jsx Barra inferior de reproducción y atajo de espacio
    │   ├── comunes.jsx         Imagen con respaldo, selector de imagen, progreso, confirmar borrado, encabezado
    │   ├── Icono.jsx           Íconos SVG propios y logo de Google
    │   ├── LayoutApp.jsx       Menú lateral, navegación móvil, reproductor y avisos de la app
    │   ├── Marca.jsx           Nombre y logo de UnderTone
    │   ├── Munecos.jsx         Dibujos SVG propios de los temas (cohete, pato, gato, rana…)
    │   ├── TarjetaDJ.jsx       Tarjeta de DJ Lia en el inicio, con las vibras
    │   ├── TemasBarra.jsx      Lista de temas y la barra de progreso con tema
    │   ├── Modal.jsx           Ventana modal (se cierra con Esc o clic afuera)
    │   ├── musica.jsx          Lista de canciones, tarjetas, secciones, cabeceras y botones de play / me gusta
    │   └── admin/
    │       ├── FormAlbum.jsx   Formulario de álbum
    │       ├── FormArtista.jsx Formulario de artista
    │       ├── FormCancion.jsx Formulario de canción (mp3, portada, invitados, álbum)
    │       └── LayoutAdmin.jsx Barra superior y pestañas del panel de admin
    └── pages/
        ├── Login.jsx           Iniciar sesión
        ├── Registro.jsx        Crear cuenta
        ├── Verificar.jsx       Código de 6 dígitos para confirmar el correo
        ├── Recuperar.jsx       Recuperar contraseña con código
        ├── Inicio.jsx          Saludo, accesos, recientes, álbumes y artistas
        ├── Buscar.jsx          Buscador y exploración por género
        ├── Artista.jsx         Perfil de artista
        ├── Album.jsx           Detalle de álbum
        ├── Favoritos.jsx       Playlist "Tus me gusta"
        ├── Generar.jsx         Generador de playlists por duración
        ├── Perfil.jsx          Datos del usuario y cerrar sesión
        ├── Ajustes.jsx         Color, barra de reproducción, DJ, temporizador y apariencia
        └── admin/
            ├── Canciones.jsx   Tabla de canciones con filtros y estadísticas
            ├── Artistas.jsx    Rejilla de artistas
            └── Albumes.jsx     Rejilla de álbumes
```

## Rutas

| Ruta | Pantalla | Sin sesión | Usuario | Admin |
|---|---|:-:|:-:|:-:|
| `/login` | Iniciar sesión | ✅ | ↪ `/` | ↪ `/` |
| `/registro` | Crear cuenta | ✅ | ↪ `/` | ↪ `/` |
| `/verificar?email=…` | Confirmar correo | ✅ | ↪ `/` | ↪ `/` |
| `/recuperar` | Recuperar contraseña | ✅ | ↪ `/` | ↪ `/` |
| `/` | Inicio | ↪ `/login` | ✅ | ✅ |
| `/buscar` | Buscar (`?q=` y `?genero=`) | ↪ `/login` | ✅ | ✅ |
| `/artista/:id` | Perfil de artista | ↪ `/login` | ✅ | ✅ |
| `/album/:id` | Detalle de álbum | ↪ `/login` | ✅ | ✅ |
| `/favoritos` | Tus me gusta | ↪ `/login` | ✅ | ✅ |
| `/generar` | Generar playlist | ↪ `/login` | ✅ | ✅ |
| `/perfil` | Perfil | ↪ `/login` | ✅ | ✅ |
| `/ajustes` | Ajustes | ↪ `/login` | ✅ | ✅ |
| `/admin` | Admin · Canciones | ↪ `/login` | ↪ `/` | ✅ |
| `/admin/artistas` | Admin · Artistas | ↪ `/login` | ↪ `/` | ✅ |
| `/admin/albumes` | Admin · Álbumes | ↪ `/login` | ↪ `/` | ✅ |
| cualquier otra | — | ↪ `/` | ↪ `/` | ↪ `/` |

↪ = redirige. El rol se lee de la sesión guardada; la API vuelve a validar el token y el rol en cada petición de admin.

## Autenticación

La sesión real es un JWT que emite la API. Se guarda en `localStorage` (`apimusic_sesion`) y se envía como `Authorization: Bearer …`. Si una petición con token responde 401, la sesión se cierra y el login muestra "Tu sesión expiró".

**Registro con código por correo**
1. `/registro` envía nombres, apellidos, correo y clave a `POST /auth/register`. La cuenta todavía no abre sesión.
2. La web va a `/verificar?email=…`, donde se escribe (o se pega) el código de 6 dígitos que llegó al correo.
3. Al completar los 6 dígitos se llama a `POST /auth/verify`, que devuelve la sesión. Se puede pedir otro código cada 60 s (`POST /auth/resend`).
4. Si alguien intenta entrar con una cuenta sin confirmar, el login lo manda a `/verificar`.

**Login con Google**
1. "Continuar con Google" abre el popup de Firebase (`signInWithPopup`) y obtiene el ID token de Google.
2. La sesión de Firebase se cierra enseguida; el token se manda a `POST /auth/google`, que crea la cuenta si hace falta y devuelve el JWT.
3. Si el usuario cierra el popup no pasa nada; si el navegador lo bloquea, se muestra un aviso.

**Recuperar contraseña**
1. `/recuperar` pide el correo y llama a `POST /auth/forgot`, que envía un código.
2. Con el código y la clave nueva (dos veces) se llama a `POST /auth/reset`, que cambia la clave y abre sesión.
3. Se puede reenviar el código cada 60 s; si la API indica que hay que esperar, la cuenta regresiva usa ese tiempo.

## Reproductor

- **Un solo `<audio>`** para toda la sesión (vive en `reproductor.jsx`), así la música sigue al cambiar de página, incluso dentro del panel de admin.
- **Cola**: al reproducir desde una lista (álbum, artista, búsqueda, me gusta, playlist generada…) esa lista se vuelve la cola. El botón de play de una lista pausa o reanuda solo si lo que suena salió de esa misma lista.
- **Aleatorio**: mezcla la cola dejando primero la canción actual; al apagarlo vuelve al orden original sin cortar la canción.
- **Repetir**: cambia entre *no* → *todo* → *una*. Con *una*, al terminar la canción vuelve a empezar; con *todo*, al final de la cola vuelve a la primera.
- **Anterior**: si ya pasaron más de 3 s reinicia la canción; si no, va a la anterior.
- **Atajo de espacio**: play/pausa, salvo cuando el foco está en un campo de texto, un select o un botón.
- **Controles del sistema**: usa la Media Session API, así que funcionan las teclas multimedia y los controles de la pantalla de bloqueo del celular, con título, artistas, álbum y portada.
- **Pestaña**: mientras suena, el título muestra "Canción • Artistas".
- **Volumen**: se guarda en `localStorage` (`apimusic_volumen`). El botón de la bocina silencia o vuelve a 80 %.
- **La barra**: es flotante y solo aparece cuando hay una canción cargada. En el celular (≤ 900 px) muestra además una línea fina de progreso. El tema y el grosor se escogen en Ajustes.
- **Temporizador de sueño**: pausa la música a los minutos elegidos o al terminar la canción actual.
- **Historial**: cuando empieza a sonar una canción se avisa a la API (`POST /me/history`); eso alimenta al DJ.

## DJ Lia

1. Al tocar play en la tarjeta del DJ (o una vibra), la web llama a `POST /dj/session` con la vibra y la hora local.
2. La API devuelve bloques de canciones; la primera canción de cada bloque trae la frase del DJ y, si hay, la URL del audio con su voz.
3. Como en la radio, esa canción arranca con el volumen bajo y, casi un segundo después, `voz-dj.js` reproduce la voz encima. Al terminar, la música vuelve a subir poco a poco. Si no hay audio o falla, usa la voz más natural en español que tenga el navegador. Mientras habla aparece una burbuja con un botón **Saltar**.
4. Al acabarse la cola pide otra sesión, así que el DJ no se detiene.
5. En Ajustes se puede apagar la voz: el DJ solo muestra por escrito lo que diría.

## Ajustes

Se guardan en `localStorage` (`undertone_ajustes`) y se aplican en `<html>` como variables CSS (`--acento`, `--acento-tinta`) y atributos `data-*` (fondo, brillo, vidrio, letra, animaciones, grosor). El color del texto sobre el acento (blanco o negro) se calcula según el contraste. Los temas de la barra usan dibujos SVG propios, no personajes de terceros.
