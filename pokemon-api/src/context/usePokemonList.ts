import { useContext } from 'react'
import { PokemonListContext, type PokemonListContextValue } from './pokemonListContext'

export function usePokemonList(): PokemonListContextValue {
  const value = useContext(PokemonListContext)
  if (value === null) {
    throw new Error('usePokemonList debe usarse dentro de un PokemonListProvider.')
  }
  return value
}
