import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { PokemonApiError, getPokemonPage } from '../api/pokemon'
import type { PokemonListItem } from '../types/pokemon'
import {
  PokemonListContext,
  type PokemonListContextValue,
  type PokemonListStatus,
} from './pokemonListContext'

function messageOf(error: unknown): string {
  if (error instanceof PokemonApiError) return error.message
  return 'No se pudo obtener la lista de Pokémon.'
}

/**
 * Mantiene la lista acumulada y el cursor de paginación. Va montado en el
 * layout, por encima de las rutas: por eso lo acumulado sobrevive al viaje
 * al detalle y de vuelta. Deliberadamente no conoce el texto de búsqueda —
 * ese vive en la vista de listado, que sí se desmonta al navegar.
 */
export function PokemonListProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<PokemonListItem[]>([])
  const [next, setNext] = useState<string | null>(null)
  const [status, setStatus] = useState<PokemonListStatus>('loading')
  const [error, setError] = useState<string | null>(null)

  // Guarda contra la doble invocación de efectos de StrictMode.
  const initialLoadStarted = useRef(false)
  // Guarda contra invocaciones concurrentes de loadMore.
  const inFlight = useRef(false)
  // El cursor se lee desde una ref para que loadMore no cambie de identidad
  // en cada página y los consumidores no se re-suscriban sin necesidad.
  const nextRef = useRef<string | null>(null)
  const loadedFirstPage = useRef(false)

  const load = useCallback(async (url: string | null) => {
    if (inFlight.current) return
    inFlight.current = true
    setStatus('loading')

    try {
      const page = await getPokemonPage(url ? { url } : {})
      setItems((current) => [...current, ...page.items])
      setNext(page.next)
      nextRef.current = page.next
      setError(null)
      setStatus('ready')
      loadedFirstPage.current = true
    } catch (caught) {
      setError(messageOf(caught))
      setStatus('error')
    } finally {
      inFlight.current = false
    }
  }, [])

  const loadMore = useCallback(async () => {
    // Tras un fallo de la primera página, reintentarla es lo correcto.
    if (!loadedFirstPage.current) {
      await load(null)
      return
    }
    if (nextRef.current === null) return
    await load(nextRef.current)
  }, [load])

  useEffect(() => {
    if (initialLoadStarted.current) return
    initialLoadStarted.current = true
    void load(null)
  }, [load])

  const value = useMemo<PokemonListContextValue>(
    () => ({ items, status, error, hasMore: next !== null, loadMore }),
    [items, status, error, next, loadMore],
  )

  return <PokemonListContext value={value}>{children}</PokemonListContext>
}
