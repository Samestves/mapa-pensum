import { memo } from 'react'
import { NODO, TEXTO } from '../layout/constantes'
import { ESTADO } from '../data/estados'
import { colorNodo, etiquetaArea } from '../theme/areas'
import { ICONO_ESTADO, colorBordeEstado } from '../theme/estados'
import { codigoVisible } from '../data/codigoVisible'

/**
 * Los cuatro estados se distinguen por relleno, borde y trazo de la propia
 * tarjeta, no por un control aparte: la marca se hace desde la ficha y aqui
 * solo se refleja. El tinte de aprobada es deliberadamente fuerte para que
 * el mapa se pueda leer de un vistazo desde lejos.
 */
const ESTILO = {
  [ESTADO.BLOQUEADA]: { opacidadBorde: 0.4, grosor: 1.25, guiones: '5 4', tinte: 0, acento: 0.4 },
  [ESTADO.DISPONIBLE]: { opacidadBorde: 0.85, grosor: 1.5, guiones: null, tinte: 0.05, acento: 1 },
  [ESTADO.CURSANDO]: { opacidadBorde: 1, grosor: 2, guiones: null, tinte: 0.14, acento: 1 },
  [ESTADO.APROBADA]: { opacidadBorde: 1, grosor: 2, guiones: null, tinte: 0.22, acento: 1 },
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
  alSenalar,
  alDejarDeSenalar,
}) {
  const { x, y, nombre, uc, lineasNombre } = nodo
  const acento = colorNodo(nodo)
  const estilo = ESTILO[estado]

  const colorBorde = colorBordeEstado(estado, acento)
  const colorTinte =
    estado === ESTADO.CURSANDO ? 'var(--estado-cursando)' : 'var(--estado-aprobada)'

  const aprobada = estado === ESTADO.APROBADA
  const Icono = ICONO_ESTADO[estado]

  // El bloque de nombre se centra: 1, 2 o 3 lineas quedan siempre equilibradas
  const primeraLinea =
    TEXTO.centroNombre - ((lineasNombre.length - 1) * TEXTO.altoLinea) / 2

  return (
    <g
      transform={`translate(${x}, ${y})`}
      opacity={atenuado ? 0.14 : 1}
      onClick={() => alVerFicha(nodo.codigo)}
      onPointerEnter={() => alSenalar(nodo.codigo)}
      onPointerLeave={alDejarDeSenalar}
      className={`grupo-nodo cursor-pointer ${seleccionado ? 'activo' : ''}`}
      style={{ transition: 'opacity 320ms cubic-bezier(0.32, 0.72, 0, 1)' }}
    >
      {/* Etiqueta accesible. El area solo existe donde esta clasificada */}
      <title>
        {[codigoVisible(nodo), '—', nombre, nodo.area && `· ${etiquetaArea(nodo.area)}`, `· ${estado}`]
          .filter(Boolean)
          .join(' ')}
      </title>

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
        {codigoVisible(nodo)}
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
        {nodo.area ? etiquetaArea(nodo.area) : ''}
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

/**
 * memo porque son hasta ciento siete de estos en pantalla y todos cuelgan de
 * un estado que vive arriba: sin el, señalar UNA materia repintaba el mapa
 * entero -medido: 413 mutaciones del DOM en 337 elementos por cada hover-.
 * Con el, solo se repintan los nodos cuyo resaltado o atenuacion cambian.
 *
 * Todas las props son valores simples menos las tres funciones, y esas vienen
 * fijadas con useCallback desde GrafoPensum. Si alguna volviera a crearse en
 * cada render, esto dejaria de servir en silencio.
 */
export default memo(NodoAsignatura)
