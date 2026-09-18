/**
 * Formatos y cuentas del panel: fechas en hora de Venezuela, porcentajes y
 * el tinte con que se colorea todo. Aparte de las piezas para que React
 * pueda recargarlas en caliente, que solo sabe hacerlo con archivos que
 * exportan componentes y nada mas.
 */

export const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
// Para las frases: "el jueves" se lee, "el jue" no
export const DIAS_LARGOS = [
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
  'domingo',
]
export const VERDE = 'var(--estado-aprobada)'
const ZONA = 'America/Caracas'

export const mesLargo = (iso) =>
  new Date(`${iso}-01T12:00:00Z`).toLocaleDateString('es-VE', { month: 'long', timeZone: 'UTC' })
export const diaCorto = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  })
export const diaLargo = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-VE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
export const fechaHora = (instante) =>
  new Date(instante).toLocaleString('es-VE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: ZONA,
  })
export const hora = (h) => `${String(h).padStart(2, '0')}:00`

const relativo = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

/** "hace 3 h", "ayer", "hace 5 días": lo que se entiende de un vistazo */
export function haceCuanto(instante, ahora = Date.now()) {
  const ms = ahora - new Date(instante).getTime()
  if (!Number.isFinite(ms)) return '—'
  const minutos = Math.round(ms / 60000)
  if (minutos < 2) return 'ahora mismo'
  if (minutos < 60) return relativo.format(-minutos, 'minute')
  const horas = Math.round(minutos / 60)
  if (horas < 24) return relativo.format(-horas, 'hour')
  return relativo.format(-Math.round(horas / 24), 'day')
}

/** Suma los valores de un objeto de contadores */
export const total = (objeto) => Object.values(objeto ?? {}).reduce((s, n) => s + n, 0)

/** Cuanto cambio algo, en porcentaje, o null si antes no habia con que comparar */
export const variacion = (ahora, antes) =>
  antes > 0 ? Math.round(((ahora - antes) / antes) * 100) : null

/** Un color con la fuerza que se pida, sobre el fondo de las tarjetas */
export const tinte = (color, fuerza) =>
  `color-mix(in oklab, ${color} ${Math.round(Math.min(Math.max(fuerza, 0), 1) * 100)}%, var(--panel))`
