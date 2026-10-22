import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { googleDisponible } from '../firebase'
import Icono, { LogoGoogle } from './Icono.jsx'

/** Marco común de las pantallas de login, registro y verificación. */
export function AuthCaja({ titulo, subtitulo, children }) {
  return (
    <main className="login">
      <div className="login-caja">
        <div className="marca marca-grande">
          <span className="marca-logo"><Icono nombre="logo" tam={22} /></span>
          APIMusic
        </div>
        <h1>{titulo}</h1>
        {subtitulo && <p className="tenue">{subtitulo}</p>}
        {children}
      </div>
    </main>
  )
}

/** Botón "Continuar con Google" + separador. Lleva al inicio al entrar. */
export function BotonGoogle({ onError }) {
  const { entrarConGoogle } = useAuth()
  const navegar = useNavigate()
  const [cargando, setCargando] = useState(false)

  if (!googleDisponible) return null

  async function entrar() {
    onError('')
    setCargando(true)
    try {
      if (await entrarConGoogle()) navegar('/', { replace: true })
    } catch (e) {
      onError(e.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <>
      <button type="button" className="btn btn-google btn-ancho" onClick={entrar} disabled={cargando}>
        <LogoGoogle /> {cargando ? 'Conectando…' : 'Continuar con Google'}
      </button>
      <div className="separador"><span>o con tu correo</span></div>
    </>
  )
}