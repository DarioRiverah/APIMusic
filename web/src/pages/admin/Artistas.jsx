import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { api, capitalizar } from '../../api'
import { useCatalogo } from '../../catalogo.jsx'
import { ConfirmarBorrado, Encabezado, Imagen } from '../../components/comunes.jsx'
import FormArtista from '../../components/admin/FormArtista.jsx'
import Icono from '../../components/Icono.jsx'

export default function Artistas() {
  const { artistas, canciones, albumes, generos, cargando, error, recargar } = useCatalogo()
  const { avisar } = useOutletContext()
  const [busqueda, setBusqueda] = useState('')
  const [formulario, setFormulario] = useState(null)
  const [porBorrar, setPorBorrar] = useState(null)

  // Cuántas canciones (como principal o invitado) y álbumes tiene cada artista
  const conteo = useMemo(() => {
    const c = {}
    const sumar = (id, campo) => {
      c[id] ??= { canciones: 0, albumes: 0 }
      c[id][campo]++
    }
    canciones.forEach((s) => {
      sumar(s.artista.id, 'canciones')
      s.invitados.forEach((i) => sumar(i.id, 'canciones'))
    })
    albumes.forEach((a) => sumar(a.artista.id, 'albumes'))
    return c
  }, [canciones, albumes])

  const visibles = artistas.filter((a) => a.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()))

  async function alGuardar(_, editado) {
    setFormulario(null)
    avisar(editado ? 'Artista actualizado' : 'Artista creado')
    await recargar()
  }

  async function borrar() {
    await api.eliminarArtista(porBorrar.id)
    setPorBorrar(null)
    avisar('Artista eliminado')
    await recargar()
  }

  return (
    <>
      <Encabezado sobretitulo="Catálogo" titulo="Artistas" boton="Nuevo artista"
        onBoton={() => setFormulario('nuevo')} />

      <section className="herramientas">
        <label className="buscador">
          <Icono nombre="buscar" />
          <input placeholder="Buscar artista" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar artista" />
        </label>
      </section>

      {error && <div className="alerta alerta-error">{error}</div>}

      {cargando ? (
        <div className="vacio">Cargando artistas…</div>
      ) : artistas.length === 0 ? (
        <div className="vacio">
          <Icono nombre="persona" tam={36} />
          <h3>Aún no hay artistas</h3>
          <p className="tenue">Crea el primero; luego podrás asignarle álbumes y canciones.</p>
        </div>
      ) : (
        <div className="rejilla">
          {visibles.map((a) => {
            const n = conteo[a.id] || { canciones: 0, albumes: 0 }
            return (
              <article key={a.id} className="tarjeta">
                <Imagen url={a.foto_url} className="tarjeta-img redondo" icono="persona" tam={40} />
                <h3 className="tarjeta-titulo">{a.nombre}</h3>
                <p className="tenue tarjeta-sub">
                  {n.canciones} {n.canciones === 1 ? 'canción' : 'canciones'} · {n.albumes} álbum{n.albumes === 1 ? '' : 'es'}
                </p>
                {a.generos.length > 0 && (
                  <p className="tarjeta-generos">{a.generos.map(capitalizar).join(' · ')}</p>
                )}
                <div className="tarjeta-acciones">
                  <button className="btn-icono" onClick={() => setFormulario(a)} aria-label={`Editar ${a.nombre}`}>
                    <Icono nombre="editar" />
                  </button>
                  <button className="btn-icono btn-peligro" onClick={() => setPorBorrar(a)}
                    aria-label={`Eliminar ${a.nombre}`}>
                    <Icono nombre="borrar" />
                  </button>
                </div>
              </article>
            )
          })}
          {visibles.length === 0 && <div className="vacio rejilla-ancho">Ningún artista coincide.</div>}
        </div>
      )}

      {formulario && (
        <FormArtista artista={formulario === 'nuevo' ? null : formulario} generos={generos}
          onCerrar={() => setFormulario(null)} onGuardado={alGuardar} />
      )}

      {porBorrar && (
        <ConfirmarBorrado titulo="Eliminar artista" onConfirmar={borrar} onCerrar={() => setPorBorrar(null)}>
          ¿Eliminar a <strong>{porBorrar.nombre}</strong>? Solo se puede si no tiene álbumes ni canciones.
        </ConfirmarBorrado>
      )}
    </>
  )
}