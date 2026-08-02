import { useEffect, useRef, useState } from 'react'
import {
  LayoutList,
  Moon,
  PanelRight,
  Route,
  Sun,
  Waypoints,
} from 'lucide-react'

/** Botón de icono del sistema: todos los de la cabecera miden y pesan igual */
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
  panelAbierto,
  alAlternarPanel,
  alPlanificar,
}) {
  const [compacto, setCompacto] = useState(false)
  const barra = useRef(null)

  // Por debajo de cierto ancho el resumen estorba mas de lo que informa
  useEffect(() => {
    const medir = () => setCompacto(window.innerWidth < 900)
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [])

  return (
    <header
      ref={barra}
      className="transicion-tema z-40 flex shrink-0 items-center gap-2 border-b border-panel-borde bg-panel px-3 py-2.5 sm:gap-3 sm:px-5"
    >
      <span
        className="grid size-9 shrink-0 place-items-center rounded-lg"
        style={{
          backgroundColor: 'color-mix(in oklab, var(--estado-aprobada) 16%, transparent)',
          color: 'var(--estado-aprobada)',
        }}
      >
        <Waypoints size={19} strokeWidth={2.4} />
      </span>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[15px] leading-tight font-extrabold tracking-tight text-tinta sm:text-base">
          Mapa de Pensum
        </h1>
        <p className="hidden truncate text-[11px] leading-tight font-medium text-tinta-suave sm:block">
          {meta.carrera} · {meta.nucleo}
        </p>
      </div>

      {!compacto && (
        <div className="flex items-center gap-2.5 rounded-lg border border-panel-borde px-3 py-1.5">
          <span className="font-mono text-sm font-bold text-aprobada">
            {resumen.porcentaje.toFixed(1)}%
          </span>
          <span className="h-1.5 w-20 overflow-hidden rounded-full bg-lienzo">
            <span
              className="block h-full rounded-full bg-aprobada transition-[width] duration-500 ease-out"
              style={{ width: `${resumen.porcentaje}%` }}
            />
          </span>
          <span className="font-mono text-[10px] font-semibold text-tinta-tenue">
            {resumen.ucAprobadas + resumen.ucElectivas}/{resumen.ucTitulo} UC
          </span>
        </div>
      )}

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

      <Icono icono={Route} titulo="Planificar mi ruta y exportarla" alPulsar={alPlanificar} />

      <Icono
        icono={tema === 'oscuro' ? Sun : Moon}
        titulo={tema === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        alPulsar={alternarTema}
      />

      {!panelAbierto && (
        <Icono icono={PanelRight} titulo="Mostrar mi avance" alPulsar={alAlternarPanel} />
      )}
    </header>
  )
}

export default BarraSuperior
