import { ESTADO } from './estados.js'

/**
 * El avance hacia el titulo, de 0 a 100.
 *
 * Donde el pensum trae creditos oficiales es el de UC, que es el que cuenta
 * para graduarse; donde no, el de materias, que es lo unico que se puede
 * saber. Lo usan el anillo de la cabecera y la portada.
 */
export function avanceDe(resumen) {
  if (resumen.porcentaje != null) return resumen.porcentaje
  return resumen.total ? (resumen.aprobadas / resumen.total) * 100 : 0
}

/**
 * El avance de una carrera a partir de sus marcas guardadas, sin montar nada
 * de la vista: lo necesita la portada para iluminar la silueta de cada
 * carrera y decir cuanto llevas en la fila de Continuar.
 *
 * Hace la misma cuenta que usePensum -UC de las obligatorias aprobadas mas
 * las de electivas que caben en su cuota, sobre las UC del titulo-, para que
 * el porcentaje de la portada y el del anillo de la carrera sean el mismo
 * numero.
 *
 * `porSemestre` va en el mismo orden que la silueta del indice: cuantas
 * obligatorias aprobaste de cada semestre, que son los puntos que se
 * encienden de cada columna.
 */
export function avanceGuardado(carrera, marcas) {
  const aprobada = (codigo) => marcas?.[codigo] === ESTADO.APROBADA
  const obligatorias = carrera.asignaturas.filter((a) => !a.esHueco)

  let ucAprobadas = 0
  let aprobadas = 0
  for (const a of obligatorias) {
    if (!aprobada(a.codigo)) continue
    ucAprobadas += a.uc ?? 0
    aprobadas += 1
  }

  const ucElectivas = (carrera.grupos ?? []).reduce((suma, g) => {
    if (g.cuota == null) return suma
    const uc = g.asignaturas.filter((e) => aprobada(e.codigo)).reduce((t, e) => t + (e.uc ?? 0), 0)
    return suma + Math.min(uc, g.cuota)
  }, 0)

  const ucTitulo = carrera.creditos?.titulo ?? null
  const porcentaje = ucTitulo ? ((ucAprobadas + ucElectivas) / ucTitulo) * 100 : null

  return {
    porcentaje: avanceDe({ porcentaje, aprobadas, total: obligatorias.length }),
    aprobadas,
    porSemestre: carrera.semestres.map(
      (s) => obligatorias.filter((a) => a.semestre === s.numero && aprobada(a.codigo)).length,
    ),
  }
}
