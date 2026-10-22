import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth.jsx'
import { AuthCaja } from '../components/AuthCaja.jsx'

const ESPERA = 60

export default function Recuperar() {
  const { restablecerClave } = useAuth()
  const [params] = useSearchParams()
  const [paso, setPaso] = useState('correo')          // 'correo' -> 'codigo'
  const [email, setEmail] = useState(params.get('email') || '')
  const [codigo, setCodigo] = useState('')
  const [clave, setClave] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [cargando, setCargando] = useState(false)
  const [espera, setEspera] = useState(0)

  useEffect(() => {
    if (espera <= 0) return
    const t = setTimeout(() => setEspera((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [espera])

  async function pedirCodigo(e) {
    e?.preventDefault()
    setError('')
    setInfo('')
    setCargando(true)
    try {
      const r = await api.olvideClave(email.trim())
      setInfo(r.message)
      setPaso('codigo')
      setEspera(ESPERA)
    } catch (err) {
      setError(err.message)
      if (err.datos?.espera_segundos) {       // ya se había pedido hace poco
        setPaso('codigo')
        setEspera(err.datos.espera_segundos)
      }
    } finally {
      setCargando(false)
    }
  }

  async function cambiar(e) {
    e.preventDefault()
    setError('')
    if (clave !== confirmar) return setError('Las contraseñas no coinciden')
    setCargando(true)
    try {
      await restablecerClave(email.trim(), codigo, clave)   // abre sesión y App redirige al inicio
    } catch (err) {
      setError(err.message)
      setCargando(false)
    }
  }

  if (paso === 'correo') {
    return (
      <AuthCaja titulo="¿Olvidaste tu contraseña?"
        subtitulo="Escribe el correo de tu cuenta y te enviaremos un código para crear una nueva.">
        {error && <div className="alerta alerta-error">{error}</div>}
        <form className="form-auth" onSubmit={pedirCodigo}>
          <label className="campo">
            <span>Correo</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              autoComplete="email" required autoFocus />
          </label>
          <button className="btn btn-primario btn-ancho" disabled={cargando}>
            {cargando ? 'Enviando…' : 'Enviar código'}
          </button>
        </form>
        <p className="tenue auth-pie"><Link to="/login">Volver a iniciar sesión</Link></p>
      </AuthCaja>
    )
  }

  return (
    <AuthCaja titulo="Crea una nueva contraseña"
      subtitulo={<>Revisa <strong className="texto-blanco">{email}</strong> y escribe el código de 6 dígitos.</>}>
      {error && <div className="alerta alerta-error">{error}</div>}
      {info && !error && <div className="alerta alerta-info">{info}</div>}

      <form className="form-auth" onSubmit={cambiar}>
        <label className="campo">
          <span>Código</span>
          <input className="input-codigo" value={codigo} inputMode="numeric" autoComplete="one-time-code"
            maxLength={6} required pattern="\d{6}" placeholder="••••••" autoFocus
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))} />
        </label>
        <label className="campo">
          <span>Nueva contraseña</span>
          <input type="password" value={clave} onChange={(e) => setClave(e.target.value)}
            autoComplete="new-password" required minLength={6} placeholder="Mínimo 6 caracteres" />
        </label>
        <label className="campo">
          <span>Confirmar contraseña</span>
          <input type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)}
            autoComplete="new-password" required minLength={6} />
        </label>
        <button className="btn btn-primario btn-ancho" disabled={cargando || codigo.length !== 6}>
          {cargando ? 'Guardando…' : 'Cambiar contraseña'}
        </button>
      </form>

      <p className="tenue auth-pie">
        ¿No te llegó? Revisa spam o{' '}
        {espera > 0
          ? <span>pide otro en {espera} s</span>
          : <button className="enlace" onClick={() => pedirCodigo()}>reenvía el código</button>}
      </p>
      <p className="tenue auth-pie">
        <button className="enlace" onClick={() => { setPaso('correo'); setError(''); setCodigo('') }}>
          Usar otro correo
        </button>
      </p>
    </AuthCaja>
  )
}