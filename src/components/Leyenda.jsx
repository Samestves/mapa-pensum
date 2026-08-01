import { Check, ChevronsLeft, CircleDot, Dot, Info, Lock } from 'lucide-react'
import { AREAS } from '../theme/areas'
import { ESTADO } from '../hooks/usePensum'

const ESTADOS = [
  { clave: ESTADO.APROBADA, icono: Check, texto: 'Aprobada', color: 'var(--estado-aprobada)' },
  { clave: ESTADO.CURSANDO, icono: CircleDot, texto: 'Cursando', color: 'var(--estado-cursando)' },
  { clave: ESTADO.DISPONIBLE, icono: Dot, texto: 'Disponible', color: 'var(--tinta-suave)' },
  { clave: ESTADO.BLOQUEADA, icono: Lock, texto: 'Bloqueada', color: 'var(--tinta-tenue)' },
]

function Leyenda({ abierta, alAlternar, areaFiltrada, alFiltrarArea }) {
  // Plegada queda solo un boton redondo: no tapa el mapa
  if (!abierta) {
    return (
      <button
        type="button"
        onClick={alAlternar}
        title="Mostrar leyenda"
        aria-label="Mostrar leyenda"
        className="transicion-tema group absolute top-4 left-4 z-20 flex h-9 items-center gap-1.5 rounded-lg border border-panel-borde bg-panel/85 px-2.5 text-[10px] font-bold text-tinta-suave backdrop-blur hover:text-tinta"
      >
        <Info size={15} />
        <span className="max-w-0 overflow-hidden whitespace-nowrap transition-all duration-200 group-hover:max-w-24">
          Leyenda
        </span>
      </button>
    )
  }

  return (
    <div className="surgir transicion-tema absolute top-4 left-4 z-20 w-56 rounded-xl border border-panel-borde bg-panel/90 backdrop-blur">
      <button
        type="button"
        onClick={alAlternar}
        title="Ocultar leyenda"
        className="group flex w-full items-center justify-between gap-3 px-3 py-2 text-[10px] font-bold tracking-wide text-tinta-suave uppercase hover:text-tinta"
      >
        Leyenda
        {/* La flecha apunta a donde se va a esconder */}
        <span className="flex items-center gap-1 text-[9px] normal-case">
          Ocultar
          <ChevronsLeft
            size={14}
            className="transition-transform duration-200 group-hover:-translate-x-0.5"
          />
        </span>
      </button>

      <div className="flex flex-col gap-1.5 border-t border-panel-borde px-3 py-2.5">
        {ESTADOS.map(({ clave, icono: Icono, texto, color }) => (
          <div key={clave} className="flex items-center gap-2 text-[11px] text-tinta-suave">
            <Icono size={13} color={color} strokeWidth={2.4} />
            {texto}
          </div>
        ))}
      </div>

      {/* Cada area filtra el mapa, igual que en el panel de avance */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 border-t border-panel-borde px-2 py-2">
        {Object.entries(AREAS).map(([clave, { etiqueta, color }]) => (
          <button
            key={clave}
            type="button"
            onClick={() => alFiltrarArea(areaFiltrada === clave ? null : clave)}
            title={`Aislar ${etiqueta}`}
            className={`flex items-center gap-1.5 rounded px-1 py-0.5 text-left text-[10px] transition-opacity ${
              areaFiltrada && areaFiltrada !== clave
                ? 'opacity-40 hover:opacity-70'
                : 'text-tinta-suave'
            }`}
          >
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="truncate">{etiqueta}</span>
          </button>
        ))}
      </div>

      <p className="border-t border-panel-borde px-3 py-2 text-[10px] leading-snug text-tinta-tenue">
        Click en una materia para marcarla como aprobada; otro click la desmarca. El botón
        ⓘ abre su ficha. Arrastra para mover, rueda para zoom.
      </p>
    </div>
  )
}

export default Leyenda
