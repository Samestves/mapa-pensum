import { useMemo } from 'react'
import { Maximize, Minus, Plus } from 'lucide-react'
import { NODO, MARGEN } from '../layout/constantes'
import { ESTADO } from '../hooks/usePensum'
import { cadenaDe } from '../layout/relaciones'
import { useVistaGrafo } from '../hooks/useVistaGrafo'
import NodoAsignatura from './NodoAsignatura'
import Arista from './Arista'
import DefsGrafo from './DefsGrafo'
import DetalleAsignatura from './DetalleAsignatura'

function BotonVista({ icono: Icono, titulo, alPulsar }) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      onClick={alPulsar}
      className="transicion-tema grid size-9 place-items-center rounded-lg border border-panel-borde bg-panel/85 text-tinta-suave backdrop-blur hover:text-tinta"
    >
      <Icono size={16} />
    </button>
  )
}

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
  alAlternarAprobada,
  alMarcar,
}) {
  const { nodos, columnas, aristas, relaciones, porCodigo, ancho, alto } = layout

  const {
    contenedorRef,
    vista,
    medida,
    arrastrando,
    huboMovimiento,
    encajar,
    acercar,
    alejar,
    controlesArrastre,
  } = useVistaGrafo(ancho, alto)

  // Manda la seleccion; el hover solo resalta si no hay nada seleccionado
  const foco = seleccionado ?? senalado

  const cadena = useMemo(
    () => (foco ? cadenaDe(foco, relaciones) : null),
    [foco, relaciones],
  )

  // Un nodo se apaga si hay una cadena en foco y no entra, o si hay un area
  // filtrada desde el panel y no es la suya.
  const atenuado = (codigo) => {
    if (areaFiltrada && porCodigo.get(codigo)?.area !== areaFiltrada) return true
    return cadena != null && !cadena.has(codigo)
  }

  const nodoSeleccionado = seleccionado ? porCodigo.get(seleccionado) : null

  const detalle = useMemo(() => {
    if (!nodoSeleccionado) return null
    const relacionadas = (codigos) =>
      codigos
        .map((c) => porCodigo.get(c))
        .filter(Boolean)
        .map((asignatura) => ({ asignatura, estado: estados[asignatura.codigo] }))

    return {
      prerrequisitos: relacionadas(relaciones.atras.get(seleccionado) ?? []),
      desbloquea: relacionadas(relaciones.adelante.get(seleccionado) ?? []),
      posicion: {
        x: vista.x + (nodoSeleccionado.x + NODO.ancho) * vista.escala,
        y: vista.y + nodoSeleccionado.y * vista.escala,
        ancho: NODO.ancho * vista.escala,
      },
    }
  }, [nodoSeleccionado, seleccionado, relaciones, porCodigo, estados, vista])

  return (
    <div ref={contenedorRef} className="relative min-w-0 flex-1 overflow-hidden">
      <svg
        width="100%"
        height="100%"
        className={`select-none ${arrastrando ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ touchAction: 'none' }}
        {...controlesArrastre}
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
                retardo={(i % 6) * 0.5}
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

          {nodos.map((nodo) => (
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
              alEntrar={() => alSenalar(nodo.codigo)}
              alSalir={() => alSenalar(null)}
              alAlternar={() => {
                // Si el puntero se movio, fue un arrastre del lienzo, no un click
                if (huboMovimiento.current) return
                alAlternarAprobada(nodo.codigo)
              }}
              alVerFicha={() => {
                if (huboMovimiento.current) return
                alSeleccionar(seleccionado === nodo.codigo ? null : nodo.codigo)
              }}
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

      <div className="absolute right-4 bottom-4 flex flex-col gap-2">
        <BotonVista icono={Plus} titulo="Acercar" alPulsar={acercar} />
        <BotonVista icono={Minus} titulo="Alejar" alPulsar={alejar} />
        <BotonVista icono={Maximize} titulo="Encajar en pantalla" alPulsar={encajar} />
      </div>
    </div>
  )
}

export default GrafoPensum
