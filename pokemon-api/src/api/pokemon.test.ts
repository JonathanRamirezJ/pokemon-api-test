import { AxiosError } from 'axios'
import { HttpResponse, http } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { API_BASE_URL, makeDetailResponse } from '../test/fixtures'
import { server } from '../test/server'
import { PokemonApiError, getPokemonDetail, getPokemonPage } from './pokemon'
import { pokeApiClient } from './client'

describe('getPokemonPage', () => {
  it('devuelve la primera página con nombre y url de cada Pokémon, más el cursor siguiente', async () => {
    const page = await getPokemonPage()

    expect(page.items).toHaveLength(20)
    expect(page.items[0]).toEqual({ name: 'bulbasaur', url: `${API_BASE_URL}/pokemon/1/` })
    expect(page.items[3].name).toBe('charmander')
    expect(page.next).toBe(`${API_BASE_URL}/pokemon?offset=20&limit=20`)
    expect(page.total).toBe(40)
  })

  it('acepta una URL absoluta de next sin duplicar el prefijo de baseURL', async () => {
    const first = await getPokemonPage()
    const second = await getPokemonPage({ url: first.next })

    expect(second.items).toHaveLength(20)
    expect(second.items[0].name).toBe('spearow')
    expect(second.items.some((item) => item.name === 'pikachu')).toBe(true)
  })

  it('devuelve next en null en la última página', async () => {
    const lastPage = await getPokemonPage({ limit: 20, offset: 20 })

    expect(lastPage.next).toBeNull()
  })

  it('traduce un 500 del listado a un error propio con mensaje legible', async () => {
    server.use(
      http.get(`${API_BASE_URL}/pokemon`, () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 }),
      ),
    )

    await expect(getPokemonPage()).rejects.toBeInstanceOf(PokemonApiError)
    await expect(getPokemonPage()).rejects.toThrow(/no se pudo obtener/i)
  })
})

describe('getPokemonDetail', () => {
  it('normaliza el detalle de charmander con sus habilidades aplanadas', async () => {
    const detail = await getPokemonDetail({ name: 'charmander' })

    expect(detail).toEqual({
      name: 'charmander',
      height: 6,
      weight: 85,
      spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/pokemon/4.png',
      abilities: ['blaze', 'solar-power'],
    })
  })

  it('consulta la url del recurso cuando el listado la proporciona', async () => {
    let requestedUrl = ''
    server.use(
      http.get(`${API_BASE_URL}/pokemon/:identifier`, ({ request }) => {
        requestedUrl = request.url
        return HttpResponse.json(makeDetailResponse('charmander'))
      }),
    )

    await getPokemonDetail({ name: 'charmander', url: `${API_BASE_URL}/pokemon/4/` })

    expect(requestedUrl).toContain('/pokemon/4/')
  })

  it('propaga el sprite en null sin lanzar error', async () => {
    server.use(
      http.get(`${API_BASE_URL}/pokemon/:identifier`, () =>
        HttpResponse.json(
          makeDetailResponse('charmander', { sprites: { front_default: null } }),
        ),
      ),
    )

    const detail = await getPokemonDetail({ name: 'charmander' })

    expect(detail.spriteUrl).toBeNull()
  })

  it('devuelve una lista vacía de habilidades, nunca undefined, cuando la API no trae ninguna', async () => {
    server.use(
      http.get(`${API_BASE_URL}/pokemon/:identifier`, () =>
        HttpResponse.json(makeDetailResponse('charmander', { abilities: [] })),
      ),
    )

    const detail = await getPokemonDetail({ name: 'charmander' })

    expect(detail.abilities).toEqual([])
  })

  it('traduce un 404 a un error propio con mensaje legible en vez de un error crudo de axios', async () => {
    const promise = getPokemonDetail({ name: 'no-existe' })

    await expect(promise).rejects.toBeInstanceOf(PokemonApiError)
    await expect(getPokemonDetail({ name: 'no-existe' })).rejects.toThrow(/no existe|no se encontró/i)
  })

  it('traduce un 500 a un error propio', async () => {
    server.use(
      http.get(`${API_BASE_URL}/pokemon/:identifier`, () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 }),
      ),
    )

    await expect(getPokemonDetail({ name: 'charmander' })).rejects.toBeInstanceOf(PokemonApiError)
  })
})

describe('respuestas malformadas', () => {
  it('devuelve una página vacía cuando el listado no trae results', async () => {
    server.use(
      http.get(`${API_BASE_URL}/pokemon`, () => HttpResponse.json({ count: 0 })),
    )

    const page = await getPokemonPage()

    expect(page.items).toEqual([])
    expect(page.next).toBeNull()
    expect(page.total).toBe(0)
  })

  it('devuelve el sprite en null cuando el detalle no trae el objeto sprites', async () => {
    server.use(
      http.get(`${API_BASE_URL}/pokemon/:identifier`, () =>
        HttpResponse.json({ name: 'charmander', height: 6, weight: 85 }),
      ),
    )

    const detail = await getPokemonDetail({ name: 'charmander' })

    expect(detail.spriteUrl).toBeNull()
    expect(detail.abilities).toEqual([])
  })

  it('no vuelve a envolver un PokemonApiError que ya venía traducido', async () => {
    const original = new PokemonApiError('ya traducido', 418)
    const spy = vi.spyOn(pokeApiClient, 'get').mockRejectedValue(original)

    await expect(getPokemonPage()).rejects.toBe(original)
    spy.mockRestore()
  })
})

describe('fallos de red', () => {
  it('traduce un fallo de red a un error propio', async () => {
    server.use(http.get(`${API_BASE_URL}/pokemon`, () => HttpResponse.error()))

    await expect(getPokemonPage()).rejects.toBeInstanceOf(PokemonApiError)
    await expect(getPokemonPage()).rejects.toThrow(/no se pudo obtener/i)
  })

  // El timeout no puede ejercitarse a través de MSW: en jsdom axios usa el
  // adaptador xhr y el interceptor de XHR de MSW no implementa la propiedad
  // timeout de XMLHttpRequest, así que la petición siempre resuelve. Lo que sí
  // está bajo nuestro control —y es lo que el requisito pide— es que un rechazo
  // por timeout salga traducido y no como error crudo de axios.
  it('traduce un timeout de axios a un error propio, sin filtrar el error crudo', async () => {
    const timeoutError = new AxiosError(
      'timeout of 10000ms exceeded',
      AxiosError.ECONNABORTED,
    )
    const spy = vi.spyOn(pokeApiClient, 'get').mockRejectedValue(timeoutError)

    const rejection = getPokemonPage()

    await expect(rejection).rejects.toBeInstanceOf(PokemonApiError)
    await expect(getPokemonPage()).rejects.toThrow(/no se pudo obtener/i)
    spy.mockRestore()
  })

  it('preserva el código de estado HTTP en el error propio', async () => {
    server.use(
      http.get(`${API_BASE_URL}/pokemon`, () =>
        HttpResponse.json({ error: 'boom' }, { status: 503 }),
      ),
    )

    await expect(getPokemonPage()).rejects.toMatchObject({ status: 503 })
  })
})
