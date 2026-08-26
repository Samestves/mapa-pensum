import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { anchoQueCabe, colocar } from '../layout/popover'
import { useCerrarConEscape } from '../hooks/useCerrarConEscape'
import PicoPopover from './PicoPopover'

/* El aspecto de la nubecita, en una constante, porque lo comparten dos
   montajes distintos: el de aqui -que va por portal a <body>- y la ficha del
   mapa, que no puede portarse porque tiene que moverse con el lienzo. Si el
   radio o la sombra vivieran escritos en cada uno, se separarian el dia que
   alguien afine uno solo. */
export const CARA =
  'transicion-tema relative w-full rounded-2xl border border-panel-borde bg-panel shadow-2xl'

/**
 * La nubecita. UNA, para todo lo que se abre colgando de algo.
 *
 * Habia tres, con la misma forma y tres cuentas distintas para colocarse: la
 * del avance colgaba de su boton, la del horario se ponia al lado de la celda
 * y la ficha del mapa al lado del nodo. Cada una con su useLayoutEffect, su
 * medida y su piquito. Tres copias de un problema que es el mismo con los
 * ejes cambiados, y cuando se arreglaba algo en una -que el piquito no se
 * salga por la esquina, que el panel no se salga por abajo- las otras dos se
 * quedaban con el fallo.
 *
 * Aqui dentro pasa lo que tiene que pasar en todas y no se puede olvidar en
 * ninguna:
 *
 * - se mide sola despues de pintar y antes de que el navegador la enseñe, que
 *   es lo unico que evita el salto de recolocarse a la vista;
 * - nace del ancla, no de una esquina, porque el origen de la animacion sale
 *   del centro de lo que la abrio;
 * - saca el piquito por el lado que mira al ancla;
 * - se cierra con Escape y pulsando fuera.
 *
 * El piquito va FUERA del panel y dentro del envoltorio. El panel puede
 * llevar overflow-y-auto porque su contenido no siempre cabe, y un elemento
 * colocado por fuera de una caja que recorta se recorta con ella: el piquito
 * habria desaparecido. Aqui los dos comparten la misma traslacion y el mismo
 * origen, asi que entran juntos.
 */
function Popover({
  ancla,
  ancho: anchoDeseado = 300,
  preferencia = 'abajo',
  etiqueta,
  rol = 'dialog',
  alCerrar,
  claseContenido = '',
  children,
}) {
  const refPanel = useRef(null)
  const [pos, setPos] = useState(null)
  const [ancho, setAncho] = useState(anchoDeseado)

  useCerrarConEscape(alCerrar)

  /* La medida entra en las dependencias por el ancla, no por el alto: el alto
     se lee del DOM en el momento y volver a colocarse cuando el contenido
     cambia de tamaño lo resuelve el propio efecto al re-ejecutarse. */
  useLayoutEffect(() => {
    if (!ancla) return
    const cabe = anchoQueCabe(anchoDeseado)
    setAncho(cabe)
    setPos(
      colocar(ancla, { ancho: cabe, alto: refPanel.current?.offsetHeight ?? 0 }, preferencia),
    )
  }, [ancla, anchoDeseado, preferencia])

  if (!ancla) return null

  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* Fondo invisible: cierra al pulsar fuera sin oscurecer lo que hay
          detras, que es justo lo que se esta mirando para decidir. Un velo
          negro aqui apagaria el mapa o la semana sobre los que trata la
          propia nubecita. */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={alCerrar}
        className="absolute inset-0 cursor-default"
      />

      <div
        className="menu-clase absolute top-0 left-0"
        style={{
          width: ancho,
          transform: `translate3d(${pos?.x ?? 0}px, ${pos?.y ?? 0}px, 0)`,
          transformOrigin: pos?.origen,
          /* Escondida hasta que se sabe donde va. El primer render no tiene
             alto que medir, asi que sin esto se veria un fotograma en la
             esquina antes de saltar a su sitio. */
          visibility: pos ? 'visible' : 'hidden',
        }}
      >
        {pos && <PicoPopover lado={pos.flecha.lado} posicion={pos.flecha.posicion} />}

        <div
          ref={refPanel}
          role={rol}
          aria-label={etiqueta}
          className={`${CARA} ${claseContenido}`}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default Popover
