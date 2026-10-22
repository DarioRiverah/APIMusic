import { useState } from 'react'
import { api, capitalizar, formatoLargo } from '../api'
import { useCatalogo } from '../catalogo.jsx'
import Icono from '../components/Icono.jsx'
import { BotonReproducir, ListaCanciones } from '../components/musica.jsx'

const ATAJOS = [10, 20, 30, 45, 60]

export default function Generar() {
  const { generos } = useCatalogo()
  const [minutos, setMinutos] = useState(20)
  const [genero, setGenero] = useState('')
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function generar(e) {
    e.preventDefault()
    setError('')
    setResultado(null)
    setCargando(true)
    try {
      setResultado(await api.generarPlaylist(Number(minutos), genero || undefined))
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="pagina pagina-cabecera">
      <header className="cabecera" style={{ '--color-cabecera': '#e8115b' }}>
        <span className="cabecera-img cabecera-generar"><Icono nombre="varita" tam={64} /></span>
        <div className="cabecera-textos">
          <span className="cabecera-tipo">Funcionalidad especial</span>
          <h1 className="cabecera-titulo">Generar playlist</h1>
          <div className="cabecera-meta">Dinos cuánto tiempo tienes y armamos una playlist que quepa justo.</div>
        </div>
      </header>

      <form className="generador" onSubmit={generar}>
        <div className="campo">
          <span>¿Cuánto tiempo tienes?</span>
          <div className="chips-elegir">
            {ATAJOS.map((m) => (
              <button type="button" key={m} onClick={() => setMinutos(m)}
                className={`chip chip-boton ${Number(minutos) === m ? 'chip-activo' : ''}`}>{m} min</button>
            ))}
            <label className="minutos-libre">
              <input type="number" min="1" max="600" value={minutos} onChange={(e) => setMinutos(e.target.value)}
                aria-label="Minutos" required /> min
            </label>
          </div>
        </div>
        <label className="campo">
          <span>Género</span>
          <select value={genero} onChange={(e) => setGenero(e.target.value)}>
            <option value="">Todos los géneros</option>
            {generos.map((g) => <option key={g} value={g}>{capitalizar(g)}</option>)}
          </select>
        </label>
        <button className="btn btn-primario" disabled={cargando}>
          <Icono nombre="varita" /> {cargando ? 'Generando…' : 'Generar'}
        </button>
      </form>

      {error && <div className="alerta alerta-error">{error}</div>}

      {resultado && (
        <section className="resultado-playlist">
          <div className="acciones-pagina">
            <BotonReproducir canciones={resultado.canciones} grande />
            <div>
              <strong>{resultado.total_canciones} {resultado.total_canciones === 1 ? 'canción' : 'canciones'} ·{' '}
                {formatoLargo(resultado.duracion_total_segundos)}</strong>
              <p className="tenue">
                De {resultado.duracion_max} disponibles
                {resultado.tiempo_restante_segundos > 0 && ` · sobran ${formatoLargo(resultado.tiempo_restante_segundos)}`}
                {resultado.genero !== 'todos' && ` · ${capitalizar(resultado.genero)}`}
              </p>
            </div>
          </div>
          <ListaCanciones canciones={resultado.canciones} />
        </section>
      )}
    </div>
  )
}