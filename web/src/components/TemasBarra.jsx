// Temas de la barra de reproducción (idea inspirada en las barras personalizadas de YouTube,
// con dibujos propios). Cada tema = puntero animado + relleno temático de lo que ya sonó.
// Los colores, patrones y animaciones de cada tema están en index.css (.tema-<id>).
import Muneco from './Munecos.jsx'

export const TEMAS = [
  { id: 'clasica', nombre: 'Clásica' },
  { id: 'onda', nombre: 'Onda' },
  { id: 'nota', nombre: 'Partitura', muneco: 'nota' },
  { id: 'cohete', nombre: 'Cohete', muneco: 'cohete' },
  { id: 'pato', nombre: 'Pato', muneco: 'pato' },
  { id: 'gato', nombre: 'Gato', muneco: 'gato' },
  { id: 'rana', nombre: 'Rana', muneco: 'rana' },
  { id: 'fantasma', nombre: 'Fantasma', muneco: 'fantasma' },
  { id: 'abeja', nombre: 'Abeja', muneco: 'abeja' },
  { id: 'caracol', nombre: 'Caracol', muneco: 'caracol' },
]

export const temaPorId = (id) => TEMAS.find((t) => t.id === id) || TEMAS[0]

/** La pista de progreso con su tema. `children` = el <input type="range"> en el reproductor. */
export default function PistaTema({ tema, progreso, sonando, tamMuneco = 28, className = '', children }) {
  const t = temaPorId(tema)
  const clases = ['pista', `tema-${t.id}`, t.muneco && 'con-muneco', sonando && 'sonando', className]
    .filter(Boolean).join(' ')
  return (
    <div className={clases} style={{ '--lleno': `${progreso}%` }}>
      <span className="pista-fondo" aria-hidden="true" />
      <span className="pista-relleno" aria-hidden="true" />
      {t.muneco && (
        <span className="pista-muneco" aria-hidden="true">
          <Muneco id={t.muneco} tam={tamMuneco} />
        </span>
      )}
      {children}
    </div>
  )
}
