import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { nombresArtistas } from './api'

// Reproductor global: un solo <audio> para toda la app, con cola de reproducción
const ReproductorContext = createContext(null)

function mezclar(lista, primero) {
  const resto = lista.filter((_, i) => i !== primero)
  for (let i = resto.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [resto[i], resto[j]] = [resto[j], resto[i]]
  }
  return [lista[primero], ...resto]
}

export const claveLista = (lista) => lista.map((c) => c.id).join(',')

export function ReproductorProvider({ children }) {
  const audioRef = useRef(null)
  const [original, setOriginal] = useState([])      // cola sin mezclar
  const [cola, setCola] = useState([])
  const [indice, setIndice] = useState(-1)
  const [sonando, setSonando] = useState(false)
  const [tiempo, setTiempo] = useState(0)
  const [duracion, setDuracion] = useState(0)
  const [volumen, setVolumenEstado] = useState(() => {
    try { return Number(localStorage.getItem('apimusic_volumen') ?? 0.8) } catch { return 0.8 }
  })
  const [aleatorio, setAleatorio] = useState(false)
  const [repetir, setRepetir] = useState('no')        // 'no' | 'todo' | 'una'
  const [error, setError] = useState('')
  const [carga, setCarga] = useState(0)              // fuerza recargar el audio
  const [contexto, setContexto] = useState(null)     // desde qué lista se está reproduciendo

  const actual = cola[indice] || null
  const irA = (i) => { setIndice(i); setCarga((c) => c + 1) }

  // Cargar y reproducir la canción actual cuando cambia
  useEffect(() => {
    const audio = audioRef.current
    if (!actual || !audio) return
    audio.src = actual.audio_url
    audio.play().catch(() => setError('No se pudo reproducir el audio'))
  }, [actual?.id, carga]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volumen
  }, [volumen])

  const reproducir = useCallback((lista, desde = 0, ctx = null) => {
    if (!lista.length) return
    setError('')
    setContexto(ctx ?? claveLista(lista))
    setOriginal(lista)
    if (aleatorio) {
      setCola(mezclar(lista, desde))
      irA(0)
    } else {
      setCola(lista)
      irA(desde)
    }
  }, [aleatorio])

  const alternar = useCallback(() => {
    const audio = audioRef.current
    if (!actual) return
    if (audio.paused) audio.play().catch(() => setError('No se pudo reproducir el audio'))
    else audio.pause()
  }, [actual])

  const siguiente = useCallback((automatico = false) => {
    if (!cola.length) return
    if (automatico && repetir === 'una') {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => setError('No se pudo reproducir el audio'))
      return
    }
    if (indice < cola.length - 1) irA(indice + 1)
    else if (repetir === 'todo') irA(0)
    else if (automatico) setSonando(false)
  }, [cola.length, indice, repetir])

  const anterior = useCallback(() => {
    const audio = audioRef.current
    // Como Spotify: si ya pasaron 3 s, reinicia la canción
    if (audio.currentTime > 3 || indice === 0) audio.currentTime = 0
    else irA(indice - 1)
  }, [indice])

  const buscar = (segundos) => { audioRef.current.currentTime = segundos }

  const setVolumen = (v) => {
    setVolumenEstado(v)
    try { localStorage.setItem('apimusic_volumen', String(v)) } catch { /* sin storage */ }
  }

  function alternarAleatorio() {
    const nuevo = !aleatorio
    setAleatorio(nuevo)
    if (!actual) return
    if (nuevo) {
      setCola(mezclar(original, original.findIndex((c) => c.id === actual.id)))
      setIndice(0)
    } else {
      setCola(original)
      setIndice(original.findIndex((c) => c.id === actual.id))
    }
  }

  const alternarRepetir = () => setRepetir((r) => ({ no: 'todo', todo: 'una', una: 'no' })[r])

  // Controles del sistema (pantalla de bloqueo del celular, teclas multimedia)
  useEffect(() => {
    if (!('mediaSession' in navigator) || !actual) return
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: actual.titulo,
      artist: nombresArtistas(actual),
      album: actual.album?.titulo || '',
      artwork: actual.portada_url ? [{ src: actual.portada_url, sizes: '512x512' }] : [],
    })
    navigator.mediaSession.setActionHandler('play', alternar)
    navigator.mediaSession.setActionHandler('pause', alternar)
    navigator.mediaSession.setActionHandler('nexttrack', () => siguiente())
    navigator.mediaSession.setActionHandler('previoustrack', anterior)
  }, [actual, alternar, siguiente, anterior])

  // Título de la pestaña: la canción que suena (como Spotify) o solo "APIMusic"
  useEffect(() => {
    document.title = actual && sonando
      ? `${actual.titulo} • ${nombresArtistas(actual)}`
      : 'APIMusic'
  }, [actual, sonando])

  const valor = {
    contexto, actual, cola, indice, sonando, tiempo, duracion, volumen, aleatorio, repetir, error,
    reproducir, alternar, siguiente, anterior, buscar, setVolumen,
    alternarAleatorio, alternarRepetir, limpiarError: () => setError(''),
    estaSonando: (id) => actual?.id === id && sonando,
  }

  return (
    <ReproductorContext.Provider value={valor}>
      {children}
      <audio ref={audioRef}
        onPlay={() => setSonando(true)}
        onPause={() => setSonando(false)}
        onTimeUpdate={(e) => setTiempo(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuracion(e.currentTarget.duration)}
        onEnded={() => siguiente(true)}
        onError={() => actual && setError('No se pudo cargar el audio')} />
    </ReproductorContext.Provider>
  )
}

export const useReproductor = () => useContext(ReproductorContext)