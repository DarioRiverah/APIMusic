import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { api, nombresArtistas } from './api'
import { useAjustes } from './ajustes.jsx'
import { NOMBRE_APP } from './components/Marca.jsx'
import { hablar } from './voz-dj.js'

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
  const { ajustes } = useAjustes()

  // DJ: la primera canción de cada bloque trae `dj: { frase, audio_url }`
  const [djFrase, setDjFrase] = useState(null)       // lo que está diciendo ahora
  const [djVibra, setDjVibra] = useState('mix')
  const [djCargando, setDjCargando] = useState(false)
  const [djNombre, setDjNombre] = useState('Lia')
  const djDichas = useRef(new Set())                 // para no repetir una frase al volver atrás
  const djHabla = useRef(null)
  const volumenRef = useRef(volumen)                 // el volumen real, aunque el DJ lo baje un rato

  const actual = cola[indice] || null
  const irA = (i) => { setIndice(i); setCarga((c) => c + 1) }

  function mostrarFrase(frase) { setDjFrase(frase) }

  // Cargar y reproducir la canción actual cuando cambia.
  // Si trae frase del DJ, la canción arranca bajita, Lia habla encima y la música vuelve a subir
  // (como un DJ de radio).
  useEffect(() => {
    const audio = audioRef.current
    if (!actual || !audio) return
    audio.src = actual.audio_url
    let cancelado = false
    let espera = null
    let fundido = null
    const arrancar = () => {
      if (cancelado) return
      audio.play()
        .then(() => api.registrarEscucha(actual.id).catch(() => {}))   // alimenta al DJ
        .catch(() => setError('No se pudo reproducir el audio'))
    }
    const subirVolumen = () => {
      const desde = audio.volume
      const inicio = performance.now()
      clearInterval(fundido)
      fundido = setInterval(() => {
        const k = Math.min(1, (performance.now() - inicio) / 1500)
        audio.volume = desde + (volumenRef.current - desde) * k
        if (k === 1) clearInterval(fundido)
      }, 50)
    }
    const dj = actual.dj
    if (dj && !djDichas.current.has(dj.frase)) {
      djDichas.current.add(dj.frase)
      mostrarFrase(dj.frase)
      if (ajustes.djVoz) {
        audio.volume = volumenRef.current * 0.2           // la música queda de fondo
        arrancar()
        // Si tocan "Saltar" antes de que empiece a hablar, se cancela y la música sube
        djHabla.current = { detener: () => { clearTimeout(espera); subirVolumen() } }
        espera = setTimeout(() => {                      // la intro suena un momento antes de que hable
          if (cancelado) return
          const habla = hablar(dj, { volumen: Math.max(0.6, volumenRef.current) })
          djHabla.current = habla
          habla.termino.then(() => {
            if (cancelado) return
            subirVolumen()
            setTimeout(() => setDjFrase(null), 1500)
          })
        }, 800)
      } else {
        audio.volume = volumenRef.current
        arrancar()
        setTimeout(() => setDjFrase(null), 6000)          // sin voz: solo se lee
      }
    } else {
      audio.volume = volumenRef.current
      arrancar()
    }
    return () => {
      cancelado = true
      djHabla.current?.detener()
      clearTimeout(espera)
      clearInterval(fundido)
      audio.volume = volumenRef.current
    }
  }, [actual?.id, carga]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    volumenRef.current = volumen
    if (audioRef.current) audioRef.current.volume = volumen
  }, [volumen])

  const reproducir = useCallback((lista, desde = 0, ctx = null) => {
    if (!lista.length) return
    setError('')
    setContexto(ctx ?? claveLista(lista))
    setOriginal(lista)
    if (aleatorio && ctx !== 'dj') {      // el DJ ya trae su orden
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

  // ---------- DJ ----------
  const aCola = (sesion) => {
    setDjNombre(sesion.dj)
    return sesion.bloques.flatMap((b) =>
      b.canciones.map((c, i) => (i === 0 ? { ...c, dj: { frase: b.frase, audio_url: b.audio_url } } : c)))
  }

  async function reproducirDJ(vibra = 'mix') {
    setDjCargando(true)
    setError('')
    try {
      const lista = aCola(await api.djSesion(vibra))
      djDichas.current = new Set()
      setDjVibra(vibra)
      reproducir(lista, 0, 'dj')
    } catch (e) {
      setError(e.message)
    } finally {
      setDjCargando(false)
    }
  }

  async function masDJ() {
    setDjCargando(true)
    try {
      const nuevas = aCola(await api.djSesion(djVibra))
      setOriginal((o) => [...o, ...nuevas])
      setCola((c) => [...c, ...nuevas])
      setIndice((i) => i + 1)
      setCarga((c) => c + 1)
    } catch (e) {
      setError(e.message)
      setSonando(false)
    } finally {
      setDjCargando(false)
    }
  }

  const siguiente = useCallback((automatico = false) => {
    if (!cola.length) return
    if (automatico && repetir === 'una') {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => setError('No se pudo reproducir el audio'))
      return
    }
    if (indice < cola.length - 1) irA(indice + 1)
    else if (contexto === 'dj') masDJ()        // el DJ nunca se acaba: pide otra tanda
    else if (repetir === 'todo') irA(0)
    else if (automatico) setSonando(false)
  }, [cola.length, indice, repetir, contexto]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Corta lo que está diciendo el DJ y arranca la canción. */
  function saltarDJ() {
    djHabla.current?.detener()
    setDjFrase(null)
  }

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

  // Título de la pestaña: la canción que suena (como Spotify) o solo el nombre de la app
  useEffect(() => {
    document.title = actual && sonando
      ? `${actual.titulo} • ${nombresArtistas(actual)}`
      : NOMBRE_APP
  }, [actual, sonando])

  // Temporizador de sueño: pausa después de X minutos o al terminar la canción actual
  const [temporizador, setTemporizador] = useState(null)   // null | { minutos, fin } | { cancion: true }
  const [minutosRestantes, setMinutosRestantes] = useState(0)
  const programarTemporizador = (opcion) => {
    if (!opcion) setTemporizador(null)
    else if (opcion === 'cancion') setTemporizador({ cancion: true })
    else {
      setTemporizador({ minutos: opcion, fin: Date.now() + opcion * 60_000 })
      setMinutosRestantes(opcion)
    }
  }
  useEffect(() => {
    if (!temporizador?.fin) return
    const fin = setTimeout(() => {
      audioRef.current?.pause()
      setTemporizador(null)
    }, Math.max(0, temporizador.fin - Date.now()))
    const tic = setInterval(() =>
      setMinutosRestantes(Math.max(1, Math.ceil((temporizador.fin - Date.now()) / 60_000))), 15_000)
    return () => { clearTimeout(fin); clearInterval(tic) }
  }, [temporizador])

  function alTerminar() {
    if (temporizador?.cancion) {
      setTemporizador(null)
      setSonando(false)
    } else {
      siguiente(true)
    }
  }

  const valor = {
    contexto, actual, cola, indice, sonando, tiempo, duracion, volumen, aleatorio, repetir, error,
    reproducir, alternar, siguiente, anterior, buscar, setVolumen,
    alternarAleatorio, alternarRepetir, limpiarError: () => setError(''),
    temporizador, programarTemporizador, minutosRestantes,
    dj: { activo: contexto === 'dj', nombre: djNombre, frase: djFrase, vibra: djVibra, cargando: djCargando },
    reproducirDJ, saltarDJ,
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
        onEnded={alTerminar}
        onError={() => actual && setError('No se pudo cargar el audio')} />
    </ReproductorContext.Provider>
  )
}

export const useReproductor = () => useContext(ReproductorContext)