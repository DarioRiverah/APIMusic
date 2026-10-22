import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { useFavoritos } from '../favoritos.jsx'
import BarraReproductor from './BarraReproductor.jsx'
import Icono from './Icono.jsx'

export default function LayoutApp() {
  const { sesion, esAdmin } = useAuth()
  const { total } = useFavoritos()
  const [aviso, setAviso] = useState('')
  const usuario = sesion.usuario

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(''), 3500)
    return () => clearTimeout(t)
  }, [aviso])

  const enlaces = [
    { a: '/', icono: 'casa', texto: 'Inicio' },
    { a: '/buscar', icono: 'buscar', texto: 'Buscar' },
    { a: '/favoritos', icono: 'corazon', texto: 'Tus me gusta', n: total },
    { a: '/generar', icono: 'varita', texto: 'Generar playlist' },
  ]

  return (
    <div className="app-shell">
      <aside className="lateral">
        <Link to="/" className="marca lateral-marca">
          <span className="marca-logo"><Icono nombre="logo" tam={18} /></span>
          APIMusic
        </Link>
        <nav className="lateral-nav" aria-label="Principal">
          {enlaces.map((e) => (
            <NavLink key={e.a} to={e.a} end className="lateral-enlace">
              <Icono nombre={e.icono} tam={22} /> <span>{e.texto}</span>
              {e.n > 0 && <span className="pestana-n">{e.n}</span>}
            </NavLink>
          ))}
          {esAdmin && (
            <NavLink to="/admin" className="lateral-enlace lateral-admin">
              <Icono nombre="escudo" tam={22} /> <span>Panel de admin</span>
            </NavLink>
          )}
        </nav>
        <NavLink to="/perfil" className="lateral-usuario">
          {usuario.foto_url
            ? <img src={usuario.foto_url} alt="" className="avatar" referrerPolicy="no-referrer" />
            : <span className="avatar">{usuario.nombres?.[0]?.toUpperCase()}</span>}
          <span className="lateral-usuario-textos">
            <strong>{usuario.nombre}</strong>
            <small className="tenue">Ver perfil</small>
          </span>
        </NavLink>
      </aside>

      <main className="principal">
        <Outlet context={{ avisar: setAviso }} />
      </main>

      <BarraReproductor avisar={setAviso} />

      <nav className="nav-movil" aria-label="Principal">
        {[...enlaces.slice(0, 3), { a: '/perfil', icono: 'persona', texto: 'Perfil' }].map((e) => (
          <NavLink key={e.a} to={e.a} end className="nav-movil-enlace">
            <Icono nombre={e.icono} tam={22} /><span>{e.texto === 'Tus me gusta' ? 'Me gusta' : e.texto}</span>
          </NavLink>
        ))}
      </nav>

      {aviso && <div className="toast" role="status">{aviso}</div>}
    </div>
  )
}