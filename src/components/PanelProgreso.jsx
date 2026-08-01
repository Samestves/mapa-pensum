import { ChevronsRight, CircleDot, GraduationCap, ListChecks, LockOpen } from 'lucide-react'
import { colorArea, etiquetaArea } from '../theme/areas'
import { useNumeroAnimado } from '../hooks/useNumeroAnimado'

function Dato({ icono: Icono, valor, de, etiqueta, color }) {
  return (
    <div className="transicion-tema rounded-lg border border-panel-borde bg-panel-suave px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-tinta-tenue uppercase">
        <Icono size={12} color={color} />
        {etiqueta}
      </div>
      <div className="mt-1.5 font-mono text-lg leading-none font-bold text-tinta">
        {valor}
        {de != null && <span className="text-xs text-tinta-tenue"> / {de}</span>}
      </div>
    </div>
  )
}

/**
 * Fila de avance por area. Al pulsarla se aisla esa area en el grafo, que es
 * la razon de que este aqui: no es solo una estadistica, es un filtro.
 */
function FilaArea({ fila, activa, alPulsar }) {
  const color = colorArea(fila.area)
  const pct = fila.uc ? (fila.ucAprobadas / fila.uc) * 100 : 0

  return (
    <button
      type="button"
      onClick={alPulsar}
      title={`Aislar ${etiquetaArea(fila.area)} en el mapa`}
      className={`w-full rounded-lg border px-2.5 py-2 text-left transition-colors ${
        activa ? 'border-transparent bg-panel-suave' : 'border-transparent hover:bg-panel-suave'
      }`}
      style={activa ? { borderColor: color } : undefined}
    >
      <div className="flex items-center gap-2">
        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-tinta">
          {etiquetaArea(fila.area)}
        </span>
        <span className="shrink-0 font-mono text-[10px] text-tinta-tenue">
          {fila.ucAprobadas}/{fila.uc}
        </span>
      </div>
      <div className="mt-1.5 ml-4 h-1 overflow-hidden rounded-full bg-lienzo">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </button>
  )
}

function PanelProgreso({ progreso, areaFiltrada, alFiltrarArea, abierto, alCerrar }) {
  const { ucAprobadas, ucTotales, aprobadas, cursando, disponibles, total } = progreso
  const porcentaje = useNumeroAnimado(progreso.porcentaje)

  return (
    <aside
      className={`transicion-tema absolute inset-y-0 right-0 z-30 flex w-72 shrink-0 flex-col border-l border-panel-borde bg-panel transition-transform duration-300 ease-out ${
        abierto ? 'translate-x-0 lg:relative' : 'translate-x-full lg:hidden'
      }`}
    >
      <div className="flex items-center justify-between border-b border-panel-borde px-4 py-3">
        <h2 className="text-sm font-bold text-tinta">Mi avance</h2>
        {/* La flecha apunta a donde se va a esconder el panel */}
        <button
          type="button"
          onClick={alCerrar}
          aria-label="Ocultar panel"
          title="Ocultar panel"
          className="group flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-bold text-tinta-tenue hover:text-tinta"
        >
          Ocultar
          <ChevronsRight
            size={15}
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </button>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto p-4">
        <div>
          <div className="flex items-end justify-between">
            <span className="text-[10px] font-bold tracking-wide text-tinta-tenue uppercase">
              Carrera completada
            </span>
            <span className="font-mono text-2xl leading-none font-extrabold text-aprobada">
              {porcentaje.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-lienzo">
            <div
              className="h-full rounded-full bg-aprobada transition-[width] duration-500 ease-out"
              style={{ width: `${porcentaje}%` }}
            />
          </div>
          <p className="mt-1.5 text-[10px] text-tinta-tenue">
            Sobre unidades crédito, no sobre número de materias.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Dato
            icono={GraduationCap}
            etiqueta="UC"
            valor={ucAprobadas}
            de={ucTotales}
            color="var(--estado-aprobada)"
          />
          <Dato
            icono={ListChecks}
            etiqueta="Materias"
            valor={aprobadas}
            de={total}
            color="var(--estado-aprobada)"
          />
          <Dato
            icono={CircleDot}
            etiqueta="Cursando"
            valor={cursando}
            color="var(--estado-cursando)"
          />
          <Dato
            icono={LockOpen}
            etiqueta="Disponibles"
            valor={disponibles}
            color="var(--tinta-suave)"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <h3 className="text-[10px] font-bold tracking-wide text-tinta-tenue uppercase">
              Avance por área
            </h3>
            {areaFiltrada && (
              <button
                type="button"
                onClick={() => alFiltrarArea(null)}
                className="text-[10px] font-bold text-aprobada"
              >
                Ver todo
              </button>
            )}
          </div>
          <p className="mb-2 text-[10px] leading-snug text-tinta-tenue">
            Pulsa un área para aislarla en el mapa.
          </p>
          <div className="flex flex-col gap-0.5">
            {progreso.porArea.map((fila) => (
              <FilaArea
                key={fila.area}
                fila={fila}
                activa={areaFiltrada === fila.area}
                alPulsar={() =>
                  alFiltrarArea(areaFiltrada === fila.area ? null : fila.area)
                }
              />
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}

export default PanelProgreso
