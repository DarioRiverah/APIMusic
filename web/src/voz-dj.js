// Cómo habla el DJ: primero el audio de Google (Chirp 3 HD) que manda la API;
// si no hay, la voz del navegador (Web Speech API), escogiendo la más natural que exista.

const PREFERIDAS = [/natural/i, /neural/i, /online/i, /premium/i, /enhanced|mejorad/i, /google/i]
const ACENTOS = ['es-CO', 'es-419', 'es-US', 'es-MX', 'es']

function mejorVozDelNavegador() {
  const voces = window.speechSynthesis?.getVoices?.() || []
  const espanol = voces.filter((v) => v.lang?.toLowerCase().startsWith('es'))
  if (!espanol.length) return null
  const puntaje = (v) => {
    const calidad = PREFERIDAS.findIndex((r) => r.test(v.name))
    const acento = ACENTOS.findIndex((a) => v.lang.toLowerCase().startsWith(a.toLowerCase()))
    return (calidad === -1 ? 0 : (PREFERIDAS.length - calidad) * 10) + (acento === -1 ? 0 : ACENTOS.length - acento)
  }
  return [...espanol].sort((a, b) => puntaje(b) - puntaje(a))[0]
}

// Algunos navegadores cargan las voces tarde: se piden una vez al cargar la página
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.getVoices()
  window.speechSynthesis.addEventListener?.('voiceschanged', () => window.speechSynthesis.getVoices())
}

function hablarConNavegador(texto, volumen) {
  return new Promise((listo) => {
    if (!window.speechSynthesis) return listo()
    const frase = new SpeechSynthesisUtterance(texto)
    const voz = mejorVozDelNavegador()
    if (voz) frase.voice = voz
    frase.lang = voz?.lang || 'es-CO'
    frase.volume = volumen
    frase.rate = 1.03
    frase.onend = () => listo()
    frase.onerror = () => listo()
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(frase)
  })
}

/**
 * Dice la frase del DJ. Devuelve { termino: Promise, detener() }.
 * conVoz = false -> no suena nada (el DJ solo se muestra escrito).
 */
export function hablar({ frase, audio_url: url }, { conVoz = true, volumen = 0.9 } = {}) {
  let audio = null
  let cancelado = false
  let terminar = () => {}
  const termino = new Promise((listo) => {
    if (!conVoz) return listo()
    // Seguro: si algo se queda colgado, la música arranca igual a los 25 s
    const seguro = setTimeout(listo, 25_000)
    terminar = () => { clearTimeout(seguro); listo() }
    let conNavegador = false
    const navegador = () => {             // respaldo: solo una vez aunque fallen dos cosas
      if (conNavegador) return
      conNavegador = true
      if (cancelado) terminar()
      else hablarConNavegador(frase, volumen).then(terminar)
    }
    if (url) {
      audio = new Audio(url)
      audio.volume = volumen
      audio.onended = terminar
      audio.onerror = navegador
      audio.play().catch(navegador)
    } else {
      navegador()
    }
  })
  /** Corta la voz y deja seguir la música de una. */
  const detener = () => {
    cancelado = true
    audio?.pause()
    window.speechSynthesis?.cancel()
    terminar()
  }
  return { termino, detener }
}
