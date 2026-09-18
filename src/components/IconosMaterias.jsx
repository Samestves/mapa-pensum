import { memo } from 'react'
import { ICONO } from '../layout/constantes'

/* El grosor de la linea de Phosphor light en cada caja: los iconos que son
   trazo -los de Tabler y los dibujados a mano- se pintan con el mismo para
   que no se note de que familia viene cada uno. */
const GROSOR = { 256: 12, 24: 1.125 }

/**
 * Los iconos de las materias de esta carrera, una vez cada uno.
 *
 * Cada tarjeta los usa con un <use> que apunta aqui, en vez de llevar sus
 * propios trazos: las nueve tarjetas de Contabilidad comparten una sola
 * calculadora.
 *
 * El corte por el borde de la tarjeta sale gratis: la caja de cada simbolo
 * abarca solo el trozo del icono que asoma, y un simbolo no pinta fuera de
 * su caja. Con un clipPath con la forma de la tarjeta la esquina quedaba
 * redondeada tambien en el icono, pero eran ciento y pico recortes por
 * cuadro: medido a CPU x4, el mapa tardaba un 15 % mas en pintarse con los
 * iconos que sin ellos. La esquina que se pierde son dos unidades de mapa de
 * un trazo casi transparente.
 *
 * Los trazos llegan con la carrera (ver scripts/iconosMaterias.js), asi que
 * aqui solo estan los de las materias que tiene.
 */
function IconosMaterias({ iconos }) {
  if (!iconos) return null
  return (
    <defs>
      {Object.entries(iconos).map(([nombre, { caja, trazo, d }]) => (
        <symbol
          key={nombre}
          id={`icono-${nombre}`}
          viewBox={`0 0 ${(caja * ICONO.ancho) / ICONO.tam} ${(caja * ICONO.alto) / ICONO.tam}`}
        >
          {trazo ? (
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth={GROSOR[caja]}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {d.map((trazo, i) => (
                <path key={i} d={trazo} />
              ))}
            </g>
          ) : (
            d.map((contorno, i) => <path key={i} d={contorno} fill="currentColor" />)
          )}
        </symbol>
      ))}
    </defs>
  )
}

export default memo(IconosMaterias)
