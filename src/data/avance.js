import { ESTADO } from './estados.js'

/**
 * El avance hacia el titulo, de 0 a 100.
 *
 * Donde el pensum trae creditos oficiales es el de UC, que es el que cuenta
 * para graduarse; donde no, el de materias, que es lo unico que se puede
 * saber. Lo usan la capsula de la cabecera de escritorio y la isla del
 * telefono.
 */
export function avanceDe(resumen) {
  if (resumen.porcentaje != null) return resumen.porcentaje
  return resumen.total ? (resumen.aprobadas / resumen.total) * 100 : 0
}

/**
 * Cuanto llevas, en la misma unidad que el porcentaje: UC del titulo donde
 * hay creditos oficiales, materias donde no. Es lo que la capsula de avance
 * de escritorio escribe al lado del anillo.
 */
export function cuantoLlevas(resumen) {
  return resumen.porcentaje != null
    ? `${resumen.ucAprobadas + resumen.ucElectivas} de ${resumen.ucTitulo} UC`
    : `${resumen.aprobadas} de ${resumen.total} materias`
}

/**
 * La frase que acompaña al anillo -su title y su etiqueta accesible-. Dice de
 * cual de los dos porcentajes se trata, para que el numero no signifique dos
 * cosas distintas sin avisar.
 */
export function describirAvance(resumen) {
  const redondeado = Math.round(avanceDe(resumen))
  return `Tu avance: ${redondeado}% · ${cuantoLlevas(resumen)}. Pulsa para ver el detalle.`
}

/**
 * Cuantas obligatorias aprobaste de cada semestre, a partir de las marcas
 * guardadas y sin montar nada de la vista: son los puntos que la portada
 * enciende en la silueta de cada carrera.
 *
 * Va en el mismo orden que la silueta del indice, que tambien sale de
 * `carrera.semestres`, y cuenta solo obligatorias, que es lo que la silueta
 * dibuja: las casillas de electiva no son un punto.
 */
export function aprobadasPorSemestre(carrera, marcas) {
  const obligatorias = carrera.asignaturas.filter((a) => !a.esHueco)
  return carrera.semestres.map(
    (s) =>
      obligatorias.filter((a) => a.semestre === s.numero && marcas?.[a.codigo] === ESTADO.APROBADA)
        .length,
  )
}

// Solo se guardan estas dos marcas: disponible y bloqueada se deducen cada vez
const MARCAS_VALIDAS = [ESTADO.APROBADA, ESTADO.CURSANDO]

/**
 * Descarta lo que ya no sirva: codigos ajenos al pensum y marcas invalidas.
 * Lo guardado puede venir de un pensum anterior o de una version vieja de la
 * app, y un dato raro no debe romper la pantalla.
 */
export function depurarMarcas(datos, codigosValidos) {
  if (!datos || typeof datos !== 'object') return {}
  const limpias = {}
  for (const [codigo, marca] of Object.entries(datos)) {
    if (codigosValidos.has(codigo) && MARCAS_VALIDAS.includes(marca)) limpias[codigo] = marca
  }
  return limpias
}

/**
 * Estado de cada materia. Lo que el estudiante marco gana siempre; el resto se
 * deduce de los prerrequisitos.
 */
export function estadosDe(todas, marcas) {
  const mapa = {}
  for (const a of todas) {
    const marca = marcas[a.codigo]
    if (marca) {
      mapa[a.codigo] = marca
      continue
    }
    // Sin prerrequisitos, every() da true: nace disponible
    const libre = (a.prerrequisitos ?? []).every((pre) => marcas[pre] === ESTADO.APROBADA)
    mapa[a.codigo] = libre ? ESTADO.DISPONIBLE : ESTADO.BLOQUEADA
  }
  return mapa
}

/**
 * Avance de cada grupo de electivas. No cuenta cuantas escogiste sino cuantas
 * UC llevas de la cuota: las tecnicas de Sistemas van de 1 a 3 UC, asi que
 * contarlas por cabeza daria un numero equivocado.
 *
 * Los grupos sin cuota (las carreras de las que no tenemos los creditos
 * oficiales, y las secciones informativas como Areas de Grado) se cuentan
 * igual pero sin meta: se dice lo que llevas, no cuanto falta.
 */
export function avanceDeGrupos(grupos, marcas) {
  const mapa = {}
  for (const g of grupos) {
    const elegidas = g.asignaturas.filter((e) => marcas[e.codigo] === ESTADO.APROBADA)
    const uc = elegidas.reduce((s, e) => s + (e.uc ?? 0), 0)
    mapa[g.clave] = {
      clave: g.clave,
      titulo: g.titulo,
      tipo: g.tipo,
      elegidas,
      uc,
      meta: g.cuota,
      completa: g.cuota != null && uc >= g.cuota,
      // Lo que sobra no suma para el titulo, pero se muestra igual
      excedente: g.cuota != null ? Math.max(0, uc - g.cuota) : 0,
    }
  }
  return mapa
}

/**
 * Totales del avance a partir de los estados ya calculados. Las UC electivas
 * se topan en su cuota: pasarse de una electiva no adelanta el titulo.
 */
export function progresoDe(asignaturas, estados, creditos, avanceGrupos) {
  let ucAprobadas = 0
  let aprobadas = 0
  let cursando = 0
  // Las disponibles se guardan enteras, no solo contadas: saber que tienes
  // once por inscribir no sirve de nada si no sabes cuales son.
  const paraInscribir = []

  for (const a of asignaturas) {
    const estado = estados[a.codigo]
    const uc = a.uc ?? 0

    if (estado === ESTADO.APROBADA) {
      ucAprobadas += uc
      aprobadas += 1
    } else if (estado === ESTADO.CURSANDO) {
      cursando += 1
    } else if (estado === ESTADO.DISPONIBLE) {
      paraInscribir.push(a)
    }
  }

  const ucTotales = asignaturas.reduce((s, a) => s + (a.uc ?? 0), 0)

  // Solo cuentan las UC electivas que caben en su cuota
  const ucElectivas = Object.values(avanceGrupos).reduce(
    (s, g) => s + (g.meta != null ? Math.min(g.uc, g.meta) : 0),
    0,
  )

  // Sin creditos oficiales no hay denominador honesto, y preferimos no
  // decir nada a inventar un porcentaje. La UI lo detecta por null.
  const ucTitulo = creditos?.titulo ?? null
  const porcentaje = ucTitulo ? ((ucAprobadas + ucElectivas) / ucTitulo) * 100 : null

  return {
    ucAprobadas,
    ucTotales,
    ucTitulo,
    ucElectivas,
    porcentaje,
    porcentajeObligatorias: ucTotales ? (ucAprobadas / ucTotales) * 100 : 0,
    aprobadas,
    cursando,
    disponibles: paraInscribir.length,
    // Por semestre: lo primero que ofrece es lo que llevas mas atrasado
    paraInscribir: [...paraInscribir].sort(
      (a, b) => (a.semestre ?? 99) - (b.semestre ?? 99) || a.nombre.localeCompare(b.nombre, 'es'),
    ),
    bloqueadas: asignaturas.length - aprobadas - cursando - paraInscribir.length,
    total: asignaturas.length,
  }
}

/**
 * Devuelve las marcas con `cambios` aplicados, sin tocar las originales. Una
 * marca null o undefined borra la clave: desmarcar es quitarla, no guardar
 * "sin marcar", asi lo guardado solo lleva lo que el estudiante marco.
 */
export function conMarcas(marcas, cambios) {
  const copia = { ...marcas }
  for (const [codigo, marca] of Object.entries(cambios)) {
    if (marca) copia[codigo] = marca
    else delete copia[codigo]
  }
  return copia
}
