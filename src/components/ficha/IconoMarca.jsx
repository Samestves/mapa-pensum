import { ESTADO } from '../../data/estados'
import { SITUACION } from '../../layout/situacion'

import { IconoSituacion } from '../IconoSituacion'

/* El aro vacio de «sin cursar», de la misma familia que los otros dos:
   mismo radio y mismo trazo, sin nada dentro. */
function AroVacio({ size = 15 }) {
  return (
    <svg viewBox="0 0 14 14" width={size} height={size} aria-hidden="true" focusable="false">
      <circle cx={7} cy={7} r={5.6} fill="none" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  )
}

/** El icono de una de las tres marcas: aprobada, cursando o sin cursar */
export default function IconoMarca({ marca, size }) {
  return marca === ESTADO.APROBADA ? (
    <IconoSituacion situacion={SITUACION.HECHA} size={size} />
  ) : marca === ESTADO.CURSANDO ? (
    <IconoSituacion situacion={SITUACION.CURSANDO} size={size} />
  ) : (
    <AroVacio size={size} />
  )
}
