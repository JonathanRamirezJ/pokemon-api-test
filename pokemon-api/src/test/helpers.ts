import { HttpResponse, http } from 'msw'
import { API_BASE_URL, makeListResponse } from './fixtures'
import { server } from './server'

/**
 * Reinstala el manejador del listado contando cuántas veces se le pide.
 * Se usa para probar que ciertas interacciones —buscar, ir al detalle y
 * volver— no generan tráfico de red.
 */
export function countListRequests(): { value: number } {
  const counter = { value: 0 }

  server.use(
    http.get(`${API_BASE_URL}/pokemon`, ({ request }) => {
      counter.value += 1
      const url = new URL(request.url)
      return HttpResponse.json(
        makeListResponse(
          Number(url.searchParams.get('limit') ?? 20),
          Number(url.searchParams.get('offset') ?? 0),
        ),
      )
    }),
  )

  return counter
}
