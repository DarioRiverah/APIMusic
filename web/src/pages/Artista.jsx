import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, capitalizar, TIPOS_ALBUM } from '../api'
import { useCatalogo } from '../catalogo.jsx'
import { BotonReproducir, Cabecera, ListaCanciones, Seccion, Tarjeta } from '../components/musica.jsx'

export default function Artista() {
  const { id } = useParams()
  const { canciones: todas } = useCatalogo()
  // Se vuelve a pedir al cambiar de artista o cuando el catálogo cambia; mientras, se muestra "Cargando…"
  const clave = `${id}:${todas.length}`
  const [estado, setEstado] = useState({ clave: null, artista: null, error: '' })
  const [verTodas, setVerTodas] = useState(false)

  useEffect(() => {
    let vigente = true
    api.perfilArtista(id)
      .then((artista) => vigente && setEstado({ clave, artista, error: '' }))
      .catch((e) => vigente && setEstado({ clave, artista: null, error: e.message }))
    return () => { vigente = false }
  }, [id, clave])

  const { artista, error } = estado.clave === clave ? estado : { artista: null, error: '' }

  if (error) return <div className="pagina"><div className="alerta alerta-error">{error}</div></div>
  if (!artista) return <div className="vacio">Cargando…</div>

  const canciones = [...artista.canciones].reverse()
  const todasSuyas = [...canciones, ...artista.apariciones]

  return (
    <div className="pagina pagina-cabecera">
      <Cabecera imagen={artista.foto_url} redondo icono="persona" tipo="Artista" titulo={artista.nombre}>
        {artista.generos.length > 0 && <span>{artista.generos.map(capitalizar).join(' · ')} · </span>}
        <span>{todasSuyas.length} {todasSuyas.length === 1 ? 'canción' : 'canciones'}</span>
      </Cabecera>

      <div className="acciones-pagina">
        <BotonReproducir canciones={todasSuyas} grande contexto={`artista:${artista.id}`} />
      </div>

      {canciones.length > 0 && (
        <Seccion titulo="Canciones"
          accion={canciones.length > 5 && (
            <button className="enlace" onClick={() => setVerTodas(!verTodas)}>
              {verTodas ? 'Mostrar menos' : 'Mostrar todas'}
            </button>)}>
          <ListaCanciones canciones={verTodas ? canciones : canciones.slice(0, 5)} />
        </Seccion>
      )}

      {artista.albumes.length > 0 && (
        <Seccion titulo="Discografía">
          <div className="carrusel">
            {artista.albumes.map((a) => (
              <Tarjeta key={a.id} a={`/album/${a.id}`} imagen={a.portada_url} titulo={a.titulo}
                subtitulo={`${a.anio_lanzamiento} · ${TIPOS_ALBUM[a.tipo]}`} />
            ))}
          </div>
        </Seccion>
      )}

      {artista.apariciones.length > 0 && (
        <Seccion titulo={`Con ${artista.nombre} como invitado`}>
          <ListaCanciones canciones={artista.apariciones} />
        </Seccion>
      )}

      {artista.descripcion && (
        <Seccion titulo="Acerca de">
          <p className="bio">{artista.descripcion}</p>
        </Seccion>
      )}

      {!todasSuyas.length && <p className="tenue">Este artista todavía no tiene canciones.</p>}
    </div>
  )
}