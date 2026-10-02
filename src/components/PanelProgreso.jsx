import { X } from 'lucide-react'
import PanelLateral from './PanelLateral'
import ContenidoAvance from './ContenidoAvance'

/**
 * El avance de la carrera en ESCRITORIO: el panel lateral que entra por la
 * derecha (ver PanelLateral), con lo mismo que la hoja del telefono (ver
 * ContenidoAvance).
 *
 * Antes era una nubecita colgada de la capsula, que crecia con su contenido
 * y acababa con barra de desplazamiento. De lado y de alto fijo se lee de un
 * vistazo, y deja el mapa a la vista: lo unico que tiene de mas que en el
 * telefono es aislar un area, y eso solo sirve viendo el mapa detras.
 */
function PanelProgreso({ abierto, alCerrar, carrera, ...avance }) {
  return (
    <PanelLateral
      abierto={abierto}
      alCerrar={alCerrar}
      etiqueta="Tu avance"
      cabecera={
        <header className="flex items-start justify-between gap-3 px-6 pt-6 pb-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-tinta-tenue uppercase">
              Tu avance
            </p>
            <h2 className="mt-1 text-[17px] leading-snug font-semibold tracking-[-0.01em] text-tinta">
              {carrera.nombre}
            </h2>
          </div>
          <button
            type="button"
            onClick={alCerrar}
            aria-label="Cerrar"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-tinta/[0.08] text-tinta-suave transition-[background-color,color,transform] hover:bg-tinta/[0.12] hover:text-tinta active:scale-90"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </header>
      }
    >
      <div className="px-6 pb-8">
        <ContenidoAvance carrera={carrera} {...avance} />
      </div>
    </PanelLateral>
  )
}

export default PanelProgreso
