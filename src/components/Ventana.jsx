import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { useCerrarConEscape } from '../hooks/useCerrarConEscape'
import { useFocoAtrapado } from '../hooks/useFocoAtrapado'

/**
 * Una ventana centrada sobre la aplicacion, con su velo. Es lo que en
 * escritorio hace de HojaInferior: en el telefono las cosas suben desde
 * abajo, donde esta el pulgar; con raton no hay pulgar y se abren en medio.
 *
 * Es modal de verdad: encierra el foco, se cierra con Escape y pulsando el
 * velo. `cabecera` y `pie` se quedan fijos y lo de en medio se desplaza.
 *
 * @param {string} props.etiqueta  como se llama, para quien no la ve
 * @param {number} [props.ancho]  el ancho maximo, en pixeles
 */
function Ventana({ etiqueta, ancho = 560, alCerrar, cabecera, pie, children }) {
  const refCaja = useRef(null)
  useCerrarConEscape(alCerrar)
  useFocoAtrapado(refCaja, true, false)

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar"
        tabIndex={-1}
        onClick={alCerrar}
        className="velo-hoja absolute inset-0 cursor-default"
      />
      <div
        ref={refCaja}
        role="dialog"
        aria-modal="true"
        aria-label={etiqueta}
        style={{ maxWidth: ancho }}
        className="surgir relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-[26px] border border-panel-borde bg-panel shadow-2xl outline-none"
      >
        {cabecera}
        <div className="desplazable-panel min-h-0 overflow-y-auto">{children}</div>
        {pie}
      </div>
    </div>,
    document.body,
  )
}

export default Ventana
