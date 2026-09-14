import axios from 'axios'

export const POKE_API_BASE_URL = 'https://pokeapi.co/api/v2'

/**
 * Instancia única de axios. Es el único punto del proyecto que conoce la
 * URL de PokéAPI; el resto de la aplicación habla con src/api/pokemon.ts.
 */
export const pokeApiClient = axios.create({
  baseURL: POKE_API_BASE_URL,
  timeout: 10_000,
  headers: { Accept: 'application/json' },
})
