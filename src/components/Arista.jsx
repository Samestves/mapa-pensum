import { colorArea } from '../theme/areas'

const OPACIDAD = { viva: 0.9, resaltada: 1, normal: 0.42, atenuada: 0.07 }

// Capas de la estela. La primera es la cabeza: fina y brillante. Las de
// atras van mas anchas y tenues y con unas centesimas de retraso, que es
// lo que convierte el punto en una luz con cola.
const ESTELA = [
  { retraso: 0, ancho: 1.5, opacidad: 1 },
  { retraso: 0.1, ancho: 2.6, opacidad: 0.42 },
  { retraso: 0.22, ancho: 4.2, opacidad: 0.16 },
]

// Capas del rayo de la descarga, misma idea pero de una pasada
const RAYO = [
  { ancho: 2.6, opacidad: 1, filamento: true },
  { ancho: 6, opacidad: 0.45, filamento: false },
  { ancho: 12, opacidad: 0.18, filamento: false },
]

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
 *    congelados un par de segundos. Aqui solo cambia la opacidad.
 *
 * 3. Los retardos son negativos, para que cada cable nazca con la animacion
 *    ya empezada en vez de esperar su turno.
 */
function Arista({
  d,
  x2,
  y2,
  area,
  viva,
  resaltada,
  atenuada,
  descargando,
  claveDescarga,
  retardo,
}) {
  const color = colorArea(area)

  const estado = atenuada
    ? 'atenuada'
    : resaltada
      ? 'resaltada'
      : viva
        ? 'viva'
        : 'normal'

  const opacidad = OPACIDAD[estado]
  const encendida = (viva || resaltada) && !atenuada
  const grosor = resaltada ? 2.4 : viva ? 2 : 1.4

  // Cuanto se nota la estela segun el estado del cable
  const fuerzaEstela = atenuada ? 0.06 : viva ? 1 : resaltada ? 0.55 : 0.3

  const comun = { d, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }
  const suave = { transition: 'stroke-opacity 240ms ease, stroke-width 240ms ease' }

  return (
    // color fija currentColor para que .filamento pueda mezclarlo con el nucleo
    <g color={color}>
      <path
        {...comun}
        stroke={color}
        strokeOpacity={encendida ? 0.12 : 0}
        strokeWidth={grosor + 12}
        style={suave}
      />
      <path
        {...comun}
        stroke={color}
        strokeOpacity={encendida ? 0.2 : 0}
        strokeWidth={grosor + 6}
        style={suave}
      />

      <path
        {...comun}
        stroke={color}
        strokeOpacity={opacidad}
        strokeWidth={grosor}
        style={suave}
      />

      {ESTELA.map((capa, i) => (
        <path
          key={i}
          {...comun}
          pathLength="100"
          className={`cometa ${viva && !atenuada && i === 0 ? 'filamento' : ''}`}
          stroke={viva && !atenuada && i === 0 ? undefined : color}
          strokeOpacity={capa.opacidad * fuerzaEstela}
          strokeWidth={capa.ancho * (viva ? 1.25 : 0.85)}
          style={{ ...suave, animationDelay: `${-(retardo + 1) + capa.retraso}s` }}
        />
      ))}

      {/* Cabeza luminosa sobre la curva real, solo cuando pasa corriente */}
      <circle
        r="3.2"
        className="particula filamento-relleno"
        opacity={viva && !atenuada ? 1 : 0}
        style={{
          animationDelay: `${-(retardo + 1)}s`,
          '--ruta': `path("${d}")`,
          transition: 'opacity 240ms ease',
        }}
      />
      <circle
        r="8"
        className="particula filamento-relleno"
        opacity={viva && !atenuada ? 0.16 : 0}
        style={{
          animationDelay: `${-(retardo + 1)}s`,
          '--ruta': `path("${d}")`,
          transition: 'opacity 240ms ease',
        }}
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
          <circle
            r="5"
            className="chispa filamento-relleno"
            style={{ '--ruta': `path("${d}")` }}
          />
          <circle
            r="13"
            className="chispa filamento-relleno"
            opacity="0.2"
            style={{ '--ruta': `path("${d}")` }}
          />
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

export default Arista
