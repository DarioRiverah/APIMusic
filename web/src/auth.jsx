import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, eventoSesionExpirada, guardarSesion, leerSesion } from './api'
import { tokenDeGoogle } from './firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(() => leerSesion())
  const [aviso, setAviso] = useState('')

  const cerrarSesion = useCallback((mensaje = '') => {
    guardarSesion(null)
    setSesion(null)
    setAviso(mensaje)
  }, [])

  useEffect(() => {
    const alExpirar = () => cerrarSesion('Tu sesión expiró. Vuelve a iniciar sesión.')
    eventoSesionExpirada.addEventListener('expirada', alExpirar)
    return () => eventoSesionExpirada.removeEventListener('expirada', alExpirar)
  }, [cerrarSesion])

  function abrirSesion(datos) {
    guardarSesion(datos)
    setSesion(datos)
    setAviso('')
  }

  const iniciarSesion = async (email, clave) => abrirSesion(await api.login(email, clave))
  // El registro no abre sesión: devuelve { email, requiere_verificacion } y se pide el código
  const registrarse = (datos) => api.registrar(datos)
  const verificarCodigo = async (email, codigo) => abrirSesion(await api.verificar(email, codigo))
  const restablecerClave = async (email, codigo, clave) =>
    abrirSesion(await api.restablecerClave(email, codigo, clave))

  /** Devuelve false si el usuario cerró la ventana de Google. */
  async function entrarConGoogle() {
    const token = await tokenDeGoogle()
    if (!token) return false
    abrirSesion(await api.loginGoogle(token))
    return true
  }

  function actualizarUsuario(usuario) {
    const nueva = { ...sesion, usuario }
    guardarSesion(nueva)
    setSesion(nueva)
  }

  const esAdmin = sesion?.usuario?.rol === 'admin'

  return (
    <AuthContext.Provider value={{
      sesion, esAdmin, aviso, iniciarSesion, registrarse, verificarCodigo, restablecerClave, entrarConGoogle,
      actualizarUsuario, cerrarSesion,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)