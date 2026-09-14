interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSearch: () => void
}

export function SearchBar({ value, onChange, onSearch }: SearchBarProps) {
  const canSearch = value.trim() !== ''

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-end"
      onSubmit={(event) => {
        event.preventDefault()
        if (canSearch) onSearch()
      }}
    >
      <div className="flex flex-1 flex-col gap-1">
        <label className="text-sm font-medium text-slate-700" htmlFor="pokemon-search">
          Buscar Pokémon
        </label>
        <input
          id="pokemon-search"
          type="search"
          value={value}
          placeholder="Por ejemplo: char"
          onChange={(event) => onChange(event.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />
      </div>
      <button
        type="submit"
        disabled={!canSearch}
        className="rounded-md bg-slate-900 px-4 py-2 font-medium text-white transition enabled:hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        Buscar
      </button>
    </form>
  )
}
