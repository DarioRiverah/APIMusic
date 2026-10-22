import { Fragment } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatoDuracion } from '../api'
import { useFavoritos } from '../favoritos.jsx'
import { claveLista, useReproductor } from '../reproductor.jsx'
import { Imagen } from './comunes.jsx'
import Icono from './Icono.jsx'

/** "Karol G, Nicki Minaj" con cada nombre enlazado a su perfil. */
export function Artistas({ cancion, className = '' }) {
  const todos = [cancion.artista, ...cancion.invitados]
  return (
    <span className={`artistas ${className}`}>
      {todos.map((a, i) => (
        <Fragment key={a.id}>
          {i > 0 && ', '}
          <Link to={`/artista/${a.id}`} onClick={(e) => e.stopPropagation()}>{a.nombre}</Link>
        </Fragment>
      ))}
    </span>
  )
}

export function BotonFavorito({ id, tam = 18 }) {
  const { esFavorito, alternar } = useFavoritos()
  const activo = esFavorito(id)
  return (
    <button className={`btn-icono btn-corazon ${activo ? 'activo' : ''}`} aria-pressed={activo}
      aria-label={activo ? 'Quitar de Tus me gusta' : 'Agregar a Tus me gusta'}
      onClick={(e) => { e.stopPropagation(); alternar(id) }}>
      <Icono nombre="corazon" tam={tam} relleno={activo} />
    </button>
  )
}

/** Botón verde redondo de "reproducir todo". Pausa si esa lista ya está sonando. */
export function BotonReproducir({ canciones, grande = false, etiqueta = 'Reproducir', contexto }) {
  const { reproducir, alternar, actual, sonando, contexto: actualCtx } = useReproductor()
  const clave = contexto ?? claveLista(canciones)
  // Solo pausa si lo que suena viene de ESTA lista (como Spotify)
  const esta = actual && actualCtx === clave
  return (
    <button className={`btn-play-grande ${grande ? 'grande' : ''}`} disabled={!canciones.length}
      aria-label={esta && sonando ? 'Pausar' : etiqueta}
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        if (esta) alternar()
        else reproducir(canciones, 0, clave)
      }}>
      <Icono nombre={esta && sonando ? 'pausa' : 'play'} tam={grande ? 26 : 20} relleno />
    </button>
  )
}

/** Lista de canciones estilo Spotify. `pista` usa el número de pista del álbum. */
export function ListaCanciones({ canciones, mostrarAlbum = true, mostrarPortada = true, pista = false, contexto }) {
  const { reproducir: reproducirLista, actual, sonando, alternar } = useReproductor()
  const reproducir = (lista, i) => reproducirLista(lista, i, contexto ?? claveLista(lista))
  if (!canciones.length) return null

  return (
    <div className="lista" role="table" aria-label="Canciones">
      <div className={`lista-fila lista-cabecera ${mostrarAlbum ? '' : 'sin-album'}`} role="row">
        <span role="columnheader">#</span><span role="columnheader">Título</span>
        {mostrarAlbum && <span className="lista-album" role="columnheader">Álbum</span>}
        <span role="columnheader" aria-label="Me gusta" />
        <span className="lista-dur" role="columnheader" aria-label="Duración"><Icono nombre="reloj" tam={16} /></span>
      </div>
      {canciones.map((c, i) => {
        const esta = actual?.id === c.id
        return (
          <div key={`${c.id}-${i}`} role="row" tabIndex={0}
            className={`lista-fila ${mostrarAlbum ? '' : 'sin-album'} ${esta ? 'sonando' : ''}`}
            onDoubleClick={() => reproducir(canciones, i)}
            onKeyDown={(e) => e.key === 'Enter' && reproducir(canciones, i)}>
            <span className="lista-num" role="cell">
              <span className="num">{esta && sonando ? <span className="ecualizador"><i /><i /><i /></span>
                : (pista && c.numero_pista) || i + 1}</span>
              <button className="btn-fila" aria-label={esta && sonando ? 'Pausar' : `Reproducir ${c.titulo}`}
                onClick={() => (esta ? alternar() : reproducir(canciones, i))}>
                <Icono nombre={esta && sonando ? 'pausa' : 'play'} tam={14} relleno />
              </button>
            </span>
            <span className="lista-titulo" role="cell">
              {mostrarPortada && <Imagen url={c.portada_url} className="miniatura" />}
              <span className="lista-textos">
                <span className="cancion-titulo">{c.titulo}</span>
                <Artistas cancion={c} className="tenue" />
              </span>
            </span>
            {mostrarAlbum && (
              <span className="lista-album tenue" role="cell">
                {c.album ? <Link to={`/album/${c.album.id}`}>{c.album.titulo}</Link> : 'Sencillo'}
              </span>
            )}
            <span className="lista-fav" role="cell"><BotonFavorito id={c.id} tam={16} /></span>
            <span className="lista-dur tenue" role="cell">{formatoDuracion(c.duracion_segundos)}</span>
          </div>
        )
      })}
    </div>
  )
}

/** Tarjeta de álbum o artista con botón de play flotante. */
export function Tarjeta({ a, imagen, titulo, subtitulo, redondo = false, icono = 'disco', canciones }) {
  const navegar = useNavigate()
  return (
    <article className="tarjeta tarjeta-musica" onClick={() => navegar(a)} role="link" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navegar(a)}>
      <div className="tarjeta-portada">
        <Imagen url={imagen} className={`tarjeta-img ${redondo ? 'redondo' : ''}`} icono={icono} tam={40} />
        {canciones && <div className="tarjeta-play"><BotonReproducir canciones={canciones} /></div>}
      </div>
      <h3 className="tarjeta-titulo">{titulo}</h3>
      <p className="tenue tarjeta-sub">{subtitulo}</p>
    </article>
  )
}

/** Fila horizontal de tarjetas con título de sección. */
export function Seccion({ titulo, children, accion }) {
  return (
    <section className="seccion">
      <div className="seccion-cabecera">
        <h2>{titulo}</h2>
        {accion}
      </div>
      {children}
    </section>
  )
}

/** Cabecera grande con imagen (álbum, artista, playlist). */
export function Cabecera({ imagen, redondo, icono, tipo, titulo, children, color = '#1ed760' }) {
  return (
    <header className="cabecera" style={{ '--color-cabecera': color }}>
      <Imagen url={imagen} className={`cabecera-img ${redondo ? 'redondo' : ''}`} icono={icono} tam={64} />
      <div className="cabecera-textos">
        <span className="cabecera-tipo">{tipo}</span>
        <h1 className="cabecera-titulo">{titulo}</h1>
        <div className="cabecera-meta">{children}</div>
      </div>
    </header>
  )
}