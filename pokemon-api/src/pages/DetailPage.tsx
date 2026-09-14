import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { PokemonApiError, getPokemonDetail } from '../api/pokemon'
import type { PokemonDetail } from '../types/pokemon'

type Status = 'loading' | 'ready' | 'error'

interface DetailResult {
  /** Identifica la petición que produjo este resultado. */
  key: string
  status: Exclude<Status, 'loading'>
  detail: PokemonDetail | null
  error: string | null
}

/**
 * La API entrega decímetros y hectogramos; el usuario espera metros y kilos.
 * Una respuesta malformada no debe acabar mostrando «NaN» en pantalla.
 */
function formatDecimal(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return (value / 10).toFixed(1).replace('.', ',')
}

function messageOf(error: unknown, name: string): string {
  if (error instanceof PokemonApiError) return error.message
  return `No se pudo obtener el detalle de ${name}.`
}

export function DetailPage() {
  const { name = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  // La url del recurso viaja desde el listado; en una navegación directa o
  // tras una recarga no existe y se reconstruye a partir del nombre.
  const resourceUrl = (location.state as { url?: string } | null)?.url ?? null

  // El resultado se guarda junto a la clave de la petición que lo produjo.
  // Así el estado de carga se deriva durante el render comparando claves, en
  // vez de escribirse sincrónicamente dentro del efecto.
  const requestKey = `${name}|${resourceUrl ?? ''}`
  const [result, setResult] = useState<DetailResult | null>(null)

  useEffect(() => {
    let cancelled = false

    getPokemonDetail({ name, url: resourceUrl })
      .then((detail) => {
        if (!cancelled) setResult({ key: requestKey, status: 'ready', detail, error: null })
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setResult({
            key: requestKey,
            status: 'error',
            detail: null,
            error: messageOf(caught, name),
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [name, resourceUrl, requestKey])

  const current = result?.key === requestKey ? result : null
  const status: Status = current?.status ?? 'loading'
  const detail = current?.detail ?? null
  const error = current?.error ?? null

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={() => void navigate('/')}
        className="self-start rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-100"
      >
        ← Regresar
      </button>

      {status === 'loading' && <p className="text-slate-500">Cargando detalle…</p>}

      {status === 'error' && error !== null && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-red-700">
          {error}
        </p>
      )}

      {status === 'ready' && detail !== null && (
        <article className="flex flex-col gap-6 rounded-lg border border-slate-200 bg-white p-6 sm:flex-row">
          <div className="flex w-40 shrink-0 items-center justify-center rounded-md bg-slate-100">
            {detail.spriteUrl !== null ? (
              <img src={detail.spriteUrl} alt={detail.name} width={160} height={160} />
            ) : (
              <span className="px-3 py-10 text-center text-sm text-slate-500">
                Sin imagen disponible
              </span>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <h1 className="text-3xl font-semibold capitalize text-slate-900">
              {detail.name}
            </h1>

            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-slate-500">Altura</dt>
                <dd className="text-lg text-slate-900">{formatDecimal(detail.height)}{Number.isFinite(detail.height) ? ' m' : ''}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">Peso</dt>
                <dd className="text-lg text-slate-900">{formatDecimal(detail.weight)}{Number.isFinite(detail.weight) ? ' kg' : ''}</dd>
              </div>
            </dl>

            <section>
              <h2 className="text-sm text-slate-500">Habilidades</h2>
              {detail.abilities.length === 0 ? (
                <p className="text-slate-500">Sin habilidades registradas.</p>
              ) : (
                <ul className="mt-1 flex flex-wrap gap-2">
                  {detail.abilities.map((ability) => (
                    <li
                      key={ability}
                      className="rounded-full bg-slate-100 px-3 py-1 text-slate-800"
                    >
                      {ability}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </article>
      )}
    </div>
  )
}
