import { act, renderHook, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { StrictMode, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { API_BASE_URL, makeListResponse } from '../test/fixtures'
import { server } from '../test/server'
import { PokemonListProvider } from './PokemonListProvider'
import { usePokemonList } from './usePokemonList'

function wrapper({ children }: { children: ReactNode }) {
  return <PokemonListProvider>{children}</PokemonListProvider>
}

function strictWrapper({ children }: { children: ReactNode }) {
  return (
    <StrictMode>
      <PokemonListProvider>{children}</PokemonListProvider>
    </StrictMode>
  )
}

/** Cuenta cuántas veces se pidió el listado, sea cual sea la página. */
function countListRequests() {
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

describe('carga inicial', () => {
  it('pide la primera página al montar y expone 20 items', async () => {
    const { result } = renderHook(() => usePokemonList(), { wrapper })

    expect(result.current.status).toBe('loading')

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.items).toHaveLength(20)
    expect(result.current.items[0].name).toBe('bulbasaur')
    expect(result.current.error).toBeNull()
  })

  it('no duplica la petición ni los items bajo StrictMode', async () => {
    const counter = countListRequests()
    const { result } = renderHook(() => usePokemonList(), { wrapper: strictWrapper })

    await waitFor(() => expect(result.current.status).toBe('ready'))

    expect(counter.value).toBe(1)
    expect(result.current.items).toHaveLength(20)
  })

  it('expone el error y libera el estado de carga cuando la primera página falla', async () => {
    server.use(
      http.get(`${API_BASE_URL}/pokemon`, () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 }),
      ),
    )
    const { result } = renderHook(() => usePokemonList(), { wrapper })

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.items).toEqual([])
    expect(result.current.error).toMatch(/no se pudo obtener/i)
  })
})

describe('cargar más', () => {
  it('concatena el siguiente lote en vez de reemplazarlo', async () => {
    const { result } = renderHook(() => usePokemonList(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('ready'))

    await act(async () => {
      await result.current.loadMore()
    })

    expect(result.current.items).toHaveLength(40)
    expect(result.current.items[0].name).toBe('bulbasaur')
    expect(result.current.items[20].name).toBe('spearow')
    expect(result.current.items.some((item) => item.name === 'pikachu')).toBe(true)
  })

  it('no pide nada cuando ya no hay siguiente página', async () => {
    const { result } = renderHook(() => usePokemonList(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('ready'))
    await act(async () => {
      await result.current.loadMore()
    })
    expect(result.current.hasMore).toBe(false)

    const counter = countListRequests()
    await act(async () => {
      await result.current.loadMore()
    })

    expect(counter.value).toBe(0)
    expect(result.current.items).toHaveLength(40)
  })

  it('ignora invocaciones concurrentes: una sola petición y sin items duplicados', async () => {
    const { result } = renderHook(() => usePokemonList(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('ready'))

    const counter = countListRequests()
    await act(async () => {
      await Promise.all([
        result.current.loadMore(),
        result.current.loadMore(),
        result.current.loadMore(),
      ])
    })

    expect(counter.value).toBe(1)
    expect(result.current.items).toHaveLength(40)
    const names = result.current.items.map((item) => item.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('deja la lista intacta, sin error ni carga colgada, ante un lote vacío', async () => {
    const { result } = renderHook(() => usePokemonList(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('ready'))

    server.use(
      http.get(`${API_BASE_URL}/pokemon`, () =>
        HttpResponse.json({ count: 40, next: null, previous: null, results: [] }),
      ),
    )
    await act(async () => {
      await result.current.loadMore()
    })

    expect(result.current.items).toHaveLength(20)
    expect(result.current.status).toBe('ready')
    expect(result.current.error).toBeNull()
  })

  it('limpia el error previo cuando un cargar más posterior tiene éxito', async () => {
    server.use(
      http.get(`${API_BASE_URL}/pokemon`, () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 }),
      ),
    )
    const { result } = renderHook(() => usePokemonList(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('error'))

    server.resetHandlers()
    await act(async () => {
      await result.current.loadMore()
    })

    expect(result.current.error).toBeNull()
    expect(result.current.status).toBe('ready')
    expect(result.current.items).toHaveLength(20)
  })

  it('expone el error sin perder lo ya acumulado cuando falla el siguiente lote', async () => {
    const { result } = renderHook(() => usePokemonList(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('ready'))

    server.use(
      http.get(`${API_BASE_URL}/pokemon`, () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 }),
      ),
    )
    await act(async () => {
      await result.current.loadMore()
    })

    expect(result.current.items).toHaveLength(20)
    expect(result.current.error).toMatch(/no se pudo obtener/i)
  })
})

describe('consumo del contexto', () => {
  it('falla con un mensaje claro si se usa el hook fuera del proveedor', () => {
    expect(() => renderHook(() => usePokemonList())).toThrow(/PokemonListProvider/)
  })
})
