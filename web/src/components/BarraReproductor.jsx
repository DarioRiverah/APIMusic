import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatoDuracion } from '../api'
import { useAjustes } from '../ajustes.jsx'
import { useReproductor } from '../reproductor.jsx'
import { Imagen } from './comunes.jsx'
import Icono from './Icono.jsx'
import PistaTema from './TemasBarra.jsx'
import { Artistas, BotonFavorito } from './musica.jsx'

const mmss = (s) => formatoDuracion(Math.floor(s || 0))

// La animación de entrada solo se ve la primera vez que algo suena en la sesión
// (no cada vez que se pasa del reproductor al panel de admin y viceversa)
let yaAparecio = false

/** Aviso del temporizador de sueño: "28 min" o "fin de canción". */
function ChipTemporizador({ temporizador, minutos }) {
  if (!temporizador) return null
  const texto = temporizador.cancion ? 'fin de canción' : `${minutos} min`
  return (
    <Link to="/ajustes" className="rep-sueno" title="Temporizador de sueño">
      <Icono nombre="luna" tam={14} /> {texto}
    </Link>
  )
}

export default function BarraReproductor({ avisar }) {
  const r = useReproductor()
  const { ajustes } = useAjustes()
  const { actual } = r
  const [animar] = useState(() => !yaAparecio)

  useEffect(() => {
    if (actual) yaAparecio = true
  }, [actual])

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

  // Como en la app de Spotify: si no ha sonado nada, no hay barra
  if (!actual) return null

  const progreso = r.duracion ? (r.tiempo / r.duracion) * 100 : 0
  const clases = ['reproductor', animar && 'rep-entra'].filter(Boolean).join(' ')

  return (
    <footer className={clases}>
      {r.dj.frase && (
        <div className="dj-burbuja" role="status">
          <span className="dj-burbuja-nombre">DJ {r.dj.nombre}</span>
          <span className="dj-burbuja-texto">{r.dj.frase}</span>
          <button type="button" className="enlace" onClick={r.saltarDJ}>Saltar</button>
        </div>
      )}
      <div className="rep-progreso-movil" style={{ width: `${progreso}%` }} />

      <div className="rep-cancion">
        <Imagen url={actual.portada_url} className="rep-portada" />
        <div className="rep-textos">
          {actual.album
            ? <Link to={`/album/${actual.album.id}`} className="rep-titulo">{actual.titulo}</Link>
            : <span className="rep-titulo">{actual.titulo}</span>}
          <Artistas cancion={actual} className="tenue" />
          {r.dj.activo && <span className="rep-dj">DJ {r.dj.nombre}</span>}
        </div>
        <BotonFavorito id={actual.id} tam={18} />
      </div>

      <div className="rep-centro">
        <div className="rep-controles">
          <button className={`btn-icono rep-extra ${r.aleatorio ? 'activo' : ''}`} onClick={r.alternarAleatorio}
            aria-label="Aleatorio" aria-pressed={r.aleatorio}>
            <Icono nombre="aleatorio" tam={18} />
          </button>
          <button className="btn-icono rep-extra" onClick={r.anterior} aria-label="Anterior">
            <Icono nombre="anterior" tam={18} relleno />
          </button>
          <button className="rep-play" onClick={r.alternar} aria-label={r.sonando ? 'Pausar' : 'Reproducir'}>
            <Icono nombre={r.sonando ? 'pausa' : 'play'} tam={18} relleno />
          </button>
          <button className="btn-icono rep-extra" onClick={() => r.siguiente()} aria-label="Siguiente">
            <Icono nombre="siguiente" tam={18} relleno />
          </button>
          <button className={`btn-icono rep-extra rep-repetir ${r.repetir !== 'no' ? 'activo' : ''}`}
            onClick={r.alternarRepetir}
            aria-label={{ no: 'Repetir: no', todo: 'Repetir: todo', una: 'Repetir: una' }[r.repetir]}>
            <Icono nombre="repetir" tam={18} />
            {r.repetir === 'una' && <span className="rep-uno">1</span>}
          </button>
        </div>
        <div className="rep-barra">
          <span className="tenue">{mmss(r.tiempo)}</span>
          <PistaTema tema={ajustes.tema} progreso={progreso} sonando={r.sonando} tamMuneco={26}>
            <input type="range" min="0" max={r.duracion || 0} step="0.5" value={r.tiempo}
              onChange={(e) => r.buscar(Number(e.target.value))} aria-label="Posición" />
          </PistaTema>
          <span className="tenue">{mmss(r.duracion)}</span>
        </div>
      </div>

      <div className="rep-volumen">
        <ChipTemporizador temporizador={r.temporizador} minutos={r.minutosRestantes} />
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
