import { IconoEncajar, IconoMas, IconoMenos } from './IconosSF'

/* Las tres teclas comparten una isla de cristal, como el grupo de la
   cabecera: una pieza con zonas y no tres botones sueltos. Cada una responde
   al gesto con un fondo casi invisible y se hunde al pulsarla. */
function BotonDock({ icono: Icono, titulo, alPulsar }) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      onClick={alPulsar}
      className="group grid size-9 place-items-center rounded-full text-tinta-suave transition-[color,background-color,transform] duration-150 hover:bg-tinta/[0.09] hover:text-tinta active:scale-[0.9]"
    >
      <Icono
        size={17}
        className="transition-transform duration-200 group-hover:scale-110"
      />
    </button>
  )
}

/**
 * Dock de zoom de ESCRITORIO: acercar, alejar y encajar en pantalla. Va fijo
 * abajo a la derecha del lienzo, en una capsula vertical de cristal. En el
 * telefono no sale: alli el zoom es el pellizco y el doble toque.
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
      className="dock-lienzo barra-cristal absolute right-4 bottom-4 z-20 flex flex-col items-center gap-px rounded-full p-1"
    >
      <BotonDock icono={IconoMas} titulo="Acercar" alPulsar={acercar} />
      <span aria-hidden="true" className="h-px w-4 shrink-0 rounded-full bg-tinta/15" />
      <BotonDock icono={IconoMenos} titulo="Alejar" alPulsar={alejar} />
      <span aria-hidden="true" className="h-px w-4 shrink-0 rounded-full bg-tinta/15" />
      <BotonDock icono={IconoEncajar} titulo="Encajar en pantalla" alPulsar={encajar} />
    </div>
  )
}
