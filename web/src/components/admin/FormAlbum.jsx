import { useState } from 'react'
import { api, TIPOS_ALBUM } from '../../api'
import { Progreso, SelectorImagen } from '../comunes.jsx'
import Modal from '../Modal.jsx'

const ANIO_ACTUAL = new Date().getFullYear()

export default function FormAlbum({ album, artistas, onCerrar, onGuardado }) {
  const editando = Boolean(album)
  const [campos, setCampos] = useState({
    titulo: album?.titulo || '',
    artista_id: album?.artista.id || artistas[0]?.id || '',
    anio_lanzamiento: album?.anio_lanzamiento || ANIO_ACTUAL,
    tipo: album?.tipo || 'album',
  })
  const [portada, setPortada] = useState(null)
  const [progreso, setProgreso] = useState(null)
  const [error, setError] = useState('')
  const subiendo = progreso !== null
  const cambiar = (e) => setCampos({ ...campos, [e.target.name]: e.target.value })

  async function enviar(e) {
    e.preventDefault()
    setError('')
    const fd = new FormData()
    Object.entries(campos).forEach(([k, v]) => fd.append(k, String(v).trim()))
    if (portada) fd.append('portada', portada)
    setProgreso(0)
    try {
      const res = editando
        ? await api.actualizarAlbum(album.id, fd, setProgreso)
        : await api.crearAlbum(fd, setProgreso)
      onGuardado(res.album, editando)
    } catch (err) {
      setError(err.message)
      setProgreso(null)
    }
  }

  return (
    <Modal titulo={editando ? 'Editar álbum' : 'Nuevo álbum'} onCerrar={subiendo ? () => {} : onCerrar}>
      <form className="form-cancion" onSubmit={enviar}>
        <SelectorImagen texto="Portada" urlInicial={album?.portada_url} onElegir={setPortada}
          onError={setError} deshabilitado={subiendo} />

        <div className="form-campos">
          <label className="campo">
            <span>Título *</span>
            <input name="titulo" value={campos.titulo} onChange={cambiar} required disabled={subiendo}
              autoFocus />
          </label>
          <label className="campo">
            <span>Artista *</span>
            <select name="artista_id" value={campos.artista_id} onChange={cambiar} disabled={subiendo}>
              {artistas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </label>
          <div className="fila-2">
            <label className="campo">
              <span>Tipo *</span>
              <select name="tipo" value={campos.tipo} onChange={cambiar} disabled={subiendo}>
                {Object.entries(TIPOS_ALBUM).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
            </label>
            <label className="campo">
              <span>Año *</span>
              <input name="anio_lanzamiento" type="number" min="1900" max={ANIO_ACTUAL}
                value={campos.anio_lanzamiento} onChange={cambiar} required disabled={subiendo} />
            </label>
          </div>
          <p className="tenue nota-form">Las canciones de este álbum usan esta portada si no tienen una propia.</p>
        </div>

        {error && <div className="alerta alerta-error form-ancho">{error}</div>}
        <Progreso valor={progreso} />

        <footer className="modal-pie form-ancho">
          <button type="button" className="btn btn-fantasma" onClick={onCerrar} disabled={subiendo}>
            Cancelar
          </button>
          <button className="btn btn-primario" disabled={subiendo}>
            {editando ? 'Guardar cambios' : 'Crear álbum'}
          </button>
        </footer>
      </form>
    </Modal>
  )
}