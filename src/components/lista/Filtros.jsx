import { FILTROS, NOMBRE_FILTRO } from '../../layout/filtrosLista'
import { IconoSituacion } from '../IconoSituacion'
import { colorSituacion } from './aspecto'

/**
 * Los filtros de la lista: las preguntas que se le hacen a un pensum -que
 * puedo inscribir, que llevo, que me falta y que ya pase-, cada uno con el
 * icono que llevan las filas, para que filtro y fila se reconozcan.
 */
export default function Filtros({ filtro, cuentas, alElegir }) {
  /* Pegados arriba al desplazarse, con un degradado debajo en vez de una
     linea. En escritorio se pegan bajo las islas; en el telefono, donde arriba
     no hay islas, suben hasta el borde. Si la carrera tiene avisos, su circulo
     flota en esa misma linea y los filtros le dejan sitio al final
     (--hueco-avisos). */
  return (
    <div className="sticky top-0 z-20 -mx-4 mt-6 bg-lienzo pt-3.5 pb-3 after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-5 after:bg-linear-to-b after:from-lienzo after:to-transparent md:top-[var(--reserva-cabecera)] md:pt-2">
      {/* Con su nombre: el icono solo se aprende, y un filtro tiene que
          entenderse antes de tocarlo. Se desplazan de lado si no caben. */}
      <div
        role="tablist"
        aria-label="Filtrar materias"
        className="flex gap-1.5 overflow-x-auto pr-[var(--hueco-avisos)] pl-4 desplazable-limpio"
      >
        {FILTROS.map((f) => {
          const activo = f.id === filtro
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={activo}
              onClick={() => alElegir(f.id)}
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[12.5px] transition-colors duration-200 ${
                activo
                  ? 'border-transparent bg-[color-mix(in_oklab,var(--tinta)_10%,transparent)] text-tinta'
                  : 'border-panel-borde text-tinta-tenue'
              }`}
            >
              {f.situacion && (
                <IconoSituacion
                  situacion={f.situacion}
                  color={activo ? colorSituacion(f.situacion) : 'currentColor'}
                  size={13}
                />
              )}
              {NOMBRE_FILTRO[f.id]}
              {f.situacion && (
                <span className="text-tinta-tenue tabular-nums">{cuentas[f.id]}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
