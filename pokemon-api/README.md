# pokemon-api

Listado, búsqueda y detalle de Pokémon consumiendo [PokéAPI](https://pokeapi.co/).

## Requisitos

- Node.js >= 22.22

## Instalación

```bash
npm install
```

## Scripts

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm run preview` | Sirve la compilación de producción |
| `npm run lint` | Linter (oxlint) |
| `npm run typecheck` | Verificación de tipos sin empaquetar |
| `npm test` | Pruebas unitarias (Vitest) |
| `npm run test:watch` | Pruebas en modo observación |
| `npm run test:coverage` | Pruebas con cobertura (umbral del 80%) |

## Decisiones técnicas

- **Paginación acumulativa.** «Cargar más» concatena lotes de 20 en lugar de
  reemplazarlos, que es lo que hace posible que la búsqueda filtre todo lo ya
  descargado sin volver a llamar a la API.
- **Dónde vive cada estado.** La lista acumulada está en un contexto montado en
  el layout, que nunca se desmonta; el texto de búsqueda está en la vista de
  listado, que sí se desmonta al ir al detalle. Por eso al regresar se conserva
  lo acumulado y el filtro aparece limpio, sin código de restauración.
- **Las pruebas usan MSW**, interceptando a nivel de red en vez de mockear
  axios, para que la capa de API se ejercite de verdad contra respuestas
  controladas.
