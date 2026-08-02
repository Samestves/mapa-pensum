import { Check, CircleDot, Lock } from 'lucide-react'
import { NODO, TEXTO } from '../layout/constantes'
import { ESTADO } from '../hooks/usePensum'
import { colorArea, etiquetaArea } from '../theme/areas'

/**
 * Los cuatro estados se distinguen por relleno, borde y trazo de la propia
 * tarjeta, no por un control aparte: la marca se hace desde la ficha y aqui
 * solo se refleja. El tinte de aprobada es deliberadamente fuerte para que
 * el mapa se pueda leer de un vistazo desde lejos.
 */
const ESTILO = {
  [ESTADO.BLOQUEADA]: { borde: null, opacidadBorde: 0.4, grosor: 1.25, guiones: '5 4', tinte: 0, acento: 0.4 },
  [ESTADO.DISPONIBLE]: { borde: null, opacidadBorde: 0.85, grosor: 1.5, guiones: null, tinte: 0.05, acento: 1 },
  [ESTADO.CURSANDO]: { borde: 'var(--estado-cursando)', opacidadBorde: 1, grosor: 2, guiones: null, tinte: 0.14, acento: 1 },
  [ESTADO.APROBADA]: { borde: 'var(--estado-aprobada)', opacidadBorde: 1, grosor: 2, guiones: null, tinte: 0.22, acento: 1 },
}

// Icono de estado, arriba a la derecha. Informa, no es un boton.
const ICONO = {
  [ESTADO.APROBADA]: Check,
  [ESTADO.CURSANDO]: CircleDot,
  [ESTADO.BLOQUEADA]: Lock,
  [ESTADO.DISPONIBLE]: null,
}

function NodoAsignatura({
  nodo,
  estado,
  resaltado,
  atenuado,
  seleccionado,
  destellando,
  claveDestello,
  tocado,
  claveToque,
  alVerFicha,
  alEntrar,
  alSalir,
}) {
  const { x, y, codigo, nombre, uc, area, lineasNombre } = nodo
  const acento = colorArea(area)
  const estilo = ESTILO[estado]

  const colorBorde = estilo.borde ?? acento
  const colorTinte =
    estado === ESTADO.CURSANDO ? 'var(--estado-cursando)' : 'var(--estado-aprobada)'

  const aprobada = estado === ESTADO.APROBADA
  const Icono = ICONO[estado]

  // El bloque de nombre se centra: 1, 2 o 3 lineas quedan siempre equilibradas
  const primeraLinea =
    TEXTO.centroNombre - ((lineasNombre.length - 1) * TEXTO.altoLinea) / 2

  return (
    <g
      transform={`translate(${x}, ${y})`}
      opacity={atenuado ? 0.14 : 1}
      onClick={alVerFicha}
      onPointerEnter={alEntrar}
      onPointerLeave={alSalir}
      className={`grupo-nodo cursor-pointer ${seleccionado ? 'activo' : ''}`}
      style={{ transition: 'opacity 320ms cubic-bezier(0.32, 0.72, 0, 1)' }}
    >
      <title>{`${codigo} — ${nombre} · ${etiquetaArea(area)} · ${estado}`}</title>

      <rect width={NODO.ancho} height={NODO.alto} rx={NODO.radio} fill="var(--nodo)" />

      <rect
        width={NODO.ancho}
        height={NODO.alto}
        rx={NODO.radio}
        fill={estado === ESTADO.DISPONIBLE ? acento : colorTinte}
        fillOpacity={estilo.tinte}
        style={{ transition: 'fill-opacity 300ms ease' }}
      />

      {destellando && (
        <rect
          key={claveDestello}
          width={NODO.ancho}
          height={NODO.alto}
          rx={NODO.radio}
          className="destello"
          fill={acento}
        />
      )}

      <rect
        width={NODO.ancho}
        height={NODO.alto}
        rx={NODO.radio}
        fill={acento}
        fillOpacity={resaltado && !seleccionado ? 0.08 : 0}
        style={{ transition: 'fill-opacity 180ms ease' }}
      />

      {/* Resplandor de las aprobadas, apilando trazos en vez de usar filtro */}
      <rect
        x="-3"
        y="-3"
        width={NODO.ancho + 6}
        height={NODO.alto + 6}
        rx={NODO.radio + 3}
        fill="none"
        stroke={colorBorde}
        strokeOpacity={aprobada ? 0.18 : 0}
        strokeWidth="5"
        style={{ transition: 'stroke-opacity 300ms ease' }}
      />

      <rect
        width={NODO.ancho}
        height={NODO.alto}
        rx={NODO.radio}
        fill="none"
        stroke={colorBorde}
        strokeOpacity={estilo.opacidadBorde}
        strokeWidth={seleccionado ? estilo.grosor + 1.4 : estilo.grosor}
        strokeDasharray={estilo.guiones ?? undefined}
        className={estado === ESTADO.CURSANDO ? 'respirando' : undefined}
        style={{ transition: 'stroke 300ms ease, stroke-width 160ms ease' }}
      />

      {/* Anillo de confirmacion. Solo en la tarjeta que el usuario acaba de
          tocar: si se lanzara en cada cambio de estado derivado, aprobar una
          materia haria parpadear medio mapa. */}
      {tocado && (
        <rect
          key={claveToque}
          className="anillo-cambio"
          width={NODO.ancho}
          height={NODO.alto}
          rx={NODO.radio}
          fill="none"
          stroke={colorBorde}
        />
      )}

      {/* Barra de acento del area */}
      <rect
        x={NODO.barra.x}
        y={NODO.barra.y}
        width={NODO.barra.ancho}
        height={NODO.barra.alto}
        rx={NODO.barra.ancho / 2}
        fill={acento}
        fillOpacity={estilo.acento}
        style={{ transition: 'fill-opacity 300ms ease' }}
      />

      <text
        x={NODO.padIzq}
        y={26}
        fontSize={TEXTO.codigo}
        fill="var(--tinta-tenue)"
        className="font-mono tracking-wider"
      >
        {codigo}
      </text>

      {lineasNombre.map((linea, i) => (
        <text
          key={i}
          x={NODO.padIzq}
          y={primeraLinea + i * TEXTO.altoLinea}
          fontSize={TEXTO.nombre}
          fill="var(--tinta)"
          className="font-semibold"
        >
          {linea}
        </text>
      ))}

      <text
        x={NODO.padIzq}
        y={86}
        fontSize={TEXTO.meta}
        fill="var(--tinta-tenue)"
        className="font-mono"
      >
        {uc} UC
      </text>
      <text
        x={NODO.ancho - NODO.padDer}
        y={86}
        textAnchor="end"
        fontSize={TEXTO.meta}
        fill={acento}
        fillOpacity={estilo.acento}
        className="font-medium"
      >
        {etiquetaArea(area)}
      </text>

      {Icono && (
        <Icono
          x={NODO.ancho - NODO.padDer - 15}
          y={13}
          width={15}
          height={15}
          color={estado === ESTADO.BLOQUEADA ? 'var(--tinta-tenue)' : colorBorde}
          strokeWidth={2.6}
        />
      )}
    </g>
  )
}

export default NodoAsignatura
