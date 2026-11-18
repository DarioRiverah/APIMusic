import { ACENTOS, PREDETERMINADOS, useAjustes } from '../ajustes.jsx'
import Icono from '../components/Icono.jsx'
import PistaTema, { TEMAS, temaPorId } from '../components/TemasBarra.jsx'
import { useReproductor } from '../reproductor.jsx'

const TEMPORIZADOR = [
  { valor: null, texto: 'Apagado' },
  { valor: 15, texto: '15 min' },
  { valor: 30, texto: '30 min' },
  { valor: 45, texto: '45 min' },
  { valor: 60, texto: '1 hora' },
  { valor: 'cancion', texto: 'Al terminar la canción' },
]

/** Interruptor accesible: un checkbox real con aspecto de switch. */
function Interruptor({ titulo, desc, activo, onCambiar }) {
  return (
    <label className="ajuste-fila">
      <span className="ajuste-textos">
        <strong>{titulo}</strong>
        <span className="tenue">{desc}</span>
      </span>
      <input type="checkbox" role="switch" className="switch" checked={activo}
        onChange={(e) => onCambiar(e.target.checked)} />
    </label>
  )
}

/** Grupo de opciones excluyentes (radio) con aspecto de botones. */
function Opciones({ nombre, opciones, valor, onCambiar }) {
  return (
    <div className="segmentado" role="radiogroup" aria-label={nombre}>
      {opciones.map((o) => (
        <label key={o.id} className={`segmento ${valor === o.id ? 'activo' : ''}`}>
          <input type="radio" name={nombre} value={o.id} checked={valor === o.id}
            onChange={() => onCambiar(o.id)} className="sr" />
          {o.nombre}
        </label>
      ))}
    </div>
  )
}

export default function Ajustes() {
  const { ajustes, cambiar, restablecer } = useAjustes()
  const { temporizador, programarTemporizador } = useReproductor()
  const personalizado = !ACENTOS.some((a) => a.color.toLowerCase() === ajustes.acento.toLowerCase())
  const timerActual = !temporizador ? null : temporizador.cancion ? 'cancion' : temporizador.minutos

  return (
    <div className="pagina">
      <h1 className="titulo-pagina">Ajustes</h1>
      <p className="tenue ajustes-intro">Personaliza cómo se ve y se siente la app. Los cambios se guardan en este dispositivo.</p>

      <section className="ajustes-seccion">
        <h2><Icono nombre="paleta" tam={20} /> Color</h2>
        <div className="colores" role="radiogroup" aria-label="Color de acento">
          {ACENTOS.map((a) => (
            <label key={a.color} className="color-opcion" title={a.nombre}>
              <input type="radio" name="acento" className="sr" checked={ajustes.acento.toLowerCase() === a.color.toLowerCase()}
                onChange={() => cambiar('acento', a.color)} />
              <span className="color-muestra" style={{ background: a.color }} />
              <span className="color-nombre">{a.nombre}</span>
            </label>
          ))}
          <label className="color-opcion" title="Elige cualquier color">
            <span className={`color-muestra color-libre ${personalizado ? 'activo' : ''}`}
              style={personalizado ? { background: ajustes.acento } : undefined}>
              <input type="color" value={ajustes.acento} aria-label="Color personalizado"
                onChange={(e) => cambiar('acento', e.target.value.toUpperCase())} />
              {!personalizado && <Icono nombre="mas" tam={20} />}
            </span>
            <span className="color-nombre">Tuyo</span>
          </label>
        </div>
      </section>

      <section className="ajustes-seccion">
        <h2><Icono nombre="nota" tam={20} /> Barra de reproducción</h2>
        <p className="tenue ajustes-nota">Escoge un tema: cambia el puntero y cómo se pinta lo que ya sonó.</p>
        <div className="vista-barra">
          <span className="vista-tema">{temaPorId(ajustes.tema).nombre}</span>
          <PistaTema tema={ajustes.tema} progreso={62} sonando tamMuneco={34} className="pista-grande" />
        </div>

        <div className="temas" role="radiogroup" aria-label="Tema de la barra">
          {TEMAS.map((t) => (
            <label key={t.id} className={`tema-opcion ${ajustes.tema === t.id ? 'activo' : ''}`}>
              <input type="radio" name="tema" className="sr" checked={ajustes.tema === t.id}
                onChange={() => cambiar('tema', t.id)} />
              <PistaTema tema={t.id} progreso={58} sonando={ajustes.tema === t.id} tamMuneco={24} />
              <span>{t.nombre}</span>
            </label>
          ))}
        </div>

        <div className="ajuste-fila">
          <span className="ajuste-textos">
            <strong>Grosor de la línea</strong>
            <span className="tenue">Más gruesa es más fácil de tocar</span>
          </span>
          <Opciones nombre="Grosor de la línea" valor={ajustes.grosor} onCambiar={(v) => cambiar('grosor', v)}
            opciones={[{ id: 'normal', nombre: 'Normal' }, { id: 'gruesa', nombre: 'Gruesa' }]} />
        </div>
      </section>

      <section className="ajustes-seccion">
        <h2><Icono nombre="volumen" tam={20} /> DJ</h2>
        <Interruptor titulo="Voz del DJ" desc="Si la apagas, el DJ solo muestra por escrito lo que diría"
          activo={ajustes.djVoz} onCambiar={(v) => cambiar('djVoz', v)} />
      </section>

      <section className="ajustes-seccion">
        <h2><Icono nombre="luna" tam={20} /> Temporizador de sueño</h2>
        <p className="tenue ajustes-nota">Pausa la música sola para que te puedas dormir escuchando.</p>
        <div className="chips-elegir">
          {TEMPORIZADOR.map((t) => (
            <button key={t.texto} type="button" aria-pressed={timerActual === t.valor}
              className={`chip chip-boton ${timerActual === t.valor ? 'chip-activo' : ''}`}
              onClick={() => programarTemporizador(t.valor)}>
              {t.texto}
            </button>
          ))}
        </div>
      </section>

      <section className="ajustes-seccion">
        <h2><Icono nombre="ajustes" tam={20} /> Apariencia</h2>
        <div className="ajuste-fila">
          <span className="ajuste-textos">
            <strong>Fondo</strong>
            <span className="tenue">Negro puro ahorra batería en pantallas OLED</span>
          </span>
          <Opciones nombre="Fondo" valor={ajustes.fondo} onCambiar={(v) => cambiar('fondo', v)}
            opciones={[{ id: 'oscuro', nombre: 'Oscuro' }, { id: 'oled', nombre: 'Negro puro' }]} />
        </div>
        <div className="ajuste-fila">
          <span className="ajuste-textos">
            <strong>Tamaño del texto</strong>
            <span className="tenue">Letra más grande en toda la app</span>
          </span>
          <Opciones nombre="Tamaño del texto" valor={ajustes.letra} onCambiar={(v) => cambiar('letra', v)}
            opciones={[{ id: 'normal', nombre: 'Normal' }, { id: 'grande', nombre: 'Grande' }]} />
        </div>
        <Interruptor titulo="Brillo de color" desc="Un resplandor suave de tu color arriba de la pantalla"
          activo={ajustes.brillo} onCambiar={(v) => cambiar('brillo', v)} />
        <Interruptor titulo="Efecto vidrio" desc="El reproductor se ve translúcido, como en Apple Music"
          activo={ajustes.vidrio} onCambiar={(v) => cambiar('vidrio', v)} />
        <Interruptor titulo="Animaciones" desc="Apágalas si prefieres menos movimiento"
          activo={ajustes.animaciones} onCambiar={(v) => cambiar('animaciones', v)} />
      </section>

      <button type="button" className="btn btn-fantasma" onClick={restablecer}
        disabled={JSON.stringify(ajustes) === JSON.stringify(PREDETERMINADOS)}>
        <Icono nombre="restablecer" tam={16} /> Restablecer ajustes
      </button>
    </div>
  )
}
