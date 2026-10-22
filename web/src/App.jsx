import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import { CatalogoProvider } from './catalogo.jsx'
import { FavoritosProvider } from './favoritos.jsx'
import { ReproductorProvider } from './reproductor.jsx'
import LayoutApp from './components/LayoutApp.jsx'
import LayoutAdmin from './components/admin/LayoutAdmin.jsx'
import Login from './pages/Login.jsx'
import Registro from './pages/Registro.jsx'
import Verificar from './pages/Verificar.jsx'
import Inicio from './pages/Inicio.jsx'
import Buscar from './pages/Buscar.jsx'
import Artista from './pages/Artista.jsx'
import Album from './pages/Album.jsx'
import Favoritos from './pages/Favoritos.jsx'
import Generar from './pages/Generar.jsx'
import Perfil from './pages/Perfil.jsx'
import AdminCanciones from './pages/admin/Canciones.jsx'
import AdminArtistas from './pages/admin/Artistas.jsx'
import AdminAlbumes from './pages/admin/Albumes.jsx'
import Recuperar from './pages/Recuperar.jsx'

/** Rutas para usuarios con sesión: cargan catálogo, favoritos y el reproductor global. */
function ConSesion() {
  const { sesion } = useAuth()
  if (!sesion) return <Navigate to="/login" replace />
  return (
    <CatalogoProvider>
      <FavoritosProvider>
        <ReproductorProvider>
          <Outlet />
        </ReproductorProvider>
      </FavoritosProvider>
    </CatalogoProvider>
  )
}

function SoloAdmin() {
  const { esAdmin } = useAuth()
  return esAdmin ? <Outlet /> : <Navigate to="/" replace />
}

function SinSesion() {
  const { sesion } = useAuth()
  return sesion ? <Navigate to="/" replace /> : <Outlet />
}

export default function App() {
  return (
    <Routes>
      <Route element={<SinSesion />}>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/verificar" element={<Verificar />} />
        <Route path="/recuperar" element={<Recuperar />} />
      </Route>

      <Route element={<ConSesion />}>
        <Route element={<LayoutApp />}>
          <Route path="/" element={<Inicio />} />
          <Route path="/buscar" element={<Buscar />} />
          <Route path="/artista/:id" element={<Artista />} />
          <Route path="/album/:id" element={<Album />} />
          <Route path="/favoritos" element={<Favoritos />} />
          <Route path="/generar" element={<Generar />} />
          <Route path="/perfil" element={<Perfil />} />
        </Route>
        <Route element={<SoloAdmin />}>
          <Route element={<LayoutAdmin />}>
            <Route path="/admin" element={<AdminCanciones />} />
            <Route path="/admin/artistas" element={<AdminArtistas />} />
            <Route path="/admin/albumes" element={<AdminAlbumes />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}