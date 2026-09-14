/**
 * Forma cruda de las respuestas de PokéAPI, verificada contra la API real.
 * Solo la capa de src/api/ debería conocer estos tipos: hacia el resto de la
 * aplicación se exponen únicamente los tipos normalizados de más abajo.
 */

export interface PokemonListItem {
  name: string
  url: string
}

export interface PokemonListResponse {
  count: number
  next: string | null
  previous: string | null
  results: PokemonListItem[]
}

export interface PokemonAbilityEntry {
  is_hidden: boolean
  slot: number
  ability: {
    name: string
    url: string
  }
}

export interface PokemonDetailResponse {
  name: string
  height: number
  weight: number
  sprites: {
    /** Puede venir en null para algunos recursos. */
    front_default: string | null
  }
  abilities: PokemonAbilityEntry[]
}

/** Tipos normalizados que consume la aplicación. */

export interface PokemonPage {
  items: PokemonListItem[]
  /** URL de la siguiente página, o null si no hay más. */
  next: string | null
  total: number
}

export interface PokemonDetail {
  name: string
  height: number
  weight: number
  spriteUrl: string | null
  abilities: string[]
}
