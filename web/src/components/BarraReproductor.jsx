import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { formatoDuracion } from '../api'
import { useReproductor } from '../reproductor.jsx'
import { Imagen } from './comunes.jsx'
import Icono from './Icono.jsx'
import { Artistas, BotonFavorito } from './musica.jsx'

const mmss = (s) => formatoDuracion(Math.floor(s || 0))

export default function BarraReproductor({ avisar }) {
  const r = useReproductor()
  const { actual } = r

  useEffect(() => {
    if (r.error) { avisar(r.error); r.limpiarError() }
  }, [r.error]) // eslint-disable-line react-hooks/exhaustive-deps

  // Atajo de teclado: espacio = play/pausa (si no se está escribiendo)
  useEffect(() => {
    const tecla = (e) => {
      if (e.code !== 'Space' || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(e.target.tagName)) return
      e.preventDefault()
      r.alternar()
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [r.alternar]) // eslint-disable-line react-hooks/exhaustive-deps

  const progreso = r.duracion ? (r.tiempo / r.duracion) * 100 : 0

  return (
    <footer className={`reproductor ${actual ? '' : 'vacio-rep'}`}>
      <div className="rep-progreso-movil" style={{ width: `${progreso}%` }} />

      <div className="rep-cancion">
        {actual ? (
          <>
            <Imagen url={actual.portada_url} className="rep-portada" />
            <div className="rep-textos">
              {actual.album
                ? <Link to={`/album/${actual.album.id}`} className="rep-titulo">{actual.titulo}</Link>
                : <span className="rep-titulo">{actual.titulo}</span>}
              <Artistas cancion={actual} className="tenue" />
            </div>
            <BotonFavorito id={actual.id} tam={18} />
          </>
        ) : <span className="tenue rep-nada">Elige una canción para empezar</span>}
      </div>

      <div className="rep-centro">
        <div className="rep-controles">
          <button className={`btn-icono rep-extra ${r.aleatorio ? 'activo' : ''}`} onClick={r.alternarAleatorio}
            aria-label="Aleatorio" aria-pressed={r.aleatorio} disabled={!actual}>
            <Icono nombre="aleatorio" tam={18} />
          </button>
          <button className="btn-icono rep-extra" onClick={r.anterior} aria-label="Anterior" disabled={!actual}>
            <Icono nombre="anterior" tam={18} relleno />
          </button>
          <button className="rep-play" onClick={r.alternar} disabled={!actual}
            aria-label={r.sonando ? 'Pausar' : 'Reproducir'}>
            <Icono nombre={r.sonando ? 'pausa' : 'play'} tam={18} relleno />
          </button>
          <button className="btn-icono rep-extra" onClick={() => r.siguiente()} aria-label="Siguiente"
            disabled={!actual}>
            <Icono nombre="siguiente" tam={18} relleno />
          </button>
          <button className={`btn-icono rep-extra rep-repetir ${r.repetir !== 'no' ? 'activo' : ''}`}
            onClick={r.alternarRepetir} disabled={!actual}
            aria-label={{ no: 'Repetir: no', todo: 'Repetir: todo', una: 'Repetir: una' }[r.repetir]}>
            <Icono nombre="repetir" tam={18} />
            {r.repetir === 'una' && <span className="rep-uno">1</span>}
          </button>
        </div>
        <div className="rep-barra">
          <span className="tenue">{mmss(r.tiempo)}</span>
          <input type="range" min="0" max={r.duracion || 0} step="0.5" value={r.tiempo}
            onChange={(e) => r.buscar(Number(e.target.value))} disabled={!actual}
            style={{ '--lleno': `${progreso}%` }} aria-label="Posición" />
          <span className="tenue">{mmss(r.duracion)}</span>
        </div>
      </div>

      <div className="rep-volumen">
        <button className="btn-icono" onClick={() => r.setVolumen(r.volumen > 0 ? 0 : 0.8)}
          aria-label={r.volumen > 0 ? 'Silenciar' : 'Activar sonido'}>
          <Icono nombre={r.volumen > 0 ? 'volumen' : 'silencio'} tam={18} />
        </button>
        <input type="range" min="0" max="1" step="0.01" value={r.volumen}
          onChange={(e) => r.setVolumen(Number(e.target.value))}
          style={{ '--lleno': `${r.volumen * 100}%` }} aria-label="Volumen" />
      </div>
    </footer>
  )
}