import { etiquetaSemestre } from '../layout/planificador'
import { textoCarga } from './cargaPlan'

const MESES_CORTOS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
]

/** "Octubre de 2030" */
export const MES = (fecha) => {
  const texto = fecha?.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : ''
}

/** "Oct 2030": la fecha de grado cuando va en grande y tiene que caber */
export const mesCorto = (fecha) => `${MESES_CORTOS[fecha.getMonth()]} ${fecha.getFullYear()}`

/**
 * La ruta en un mensaje, para mandarla por WhatsApp o donde sea: la fecha y,
 * una linea por semestre, que materias van. Sin codigos ni UC sueltas: quien
 * lo lee en un chat quiere el orden, no la ficha de cada materia.
 */
export function textoDeLaRuta({ carrera, plan, carga, grado }) {
  const semestres = plan.semestres.length
  return [
    `Mi ruta al grado · ${carrera.nombre}`,
    `Me gradúo hacia ${MES(grado).toLowerCase()}: ${semestres} ${
      semestres === 1 ? 'semestre' : 'semestres'
    } con ${textoCarga(carga)}.`,
    '',
    ...plan.semestres.map(
      (s) => `${etiquetaSemestre(s.numero)}: ${s.materias.map((a) => a.nombre).join(', ')}`,
    ),
    '',
    'Arma la tuya en https://mapa-pensum.vercel.app',
  ].join('\n')
}

/**
 * Comparte la ruta con la hoja de compartir del sistema y, donde no la hay
 * -casi todos los navegadores de escritorio-, la copia al portapapeles.
 * Devuelve lo que hizo para que el boton lo diga, o null si no hizo nada:
 * cerrar la hoja de compartir no es un error.
 */
export async function compartirTexto(texto) {
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Mi ruta al grado', text: texto })
      return 'compartido'
    } catch (error) {
      if (error.name === 'AbortError') return null
    }
  }
  try {
    await navigator.clipboard.writeText(texto)
    return 'copiado'
  } catch {
    return null
  }
}
