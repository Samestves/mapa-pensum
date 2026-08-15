import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useCerrarConEscape } from '../hooks/useCerrarConEscape'
import { colocarBajoAncla } from '../layout/popover'

const ANCHO = 178

/**
 * El menu de una clase ya puesta: editar, duplicar, eliminar.
 *
 * Existe para que los tres puntos hagan algo distinto que el resto del
 * bloque. Editar es una de tres cosas que se le pueden hacer a una clase, y
 * de las tres la que menos se usa: lo normal es duplicarla al otro dia que se
 * dicta, o quitarla. Enseñar las tres y dejar elegir cuesta un click y evita
 * abrir un formulario entero para acabar borrando.
 *
 * Cada opcion se cierra sola al ejecutarse: un menu que sigue abierto despues
 * de pulsar obliga a un segundo gesto para nada.
 */
function MenuClase({ ancla, opciones, alCerrar }) {
  const refPanel = useRef(null)
  const [pos, setPos] = useState(null)

  useCerrarConEscape(alCerrar)

  /* Se mide despues de pintar y antes de que el navegador lo enseñe: durante
     el render no hay alto que medir, y colocarlo luego daria un salto. */
  useLayoutEffect(() => {
    setPos(colocarBajoAncla(ancla, ANCHO, refPanel.current?.offsetHeight ?? 0))
  }, [ancla])

  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* Fondo invisible: cierra al pulsar fuera sin oscurecer la semana, que
          es justo lo que se esta mirando. */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={alCerrar}
        className="absolute inset-0 cursor-default"
      />
      <div
        ref={refPanel}
        role="menu"
        style={{
          width: ANCHO,
          transform: `translate3d(${pos?.x ?? 0}px, ${pos?.y ?? 0}px, 0)`,
          transformOrigin: pos?.origen,
          visibility: pos ? 'visible' : 'hidden',
        }}
        className="menu-clase absolute top-0 left-0 flex flex-col rounded-xl border border-panel-borde bg-panel p-1.5 shadow-2xl"
      >
        {opciones.map(({ id, etiqueta, icono: Icono, peligro, alPulsar }) => (
          <button
            key={id}
            type="button"
            role="menuitem"
            onClick={() => {
              alPulsar()
              alCerrar()
            }}
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-semibold transition-colors hover:bg-panel-suave ${
              peligro ? 'text-[var(--estado-rojo)]' : 'text-tinta'
            }`}
          >
            <Icono size={14} className="shrink-0 opacity-70" />
            {etiqueta}
          </button>
        ))}
      </div>
    </div>,
    document.body,
  )
}

export default MenuClase
