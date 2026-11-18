// Personajes de los temas de la barra de reproducción. Dibujos propios en SVG (viewBox 32x32).
const DIBUJOS = {
  gato: (
    <>
      <path d="M7 13 6 4l7 5h6l7-5-1 9" fill="#F4A259" />
      <ellipse cx="16" cy="18" rx="10" ry="9" fill="#F4A259" />
      <path d="M9 7.5 10 11M23 7.5 22 11" stroke="#C9733A" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12.5" cy="17" r="1.6" fill="#1B1B1F" />
      <circle cx="19.5" cy="17" r="1.6" fill="#1B1B1F" />
      <path d="M15 20.5h2l-1 1.2z" fill="#E86A8C" />
      <path d="M4 20h6M4 23h6M22 20h6M22 23h6" stroke="#FFF3E6" strokeWidth="1" strokeLinecap="round" />
    </>
  ),
  perro: (
    <>
      <ellipse cx="16" cy="18" rx="9.5" ry="9" fill="#D9B48F" />
      <path d="M7.5 10c-3 1-4 7-2 10 2 1 3-2 4-5zM24.5 10c3 1 4 7 2 10-2 1-3-2-4-5z" fill="#8A5A3B" />
      <circle cx="12.5" cy="17" r="1.6" fill="#1B1B1F" />
      <circle cx="19.5" cy="17" r="1.6" fill="#1B1B1F" />
      <ellipse cx="16" cy="21.5" rx="2.4" ry="1.7" fill="#1B1B1F" />
      <path d="M16 23.2v2.3" stroke="#1B1B1F" strokeWidth="1.2" strokeLinecap="round" />
    </>
  ),
  pato: (
    <>
      <ellipse cx="17" cy="21" rx="10" ry="7" fill="#FFD43B" />
      <circle cx="12" cy="12" r="6.5" fill="#FFD43B" />
      <path d="M4 12.5c2-1.5 4-1.5 4 0s-2 1.5-4 0z" fill="#FF8C1A" />
      <circle cx="11" cy="10.5" r="1.4" fill="#1B1B1F" />
      <path d="M17 20c3 0 6-1 7-3" stroke="#E6B800" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </>
  ),
  rana: (
    <>
      <ellipse cx="16" cy="20" rx="11" ry="8" fill="#5BC56B" />
      <circle cx="10.5" cy="11.5" r="4.5" fill="#5BC56B" />
      <circle cx="21.5" cy="11.5" r="4.5" fill="#5BC56B" />
      <circle cx="10.5" cy="11" r="2.4" fill="#FFFFFF" />
      <circle cx="21.5" cy="11" r="2.4" fill="#FFFFFF" />
      <circle cx="10.8" cy="11.3" r="1.2" fill="#1B1B1F" />
      <circle cx="21.8" cy="11.3" r="1.2" fill="#1B1B1F" />
      <path d="M11 21c3 2.5 7 2.5 10 0" stroke="#2E7D3A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </>
  ),
  fantasma: (
    <>
      <path d="M6 28V15a10 10 0 0 1 20 0v13l-3.3-2.5-3.4 2.5-3.3-2.5-3.3 2.5-3.4-2.5z" fill="#F2F2F7" />
      <ellipse cx="12.5" cy="15" rx="1.6" ry="2.2" fill="#1B1B1F" />
      <ellipse cx="19.5" cy="15" rx="1.6" ry="2.2" fill="#1B1B1F" />
      <ellipse cx="16" cy="20" rx="1.6" ry="1.2" fill="#1B1B1F" />
    </>
  ),
  cohete: (
    <>
      <path d="M16 3c5 4 6 10 5 17h-10c-1-7 0-13 5-17z" fill="#E9ECF2" />
      <circle cx="16" cy="12" r="2.8" fill="#4C8DFF" />
      <path d="M11 16l-4 6 4-1zM21 16l4 6-4-1z" fill="#FF5A5F" />
      <path d="M13 21h6l-3 8z" fill="#FFB020" />
    </>
  ),
  abeja: (
    <>
      <ellipse cx="11" cy="9" rx="5" ry="4" fill="#E8F4FF" opacity=".85" />
      <ellipse cx="17" cy="9.5" rx="4" ry="3.2" fill="#E8F4FF" opacity=".85" />
      <ellipse cx="13" cy="18" rx="9" ry="7" fill="#FFC93C" />
      <rect x="9" y="11.5" width="2.6" height="13" fill="#1B1B1F" />
      <rect x="14" y="11.3" width="2.6" height="13.4" fill="#1B1B1F" />
      <circle cx="23" cy="17" r="4.5" fill="#1B1B1F" />
      <circle cx="24.6" cy="16" r="1.1" fill="#FFFFFF" />
      <path d="M4.2 17 1 18l3.2 1z" fill="#1B1B1F" />
    </>
  ),
  caracol: (
    <>
      <rect x="2" y="21" width="26" height="6" rx="3" fill="#C7E59B" />
      <path d="M24.5 21 27 14M22.5 21 22.8 14" stroke="#8DB85A" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="27" cy="14" r="1.4" fill="#1B1B1F" />
      <circle cx="22.8" cy="14" r="1.4" fill="#1B1B1F" />
      <circle cx="12" cy="15" r="8" fill="#C9824A" />
      <path d="M12 15m-1 0a1 1 0 1 1 2 0a3 3 0 1 1-6 0a5 5 0 1 1 10 0" fill="none" stroke="#8A5230" strokeWidth="1.5" />
    </>
  ),
  nota: (
    <>
      <path d="M12 23V8l13-3v15" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="9" cy="23.5" rx="4" ry="3.2" fill="currentColor" />
      <ellipse cx="22" cy="20.5" rx="4" ry="3.2" fill="currentColor" />
    </>
  ),
}

export default function Muneco({ id, tam = 28 }) {
  if (!DIBUJOS[id]) return null
  return (
    <svg width={tam} height={tam} viewBox="0 0 32 32" aria-hidden="true" className={`muneco muneco-${id}`}>
      {DIBUJOS[id]}
    </svg>
  )
}
