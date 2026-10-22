import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth.jsx'
import { useCatalogo } from '../../catalogo.jsx'
import BarraReproductor from '../BarraReproductor.jsx'
import Icono from '../Icono.jsx'

export default function LayoutAdmin() {
  const { sesion, cerrarSesion } = useAuth()
  const { canciones, artistas, albumes } = useCatalogo()
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(''), 3500)
    return () => clearTimeout(t)
  }, [aviso])

  const pestanas = [
    { a: '/admin', texto: 'Canciones', n: canciones.length },
    { a: '/admin/artistas', texto: 'Artistas', n: artistas.length },
    { a: '/admin/albumes', texto: 'Álbumes', n: albumes.length },
  ]

  return (
    <div className="app">
      <header className="barra">
        <Link to="/" className="marca" title="Volver a la app">
          <span className="marca-logo"><Icono nombre="logo" tam={18} /></span>
          APIMusic <span className="marca-tag">Admin</span>
        </Link>
        <nav className="pestanas" aria-label="Secciones">
          {pestanas.map((p) => (
            <NavLink key={p.a} to={p.a} end className="pestana">
              {p.texto} <span className="pestana-n">{p.n}</span>
            </NavLink>
          ))}
        </nav>
        <div className="barra-usuario">
          <span className="barra-nombre">{sesion.usuario.nombre}</span>
          <Link to="/" className="btn btn-fantasma btn-chico">
            <Icono nombre="atras" tam={16} /> <span className="ocultar-movil">Volver a la app</span>
          </Link>
          <button className="btn-icono" onClick={() => cerrarSesion()} aria-label="Cerrar sesión">
            <Icono nombre="salir" tam={18} />
          </button>
        </div>
      </header>

      <main className="contenido">
        <Outlet context={{ avisar: setAviso }} />
      </main>

      <div className="admin-rep"><BarraReproductor avisar={setAviso} /></div>

      {aviso && <div className="toast" role="status">{aviso}</div>}
    </div>
  )
}