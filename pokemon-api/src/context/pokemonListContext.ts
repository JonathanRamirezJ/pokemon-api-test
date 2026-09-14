import { createContext } from 'react'
import type { PokemonListItem } from '../types/pokemon'

export type PokemonListStatus = 'loading' | 'ready' | 'error'

export interface PokemonListContextValue {
  /** Todo lo descargado hasta ahora, en el orden en que llegó. */
  items: PokemonListItem[]
  status: PokemonListStatus
  error: string | null
  hasMore: boolean
  loadMore: () => Promise<void>
  /** Descarta un error de un intento anterior que ya no describe el estado actual. */
  clearError: () => void
}

export const PokemonListContext = createContext<PokemonListContextValue | null>(null)
