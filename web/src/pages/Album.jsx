import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, formatoLargo, TIPOS_ALBUM } from '../api'
import { useCatalogo } from '../catalogo.jsx'
import { BotonReproducir, Cabecera, ListaCanciones } from '../components/musica.jsx'

export default function Album() {
  const { id } = useParams()
  const { canciones: todas } = useCatalogo()
  // Se vuelve a pedir al cambiar de álbum o cuando el catálogo cambia; mientras, se muestra "Cargando…"
  const clave = `${id}:${todas.length}`
  const [estado, setEstado] = useState({ clave: null, album: null, error: '' })

  useEffect(() => {
    let vigente = true
    api.detalleAlbum(id)
      .then((album) => vigente && setEstado({ clave, album, error: '' }))
      .catch((e) => vigente && setEstado({ clave, album: null, error: e.message }))
    return () => { vigente = false }
  }, [id, clave])

  const { album, error } = estado.clave === clave ? estado : { album: null, error: '' }

  if (error) return <div className="pagina"><div className="alerta alerta-error">{error}</div></div>
  if (!album) return <div className="vacio">Cargando…</div>

  return (
    <div className="pagina pagina-cabecera">
      <Cabecera imagen={album.portada_url} tipo={TIPOS_ALBUM[album.tipo]} titulo={album.titulo} color="#5038a0">
        <Link to={`/artista/${album.artista.id}`} className="texto-blanco">{album.artista.nombre}</Link>
        <span> · {album.anio_lanzamiento} · {album.total_canciones} {album.total_canciones === 1 ? 'canción' : 'canciones'}
          {album.total_canciones > 0 && `, ${formatoLargo(album.duracion_total_segundos)}`}</span>
      </Cabecera>

      <div className="acciones-pagina">
        <BotonReproducir canciones={album.canciones} grande contexto={`album:${album.id}`} />
      </div>

      {album.canciones.length
        ? <ListaCanciones canciones={album.canciones} mostrarAlbum={false} mostrarPortada={false} pista
            contexto={`album:${album.id}`} />
        : <p className="tenue">Este álbum todavía no tiene canciones.</p>}
    </div>
  )
}