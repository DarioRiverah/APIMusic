import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth.jsx'
import { AuthCaja } from '../components/AuthCaja.jsx'

const ESPERA = 60

export default function Verificar() {
  const { verificarCodigo } = useAuth()
  const [params] = useSearchParams()
  const email = params.get('email') || ''
  const [digitos, setDigitos] = useState(Array(6).fill(''))
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [cargando, setCargando] = useState(false)
  const [espera, setEspera] = useState(ESPERA)
  const cajas = useRef([])

  useEffect(() => {
    if (espera <= 0) return
    const t = setTimeout(() => setEspera((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [espera])

  if (!email) return <Navigate to="/registro" replace />

  async function confirmar(codigo) {
    setError('')
    setCargando(true)
    try {
      await verificarCodigo(email, codigo)      // abre sesión y App redirige al inicio
    } catch (err) {
      setError(err.message)
      setDigitos(Array(6).fill(''))
      cajas.current[0]?.focus()
      setCargando(false)
    }
  }

  function escribir(i, valor) {
    const solo = valor.replace(/\D/g, '')
    if (!solo) {
      setDigitos((d) => d.map((x, j) => (j === i ? '' : x)))
      return
    }
    // Permite pegar el código completo en cualquier casilla
    const nuevos = [...digitos]
    solo.slice(0, 6 - i).split('').forEach((c, k) => { nuevos[i + k] = c })
    setDigitos(nuevos)
    const siguiente = Math.min(i + solo.length, 5)
    cajas.current[siguiente]?.focus()
    if (nuevos.every(Boolean)) confirmar(nuevos.join(''))
  }

  function teclear(i, e) {
    if (e.key === 'Backspace' && !digitos[i] && i > 0) cajas.current[i - 1]?.focus()
  }

  async function reenviar() {
    setError('')
    setInfo('')
    try {
      await api.reenviarCodigo(email)
      setInfo('Te enviamos un código nuevo')
      setEspera(ESPERA)
    } catch (err) {
      setError(err.message)
      if (err.datos?.espera_segundos) setEspera(err.datos.espera_segundos)
    }
  }

  return (
    <AuthCaja titulo="Confirma tu correo"
      subtitulo={<>Escribe el código de 6 dígitos que enviamos a <strong className="texto-blanco">{email}</strong>.</>}>
      {error && <div className="alerta alerta-error">{error}</div>}
      {info && <div className="alerta alerta-info">{info}</div>}

      <form className="codigo" onSubmit={(e) => { e.preventDefault(); confirmar(digitos.join('')) }}>
        {digitos.map((d, i) => (
          <input key={i} ref={(el) => { cajas.current[i] = el }} value={d} inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={6} disabled={cargando}
            aria-label={`Dígito ${i + 1}`} autoFocus={i === 0}
            onChange={(e) => escribir(i, e.target.value)} onKeyDown={(e) => teclear(i, e)} />
        ))}
      </form>

      <button className="btn btn-primario btn-ancho" disabled={cargando || !digitos.every(Boolean)}
        onClick={() => confirmar(digitos.join(''))}>
        {cargando ? 'Confirmando…' : 'Confirmar'}
      </button>

      <p className="tenue auth-pie">
        ¿No te llegó? Revisa spam o{' '}
        {espera > 0
          ? <span>pide otro en {espera} s</span>
          : <button className="enlace" onClick={reenviar}>reenvía el código</button>}
      </p>
      <p className="tenue auth-pie"><Link to="/login">Volver a iniciar sesión</Link></p>
    </AuthCaja>
  )
}