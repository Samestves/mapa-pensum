/**
 * Convierte los pensums crudos al unico modelo que consume la app.
 *
 * Entra: datos/crudo/*.json (scrape de la DACE tal cual, o el formato propio
 *        de Sistemas) + datos/overlay.json (lo que sabemos y la DACE no dice).
 * Sale:  src/data/carreras/<slug>.json, uno por carrera, compacto.
 *
 * Se normaliza en build y no en runtime por dos motivos: el cliente no paga el
 * parseo ni se lleva el crudo (que es cuatro veces mas grande por el sangrado y
 * los campos que no usamos), y el validador puede correr sobre exactamente lo
 * mismo que va a leer la app.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const CRUDO = 'datos/crudo'
const SALIDA = 'src/data/carreras'

/* ------------------------------------------------------------------ *
 * Reglas de codigo
 * ------------------------------------------------------------------ */

// El ultimo digito del codigo son las unidades credito. Verificado 88/88
// contra el pensum oficial de Sistemas, que es el unico con UC confirmadas.
//
// El PENULTIMO digito NO es el semestre. Parece serlo en algunas carreras
// (96-98% en Administracion y Contaduria) pero se cae al 27-34% en Sistemas,
// Petroleo y Alimentos. El semestre sale de las claves del JSON y de ningun
// otro sitio.
const ucDeCodigo = (codigo) => Number(codigo.slice(-1))

// Codigos comodin que no son asignaturas reales. 9099999 es el marcador de
// "Areas de Grado" que la DACE mete en el semestre 10 de las 7 carreras: su
// ultimo digito daria 9 UC, que es basura. No existe en el pensum de Sistemas.
const REQUISITOS_SIN_UC = new Set(['9099999'])

const esComodin = (codigo) => /^9{7}$/.test(codigo) || REQUISITOS_SIN_UC.has(codigo)

/**
 * Desambigua codigos repetidos.
 *
 * El pensum de Ambiental viene de una imagen escaneada, no del HTML de la
 * DACE, y trae dos pares de materias distintas con el mismo codigo. El propio
 * documento lo declara como probable error de transcripcion. Ademas usa un
 * codigo comodin repetido para las casillas de electiva.
 *
 * No se puede forzar la unicidad borrando materias, pero tampoco se puede
 * dejar el codigo repetido: la app usa el codigo como identidad -claves de
 * React, mapa de marcas, estados-, y con dos materias compartiendolo, marcar
 * una marcaria la otra y el porcentaje mentiria.
 *
 * La solucion es local: la PRIMERA aparicion conserva su codigo intacto, para
 * que cualquier prerrequisito que apunte ahi siga resolviendo, y las
 * siguientes reciben un sufijo. El codigo tal como esta impreso en la fuente
 * se guarda en codigoFuente para poder mostrarlo, porque es el que el
 * estudiante va a ver en su documento.
 */
function desambiguarCodigos(todas) {
  const vistos = new Map()
  const repetidos = []

  for (const a of todas) {
    const n = (vistos.get(a.codigo) ?? 0) + 1
    vistos.set(a.codigo, n)
    if (n === 1) continue

    // Que los huecos compartan comodin es lo normal y no le interesa a nadie:
    // solo se reportan las materias de verdad que colisionan.
    if (!a.esHueco) repetidos.push({ codigo: a.codigo, nombre: a.nombre })
    a.codigoFuente = a.codigo
    a.codigo = `${a.codigo}-${n}`
  }

  return repetidos
}

const slugificar = (texto) =>
  texto
    .normalize('NFD')
    // Rango de diacriticos combinantes, en escape para que el archivo pueda
    // viajar por herramientas que no respeten UTF-8
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

// Clave estable para un grupo de electivas, para que el codigo no dependa de
// como este escrito el titulo en el scrape.
const claveGrupo = (titulo) => {
  const s = slugificar(titulo)
  if (s.includes('tecnica')) return 'tecnica'
  if (s.includes('humanistica')) return 'humanistica'
  return s
}

/* ------------------------------------------------------------------ *
 * Adaptadores: cada formato de entrada a la forma comun
 * ------------------------------------------------------------------ */

/** Formato de la DACE: semestres/electivas/otras_secciones como objetos */
function desdeDace(crudo) {
  const asignaturas = []
  for (const [clave, lista] of Object.entries(crudo.semestres ?? {})) {
    const semestre = Number(clave.replace(/\D/g, ''))
    for (const a of lista) {
      // Un hueco no es una materia: es una casilla que dice "aqui va una
      // electiva que tu eliges". No debe contar para el avance ni poder
      // marcarse, porque la materia de verdad se marca en su grupo. Su UC
      // seria la del codigo comodin, que no significa nada: va a null.
      const hueco = a.placeholder === true
      asignaturas.push({
        codigo: a.codigo,
        nombre: a.asignatura,
        semestre,
        uc: hueco || esComodin(a.codigo) ? null : ucDeCodigo(a.codigo),
        ...(hueco ? { esHueco: true } : esComodin(a.codigo) ? { esComodin: true } : {}),
        // "120 UC aprobadas" no es un codigo de materia: no puede ser una
        // arista del grafo, asi que viaja aparte y se enseña como texto.
        ...(a.requisito_especial ? { requisitoEspecial: a.requisito_especial } : {}),
        prerrequisitos: a.prerrequisitos ?? [],
      })
    }
  }

  const grupos = []
  for (const [titulo, lista] of Object.entries(crudo.electivas ?? {})) {
    grupos.push({
      clave: claveGrupo(titulo),
      titulo,
      tipo: 'electiva',
      asignaturas: lista.map((a) => ({
        codigo: a.codigo,
        nombre: a.asignatura,
        uc: ucDeCodigo(a.codigo),
        prerrequisitos: a.prerrequisitos ?? [],
      })),
    })
  }
  // Sale de otras_secciones: hoy solo Agronomica publica "Areas de Grado".
  // No se sabe cuantas hay que elegir, asi que entra como informativa: se
  // puede mirar, no cuenta para ningun calculo.
  for (const [titulo, lista] of Object.entries(crudo.otras_secciones ?? {})) {
    grupos.push({
      clave: claveGrupo(titulo),
      titulo,
      tipo: 'informativa',
      asignaturas: lista.map((a) => ({
        codigo: a.codigo,
        nombre: a.asignatura,
        uc: ucDeCodigo(a.codigo),
        prerrequisitos: a.prerrequisitos ?? [],
      })),
    })
  }

  return {
    nombre: crudo.carrera,
    institucion: crudo.institucion,
    fuente: crudo.fuente,
    asignaturas,
    grupos,
    correcciones: crudo.correcciones_aplicadas ?? [],
  }
}

/** Formato propio de Sistemas: ya trae area, uc y tipo de electiva */
function desdeSistemas(crudo) {
  const grupos = []
  for (const [clave, titulo] of [
    ['tecnica', 'Electivas Técnicas'],
    ['humanistica', 'Electivas Humanísticas'],
  ]) {
    const items = crudo.electivas.filter((e) => e.tipo === clave)
    if (items.length) {
      grupos.push({
        clave,
        titulo,
        tipo: 'electiva',
        asignaturas: items.map(({ codigo, nombre, uc, area, prerrequisitos }) => ({
          codigo,
          nombre,
          uc,
          area,
          prerrequisitos: prerrequisitos ?? [],
        })),
      })
    }
  }

  return {
    nombre: crudo.meta.carrera,
    institucion: 'Universidad de Oriente',
    nucleo: crudo.meta.nucleo,
    fuente: crudo.meta.fuente ?? null,
    asignaturas: crudo.asignaturas.map((a) => ({
      codigo: a.codigo,
      nombre: a.nombre,
      semestre: a.semestre,
      uc: a.uc,
      area: a.area,
      prerrequisitos: a.prerrequisitos ?? [],
    })),
    grupos,
    correcciones: [],
  }
}

/* ------------------------------------------------------------------ *
 * Derivados
 * ------------------------------------------------------------------ */

/**
 * Profundidad en la cadena de prelaciones: 1 si no pide nada, y si no
 * 1 + la mayor de sus prerrequisitos. Es lo que usan las carreras sin areas
 * clasificadas para variar el color, y de aqui sale tambien la ruta critica.
 *
 * Preferido sobre el semestre porque el semestre ya es el eje X del mapa:
 * teñir por semestre repetiria informacion que la posicion ya da, mientras
 * que la profundidad dice algo distinto (una materia de 8vo sin prelaciones
 * es profundidad 1).
 */
function calcularProfundidades(todas) {
  const porCodigo = new Map(todas.map((a) => [a.codigo, a]))
  const memo = new Map()

  const de = (codigo, enCamino) => {
    if (memo.has(codigo)) return memo.get(codigo)
    // El validador ya prohibe ciclos, pero esta funcion no depende de eso
    if (enCamino.has(codigo)) return 1
    enCamino.add(codigo)
    const pre = (porCodigo.get(codigo)?.prerrequisitos ?? []).filter((p) => porCodigo.has(p))
    const d = pre.length ? 1 + Math.max(...pre.map((p) => de(p, new Set(enCamino)))) : 1
    memo.set(codigo, d)
    return d
  }

  for (const a of todas) a.profundidad = de(a.codigo, new Set())
  return Math.max(...todas.map((a) => a.profundidad))
}

/* ------------------------------------------------------------------ *
 * Normalizacion
 * ------------------------------------------------------------------ */

function normalizar(crudo, overlayTodo) {
  const base = crudo.meta ? desdeSistemas(crudo) : desdeDace(crudo)
  const slug = slugificar(base.nombre)
  const ov = overlayTodo[slug] ?? {}

  // Las cuotas del overlay se aplican por clave de grupo. Un grupo sin cuota
  // se muestra pero no cuenta: es la degradacion elegante para las carreras
  // de las que no tenemos los creditos oficiales.
  const grupos = base.grupos.map((g) => ({
    ...g,
    cuota: ov.cuotas?.[g.clave] ?? null,
  }))

  // Antes de derivar nada: si la fuente repitio codigos hay que separarlos, o
  // los mapas por codigo de aqui en adelante perderian materias por el camino.
  const todas = [...base.asignaturas, ...grupos.flatMap((g) => g.asignaturas)]
  const repetidos = desambiguarCodigos(todas)
  const profundidadMaxima = calcularProfundidades(todas)

  const porSemestre = new Map()
  for (const a of base.asignaturas) {
    if (!porSemestre.has(a.semestre)) porSemestre.set(a.semestre, [])
    porSemestre.get(a.semestre).push(a)
  }
  // Los huecos se dibujan en su columna pero no se cuentan: "7 materias" tiene
  // que ser siete materias. El comodin de Areas de Grado si se sigue contando
  // como hasta ahora, para no cambiar de numeros a las siete carreras que ya
  // estaban publicadas.
  const semestres = [...porSemestre.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([numero, lista]) => {
      const reales = lista.filter((a) => !a.esHueco)
      return {
        numero,
        cantidad: reales.length,
        uc: reales.reduce((s, a) => s + (a.uc ?? 0), 0),
        ...(reales.length !== lista.length ? { huecos: lista.length - reales.length } : {}),
      }
    })

  const ucObligatorias = semestres.reduce((s, x) => s + x.uc, 0)

  return {
    slug,
    nombre: base.nombre,
    nombreCorto: ov.nombreCorto ?? base.nombre,
    institucion: base.institucion,
    nucleo: base.nucleo ?? 'Núcleo de Monagas',
    fuente: base.fuente,
    color: ov.color ?? null,
    // Solo Sistemas tiene las areas clasificadas a mano. Las demas varian el
    // color por profundidad, que sale del grafo y no de una clasificacion
    // que no tenemos.
    tieneAreas: base.asignaturas.some((a) => a.area),
    // En las carreras de la DACE la UC sale del ultimo digito, asi que
    // comprobar la regla ahi seria tautologico. En Sistemas viene del pensum
    // oficial, y ahi si es una prueba de verdad: el validador la exige.
    ucDerivada: !crudo.meta,
    // Sin creditos oficiales no se muestra porcentaje. Preferimos no decir
    // nada a inventar un denominador.
    creditos: ov.creditos ?? null,
    ucObligatorias,
    profundidadMaxima,
    // A los avisos escritos a mano se suman los que detecta el propio
    // normalizador, para que no dependan de que alguien se acuerde de
    // anotarlos cuando entra un pensum nuevo.
    avisos: [
      ...(ov.avisos ?? []),
      ...repetidos.map(
        (r) =>
          `El código ${r.codigo} aparece en más de una materia de la fuente ` +
          `(una de ellas, "${r.nombre}"). Es probable que sea un error de ` +
          'transcripción del documento escaneado. Aquí se separan para poder ' +
          'marcarlas por separado, pero confirma el código con control de estudios.',
      ),
    ],
    correcciones: base.correcciones,
    semestres,
    asignaturas: base.asignaturas,
    grupos,
  }
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

const overlayTodo = JSON.parse(readFileSync('datos/overlay.json', 'utf8'))
rmSync(SALIDA, { recursive: true, force: true })
mkdirSync(SALIDA, { recursive: true })

const indice = []
for (const archivo of readdirSync(CRUDO).filter((f) => f.endsWith('.json'))) {
  const crudo = JSON.parse(readFileSync(join(CRUDO, archivo), 'utf8'))
  const carrera = normalizar(crudo, overlayTodo)

  writeFileSync(join(SALIDA, `${carrera.slug}.json`), JSON.stringify(carrera))

  const electivas = carrera.grupos.reduce((s, g) => s + g.asignaturas.length, 0)
  indice.push({
    slug: carrera.slug,
    nombre: carrera.nombre,
    nombreCorto: carrera.nombreCorto,
    color: carrera.color,
    semestres: carrera.semestres.length,
    // Sin los huecos: la tarjeta dice "N materias" y un hueco no lo es
    asignaturas: carrera.asignaturas.filter((a) => !a.esHueco).length,
    electivas,
    conCreditos: carrera.creditos != null,
    // Silueta para la miniatura del selector: cuantas materias por semestre.
    // Va en el indice para poder dibujar las 8 tarjetas sin bajar 8 pensums.
    silueta: carrera.semestres.map((s) => s.cantidad),
  })

  console.log(
    `  ${carrera.slug.padEnd(44)} ${String(carrera.asignaturas.length).padStart(3)} oblig` +
      ` + ${String(electivas).padStart(3)} en ${carrera.grupos.length} grupos` +
      `  ${carrera.ucObligatorias} UC` +
      `  prof.max ${carrera.profundidadMaxima}` +
      (carrera.creditos ? '  [creditos]' : ''),
  )
}

indice.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
writeFileSync(join(SALIDA, 'indice.json'), JSON.stringify(indice))
console.log(`\n  ${indice.length} carreras normalizadas en ${SALIDA}/`)
