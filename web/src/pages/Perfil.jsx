import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth.jsx'
import { useFavoritos } from '../favoritos.jsx'
import Icono, { LogoGoogle } from '../components/Icono.jsx'

export default function Perfil() {
  const { sesion, actualizarUsuario, cerrarSesion } = useAuth()
  const { total } = useFavoritos()
  const { avisar } = useOutletContext()
  const u = sesion.usuario
  const [nombres, setNombres] = useState(u.nombres || '')
  const [apellidos, setApellidos] = useState(u.apellidos || '')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const cambio = nombres.trim() !== (u.nombres || '') || apellidos.trim() !== (u.apellidos || '')

  async function guardar(e) {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      const res = await api.actualizarPerfil({ nombres, apellidos })
      actualizarUsuario(res.usuario)
      avisar('Perfil actualizado')
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="pagina pagina-cabecera">
      <header className="cabecera">
        {u.foto_url
          ? <img src={u.foto_url} alt="" className="cabecera-img redondo" referrerPolicy="no-referrer" />
          : <span className="cabecera-img redondo cabecera-inicial">{u.nombres?.[0]?.toUpperCase()}</span>}
        <div className="cabecera-textos">
          <span className="cabecera-tipo">Perfil</span>
          <h1 className="cabecera-titulo">{u.nombre}</h1>
          <div className="cabecera-meta">{total} {total === 1 ? 'canción' : 'canciones'} en Tus me gusta</div>
        </div>
      </header>

      <form className="perfil-form" onSubmit={guardar}>
        <h2>Tus datos</h2>
        {error && <div className="alerta alerta-error">{error}</div>}
        <div className="fila-2">
          <label className="campo">
            <span>Nombre(s)</span>
            <input value={nombres} onChange={(e) => setNombres(e.target.value)} required maxLength={60} />
          </label>
          <label className="campo">
            <span>Apellido(s)</span>
            <input value={apellidos} onChange={(e) => setApellidos(e.target.value)} required maxLength={60} />
          </label>
        </div>
        <label className="campo">
          <span>Correo</span>
          <input value={u.email} disabled />
        </label>
        <p className="tenue proveedor">
          {u.proveedor === 'google'
            ? <><LogoGoogle tam={16} /> Entras con tu cuenta de Google</>
            : <><Icono nombre="correo" tam={16} /> Entras con correo y contraseña</>}
        </p>
        <div className="perfil-acciones">
          <button className="btn btn-primario" disabled={!cambio || guardando}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
          <button type="button" className="btn btn-fantasma" onClick={() => cerrarSesion()}>
            <Icono nombre="salir" tam={16} /> Cerrar sesión
          </button>
        </div>
      </form>
    </div>
  )
}