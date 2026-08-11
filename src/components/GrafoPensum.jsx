import { useCallback, useEffect } from 'react'
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
    refEnGesto,
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
  /* Señalar se ignora mientras el mapa se mueve.
     Al arrastrar, el puntero cruza decenas de tarjetas y cada una dispara su
     hover: eso recalcula la cadena, cambia la identidad de `atenuado` y
     obliga a rehacer los ciento treinta y un hijos memoizados, ademas de
     relanzar la transicion de opacidad de setenta y cinco nodos. Medido: el
     arrastre pasa de 6,9 a entre 9,7 y 15,9 ms por movimiento.
     Ademas de caro, no es lo que se pide: quien arrastra el mapa lo esta
     moviendo, no inspeccionando lo que le pasa por debajo.
     Se consulta una ref y no el estado para no cambiar de identidad, que es
     lo unico que mantiene vivo el memo. */
  const senalar = useCallback(
    (codigo) => {
      if (refEnGesto.current) return
      alSenalar(codigo)
    },
    [alSenalar, refEnGesto],
  )
  const dejarDeSenalar = useCallback(() => alSenalar(null), [alSenalar])

  /* Y al empezar a mover, lo que hubiera resaltado se apaga. Arrastrar el
     mapa con media pantalla atenuada estorba para ver a donde se va, y de
     paso deja el gesto con el arbol en su estado mas barato. */
  useEffect(() => {
    if (enGesto) alSenalar(null)
  }, [enGesto, alSenalar])
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
