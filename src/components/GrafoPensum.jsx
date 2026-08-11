import { useCallback } from 'react'
import { useVistaGrafo } from '../hooks/useVistaGrafo'
import { useInactividad } from '../hooks/useInactividad'
import { useFocoGrafo } from '../hooks/useFocoGrafo'
import ContenidoGrafo from './ContenidoGrafo'
import DefsGrafo from './DefsGrafo'
import DetalleAsignatura from './DetalleAsignatura'
import ControlesZoom from './ControlesZoom'

function GrafoPensum({
  layout,
  estados,
  descarga,
  toque,
  areaFiltrada,
  seleccionado,
  senalado,
  alSenalar,
  alSeleccionar,
  alMarcar,
}) {
  const { nodos, columnas, electivas, gruposElectivas, aristas, relaciones, porCodigo, ancho, alto } =
    layout

  const {
    contenedorRef,
    vista,
    medida,
    encajado,
    arrastrando,
    enGesto,
    huboMovimiento,
    encajar,
    acercar,
    alejar,
    controlesArrastre,
  } = useVistaGrafo(ancho, alto)

  // El dock se apaga si nadie toca el mapa en dos segundos
  const { quieto, despertar } = useInactividad(2000)

  const { cadena, atenuado, nodoSeleccionado, detalle } = useFocoGrafo({
    seleccionado,
    senalado,
    areaFiltrada,
    estados,
    relaciones,
    porCodigo,
    vista,
  })

  // Los nodos estan memoizados, asi que lo que reciben tiene que mantener su
  // identidad entre renders o el memo no sirve de nada. Estas tres funciones
  // son las unicas props de los nodos que no son valores simples, y por eso
  // son las unicas que hay que fijar. Reciben el codigo en vez de venir ya
  // atadas a un nodo concreto: una funcion por mapa, no una por materia.
  const senalar = useCallback((codigo) => alSenalar(codigo), [alSenalar])
  const dejarDeSenalar = useCallback(() => alSenalar(null), [alSenalar])
  const verFicha = useCallback(
    (codigo) => {
      // Si el puntero se movio, fue un arrastre del lienzo, no un click
      if (huboMovimiento.current) return
      alSeleccionar(codigo)
    },
    [alSeleccionar, huboMovimiento],
  )

  return (
    <div ref={contenedorRef} className="relative min-w-0 flex-1 overflow-hidden">
      {/* Los *Capture avisan de actividad en fase de captura, antes de que
          corran los manejadores de arrastre de controlesArrastre: asi
          despiertan el dock sin pisar ni duplicar el pan y el zoom. */}
      {/* lienzo-en-gesto congela las estelas mientras el mapa se mueve. Son
          doscientas y pico animaciones que el navegador no puede componer en
          la GPU, y repintarlas ademas de mover el mapa es lo que hace que en
          un telefono el arrastre vaya a tirones. */}
      <svg
        width="100%"
        height="100%"
        className={`select-none ${enGesto ? 'lienzo-en-gesto' : ''} ${
          arrastrando ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{ touchAction: 'none' }}
        {...controlesArrastre}
        onPointerMoveCapture={despertar}
        onPointerDownCapture={despertar}
        onWheelCapture={despertar}
      >
        <DefsGrafo />

        {/* Click en el vacio: cierra la seleccion */}
        <rect
          width="100%"
          height="100%"
          fill="url(#rejilla)"
          onClick={() => {
            if (!huboMovimiento.current) alSeleccionar(null)
          }}
        />

        {/* Oculto hasta que la vista se encaja. El primer fotograma tras
            montar dibuja el mapa a tamaño natural desde la esquina, y
            enseñarlo era el tiron que se veia al volver del horario. Se
            revela con una transicion corta de opacidad, que el compositor
            resuelve sin repintar los mil seiscientos elementos. */}
        <g
          transform={`translate(${vista.x}, ${vista.y}) scale(${vista.escala})`}
          style={{
            opacity: encajado ? 1 : 0,
            transition: 'opacity 200ms ease-out',
          }}
        >
          {/* Todo el contenido del mapa vive memoizado ahi dentro. Este <g>
              es lo unico que cambia al desplazar o acercar, y su unico hijo
              se salta el render entero comparando una prop. */}
          <ContenidoGrafo
            columnas={columnas}
            aristas={aristas}
            nodos={nodos}
            electivas={electivas}
            gruposElectivas={gruposElectivas}
            porCodigo={porCodigo}
            estados={estados}
            descarga={descarga}
            toque={toque}
            seleccionado={seleccionado}
            cadena={cadena}
            atenuado={atenuado}
            ancho={ancho}
            alSenalar={senalar}
            alDejarDeSenalar={dejarDeSenalar}
            alVerFicha={verFicha}
            alMarcar={alMarcar}
          />
        </g>
      </svg>

      {detalle && (
        <DetalleAsignatura
          nodo={nodoSeleccionado}
          estado={estados[seleccionado]}
          prerrequisitos={detalle.prerrequisitos}
          desbloquea={detalle.desbloquea}
          posicion={detalle.posicion}
          medida={medida}
          alMarcar={alMarcar}
          alCerrar={() => alSeleccionar(null)}
        />
      )}

      <ControlesZoom acercar={acercar} alejar={alejar} encajar={encajar} atenuado={quieto} />
    </div>
  )
}

export default GrafoPensum
