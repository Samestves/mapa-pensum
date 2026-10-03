/* Con extension, a diferencia del resto del proyecto, y a proposito. Los
   imports sin extension los resuelve Vite, no el estandar; este modulo es
   logica pura y se prueba con el runner de Node, que si exige la extension
   porque es lo que dice la especificacion de ESM. Vite la acepta igual, asi
   que poniendola funciona en los dos sitios. */
import { ESTADO } from '../data/estados.js'
import { construirRelaciones, pesoDesbloqueo } from './relaciones.js'

// Estimacion para traducir horas de estudio a carga academica. Una UC de la
// UDO ronda una hora de clase semanal, y la regla de oro es dedicarle unas
// dos de estudio por cada hora de aula. NO es un dato oficial: sirve para
// sugerir un tope, no para decidir por el estudiante.
export const HORAS_POR_UC = 3

export const horasDe = (uc) => uc * HORAS_POR_UC

/**
 * Cuantos semestres por encima de tu materia obligatoria mas atrasada puede
 * ir lo que el plan te propone.
 *
 * Sin este limite el plan metia en el segundo semestre de un nuevo ingreso
 * materias de quinto que no tienen prelacion -Sistemas de Costo, Teoria de
 * Sistemas- mientras Quimica General, que es de primero, se iba al sexto.
 * Cumplia las prelaciones, pero no es un orden que nadie pueda inscribir: la
 * carrera se cursa por niveles y lo de primero va antes que lo de quinto.
 *
 * Es una regla nuestra, no un articulo del reglamento: dos semestres de
 * margen dejan adelantar lo que desbloquea mucho sin desordenar la carrera.
 */
export const VENTANA_NIVEL = 2

/**
 * Como se llama el enesimo semestre de un plan.
 *
 * El plan numera sus semestres desde 1, pero ese 1 NO es el semestre 1 del
 * pensum: es el primero que te queda por delante. Quien ya aprobo hasta
 * cuarto veia "Semestre 1" encabezando su ruta y entendia que le tocaba
 * repetir desde el principio.
 *
 * Tampoco vale numerarlos como semestres del pensum -"Semestre 5, 6, 7"-
 * porque un semestre del plan mezcla materias de varios: puedes llevar a la
 * vez algo de tercero y algo de quinto. Se nombran por lo unico que son de
 * verdad, pasos hacia adelante desde hoy, y asi no se pueden confundir.
 */
export const etiquetaSemestre = (n) => (n === 1 ? 'Próximo semestre' : `En ${n} semestres`)

/**
 * Mes aproximado de grado, contando dos semestres por año desde hoy.
 * Es aritmetica de calendario, no el cronograma oficial de la UDO: no
 * contempla retrasos de inicio, intensivos ni semestres perdidos.
 */
export function mesEstimadoGrado(semestres, desde = new Date()) {
  if (!semestres) return null
  const fecha = new Date(desde)
  fecha.setMonth(fecha.getMonth() + semestres * 6)
  return fecha
}

/* Lo que solo depende del pensum y no del avance: el grafo, cuanto cuelga de
   cada materia y su cadena mas larga. Se calcula una vez por carrera y se
   reutiliza en cada movimiento del mando de carga, que recalcula el plan
   entero decenas de veces mientras se arrastra. */
const analisisPorPensum = new WeakMap()

function analizarPensum(asignaturas, grupos) {
  const guardado = analisisPorPensum.get(asignaturas)
  if (guardado?.grupos === grupos) return guardado

  const electivas = grupos.flatMap((g) =>
    g.asignaturas.map((a) => ({ ...a, grupo: g.clave, esElectiva: true })),
  )
  const relaciones = construirRelaciones([...asignaturas, ...electivas])
  const alturas = new Map()

  /* Cuantos semestres hacen falta, como minimo, para cursar esta materia y
     todo lo que cuelga de ella: ella misma mas la cadena mas larga que
     desbloquea. Es lo que de verdad marca la urgencia. Contar cuantas
     materias cuelgan, como antes, premiaba a Fisica II -que abre ocho
     materias pero en una cadena corta- frente a cadenas mas largas. */
  const altura = (codigo, enCurso = new Set()) => {
    if (alturas.has(codigo)) return alturas.get(codigo)
    // Un ciclo no deberia existir -el validador lo impide-, pero no cuelga
    if (enCurso.has(codigo)) return 0
    enCurso.add(codigo)
    const siguientes = relaciones.adelante.get(codigo) ?? []
    const h = 1 + Math.max(0, ...siguientes.map((s) => altura(s, enCurso)))
    enCurso.delete(codigo)
    alturas.set(codigo, h)
    return h
  }

  const analisis = { grupos, electivas, altura, desbloquea: pesoDesbloqueo(relaciones) }
  analisisPorPensum.set(asignaturas, analisis)
  return analisis
}

/**
 * Las electivas que entran en el plan: solo las que hacen falta para cubrir
 * la cuota de cada grupo, porque meter las 39 de Sistemas daria un plan
 * absurdo de 20 semestres.
 *
 * Cada una se ancla al semestre de su casilla en el pensum. Asi la regla de
 * nivel las trata como lo que son -la humanistica de segundo no es de
 * noveno- y no quedan todas apelotonadas al final.
 */
function electivasDelPlan(asignaturas, grupos, hechas, elegidas) {
  const escogidas = new Set(Object.values(elegidas))
  const semestreCasilla = new Map(
    asignaturas.filter((a) => a.esHueco).map((a) => [a.codigo, a.semestre]),
  )
  // Donde puso el estudiante cada electiva que eligio en el mapa
  const semestreEscogida = new Map(
    Object.entries(elegidas).map(([casilla, electiva]) => [electiva, semestreCasilla.get(casilla)]),
  )
  const sugeridas = []

  for (const g of grupos) {
    const deGrupo = (e, semestre = null) => ({
      ...e,
      grupo: g.clave,
      esElectiva: true,
      semestre: semestreEscogida.get(e.codigo) ?? semestre,
    })

    /* Un grupo sin cuota no aporta nada: pasa en las carreras de las que no
       tenemos los creditos oficiales, y en secciones informativas como Areas
       de Grado, donde nadie sabe cuantas hay que elegir. Inventar un numero
       seria peor que omitirlas. Pero las que el estudiante puso en su mapa
       si entran: ya decidio cursarlas, y un plan que las ignorara le diria
       que se gradua antes de lo que de verdad va a tardar. */
    if (g.cuota == null) {
      for (const e of g.asignaturas) {
        if (escogidas.has(e.codigo) && !hechas.has(e.codigo)) sugeridas.push(deGrupo(e))
      }
      continue
    }

    const casillas = asignaturas
      .filter((a) => a.esHueco && a.grupo === g.clave)
      .map((a) => a.semestre)
      .sort((x, y) => x - y)
    const hechasDelGrupo = g.asignaturas.filter((e) => hechas.has(e.codigo))
    let falta = g.cuota - hechasDelGrupo.reduce((s, e) => s + (e.uc ?? 0), 0)
    // Las ya cursadas ocupan las primeras casillas
    let casilla = hechasDelGrupo.length

    /* Las que ya eligio en el mapa van primero, y eso manda sobre todo lo
       demas: si puso "Simulacion de Sistemas" en una casilla, su plan tiene
       que decir esa y no la que a nosotros nos parezca mas comoda. Despues,
       las mas baratas y sin prerrequisitos: cubren la cuota estorbando lo
       menos posible. */
    const candidatas = g.asignaturas
      .filter((e) => !hechas.has(e.codigo))
      .sort(
        (a, b) =>
          (escogidas.has(b.codigo) ? 1 : 0) - (escogidas.has(a.codigo) ? 1 : 0) ||
          (a.prerrequisitos?.length ?? 0) - (b.prerrequisitos?.length ?? 0) ||
          (b.uc ?? 0) - (a.uc ?? 0),
      )

    for (const e of candidatas) {
      if (falta <= 0) break
      sugeridas.push(deGrupo(e, casillas[Math.min(casilla, casillas.length - 1)] ?? null))
      casilla += 1
      falta -= e.uc ?? 0
    }
  }

  return sugeridas
}

/**
 * Arma un plan semestre a semestre desde donde estas hoy.
 *
 * Las reglas, en el orden en que pesan:
 *
 *   1. Nunca se salta una prelacion.
 *   2. Lo que estas cursando cuenta como hecho: el plan empieza el semestre
 *      que viene. Antes se volvia a proponer como "Proximo semestre", y la
 *      fecha de grado salia un semestre mas tarde de la cuenta.
 *   3. Quien no tiene nada marcado es nuevo ingreso, y su primer semestre es
 *      el bloque entero de primero, tal como lo inscribe la UDO: con la
 *      Extraacademica y la Quimica, aunque pase del tope.
 *   4. Nada a mas de VENTANA_NIVEL semestres de tu obligatoria mas atrasada.
 *   5. Primero lo que esta en la cadena mas larga hasta el grado. Esa cadena
 *      cuenta tambien la regla de nivel: una materia de cuarto que no abre
 *      nada sigue frenando todo lo de septimo mientras este pendiente, asi
 *      que no se puede dejar para el final.
 *
 * La carga se da en UC o en numero de materias: quien solo puede con dos
 * materias quiere saber cuales dos, no cuantas UC son.
 *
 * Cada materia sale con lo que hace falta para explicar por que esta ahi:
 * su cadena, cuantas desbloquea, si frena el nivel y si es clave -esta en la
 * cadena mas larga de lo que queda, la que marca cuantos semestres faltan
 * como minimo-.
 *
 * Es una funcion pura: mismas marcas y misma carga, mismo plan.
 */
export function planificar({
  asignaturas,
  grupos = [],
  marcas = {},
  elegidas = {},
  carga = { unidad: 'uc', valor: 16 },
}) {
  const { electivas, altura, desbloquea } = analizarPensum(asignaturas, grupos)
  const todas = [...asignaturas, ...electivas]
  const hechas = new Set(
    todas
      .filter((a) => marcas[a.codigo] === ESTADO.APROBADA || marcas[a.codigo] === ESTADO.CURSANDO)
      .map((a) => a.codigo),
  )
  const nuevoIngreso = hechas.size === 0

  /* Una casilla de electiva es un hueco del diagrama, no algo que se pueda
     inscribir. Donde SI sabemos la cuota del grupo, ya se eligieron materias
     concretas para cubrirla, y dejar ademas la casilla contaria dos veces lo
     mismo: el plan de Sistemas salia con ocho "Electiva Sociohumanistica"
     sin UC encima de las siete electivas de verdad.

     Donde no sabemos la cuota no se sugiere nada, y entonces la casilla es
     lo unico que avisa de que ahi falta algo. Esa se queda, salvo que ya
     tenga una electiva puesta: esa electiva entra con nombre. */
  const conCuota = new Set(grupos.filter((g) => g.cuota != null).map((g) => g.clave))
  const casillaYaCubierta = (a) => a.esHueco && (conCuota.has(a.grupo) || elegidas[a.codigo])

  const pendientes = [
    ...asignaturas.filter((a) => !casillaYaCubierta(a) && !hechas.has(a.codigo)),
    ...electivasDelPlan(asignaturas, grupos, hechas, elegidas),
  ]

  // Las que marcan el nivel: obligatorias de verdad, con su semestre
  const marcaNivel = (a) => !a.esElectiva && !a.esHueco && a.semestre != null
  const alturaMaxDesde = (semestre) =>
    Math.max(
      0,
      ...pendientes
        .filter((a) => marcaNivel(a) && a.semestre >= semestre)
        .map((a) => altura(a.codigo)),
    )
  const cadena = new Map(
    pendientes.map((a) => {
      const propia = altura(a.codigo)
      if (!marcaNivel(a)) return [a.codigo, propia]
      const frenadas = alturaMaxDesde(a.semestre + VENTANA_NIVEL + 1)
      return [a.codigo, Math.max(propia, frenadas ? frenadas + 1 : 0)]
    }),
  )

  /* A igualdad de cadena, lo de semestres mas bajos primero, electivas
     incluidas por el semestre de su casilla. Sin eso, las electivas -que no
     abren nada- quedaban para despues del Trabajo de Grado. Y en el mismo
     semestre, la obligatoria antes que la electiva. */
  const antes = (a, b) =>
    cadena.get(b.codigo) - cadena.get(a.codigo) ||
    altura(b.codigo) - altura(a.codigo) ||
    (a.semestre ?? 99) - (b.semestre ?? 99) ||
    (a.esElectiva ? 1 : 0) - (b.esElectiva ? 1 : 0) ||
    (desbloquea.get(b.codigo) ?? 0) - (desbloquea.get(a.codigo) ?? 0) ||
    (b.uc ?? 0) - (a.uc ?? 0)

  const cabe = (elegidasSemestre, uc, a) =>
    carga.unidad === 'materias'
      ? elegidasSemestre.length < carga.valor
      : uc + (a.uc ?? 0) <= carga.valor

  const semestres = []
  let restantes = [...pendientes]

  // Tope de vueltas: si el grafo tuviera un ciclo esto evita colgar el hilo.
  // El validador ya garantiza que no lo hay, pero la funcion no depende de eso.
  while (restantes.length && semestres.length < 60) {
    const disponibles = restantes.filter((a) =>
      (a.prerrequisitos ?? []).every((pre) => hechas.has(pre)),
    )
    if (!disponibles.length) break

    const nivel = Math.min(...restantes.filter(marcaNivel).map((a) => a.semestre))
    const enNivel = disponibles.filter(
      (a) => a.semestre == null || a.semestre <= nivel + VENTANA_NIVEL,
    )
    // Si el nivel no deja nada -datos raros-, mejor avanzar que atascarse
    const candidatas = (enNivel.length ? enNivel : disponibles).sort(antes)

    let elegidasSemestre = []
    if (nuevoIngreso && !semestres.length) {
      elegidasSemestre = candidatas.filter((a) => marcaNivel(a) && a.semestre === nivel)
    }
    if (!elegidasSemestre.length) {
      let uc = 0
      for (const a of candidatas) {
        // Siempre entra al menos una, aunque supere el tope: si no, una
        // materia de 6 UC con tope 4 dejaria el plan atascado para siempre.
        if (!elegidasSemestre.length || cabe(elegidasSemestre, uc, a)) {
          elegidasSemestre.push(a)
          uc += a.uc ?? 0
        }
      }
    }

    // La cadena mas larga de lo que queda: lo que esta en ella es clave
    const cadenaMasLarga = Math.max(
      ...restantes.filter((a) => !a.esElectiva).map((a) => cadena.get(a.codigo)),
    )
    const materias = elegidasSemestre.map((a) => {
      const suya = cadena.get(a.codigo)
      return {
        ...a,
        cadena: suya,
        desbloquea: desbloquea.get(a.codigo) ?? 0,
        clave: !a.esElectiva && suya >= cadenaMasLarga,
        // Si es urgente por el nivel y no por lo que abre: que frena
        frenaDesde: suya > altura(a.codigo) ? a.semestre + VENTANA_NIVEL + 1 : null,
      }
    })

    semestres.push({
      numero: semestres.length + 1,
      materias,
      uc: materias.reduce((s, a) => s + (a.uc ?? 0), 0),
    })
    for (const a of materias) hechas.add(a.codigo)
    restantes = restantes.filter((a) => !hechas.has(a.codigo))
  }

  return {
    semestres,
    nuevoIngreso,
    // Si algo queda fuera es que sus prerrequisitos no se pueden satisfacer
    sinUbicar: restantes,
    ucRestantes: pendientes.reduce((s, a) => s + (a.uc ?? 0), 0),
    materiasRestantes: pendientes.length,
  }
}
