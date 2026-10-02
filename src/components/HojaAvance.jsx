import { X } from 'lucide-react'
import HojaInferior from './HojaInferior'
import ContenidoAvance from './ContenidoAvance'

/**
 * El avance en el TELEFONO: una hoja que sube desde la isla de abajo. Lo que
 * dice es lo mismo que el panel de escritorio (ver ContenidoAvance); aqui
 * solo vive el marco, que se arrastra con el pulgar.
 *
 * Sin el filtro por areas: es una herramienta del mapa, y con la hoja
 * abierta en un telefono el mapa no se ve detras.
 */
function HojaAvance({ abierta, alCerrar, carrera, ...avance }) {
  return (
    <HojaInferior
      abierta={abierta}
      alCerrar={alCerrar}
      etiqueta="Tu avance"
      cabecera={
        <header className="flex items-start justify-between gap-3 px-5 pt-1 pb-4">
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
            className="grid size-8 shrink-0 place-items-center rounded-full bg-tinta/[0.08] text-tinta-suave transition-transform active:scale-90"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </header>
      }
    >
      <div className="px-5 pb-5">
        <ContenidoAvance carrera={carrera} {...avance} />
      </div>
    </HojaInferior>
  )
}

export default HojaAvance
