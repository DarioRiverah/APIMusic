import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth.jsx'
import { useFavoritos } from '../favoritos.jsx'
import Icono from '../components/Icono.jsx'
import { BotonReproducir, ListaCanciones } from '../components/musica.jsx'

export default function Favoritos() {
  const { sesion } = useAuth()
  const { version } = useFavoritos()
  const [canciones, setCanciones] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.favoritos().then((lista) => { setCanciones(lista); setError('') }).catch((e) => setError(e.message))
  }, [version])

  return (
    <div className="pagina pagina-cabecera">
      <header className="cabecera" style={{ '--color-cabecera': '#5038f0' }}>
        <span className="cabecera-img cabecera-favoritos"><Icono nombre="corazon" tam={72} relleno /></span>
        <div className="cabecera-textos">
          <span className="cabecera-tipo">Playlist</span>
          <h1 className="cabecera-titulo">Tus me gusta</h1>
          <div className="cabecera-meta">
            <strong>{sesion.usuario.nombre}</strong>
            {canciones && <span> · {canciones.length} {canciones.length === 1 ? 'canción' : 'canciones'}</span>}
          </div>
        </div>
      </header>

      {error && <div className="alerta alerta-error">{error}</div>}
      {canciones === null ? <div className="vacio">Cargando…</div>
        : canciones.length === 0 ? (
          <div className="vacio">
            <Icono nombre="corazon" tam={40} />
            <h3>Las canciones que te gusten aparecerán aquí</h3>
            <p className="tenue">Toca el corazón de cualquier canción para guardarla.</p>
            <Link to="/buscar" className="btn btn-blanco">Buscar canciones</Link>
          </div>
        ) : (
          <>
            <div className="acciones-pagina"><BotonReproducir canciones={canciones} grande contexto="favoritos" /></div>
            <ListaCanciones canciones={canciones} contexto="favoritos" />
          </>
        )}
    </div>
  )
}