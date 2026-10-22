import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from './api'

// Ids de las canciones favoritas del usuario, para pintar el corazón en toda la app
const FavoritosContext = createContext(null)

export function FavoritosProvider({ children }) {
  const [ids, setIds] = useState(() => new Set())
  const [version, setVersion] = useState(0)        // cambia cada vez que se edita la lista

  useEffect(() => {
    api.favoritos().then((lista) => setIds(new Set(lista.map((c) => c.id)))).catch(() => {})
  }, [])

  const alternar = useCallback(async (id) => {
    const era = ids.has(id)
    setIds((s) => { const n = new Set(s); if (era) n.delete(id); else n.add(id); return n })
    try {
      await (era ? api.quitarFavorito(id) : api.agregarFavorito(id))
      setVersion((v) => v + 1)
    } catch {
      setIds((s) => { const n = new Set(s); if (era) n.add(id); else n.delete(id); return n })   // revertir
    }
  }, [ids])

  return (
    <FavoritosContext.Provider value={{ esFavorito: (id) => ids.has(id), alternar, total: ids.size, version }}>
      {children}
    </FavoritosContext.Provider>
  )
}

export const useFavoritos = () => useContext(FavoritosContext)