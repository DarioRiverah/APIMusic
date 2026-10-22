import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { capitalizar, TIPOS_ALBUM } from '../api'
import { useCatalogo } from '../catalogo.jsx'
import Icono from '../components/Icono.jsx'
import { BotonReproducir, ListaCanciones, Seccion, Tarjeta } from '../components/musica.jsx'

const COLORES = ['#e13300', '#1e3264', '#8400e7', '#e8115b', '#148a08', '#bc5900', '#509bf5',
  '#dc148c', '#477d95', '#af2896']

const quitarTildes = (t = '') => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export default function Buscar() {
  const { canciones, artistas, albumes, generos } = useCatalogo()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const genero = params.get('genero') || ''

  const resultados = useMemo(() => {
    const t = quitarTildes(q.trim())
    const coincide = (...textos) => !t || textos.some((x) => quitarTildes(x).includes(t))
    return {
      canciones: canciones.filter((c) => (!genero || c.genero === genero) && coincide(
        c.titulo, c.artista.nombre, c.album?.titulo, ...c.invitados.map((i) => i.nombre))),
      artistas: genero ? artistas.filter((a) => a.generos.includes(genero) && coincide(a.nombre))
        : t ? artistas.filter((a) => coincide(a.nombre)) : [],
      albumes: t ? albumes.filter((a) => coincide(a.titulo, a.artista.nombre)) : [],
    }
  }, [q, genero, canciones, artistas, albumes])

  const actualizar = (cambios) => {
    const p = { q, genero, ...cambios }
    setParams(Object.fromEntries(Object.entries(p).filter(([, v]) => v)), { replace: true })
  }
  const buscando = q.trim() || genero
  const nada = buscando && !resultados.canciones.length && !resultados.artistas.length && !resultados.albumes.length

  return (
    <div className="pagina">
      <label className="buscador buscador-grande">
        <Icono nombre="buscar" tam={22} />
        <input placeholder="¿Qué quieres escuchar?" value={q} autoFocus
          onChange={(e) => actualizar({ q: e.target.value })} aria-label="Buscar" />
        {q && <button className="btn-icono" onClick={() => actualizar({ q: '' })} aria-label="Borrar búsqueda">
          <Icono nombre="cerrar" />
        </button>}
      </label>

      {genero && (
        <div className="filtro-activo">
          Género: <span className="chip chip-activo">{capitalizar(genero)}
            <button className="chip-quitar" onClick={() => actualizar({ genero: '' })} aria-label="Quitar género">
              <Icono nombre="cerrar" tam={12} />
            </button>
          </span>
        </div>
      )}

      {!buscando && (
        <Seccion titulo="Explorar por género">
          <div className="generos">
            {generos.map((g, i) => (
              <button key={g} className="genero" style={{ background: COLORES[i % COLORES.length] }}
                onClick={() => actualizar({ genero: g })}>
                {capitalizar(g)}
                <span className="genero-n">{canciones.filter((c) => c.genero === g).length}</span>
              </button>
            ))}
          </div>
        </Seccion>
      )}

      {nada && (
        <div className="vacio">
          <h3>No encontramos “{q || capitalizar(genero)}”</h3>
          <p className="tenue">Revisa la ortografía o prueba con otra palabra.</p>
        </div>
      )}

      {buscando && resultados.canciones.length > 0 && (
        <Seccion titulo="Canciones" accion={<BotonReproducir canciones={resultados.canciones} />}>
          <ListaCanciones canciones={resultados.canciones} />
        </Seccion>
      )}
      {resultados.artistas.length > 0 && (
        <Seccion titulo="Artistas">
          <div className="carrusel">
            {resultados.artistas.map((a) => (
              <Tarjeta key={a.id} a={`/artista/${a.id}`} imagen={a.foto_url} titulo={a.nombre}
                subtitulo="Artista" redondo icono="persona" />
            ))}
          </div>
        </Seccion>
      )}
      {resultados.albumes.length > 0 && (
        <Seccion titulo="Álbumes">
          <div className="carrusel">
            {resultados.albumes.map((a) => (
              <Tarjeta key={a.id} a={`/album/${a.id}`} imagen={a.portada_url} titulo={a.titulo}
                subtitulo={`${a.anio_lanzamiento} · ${TIPOS_ALBUM[a.tipo]} · ${a.artista.nombre}`} />
            ))}
          </div>
        </Seccion>
      )}
    </div>
  )
}