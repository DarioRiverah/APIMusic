import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { TIPOS_ALBUM } from '../api'
import { useAuth } from '../auth.jsx'
import { useCatalogo } from '../catalogo.jsx'
import Icono from '../components/Icono.jsx'
import { BotonReproducir, ListaCanciones, Seccion, Tarjeta } from '../components/musica.jsx'

function saludo() {
  const h = new Date().getHours()
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}

export default function Inicio() {
  const { sesion } = useAuth()
  const { canciones, artistas, albumes, cargando, error } = useCatalogo()

  const recientes = useMemo(() => [...canciones].reverse(), [canciones])
  const cancionesDe = useMemo(() => {
    const porAlbum = {}
    const porArtista = {}
    canciones.forEach((c) => {
      if (c.album) (porAlbum[c.album.id] ??= []).push(c)
      ;[c.artista, ...c.invitados].forEach((a) => (porArtista[a.id] ??= []).push(c))
    })
    Object.values(porAlbum).forEach((l) => l.sort((a, b) => (a.numero_pista || 99) - (b.numero_pista || 99)))
    return { porAlbum, porArtista }
  }, [canciones])

  if (cargando) return <div className="vacio">Cargando…</div>

  return (
    <div className="pagina">
      <h1 className="saludo">{saludo()}, {sesion.usuario.nombres?.split(' ')[0]}</h1>
      {error && <div className="alerta alerta-error">{error}</div>}

      {!canciones.length && !error ? (
        <div className="vacio">
          <Icono nombre="nota" tam={40} />
          <h3>Todavía no hay música</h3>
          <p className="tenue">Cuando el administrador suba canciones, aparecerán aquí.</p>
        </div>
      ) : (
        <>
          <div className="accesos">
            <Link to="/favoritos" className="acceso">
              <span className="acceso-img acceso-favoritos"><Icono nombre="corazon" tam={24} relleno /></span>
              Tus me gusta
            </Link>
            <Link to="/generar" className="acceso">
              <span className="acceso-img acceso-generar"><Icono nombre="varita" tam={24} /></span>
              Generar playlist
            </Link>
          </div>

          <Seccion titulo="Agregadas recientemente"
            accion={<BotonReproducir canciones={recientes} etiqueta="Reproducir todo" />}>
            <ListaCanciones canciones={recientes.slice(0, 6)} />
          </Seccion>

          {albumes.length > 0 && (
            <Seccion titulo="Álbumes">
              <div className="carrusel">
                {albumes.map((a) => (
                  <Tarjeta key={a.id} a={`/album/${a.id}`} imagen={a.portada_url} titulo={a.titulo}
                    subtitulo={`${a.anio_lanzamiento} · ${TIPOS_ALBUM[a.tipo]} · ${a.artista.nombre}`}
                    canciones={cancionesDe.porAlbum[a.id] || []} />
                ))}
              </div>
            </Seccion>
          )}

          {artistas.length > 0 && (
            <Seccion titulo="Artistas">
              <div className="carrusel">
                {artistas.map((a) => (
                  <Tarjeta key={a.id} a={`/artista/${a.id}`} imagen={a.foto_url} titulo={a.nombre}
                    subtitulo="Artista" redondo icono="persona"
                    canciones={cancionesDe.porArtista[a.id] || []} />
                ))}
              </div>
            </Seccion>
          )}
        </>
      )}
    </div>
  )
}