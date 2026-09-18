import { memo } from 'react'
import { NODO } from '../layout/constantes'
import { colorNodo, etiquetaArea } from '../theme/areas'
import { ETIQUETA_SITUACION } from '../theme/situacion'
import { codigoVisible } from '../data/codigoVisible'
import CaraTarjeta from './CaraTarjeta'

/**
 * Una materia del mapa. Lo que se ve lo pone CaraTarjeta; aqui solo vive la
 * interaccion y los dos avisos de un instante: el pulso de la materia que se
 * acaba de abrir y el anillo de la que se acaba de tocar.
 *
 * Los dos se montan solo mientras duran y se desmontan solos. Lo que ya no
 * hay es nada que se mueva mientras nadie toca el mapa: el borde que
 * respiraba en las materias en curso era una animacion infinita por tarjeta
 * para decir algo que la etiqueta "Cursando" ya dice quieta.
 */
function NodoAsignatura({
  nodo,
  situacion,
  resaltado,
  atenuado,
  seleccionado,
  destellando,
  claveDestello,
  tocado,
  claveToque,
  alVerFicha,
  alSenalar,
  alDejarDeSenalar,
}) {
  const { x, y, nombre, uc, lineasNombre } = nodo

  return (
    <g
      transform={`translate(${x}, ${y})`}
      opacity={atenuado ? 0.14 : 1}
      onClick={() => alVerFicha(nodo.codigo)}
      onPointerEnter={() => alSenalar(nodo.codigo)}
      onPointerLeave={alDejarDeSenalar}
      className={`grupo-nodo cursor-pointer ${seleccionado ? 'activo' : ''}`}
      style={{ transition: 'opacity 320ms cubic-bezier(0.32, 0.72, 0, 1)' }}
    >
      {/* Etiqueta accesible. El area solo existe donde esta clasificada */}
      <title>
        {[
          codigoVisible(nodo),
          '—',
          nombre,
          nodo.area && `· ${etiquetaArea(nodo.area)}`,
          `· ${ETIQUETA_SITUACION[situacion]}`,
        ]
          .filter(Boolean)
          .join(' ')}
      </title>

      <CaraTarjeta
        situacion={situacion}
        codigo={codigoVisible(nodo)}
        lineasNombre={lineasNombre}
        uc={uc}
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
 * memo porque son hasta ciento siete de estos en pantalla y todos cuelgan de
 * un estado que vive arriba: sin el, señalar UNA materia repintaba el mapa
 * entero. Todas las props son valores simples menos las tres funciones, que
 * vienen fijadas con useCallback desde GrafoPensum.
 */
export default memo(NodoAsignatura)
