import { Plus } from 'lucide-react'
import { ABRE } from '../layout/horario'

/**
 * El hueco que se propone: donde caeria una clase si se pulsa ahi.
 *
 * Sale en las dos rejillas por motivos distintos. En escritorio sigue al
 * raton, porque ahi hay un puntero al que responder. En el telefono no hay
 * hover, asi que se planta en el primer hueco libre del dia: sin nada, la
 * rejilla parece un dibujo y no se sabe que responde.
 *
 * Estaba escrito dos veces, y eso ya costo caro: al hacerlo opaco -la marca
 * de la hora del telefono se transparentaba y salia un "9" flotando dentro
 * del recuadro- hubo que tocar los dos sitios, y de no haberme acordado del
 * segundo, escritorio y telefono habrian quedado con distinta opacidad para
 * la misma cosa. Dos copias de una pieza no divergen el dia que se escriben,
 * divergen el dia que se corrige una.
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
        height: (franja.fin - franja.inicio) * pxPorMinuto - 5,
      }}
      className={`hueco-propuesto pointer-events-none absolute ${sangria} flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[var(--horario-linea)] ${clase}`}
    >
      <span className="grid size-6 place-items-center rounded-full border border-tinta-tenue/40 text-tinta-tenue">
        <Plus size={13} strokeWidth={1.75} />
      </span>
      <span className="text-[11px] font-semibold tracking-wide text-tinta-tenue">{etiqueta}</span>
    </span>
  )
}

export default HuecoPropuesto
