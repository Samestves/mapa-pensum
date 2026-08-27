import { ABRE, CIERRA, DIAS, MIN_DURACION, solapan } from './horario.js'

/* Lo que la lectura devuelve es texto que alguien -o algo- leyo de una foto.
   Aqui no se confia en nada: cada fila se comprueba contra el pensum de LA
   carrera abierta y contra las reglas de la rejilla, y la que no cuadre sale
   marcada, no corregida a la brava. El estudiante revisa antes de que esto
   toque su horario.

   Es todo funcion pura y por eso vive en layout/: se prueba sin montar nada y
   sin red. */

const DIAS_ALIAS = [
  ['lunes', 'lun', 'monday', 'mon', 'l'],
  ['martes', 'mar', 'tuesday', 'tue', 'm'],
  ['miercoles', 'mie', 'wednesday', 'wed', 'x'],
  ['jueves', 'jue', 'thursday', 'thu', 'j'],
  ['viernes', 'vie', 'friday', 'fri', 'v'],
]

const ROMANOS = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 }

/* Sin tildes y en minusculas. Es la misma normalizacion del buscador y de la
   paleta; si aparece una cuarta copia, toca sacarla a un modulo. */
export const normalizar = (t) =>
  String(t ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

/** El dia como indice 0..4, o null si no se reconoce. */
export function aDia(crudo) {
  const t = normalizar(crudo).replace(/[^a-z]/g, '')
  if (!t) return null

  const exacto = DIAS_ALIAS.findIndex((alias) => alias.includes(t))
  if (exacto >= 0) return exacto

  // "miercoles" mal escrito, "juev", "vier": por prefijo, que es como se abrevian
  const porPrefijo = DIAS_ALIAS.findIndex(([largo]) => largo.startsWith(t) || t.startsWith(largo))
  return porPrefijo >= 0 ? porPrefijo : null
}

/**
 * La hora como minutos desde medianoche, o null.
 *
 * Acepta "7:00", "07:00", "7:00 AM", "1:40 PM" y "7.00". El meridiano importa
 * de verdad: un horario universitario va de siete a siete, asi que un "1:40" a
 * secas son las 13:40 y no las de la madrugada. Sin esa regla, media tarde de
 * cualquier horario aterrizaria antes de que abra la facultad.
 */
export function aHora(crudo) {
  const t = normalizar(crudo).replace(/\./g, '')
  if (!t) return null

  const partes = t.match(/^(\d{1,2})[:h]?(\d{2})?\s*(am|pm)?$/)
  if (!partes) return null

  let h = Number(partes[1])
  const min = Number(partes[2] ?? 0)
  if (!Number.isFinite(h) || !Number.isFinite(min) || min > 59 || h > 23) return null

  const tarde = partes[3] === 'pm'
  const manana = partes[3] === 'am'

  if (tarde && h < 12) h += 12
  else if (manana && h === 12) h = 0
  /* Sin meridiano, una hora que caeria antes de que abra la facultad se lee
     como de la tarde: es la unica lectura posible de "1:40" en un horario que
     empieza a las siete. */
  else if (!tarde && !manana && h * 60 + min < ABRE) h += 12

  const total = h * 60 + min
  return total < 24 * 60 ? total : null
}

/* El nivel de una materia: el I, II o III del final. Se saca aparte porque es
   lo unico que separa "Matematica I" de "Matematica II", y una comparacion
   por parecido las da casi identicas -comparten casi todas las letras-. Sin
   esto, media carrera se importaria con el nivel cambiado. */
function nivelDe(trozos) {
  const ultimo = trozos[trozos.length - 1]
  if (!ultimo) return null
  if (ROMANOS[ultimo]) return ROMANOS[ultimo]
  return /^\d+$/.test(ultimo) ? Number(ultimo) : null
}

const RUIDO = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'a', 'en', 'para'])

const trocear = (nombre) =>
  normalizar(nombre)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

/**
 * Cuanto se parecen dos nombres de materia, de 0 a 1.
 *
 * Se cuentan las palabras en comun y se mide contra LAS DOS listas, no contra
 * la mas corta. La diferencia no es teorica: dividiendo entre la mas corta,
 * cualquier nombre que CONTENGA al otro saca un 1 redondo, asi que "Física I"
 * y "Laboratorio de Física I" empataban a la perfeccion leyendo "FISICA I", y
 * la regla de que dos candidatas igual de buenas no eligen descartaba las dos.
 * Una materia que existe en el pensum y esta escrita casi igual acababa como
 * "no encontrada".
 *
 * Midiendo por los dos lados, sobrar palabras cuesta: la que sobra baja el
 * lado del pensum y el laboratorio se queda en 0,8 contra el 1 de la buena.
 *
 * El nivel es un veto y no un factor: si los dos lo declaran y no coincide,
 * es 0. Es lo unico que separa "Matematicas I" de "Matematicas II".
 */
export function parecido(a, b) {
  const ta = trocear(a)
  const tb = trocear(b)
  if (!ta.length || !tb.length) return 0

  const na = nivelDe(ta)
  const nb = nivelDe(tb)
  if (na != null && nb != null && na !== nb) return 0

  const utiles = (t) => (t.some((p) => !RUIDO.has(p)) ? t.filter((p) => !RUIDO.has(p)) : t)
  const ua = utiles(ta)
  const ub = utiles(tb)

  /* Una palabra corta se compara entera; a partir de tres letras vale que una
     empiece por la otra, que es como se abrevia un horario: "ING" por
     "Inglés", "PROG" por "Programación". */
  const resto = [...ub]
  let comunes = 0
  for (const p of ua) {
    const i = resto.findIndex(
      (q) => q === p || (p.length >= 3 && (q.startsWith(p) || p.startsWith(q))),
    )
    if (i >= 0) {
      comunes++
      resto.splice(i, 1)
    }
  }
  if (!comunes) return 0

  const cubreLoLeido = comunes / ua.length
  const cubreLaMateria = comunes / ub.length
  return (2 * cubreLoLeido * cubreLaMateria) / (cubreLoLeido + cubreLaMateria)
}

/* Por debajo de esto no se propone nada, y si el segundo candidato esta
   pegado al primero tampoco. Se prefiere dejar la fila sin materia -que se ve
   y se arregla en dos toques- a colarle al estudiante una materia que no es,
   que es un error que puede no notar hasta el dia del examen. */
const UMBRAL = 0.6
const DISTANCIA_MINIMA = 0.15

/**
 * La materia del pensum que corresponde a una fila leida.
 *
 * Primero por codigo, que es exacto y es lo que se le pide a la lectura que
 * devuelva. Si no, por nombre.
 */
export function emparejar(fila, materias) {
  if (fila.codigo) {
    const buscado = String(fila.codigo).trim()
    const porCodigo = materias.find((m) => m.codigo === buscado)
    if (porCodigo) return { materia: porCodigo, via: 'codigo' }
  }

  if (!fila.nombre) return { materia: null, via: null }

  const puntuadas = materias
    .map((m) => ({ m, p: parecido(fila.nombre, m.nombre) }))
    .sort((a, b) => b.p - a.p)

  const [mejor, segunda] = puntuadas
  if (!mejor || mejor.p < UMBRAL) return { materia: null, via: null }
  if (segunda && mejor.p - segunda.p < DISTANCIA_MINIMA) return { materia: null, via: null }

  return { materia: mejor.m, via: 'nombre' }
}

/**
 * Que le pasa a una fila, mirandola sola.
 *
 * Se exporta porque la pantalla de revision la necesita igual: cuando el
 * estudiante corrige un dia o una hora, esa fila hay que volver a juzgarla, y
 * hacerlo alli con los numeros escritos a mano seria tener dos definiciones de
 * "clase valida" que se separan el dia que alguien mueva la jornada.
 *
 * El choque NO se mira aqui a proposito: depende de las demas, y eso lo
 * resuelve marcarChoques sobre la lista entera.
 */
export function avisosDe({ materia, dia, inicio, fin }) {
  const avisos = []
  if (!materia) avisos.push('sin-materia')
  if (dia == null) avisos.push('sin-dia')
  if (inicio == null || fin == null || fin <= inicio) avisos.push('sin-hora')
  else {
    if (inicio < ABRE || fin > CIERRA) avisos.push('fuera')
    if (fin - inicio < MIN_DURACION) avisos.push('corta')
  }
  return avisos
}

/**
 * Convierte lo leido en candidatas revisables.
 *
 * NO devuelve sesiones listas para guardar: devuelve filas con lo que se
 * entendio, con que materia se emparejo y que le pasa a cada una. La pantalla
 * de revision se dibuja de esto y el estudiante decide. Meter esto directo en
 * el horario seria pedirle que confie a ciegas en la lectura de una foto.
 *
 * Los avisos que se marcan:
 *   'sin-materia'  no se pudo emparejar con ninguna del pensum
 *   'sin-dia'      el dia no se entendio o cae fuera de lunes-viernes
 *   'sin-hora'     falta una hora, o el fin no va despues del inicio
 *   'fuera'        la clase cae fuera de la jornada de la rejilla
 *   'corta'        dura menos que el minimo
 *   'choca'        se pisa con otra clase, leida o ya guardada
 */
export function revisar(filas, materias, yaGuardadas = []) {
  const candidatas = (Array.isArray(filas) ? filas : []).map((fila, i) => {
    const { materia, via } = emparejar(fila, materias)
    const dia = aDia(fila.dia)
    const inicio = aHora(fila.inicio)
    const fin = aHora(fila.fin)

    const avisos = avisosDe({ materia, dia, inicio, fin })

    return {
      id: `leida-${i}`,
      /* Lo que se leyo, crudo, se conserva aunque no se haya entendido: es lo
         unico que le permite al estudiante comparar la fila con su foto sin
         volver a abrirla. */
      leido: {
        nombre: String(fila.nombre ?? '').trim(),
        dia: String(fila.dia ?? '').trim(),
        horas: `${String(fila.inicio ?? '').trim()} – ${String(fila.fin ?? '').trim()}`,
      },
      codigo: materia?.codigo ?? null,
      materia,
      via,
      dia,
      inicio,
      fin,
      seccion: String(fila.seccion ?? '').trim(),
      aula: String(fila.aula ?? '').trim(),
      profesor: String(fila.profesor ?? '').trim(),
      avisos,
      incluir: avisos.length === 0,
    }
  })

  return marcarChoques(candidatas, yaGuardadas)
}

/**
 * Vuelve a repasar los choques de toda la lista.
 *
 * Se llama otra vez cada vez que el estudiante toca algo en la revision:
 * desmarcar una fila puede dejar libre a la que chocaba con ella, y una lista
 * que sigue avisando de un choque que ya no existe es peor que no avisar.
 */
export function marcarChoques(candidatas, yaGuardadas = []) {
  const activas = candidatas.filter(
    (c) => c.incluir && c.dia != null && c.inicio != null && c.fin != null,
  )

  return candidatas.map((c) => {
    const sinChoque = c.avisos.filter((a) => a !== 'choca')
    if (!activas.includes(c)) return { ...c, avisos: sinChoque }

    const choca = [...yaGuardadas, ...activas.filter((o) => o.id !== c.id)].some((o) =>
      solapan(o, c),
    )
    return { ...c, avisos: choca ? [...sinChoque, 'choca'] : sinChoque }
  })
}

/** Las candidatas marcadas y sanas, ya como sesiones del horario. */
export function aSesiones(candidatas) {
  return candidatas
    .filter((c) => c.incluir && !c.avisos.length)
    .map((c, i) => ({
      id: `ia-${Date.now()}-${i}`,
      codigo: c.codigo,
      dia: c.dia,
      inicio: c.inicio,
      fin: c.fin,
      seccion: c.seccion,
      aula: c.aula,
      profesor: c.profesor,
      // null = toma el color de su area, igual que si la hubiera puesto a mano
      color: null,
    }))
}

export { DIAS }
