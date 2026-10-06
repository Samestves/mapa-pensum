/**
 * Que archivos del build hacen falta para cada cosa.
 *
 * El JavaScript sale repartido en trozos (ver TROZOS en vite.config.js y
 * src/components/carreraPorTrozos.js) y sus nombres llevan un hash distinto
 * en cada build. Quien necesita saber "que hay que bajar para pintar la
 * lista" -la pagina de cada carrera, para pedirlo desde el HTML; el
 * presupuesto de peso, para medirlo- lo pregunta aqui, y aqui se lee del
 * manifiesto que deja Vite en dist/.vite/manifest.json.
 *
 * Solo sirve despues de `vite build`.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = join(dirname(fileURLToPath(import.meta.url)), '../dist')
const manifiesto = JSON.parse(readFileSync(join(DIST, '.vite/manifest.json'), 'utf8'))

/* Los modulos por los que se entra a cada trozo, como los llama el manifiesto */
export const ENTRADA = 'index.html'
export const CASCARON = 'src/components/VistaCarrera.jsx'
export const VISTAS = {
  mapa: 'src/components/GrafoPensum.jsx',
  lista: 'src/components/VistaLista.jsx',
  horario: 'src/components/Horario.jsx',
}
export const PLAN = 'src/components/PlanRuta.jsx'
export const PALETA = 'src/components/PaletaComandos.jsx'
export const HOJA_DEL_LECTOR = 'src/components/ImportarHorario.jsx'
export const LECTOR = 'src/data/lectorLocal.js'
export const pensumDe = (slug) => `src/data/carreras/${slug}.json`

/* Todo lo que alcanza un modulo por imports estaticos, el incluido */
function alcanzados(modulo, vistos = new Set()) {
  if (vistos.has(modulo)) return vistos
  if (!manifiesto[modulo]) throw new Error(`El build no tiene ningun trozo para ${modulo}`)
  vistos.add(modulo)
  for (const importado of manifiesto[modulo].imports ?? []) alcanzados(importado, vistos)
  return vistos
}

/**
 * Los archivos que hay que bajar para ejecutar `modulo`: el suyo y los que
 * importa, en cadena. Rutas dentro de dist/.
 *
 * `yaBajados` es lo que devolvio otra llamada: lo que ya esta en el navegador
 * cuando se pide este y no hay que volver a contar. La lista, por ejemplo, se
 * pide con la entrada y el cascaron ya bajados.
 *
 * @returns {{js: string[], css: string[]}}
 */
export function archivosDe(modulo, yaBajados = { js: [], css: [] }) {
  const trozos = [...alcanzados(modulo)].map((m) => manifiesto[m])
  const nuevos = (archivos, ya) => [...new Set(archivos)].filter((a) => !ya.includes(a))
  return {
    js: nuevos(
      trozos.map((t) => t.file),
      yaBajados.js,
    ),
    css: nuevos(
      trozos.flatMap((t) => t.css ?? []),
      yaBajados.css,
    ),
  }
}

/** Dos listas de archivos en una: lo ya bajado tras pedir las dos. */
export const juntar = (a, b) => ({ js: [...a.js, ...b.js], css: [...a.css, ...b.css] })
