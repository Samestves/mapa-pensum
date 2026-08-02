import { useEffect, useMemo, useState } from 'react'
import { Check, Lock, X } from 'lucide-react'
import { ESTADO } from '../hooks/usePensum'
import { colorArea } from '../theme/areas'

const TIPOS = [
  { clave: 'tecnica', titulo: 'Electivas técnicas' },
  { clave: 'humanistica', titulo: 'Electivas humanísticas' },
]

function Cuota({ titulo, avance }) {
  const pct = avance.meta ? Math.min(100, (avance.uc / avance.meta) * 100) : 0
  const color = avance.completa ? 'var(--estado-aprobada)' : 'var(--estado-cursando)'

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-bold text-tinta-suave">{titulo}</span>
        <span className="font-mono text-xs font-bold" style={{ color }}>
          {avance.uc}/{avance.meta} UC
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-lienzo">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function Fila({ electiva, estado, bloqueada, faltan, alAlternar }) {
  const aprobada = estado === ESTADO.APROBADA
  const color = colorArea(electiva.area)

  return (
    <li>
      <button
        type="button"
        onClick={alAlternar}
        className="flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors"
        style={{
          borderColor: aprobada ? 'var(--estado-aprobada)' : 'var(--panel-borde)',
          backgroundColor: aprobada
            ? 'color-mix(in oklab, var(--estado-aprobada) 12%, transparent)'
            : 'transparent',
        }}
      >
        <span
          className="grid size-4 shrink-0 place-items-center rounded border"
          style={{
            borderColor: aprobada ? 'var(--estado-aprobada)' : 'var(--tinta-tenue)',
            backgroundColor: aprobada ? 'var(--estado-aprobada)' : 'transparent',
          }}
        >
          {aprobada && <Check size={11} className="text-[var(--panel)]" strokeWidth={3.5} />}
        </span>

        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11px] font-semibold text-tinta">
            {electiva.nombre}
          </span>
          <span className="block font-mono text-[9px] text-tinta-tenue">
            {electiva.codigo}
            {bloqueada && ` · te falta ${faltan}`}
          </span>
        </span>

        {bloqueada && !aprobada && (
          <Lock size={12} className="shrink-0 text-tinta-tenue" />
        )}
        <span className="shrink-0 font-mono text-[10px] text-tinta-tenue">
          {electiva.uc} UC
        </span>
      </button>
    </li>
  )
}

/**
 * Catalogo de electivas. No van en el mapa principal a proposito: no tienen
 * semestre fijo, cada estudiante escoge un puñado distinto y meterlas en la
 * malla romperia el layout por columnas. Aqui se marcan y cuentan para la
 * cuota de creditos del titulo.
 */
function PanelElectivas({ electivas, estados, marcas, avance, alMarcar, alCerrar }) {
  const [filtro, setFiltro] = useState('')

  useEffect(() => {
    const tecla = (e) => e.key === 'Escape' && alCerrar()
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [alCerrar])

  const nombrePorCodigo = useMemo(() => {
    const mapa = new Map(electivas.map((e) => [e.codigo, e.nombre]))
    return mapa
  }, [electivas])

  const listas = useMemo(() => {
    const texto = filtro.trim().toLowerCase()
    return TIPOS.map(({ clave, titulo }) => ({
      clave,
      titulo,
      items: electivas
        .filter((e) => e.tipo === clave)
        .filter((e) => !texto || e.nombre.toLowerCase().includes(texto) || e.codigo.includes(texto))
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    }))
  }, [electivas, filtro])

  const faltanDe = (e) =>
    (e.prerrequisitos ?? [])
      .filter((p) => marcas[p] !== ESTADO.APROBADA)
      .map((p) => nombrePorCodigo.get(p) ?? p)
      .join(', ')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={alCerrar}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
      />

      <div className="surgir relative flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-panel-borde bg-panel shadow-2xl">
        <header className="shrink-0 border-b border-panel-borde p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-extrabold text-tinta">Mis electivas</h2>
              <p className="mt-0.5 text-[11px] text-tinta-tenue">
                Escoges las que quieras hasta cubrir cada cuota de créditos.
              </p>
            </div>
            <button
              type="button"
              onClick={alCerrar}
              aria-label="Cerrar"
              className="grid size-7 shrink-0 place-items-center rounded-md text-tinta-tenue hover:text-tinta"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Cuota titulo="Técnicas" avance={avance.tecnica} />
            <Cuota titulo="Humanísticas" avance={avance.humanistica} />
          </div>

          <input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Buscar por nombre o código"
            className="seleccionable mt-3 w-full rounded-lg border border-panel-borde bg-panel-suave px-3 py-1.5 text-xs text-tinta outline-none placeholder:text-tinta-tenue focus:border-aprobada"
          />
        </header>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2">
          {listas.map(({ clave, titulo, items }) => (
            <section key={clave}>
              <h3 className="mb-2 text-[10px] font-bold tracking-wide text-tinta-tenue uppercase">
                {titulo} · {items.length}
              </h3>
              <ul className="flex flex-col gap-1">
                {items.map((e) => (
                  <Fila
                    key={e.codigo}
                    electiva={e}
                    estado={estados[e.codigo]}
                    bloqueada={estados[e.codigo] === ESTADO.BLOQUEADA}
                    faltan={faltanDe(e)}
                    alAlternar={() =>
                      alMarcar(
                        e.codigo,
                        marcas[e.codigo] === ESTADO.APROBADA ? null : ESTADO.APROBADA,
                      )
                    }
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PanelElectivas
