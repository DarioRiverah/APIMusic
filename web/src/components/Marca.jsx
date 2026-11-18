// Identidad de UnderTone: el nombre y el logo viven solo aquí
export const NOMBRE_APP = 'UnderTone'

/** Símbolo: una línea (la superficie) y barras de ecualizador colgando debajo. */
export function Logo({ tam = 20 }) {
  return (
    <svg width={tam} height={tam} viewBox="14 22 68 60" aria-hidden="true"
      fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round">
      <path d="M20 34H76" />
      <path d="M26 44v10M37 44v26M48 44v18M59 44v32M70 44v12" />
    </svg>
  )
}

/** Logo en su cuadro de color + nombre. `tag` agrega una etiqueta (p. ej. "Admin"). */
export default function Marca({ tam = 34, tag, className = '' }) {
  return (
    <span className={`marca ${className}`}>
      <span className="marca-logo" style={{ width: tam, height: tam }}>
        <Logo tam={Math.round(tam * 0.62)} />
      </span>
      <span className="marca-nombre">{NOMBRE_APP}</span>
      {tag && <span className="marca-tag">{tag}</span>}
    </span>
  )
}
