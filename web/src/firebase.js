// Firebase en el navegador: solo se usa para el botón "Continuar con Google".
// La sesión real la maneja la API (JWT); aquí solo obtenemos el ID token de Google.
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const googleDisponible = Boolean(config.apiKey && config.authDomain)

let auth = null
function obtenerAuth() {
  if (!auth) auth = getAuth(initializeApp(config))
  return auth
}

export async function tokenDeGoogle() {
  if (!googleDisponible) throw new Error('Falta configurar Firebase en el .env del frontend')
  const a = obtenerAuth()
  const proveedor = new GoogleAuthProvider()
  proveedor.setCustomParameters({ prompt: 'select_account' })
  try {
    const { user } = await signInWithPopup(a, proveedor)
    const token = await user.getIdToken()
    await signOut(a)            // la sesión de Firebase ya no se necesita
    return token
  } catch (e) {
    if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return null
    if (e.code === 'auth/popup-blocked') throw new Error('El navegador bloqueó la ventana de Google', { cause: e })
    throw new Error('No se pudo iniciar sesión con Google', { cause: e })
  }
}