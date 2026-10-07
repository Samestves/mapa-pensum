import { useCerrarConEscape } from '../../hooks/useCerrarConEscape'

import { ALTO_HOJA, ANCHO_HOJA } from '../HojaPlan'
import VisorHoja from '../VisorHoja'

import Cabecera from './Cabecera'

/**
 * Escritorio: la ruta a la izquierda y la hoja de papel a la derecha, tal
 * como va a salir, en un visor para acercarla y recorrerla (ver VisorHoja).
 * Se ve lo que se imprime antes de imprimirlo.
 */
export default function Ventana({ carrera, alCerrar, cuerpo, acciones, children }) {
  useCerrarConEscape(alCerrar)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={alCerrar}
        className="absolute inset-0 cursor-default bg-black/60"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tu ruta"
        className="surgir relative flex h-full max-h-[56rem] w-full max-w-6xl overflow-hidden rounded-[28px] border border-panel-borde bg-panel shadow-2xl"
      >
        <div className="flex w-[25rem] shrink-0 flex-col border-r border-panel-borde">
          <div className="pt-4">
            <Cabecera carrera={carrera} alCerrar={alCerrar} />
          </div>
          {/* El hueco de la barra sale del margen derecho, no se le suma:
              lo de dentro sigue alineado con la cabecera y con el pie. */}
          <div className="desplazable-panel min-h-0 flex-1 overflow-y-auto pr-[calc(1.25rem-var(--ancho-barra))] pb-6 pl-5 [scrollbar-gutter:stable]">
            {cuerpo}
          </div>
          <div className="border-t border-panel-borde px-5 py-4">
            {acciones}
            <p className="mt-2.5 text-center text-[11.5px] leading-snug text-tinta-tenue">
              Se abre el diálogo de impresión: elige <strong>Guardar como PDF</strong>.
            </p>
          </div>
        </div>
        <VisorHoja ancho={ANCHO_HOJA} alto={ALTO_HOJA}>
          {children}
        </VisorHoja>
      </div>
    </div>
  )
}
