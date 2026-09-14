import { useState } from 'react'
import { PokemonList } from '../components/PokemonList'
import { SearchBar } from '../components/SearchBar'
import { usePokemonList } from '../context/usePokemonList'

export function ListPage() {
  const { items, status, error, hasMore, loadMore } = usePokemonList()

  // El texto que el usuario escribe y el filtro efectivamente aplicado son
  // dos cosas distintas: solo el botón Buscar copia el primero al segundo.
  // Ambos viven aquí, no en el contexto, para que se limpien al desmontarse
  // esta vista al navegar al detalle.
  const [term, setTerm] = useState('')
  const [appliedFilter, setAppliedFilter] = useState('')

  const isFiltering = appliedFilter !== ''
  const visibleItems = isFiltering
    ? items.filter((item) => item.name.toLowerCase().includes(appliedFilter))
    : items

  function handleChange(value: string) {
    setTerm(value)
    // Excepción explícita del ticket: limpiar el campo restaura la lista
    // original sin necesidad de volver a pulsar Buscar.
    if (value.trim() === '') setAppliedFilter('')
  }

  const isLoadingFirstPage = status === 'loading' && items.length === 0

  return (
    <div className="flex flex-col gap-6">
      <SearchBar
        value={term}
        onChange={handleChange}
        onSearch={() => setAppliedFilter(term.trim().toLowerCase())}
      />

      {error !== null && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-red-700">
          {error}
        </p>
      )}

      {isLoadingFirstPage && <p className="text-slate-500">Cargando Pokémon…</p>}

      {!isLoadingFirstPage &&
        (isFiltering && visibleItems.length === 0 ? (
          <p className="text-slate-500">
            Ningún Pokémon coincide con «{term.trim()}».
          </p>
        ) : (
          <PokemonList items={visibleItems} />
        ))}

      {/* Cargar más se oculta con un filtro aplicado: traer nuevos lotes
          mientras se filtra confunde más de lo que ayuda. */}
      {!isFiltering && hasMore && !isLoadingFirstPage && (
        <button
          type="button"
          onClick={() => void loadMore()}
          disabled={status === 'loading'}
          className="self-center rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-700 transition enabled:hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'loading' ? 'Cargando…' : 'Cargar más'}
        </button>
      )}
    </div>
  )
}
