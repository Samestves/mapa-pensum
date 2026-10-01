import { NODO } from '../layout/constantes'
import { APAGADO_MS, CARGA_MS, ESPERA_MS } from '../layout/mantenerRuta'
import { avivar, colorNodo } from '../theme/areas'

/* El grosor en pixeles de pantalla, a cualquier zoom */
const GROSOR_PX = 1.6

/**
 * La linea que recorre el borde de una tarjeta mientras se mantiene el dedo
 * encima: el aro de "mantén pulsado" de The Last of Us Parte II, hecho con el
 * contorno de la propia tarjeta. Sale de la esquina de arriba a la izquierda
 * y da la vuelta en el sentido del reloj; al cerrarse, la ruta se fija y la
 * linea se apaga mientras la ruta se enciende debajo.
 *
 * Va en el color del area de la tarjeta, aclarado igual que la luz de sus
 * cables: lo que carga y lo que se enciende son la misma luz.
 *
 * Es un solo rect, y solo existe mientras se mantiene. Lo que cuesta es
 * repintar el recuadro de esa tarjeta durante un tercio de segundo; el resto
 * del mapa no se entera.
 *
 * El grosor se divide por la escala en vez de usar non-scaling-stroke: con
 * non-scaling-stroke el guion se mide en pixeles de pantalla y el recorrido
 * de pathLength deja de cuadrar (ver Arista.jsx, mismo problema).
 */
export default function ContornoCarga({ nodo, hecha, escala }) {
  return (
    <rect
      x={nodo.x}
      y={nodo.y}
      width={NODO.ancho}
      height={NODO.alto}
      rx={NODO.radio}
      pathLength={1}
      fill="none"
      stroke={avivar(colorNodo(nodo))}
      strokeWidth={GROSOR_PX / escala}
      className={`contorno-carga ${hecha ? 'hecha' : ''}`}
      /* Los tiempos salen de las mismas constantes que el reloj que fija la
         ruta: si alguien cambia uno, el dibujo y el reloj siguen cuadrando. */
      style={{
        '--espera': `${ESPERA_MS}ms`,
        '--carga': `${CARGA_MS}ms`,
        '--apagado': `${APAGADO_MS}ms`,
      }}
      aria-hidden="true"
    />
  )
}
