import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { AuthCaja, BotonGoogle } from '../components/AuthCaja.jsx'

export default function Login() {
  const { iniciarSesion, aviso } = useAuth()
  const navegar = useNavigate()
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      await iniciarSesion(email, clave)
    } catch (err) {
      // Cuenta sin confirmar: se lleva a la pantalla del código
      if (err.datos?.requiere_verificacion) {
        navegar(`/verificar?email=${encodeURIComponent(err.datos.email)}`)
        return
      }
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <AuthCaja titulo="Inicia sesión" subtitulo="Escucha tu música favorita en APIMusic.">
      {aviso && <div className="alerta alerta-info">{aviso}</div>}
      {error && <div className="alerta alerta-error">{error}</div>}

      <BotonGoogle onError={setError} />

      <form className="form-auth" onSubmit={enviar}>
        <label className="campo">
          <span>Correo</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            autoComplete="email" required />
        </label>
        <label className="campo">
          <span>Contraseña</span>
          <input type="password" value={clave} onChange={(e) => setClave(e.target.value)}
            autoComplete="current-password" required minLength={6} />
        </label>
        <Link className="olvide" to={`/recuperar${email ? `?email=${encodeURIComponent(email)}` : ''}`}>
          ¿Olvidaste tu contraseña?
        </Link>
        <button className="btn btn-primario btn-ancho" disabled={cargando}>
          {cargando ? 'Entrando…' : 'Iniciar sesión'}
        </button>
      </form>

      <p className="tenue auth-pie">¿No tienes cuenta? <Link to="/registro">Regístrate gratis</Link></p>
    </AuthCaja>
  )
}