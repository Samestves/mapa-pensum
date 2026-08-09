import { useCallback } from 'react'
import { NODO, MARGEN } from '../layout/constantes'
import { ESTADO } from '../hooks/usePensum'
import { useVistaGrafo } from '../hooks/useVistaGrafo'
import { useInactividad } from '../hooks/useInactividad'
import { useFocoGrafo } from '../hooks/useFocoGrafo'
import NodoAsignatura from './NodoAsignatura'
import NodoElectiva from './NodoElectiva'
import NodoHueco from './NodoHueco'
import Arista from './Arista'
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

        <g transform={`translate(${vista.x}, ${vista.y}) scale(${vista.escala})`}>
          {/* Encabezado de cada semestre: numero grande, conteo y una regla
              fina. Sin franja de fondo: ensuciaba mas de lo que ordenaba. */}
          {columnas.map((columna) => (
            <g key={columna.semestre}>
              {/* El numero se pinta dos veces: primero un trazo ancho y
                  translucido que hace de halo, y encima el relleno nitido.
                  paintOrder lo manda detras. Nada de filtros SVG. */}
              <text
                x={columna.x}
                y={MARGEN.top + 30}
                fontSize="38"
                fill="var(--tinta)"
                stroke="var(--halo-titulo)"
                strokeWidth="7"
                paintOrder="stroke"
                strokeLinejoin="round"
                className="font-mono font-extrabold"
              >
                {String(columna.semestre).padStart(2, '0')}
              </text>
              <text
                x={columna.x + 54}
                y={MARGEN.top + 17}
                fontSize="12"
                fill="var(--tinta)"
                stroke="var(--halo-titulo)"
                strokeWidth="4"
                paintOrder="stroke"
                strokeLinejoin="round"
                className="font-extrabold tracking-[0.2em]"
              >
                SEMESTRE
              </text>
              <text
                x={columna.x + 54}
                y={MARGEN.top + 31}
                fontSize="11"
                fill="var(--tinta-suave)"
                className="font-mono font-semibold"
              >
                {columna.cantidad} materias · {columna.uc} UC
              </text>
              <line
                x1={columna.x}
                y1={MARGEN.top + 42}
                x2={columna.x + NODO.ancho}
                y2={MARGEN.top + 42}
                stroke="var(--tinta-tenue)"
                strokeOpacity="0.35"
                strokeWidth="1"
              />
            </g>
          ))}

          {/* Los cables van debajo de las tarjetas, pero el ruteo garantiza
              que ninguno pasa por encima de un nodo. */}
          <g>
            {aristas.map((arista, i) => (
              <Arista
                key={arista.id}
                d={arista.d}
                x2={arista.x2}
                y2={arista.y2}
                area={arista.area}
                codigoOrigen={arista.origen}
                // Retardo y velocidad distintos por cable: sincronizados
                // todos se veria como un metronomo. Se calculan del indice,
                // asi que son estables y no reinician la animacion.
                retardo={(i % 7) * 0.55}
                velocidad={3.8 + (i % 5) * 0.35}
                viva={estados[arista.origen] === ESTADO.APROBADA}
                resaltada={
                  cadena != null && cadena.has(arista.origen) && cadena.has(arista.destino)
                }
                atenuada={atenuado(arista.origen) || atenuado(arista.destino)}
                descargando={descarga?.codigo === arista.origen}
                claveDescarga={descarga?.n}
              />
            ))}
          </g>

          {/* Los huecos de electiva no son materias: ni estado, ni marca, ni
              ficha. Se dibujan aparte para no meter ese caso dentro del nodo
              normal, que ya tiene cuatro estados que atender. */}
          {nodos.filter((nodo) => nodo.esHueco).map((nodo) => (
            <NodoHueco key={nodo.codigo} nodo={nodo} atenuado={atenuado(nodo.codigo)} />
          ))}

          {nodos.filter((nodo) => !nodo.esHueco).map((nodo) => (
            <NodoAsignatura
              key={nodo.codigo}
              nodo={nodo}
              estado={estados[nodo.codigo]}
              seleccionado={seleccionado === nodo.codigo}
              resaltado={cadena != null && cadena.has(nodo.codigo)}
              atenuado={atenuado(nodo.codigo)}
              destellando={
                descarga != null &&
                estados[nodo.codigo] === ESTADO.DISPONIBLE &&
                (nodo.prerrequisitos ?? []).includes(descarga.codigo)
              }
              claveDestello={descarga?.n}
              tocado={toque?.codigo === nodo.codigo}
              claveToque={toque?.n}
              alMarcar={alMarcar}
              alSenalar={senalar}
              alDejarDeSenalar={dejarDeSenalar}
              alVerFicha={verFicha}
            />
          ))}

          {/* Zona de electivas, debajo de los 10 semestres */}
          {gruposElectivas.map((grupo) => (
            <g key={grupo.clave}>
              <line
                x1={MARGEN.left}
                y1={grupo.yTitulo + 4}
                x2={ancho - MARGEN.right}
                y2={grupo.yTitulo + 4}
                stroke="var(--tinta-tenue)"
                strokeOpacity="0.22"
                strokeWidth="1"
                strokeDasharray="2 8"
              />
              <text
                x={MARGEN.left}
                y={grupo.yTitulo + 34}
                fontSize="15"
                fill="var(--tinta)"
                stroke="var(--halo-titulo)"
                strokeWidth="4"
                paintOrder="stroke"
                strokeLinejoin="round"
                className="font-extrabold tracking-[0.2em]"
              >
                {grupo.titulo}
              </text>
              {/* La cuota sale del pensum, no del componente. Donde no la
                  hay se dice cuantas opciones existen y nada mas. */}
              <text
                x={MARGEN.left + 300}
                y={grupo.yTitulo + 34}
                fontSize="11"
                fill="var(--tinta-suave)"
                className="font-mono font-semibold"
              >
                {grupo.cuota != null
                  ? `elige ${grupo.cuota} UC de ${grupo.cantidad} opciones`
                  : `${grupo.cantidad} opciones`}
              </text>
            </g>
          ))}

          {electivas.map((nodo) => (
            <NodoElectiva
              key={nodo.codigo}
              nodo={nodo}
              estado={estados[nodo.codigo]}
              // Primer requisito pendiente, para decirlo en la tarjeta
              requisito={
                (nodo.prerrequisitos ?? [])
                  .filter((p) => estados[p] !== ESTADO.APROBADA)
                  .map((p) => porCodigo.get(p)?.nombre ?? p)[0]
              }
              seleccionado={seleccionado === nodo.codigo}
              resaltado={cadena != null && cadena.has(nodo.codigo)}
              atenuado={atenuado(nodo.codigo)}
              alSenalar={senalar}
              alDejarDeSenalar={dejarDeSenalar}
              alHacerClick={verFicha}
            />
          ))}
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
