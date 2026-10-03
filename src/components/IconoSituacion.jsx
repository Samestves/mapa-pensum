import { SITUACION } from '../layout/situacion'
import { colocarTrazo } from '../layout/trazo'

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
 *
 * Cada icono es una lista de trazos y nada mas -ni <rect>, ni <circle>, ni un
 * giro-, para que se pueda colocar reescribiendo sus numeros (ver
 * layout/trazo.js) en vez de con un transform, que dentro del mapa cuesta en
 * cada cuadro.
 */

/* El lado de la caja en la que estan dibujados, y sus dos grosores */
const LADO = 20
const GROSOR = 1.5
const GROSOR_CALADO = 1.8

/* El cuerpo de los dos candados: un rectangulo de esquinas redondas */
const CUERPO = {
  d: 'M6.5 9h7a2.25 2.25 0 0 1 2.25 2.25v3.75a2.25 2.25 0 0 1-2.25 2.25h-7a2.25 2.25 0 0 1-2.25-2.25v-3.75a2.25 2.25 0 0 1 2.25-2.25z',
  lleno: true,
}
const OJO = { d: 'M10 12.3v1.7', calado: true }

/* `lleno` rellena del color del icono, `velo` con ese color muy diluido, y
   `calado` pinta el trazo con el color de la superficie de debajo. */
const PIEZAS = {
  [SITUACION.HECHA]: [
    { d: 'M2.5 10a7.5 7.5 0 1 0 15 0a7.5 7.5 0 1 0-15 0z', lleno: true },
    { d: 'M6.6 10.3l2.3 2.3 4.5-4.9', calado: true },
  ],
  [SITUACION.CURSANDO]: [
    {
      d: 'M10 6.1C8.3 4.85 6.3 4.35 4 4.5v9.9c2.3-.15 4.3.35 6 1.6 1.7-1.25 3.7-1.75 6-1.6V4.5c-2.3-.15-4.3.35-6 1.6z',
      velo: true,
    },
    { d: 'M10 6.1V16' },
  ],
  /* El arco es el del candado cerrado girado 40 grados sobre su pata derecha:
     la izquierda queda en el aire, bien separada del cuerpo, que es lo que
     hace que se lea abierto tambien a 12 px. El giro ya esta hecho en los
     numeros. */
  [SITUACION.INSCRIBIBLE]: [
    CUERPO,
    { d: 'M13.25 9L14.696 7.276A3.25 3.25 0 0 0 9.717 3.098L9.075 3.865' },
    OJO,
  ],
  [SITUACION.PROXIMA]: [
    {
      d: 'M6 3.25h8M6 16.75h8M7 3.25v2.3c0 1.9 3 2.5 3 4.45s-3 2.55-3 4.45v2.3M13 3.25v2.3c0 1.9-3 2.5-3 4.45s3 2.55 3 4.45v2.3',
    },
  ],
  [SITUACION.LEJANA]: [CUERPO, { d: 'M6.75 9V6.75a3.25 3.25 0 0 1 6.5 0V9' }, OJO],
}

/* Los trazos de un icono ya colocados. Se calculan una vez por sitio: la
   tarjeta del mapa pide siempre el mismo, asi que son cinco cuentas en total
   y no una por tarjeta y por render. */
const colocadas = new Map()
function piezasEn(situacion, escala, x, y) {
  const clave = `${situacion}|${escala}|${x}|${y}`
  let piezas = colocadas.get(clave)
  if (!piezas) {
    piezas = (PIEZAS[situacion] ?? []).map((p) => ({ ...p, d: colocarTrazo(p.d, escala, x, y) }))
    colocadas.set(clave, piezas)
  }
  return piezas
}

/**
 * Solo las formas, para meterlas dentro de un SVG. `x`, `y` y `escala` dicen
 * donde y a que tamaño, en las coordenadas de quien las contiene: sin
 * transform ni recorte, que es lo que las hace gratis dentro del mapa.
 */
export function FormaSituacion({ situacion, color, sobre, x = 0, y = 0, escala = 1 }) {
  return (
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth={GROSOR * escala}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color, '--sobre': sobre }}
    >
      {piezasEn(situacion, escala, x, y).map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={p.lleno || p.velo ? 'currentColor' : undefined}
          fillOpacity={p.velo ? 0.14 : undefined}
          style={
            p.calado
              ? { stroke: 'var(--sobre, var(--nodo))', strokeWidth: GROSOR_CALADO * escala }
              : undefined
          }
        />
      ))}
    </g>
  )
}

/** El mismo icono como elemento HTML suelto */
export function IconoSituacion({ situacion, color = 'currentColor', sobre, size = 14, className }) {
  return (
    <svg
      viewBox={`0 0 ${LADO} ${LADO}`}
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
