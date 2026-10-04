import { Plus } from 'lucide-react'
import { ABRE, HUECO_CELDA } from '../layout/horario'

/**
 * El hueco que se propone en la rejilla de la semana: donde caeria una clase
 * si se pulsa ahi. Sigue al raton, porque ahi hay un puntero al que responder.
 *
 * Neutro y de trazo fino, no un boton verde relleno: es una pista de que ahi
 * se puede crear algo, no una accion consumada. Si pesara mas que las clases
 * ya puestas competiria con lo unico que importa. El color sale de la tinta
 * del tema, asi que sirve igual en claro y en oscuro sin definir nada aparte.
 *
 * No recibe toques: se los queda el contenedor. Asi se puede pulsar encima de
 * el o en cualquier otra hora libre, y las dos cosas hacen lo mismo.
 */
function HuecoPropuesto({ franja, pxPorMinuto, etiqueta, sangria = 'inset-x-1.5', clase = '' }) {
  return (
    <span
      aria-hidden="true"
      style={{
        top: (franja.inicio - ABRE) * pxPorMinuto,
        height: (franja.fin - franja.inicio) * pxPorMinuto - HUECO_CELDA,
      }}
      className={`hueco-propuesto pointer-events-none absolute ${sangria} flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[var(--horario-linea)] ${clase}`}
    >
      <span className="grid size-6 place-items-center rounded-full border border-tinta-tenue/40 text-tinta-tenue">
        <Plus size={13} strokeWidth={1.75} />
      </span>
      <span className="text-[11px] font-medium tracking-wide text-tinta-tenue">{etiqueta}</span>
    </span>
  )
}

export default HuecoPropuesto
