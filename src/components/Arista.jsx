import { memo } from 'react'
import { TRAMO } from '../layout/situacion'
import { colorNodo } from '../theme/areas'

/**
 * Cuanto se enciende un cable segun lo que dice. El COLOR lo pone el area de
 * la materia de la que sale; esto solo decide su fuerza. El desorden no lo
 * evita quitar el color sino la jerarquia: lo lejano apenas se ve, y lo que
 * dice algo se enciende.
 */
const FUERZA = {
  [TRAMO.FRONTERA]: { opacidad: 0.55, grosor: 1.75 },
  [TRAMO.RECORRIDO]: { opacidad: 0.5, grosor: 1.5 },
  [TRAMO.PROXIMA]: { opacidad: 0.32, grosor: 1.25 },
  [TRAMO.LEJANA]: { opacidad: 0.12, grosor: 1 },
}

/* Una luz aclarada hacia --flujo-luz: el blanco en oscuro, la tinta en claro */
const avivar = (color) => `color-mix(in oklab, var(--flujo-luz) var(--flujo-mezcla), ${color})`

/* El mismo color con el tono girado en OKLCH, conservando luz y croma. Girar
   en OKLCH y no en HSL es lo que hace que un verde girado 50 grados salga
   con el mismo peso visual que el verde, y no un azul oscuro que se apaga. */
const girar = (color, grados) => `oklch(from ${color} l c calc(h + ${grados}))`

/* Un id que sirva dentro de url(#...). El de la arista trae "->" y codigos
   que empiezan por cifra; en el SVG valdria, pero url() se lee con las reglas
   de CSS y ahi prefiero no depender de que el navegador sea indulgente. */
const idDe = (id) => `flujo-${id.replace(/[^a-zA-Z0-9]/g, '_')}`

/**
 * Cable entre un prerrequisito y la materia que desbloquea.
 *
 * El color se fija una vez en el <g> como `color` y lo de dentro lo usa como
 * currentColor. La excepcion es la frontera, que lleva degradado.
 *
 * LA FRONTERA -de lo aprobado a lo que puedes inscribir- es el unico cable
 * con luz, y su luz CAMBIA de tono mientras viaja hasta llegar pintada como
 * la tarjeta a la que te lleva. Ver los degradados, mas abajo.
 *
 * La luz es un solo trazo fino. Con ocho cables de frontera, que es un avance
 * tipico, son ocho animaciones; las 215 del principio eran de animar los
 * cuarenta y tres cables a la vez, cinco capas cada uno.
 *
 * Sin vector-effect="non-scaling-stroke": con el, el guion se medía en pixeles
 * de pantalla mientras pathLength lo normaliza en coordenadas del dibujo, y la
 * luz salia de otro tamaño y a saltos.
 */
function Arista({
  id,
  d,
  x1,
  y1,
  x2,
  y2,
  area,
  codigoOrigen,
  areaDestino,
  codigoDestino,
  tramo,
  retraso,
  duracion,
  resaltada,
  atenuada,
  foco,
  descargando,
  claveDescarga,
}) {
  const f = FUERZA[tramo]
  const opacidad = atenuada ? 0.04 : resaltada ? 0.2 : f.opacidad
  const frontera = tramo === TRAMO.FRONTERA
  const conLuz = frontera && !atenuada

  const desde = colorNodo({ area, codigo: codigoOrigen })
  const hacia = colorNodo({ area: areaDestino, codigo: codigoDestino })
  /* Con respaldo: si algun dia llega una arista sin id, que salga un cable
     sin degradado propio antes que tumbar el mapa entero por un .replace. */
  const gid = idDe(id ?? `${codigoOrigen}-${codigoDestino}`)
  const ritmo = { animationDelay: retraso, animationDuration: duracion }

  return (
    <g color={desde}>
      {/* Degradados de la frontera.

          La luz no es de un color: gira de tono mientras viaja. Sale con el
          color del area de la que viene, pasa por ese mismo color girado
          medio tono hacia delante y llega con el del area de la materia que
          puedes inscribir, que es el color del punto de su tarjeta.

          El giro es lo que da la variedad. Casi siempre una materia y lo que
          desbloquea son de la misma area, asi que un degradado origen-destino
          a secas se quedaba en morado a morado o rosa a rosa: un color. Girado,
          cada cable tiene su propia iridiscencia, distinta de las demas y
          siempre de la familia de su area -el verde pasa por azul, el azul
          por violeta, el rosa por coral-, asi que no parece un arcoiris puesto
          encima.

          Cada stop lleva el color como atributo ADEMAS de en el estilo. El
          giro usa sintaxis de color relativo, y un navegador que no la
          entienda descarta el estilo entero; sin el atributo, el stop caeria
          a su valor por defecto, que es negro. Con el, cae al color del area
          sin girar, que es simplemente menos vistoso.

          Van en userSpaceOnUse, del origen al destino del cable. En
          objectBoundingBox un cable perfectamente recto tiene caja de alto
          cero y el navegador no pinta nada. */}
      {frontera && (
        <defs>
          <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
            <stop offset="0" stopColor={desde} style={{ stopColor: desde }} />
            <stop offset="0.5" stopColor={desde} style={{ stopColor: girar(desde, 48) }} />
            <stop offset="1" stopColor={hacia} style={{ stopColor: hacia }} />
          </linearGradient>
          <linearGradient
            id={`${gid}-vivo`}
            gradientUnits="userSpaceOnUse"
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
          >
            <stop offset="0" stopColor={desde} style={{ stopColor: avivar(desde) }} />
            <stop
              offset="0.5"
              stopColor={desde}
              style={{ stopColor: avivar(girar(desde, 48)) }}
            />
            <stop offset="1" stopColor={hacia} style={{ stopColor: avivar(hacia) }} />
          </linearGradient>
        </defs>
      )}

      <path
        d={d}
        fill="none"
        strokeLinecap="round"
        style={{
          stroke: frontera ? `url(#${gid})` : 'currentColor',
          strokeOpacity: opacidad,
          strokeWidth: f.grosor,
          transition: 'stroke-opacity 240ms ease',
        }}
      />

      {/* La luz de la frontera: UN trazo fino, sin halo ni estela. Tuvo las
          dos cosas -un resplandor ancho debajo y una cola detras de la
          cabeza- y juntas se leian como una sombra alrededor de la luz, una
          capsula mas que un destello. El color ya hace el trabajo: sale del
          area de la que viene, gira de tono por el camino y llega con el de
          la tarjeta a la que lleva. */}
      {conLuz && (
        <path
          d={d}
          fill="none"
          pathLength="100"
          strokeLinecap="round"
          className="flujo"
          style={{ stroke: `url(#${gid}-vivo)`, strokeWidth: 2.25, ...ritmo }}
        />
      )}

      {/* La cadena de la materia que se mira, dibujandose en su color */}
      {resaltada && (
        <path
          key={foco}
          d={d}
          fill="none"
          pathLength="100"
          strokeLinecap="round"
          className="trazar"
          style={{
            stroke: frontera ? `url(#${gid})` : 'currentColor',
            strokeWidth: 2.25,
            strokeOpacity: 0.95,
          }}
        />
      )}

      {/* Punto de llegada, del color al que llega la luz */}
      {(frontera || resaltada) && !atenuada && (
        <circle
          cx={x2}
          cy={y2}
          r={3}
          style={{ fill: frontera ? hacia : 'currentColor', fillOpacity: resaltada ? 1 : 0.9 }}
        />
      )}

      {/* La luz al aprobar: el cable entero se enciende en verde, con un
          halo ancho y flojo debajo que hace de resplandor sin usar filtro. */}
      {descargando && (
        <g key={claveDescarga}>
          <path
            d={d}
            fill="none"
            pathLength="100"
            strokeLinecap="round"
            className="descarga-halo"
            style={{ stroke: 'var(--estado-aprobada)', strokeWidth: 9, strokeOpacity: 0.18 }}
          />
          <path
            d={d}
            fill="none"
            pathLength="100"
            strokeLinecap="round"
            className="descarga"
            style={{ stroke: 'var(--estado-aprobada)', strokeWidth: 2.5 }}
          />
        </g>
      )}
    </g>
  )
}

// Todas sus props son valores simples, asi que el memo compara barato
export default memo(Arista)
