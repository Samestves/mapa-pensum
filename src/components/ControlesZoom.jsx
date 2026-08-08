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

function Dock({ children, clase }) {
  return (
    <div
      className={`transicion-tema absolute z-20 flex overflow-hidden rounded-xl border border-panel-borde bg-panel/85 backdrop-blur ${clase}`}
    >
      {children}
    </div>
  )
}

/**
 * Dock de zoom: acercar, alejar y encajar en pantalla. Va fijo abajo a la
 * derecha del lienzo.
 */
export default function ControlesZoom({ acercar, alejar, encajar }) {
  return (
    <Dock clase="right-4 bottom-4 flex-col divide-y divide-panel-borde">
      <BotonDock icono={Plus} titulo="Acercar" alPulsar={acercar} />
      <BotonDock icono={Minus} titulo="Alejar" alPulsar={alejar} />
      <BotonDock icono={Maximize} titulo="Encajar en pantalla" alPulsar={encajar} />
    </Dock>
  )
}
