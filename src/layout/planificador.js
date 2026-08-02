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
export function planificar(
  asignaturas,
  marcas,
  estados,
  pesos,
  ucPorSemestre,
  electivas = [],
  cuotas = null,
) {
  const todas = [...asignaturas, ...electivas]
  const aprobadas = new Set(
    todas.filter((a) => marcas[a.codigo] === ESTADO.APROBADA).map((a) => a.codigo),
  )

  // Cuanta electiva falta por cubrir de cada cuota. Solo se planifican las
  // que hagan falta: meter las 39 daria un plan absurdo de 20 semestres.
  const faltaCuota = {
    tecnica: Math.max(
      0,
      (cuotas?.electivasTecnicas ?? 0) -
        electivas
          .filter((e) => e.tipo === 'tecnica' && aprobadas.has(e.codigo))
          .reduce((s, e) => s + e.uc, 0),
    ),
    humanistica: Math.max(
      0,
      (cuotas?.electivasHumanisticas ?? 0) -
        electivas
          .filter((e) => e.tipo === 'humanistica' && aprobadas.has(e.codigo))
          .reduce((s, e) => s + e.uc, 0),
    ),
  }

  // Se eligen las electivas mas baratas y sin prerrequisitos primero: son
  // las que cubren la cuota estorbando lo menos posible.
  const sugeridas = []
  for (const tipo of ['tecnica', 'humanistica']) {
    let falta = faltaCuota[tipo]
    const candidatas = electivas
      .filter((e) => e.tipo === tipo && !aprobadas.has(e.codigo))
      .sort(
        (a, b) =>
          (a.prerrequisitos?.length ?? 0) - (b.prerrequisitos?.length ?? 0) || b.uc - a.uc,
      )
    for (const e of candidatas) {
      if (falta <= 0) break
      sugeridas.push(e)
      falta -= e.uc
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
      const electivaA = a.tipo ? 1 : 0
      const electivaB = b.tipo ? 1 : 0
      if (electivaA !== electivaB) return electivaA - electivaB

      if (a.semestre !== b.semestre) return (a.semestre ?? 99) - (b.semestre ?? 99)
      return b.uc - a.uc
    })

    const elegidas = []
    let uc = 0
    for (const a of inscribibles) {
      // Siempre entra al menos una, aunque su UC supere el tope: si no, una
      // materia de 6 UC con tope 4 dejaria el plan atascado para siempre.
      if (!elegidas.length || uc + a.uc <= ucPorSemestre) {
        elegidas.push(a)
        uc += a.uc
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
    ucRestantes: pendientes.reduce((s, a) => s + a.uc, 0),
    materiasRestantes: pendientes.length,
  }
}
