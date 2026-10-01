import { memo } from 'react'
import { TRAMO } from '../layout/situacion'
import { avivar, colorNodo } from '../theme/areas'

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

/* El mismo color con el tono girado en OKLCH, conservando luz y croma. Girar
   en OKLCH y no en HSL es lo que hace que un verde girado 50 grados salga
   con el mismo peso visual que el verde, y no un azul oscuro que se apaga. */
const girar = (color, grados) => `oklch(from ${color} l c calc(h + ${grados}))`

/* Un id que sirva dentro de url(#...). El de la arista trae "->" y codigos
   que empiezan por cifra; en el SVG valdria, pero url() se lee con las reglas
   de CSS y ahi prefiero no depender de que el navegador sea indulgente. */
const idDe = (id) => `flujo-${id.replace(/[^a-zA-Z0-9]/g, '_')}`

/* Los colores de un cable: el del area de la que sale, el del area a la que
   llega, y el id de sus degradados. */
function coloresDe(arista, areaDestino) {
  return {
    desde: colorNodo({ area: arista.area, codigo: arista.origen }),
    hacia: colorNodo({ area: areaDestino, codigo: arista.destino }),
    gid: idDe(arista.id),
  }
}

/* Cada luz a su ritmo, sacado del indice del cable: con retraso negativo
   nace ya a mitad de su viaje, y cada una a un paso distinto, entre 2,6 y
   3,2 s. Todas a la vez y al mismo paso se verian como un metronomo. */
function ritmoDeLuz(indice) {
  return {
    animationDelay: `-${((indice * 7) % 11) * 0.26}s`,
    animationDuration: `${(2.6 + ((indice * 5) % 7) * 0.1).toFixed(1)}s`,
  }
}

/**
 * Cable entre un prerrequisito y la materia que desbloquea, en el plano base.
 *
 * El mapa va por planos (ver GrafoPensum) y un cable se reparte entre ellos:
 * aqui el trazo quieto, en LuzCable la luz que viaja, y en CableEnFoco la
 * copia nitida que se dibuja encima cuando el cable esta en foco. Este no
 * cambia al señalar nada: solo con el avance, que es cuando cambia lo que
 * dice.
 *
 * El color se fija una vez en el <g> como `color` y lo de dentro lo usa como
 * currentColor. La excepcion es la frontera -de lo aprobado a lo que puedes
 * inscribir-, que lleva degradado.
 *
 * Sus degradados viven aqui y los usan tambien los otros dos planos: un id
 * de SVG vale en todo el documento, y el plano base siempre esta dibujado.
 *
 * La luz es un solo trazo fino. Con ocho cables de frontera, que es un avance
 * tipico, son ocho animaciones; las 215 del principio eran de animar los
 * cuarenta y tres cables a la vez, cinco capas cada uno.
 *
 * Sin vector-effect="non-scaling-stroke": con el, el guion se medía en pixeles
 * de pantalla mientras pathLength lo normaliza en coordenadas del dibujo, y la
 * luz salia de otro tamaño y a saltos.
 */
function CableBase({ arista, areaDestino, tramo, descargando, claveDescarga }) {
  const f = FUERZA[tramo]
  const frontera = tramo === TRAMO.FRONTERA
  const { desde, hacia, gid } = coloresDe(arista, areaDestino)
  const { d, x1, y1, x2, y2 } = arista

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
          strokeOpacity: f.opacidad,
          strokeWidth: f.grosor,
          transition: 'stroke-opacity 240ms ease',
        }}
      />

      {/* Punto de llegada, del color al que llega la luz */}
      {frontera && <circle cx={x2} cy={y2} r={3} style={{ fill: hacia, fillOpacity: 0.9 }} />}

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

/**
 * La luz que viaja por un cable de la frontera hacia lo que puedes inscribir:
 * UN trazo fino, sin halo ni estela. Tuvo las dos cosas -un resplandor ancho
 * debajo y una cola detras de la cabeza- y juntas se leian como una sombra
 * alrededor de la luz, una capsula mas que un destello. El color ya hace el
 * trabajo: sale del area de la que viene, gira de tono por el camino y llega
 * con el de la tarjeta a la que lleva.
 *
 * Va en su propio plano porque es lo unico del mapa que se mueve solo: cada
 * cuadro de su animacion repinta el plano en el que esta, y aqui ese plano no
 * tiene nada mas que repintar.
 */
function LuzCable({ arista, indice }) {
  return (
    <path
      d={arista.d}
      fill="none"
      pathLength="100"
      strokeLinecap="round"
      className="flujo"
      style={{
        stroke: `url(#${idDe(arista.id)}-vivo)`,
        strokeWidth: 2.25,
        ...ritmoDeLuz(indice),
      }}
    />
  )
}

/**
 * La copia nitida de un cable en foco, en el plano de encima: el trazo, su
 * luz si es de frontera y, si es de la cadena que se mira, ese mismo cable
 * dibujandose en su color de origen a destino.
 */
function CableEnFoco({ arista, indice, areaDestino, tramo, resaltada, foco }) {
  const f = FUERZA[tramo]
  const frontera = tramo === TRAMO.FRONTERA
  const { desde, hacia, gid } = coloresDe(arista, areaDestino)
  const trazo = frontera ? `url(#${gid})` : 'currentColor'

  return (
    <g color={desde}>
      <path
        d={arista.d}
        fill="none"
        strokeLinecap="round"
        style={{
          stroke: trazo,
          strokeOpacity: resaltada ? 0.2 : f.opacidad,
          strokeWidth: f.grosor,
        }}
      />

      {frontera && <LuzCable arista={arista} indice={indice} />}

      {/* La cadena de la materia que se mira, dibujandose en su color. La
          key es la materia: mirar otra vuelve a dibujarla desde el origen. */}
      {resaltada && (
        <path
          key={foco}
          d={arista.d}
          fill="none"
          pathLength="100"
          strokeLinecap="round"
          className="trazar"
          style={{ stroke: trazo, strokeWidth: 2.25, strokeOpacity: 0.95 }}
        />
      )}

      {(frontera || resaltada) && (
        <circle
          cx={arista.x2}
          cy={arista.y2}
          r={3}
          style={{ fill: frontera ? hacia : 'currentColor', fillOpacity: resaltada ? 1 : 0.9 }}
        />
      )}
    </g>
  )
}

/* Todas sus props son valores simples o vienen fijas del layout -la arista es
   el mismo objeto mientras no cambie la carrera-: el memo compara barato. */
const CableBaseMemo = memo(CableBase)
const LuzCableMemo = memo(LuzCable)
const CableEnFocoMemo = memo(CableEnFoco)

export { CableBaseMemo as CableBase, LuzCableMemo as LuzCable, CableEnFocoMemo as CableEnFoco }
