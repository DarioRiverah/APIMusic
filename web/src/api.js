const API_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '')
const CLAVE_SESION = 'apimusic_sesion'

export function leerSesion() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_SESION))
  } catch {
    return null
  }
}

export function guardarSesion(sesion) {
  try {
    if (sesion) localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion))
    else localStorage.removeItem(CLAVE_SESION)
  } catch {
    /* localStorage bloqueado: la sesión vive solo en memoria */
  }
}

// Se dispara cuando el token vence o es inválido, para volver al login
export const eventoSesionExpirada = new EventTarget()

export class ErrorApi extends Error {
  constructor(mensaje, status, datos = null) {
    super(mensaje)
    this.status = status
    this.datos = datos          // cuerpo completo (ej: requiere_verificacion, espera_segundos)
  }
}

function manejarRespuesta(status, cuerpo, conToken) {
  // Solo es "sesión expirada" si la petición llevaba token; un login fallido también da 401
  if (status === 401 && conToken) eventoSesionExpirada.dispatchEvent(new Event('expirada'))
  if (status >= 400) throw new ErrorApi(cuerpo?.error || `Error ${status}`, status, cuerpo)
  return cuerpo
}

async function peticion(ruta, { method = 'GET', body, auth = true } = {}) {
  const headers = {}
  const token = leerSesion()?.token
  if (auth && token) headers.Authorization = `Bearer ${token}`
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json'

  let res
  try {
    res = await fetch(`${API_URL}${ruta}`, {
      method,
      headers,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ErrorApi(`No se pudo conectar con la API (${API_URL}). ¿Está corriendo?`, 0)
  }
  const cuerpo = await res.json().catch(() => null)
  return manejarRespuesta(res.status, cuerpo, Boolean(headers.Authorization))
}

// Subida con barra de progreso (fetch no reporta progreso de subida)
function subirFormulario(ruta, method, formData, onProgreso) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(method, `${API_URL}${ruta}`)
    const token = leerSesion()?.token
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgreso) onProgreso(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      let cuerpo = null
      try {
        cuerpo = JSON.parse(xhr.responseText)
      } catch {
        /* respuesta vacía */
      }
      try {
        resolve(manejarRespuesta(xhr.status, cuerpo, Boolean(token)))
      } catch (e) {
        reject(e)
      }
    }
    xhr.onerror = () => reject(new ErrorApi(`No se pudo conectar con la API (${API_URL})`, 0))
    xhr.send(formData)
  })
}

export const api = {
  login: (email, clave) =>
    peticion('/auth/login', { method: 'POST', body: { email, clave }, auth: false }),
  registrar: (datos) => peticion('/auth/register', { method: 'POST', body: datos, auth: false }),
  verificar: (email, codigo) =>
    peticion('/auth/verify', { method: 'POST', body: { email, codigo }, auth: false }),
  reenviarCodigo: (email) =>
    peticion('/auth/resend', { method: 'POST', body: { email }, auth: false }),
  olvideClave: (email) =>
    peticion('/auth/forgot', { method: 'POST', body: { email }, auth: false }),
  restablecerClave: (email, codigo, clave) =>
    peticion('/auth/reset', { method: 'POST', body: { email, codigo, clave }, auth: false }),
  loginGoogle: (id_token) =>
    peticion('/auth/google', { method: 'POST', body: { id_token }, auth: false }),
  actualizarPerfil: (datos) => peticion('/auth/me', { method: 'PUT', body: datos }),
  generos: () => peticion('/genres', { auth: false }),

  perfilArtista: (id) => peticion(`/artists/${id}`, { auth: false }),
  detalleAlbum: (id) => peticion(`/albums/${id}`, { auth: false }),
  favoritos: () => peticion('/me/favorites'),
  agregarFavorito: (id) => peticion(`/me/favorites/${id}`, { method: 'PUT' }),
  quitarFavorito: (id) => peticion(`/me/favorites/${id}`, { method: 'DELETE' }),
  generarPlaylist: (duracion_max_minutos, genero) =>
    peticion('/playlists/generate', {
      method: 'POST', body: genero ? { duracion_max_minutos, genero } : { duracion_max_minutos },
    }),

  listarCanciones: () => peticion('/songs', { auth: false }),
  crearCancion: (fd, onProgreso) => subirFormulario('/songs', 'POST', fd, onProgreso),
  actualizarCancion: (id, fd, onProgreso) => subirFormulario(`/songs/${id}`, 'PUT', fd, onProgreso),
  eliminarCancion: (id) => peticion(`/songs/${id}`, { method: 'DELETE' }),

  listarArtistas: () => peticion('/artists', { auth: false }),
  crearArtista: (fd, onProgreso) => subirFormulario('/artists', 'POST', fd, onProgreso),
  actualizarArtista: (id, fd, onProgreso) => subirFormulario(`/artists/${id}`, 'PUT', fd, onProgreso),
  eliminarArtista: (id) => peticion(`/artists/${id}`, { method: 'DELETE' }),

  listarAlbumes: () => peticion('/albums', { auth: false }),
  crearAlbum: (fd, onProgreso) => subirFormulario('/albums', 'POST', fd, onProgreso),
  actualizarAlbum: (id, fd, onProgreso) => subirFormulario(`/albums/${id}`, 'PUT', fd, onProgreso),
  eliminarAlbum: (id) => peticion(`/albums/${id}`, { method: 'DELETE' }),
}

export function formatoDuracion(segundos = 0) {
  const m = Math.floor(segundos / 60)
  const s = String(segundos % 60).padStart(2, '0')
  return `${m}:${s}`
}

export const capitalizar = (texto = '') => texto.charAt(0).toUpperCase() + texto.slice(1)

export const TIPOS_ALBUM = { album: 'Álbum', ep: 'EP', sencillo: 'Sencillo' }

export const nombresArtistas = (c) =>
  [c.artista.nombre, ...c.invitados.map((i) => i.nombre)].join(', ')

export function formatoLargo(segundos = 0) {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  return h ? `${h} h ${m} min` : `${m} min ${segundos % 60} s`
}