import { HttpResponse, http } from 'msw'
import { API_BASE_URL, makeDetailResponse, makeListResponse, POKEMON_NAMES } from './fixtures'

const DEFAULT_LIMIT = 20

/** Camino feliz de listado y detalle. Cada prueba sobrescribe lo que necesite. */
export const handlers = [
  http.get(`${API_BASE_URL}/pokemon`, ({ request }) => {
    const url = new URL(request.url)
    const limit = Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT)
    const offset = Number(url.searchParams.get('offset') ?? 0)
    return HttpResponse.json(makeListResponse(limit, offset))
  }),

  http.get(`${API_BASE_URL}/pokemon/:identifier`, ({ params }) => {
    const identifier = String(params.identifier)
    const byIndex = POKEMON_NAMES[Number(identifier) - 1]
    const name = byIndex ?? identifier

    if (!POKEMON_NAMES.includes(name as (typeof POKEMON_NAMES)[number])) {
      return HttpResponse.json({ error: 'Not Found' }, { status: 404 })
    }
    return HttpResponse.json(makeDetailResponse(name))
  }),
]
