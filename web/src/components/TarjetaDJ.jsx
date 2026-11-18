import { useCatalogo } from '../catalogo.jsx'
import { useReproductor } from '../reproductor.jsx'
import Icono from './Icono.jsx'
import { Logo } from './Marca.jsx'

const NOMBRE_GENERO = { electronica: 'Electrónica', clasica: 'Clásica', reggaeton: 'Reggaetón' }
const nombreGenero = (g) => NOMBRE_GENERO[g] || g.charAt(0).toUpperCase() + g.slice(1)

/** Tarjeta del DJ en el inicio: arrancar, pausar y cambiar de vibra. */
export default function TarjetaDJ() {
  const { canciones } = useCatalogo()
  const r = useReproductor()
  const { dj } = r
  const sonandoDJ = dj.activo && r.sonando

  // Géneros que de verdad tienen canciones, los 3 con más
  const conteo = {}
  canciones.forEach((c) => { conteo[c.genero] = (conteo[c.genero] || 0) + 1 })
  const generos = Object.keys(conteo).sort((a, b) => conteo[b] - conteo[a]).slice(0, 3)
  const vibras = [
    { id: 'mix', texto: 'Mix para ti' },
    { id: 'favoritas', texto: 'Tus favoritas' },
    { id: 'descubrir', texto: 'Descubrir' },
    ...generos.map((g) => ({ id: g, texto: nombreGenero(g) })),
  ]

  function principal() {
    if (dj.activo) r.alternar()
    else r.reproducirDJ(dj.vibra)
  }

  return (
    <section className={`tarjeta-dj ${dj.frase ? 'hablando' : ''}`} aria-label={`DJ ${dj.nombre}`}>
      <div className="dj-avatar" aria-hidden="true"><Logo tam={44} /></div>
      <div className="dj-cuerpo">
        <span className="dj-etiqueta">DJ {dj.nombre}</span>
        <h2>{dj.activo ? 'Tu DJ está al aire' : 'Música elegida para ti, con alguien que te la presenta'}</h2>
        <p className="dj-texto">
          {dj.frase ? `“${dj.frase}”` : `Escoge una vibra y ${dj.nombre} arma la sesión según tus me gusta y lo que escuchas.`}
        </p>
        <div className="dj-vibras" role="group" aria-label="Vibra">
          {vibras.map((v) => (
            <button key={v.id} type="button" disabled={dj.cargando}
              className={`chip chip-boton ${dj.activo && dj.vibra === v.id ? 'chip-activo' : ''}`}
              aria-pressed={dj.activo && dj.vibra === v.id}
              onClick={() => r.reproducirDJ(v.id)}>
              {v.texto}
            </button>
          ))}
        </div>
      </div>
      <button type="button" className="btn-play-grande grande dj-play" onClick={principal} disabled={dj.cargando}
        aria-label={dj.cargando ? 'Cargando DJ' : sonandoDJ ? 'Pausar DJ' : 'Arrancar DJ'}>
        {dj.cargando ? <span className="girando" /> : <Icono nombre={sonandoDJ ? 'pausa' : 'play'} tam={26} relleno />}
      </button>
    </section>
  )
}
