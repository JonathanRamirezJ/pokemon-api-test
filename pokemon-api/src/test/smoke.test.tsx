import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { API_BASE_URL } from './fixtures'

describe('infraestructura de pruebas', () => {
  it('renderiza en jsdom y aplica los matchers de jest-dom', () => {
    render(<p>pokédex</p>)
    expect(screen.getByText('pokédex')).toBeInTheDocument()
  })

  it('intercepta el listado con el manejador por defecto de MSW', async () => {
    const response = await fetch(`${API_BASE_URL}/pokemon?limit=20&offset=0`)
    const body = await response.json()

    expect(response.ok).toBe(true)
    expect(body.results).toHaveLength(20)
    expect(body.results[0]).toEqual({
      name: 'bulbasaur',
      url: `${API_BASE_URL}/pokemon/1/`,
    })
  })

  it('falla ante una petición sin manejador registrado, en vez de salir a la red real', async () => {
    await expect(fetch('https://example.invalid/nada')).rejects.toThrow()
  })
})
