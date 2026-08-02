import { ESTADO } from '../hooks/usePensum'

// Estimacion para traducir horas de estudio a carga academica. Una UC de la
// UDO ronda una hora de clase semanal, y la regla de oro es dedicarle unas
// dos de estudio por cada hora de aula. NO es un dato oficial: sirve para
// sugerir un tope, no para decidir por el estudiante.
export const HORAS_POR_UC = 3

export const ucSugeridas = (horasSemana) =>
  Math.max(4, Math.min(30, Math.round(horasSemana / HORAS_POR_UC)))

export const horasDe = (uc) => uc * HORAS_POR_UC

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

/**
 * Arma un plan semestre a semestre desde donde estas hoy.
 *
 * En cada semestre coge las asignaturas que ya puedes inscribir y prioriza
 * las que mas cosas desbloquean: dejar para el final una materia de la que
 * cuelga media carrera es lo que alarga el pensum.
 *
 * Es una funcion pura: mismas marcas y mismo tope, mismo plan.
 */
export function planificar(asignaturas, marcas, estados, pesos, ucPorSemestre, grupos = []) {
  const electivas = grupos.flatMap((g) =>
    g.asignaturas.map((a) => ({ ...a, grupo: g.clave, esElectiva: true })),
  )
  const todas = [...asignaturas, ...electivas]
  const aprobadas = new Set(
    todas.filter((a) => marcas[a.codigo] === ESTADO.APROBADA).map((a) => a.codigo),
  )

  // Solo se planifican las electivas que hagan falta para cubrir cuota: meter
  // las 39 de Sistemas daria un plan absurdo de 20 semestres.
  //
  // Un grupo sin cuota no aporta nada al plan. Pasa en las carreras de las
  // que no tenemos los creditos oficiales, y en las secciones informativas
  // como Areas de Grado, donde nadie sabe cuantas hay que elegir. Inventar
  // un numero seria peor que omitirlas.
  const sugeridas = []
  for (const g of grupos) {
    if (g.cuota == null) continue

    const yaCubierto = g.asignaturas
      .filter((e) => aprobadas.has(e.codigo))
      .reduce((s, e) => s + (e.uc ?? 0), 0)
    let falta = Math.max(0, g.cuota - yaCubierto)

    // Las mas baratas y sin prerrequisitos primero: cubren la cuota
    // estorbando lo menos posible.
    const candidatas = g.asignaturas
      .filter((e) => !aprobadas.has(e.codigo))
      .sort(
        (a, b) =>
          (a.prerrequisitos?.length ?? 0) - (b.prerrequisitos?.length ?? 0) ||
          (b.uc ?? 0) - (a.uc ?? 0),
      )

    for (const e of candidatas) {
      if (falta <= 0) break
      sugeridas.push({ ...e, grupo: g.clave, esElectiva: true })
      falta -= e.uc ?? 0
    }
  }

  const pendientes = [
    ...asignaturas.filter((a) => !aprobadas.has(a.codigo)),
    ...sugeridas,
  ]

  const semestres = []
  let restantes = [...pendientes]
  // Tope de vueltas: si el grafo tuviera un ciclo esto evita colgar el hilo.
  // El validador ya garantiza que no lo hay, pero la funcion no depende de eso.
  let vueltas = 0

  while (restantes.length && vueltas < 40) {
    vueltas += 1

    const inscribibles = restantes.filter((a) =>
      (a.prerrequisitos ?? []).every((pre) => aprobadas.has(pre)),
    )
    if (!inscribibles.length) break

    inscribibles.sort((a, b) => {
      // Lo que ya estas cursando entra primero: ya lo empezaste
      const cursandoA = estados[a.codigo] === ESTADO.CURSANDO ? 0 : 1
      const cursandoB = estados[b.codigo] === ESTADO.CURSANDO ? 0 : 1
      if (cursandoA !== cursandoB) return cursandoA - cursandoB

      const pesoA = pesos.get(a.codigo) ?? 0
      const pesoB = pesos.get(b.codigo) ?? 0
      if (pesoA !== pesoB) return pesoB - pesoA

      // Las electivas van al final: son de relleno, no marcan el camino
      const electivaA = a.esElectiva ? 1 : 0
      const electivaB = b.esElectiva ? 1 : 0
      if (electivaA !== electivaB) return electivaA - electivaB

      if (a.semestre !== b.semestre) return (a.semestre ?? 99) - (b.semestre ?? 99)
      return (b.uc ?? 0) - (a.uc ?? 0)
    })

    const elegidas = []
    let uc = 0
    for (const a of inscribibles) {
      // Siempre entra al menos una, aunque su UC supere el tope: si no, una
      // materia de 6 UC con tope 4 dejaria el plan atascado para siempre.
      if (!elegidas.length || uc + (a.uc ?? 0) <= ucPorSemestre) {
        elegidas.push(a)
        uc += a.uc ?? 0
      }
    }

    semestres.push({ numero: semestres.length + 1, materias: elegidas, uc })
    for (const a of elegidas) aprobadas.add(a.codigo)
    restantes = restantes.filter((a) => !aprobadas.has(a.codigo))
  }

  return {
    semestres,
    // Si algo queda fuera es que sus prerrequisitos no se pueden satisfacer
    sinUbicar: restantes,
    ucRestantes: pendientes.reduce((s, a) => s + (a.uc ?? 0), 0),
    materiasRestantes: pendientes.length,
  }
}
