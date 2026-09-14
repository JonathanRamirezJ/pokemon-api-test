import axios from 'axios'
import type {
  PokemonDetail,
  PokemonDetailResponse,
  PokemonListResponse,
  PokemonPage,
} from '../types/pokemon'
import { pokeApiClient } from './client'

export const DEFAULT_PAGE_SIZE = 20

/**
 * Error propio de la capa de API. El resto de la aplicación nunca debe
 * inspeccionar objetos de error de axios.
 */
export class PokemonApiError extends Error {
  readonly status: number | undefined

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'PokemonApiError'
    this.status = status
  }
}

function statusOf(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined
}

function toApiError(error: unknown, message: string): PokemonApiError {
  if (error instanceof PokemonApiError) return error
  return new PokemonApiError(message, statusOf(error))
}

interface GetPokemonPageOptions {
  limit?: number
  offset?: number
  /** URL absoluta de `next`; cuando se pasa, ignora limit y offset. */
  url?: string | null
}

export async function getPokemonPage(
  options: GetPokemonPageOptions = {},
): Promise<PokemonPage> {
  const { limit = DEFAULT_PAGE_SIZE, offset = 0, url } = options

  try {
    const response = url
      ? await pokeApiClient.get<PokemonListResponse>(url)
      : await pokeApiClient.get<PokemonListResponse>('/pokemon', {
          params: { limit, offset },
        })

    const { results, next, count } = response.data
    return {
      items: (results ?? []).map(({ name, url: resourceUrl }) => ({ name, url: resourceUrl })),
      next: next ?? null,
      total: count ?? 0,
    }
  } catch (error) {
    throw toApiError(error, 'No se pudo obtener la lista de Pokémon.')
  }
}

interface GetPokemonDetailOptions {
  name: string
  /** URL del recurso tal como la entregó el listado. */
  url?: string | null
}

export async function getPokemonDetail({
  name,
  url,
}: GetPokemonDetailOptions): Promise<PokemonDetail> {
  const target = url ?? `/pokemon/${encodeURIComponent(name)}`

  try {
    const { data } = await pokeApiClient.get<PokemonDetailResponse>(target)

    return {
      name: data.name,
      height: data.height,
      weight: data.weight,
      spriteUrl: data.sprites?.front_default ?? null,
      // La API anida el nombre en abilities[].ability.name; esa forma no
      // debe filtrarse hacia los componentes.
      abilities: (data.abilities ?? []).map((entry) => entry.ability.name),
    }
  } catch (error) {
    if (statusOf(error) === 404) {
      throw new PokemonApiError(`El Pokémon «${name}» no existe.`, 404)
    }
    throw toApiError(error, `No se pudo obtener el detalle de ${name}.`)
  }
}
