import { Check, CircleDot, Lock } from 'lucide-react'
import { ESTADO } from '../hooks/usePensum'

/**
 * Color representativo de cada estado, como variable CSS.
 * Lo usa la vista de lista (HTML) para el borde del checkbox y el icono.
 * Los nodos SVG no lo usan directamente: alla el borde del aprobado y del
 * cursando lo pone colorBordeEstado, que ademas conoce el acento del area.
 */
export const COLOR_ESTADO = {
  [ESTADO.APROBADA]: 'var(--estado-aprobada)',
  [ESTADO.CURSANDO]: 'var(--estado-cursando)',
  [ESTADO.DISPONIBLE]: 'var(--tinta-suave)',
  [ESTADO.BLOQUEADA]: 'var(--tinta-tenue)',
}

/**
 * Icono de Lucide que representa cada estado, o null si no lleva.
 * Aprobada → check, cursando → punto, bloqueada → candado, disponible → nada.
 */
export const ICONO_ESTADO = {
  [ESTADO.APROBADA]: Check,
  [ESTADO.CURSANDO]: CircleDot,
  [ESTADO.BLOQUEADA]: Lock,
  [ESTADO.DISPONIBLE]: null,
}

/**
 * Color del borde de un nodo segun su estado. Aprobada y cursando tienen
 * color propio; el resto hereda el acento del area (o del tono por
 * profundidad) que ya trae el nodo.
 */
export function colorBordeEstado(estado, acento) {
  if (estado === ESTADO.APROBADA) return 'var(--estado-aprobada)'
  if (estado === ESTADO.CURSANDO) return 'var(--estado-cursando)'
  return acento
}
