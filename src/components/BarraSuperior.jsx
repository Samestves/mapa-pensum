import {
  ChevronUp,
  LayoutList,
  Moon,
  Route,
  SlidersHorizontal,
  Sun,
  Waypoints,
} from 'lucide-react'

/** Boton de icono del sistema: todos los de la cabecera miden y pesan igual */
function Icono({ icono: Ico, titulo, activo, alPulsar, clase = '' }) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      title={titulo}
      aria-label={titulo}
      className={`transicion-tema grid size-9 shrink-0 place-items-center rounded-lg border ${
        activo
          ? 'border-transparent bg-panel-suave text-tinta'
          : 'border-panel-borde text-tinta-suave hover:text-tinta'
      } ${clase}`}
    >
      <Ico size={16} />
    </button>
  )
}

function BarraSuperior({
  meta,
  tema,
  alternarTema,
  resumen,
  vista,
  alCambiarVista,
  avanceAbierto,
  alAlternarAvance,
  alAbrirElectivas,
  alPlanificar,
  alOcultarBarra,
}) {
  return (
    <header className="transicion-tema z-40 flex shrink-0 items-center gap-2 border-b border-panel-borde bg-panel px-3 py-2.5 sm:gap-3 sm:px-5">
      <span
        className="grid size-9 shrink-0 place-items-center rounded-lg"
        style={{
          backgroundColor: 'color-mix(in oklab, var(--estado-aprobada) 16%, transparent)',
          color: 'var(--estado-aprobada)',
        }}
      >
        <Waypoints size={19} strokeWidth={2.4} />
      </span>

      {/* En movil el titulo no cabe y truncado se ve peor que ausente:
          queda solo el logo, que ya identifica la app. */}
      <div className="hidden min-w-0 flex-1 sm:block">
        <h1 className="truncate text-base leading-tight font-extrabold tracking-tight text-tinta">
          Mapa de Pensum
        </h1>
        <p className="hidden truncate text-[11px] leading-tight font-medium text-tinta-suave md:block">
          {meta.carrera} · {meta.nucleo}
        </p>
      </div>
      <div className="min-w-0 flex-1 sm:hidden" />

      {/* El chip de progreso es el acceso al detalle del avance */}
      <button
        type="button"
        onClick={alAlternarAvance}
        title="Ver el detalle de mi avance"
        className={`transicion-tema flex shrink-0 items-center gap-2.5 rounded-lg border px-3 py-1.5 ${
          avanceAbierto
            ? 'border-transparent bg-panel-suave'
            : 'border-panel-borde hover:bg-panel-suave'
        }`}
      >
        <span className="font-mono text-sm font-bold text-aprobada">
          {resumen.porcentaje.toFixed(1)}%
        </span>
        <span className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-lienzo sm:block">
          <span
            className="block h-full rounded-full bg-aprobada transition-[width] duration-500 ease-out"
            style={{ width: `${resumen.porcentaje}%` }}
          />
        </span>
        <span className="hidden font-mono text-[10px] font-semibold text-tinta-tenue lg:inline">
          {resumen.ucAprobadas + resumen.ucElectivas}/{resumen.ucTitulo} UC
        </span>
      </button>

      {/* Cambiar de vista: en movil la lista es la util, el mapa es opcional */}
      <div className="transicion-tema flex shrink-0 items-center gap-0.5 rounded-lg border border-panel-borde p-0.5">
        <Icono
          icono={Waypoints}
          titulo="Ver el mapa"
          activo={vista === 'mapa'}
          alPulsar={() => alCambiarVista('mapa')}
          clase="size-8 border-0"
        />
        <Icono
          icono={LayoutList}
          titulo="Ver como lista"
          activo={vista === 'lista'}
          alPulsar={() => alCambiarVista('lista')}
          clase="size-8 border-0"
        />
      </div>

      <Icono
        icono={SlidersHorizontal}
        titulo="Elegir mis electivas"
        alPulsar={alAbrirElectivas}
      />

      <Icono icono={Route} titulo="Planificar mi ruta y exportarla" alPulsar={alPlanificar} />

      <Icono
        icono={tema === 'oscuro' ? Sun : Moon}
        titulo={tema === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        alPulsar={alternarTema}
      />

      <Icono icono={ChevronUp} titulo="Ocultar la barra" alPulsar={alOcultarBarra} />
    </header>
  )
}

export default BarraSuperior
