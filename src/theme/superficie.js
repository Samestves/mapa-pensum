import { Lock } from 'lucide-react'
import { ESTADO } from '../data/estados'

/**
 * El aspecto de una tarjeta del mapa. Una tabla, cuatro filas, sin excepciones.
 *
 * EL ESTADO MANDA SOBRE EL COLOR, y manda solo. Antes lo compartia con el area
 * de la materia, y eso producia lo que parecia aleatorio y lo era: en las ocho
 * carreras sin area clasificada el color sale de un hash del codigo, asi que
 * dos materias recien desbloqueadas podian aparecer una azul y otra rosa. Y
 * peor: el color de reserva de "sin area" es un gris que coincidia con el de
 * bloqueada, o sea que habia desbloqueadas que se veian bloqueadas.
 *
 * La regla se lee de un vistazo y no admite matices:
 *
 *   BLOQUEADA    hundida, apagada, con candado
 *   DISPONIBLE   la mas clara y neutra: la que puedes inscribir hoy
 *   CURSANDO     misma claridad, tono ambar
 *   APROBADA     misma claridad, tono verde
 *
 * Las tres activas pesan LO MISMO en pantalla y solo cambian de tono. La
 * claridad contesta "¿puedo cursarla?" y el tono contesta "¿en que voy?".
 *
 *   fondo   variable CSS de la tarjeta, con su valor en cada tema
 *   texto   opacidad del nombre sobre ese fondo
 *   dato    opacidad del codigo y las UC
 *   icono   opacidad del icono
 *   sello   icono que sustituye al de la materia, o null
 */
const SUPERFICIE = {
  [ESTADO.BLOQUEADA]: {
    fondo: 'var(--tarjeta-bloqueada)',
    texto: 0.55,
    dato: 0.45,
    icono: 0.4,
    /* El candado, y SOLO aqui. Es el unico estado que necesita decir algo que
       la tarjeta no dice sola: apagada podria significar "todavia no" o "ya no
       me toca". En los otros tres seria un adorno, porque ahi el color ya lo
       dice entero. */
    sello: Lock,
  },
  [ESTADO.DISPONIBLE]: {
    fondo: 'var(--tarjeta-disponible)',
    texto: 1,
    dato: 0.72,
    icono: 0.85,
    sello: null,
  },
  [ESTADO.CURSANDO]: {
    fondo: 'var(--tarjeta-cursando)',
    texto: 1,
    dato: 0.72,
    icono: 0.85,
    sello: null,
  },
  [ESTADO.APROBADA]: {
    fondo: 'var(--tarjeta-aprobada)',
    texto: 1,
    dato: 0.72,
    icono: 0.85,
    sello: null,
  },
}

/**
 * La piel que le toca a un estado.
 *
 * Cae a la de bloqueada si llega uno que no existe, y esa red no es paranoia:
 * las casillas de electiva preguntan por el estado de una materia que puede no
 * estar elegida todavia, y eso llega como undefined.
 */
export const pielDe = (estado) => SUPERFICIE[estado] ?? SUPERFICIE[ESTADO.BLOQUEADA]
