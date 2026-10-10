import { Plus } from 'lucide-react'
import { useEstados } from '../../hooks/useAvance'
import { altoDeGrupo, reserva } from '../../layout/alturaLista'
import { tituloGrupo } from '../../layout/franjaElectivas'
import { situacionDe } from '../../layout/situacion'
import Riel from './Riel'

/**
 * Un grupo de electivas al final de la lista: lo que llevas de la meta y
 * tus electivas, o todas las opciones si lo abres. Con un filtro solo salen
 * las electivas que ya son tuyas: las veintitantas opciones del catalogo
 * enterrarian las obligatorias, que son lo que el filtro viene a buscar.
 *
 * Devuelve null si con el filtro puesto no queda nada que enseñar.
 */
export default function SeccionGrupo({ g, filtro, entra, abierto, fila, alAbrir }) {
  const estados = useEstados()
  const id = `grupo-${g.clave}`
  const candidatas = filtro === 'todo' ? g.items : g.marcadas
  const items = candidatas.filter((e) => entra(situacionDe(e.codigo, e.prerrequisitos, estados)))
  if (filtro !== 'todo' && !items.length) return null

  const mostradas = filtro === 'todo' && !abierto ? g.marcadas : items
  const avance = g.avance
  return (
    <section
      id={`lista-${id}`}
      className="seccion-lista lista-entrar scroll-mt-[var(--margen-seccion)] pb-7 pl-7"
      style={reserva(altoDeGrupo({ conRiel: avance?.meta != null, filas: mostradas.length }))}
    >
      <div className="flex items-center gap-4 pb-3">
        <h2 className="min-w-0 flex-1 truncate text-[17px] leading-tight font-light tracking-[-0.02em] text-tinta">
          {tituloGrupo(g)
            .toLowerCase()
            .replace(/^./, (c) => c.toUpperCase())}
        </h2>
        <span
          className="shrink-0 text-[12px] tabular-nums"
          style={{
            color: avance?.completa ? 'var(--estado-aprobada)' : 'var(--tinta-tenue)',
          }}
        >
          {avance?.meta != null ? `${avance.uc}/${avance.meta} UC` : `${avance?.uc ?? 0} UC`}
        </span>
        {filtro === 'todo' && (
          <button
            type="button"
            onClick={() => alAbrir(g.clave, !abierto)}
            aria-expanded={abierto}
            aria-label={abierto ? 'Ver solo las tuyas' : `Ver las ${g.cantidad} opciones`}
            className="flex h-8 shrink-0 items-center gap-1 rounded-full border border-panel-borde px-3 text-[12px] text-tinta-suave tabular-nums transition-colors"
          >
            <Plus
              size={12}
              strokeWidth={1.75}
              className={`transition-transform duration-300 ${abierto ? 'rotate-45' : ''}`}
            />
            {abierto ? 'Ocultar' : `${g.cantidad} opciones`}
          </button>
        )}
      </div>
      {avance?.meta != null && (
        <div className="pb-3">
          <Riel hechas={Math.min(avance.uc, avance.meta)} cursando={0} total={avance.meta} />
        </div>
      )}

      {mostradas.length > 0 && (
        <ul className="divide-y divide-panel-borde overflow-hidden rounded-2xl border border-panel-borde bg-panel">
          {mostradas.map(fila)}
        </ul>
      )}
    </section>
  )
}
