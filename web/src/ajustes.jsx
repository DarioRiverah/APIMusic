import { createContext, useContext, useEffect, useState } from 'react'

// Preferencias visuales del usuario. Se guardan en este navegador (localStorage)
// y se aplican como variables CSS y atributos data-* en <html>.
const AjustesContext = createContext(null)
const CLAVE = 'undertone_ajustes'

export const ACENTOS = [
  { nombre: 'Rosado', color: '#FF3B5C' },
  { nombre: 'Coral', color: '#FF7A45' },
  { nombre: 'Ámbar', color: '#FFB020' },
  { nombre: 'Lima', color: '#B6E33B' },
  { nombre: 'Turquesa', color: '#2EC4B6' },
  { nombre: 'Azul', color: '#4C8DFF' },
  { nombre: 'Violeta', color: '#8B7CFF' },
  { nombre: 'Fucsia', color: '#E040FB' },
]

export const PREDETERMINADOS = {
  acento: '#FF3B5C',
  fondo: 'oscuro',        // 'oscuro' | 'oled'
  brillo: true,           // resplandor del color de acento arriba
  vidrio: true,           // reproductor flotante translúcido
  letra: 'normal',        // 'normal' | 'grande'
  animaciones: true,
  tema: 'clasica',        // tema de la barra de reproducción (components/TemasBarra.jsx)
  grosor: 'normal',       // 'normal' | 'gruesa'
  djVoz: true,            // el DJ habla (si no, solo muestra lo que diría)
}

function leer() {
  try {
    const { barra, muneco, ...guardado } = JSON.parse(localStorage.getItem(CLAVE) || '{}')
    // Ajustes de la versión anterior (barra + muñeco por separado) -> tema
    if (!guardado.tema && muneco && muneco !== 'ninguno') guardado.tema = muneco === 'perro' ? 'gato' : muneco
    else if (!guardado.tema && barra === 'onda') guardado.tema = 'onda'
    if (!guardado.grosor && barra === 'gruesa') guardado.grosor = 'gruesa'
    return { ...PREDETERMINADOS, ...guardado }
  } catch {
    return { ...PREDETERMINADOS }
  }
}

/** Blanco encima del color si se lee bien (contraste ≥ 3, suficiente para botones e íconos
 * en negrita); si no, negro. Así el rosado lleva blanco y el lima o el ámbar llevan negro. */
export function tintaPara(hex) {
  const n = parseInt(hex.slice(1), 16)
  const canal = (c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  const lum = 0.2126 * canal(n >> 16) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255)
  return 1.05 / (lum + 0.05) >= 3 ? '#FFFFFF' : '#111111'
}

const esHex = (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)

export function AjustesProvider({ children }) {
  const [ajustes, setAjustes] = useState(leer)

  useEffect(() => {
    const html = document.documentElement
    const acento = esHex(ajustes.acento) ? ajustes.acento : PREDETERMINADOS.acento
    html.style.setProperty('--acento', acento)
    html.style.setProperty('--acento-tinta', tintaPara(acento))
    html.dataset.fondo = ajustes.fondo
    html.dataset.brillo = ajustes.brillo ? 'si' : 'no'
    html.dataset.vidrio = ajustes.vidrio ? 'si' : 'no'
    html.dataset.letra = ajustes.letra
    html.dataset.grosor = ajustes.grosor
    html.dataset.animaciones = ajustes.animaciones ? 'si' : 'no'
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', ajustes.fondo === 'oled' ? '#000000' : '#0F0F11')
    try { localStorage.setItem(CLAVE, JSON.stringify(ajustes)) } catch { /* sin storage */ }
  }, [ajustes])

  const cambiar = (campo, valor) => setAjustes((a) => ({ ...a, [campo]: valor }))
  const restablecer = () => setAjustes({ ...PREDETERMINADOS })

  return (
    <AjustesContext.Provider value={{ ajustes, cambiar, restablecer }}>
      {children}
    </AjustesContext.Provider>
  )
}

export const useAjustes = () => useContext(AjustesContext)
