import { ESTADO } from '../hooks/usePensum'

// Estimacion para traducir horas de estudio a carga academica. Una UC de la
// UDO ronda una hora de clase semanal, y la regla de oro es dedicarle unas
// dos de estudio por cada hora de aula. NO es un dato oficial: sirve para
// sugerir un tope, no para decidir por el estudiante.
export const HORAS_POR_UC = 3

export const ucSugeridas = (horasSemana) =>
  Math.max(4, Math.min(30, Math.round(horasSemana / HORAS_POR_UC)))

/**
 * Arma un plan semestre a semestre desde donde estas hoy.
 *
 * En cada semestre coge las asignaturas que ya puedes inscribir y prioriza
 * las que mas cosas desbloquean: dejar para el final una materia de la que
 * cuelga media carrera es lo que alarga el pensum.
 *
 * Es una funcion pura: mismas marcas y mismo tope, mismo plan.
 */
export function planificar(asignaturas, marcas, estados, pesos, ucPorSemestre) {
  const aprobadas = new Set(
    asignaturas.filter((a) => marcas[a.codigo] === ESTADO.APROBADA).map((a) => a.codigo),
  )
  const pendientes = asignaturas.filter((a) => !aprobadas.has(a.codigo))

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

      if (a.semestre !== b.semestre) return a.semestre - b.semestre
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
