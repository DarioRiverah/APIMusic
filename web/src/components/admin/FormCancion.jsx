import { useMemo, useState } from 'react'
import { api, capitalizar } from '../../api'
import { Progreso, SelectorImagen } from '../comunes.jsx'
import Icono from '../Icono.jsx'
import Modal from '../Modal.jsx'

const ANIO_ACTUAL = new Date().getFullYear()

export default function FormCancion({ cancion, generos, artistas, albumes, onCerrar, onGuardada }) {
  const editando = Boolean(cancion)
  const [campos, setCampos] = useState({
    titulo: cancion?.titulo || '',
    artista_id: cancion?.artista.id || artistas[0]?.id || '',
    album_id: cancion?.album?.id || '',
    numero_pista: cancion?.numero_pista || '',
    genero: cancion?.genero || generos[0] || '',
    anio_lanzamiento: cancion?.anio_lanzamiento || '',
  })
  const [invitados, setInvitados] = useState(cancion?.invitados.map((i) => i.id) || [])
  const [audio, setAudio] = useState(null)
  const [portada, setPortada] = useState(null)
  const [progreso, setProgreso] = useState(null)
  const [error, setError] = useState('')
  const subiendo = progreso !== null

  const nombreDe = (id) => artistas.find((a) => a.id === id)?.nombre || '¿?'
  const albumElegido = albumes.find((a) => a.id === campos.album_id)

  // Primero los álbumes del artista principal, luego el resto
  const [albumesArtista, otrosAlbumes] = useMemo(() => [
    albumes.filter((a) => a.artista.id === campos.artista_id),
    albumes.filter((a) => a.artista.id !== campos.artista_id),
  ], [albumes, campos.artista_id])

  function cambiar(e) {
    const { name, value } = e.target
    setCampos((c) => ({ ...c, [name]: value }))
    if (name === 'artista_id') setInvitados((l) => l.filter((i) => i !== value))
  }

  function agregarInvitado(e) {
    const id = e.target.value
    if (id && !invitados.includes(id)) setInvitados([...invitados, id])
    e.target.value = ''
  }

  function elegirAudio(e) {
    const archivo = e.target.files[0] || null
    setError('')
    if (archivo && archivo.size > 15 * 1024 * 1024) return setError('El mp3 no puede pesar más de 15 MB')
    setAudio(archivo)
  }

  async function enviar(e) {
    e.preventDefault()
    setError('')
    if (!editando && !audio) return setError('Selecciona el archivo mp3')
    if (!campos.album_id && !campos.anio_lanzamiento)
      return setError('Si la canción no tiene álbum, indica el año')

    const fd = new FormData()
    Object.entries(campos).forEach(([k, v]) => fd.append(k, String(v).trim()))
    fd.append('invitados_ids', invitados.join(','))        // vacío = sin invitados
    if (audio) fd.append('audio', audio)
    if (portada) fd.append('portada', portada)

    setProgreso(0)
    try {
      const res = editando
        ? await api.actualizarCancion(cancion.id, fd, setProgreso)
        : await api.crearCancion(fd, setProgreso)
      onGuardada(res.cancion, editando)
    } catch (err) {
      setError(err.message)
      setProgreso(null)
    }
  }

  const disponiblesInvitado = artistas.filter(
    (a) => a.id !== campos.artista_id && !invitados.includes(a.id))

  return (
    <Modal titulo={editando ? 'Editar canción' : 'Nueva canción'} ancho={640}
      onCerrar={subiendo ? () => {} : onCerrar}>
      <form className="form-cancion" onSubmit={enviar}>
        <div>
          <SelectorImagen texto="Portada propia" onElegir={setPortada} onError={setError}
            urlInicial={cancion?.portada_url !== albumElegido?.portada_url ? cancion?.portada_url : null}
            deshabilitado={subiendo} />
          <small className="tenue nota-form">
            {albumElegido ? 'Opcional: si no subes una, usa la del álbum.' : 'Opcional.'}
          </small>
        </div>

        <div className="form-campos">
          <label className="campo">
            <span>Título *</span>
            <input name="titulo" value={campos.titulo} onChange={cambiar} required disabled={subiendo}
              autoFocus />
          </label>

          <label className="campo">
            <span>Artista principal *</span>
            <select name="artista_id" value={campos.artista_id} onChange={cambiar} disabled={subiendo}>
              {artistas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </label>

          <div className="campo">
            <span>Artistas invitados (feat.)</span>
            {invitados.length > 0 && (
              <div className="chips-elegir">
                {invitados.map((id) => (
                  <span key={id} className="chip chip-activo">
                    {nombreDe(id)}
                    <button type="button" className="chip-quitar" disabled={subiendo}
                      onClick={() => setInvitados(invitados.filter((i) => i !== id))}
                      aria-label={`Quitar ${nombreDe(id)}`}>
                      <Icono nombre="cerrar" tam={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <select defaultValue="" onChange={agregarInvitado}
              disabled={subiendo || !disponiblesInvitado.length || invitados.length >= 5}>
              <option value="">{disponiblesInvitado.length ? '+ Agregar invitado' : 'No hay más artistas'}</option>
              {disponiblesInvitado.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>

          <div className="fila-2 fila-album">
            <label className="campo">
              <span>Álbum</span>
              <select name="album_id" value={campos.album_id} onChange={cambiar} disabled={subiendo}>
                <option value="">— Sin álbum (sencillo) —</option>
                {albumesArtista.length > 0 && (
                  <optgroup label="De este artista">
                    {albumesArtista.map((a) => <option key={a.id} value={a.id}>{a.titulo}</option>)}
                  </optgroup>
                )}
                {otrosAlbumes.length > 0 && (
                  <optgroup label="Otros">
                    {otrosAlbumes.map((a) => (
                      <option key={a.id} value={a.id}>{a.titulo} · {a.artista.nombre}</option>))}
                  </optgroup>
                )}
              </select>
            </label>
            <label className="campo">
              <span>N.º pista</span>
              <input name="numero_pista" type="number" min="1" max="99" value={campos.numero_pista}
                onChange={cambiar} disabled={subiendo || !campos.album_id} />
            </label>
          </div>

          <div className="fila-2">
            <label className="campo">
              <span>Género *</span>
              <select name="genero" value={campos.genero} onChange={cambiar} disabled={subiendo}>
                {generos.map((g) => <option key={g} value={g}>{capitalizar(g)}</option>)}
              </select>
            </label>
            <label className="campo">
              <span>Año {campos.album_id ? '' : '*'}</span>
              <input name="anio_lanzamiento" type="number" min="1900" max={ANIO_ACTUAL}
                value={campos.anio_lanzamiento} onChange={cambiar} disabled={subiendo}
                placeholder={albumElegido ? `${albumElegido.anio_lanzamiento} (del álbum)` : ''} />
            </label>
          </div>

          <label className={`archivo ${audio ? 'archivo-listo' : ''}`}>
            <Icono nombre="subir" />
            <span>
              {audio ? audio.name : editando ? 'Reemplazar mp3 (opcional)' : 'Seleccionar mp3 *'}
              <small>{audio ? `${(audio.size / 1024 / 1024).toFixed(1)} MB`
                : 'La duración se calcula sola · máx. 15 MB'}</small>
            </span>
            <input type="file" accept="audio/mpeg,.mp3" onChange={elegirAudio} disabled={subiendo} />
          </label>
        </div>

        {error && <div className="alerta alerta-error form-ancho">{error}</div>}
        <Progreso valor={progreso} />

        <footer className="modal-pie form-ancho">
          <button type="button" className="btn btn-fantasma" onClick={onCerrar} disabled={subiendo}>
            Cancelar
          </button>
          <button className="btn btn-primario" disabled={subiendo}>
            {editando ? 'Guardar cambios' : 'Crear canción'}
          </button>
        </footer>
      </form>
    </Modal>
  )
}