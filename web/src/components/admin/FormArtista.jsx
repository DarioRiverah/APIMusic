import { useState } from 'react'
import { api, capitalizar } from '../../api'
import { Progreso, SelectorImagen } from '../comunes.jsx'
import Modal from '../Modal.jsx'

export default function FormArtista({ artista, generos, onCerrar, onGuardado }) {
  const editando = Boolean(artista)
  const [nombre, setNombre] = useState(artista?.nombre || '')
  const [descripcion, setDescripcion] = useState(artista?.descripcion || '')
  const [elegidos, setElegidos] = useState(artista?.generos || [])
  const [foto, setFoto] = useState(null)
  const [progreso, setProgreso] = useState(null)
  const [error, setError] = useState('')
  const subiendo = progreso !== null

  const alternarGenero = (g) =>
    setElegidos((lista) => (lista.includes(g) ? lista.filter((x) => x !== g) : [...lista, g]))

  async function enviar(e) {
    e.preventDefault()
    setError('')
    const fd = new FormData()
    fd.append('nombre', nombre.trim())
    fd.append('descripcion', descripcion.trim())
    fd.append('generos', elegidos.join(','))      // vacío = sin géneros
    if (foto) fd.append('foto', foto)
    setProgreso(0)
    try {
      const res = editando
        ? await api.actualizarArtista(artista.id, fd, setProgreso)
        : await api.crearArtista(fd, setProgreso)
      onGuardado(res.artista, editando)
    } catch (err) {
      setError(err.message)
      setProgreso(null)
    }
  }

  return (
    <Modal titulo={editando ? 'Editar artista' : 'Nuevo artista'} onCerrar={subiendo ? () => {} : onCerrar}>
      <form className="form-cancion" onSubmit={enviar}>
        <SelectorImagen redondo texto="Foto" urlInicial={artista?.foto_url} onElegir={setFoto}
          onError={setError} deshabilitado={subiendo} />

        <div className="form-campos">
          <label className="campo">
            <span>Nombre *</span>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} required
              maxLength={80} disabled={subiendo} autoFocus />
          </label>
          <label className="campo">
            <span>Descripción</span>
            <textarea rows={4} value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
              maxLength={1000} placeholder="Biografía corta del artista" disabled={subiendo} />
          </label>
          <div className="campo">
            <span>Géneros</span>
            <div className="chips-elegir">
              {generos.map((g) => (
                <button type="button" key={g} disabled={subiendo}
                  className={`chip chip-boton ${elegidos.includes(g) ? 'chip-activo' : ''}`}
                  onClick={() => alternarGenero(g)} aria-pressed={elegidos.includes(g)}>
                  {capitalizar(g)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <div className="alerta alerta-error form-ancho">{error}</div>}
        <Progreso valor={progreso} />

        <footer className="modal-pie form-ancho">
          <button type="button" className="btn btn-fantasma" onClick={onCerrar} disabled={subiendo}>
            Cancelar
          </button>
          <button className="btn btn-primario" disabled={subiendo}>
            {editando ? 'Guardar cambios' : 'Crear artista'}
          </button>
        </footer>
      </form>
    </Modal>
  )
}