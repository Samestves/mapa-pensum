import { memo } from 'react'
import { colorNodo } from '../theme/areas'

const OPACIDAD = { viva: 0.9, resaltada: 1, normal: 0.42, atenuada: 0.07 }

// Capas de la estela. La primera es la que va pegada a la perla; las de
// atras entran con unas centesimas de retraso, mas anchas y mas tenues,
// que es lo que convierte un punto en una luz con cola.
const ESTELA = [
  { retraso: 0, ancho: 1.6, opacidad: 1 },
  { retraso: 0.09, ancho: 2.8, opacidad: 0.45 },
  { retraso: 0.2, ancho: 4.6, opacidad: 0.18 },
]

// Tamano y brillo de la perla segun el estado del cable. Ahora TODOS los
// cables llevan perla: antes solo la tenian los energizados y el resto se
// quedaba con unos guiones diminutos que ni se veian.
const PERLA = {
  viva: { nucleo: 3.6, halo: 11, opacidadNucleo: 1, opacidadHalo: 0.22 },
  resaltada: { nucleo: 3, halo: 8, opacidadNucleo: 0.95, opacidadHalo: 0.16 },
  normal: { nucleo: 2.1, halo: 6, opacidadNucleo: 0.7, opacidadHalo: 0.09 },
  atenuada: { nucleo: 1.6, halo: 4, opacidadNucleo: 0.06, opacidadHalo: 0 },
}

// Capas del rayo de la descarga: mismo principio, pero de una sola pasada
const RAYO = [
  { ancho: 2.6, opacidad: 1, filamento: true },
  { ancho: 6, opacidad: 0.45, filamento: false },
  { ancho: 12, opacidad: 0.18, filamento: false },
]

// Fraccion del recorrido que ocupa el guion de la estela (2.5 de 100).
// La perla se adelanta esa fraccion para ir en la punta y no en la cola.
const ADELANTO = 0.025

/**
 * Cable entre un prerrequisito y la asignatura que desbloquea.
 * El color lo pone el area del prerrequisito, no un gris generico.
 *
 * Tres cosas que parecen detalles y no lo son:
 *
 * 1. El resplandor se hace apilando trazos cada vez mas anchos y
 *    transparentes, NO con feGaussianBlur. El filtro usa objectBoundingBox
 *    por defecto, asi que en un cable perfectamente horizontal la region
 *    tiene altura cero y el navegador no pinta nada.
 *
 * 2. Los trazos animados NUNCA se desmontan ni cambian de velocidad. Si se
 *    quitan del DOM al entrar o salir del hover, al volver la animacion
 *    arranca de cero y hay que esperar otra vez su animation-delay: se veian
 *    congelados un par de segundos. Aqui solo cambia la opacidad y el radio.
 *
 * 3. Los retardos son negativos, para que cada cable nazca con la animacion
 *    ya empezada en vez de esperar su turno.
 */
function Arista({
  d,
  x2,
  y2,
  area,
  codigoOrigen,
  viva,
  desbloqueando,
  resaltada,
  atenuada,
  descargando,
  claveDescarga,
  retardo,
  velocidad,
}) {
  /* El cable toma el color de su origen, asi se sigue de donde viene. Con una
     excepcion: si ese origen ya esta APROBADO, el cable se pinta del color de
     lo aprobado y no del de su area.
     Es lo que hace que el camino recorrido se lea como UN camino. Con el color
     del area, un tramo de cinco materias aprobadas de cinco areas distintas
     salia de cinco colores y habia que reconstruirlo a ojo; asi es una sola
     linea continua desde el primer semestre hasta donde llegaste, que es
     exactamente lo que se ve en el arbol de ARC. */
  const color = viva ? 'var(--aprobada-superficie)' : colorNodo({ area, codigo: codigoOrigen })

  const estado = atenuada
    ? 'atenuada'
    : resaltada
      ? 'resaltada'
      : viva
        ? 'viva'
        : 'normal'

  const opacidad = OPACIDAD[estado]
  const perla = PERLA[estado]
  const encendida = (viva || resaltada) && !atenuada

  /* Que un cable se VEA satisfecho y que lleve corriente CORRIENDO por dentro
     son dos cosas distintas, y hasta ahora eran la misma.
     Todo cable cuyo origen esta aprobado se dibuja encendido -mas grueso, mas
     opaco, con su halo-, y eso esta bien: dice "este requisito ya lo tienes".
     Pero animarlos todos era animar tambien los que van a materias que ya
     aprobaste, o sea corriente viajando hacia algo terminado. Ademas de no
     significar nada, escalaba al reves: cuanto mas avanzabas, mas cables
     animados. Medido en Sistemas: 10 con diez materias aprobadas, 30 con
     veinticinco, 63 con el pensum casi entero. El estudiante que mas usa la
     aplicacion era el que peor la tenia.
     La estela se queda solo donde la corriente significa algo: de lo que ya
     aprobaste hacia lo que eso te acaba de abrir. Con la misma medida, 5, 13
     y 20: deja de crecer, porque la frontera de lo inscribible siempre es
     pequeña. */
  const conCorriente = (desbloqueando || resaltada) && !atenuada

  /* El grosor va en PIXELES DE PANTALLA, no en unidades del mapa. Lo hace
     vector-effect en `comun`, y es el cambio que decide si este cable dice
     algo o no.

     Con el grosor en unidades del mapa, todo esto se encogia con el zoom.
     Medido con la vista encajada, que es como se abre el mapa: escala 0,243,
     asi que un cable encendido de 2 unidades salia a 0,49 px y uno normal de
     1,4 a 0,34. Los dos por debajo del pixel, y el navegador los suavizaba
     hasta el mismo gris. O sea que toda esta jerarquia -mas grueso, mas
     opaco, con halo- existia en el codigo y no en la pantalla, y encima
     desaparecia justo en la vista general, que es donde uno mira el mapa
     entero para entender por donde va.

     Ahora un cable encendido mide 3,2 px se mire desde donde se mire, y uno
     apagado 1,5: mas del doble, y eso si se ve de lejos.

     El precio esta en el otro extremo y empieza antes de lo que parece: hacia
     escala 1,3 la tarjeta ya ocupa 290 px y el cable, que se quedo en 3,2, se
     lee como un hilo. Se acepta a proposito. Ahi se esta leyendo una materia
     concreta, no siguiendo un recorrido, y el recorrido se sigue en la vista
     general, que es la que se abre por defecto y la que estaba rota. Los
     grosores estan subidos un pelin justo por esto: buscan el punto donde la
     vista general no se emborrona y de cerca el cable todavia tiene cuerpo. */
  const grosor = resaltada ? 3.8 : viva ? 3.2 : atenuada ? 1.3 : 1.5

  // Cuanto se nota la estela segun el estado del cable
  const fuerzaEstela = atenuada ? 0.06 : viva ? 1 : resaltada ? 0.7 : 0.42

  const comun = {
    d,
    fill: 'none',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    vectorEffect: 'non-scaling-stroke',
  }
  const suave = { transition: 'stroke-opacity 240ms ease, stroke-width 240ms ease' }
  const suavePerla = { transition: 'opacity 240ms ease, r 240ms ease' }

  const base = -(retardo + velocidad)
  const ritmo = { '--vel': `${velocidad}s`, '--ruta': `path("${d}")` }

  return (
    // color fija currentColor para que .filamento pueda mezclarlo con el nucleo.
    // data-corriente la usa el CSS para dejar animados en tactil solo los
    // cables por los que la corriente significa algo. Es un atributo aparte de
    // data-encendida a proposito: encendida decide como se VE el cable -halo,
    // grosor, opacidad-, y eso no debe cambiar porque su destino ya este
    // aprobado. Fundirlos en uno apagaria el brillo de medio mapa.
    <g color={color} data-encendida={encendida || undefined} data-corriente={conCorriente || undefined}>
      <path
        {...comun}
        stroke={color}
        strokeOpacity={encendida ? 0.12 : 0}
        strokeWidth={grosor + 9}
        style={suave}
      />
      <path
        {...comun}
        stroke={color}
        strokeOpacity={encendida ? 0.2 : 0}
        strokeWidth={grosor + 4}
        style={suave}
      />

      <path
        {...comun}
        stroke={color}
        strokeOpacity={opacidad}
        strokeWidth={grosor}
        style={suave}
      />

      {/* data-capa deja que el CSS quite la ultima capa en tactil sin que
          este componente tenga que saber en que aparato se esta pintando. */}
      {ESTELA.map((capa, i) => (
        <path
          key={i}
          data-capa={i}
          {...comun}
          pathLength="100"
          className={`cometa ${viva && !atenuada && i === 0 ? 'filamento' : ''}`}
          stroke={viva && !atenuada && i === 0 ? undefined : color}
          strokeOpacity={capa.opacidad * fuerzaEstela}
          strokeWidth={capa.ancho * (viva ? 1.25 : 0.9)}
          style={{ ...suave, ...ritmo, animationDelay: `${base + capa.retraso}s` }}
        />
      ))}

      {/* Halo suave y nucleo brillante, en la cabeza de la estela */}
      <circle
        r={perla.halo}
        className="particula filamento-relleno"
        opacity={perla.opacidadHalo}
        style={{ ...ritmo, ...suavePerla, animationDelay: `${base - ADELANTO * velocidad}s` }}
      />
      <circle
        r={perla.nucleo}
        className="particula filamento-relleno"
        opacity={perla.opacidadNucleo}
        style={{ ...ritmo, ...suavePerla, animationDelay: `${base - ADELANTO * velocidad}s` }}
      />

      {/* Punto de soldadura donde el cable entra a la asignatura */}
      <circle
        cx={x2}
        cy={y2}
        r={encendida ? 3.6 : 2.2}
        fill={color}
        fillOpacity={opacidad}
        style={{ transition: 'fill-opacity 240ms ease, r 240ms ease' }}
      />

      {descargando && (
        <g key={claveDescarga}>
          {RAYO.map((capa, i) => (
            <path
              key={i}
              {...comun}
              pathLength="100"
              className={`descarga ${capa.filamento ? 'filamento' : ''}`}
              stroke={capa.filamento ? undefined : color}
              strokeOpacity={capa.opacidad}
              strokeWidth={capa.ancho}
            />
          ))}
          <circle r="13" className="chispa filamento-relleno" opacity="0.2" style={ritmo} />
          <circle r="5" className="chispa filamento-relleno" style={ritmo} />
          {/* Onda al impactar en el destino */}
          <circle
            cx={x2}
            cy={y2}
            className="onda"
            fill="none"
            stroke={color}
            strokeWidth="2"
          />
        </g>
      )}
    </g>
  )
}

// Todas sus props son valores simples, asi que el memo compara barato.
// Son mas de cien cables y cada uno lleva su estela animada.
export default memo(Arista)
