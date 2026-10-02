import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { useCerrarConEscape } from '../hooks/useCerrarConEscape'
import { useFocoAtrapado } from '../hooks/useFocoAtrapado'

/**
 * La pareja de escritorio de HojaInferior: una tarjeta centrada, flotando
 * sobre el mismo velo, con la misma sombra y el mismo radio. Lo que en el
 * telefono sube desde el pulgar, en escritorio aparece donde se mira.
 *
 * Es modal de verdad -tapa el mapa y no se puede usar nada de detras-, asi
 * que encierra el foco. Lo mete en la tarjeta y no en su primer control: el
 * primero suele ser cerrar, y enfocarlo lo dejaria marcado sin que nadie lo
 * haya pedido. Se cierra con Escape o pulsando el velo.
 *
 * Como HojaInferior, la `cabecera` queda fija y solo el contenido se
 * desplaza.
 */
function VentanaFlotante({ etiqueta, alCerrar, ancho = 440, cabecera, children }) {
  const ref = useRef(null)
  useCerrarConEscape(alCerrar)
  useFocoAtrapado(ref, true, false)

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center p-6">
      <button
        type="button"
        aria-label="Cerrar"
        tabIndex={-1}
        onClick={alCerrar}
        className="velo-hoja absolute inset-0 cursor-default"
      />
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={etiqueta}
        style={{ width: ancho }}
        className="ventana-flotante surgir relative flex max-h-[min(84vh,46rem)] max-w-full flex-col overflow-hidden rounded-[28px] border border-panel-borde bg-panel outline-none"
      >
        <div className="shrink-0">{cabecera}</div>
        <div className="min-h-0 overflow-y-auto overscroll-contain">{children}</div>
      </section>
    </div>,
    document.body,
  )
}

export default VentanaFlotante
