import { Info } from 'lucide-react'
import { NODO, TEXTO } from '../layout/constantes'
import { ESTADO } from '../hooks/usePensum'
import { colorArea, etiquetaArea } from '../theme/areas'

/**
 * Los cuatro estados se distinguen por borde, relleno y trazo, nunca por
 * apagar la tarjeta: las bloqueadas se leen igual de bien que las demas.
 */
const ESTILO = {
  [ESTADO.BLOQUEADA]: { borde: null, opacidadBorde: 0.4, grosor: 1.25, guiones: '5 4', tinte: 0, acento: 0.4 },
  [ESTADO.DISPONIBLE]: { borde: null, opacidadBorde: 0.85, grosor: 1.5, guiones: null, tinte: 0.05, acento: 1 },
  [ESTADO.CURSANDO]: { borde: 'var(--estado-cursando)', opacidadBorde: 1, grosor: 2, guiones: null, tinte: 0.1, acento: 1 },
  [ESTADO.APROBADA]: { borde: 'var(--estado-aprobada)', opacidadBorde: 1, grosor: 2, guiones: null, tinte: 0.16, acento: 1 },
}

// Casilla del checklist, arriba a la derecha de la tarjeta
const CASILLA = { cx: NODO.ancho - NODO.padDer - 9, cy: 22, lado: 18 }
const BOTON_FICHA = { cx: CASILLA.cx - 28, cy: CASILLA.cy }

/** Casilla que se marca y desmarca. El check se dibuja trazando la linea. */
function Casilla({ estado, color }) {
  const aprobada = estado === ESTADO.APROBADA
  const cursando = estado === ESTADO.CURSANDO
  const { cx, cy, lado } = CASILLA
  const r = lado / 2

  return (
    <g>
      <rect
        x={cx - r}
        y={cy - r}
        width={lado}
        height={lado}
        rx={6}
        fill={color}
        fillOpacity={aprobada ? 0.95 : cursando ? 0.22 : 0}
        stroke={color}
        strokeOpacity={estado === ESTADO.BLOQUEADA ? 0.45 : 0.9}
        strokeWidth={1.6}
        strokeDasharray={estado === ESTADO.BLOQUEADA ? '3 3' : undefined}
        style={{ transition: 'fill-opacity 240ms ease, stroke-opacity 240ms ease' }}
      />

      {aprobada && (
        // key={estado} remonta el trazo, asi el check se redibuja cada vez
        <path
          key={estado}
          className="trazo-check"
          pathLength="1"
          d={`M ${cx - 4.4} ${cy - 0.2} L ${cx - 1.2} ${cy + 3.2} L ${cx + 4.6} ${cy - 4}`}
          fill="none"
          stroke="var(--nodo)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {cursando && <circle cx={cx} cy={cy} r="3.2" fill={color} />}
    </g>
  )
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
  alAlternar,
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
  const colorCasilla =
    estado === ESTADO.APROBADA
      ? 'var(--estado-aprobada)'
      : estado === ESTADO.CURSANDO
        ? 'var(--estado-cursando)'
        : acento

  const aprobada = estado === ESTADO.APROBADA

  // El bloque de nombre se centra: 1, 2 o 3 lineas quedan siempre equilibradas
  const primeraLinea =
    TEXTO.centroNombre - ((lineasNombre.length - 1) * TEXTO.altoLinea) / 2

  return (
    <g
      transform={`translate(${x}, ${y})`}
      opacity={atenuado ? 0.14 : 1}
      onClick={alAlternar}
      onPointerEnter={alEntrar}
      onPointerLeave={alSalir}
      className={`grupo-nodo cursor-pointer ${seleccionado ? 'activo' : ''}`}
      style={{ transition: 'opacity 180ms ease' }}
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

      <Casilla estado={estado} color={colorCasilla} />

      {/* Ficha con prerrequisitos y opcion de "cursando". Va en el hueco
          libre entre el codigo y la casilla: no pisa ningun texto. */}
      <g
        className="boton-ficha"
        onClick={(e) => {
          // Sin esto el click subiria a la tarjeta y ademas la marcaria
          e.stopPropagation()
          alVerFicha()
        }}
      >
        <title>Ver ficha de la materia</title>
        <circle cx={BOTON_FICHA.cx} cy={BOTON_FICHA.cy} r="10" fill="var(--nodo)" />
        <circle
          cx={BOTON_FICHA.cx}
          cy={BOTON_FICHA.cy}
          r="9.5"
          fill="var(--tinta-suave)"
          fillOpacity="0.12"
          stroke="var(--tinta-suave)"
          strokeOpacity="0.5"
          strokeWidth="1"
        />
        <Info
          x={BOTON_FICHA.cx - 6}
          y={BOTON_FICHA.cy - 6}
          width={12}
          height={12}
          color="var(--tinta-suave)"
          strokeWidth={2.4}
        />
      </g>
    </g>
  )
}

export default NodoAsignatura
