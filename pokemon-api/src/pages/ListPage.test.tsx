import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { PokemonListProvider } from '../context/PokemonListProvider'
import { API_BASE_URL } from '../test/fixtures'
import { server } from '../test/server'
import { countListRequests } from '../test/helpers'
import { ListPage } from './ListPage'

/** Cuenta las peticiones al listado para probar que buscar no toca la red. */
async function renderListPage() {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <PokemonListProvider>
        <ListPage />
      </PokemonListProvider>
    </MemoryRouter>,
  )
  await waitFor(() => expect(screen.getByText('bulbasaur')).toBeInTheDocument())
  return { user }
}

const searchBox = () => screen.getByRole('searchbox')
const searchButton = () => screen.getByRole('button', { name: /buscar/i })
const loadMoreButton = () => screen.getByRole('button', { name: /cargar más/i })

describe('listado', () => {
  it('muestra los nombres de la primera página como enlaces activables', async () => {
    await renderListPage()

    expect(screen.getAllByRole('link')).toHaveLength(20)
    expect(screen.getByRole('link', { name: /charmander/i })).toHaveAttribute(
      'href',
      '/pokemon/charmander',
    )
  })

  it('muestra un indicador mientras llega la primera página', () => {
    render(
      <MemoryRouter>
        <PokemonListProvider>
          <ListPage />
        </PokemonListProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText(/cargando/i)).toBeInTheDocument()
  })

  it('muestra un mensaje de error si la carga inicial falla', async () => {
    server.use(
      http.get(`${API_BASE_URL}/pokemon`, () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 }),
      ),
    )
    render(
      <MemoryRouter>
        <PokemonListProvider>
          <ListPage />
        </PokemonListProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo obtener/i)
  })

  it('ofrece reintentar cuando la carga inicial falla, en vez de dejar al usuario sin salida', async () => {
    const user = userEvent.setup()
    server.use(
      http.get(`${API_BASE_URL}/pokemon`, () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 }),
      ),
    )
    render(
      <MemoryRouter>
        <PokemonListProvider>
          <ListPage />
        </PokemonListProvider>
      </MemoryRouter>,
    )
    await screen.findByRole('alert')

    // Cargar más no puede aparecer: el cursor solo se fija al tener éxito.
    expect(screen.queryByRole('button', { name: /cargar más/i })).not.toBeInTheDocument()
    server.resetHandlers()
    await user.click(screen.getByRole('button', { name: /reintentar/i }))

    expect(await screen.findByText('bulbasaur')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('no anuncia «no hay Pokémon» junto al error: el error ya lo explica', async () => {
    server.use(
      http.get(`${API_BASE_URL}/pokemon`, () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 }),
      ),
    )
    render(
      <MemoryRouter>
        <PokemonListProvider>
          <ListPage />
        </PokemonListProvider>
      </MemoryRouter>,
    )
    await screen.findByRole('alert')

    expect(screen.queryByText(/no hay pokémon que mostrar/i)).not.toBeInTheDocument()
  })

  it('no muestra ningún botón Regresar', async () => {
    await renderListPage()

    expect(screen.queryByRole('button', { name: /regresar/i })).not.toBeInTheDocument()
  })
})

describe('paginación acumulativa', () => {
  it('añade 20 nombres más al pulsar Cargar más', async () => {
    const { user } = await renderListPage()

    await user.click(loadMoreButton())

    await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(40))
    expect(screen.getByText('pikachu')).toBeInTheDocument()
  })

  it('oculta Cargar más cuando ya no hay siguiente página', async () => {
    const { user } = await renderListPage()

    await user.click(loadMoreButton())
    await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(40))

    expect(screen.queryByRole('button', { name: /cargar más/i })).not.toBeInTheDocument()
  })
})

describe('búsqueda', () => {
  it('filtra por subcadena al pulsar Buscar', async () => {
    const { user } = await renderListPage()

    await user.type(searchBox(), 'char')
    await user.click(searchButton())

    expect(screen.getByText('charmander')).toBeInTheDocument()
    expect(screen.getByText('charmeleon')).toBeInTheDocument()
    expect(screen.getByText('charizard')).toBeInTheDocument()
    expect(screen.queryByText('bulbasaur')).not.toBeInTheDocument()
  })

  it('encuentra también la coincidencia exacta del nombre completo', async () => {
    const { user } = await renderListPage()

    await user.type(searchBox(), 'bulbasaur')
    await user.click(searchButton())

    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByText('bulbasaur')).toBeInTheDocument()
  })

  it('es insensible a mayúsculas', async () => {
    const { user } = await renderListPage()

    await user.type(searchBox(), 'CHAR')
    await user.click(searchButton())

    expect(screen.getByText('charmander')).toBeInTheDocument()
  })

  it('no filtra mientras el usuario escribe, solo al pulsar Buscar', async () => {
    const { user } = await renderListPage()

    await user.type(searchBox(), 'char')

    expect(screen.getByText('bulbasaur')).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(20)
  })

  it('alcanza los nombres traídos por Cargar más', async () => {
    const { user } = await renderListPage()
    await user.click(loadMoreButton())
    await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(40))

    await user.type(searchBox(), 'pika')
    await user.click(searchButton())

    expect(screen.getByText('pikachu')).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  it('restaura la lista acumulada al limpiar el campo, sin pulsar el botón', async () => {
    const { user } = await renderListPage()
    await user.type(searchBox(), 'char')
    await user.click(searchButton())
    expect(screen.getAllByRole('link')).toHaveLength(3)

    await user.clear(searchBox())

    expect(screen.getAllByRole('link')).toHaveLength(20)
    expect(screen.getByText('bulbasaur')).toBeInTheDocument()
  })

  it('avisa explícitamente cuando la búsqueda no encuentra nada', async () => {
    const { user } = await renderListPage()

    await user.type(searchBox(), 'zzzz')
    await user.click(searchButton())

    expect(screen.getByText(/ningún pokémon coincide con «zzzz»/i)).toBeInTheDocument()
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })

  it('nombra en el aviso el filtro aplicado, no lo que el usuario sigue tecleando', async () => {
    const { user } = await renderListPage()
    await user.type(searchBox(), 'zzzz')
    await user.click(searchButton())

    // Seguir escribiendo sin pulsar Buscar no cambia el filtro en vigor.
    await user.type(searchBox(), 'yyy')

    expect(screen.getByText(/ningún pokémon coincide con «zzzz»/i)).toBeInTheDocument()
    expect(screen.queryByText(/zzzzyyy/)).not.toBeInTheDocument()
  })

  it('no realiza ninguna petición a la API durante todo el ciclo de búsqueda', async () => {
    const { user } = await renderListPage()
    const counter = countListRequests()

    await user.type(searchBox(), 'char')
    await user.click(searchButton())
    await user.clear(searchBox())
    await user.type(searchBox(), 'saur')
    await user.click(searchButton())

    expect(counter.value).toBe(0)
  })

  it('oculta Cargar más mientras hay un filtro aplicado', async () => {
    const { user } = await renderListPage()

    await user.type(searchBox(), 'char')
    await user.click(searchButton())

    expect(screen.queryByRole('button', { name: /cargar más/i })).not.toBeInTheDocument()
  })
})
