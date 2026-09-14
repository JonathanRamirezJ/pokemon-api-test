import { Outlet } from 'react-router'
import { PokemonListProvider } from './context/PokemonListProvider'

/**
 * Layout de la aplicación. El proveedor del listado va montado aquí, por
 * encima de la salida de rutas: nunca se desmonta al navegar, y por eso lo
 * acumulado sobrevive al viaje al detalle y de vuelta.
 */
function App() {
  return (
    <PokemonListProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-4xl px-4 py-5">
            <p className="text-xl font-semibold">Pokédex</p>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8">
          <Outlet />
        </main>
      </div>
    </PokemonListProvider>
  )
}

export default App
