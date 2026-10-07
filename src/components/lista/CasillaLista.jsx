import { MARCA_SEMESTRE, etiquetaDeCasilla } from '../../data/semestre'
import GlifoSemestre from '../GlifoSemestre'

/** La casilla de marcar un semestre entero en su cabecera de la lista. */
export default function CasillaLista({ semestre, resumen, alAlternar }) {
  const { marca } = resumen
  const etiqueta = etiquetaDeCasilla(marca, semestre)
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={
        marca === MARCA_SEMESTRE.COMPLETO
          ? 'true'
          : marca === MARCA_SEMESTRE.VACIO
            ? 'false'
            : 'mixed'
      }
      aria-label={etiqueta}
      title={etiqueta}
      data-marca={marca}
      onClick={() => alAlternar(semestre)}
      className="casilla-semestre -mt-1.5 -mr-1.5 grid size-10 shrink-0 place-items-center rounded-xl transition-transform duration-150 active:scale-90"
    >
      <svg viewBox="-2 -2 18 18" width={25} height={25} aria-hidden="true">
        <GlifoSemestre resumen={resumen} />
      </svg>
    </button>
  )
}
