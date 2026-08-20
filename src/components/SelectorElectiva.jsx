import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Lock, Search, Trash2, X } from 'lucide-react'
import { ESTADO } from '../data/estados'
import { colorNodo } from '../theme/areas'
import { codigoVisible } from '../data/codigoVisible'
import { useCerrarConEscape } from '../hooks/useCerrarConEscape'

const sinTildes = (t) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/**
 * Elegir que electiva va en una casilla del pensum.
 *
 * Se abre al pulsar una casilla y enseña SOLO las de su grupo: en una casilla
 * sociohumanistica no se ofrece una tecnica, porque no contaria para esa
 * cuota aunque quepa en el hueco. Filtrar aqui evita tener que explicar
 * despues por que una eleccion no sumo.
 *
 * Cada fila dice tres cosas y las tres importan al decidir:
 *   - las UC, que es lo que llena la cuota
 *   - si ya la aprobaste, porque entonces esa casilla ya esta resuelta
 *   - si esta bloqueada por prelaciones, que no impide ponerla -puedes
 *     planificarla para mas adelante- pero si conviene saberlo antes
 *
 * Las que ya estan en otra casilla se enseñan igual, marcadas. Ponerlas aqui
 * las mueve en vez de duplicarlas, que es lo que espera cualquiera; ocultarlas
 * dejaria a alguien buscando una materia que sabe que existe.
 */
function SelectorElectiva({ casilla, grupo, opciones, estados, casillaDe, alColocar, alCerrar }) {
  useCerrarConEscape(alCerrar)
  const [busqueda, setBusqueda] = useState('')

  const puesta = Object.entries(casillaDe).find(([, c]) => c === casilla.codigo)?.[0] ?? null

  const filtradas = useMemo(() => {
    const q = sinTildes(busqueda.trim())
    const lista = q
      ? opciones.filter(
          (o) => sinTildes(o.nombre).includes(q) || o.codigo.includes(q),
        )
      : opciones
    /* Orden: primero lo que ya aprobaste -si la materia esta hecha, ponerla
       aqui cierra la casilla de una vez-, despues lo que puedes inscribir, y
       al final lo bloqueado. Alfabetico dentro de cada bloque. */
    const rango = (o) => {
      const e = estados[o.codigo]
      if (e === ESTADO.APROBADA) return 0
      if (e === ESTADO.BLOQUEADA) return 2
      return 1
    }
    return [...lista].sort(
      (a, b) => rango(a) - rango(b) || a.nombre.localeCompare(b.nombre, 'es'),
    )
  }, [opciones, busqueda, estados])

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-center overflow-hidden md:items-center md:p-4">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={alCerrar}
        className="fixed inset-0 cursor-default bg-black/55 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Elegir ${casilla.nombre}`}
        className="surgir transicion-tema relative z-10 mt-auto flex max-h-[88dvh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-2xl border border-panel-borde bg-panel shadow-2xl md:mt-0 md:rounded-2xl"
      >
        <header className="flex items-start gap-3 border-b border-panel-borde px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] tracking-[0.11em] text-tinta-suave">
              SEMESTRE {casilla.semestre}
            </p>
            <h3 className="text-[17px] leading-tight font-extrabold tracking-[-0.02em] text-tinta">
              {casilla.nombre}
            </h3>
            <p className="mt-1 text-[11px] text-tinta-suave">
              {grupo?.cuota != null
                ? `El pensum pide ${grupo.cuota} UC de este grupo en total`
                : `${opciones.length} opciones`}
            </p>
          </div>
          <button
            type="button"
            onClick={alCerrar}
            aria-label="Cerrar"
            className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg text-tinta-suave transition-colors hover:bg-panel-suave hover:text-tinta"
          >
            <X size={15} />
          </button>
        </header>

        {/* El buscador solo aparece cuando hay lista que buscar. Con ocho
            opciones estorba mas de lo que ayuda, y en un telefono ademas
            levanta el teclado encima de lo que vienes a leer. */}
        {opciones.length > 10 && (
          <div className="border-b border-panel-borde px-5 py-3">
            <div className="flex items-center gap-2 rounded-xl bg-panel-suave px-3 py-2">
              <Search size={14} className="shrink-0 text-tinta-tenue" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar materia"
                className="min-w-0 flex-1 bg-transparent text-[12px] text-tinta outline-none placeholder:text-tinta-tenue"
              />
            </div>
          </div>
        )}

        <ul className="min-h-0 flex-1 divide-y divide-panel-borde overflow-y-auto overscroll-contain">
          {filtradas.map((o) => {
            const estado = estados[o.codigo]
            const aprobada = estado === ESTADO.APROBADA
            const bloqueada = estado === ESTADO.BLOQUEADA
            const enOtra = casillaDe[o.codigo] && casillaDe[o.codigo] !== casilla.codigo
            const aqui = casillaDe[o.codigo] === casilla.codigo

            return (
              <li key={o.codigo}>
                <button
                  type="button"
                  onClick={() => alColocar(casilla.codigo, aqui ? null : o.codigo)}
                  /* cursor-pointer explicito, y no sobra: Tailwind v4 le pone
                     cursor:default a todos los <button> en su preflight, asi
                     que una fila que claramente se pulsa se quedaba con la
                     flecha de siempre. La mano es la unica señal de que esto
                     es una lista para elegir y no una lista para leer.
                     focus-visible para quien llegue con el teclado: sin el, la
                     fila enfocada no se distingue de las demas. */
                  className="flex w-full cursor-pointer items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-panel-suave focus-visible:bg-panel-suave focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--estado-aprobada)]"
                >
                  <span
                    className="h-8 w-1 shrink-0 rounded-full"
                    style={{
                      backgroundColor: colorNodo(o),
                      opacity: bloqueada ? 0.4 : 1,
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-tinta">
                      {o.nombre}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-[10px] text-tinta-tenue">
                      <span className="font-mono">{codigoVisible(o)}</span>
                      <span className="font-mono font-semibold text-tinta-suave">
                        {o.uc} UC
                      </span>
                      {aprobada && (
                        <span className="font-semibold text-[var(--estado-aprobada)]">
                          aprobada
                        </span>
                      )}
                      {bloqueada && (
                        <span className="flex items-center gap-1">
                          <Lock size={9} />
                          te faltan prelaciones
                        </span>
                      )}
                      {enOtra && <span>· ya está en otra casilla</span>}
                    </span>
                  </span>
                  {aqui && (
                    <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-[color-mix(in_oklab,var(--estado-aprobada)_18%,transparent)] text-[var(--estado-aprobada)]">
                      <Check size={13} />
                    </span>
                  )}
                </button>
              </li>
            )
          })}

          {filtradas.length === 0 && (
            <li className="px-5 py-8 text-center text-[12px] text-tinta-tenue">
              Ninguna coincide con «{busqueda}»
            </li>
          )}
        </ul>

        {/* Vaciar solo existe cuando hay algo que vaciar. Un boton apagado
            permanente ocupa sitio para decir que no hay nada que hacer. */}
        {puesta && (
          <div className="border-t border-panel-borde px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={() => alColocar(casilla.codigo, null)}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-panel-borde py-2.5 text-[12px] font-semibold text-tinta-suave transition-colors hover:border-[var(--estado-rojo)] hover:text-[var(--estado-rojo)]"
            >
              <Trash2 size={14} />
              Vaciar la casilla
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

export default SelectorElectiva
