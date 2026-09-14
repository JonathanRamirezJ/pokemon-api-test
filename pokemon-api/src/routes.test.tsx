import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AppRoutes } from './routes'
import { API_BASE_URL } from './test/fixtures'
import { server } from './test/server'
import { countListRequests } from './test/helpers'

function renderAt(path: string) {
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
  return { user }
}

/** Cuenta las peticiones al listado a partir de este momento. */
const searchBox = () => screen.getByRole('searchbox')

describe('rutas', () => {
  it('monta el listado en la raíz', async () => {
    renderAt('/')

    expect(await screen.findByText('bulbasaur')).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('monta el detalle en /pokemon/:name, como al recargar o entrar por enlace directo', async () => {
    renderAt('/pokemon/charmander')

    expect(await screen.findByRole('heading', { name: /charmander/i })).toBeInTheDocument()
  })

  it('devuelve al listado ante una ruta desconocida', async () => {
    renderAt('/no-existe')

    expect(await screen.findByText('bulbasaur')).toBeInTheDocument()
  })

  it('oculta el listado mientras se ve el detalle', async () => {
    renderAt('/pokemon/charmander')
    await screen.findByRole('heading', { name: /charmander/i })

    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.queryByText('bulbasaur')).not.toBeInTheDocument()
  })

  it('no muestra el botón Regresar en el listado', async () => {
    renderAt('/')
    await screen.findByText('bulbasaur')

    expect(screen.queryByRole('button', { name: /regresar/i })).not.toBeInTheDocument()
  })
})

describe('ida y vuelta entre listado y detalle', () => {
  it('conserva lo acumulado, limpia la búsqueda y no vuelve a pedir el listado', async () => {
    const { user } = renderAt('/')
    await screen.findByText('bulbasaur')

    // Acumular una segunda página y filtrar sobre el total.
    await user.click(screen.getByRole('button', { name: /cargar más/i }))
    await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(40))
    await user.type(searchBox(), 'char')
    await user.click(screen.getByRole('button', { name: /^buscar$/i }))
    expect(screen.getAllByRole('link')).toHaveLength(3)

    const counter = countListRequests()

    // Ir al detalle y volver.
    await user.click(screen.getByRole('link', { name: /charmander/i }))
    await screen.findByRole('heading', { name: /charmander/i })
    await user.click(screen.getByRole('button', { name: /regresar/i }))
    await screen.findByText('bulbasaur')

    // Lo acumulado sigue ahí, el filtro no.
    expect(screen.getAllByRole('link')).toHaveLength(40)
    expect(searchBox()).toHaveValue('')
    expect(screen.getByRole('button', { name: /^buscar$/i })).toBeDisabled()
    // Y no se volvió a pedir el listado en todo el viaje.
    expect(counter.value).toBe(0)
  })

  it('no arrastra al listado el banner de error de un intento anterior', async () => {
    const { user } = renderAt('/')
    await screen.findByText('bulbasaur')

    // Un Cargar más que falla deja el error en el contexto, que sobrevive
    // a la navegación porque el proveedor vive en el layout.
    server.use(
      http.get(`${API_BASE_URL}/pokemon`, () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 }),
      ),
    )
    await user.click(screen.getByRole('button', { name: /cargar más/i }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    server.resetHandlers()

    await user.click(screen.getByRole('link', { name: /charmander/i }))
    await screen.findByRole('heading', { name: /charmander/i })
    await user.click(screen.getByRole('button', { name: /regresar/i }))
    await screen.findByText('bulbasaur')

    // Los 20 items siguen ahí y nada está en vuelo: el error ya no aplica.
    expect(screen.getAllByRole('link')).toHaveLength(20)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('retira el botón Regresar al volver al listado', async () => {
    const { user } = renderAt('/')
    await screen.findByText('bulbasaur')

    await user.click(screen.getByRole('link', { name: /charmander/i }))
    await screen.findByRole('heading', { name: /charmander/i })
    expect(screen.getByRole('button', { name: /regresar/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /regresar/i }))
    await screen.findByText('bulbasaur')

    expect(screen.queryByRole('button', { name: /regresar/i })).not.toBeInTheDocument()
  })

  it('el detalle consulta la url que el listado entregó al hacer clic en un item', async () => {
    let requestedUrl = ''
    server.use(
      http.get(`${API_BASE_URL}/pokemon/:identifier`, ({ request }) => {
        requestedUrl = request.url
        return HttpResponse.json({
          name: 'charmander',
          height: 6,
          weight: 85,
          sprites: { front_default: null },
          abilities: [],
        })
      }),
    )
    const { user } = renderAt('/')
    await screen.findByText('bulbasaur')

    await user.click(screen.getByRole('link', { name: /charmander/i }))
    await screen.findByRole('heading', { name: /charmander/i })

    expect(requestedUrl).toContain('/pokemon/4/')
  })
})
