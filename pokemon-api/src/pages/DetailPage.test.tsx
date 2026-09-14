import { render, screen } from '@testing-library/react'
import { HttpResponse, delay, http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { API_BASE_URL, makeDetailResponse } from '../test/fixtures'
import { server } from '../test/server'
import { DetailPage } from './DetailPage'

function renderDetail(
  { name = 'charmander', url }: { name?: string; url?: string } = {},
) {
  const entry = url
    ? { pathname: `/pokemon/${name}`, state: { url } }
    : { pathname: `/pokemon/${name}` }

  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/" element={<p>listado simulado</p>} />
        <Route path="/pokemon/:name" element={<DetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('detalle', () => {
  it('muestra los cinco campos exigidos del Pokémon seleccionado', async () => {
    renderDetail({ url: `${API_BASE_URL}/pokemon/4/` })

    expect(await screen.findByRole('heading', { name: /charmander/i })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /charmander/i })).toHaveAttribute(
      'src',
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/pokemon/4.png',
    )
    expect(screen.getByText(/altura/i).parentElement).toHaveTextContent('0,6 m')
    expect(screen.getByText(/peso/i).parentElement).toHaveTextContent('8,5 kg')
    expect(screen.getByText('blaze')).toBeInTheDocument()
    expect(screen.getByText('solar-power')).toBeInTheDocument()
  })

  it('consulta la url que entregó el listado cuando viaja en el estado de navegación', async () => {
    let requestedUrl = ''
    server.use(
      http.get(`${API_BASE_URL}/pokemon/:identifier`, ({ request }) => {
        requestedUrl = request.url
        return HttpResponse.json(makeDetailResponse('charmander'))
      }),
    )

    renderDetail({ url: `${API_BASE_URL}/pokemon/4/` })
    await screen.findByRole('heading', { name: /charmander/i })

    expect(requestedUrl).toContain('/pokemon/4/')
  })

  it('reconstruye la petición desde el nombre en una navegación directa o recarga', async () => {
    let requestedUrl = ''
    server.use(
      http.get(`${API_BASE_URL}/pokemon/:identifier`, ({ request }) => {
        requestedUrl = request.url
        return HttpResponse.json(makeDetailResponse('charmander'))
      }),
    )

    renderDetail()
    await screen.findByRole('heading', { name: /charmander/i })

    expect(requestedUrl).toContain('/pokemon/charmander')
  })

  it('muestra un indicador mientras llega el detalle, sin campos aún', async () => {
    server.use(
      http.get(`${API_BASE_URL}/pokemon/:identifier`, async () => {
        await delay(50)
        return HttpResponse.json(makeDetailResponse('charmander'))
      }),
    )

    renderDetail()

    expect(screen.getByText(/cargando/i)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /charmander/i })).not.toBeInTheDocument()
    await screen.findByRole('heading', { name: /charmander/i })
  })

  it('ofrece un botón Regresar', async () => {
    renderDetail()
    await screen.findByRole('heading', { name: /charmander/i })

    expect(screen.getByRole('button', { name: /regresar/i })).toBeInTheDocument()
  })

  it('vuelve al listado al pulsar Regresar', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderDetail()
    await screen.findByRole('heading', { name: /charmander/i })

    await user.click(screen.getByRole('button', { name: /regresar/i }))

    expect(screen.getByText('listado simulado')).toBeInTheDocument()
  })
})

describe('casos límite del detalle', () => {
  it('muestra un marcador de posición cuando el sprite viene en null', async () => {
    server.use(
      http.get(`${API_BASE_URL}/pokemon/:identifier`, () =>
        HttpResponse.json(
          makeDetailResponse('charmander', { sprites: { front_default: null } }),
        ),
      ),
    )

    renderDetail()
    await screen.findByRole('heading', { name: /charmander/i })

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText(/sin imagen disponible/i)).toBeInTheDocument()
  })

  it('no muestra «NaN» cuando una respuesta malformada omite altura y peso', async () => {
    server.use(
      http.get(`${API_BASE_URL}/pokemon/:identifier`, () =>
        HttpResponse.json({
          name: 'charmander',
          sprites: { front_default: null },
          abilities: [],
        }),
      ),
    )

    renderDetail()
    await screen.findByRole('heading', { name: /charmander/i })

    expect(screen.queryByText(/nan/i)).not.toBeInTheDocument()
    expect(screen.getByText(/altura/i).parentElement).toHaveTextContent('—')
    expect(screen.getByText(/peso/i).parentElement).toHaveTextContent('—')
  })

  it('avisa explícitamente cuando el Pokémon no tiene habilidades', async () => {
    server.use(
      http.get(`${API_BASE_URL}/pokemon/:identifier`, () =>
        HttpResponse.json(makeDetailResponse('charmander', { abilities: [] })),
      ),
    )

    renderDetail()
    await screen.findByRole('heading', { name: /charmander/i })

    expect(screen.getByText(/sin habilidades registradas/i)).toBeInTheDocument()
  })
})

describe('errores del detalle', () => {
  it('muestra un mensaje cuando el Pokémon no existe, sin dejar al usuario atrapado', async () => {
    renderDetail({ name: 'no-existe' })

    expect(await screen.findByRole('alert')).toHaveTextContent(/no existe/i)
    expect(screen.getByRole('button', { name: /regresar/i })).toBeInTheDocument()
  })

  it('muestra un mensaje de error ante un 500 en vez de una vista en blanco', async () => {
    server.use(
      http.get(`${API_BASE_URL}/pokemon/:identifier`, () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 }),
      ),
    )

    renderDetail()

    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo obtener el detalle/i)
  })
})
