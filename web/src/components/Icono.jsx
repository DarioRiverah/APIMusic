// Íconos SVG simples (sin librerías extra)
const RUTAS = {
  logo: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  play: 'M7 4.5v15l12-7.5-12-7.5Z',
  pausa: 'M7 4h3.5v16H7zM13.5 4H17v16h-3.5z',
  editar: 'M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4',
  borrar: 'M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13',
  mas: 'M12 5v14M5 12h14',
  buscar: 'm20 20-4.2-4.2M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z',
  salir: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11',
  cerrar: 'M6 6l12 12M18 6 6 18',
  subir: 'M12 16V4m0 0L7 9m5-5 5 5M4 20h16',
  nota: 'M9 18V5l12-2v13',
  imagen: 'M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M15 9.5a1 1 0 1 0 0-.01',
  persona: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  disco: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  casa: 'M4 10.5 12 4l8 6.5V20h-5.5v-6h-5v6H4z',
  corazon: 'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z',
  aleatorio: 'M4 7h3.5c4 0 5 10 9 10H20m0 0-2.5-2.5M20 17l-2.5 2.5M4 17h3.5c1.4 0 2.4-1.2 3.2-2.8M20 7h-3.5c-1.4 0-2.4 1.2-3.2 2.8M20 7l-2.5-2.5M20 7l-2.5 2.5',
  repetir: 'M17 3l3 3-3 3M4 11V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3M20 13v2a3 3 0 0 1-3 3H4',
  anterior: 'M6 5v14M19 5 9 12l10 7V5Z',
  siguiente: 'M18 5v14M5 5l10 7-10 7V5Z',
  volumen: 'M4 9.5h3.5L12 6v12l-4.5-3.5H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11',
  silencio: 'M4 9.5h3.5L12 6v12l-4.5-3.5H4zM16 10l5 5M21 10l-5 5',
  varita: 'M4 20 15 9M14 4v3M19 9h-3M17.5 5.5l-2 2M9 4.5V6M20 14h-1.5',
  escudo: 'M12 3 5 6v5.5c0 4.3 3 7.8 7 9.5 4-1.7 7-5.2 7-9.5V6z',
  reloj: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4.5l3 2',
  atras: 'M15 5l-7 7 7 7',
  correo: 'M4 6h16v12H4zM4 7l8 6 8-6',
}

export default function Icono({ nombre, tam = 18, relleno = false }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" aria-hidden="true"
      fill={relleno ? 'currentColor' : 'none'} stroke={relleno ? 'none' : 'currentColor'}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={RUTAS[nombre]} />
    </svg>
  )
}

/** Logo oficial de Google (multicolor), para el botón de inicio de sesión. */
export function LogoGoogle({ tam = 18 }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}