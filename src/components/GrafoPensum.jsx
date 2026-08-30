import { useCallback, useEffect } from 'react'
import { useVistaGrafo } from '../hooks/useVistaGrafo'
import { hayDetalle } from '../layout/detalle'
import { vistaDeArranque } from '../layout/vistaInicial'
import { ESTADO } from '../data/estados'
import { useInactividad } from '../hooks/useInactividad'
import { useFocoGrafo } from '../hooks/useFocoGrafo'
import ContenidoGrafo from './ContenidoGrafo'
import DefsGrafo from './DefsGrafo'
import DetalleAsignatura from './DetalleAsignatura'
import ControlesZoom from './ControlesZoom'

function GrafoPensum({
  layout,
  porCodigo,
  estados,
  descarga,
  toque,
  areaFiltrada,
  seleccionado,
  senalado,
  alSenalar,
  alSeleccionar,
  alMarcar,
  enCasilla,
  alAbrirCasilla,
  casillaDe,
}) {
  const { nodos, columnas, electivas, gruposElectivas, aristas, relaciones, ancho, alto } = layout

  /* El mapa no se abre encajado sino en el semestre por el que va el
     estudiante. Ver vistaInicial.js: encajar el pensum entero en un telefono
     deja el nombre de las materias en 1,2 px, que ni se lee ni se entiende. */
  const arranque = (medida) =>
    vistaDeArranque(medida, columnas, nodos, (codigo) => estados[codigo] === ESTADO.APROBADA)

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
  } = useVistaGrafo(ancho, alto, arranque)

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
    <div ref={contenedorRef} className="rejilla-mapa relative min-w-0 flex-1 overflow-hidden">
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

        {/* Click en el vacio: cierra la seleccion.

            Transparente y no "none": con fill="none" el rectangulo deja de
            recibir pulsaciones y pulsar el fondo dejaria de cerrar nada.
            Antes este mismo rectangulo pintaba ademas la rejilla con un
            <pattern>; la rejilla se fue al CSS del contenedor y aqui solo
            queda su trabajo de blanco de tiro. */}
        <rect
          width="100%"
          height="100%"
          fill="transparent"
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
          /* 'lejos' apaga por CSS el texto y los iconos de las tarjetas
             cuando el mapa esta tan alejado que ya no se leen. Va aqui y no
             como prop en los nodos porque este <g> ya se repinta en cada
             gesto: los 494 nodos de dentro no se enteran y su memo sigue
             sirviendo. El porque esta en layout/detalle.js. */
          className={hayDetalle(vista.escala) ? undefined : 'lejos'}
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
            enCasilla={enCasilla}
            alAbrirCasilla={alAbrirCasilla}
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
          enCasilla={casillaDe?.[seleccionado]}
          alCambiarElectiva={alAbrirCasilla}
          alCerrar={() => alSeleccionar(null)}
        />
      )}

      <ControlesZoom acercar={acercar} alejar={alejar} encajar={encajar} atenuado={quieto} />
    </div>
  )
}

export default GrafoPensum
