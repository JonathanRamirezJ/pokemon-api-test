import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SearchBar } from './SearchBar'

function setup(value = '') {
  const onChange = vi.fn()
  const onSearch = vi.fn()
  const utils = render(<SearchBar value={value} onChange={onChange} onSearch={onSearch} />)
  return { onChange, onSearch, ...utils }
}

describe('SearchBar', () => {
  it('deshabilita el botón Buscar cuando el campo está vacío', () => {
    setup('')

    expect(screen.getByRole('button', { name: /buscar/i })).toBeDisabled()
  })

  it('habilita el botón Buscar cuando hay texto', () => {
    setup('char')

    expect(screen.getByRole('button', { name: /buscar/i })).toBeEnabled()
  })

  it('mantiene el botón deshabilitado cuando solo se escriben espacios', () => {
    setup('   ')

    expect(screen.getByRole('button', { name: /buscar/i })).toBeDisabled()
  })

  it('notifica cada pulsación del usuario', async () => {
    const user = userEvent.setup()
    const { onChange } = setup('')

    await user.type(screen.getByRole('searchbox'), 'c')

    expect(onChange).toHaveBeenCalledWith('c')
  })

  it('notifica la solicitud de búsqueda al pulsar el botón', async () => {
    const user = userEvent.setup()
    const { onSearch } = setup('char')

    await user.click(screen.getByRole('button', { name: /buscar/i }))

    expect(onSearch).toHaveBeenCalledTimes(1)
  })

  it('notifica la solicitud de búsqueda al enviar el formulario con Enter', async () => {
    const user = userEvent.setup()
    const { onSearch } = setup('char')

    await user.type(screen.getByRole('searchbox'), '{Enter}')

    expect(onSearch).toHaveBeenCalledTimes(1)
  })

  it('no dispara la búsqueda con Enter si el campo está vacío', async () => {
    const user = userEvent.setup()
    const { onSearch } = setup('')

    await user.type(screen.getByRole('searchbox'), '{Enter}')

    expect(onSearch).not.toHaveBeenCalled()
  })
})
