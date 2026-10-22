import { useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { api, TIPOS_ALBUM } from '../../api'
import { useCatalogo } from '../../catalogo.jsx'
import { ConfirmarBorrado, Encabezado, Imagen } from '../../components/comunes.jsx'
import FormAlbum from '../../components/admin/FormAlbum.jsx'
import Icono from '../../components/Icono.jsx'

export default function Albumes() {
  const { albumes, artistas, canciones, cargando, error, recargar } = useCatalogo()
  const { avisar } = useOutletContext()
  const [filtroArtista, setFiltroArtista] = useState('')
  const [formulario, setFormulario] = useState(null)
  const [porBorrar, setPorBorrar] = useState(null)

  const pistas = useMemo(() => {
    const c = {}
    canciones.forEach((s) => { if (s.album) c[s.album.id] = (c[s.album.id] || 0) + 1 })
    return c
  }, [canciones])

  const visibles = albumes.filter((a) => !filtroArtista || a.artista.id === filtroArtista)

  async function alGuardar(_, editado) {
    setFormulario(null)
    avisar(editado ? 'Álbum actualizado' : 'Álbum creado')
    await recargar()
  }

  async function borrar() {
    await api.eliminarAlbum(porBorrar.id)
    setPorBorrar(null)
    avisar('Álbum eliminado')
    await recargar()
  }

  return (
    <>
      <Encabezado sobretitulo="Catálogo" titulo="Álbumes" boton="Nuevo álbum"
        onBoton={() => setFormulario('nuevo')} deshabilitado={!artistas.length}
        pista={!cargando && !artistas.length
          ? <>Primero crea un artista en la pestaña <Link to="/admin/artistas">Artistas</Link>.</> : null} />

      <section className="herramientas">
        <select value={filtroArtista} onChange={(e) => setFiltroArtista(e.target.value)}
          aria-label="Filtrar por artista">
          <option value="">Todos los artistas</option>
          {artistas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
      </section>

      {error && <div className="alerta alerta-error">{error}</div>}

      {cargando ? (
        <div className="vacio">Cargando álbumes…</div>
      ) : albumes.length === 0 ? (
        <div className="vacio">
          <Icono nombre="disco" tam={36} />
          <h3>Aún no hay álbumes</h3>
          <p className="tenue">Las canciones también pueden ir sueltas, como sencillos.</p>
        </div>
      ) : (
        <div className="rejilla">
          {visibles.map((a) => (
            <article key={a.id} className="tarjeta tarjeta-album">
              <Imagen url={a.portada_url} className="tarjeta-img" icono="disco" tam={40} />
              <h3 className="tarjeta-titulo">{a.titulo}</h3>
              <p className="tenue tarjeta-sub">{a.anio_lanzamiento} · {TIPOS_ALBUM[a.tipo]} · {a.artista.nombre}</p>
              <p className="tarjeta-generos">{pistas[a.id] || 0} {pistas[a.id] === 1 ? 'canción' : 'canciones'}</p>
              <div className="tarjeta-acciones">
                <button className="btn-icono" onClick={() => setFormulario(a)} aria-label={`Editar ${a.titulo}`}>
                  <Icono nombre="editar" />
                </button>
                <button className="btn-icono btn-peligro" onClick={() => setPorBorrar(a)}
                  aria-label={`Eliminar ${a.titulo}`}>
                  <Icono nombre="borrar" />
                </button>
              </div>
            </article>
          ))}
          {visibles.length === 0 && <div className="vacio rejilla-ancho">Ese artista no tiene álbumes.</div>}
        </div>
      )}

      {formulario && (
        <FormAlbum album={formulario === 'nuevo' ? null : formulario} artistas={artistas}
          onCerrar={() => setFormulario(null)} onGuardado={alGuardar} />
      )}

      {porBorrar && (
        <ConfirmarBorrado titulo="Eliminar álbum" onConfirmar={borrar} onCerrar={() => setPorBorrar(null)}>
          ¿Eliminar <strong>{porBorrar.titulo}</strong>? Solo se puede si no tiene canciones.
        </ConfirmarBorrado>
      )}
    </>
  )
}