import { useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { api, capitalizar, formatoDuracion } from '../../api'
import { useCatalogo } from '../../catalogo.jsx'
import { ConfirmarBorrado, Encabezado, Imagen } from '../../components/comunes.jsx'
import FormCancion from '../../components/admin/FormCancion.jsx'
import Icono from '../../components/Icono.jsx'
import { useReproductor } from '../../reproductor.jsx'

export default function Canciones() {
  const { canciones, artistas, albumes, generos, cargando, error, recargar } = useCatalogo()
  const { avisar } = useOutletContext()
  const [busqueda, setBusqueda] = useState('')
  const [filtroGenero, setFiltroGenero] = useState('')
  const [formulario, setFormulario] = useState(null)   // null | 'nueva' | cancion
  const [porBorrar, setPorBorrar] = useState(null)
  const rep = useReproductor()

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return canciones.filter((c) =>
      (!filtroGenero || c.genero === filtroGenero) &&
      (!q || [c.titulo, c.artista.nombre, c.album?.titulo, ...c.invitados.map((i) => i.nombre)]
        .some((v) => v?.toLowerCase().includes(q))))
  }, [canciones, busqueda, filtroGenero])

  const totalSegundos = canciones.reduce((s, c) => s + (c.duracion_segundos || 0), 0)

  // Usa el reproductor global (la barra de abajo de la app)
  const reproducir = (c, i) => (rep.actual?.id === c.id ? rep.alternar() : rep.reproducir(visibles, i))
  const sonando = rep.sonando ? rep.actual?.id : null

  async function alGuardar(_, editada) {
    setFormulario(null)
    avisar(editada ? 'Canción actualizada' : 'Canción creada')
    await recargar()
  }

  async function borrar() {
    await api.eliminarCancion(porBorrar.id)
    setPorBorrar(null)
    avisar('Canción eliminada')
    await recargar()
  }

  return (
    <>
      <Encabezado sobretitulo="Catálogo" titulo="Canciones" boton="Nueva canción"
        onBoton={() => setFormulario('nueva')} deshabilitado={!artistas.length}
        pista={!cargando && !artistas.length
          ? <>Primero crea un artista en la pestaña <Link to="/admin/artistas">Artistas</Link>.</> : null} />

      <section className="stats">
        <div className="stat"><strong>{canciones.length}</strong><span>canciones</span></div>
        <div className="stat"><strong>{formatoDuracion(totalSegundos)}</strong><span>de música</span></div>
        <div className="stat"><strong>{new Set(canciones.map((c) => c.genero)).size}</strong><span>géneros</span></div>
      </section>

      <section className="herramientas">
        <label className="buscador">
          <Icono nombre="buscar" />
          <input placeholder="Buscar por título, artista o álbum" value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar canción" />
        </label>
        <select value={filtroGenero} onChange={(e) => setFiltroGenero(e.target.value)}
          aria-label="Filtrar por género">
          <option value="">Todos los géneros</option>
          {generos.map((g) => <option key={g} value={g}>{capitalizar(g)}</option>)}
        </select>
      </section>

      {error && <div className="alerta alerta-error">{error}</div>}

      {cargando ? (
        <div className="vacio">Cargando canciones…</div>
      ) : canciones.length === 0 && !error ? (
        <div className="vacio">
          <Icono nombre="nota" tam={36} />
          <h3>Aún no hay canciones</h3>
          <p className="tenue">Sube la primera con el botón “Nueva canción”.</p>
        </div>
      ) : (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th className="col-num">#</th>
                <th>Título</th>
                <th className="col-album">Álbum</th>
                <th>Género</th>
                <th className="col-anio">Año</th>
                <th className="col-dur">Duración</th>
                <th className="col-acciones"><span className="sr">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((c, i) => (
                <tr key={c.id} className={sonando === c.id ? 'fila-sonando' : ''}>
                  <td className="col-num">
                    <button className="btn-play" onClick={() => reproducir(c, i)}
                      aria-label={sonando === c.id ? 'Pausar' : `Reproducir ${c.titulo}`}>
                      <span className="num">{i + 1}</span>
                      <Icono nombre={sonando === c.id ? 'pausa' : 'play'} tam={14} relleno />
                    </button>
                  </td>
                  <td>
                    <div className="cancion">
                      <Imagen url={c.portada_url} className="miniatura" />
                      <div>
                        <div className="cancion-titulo">{c.titulo}</div>
                        <div className="tenue">
                          {c.artista.nombre}
                          {c.invitados.length > 0 && <> feat. {c.invitados.map((x) => x.nombre).join(', ')}</>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="col-album tenue">{c.album?.titulo || <em>Sencillo</em>}</td>
                  <td><span className="chip">{c.genero}</span></td>
                  <td className="col-anio tenue">{c.anio_lanzamiento}</td>
                  <td className="col-dur tenue">{formatoDuracion(c.duracion_segundos)}</td>
                  <td className="col-acciones">
                    <button className="btn-icono" onClick={() => setFormulario(c)} aria-label={`Editar ${c.titulo}`}>
                      <Icono nombre="editar" />
                    </button>
                    <button className="btn-icono btn-peligro" onClick={() => setPorBorrar(c)}
                      aria-label={`Eliminar ${c.titulo}`}>
                      <Icono nombre="borrar" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibles.length === 0 && <div className="vacio">Ninguna canción coincide con el filtro.</div>}
        </div>
      )}

      {formulario && (
        <FormCancion cancion={formulario === 'nueva' ? null : formulario} generos={generos}
          artistas={artistas} albumes={albumes}
          onCerrar={() => setFormulario(null)} onGuardada={alGuardar} />
      )}

      {porBorrar && (
        <ConfirmarBorrado titulo="Eliminar canción" onConfirmar={borrar} onCerrar={() => setPorBorrar(null)}>
          ¿Seguro que quieres eliminar <strong>{porBorrar.titulo}</strong> de {porBorrar.artista.nombre}?
          También se borran el mp3 y la portada de Storage.
        </ConfirmarBorrado>
      )}
    </>
  )
}