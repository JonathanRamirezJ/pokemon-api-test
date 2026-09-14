import { Link } from 'react-router'
import type { PokemonListItem } from '../types/pokemon'

interface PokemonListProps {
  items: PokemonListItem[]
}

export function PokemonList({ items }: PokemonListProps) {
  if (items.length === 0) {
    return <p className="text-slate-500">No hay Pokémon que mostrar.</p>
  }

  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <li key={item.name}>
          <Link
            // La url del recurso viaja en el estado de navegación para que el
            // detalle consulte el endpoint que la propia API entregó.
            to={`/pokemon/${item.name}`}
            state={{ url: item.url }}
            className="block rounded-md border border-slate-200 bg-white px-3 py-2 capitalize text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
          >
            {item.name}
          </Link>
        </li>
      ))}
    </ul>
  )
}
