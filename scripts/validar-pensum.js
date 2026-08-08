/**
 * Validacion de los pensums normalizados. Se corre con: npm run validar
 * Sale con codigo 1 si hay al menos un error, para que rompa el build antes
 * de que un scrape malo llegue a produccion.
 *
 * Corre sobre src/data/carreras/*.json, o sea sobre exactamente lo mismo que
 * lee la app, no sobre el crudo. Comprueba por carrera:
 *
 *  1. Campos obligatorios y tipos
 *  2. Codigos duplicados (entre obligatorias y entre grupos)
 *  3. Todo prerrequisito existe dentro de la carrera
 *  4. Ningun prerrequisito esta en semestre igual o posterior
 *  5. No hay ciclos en el grafo de prerrequisitos
 *  6. Coherencia de creditos y que las cuotas sean alcanzables
 *  7. La regla del ultimo digito = UC, solo donde no es tautologica
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
// Acepta una ruta alterna; sirve para probar el validador con casos rotos
const dir = process.argv[2] ?? join(raiz, 'src/data/carreras')

if (!existsSync(dir)) {
  console.error(`No existe ${dir}. Corre primero: npm run datos`)
  process.exit(1)
}

let erroresTotales = 0
let avisosTotales = 0

const archivos = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'indice.json')

for (const archivo of archivos) {
  const c = JSON.parse(readFileSync(join(dir, archivo), 'utf8'))
  const errores = []
  const avisos = []
  const err = (m) => errores.push(m)
  const avisar = (m) => avisos.push(m)

  const electivas = c.grupos.flatMap((g) => g.asignaturas.map((a) => ({ ...a, grupo: g.clave })))
  const todas = [...c.asignaturas, ...electivas]

  // --- 1. Campos obligatorios --------------------------------------------
  for (const [i, a] of todas.entries()) {
    const ref = a?.codigo ?? `indice ${i}`
    if (typeof a.codigo !== 'string' || !a.codigo) err(`[${ref}] codigo invalido`)
    if (typeof a.nombre !== 'string' || !a.nombre) err(`[${ref}] nombre invalido`)
    // uc null solo se admite en los codigos comodin, que no son materias
    // reales. Quien decide que es comodin es el normalizador: si la regla se
    // repitiera aqui, las dos copias acabarian discrepando.
    if (a.uc != null && (!Number.isInteger(a.uc) || a.uc < 0)) err(`[${ref}] uc invalido: ${a.uc}`)
    // Un hueco es la casilla "aqui va una electiva que tu eliges": tampoco es
    // una materia, asi que tampoco tiene UC propia.
    if (a.uc == null && !a.esComodin && !a.esHueco) err(`[${ref}] uc nula en una materia real`)
    if (a.esComodin && a.uc != null) err(`[${ref}] comodin con uc: ${a.uc}`)
    if (a.esHueco && a.uc != null) err(`[${ref}] hueco con uc: ${a.uc}`)
    if (a.esHueco && a.prerrequisitos?.length) err(`[${ref}] un hueco no puede tener prerrequisitos`)
    if (!Array.isArray(a.prerrequisitos)) err(`[${ref}] prerrequisitos debe ser un arreglo`)
  }
  for (const a of c.asignaturas) {
    if (!Number.isInteger(a.semestre) || a.semestre < 1) {
      err(`[${a.codigo}] semestre invalido: ${a.semestre}`)
    }
  }

  // --- 2. Codigos duplicados ---------------------------------------------
  // Despues del normalizador esto tiene que estar limpio: si algo sigue
  // repetido es que la desambiguacion fallo, y eso si es error, porque la app
  // usa el codigo como identidad.
  const porCodigo = new Map()
  for (const a of todas) {
    if (porCodigo.has(a.codigo)) err(`Codigo duplicado: ${a.codigo} (${a.nombre})`)
    else porCodigo.set(a.codigo, a)
  }

  // Que la FUENTE los trajera repetidos no es error nuestro y no debe tumbar
  // el build: es un dato de mala calidad que hay que ver, no que ocultar.
  const desambiguadas = todas.filter((a) => a.codigoFuente)
  for (const a of desambiguadas) {
    avisar(
      `La fuente repite el codigo ${a.codigoFuente} en "${a.nombre}". ` +
        `Se publica como ${a.codigo} para poder marcarla aparte.`,
    )
  }

  // --- 3 y 4. Prerrequisitos existen y van antes en el tiempo ------------
  for (const a of todas) {
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

      // Solo aplica entre obligatorias: las electivas no tienen semestre fijo
      if (a.semestre != null && pre.semestre != null && pre.semestre >= a.semestre) {
        err(
          `[${a.codigo}] (sem ${a.semestre}) depende de ${pre.codigo} (sem ${pre.semestre}): ` +
            'el prerrequisito debe estar en un semestre anterior',
        )
      }
    }
  }

  // --- 5. Ciclos (DFS con marcado tricolor) ------------------------------
  // blanco = sin visitar, gris = en la pila actual, negro = cerrado.
  const color = new Map(todas.map((a) => [a.codigo, 'blanco']))
  const ciclos = []

  function buscarCiclo(codigo, pila) {
    color.set(codigo, 'gris')
    pila.push(codigo)
    for (const pre of porCodigo.get(codigo)?.prerrequisitos ?? []) {
      if (!porCodigo.has(pre)) continue // ya reportado como inexistente
      const col = color.get(pre)
      if (col === 'gris') ciclos.push([...pila.slice(pila.indexOf(pre)), pre].join(' -> '))
      else if (col === 'blanco') buscarCiclo(pre, pila)
    }
    pila.pop()
    color.set(codigo, 'negro')
  }
  for (const a of todas) if (color.get(a.codigo) === 'blanco') buscarCiclo(a.codigo, [])
  for (const ciclo of ciclos) err(`Ciclo de prerrequisitos: ${ciclo}`)

  // --- 5b. Olor a prelacion que falta en la fuente ------------------------
  // Un ultimo semestre entero sin una sola prelacion casi seguro significa
  // que la DACE no las publico, no que de verdad no existan: el Trabajo de
  // Grado siempre cuelga de algo. Es aviso y no error porque el dato es el
  // que es y no lo vamos a inventar, pero conviene que se vea.
  const ultimo = Math.max(...c.asignaturas.map((a) => a.semestre ?? 0))
  const delUltimo = c.asignaturas.filter((a) => a.semestre === ultimo)
  if (delUltimo.length > 1 && delUltimo.every((a) => !a.prerrequisitos.length)) {
    avisar(
      `Ninguna de las ${delUltimo.length} materias del semestre ${ultimo} declara ` +
        'prerrequisitos. Probable hueco de la fuente: confirmar con control de estudios.',
    )
  }

  // --- 6. Creditos y cuotas ----------------------------------------------
  const ucSumadas = c.asignaturas.reduce((s, a) => s + (a.uc ?? 0), 0)
  if (ucSumadas !== c.ucObligatorias) {
    err(`ucObligatorias dice ${c.ucObligatorias} pero las uc suman ${ucSumadas}`)
  }

  if (c.creditos) {
    if (c.creditos.obligatorias !== ucSumadas) {
      err(`creditos.obligatorias dice ${c.creditos.obligatorias} pero las uc suman ${ucSumadas}`)
    }
    const cuotas = c.grupos.reduce((s, g) => s + (g.cuota ?? 0), 0)
    const suma = c.creditos.obligatorias + cuotas
    if (suma !== c.creditos.titulo) {
      err(`creditos.titulo dice ${c.creditos.titulo} pero obligatorias + cuotas suman ${suma}`)
    }
  }

  // Una cuota mayor que la oferta seria imposible de cumplir
  for (const g of c.grupos) {
    if (g.cuota == null) continue
    const ofertado = g.asignaturas.reduce((s, a) => s + (a.uc ?? 0), 0)
    if (ofertado < g.cuota) {
      err(`El grupo "${g.titulo}" ofrece ${ofertado} UC pero su cuota pide ${g.cuota}`)
    }
  }

  // --- 7. Regla del ultimo digito ----------------------------------------
  // La UC se deriva del ultimo digito del codigo en todas las carreras,
  // asi que comprobarla aqui seria circular: siempre pasa.

  // --- Reporte por carrera ------------------------------------------------
  const estado = errores.length ? 'FALLA' : avisos.length ? 'avisos' : 'ok'
  console.log(
    `${estado.padEnd(7)} ${c.slug.padEnd(44)} ` +
      `${String(c.asignaturas.length).padStart(3)} oblig  ` +
      `${String(electivas.length).padStart(3)} en ${c.grupos.length} grupos  ` +
      `${String(ucSumadas).padStart(3)} UC` +
      (c.creditos ? `  titulo ${c.creditos.titulo}` : '  (sin creditos oficiales)'),
  )
  for (const a of avisos) console.log(`        AVISO  ${a}`)
  for (const e of errores) console.error(`        ERROR  ${e}`)

  erroresTotales += errores.length
  avisosTotales += avisos.length
}

console.log('')
if (erroresTotales) {
  console.error(`${erroresTotales} error(es) en ${archivos.length} carreras. La validacion NO pasa.`)
  process.exit(1)
}
console.log(
  `${archivos.length} carreras validadas, ${avisosTotales} aviso(s). ` +
    'Sin codigos faltantes, sin ciclos y sin prerrequisitos fuera de orden.',
)
