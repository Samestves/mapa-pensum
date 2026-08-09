import { Maximize, Minus, Plus } from 'lucide-react'

/* Los controles del lienzo van juntos en un solo bloque con separadores,
   no como botones sueltos flotando: se leen como un mando, no como ruido. */
function BotonDock({ icono: Icono, titulo, alPulsar }) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      onClick={alPulsar}
      className="grid size-9 place-items-center text-tinta-suave transition-colors hover:text-tinta"
    >
      <Icono size={16} />
    </button>
  )
}

/**
 * Dock de zoom: acercar, alejar y encajar en pantalla. Va fijo abajo a la
 * derecha del lienzo.
 *
 * Se atenua cuando el usuario lleva un par de segundos quieto y vuelve entero
 * en cuanto toca el mapa. NO desaparece del todo a proposito: un control que
 * se esfuma deja de existir para quien no sabia que estaba, y estos tres son
 * la unica forma de encajar el mapa si te pierdes con el zoom. Atenuado
 * devuelve la atencion al pensum pero sigue estando a la vista.
 *
 * pointer-events se mantiene siempre: aunque este tenue, un click lo
 * despierta y funciona a la primera. Perder el primer click seria peor que
 * no atenuarlo.
 */
export default function ControlesZoom({ acercar, alejar, encajar, atenuado }) {
  return (
    <div
      data-atenuado={atenuado}
      className="dock-lienzo transicion-tema absolute right-4 bottom-4 z-20 flex flex-col divide-y divide-panel-borde overflow-hidden rounded-xl border border-panel-borde bg-panel/85 backdrop-blur"
    >
      <BotonDock icono={Plus} titulo="Acercar" alPulsar={acercar} />
      <BotonDock icono={Minus} titulo="Alejar" alPulsar={alejar} />
      <BotonDock icono={Maximize} titulo="Encajar en pantalla" alPulsar={encajar} />
    </div>
  )
}
