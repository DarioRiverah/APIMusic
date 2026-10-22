import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from './api'

// Carga una vez canciones, artistas, álbumes y géneros y los comparte entre pestañas
const CatalogoContext = createContext(null)

export function CatalogoProvider({ children }) {
  const [datos, setDatos] = useState({ canciones: [], artistas: [], albumes: [], generos: [] })
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const recargar = useCallback(() =>
    Promise.all([api.listarCanciones(), api.listarArtistas(), api.listarAlbumes(), api.generos()])
      .then(([canciones, artistas, albumes, generos]) => {
        setDatos({ canciones, artistas, albumes, generos })
        setError('')
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false)), [])

  useEffect(() => { recargar() }, [recargar])

  return (
    <CatalogoContext.Provider value={{ ...datos, cargando, error, recargar }}>
      {children}
    </CatalogoContext.Provider>
  )
}

export const useCatalogo = () => useContext(CatalogoContext)