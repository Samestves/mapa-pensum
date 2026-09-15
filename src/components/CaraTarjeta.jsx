import { NODO, TEXTO } from '../layout/constantes'
import { ASPECTO } from '../theme/situacion'
import { FormaSituacion } from './IconoSituacion'

const SUAVE =
  'fill 280ms ease, stroke 280ms ease, stroke-opacity 280ms ease, stroke-width 160ms ease'

/* Retraso estable por materia para la luz del borde. Sacado del codigo y no
   al azar, para que no cambie en cada render ni en cada visita; y distinto
   por tarjeta, porque ocho luces dando la vuelta a la vez parecen un
   salvapantallas. */
function retrasoDe(codigo) {
  let h = 0
  for (let i = 0; i < codigo.length; i++) h = (h * 31 + codigo.charCodeAt(i)) >>> 0
  return `-${(h % 70) / 10}s`
}

/**
 * La cara de una tarjeta de materia: lo que se DIBUJA, sin la interaccion.
 * La usan la materia obligatoria y la casilla de electiva ya llena, que por
 * eso se ven exactamente iguales.
 *
 *   0713632            Inscribible ◉      codigo | estado, palabra e icono
 *   Teoria de Sistemas                    nombre, protagonista
 *   ● 2 UC                                area en un punto y UC
 *
 * El estado vive en UN sitio, arriba a la derecha. Estuvo repartido: el check
 * y el candado arriba y las pastillas "Cursando", "Inscribible" y "Proximo"
 * abajo, con lo que habia que mirar dos esquinas para saber lo mismo y la
 * fila de abajo competia con las UC. Ahora la esquina dice que es y la fila
 * de abajo solo cuanto pesa.
 */
function CaraTarjeta({ situacion, codigo, lineasNombre, uc, acento, seleccionado, resaltado }) {
  const a = ASPECTO[situacion]
  const { ancho, alto, radio } = NODO

  const borde = seleccionado || resaltado ? a.fuerte : a.borde
  const grosor = seleccionado ? a.grosor + 1 : a.grosor

  // El bloque del nombre se centra: 1, 2 o 3 lineas quedan equilibradas
  const primeraLinea = TEXTO.centroNombre - ((lineasNombre.length - 1) * TEXTO.altoLinea) / 2

  const ICONO = 14
  const xIcono = ancho - 14 - ICONO

  return (
    <>
      {/* Halo quieto: separa la tarjeta del lienzo a cualquier escala, tambien
          con el mapa entero en un telefono, donde la luz del borde ya no se
          distingue pero un contorno ancho y tenue si. */}
      {(a.brilla || seleccionado) && (
        <rect
          x={-3}
          y={-3}
          width={ancho + 6}
          height={alto + 6}
          rx={radio + 3}
          fill="none"
          style={{
            stroke: a.fuerte,
            strokeOpacity: seleccionado ? 0.38 : 0.16,
            strokeWidth: 3,
            transition: SUAVE,
          }}
        />
      )}

      <rect
        width={ancho}
        height={alto}
        rx={radio}
        style={{ fill: a.fondo, stroke: borde, strokeWidth: grosor, transition: SUAVE }}
      />

      {a.brilla && (
        <>
          {/* El filo de la marca: la misma luz que se enciende arriba a la
              izquierda y se apaga por el resto en la cajita del logo y en el
              aviso de instalar. Es el borde de la casa, no uno nuevo. */}
          <rect
            width={ancho}
            height={alto}
            rx={radio}
            fill="none"
            stroke="url(#filo-inscribible)"
            strokeWidth={1.5}
          />
          {/* Y una luz que recorre el contorno despacio, de un solo color.
              El degradado de tres colores que giraba se leia como algo pegado
              encima; esta es la luz del filo dando la vuelta. Dos rectangulos
              con el mismo reloj: un nucleo fino y su resplandor. */}
          <rect
            width={ancho}
            height={alto}
            rx={radio}
            fill="none"
            pathLength="100"
            strokeLinecap="round"
            className="luz-borde"
            style={{
              stroke: 'var(--sit-inscribible-luz)',
              strokeWidth: 5,
              strokeOpacity: 0.22,
              animationDelay: retrasoDe(codigo),
            }}
          />
          <rect
            width={ancho}
            height={alto}
            rx={radio}
            fill="none"
            pathLength="100"
            strokeLinecap="round"
            className="luz-borde"
            style={{
              stroke: 'var(--sit-inscribible-luz)',
              strokeWidth: 1.75,
              animationDelay: retrasoDe(codigo),
            }}
          />
        </>
      )}

      <text
        x={NODO.padIzq}
        y={24}
        fontSize={9.5}
        fill="var(--sit-codigo)"
        className="font-mono tracking-wide"
      >
        {codigo}
      </text>

      {/* Estado: palabra y, pegado a ella, su icono */}
      {a.marca.texto && (
        <text
          x={xIcono - 6}
          y={24}
          textAnchor="end"
          fontSize={9.5}
          className="font-semibold"
          style={{ fill: a.marca.color, transition: 'fill 280ms ease' }}
        >
          {a.marca.texto}
        </text>
      )}
      <g transform={`translate(${xIcono}, 13.5)`}>
        <FormaSituacion situacion={situacion} color={a.marca.color} />
      </g>

      {lineasNombre.map((linea, i) => (
        <text
          key={i}
          x={NODO.padIzq}
          y={primeraLinea + i * TEXTO.altoLinea}
          fontSize={TEXTO.nombre}
          className="font-semibold"
          style={{ fill: a.nombre, transition: 'fill 280ms ease' }}
        >
          {linea}
        </text>
      ))}

      <circle cx={NODO.padIzq + 3} cy={alto - 15} r={3} fill={acento} />
      <text
        x={NODO.padIzq + 11}
        y={alto - 11.5}
        fontSize={9.5}
        fill="var(--sit-codigo)"
        className="font-mono tabular-nums"
      >
        {uc} UC
      </text>
    </>
  )
}

export default CaraTarjeta
