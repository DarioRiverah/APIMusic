import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { AuthCaja, BotonGoogle } from '../components/AuthCaja.jsx'

export default function Registro() {
  const { registrarse } = useAuth()
  const navegar = useNavigate()
  const [campos, setCampos] = useState({ nombres: '', apellidos: '', email: '', clave: '', confirmar: '' })
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const cambiar = (e) => setCampos({ ...campos, [e.target.name]: e.target.value })

  async function enviar(e) {
    e.preventDefault()
    setError('')
    if (campos.clave !== campos.confirmar) return setError('Las contraseñas no coinciden')
    setCargando(true)
    try {
      const { confirmar: _, ...datos } = campos
      const res = await registrarse({ ...datos, email: datos.email.trim() })
      navegar(`/verificar?email=${encodeURIComponent(res.email)}`)
    } catch (err) {
      setError(err.message)
      setCargando(false)
    }
  }

  return (
    <AuthCaja titulo="Crea tu cuenta" subtitulo="Es gratis. Te enviaremos un código para confirmar tu correo.">
      {error && <div className="alerta alerta-error">{error}</div>}

      <BotonGoogle onError={setError} />

      <form className="form-auth" onSubmit={enviar}>
        <div className="fila-2">
          <label className="campo">
            <span>Nombre(s)</span>
            <input name="nombres" value={campos.nombres} onChange={cambiar} autoComplete="given-name"
              required maxLength={60} />
          </label>
          <label className="campo">
            <span>Apellido(s)</span>
            <input name="apellidos" value={campos.apellidos} onChange={cambiar} autoComplete="family-name"
              required maxLength={60} />
          </label>
        </div>
        <label className="campo">
          <span>Correo</span>
          <input name="email" type="email" value={campos.email} onChange={cambiar} autoComplete="email" required />
        </label>
        <label className="campo">
          <span>Contraseña</span>
          <input name="clave" type="password" value={campos.clave} onChange={cambiar}
            autoComplete="new-password" required minLength={6} placeholder="Mínimo 6 caracteres" />
        </label>
        <label className="campo">
          <span>Confirmar contraseña</span>
          <input name="confirmar" type="password" value={campos.confirmar} onChange={cambiar}
            autoComplete="new-password" required minLength={6} />
        </label>
        <button className="btn btn-primario btn-ancho" disabled={cargando}>
          {cargando ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>

      <p className="tenue auth-pie">¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
    </AuthCaja>
  )
}