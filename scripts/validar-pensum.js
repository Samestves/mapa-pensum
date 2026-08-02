/**
 * Validacion del pensum. Se corre con: npm run validar
 * Sale con codigo 1 si hay al menos un error, para poder encadenarlo en CI.
 *
 * Comprueba:
 *  1. Campos obligatorios y tipos por asignatura
 *  2. Codigos duplicados
 *  3. Todo prerrequisito existe como asignatura
 *  4. Ningun prerrequisito esta en semestre igual o posterior
 *  5. No hay ciclos en el grafo de prerrequisitos
 *  6. Coherencia con meta (totales de asignaturas, semestres, UC, areas)
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
// Acepta una ruta alterna como argumento; sirve para probar el validador con casos rotos
const ruta = process.argv[2] ?? join(raiz, 'src/data/pensum.json')
const pensum = JSON.parse(readFileSync(ruta, 'utf8'))

const errores = []
const avisos = []
const err = (msg) => errores.push(msg)
const avisar = (msg) => avisos.push(msg)

const { meta, asignaturas } = pensum

if (!Array.isArray(asignaturas) || asignaturas.length === 0) {
  console.error('pensum.json no tiene un arreglo "asignaturas" utilizable.')
  process.exit(1)
}

// --- 1. Campos obligatorios ---------------------------------------------
const areasDeclaradas = new Set(Object.keys(meta?.areas ?? {}))

for (const [i, a] of asignaturas.entries()) {
  const ref = a?.codigo ?? `indice ${i}`
  if (typeof a.codigo !== 'string' || !a.codigo) err(`[${ref}] codigo invalido`)
  if (typeof a.nombre !== 'string' || !a.nombre) err(`[${ref}] nombre invalido`)
  if (!Number.isInteger(a.semestre) || a.semestre < 1) err(`[${ref}] semestre invalido: ${a.semestre}`)
  if (!Number.isInteger(a.uc) || a.uc < 0) err(`[${ref}] uc invalido: ${a.uc}`)
  if (!Array.isArray(a.prerrequisitos)) err(`[${ref}] prerrequisitos debe ser un arreglo`)
  if (areasDeclaradas.size && !areasDeclaradas.has(a.area)) {
    err(`[${ref}] area "${a.area}" no esta declarada en meta.areas`)
  }
}

// --- 2. Codigos duplicados ----------------------------------------------
const porCodigo = new Map()
for (const a of asignaturas) {
  if (porCodigo.has(a.codigo)) err(`Codigo duplicado: ${a.codigo}`)
  porCodigo.set(a.codigo, a)
}

// --- 3 y 4. Prerrequisitos existen y van antes en el tiempo -------------
for (const a of asignaturas) {
  if (!Array.isArray(a.prerrequisitos)) continue

  const vistos = new Set()
  for (const codigoPre of a.prerrequisitos) {
    if (vistos.has(codigoPre)) avisar(`[${a.codigo}] prerrequisito repetido: ${codigoPre}`)
    vistos.add(codigoPre)

    if (codigoPre === a.codigo) {
      err(`[${a.codigo}] se tiene a si misma como prerrequisito`)
      continue
    }

    const pre = porCodigo.get(codigoPre)
    if (!pre) {
      err(`[${a.codigo}] prerrequisito inexistente: ${codigoPre}`)
      continue
    }
    if (pre.semestre >= a.semestre) {
      err(
        `[${a.codigo}] (sem ${a.semestre}) depende de ${pre.codigo} (sem ${pre.semestre}): ` +
          'el prerrequisito debe estar en un semestre anterior',
      )
    }
  }
}

// --- 5. Ciclos (DFS con marcado tricolor) -------------------------------
// blanco = sin visitar, gris = en la pila actual, negro = cerrado.
const color = new Map(asignaturas.map((a) => [a.codigo, 'blanco']))
const ciclos = []

function buscarCiclo(codigo, pila) {
  color.set(codigo, 'gris')
  pila.push(codigo)

  for (const pre of porCodigo.get(codigo)?.prerrequisitos ?? []) {
    if (!porCodigo.has(pre)) continue // ya reportado como inexistente
    const c = color.get(pre)
    if (c === 'gris') {
      const desde = pila.indexOf(pre)
      ciclos.push([...pila.slice(desde), pre].join(' -> '))
    } else if (c === 'blanco') {
      buscarCiclo(pre, pila)
    }
  }

  pila.pop()
  color.set(codigo, 'negro')
}

for (const a of asignaturas) {
  if (color.get(a.codigo) === 'blanco') buscarCiclo(a.codigo, [])
}
for (const c of ciclos) err(`Ciclo de prerrequisitos: ${c}`)

// --- 6. Coherencia con meta ---------------------------------------------
const ucSumadas = asignaturas.reduce((s, a) => s + (a.uc ?? 0), 0)
const maxSemestre = Math.max(...asignaturas.map((a) => a.semestre ?? 0))

if (meta?.totalAsignaturas !== asignaturas.length) {
  err(`meta.totalAsignaturas dice ${meta?.totalAsignaturas} pero hay ${asignaturas.length}`)
}
if (meta?.totalUC !== ucSumadas) {
  err(`meta.totalUC dice ${meta?.totalUC} pero las uc suman ${ucSumadas}`)
}
if (meta?.totalSemestres !== maxSemestre) {
  err(`meta.totalSemestres dice ${meta?.totalSemestres} pero el maximo es ${maxSemestre}`)
}

const semestresVacios = []
for (let s = 1; s <= maxSemestre; s++) {
  if (!asignaturas.some((a) => a.semestre === s)) semestresVacios.push(s)
}
if (semestresVacios.length) avisar(`Semestres sin asignaturas: ${semestresVacios.join(', ')}`)

// --- 7. Electivas y requisitos -------------------------------------------
// Las electivas no tienen semestre fijo: el estudiante elige cuales cursa.
// Solo se comprueba que no choquen con las obligatorias y que sus
// prerrequisitos apunten a materias que existan.
const electivas = pensum.electivas ?? []
const tipos = new Set(['tecnica', 'humanistica'])
const codigosElectivas = new Set()

for (const e of electivas) {
  const ref = e?.codigo ?? '(sin codigo)'
  if (porCodigo.has(e.codigo)) err(`[${ref}] electiva con el mismo codigo que una obligatoria`)
  if (codigosElectivas.has(e.codigo)) err(`[${ref}] electiva duplicada`)
  codigosElectivas.add(e.codigo)

  if (!tipos.has(e.tipo)) err(`[${ref}] tipo de electiva invalido: ${e.tipo}`)
  if (!Number.isInteger(e.uc) || e.uc < 0) err(`[${ref}] uc invalido: ${e.uc}`)
  if (areasDeclaradas.size && !areasDeclaradas.has(e.area)) {
    err(`[${ref}] area "${e.area}" no esta declarada en meta.areas`)
  }

  for (const pre of e.prerrequisitos ?? []) {
    if (!porCodigo.has(pre) && !electivas.some((o) => o.codigo === pre)) {
      err(`[${ref}] prerrequisito inexistente: ${pre}`)
    }
  }
}

const cuotas = meta?.creditos
if (cuotas) {
  if (cuotas.obligatorias !== ucSumadas) {
    err(`meta.creditos.obligatorias dice ${cuotas.obligatorias} pero las uc suman ${ucSumadas}`)
  }
  const suma = cuotas.obligatorias + cuotas.electivasTecnicas + cuotas.electivasHumanisticas
  if (suma !== cuotas.total) {
    err(`meta.creditos.total dice ${cuotas.total} pero las partes suman ${suma}`)
  }

  // Sin oferta suficiente, la cuota seria imposible de cumplir
  for (const [tipo, clave] of [
    ['tecnica', 'electivasTecnicas'],
    ['humanistica', 'electivasHumanisticas'],
  ]) {
    const disponible = electivas
      .filter((e) => e.tipo === tipo)
      .reduce((s, e) => s + e.uc, 0)
    if (disponible < cuotas[clave]) {
      err(`Las electivas ${tipo}s ofrecen ${disponible} UC pero la cuota pide ${cuotas[clave]}`)
    }
  }
}

// --- Reporte -------------------------------------------------------------
const sinSalida = new Set(asignaturas.map((a) => a.codigo))
for (const a of asignaturas) for (const p of a.prerrequisitos ?? []) sinSalida.delete(p)

const ucElectiva = (tipo) =>
  electivas.filter((e) => e.tipo === tipo).reduce((s, e) => s + e.uc, 0)

console.log('Validacion del pensum')
console.log(`  Asignaturas .......... ${asignaturas.length}`)
console.log(`  Semestres ............ ${maxSemestre}`)
console.log(`  UC obligatorias ...... ${ucSumadas}`)
console.log(
  `  Electivas ............ ${electivas.length} ` +
    `(${ucElectiva('tecnica')} UC tecnicas, ${ucElectiva('humanistica')} UC humanisticas ofertadas)`,
)
if (cuotas) console.log(`  Creditos del titulo .. ${cuotas.total}`)
console.log(`  Sin prerrequisitos ... ${asignaturas.filter((a) => !a.prerrequisitos?.length).length}`)
console.log(`  Hojas (no desbloquean nada) ... ${sinSalida.size}`)
console.log('')

for (const a of avisos) console.log(`AVISO  ${a}`)
if (avisos.length) console.log('')

if (errores.length) {
  for (const e of errores) console.error(`ERROR  ${e}`)
  console.error(`\n${errores.length} error(es). La validacion NO pasa.`)
  process.exit(1)
}

console.log('Todo correcto: sin codigos faltantes, sin ciclos y sin prerrequisitos fuera de orden.')
