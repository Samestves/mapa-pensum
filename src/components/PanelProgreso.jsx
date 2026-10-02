import Popover from './Popover'
import ContenidoAvance from './ContenidoAvance'

const ANCHO = 368

/**
 * El avance de la carrera en ESCRITORIO, colgado de la capsula que lo abre.
 *
 * Dice lo mismo que la hoja del telefono, con el mismo diseño: el porcentaje,
 * como esta repartida la carrera, cuando te gradúas y la puerta al plan (ver
 * ContenidoAvance). Antes era otro panel, con su propio porcentaje en verde,
 * un boton macizo para planificar y las electivas plegadas: dos interfaces
 * para el mismo dato, y la de escritorio se habia quedado atras.
 *
 * Lo unico que tiene de mas es lo que solo sirve con el mapa a la vista
 * detras: aislar un area.
 *
 * Es una nubecita anclada a la capsula, la misma pieza que el menu de una
 * clase en el horario (ver Popover): colgar de lo que la abrio dice de donde
 * salio y a que pertenece. Se cierra pulsando fuera o con Escape.
 */
function PanelProgreso({ abierto, ancla, alCerrar, carrera, ...avance }) {
  if (!abierto || !ancla) return null

  return (
    <Popover
      ancla={ancla}
      ancho={ANCHO}
      etiqueta="Tu avance"
      alCerrar={alCerrar}
      claseContenido="flex max-h-[min(80vh,42rem)] flex-col overflow-y-auto overscroll-contain"
    >
      <header className="px-5 pt-5 pb-4">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-tinta-tenue uppercase">
          Tu avance
        </p>
        <h2 className="mt-1 text-[16px] leading-snug font-semibold tracking-[-0.01em] text-tinta">
          {carrera.nombre}
        </h2>
      </header>
      <div className="px-5 pb-5">
        <ContenidoAvance carrera={carrera} {...avance} />
      </div>
    </Popover>
  )
}

export default PanelProgreso
