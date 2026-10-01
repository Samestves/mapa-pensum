import { memo } from 'react'
import { NODO } from '../layout/constantes'
import { colorNodo, etiquetaArea } from '../theme/areas'
import { ETIQUETA_SITUACION } from '../theme/situacion'
import { codigoVisible } from '../data/codigoVisible'
import { FormaTarjeta } from './CaraTarjeta'

/**
 * Una materia del mapa, en el SVG. La forma la pone FormaTarjeta y el texto
 * va aparte, en la capa de texto del plano (ver TextoTarjeta); aqui vive la
 * interaccion y los dos avisos de un instante: el pulso de la materia que se
 * acaba de abrir y el anillo de la que se acaba de tocar.
 *
 * Los dos se montan solo mientras duran y se desmontan solos. Lo que ya no
 * hay es nada que se mueva mientras nadie toca el mapa: el borde que
 * respiraba en las materias en curso era una animacion infinita por tarjeta
 * para decir algo que la etiqueta "Cursando" ya dice quieta.
 *
 * Señalar es cosa del raton (y del lapiz), no del dedo. Un dedo que se apoya
 * dispara pointerenter igual que un cursor que llega, y el primer dedo de un
 * pellizco caia casi siempre sobre una tarjeta: su cadena se encendia, el
 * resto del mapa se atenuaba y al llegar el segundo dedo todo volvia. Ese ida
 * y vuelta era el parpadeo de las tarjetas al alejar. Con el dedo, la cadena
 * se pide manteniendolo quieto medio segundo, y se queda puesta aunque el
 * mapa se mueva (ver layout/mantenerRuta.js). data-codigo es como ese gesto
 * sabe sobre que tarjeta se mantiene.
 *
 * No sabe si esta apagada. El foco del mapa no apaga tarjeta por tarjeta: la
 * misma tarjeta se dibuja en el plano base, siempre igual, y si esta en foco
 * otra vez encima, nitida y resaltada (ver layout/foco.js).
 */
function NodoAsignatura({
  nodo,
  situacion,
  resaltado,
  seleccionado,
  destellando,
  claveDestello,
  tocado,
  claveToque,
  alVerFicha,
  alSenalar,
  alDejarDeSenalar,
}) {
  const { x, y, nombre } = nodo

  /* El nombre accesible va en aria-label y no en un <title>. El <title> de
     un SVG lo lee el lector de pantalla, pero el navegador ademas lo saca
     como cartel nativo al dejar el raton quieto encima: un recuadro del
     sistema, con su letra y su fondo, tapando el mapa para repetir lo que la
     tarjeta ya dice. El area solo existe donde esta clasificada. */
  const etiqueta = [
    codigoVisible(nodo),
    '—',
    nombre,
    nodo.area && `· ${etiquetaArea(nodo.area)}`,
    `· ${ETIQUETA_SITUACION[situacion]}`,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <g
      role="button"
      aria-label={etiqueta}
      data-codigo={nodo.codigo}
      transform={`translate(${x}, ${y})`}
      onClick={() => alVerFicha(nodo.codigo)}
      onPointerEnter={(e) => e.pointerType !== 'touch' && alSenalar(nodo.codigo)}
      onPointerLeave={(e) => e.pointerType !== 'touch' && alDejarDeSenalar()}
      className="grupo-nodo cursor-pointer"
    >
      <FormaTarjeta
        situacion={situacion}
        acento={colorNodo(nodo)}
        seleccionado={seleccionado}
        resaltado={resaltado}
      />

      {/* La que se acaba de abrir se despierta: su contorno se ensancha y se
          apaga, una vez, cuando la luz del cable llega a ella. */}
      {destellando && (
        <rect
          key={claveDestello}
          width={NODO.ancho}
          height={NODO.alto}
          rx={NODO.radio}
          className="destello"
          fill="none"
          stroke="var(--sit-inscribible-luz)"
          strokeWidth={1.5}
        />
      )}

      {/* Anillo de confirmacion, solo en la tarjeta que se acaba de tocar: si
          saltara en cada cambio de estado derivado, aprobar una materia haria
          parpadear medio mapa. */}
      {tocado && (
        <rect
          key={claveToque}
          className="anillo-cambio"
          width={NODO.ancho}
          height={NODO.alto}
          rx={NODO.radio}
          fill="none"
          stroke="var(--tinta)"
        />
      )}
    </g>
  )
}

/**
 * memo porque son hasta ciento siete de estos y todos cuelgan de un estado
 * que vive arriba: sin el, aprobar UNA materia repintaba el mapa entero.
 * Todas las props son valores simples menos las tres funciones, que vienen
 * fijadas con useCallback desde GrafoPensum.
 */
export default memo(NodoAsignatura)
