import { useEffect, useState } from 'react'
import Icono from './Icono.jsx'
import Modal from './Modal.jsx'

/** Cuadro para elegir una imagen con vista previa. `redondo` para fotos de artista. */
export function SelectorImagen({ urlInicial, onElegir, onError, deshabilitado, redondo, texto = 'Imagen' }) {
  const [vista, setVista] = useState(urlInicial || null)

  useEffect(() => () => {
    if (vista?.startsWith('blob:')) URL.revokeObjectURL(vista)
  }, [vista])

  function elegir(e) {
    const archivo = e.target.files[0]
    if (!archivo) return
    if (archivo.size > 2 * 1024 * 1024) return onError('La imagen no puede pesar más de 2 MB')
    setVista(URL.createObjectURL(archivo))
    onElegir(archivo)
  }

  return (
    <div className="form-portada">
      <label className={`portada-selector ${redondo ? 'redondo' : ''}`}>
        {vista
          ? <img src={vista} alt="Vista previa" />
          : <span className="portada-vacia"><Icono nombre="imagen" tam={30} /><small>{texto}</small></span>}
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={elegir}
          disabled={deshabilitado} />
      </label>
      <small className="tenue">JPG, PNG o WebP · máx. 2 MB</small>
    </div>
  )
}

/** Imagen con respaldo si no hay URL o no carga. */
export function Imagen({ url, className, icono = 'nota', tam = 16 }) {
  const [fallo, setFallo] = useState(false)
  if (!url || fallo) return <span className={`${className} img-vacia`}><Icono nombre={icono} tam={tam} /></span>
  return <img className={className} src={url} alt="" onError={() => setFallo(true)} />
}

/** Barra de progreso de subida. */
export function Progreso({ valor }) {
  if (valor === null) return null
  return (
    <div className="progreso form-ancho" role="progressbar" aria-valuenow={valor} aria-valuemin={0}
      aria-valuemax={100} aria-label={`Subiendo ${valor}%`}>
      <div className="progreso-barra" style={{ width: `${valor}%` }} />
      <span>{valor < 100 ? `Subiendo… ${valor}%` : 'Guardando en Firebase…'}</span>
    </div>
  )
}

/** Modal de confirmación para eliminar. */
export function ConfirmarBorrado({ titulo, children, onConfirmar, onCerrar }) {
  const [borrando, setBorrando] = useState(false)
  const [error, setError] = useState('')

  async function confirmar() {
    setBorrando(true)
    setError('')
    try {
      await onConfirmar()
    } catch (e) {
      setError(e.message)
      setBorrando(false)
    }
  }

  return (
    <Modal titulo={titulo} onCerrar={() => !borrando && onCerrar()} ancho={440}>
      <p className="confirmar-texto">{children}</p>
      {error && <div className="alerta alerta-error">{error}</div>}
      <footer className="modal-pie">
        <button className="btn btn-fantasma" onClick={onCerrar} disabled={borrando}>Cancelar</button>
        <button className="btn btn-rojo" onClick={confirmar} disabled={borrando}>
          {borrando ? 'Eliminando…' : 'Eliminar'}
        </button>
      </footer>
    </Modal>
  )
}

/** Encabezado de cada sección con botón de crear. */
export function Encabezado({ sobretitulo, titulo, boton, onBoton, deshabilitado, pista }) {
  return (
    <section className="encabezado">
      <div>
        <p className="tenue sobretitulo">{sobretitulo}</p>
        <h1>{titulo}</h1>
        {pista && <p className="pista">{pista}</p>}
      </div>
      <button className="btn btn-primario" onClick={onBoton} disabled={deshabilitado}>
        <Icono nombre="mas" /> {boton}
      </button>
    </section>
  )
}