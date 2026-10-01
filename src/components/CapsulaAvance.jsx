import { memo } from 'react'
import { avanceDe, cuantoLlevas, describirAvance } from '../data/avance'
import { useNumeroAnimado } from '../hooks/useNumeroAnimado'
import AroAvance from './AroAvance'

/* El aro pequeño cabe dentro de la capsula con 4 px de aire arriba y abajo:
   36 de 44, el alto de la fila. */
const LADO_ARO = 36
const GROSOR_ARO = 2.4

/**
 * El avance en la cabecera de escritorio: una capsula con el aro pequeño a la
 * izquierda -el numero dentro- y al lado que es y cuanto llevas, "TU AVANCE /
 * 17 de 153 UC". Abre el panel de avance, con el tema dentro.
 *
 * Es la isla del telefono (IslaAvance) con el sitio que en el telefono no
 * hay: alli un circulo solo cabe junto a las vistas, y aqui la esquina da
 * para decir las UC sin abrir nada. Y hace de espejo a la capsula del nombre
 * de la carrera, al otro lado de la cabecera: la fila queda simetrica.
 *
 * El numero del aro va sin "%": a 11 px el signo no se leeria, y el texto de
 * al lado ya dice de que es.
 */
function CapsulaAvance({ resumen, abierta, alPulsar, className = '' }) {
  const avance = Math.max(0, Math.min(100, avanceDe(resumen)))
  const numero = Math.round(useNumeroAnimado(avance))
  const detalle = describirAvance(resumen)

  return (
    <button
      type="button"
      onClick={(e) => alPulsar(e.currentTarget)}
      aria-label={detalle}
      aria-expanded={abierta}
      aria-haspopup="dialog"
      className={`barra-cristal pointer-events-auto relative flex h-11 shrink-0 items-center gap-3 rounded-full pr-5 pl-1 transition-transform duration-200 ease-out active:scale-[0.97] ${className}`}
    >
      <span className="relative grid size-9 shrink-0 place-items-center">
        <AroAvance lado={LADO_ARO} grosor={GROSOR_ARO} avance={avance} />
        <span className="relative text-[11.5px] leading-none font-semibold tracking-[-0.03em] text-tinta tabular-nums">
          {numero}
        </span>
      </span>

      <span className="flex flex-col items-start leading-none">
        <span className="text-[9.5px] font-semibold tracking-[0.16em] text-tinta-tenue uppercase">
          Tu avance
        </span>
        <span className="mt-1 text-[13px] font-medium text-tinta tabular-nums">
          {cuantoLlevas(resumen)}
        </span>
      </span>
    </button>
  )
}

export default memo(CapsulaAvance)
