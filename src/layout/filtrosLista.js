import { SITUACION } from './situacion.js'

/* Los filtros son las preguntas que se le hacen a una lista de materias: que
   puedo inscribir, que llevo, que me falta y que ya pase. Cada uno con el
   mismo icono que llevan las filas, para que filtro y fila se reconozcan. */
export const FILTROS = [
  { id: 'todo', entra: () => true },
  {
    id: 'disponibles',
    situacion: SITUACION.INSCRIBIBLE,
    entra: (s) => s === SITUACION.INSCRIBIBLE,
  },
  { id: 'cursando', situacion: SITUACION.CURSANDO, entra: (s) => s === SITUACION.CURSANDO },
  {
    id: 'pendientes',
    situacion: SITUACION.LEJANA,
    entra: (s) => s === SITUACION.PROXIMA || s === SITUACION.LEJANA,
  },
  { id: 'aprobadas', situacion: SITUACION.HECHA, entra: (s) => s === SITUACION.HECHA },
]
export const NOMBRE_FILTRO = {
  todo: 'Todas',
  disponibles: 'Disponibles',
  cursando: 'Cursando',
  pendientes: 'Pendientes',
  aprobadas: 'Aprobadas',
}

/** Si la materia sigue cerrada: le falta algo, hoy o mas adelante */
export const bloqueada = (s) => s === SITUACION.PROXIMA || s === SITUACION.LEJANA

/** Cuantas materias de `situaciones` entra en cada filtro, por id de filtro */
export const cuentasPorFiltro = (situaciones) =>
  Object.fromEntries(FILTROS.map((f) => [f.id, situaciones.filter(f.entra).length]))
