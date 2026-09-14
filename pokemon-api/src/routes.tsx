import { Navigate, Route, Routes } from 'react-router'
import App from './App'
import { DetailPage } from './pages/DetailPage'
import { ListPage } from './pages/ListPage'

/**
 * Listado y detalle son rutas hermanas bajo el mismo layout. Por eso el
 * listado queda desmontado mientras se ve el detalle: el ticket pide que se
 * oculte, y aquí eso es estructural, no un booleano de visibilidad.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<App />}>
        <Route index element={<ListPage />} />
        <Route path="pokemon/:name" element={<DetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
