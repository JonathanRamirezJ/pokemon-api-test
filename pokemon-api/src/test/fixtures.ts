import type { PokemonDetailResponse, PokemonListResponse } from '../types/pokemon'

export const API_BASE_URL = 'https://pokeapi.co/api/v2'

/**
 * Conjunto acotado de nombres que imita el orden real de PokéAPI.
 * Dos páginas completas de 20 permiten probar la acumulación y que la
 * búsqueda alcance nombres que solo existen en el segundo lote.
 */
export const POKEMON_NAMES = [
  'bulbasaur', 'ivysaur', 'venusaur', 'charmander', 'charmeleon',
  'charizard', 'squirtle', 'wartortle', 'blastoise', 'caterpie',
  'metapod', 'butterfree', 'weedle', 'kakuna', 'beedrill',
  'pidgey', 'pidgeotto', 'pidgeot', 'rattata', 'raticate',
  'spearow', 'fearow', 'ekans', 'arbok', 'pikachu',
  'raichu', 'sandshrew', 'sandslash', 'nidoran-f', 'nidorina',
  'nidoqueen', 'nidoran-m', 'nidorino', 'nidoking', 'clefairy',
  'clefable', 'vulpix', 'ninetales', 'jigglypuff', 'wigglytuff',
] as const

export const TOTAL_POKEMON = POKEMON_NAMES.length

export function resourceUrl(name: string): string {
  const index = POKEMON_NAMES.indexOf(name as (typeof POKEMON_NAMES)[number])
  return `${API_BASE_URL}/pokemon/${index + 1}/`
}

export function makeListResponse(limit: number, offset: number): PokemonListResponse {
  const slice = POKEMON_NAMES.slice(offset, offset + limit)
  const nextOffset = offset + limit
  return {
    count: TOTAL_POKEMON,
    next: nextOffset < TOTAL_POKEMON
      ? `${API_BASE_URL}/pokemon?offset=${nextOffset}&limit=${limit}`
      : null,
    previous: offset > 0
      ? `${API_BASE_URL}/pokemon?offset=${Math.max(0, offset - limit)}&limit=${limit}`
      : null,
    results: slice.map((name) => ({ name, url: resourceUrl(name) })),
  }
}

export const charmanderDetailResponse: PokemonDetailResponse = {
  name: 'charmander',
  height: 6,
  weight: 85,
  sprites: {
    front_default:
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/pokemon/4.png',
  },
  abilities: [
    { is_hidden: false, slot: 1, ability: { name: 'blaze', url: `${API_BASE_URL}/ability/66/` } },
    { is_hidden: true, slot: 3, ability: { name: 'solar-power', url: `${API_BASE_URL}/ability/94/` } },
  ],
}

export function makeDetailResponse(
  name: string,
  overrides: Partial<PokemonDetailResponse> = {},
): PokemonDetailResponse {
  return { ...charmanderDetailResponse, name, ...overrides }
}
