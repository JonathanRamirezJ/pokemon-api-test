import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { PokemonList } from './PokemonList'

const items = [
  { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
  { name: 'charmander', url: 'https://pokeapi.co/api/v2/pokemon/4/' },
]

function renderList(props: Partial<Parameters<typeof PokemonList>[0]> = {}) {
  return render(
    <MemoryRouter>
      <PokemonList items={items} {...props} />
    </MemoryRouter>,
  )
}

describe('PokemonList', () => {
  it('muestra el nombre de cada Pokémon', () => {
    renderList()

    expect(screen.getByText('bulbasaur')).toBeInTheDocument()
    expect(screen.getByText('charmander')).toBeInTheDocument()
  })

  it('convierte cada item en un enlace a su detalle', () => {
    renderList()

    expect(screen.getByRole('link', { name: /charmander/i })).toHaveAttribute(
      'href',
      '/pokemon/charmander',
    )
  })

  it('muestra un mensaje explícito cuando no hay ningún item', () => {
    renderList({ items: [] })

    expect(screen.getByText(/no hay pokémon que mostrar/i)).toBeInTheDocument()
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })
})
