import { MARCA_SEMESTRE } from '../data/semestre'
import { tramosDeSemestre } from '../layout/tramos'

/**
 * El dibujo de la casilla de un semestre, en un cuadro de 14: un aro partido
 * en un tramo por materia.
 *
 *   verdes    las aprobadas
 *   ambar     las que cursas
 *   grises    las que faltan
 *   apagados  las casillas de electiva sin elegir
 *
 * Con todo aprobado menos una electiva sin elegir lleva un + en el centro:
 * es lo que hace falta, y pulsarla abre el selector. Completo es el sello
 * verde con su check, el mismo de una materia aprobada.
 *
 * Los colores salen de las variables de .casilla-semestre (estilos/mapa.css),
 * que es donde se decide que cambia al apuntarle: lo que falta se enciende en
 * verde con un check en el centro, y el sello se apaga.
 *
 * Lo usan la cabecera de semestre del mapa (dentro de su SVG) y la de la
 * lista (en su propio <svg>).
 */
export default function GlifoSemestre({ resumen }) {
  if (resumen.marca === MARCA_SEMESTRE.COMPLETO) {
    return (
      <>
        <circle cx={7} cy={7} r={8.6} className="foco" />
        <circle cx={7} cy={7} r={7} className="sello" />
        <path d="M4 7.3 6.2 9.5 10.3 4.9" className="tilde" />
      </>
    )
  }

  const aro = tramosDeSemestre(resumen)
  const faltaElegir = resumen.marca === MARCA_SEMESTRE.FALTA_ELEGIR
  return (
    <>
      <circle cx={7} cy={7} r={8.6} className="foco" />
      {aro.huecos && <path d={aro.huecos} className="tramo huecos" />}
      {aro.pendientes && <path d={aro.pendientes} className="tramo pendientes" />}
      {aro.cursando && <path d={aro.cursando} className="tramo cursando" />}
      {aro.hechas && <path d={aro.hechas} className="tramo hechas" />}
      {faltaElegir ? (
        <path d="M7 4.6v4.8M4.6 7h4.8" className="mas" />
      ) : (
        /* El check que asoma al apuntarle: lo que va a pasar */
        <path d="M4.9 7.2 6.4 8.7 9.1 5.6" className="pista" />
      )}
    </>
  )
}
