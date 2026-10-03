import { SITUACION } from '../layout/situacion'

/**
 * Los iconos de estado. Un dibujo distinto para cada situacion, no la misma
 * forma en otro color: asi el estado se reconoce por la silueta, tambien de
 * lejos y tambien sin distinguir colores.
 *
 *   hecha        sello lleno con check       terminada
 *   cursando     libro abierto               la estas viendo
 *   inscribible  candado abierto             puedes entrar
 *   proxima      reloj de arena              todavia no, pero viene
 *   lejana       candado cerrado             no puedes todavia
 *
 * Estan dibujados aqui y no sacados de una libreria porque lo que hace falta
 * es una familia: la misma rejilla de 20, el mismo trazo de 1,5 y las mismas
 * puntas redondas en los cinco. Los de libreria traen cada uno su caja y su
 * grosor, y juntos no parecen parientes.
 *
 * Todo sale de aqui: la tarjeta del mapa, la cabecera de cada semestre, la
 * ficha y la lista. Las formas heredan el color con currentColor. Lo calado
 * -el check del sello, el ojo de la cerradura- se pinta con --sobre, el color
 * de la superficie que tenga debajo; sin el, con el de una tarjeta.
 */

/* El lado de la caja en la que estan dibujados */
export const LADO_ICONO = 20

const CALADO = { stroke: 'var(--sobre, var(--nodo))', strokeWidth: 1.8 }
const CUERPO = <rect x={4.25} y={9} width={11.5} height={8.25} rx={2.25} fill="currentColor" />
const OJO = <path d="M10 12.3v1.7" style={CALADO} />

const FORMAS = {
  [SITUACION.HECHA]: (
    <>
      <circle cx={10} cy={10} r={7.5} fill="currentColor" />
      <path d="M6.6 10.3l2.3 2.3 4.5-4.9" style={CALADO} />
    </>
  ),
  [SITUACION.CURSANDO]: (
    <>
      <path
        d="M10 6.1C8.3 4.85 6.3 4.35 4 4.5v9.9c2.3-.15 4.3.35 6 1.6 1.7-1.25 3.7-1.75 6-1.6V4.5c-2.3-.15-4.3.35-6 1.6z"
        fill="currentColor"
        fillOpacity={0.14}
      />
      <path d="M10 6.1V16" />
    </>
  ),
  /* El arco es el del candado cerrado, girado 40 grados sobre su pata
     derecha: la izquierda queda en el aire, bien separada del cuerpo, que es
     lo que hace que se lea abierto tambien a 12 px. */
  [SITUACION.INSCRIBIBLE]: (
    <>
      {CUERPO}
      <path d="M13.25 9V6.75a3.25 3.25 0 0 0-6.5 0v1" transform="rotate(40 13.25 9)" />
      {OJO}
    </>
  ),
  [SITUACION.PROXIMA]: (
    <path d="M6 3.25h8M6 16.75h8M7 3.25v2.3c0 1.9 3 2.5 3 4.45s-3 2.55-3 4.45v2.3M13 3.25v2.3c0 1.9-3 2.5-3 4.45s3 2.55 3 4.45v2.3" />
  ),
  [SITUACION.LEJANA]: (
    <>
      {CUERPO}
      <path d="M6.75 9V6.75a3.25 3.25 0 0 1 6.5 0V9" />
      {OJO}
    </>
  ),
}

/**
 * Solo las formas, para meterlas dentro de un SVG: con un transform, o dentro
 * de un <symbol> (ver DefsGrafo). Sin `color` heredan el de quien las
 * contiene.
 */
export function FormaSituacion({ situacion, color, sobre }) {
  return (
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color, '--sobre': sobre }}
    >
      {FORMAS[situacion] ?? null}
    </g>
  )
}

/** El mismo icono como elemento HTML suelto */
export function IconoSituacion({ situacion, color = 'currentColor', sobre, size = 14, className }) {
  return (
    <svg
      viewBox={`0 0 ${LADO_ICONO} ${LADO_ICONO}`}
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <FormaSituacion situacion={situacion} color={color} sobre={sobre} />
    </svg>
  )
}
