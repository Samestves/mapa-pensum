import { useEffect, useRef, useState } from 'react'
import {
  ChevronUp,
  LayoutList,
  MoreHorizontal,
  Moon,
  Route,
  SlidersHorizontal,
  Sun,
  Waypoints,
} from 'lucide-react'

/** Boton de icono del sistema: todos los de la cabecera miden y pesan igual.
    En movil bajan a 32px, que sigue siendo objetivo tactil comodo. */
function Icono({ icono: Ico, titulo, activo, alPulsar, variante = 'suelto', clase = '' }) {
  const medida = variante === 'segmento' ? 'size-8' : 'size-8 sm:size-9'
  const borde = variante === 'segmento' ? 'border-0' : 'border'
  return (
    <button
      type="button"
      onClick={alPulsar}
      title={titulo}
      aria-label={titulo}
      className={`transicion-tema grid shrink-0 place-items-center rounded-lg ${medida} ${borde} ${
        activo
          ? 'border-transparent bg-panel-suave text-tinta'
          : 'border-panel-borde text-tinta-suave hover:text-tinta'
      } ${clase}`}
    >
      <Ico size={16} />
    </button>
  )
}

/**
 * Menu de acciones secundarias, solo en movil. A 375px los cinco botones
 * sueltos no caben: el ultimo se salia de la pantalla y solo aparecia
 * scrolleando de lado. Aqui las tres acciones que no son de navegacion
 * se pliegan detras de un boton.
 */
function MenuMas({ tema, alternarTema, alAbrirElectivas, alPlanificar }) {
  const [abierto, setAbierto] = useState(false)
  const caja = useRef(null)

  useEffect(() => {
    if (!abierto) return
    const fuera = (e) => {
      if (!caja.current?.contains(e.target)) setAbierto(false)
    }
    const tecla = (e) => e.key === 'Escape' && setAbierto(false)
    document.addEventListener('pointerdown', fuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('pointerdown', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [abierto])

  const opciones = [
    { icono: SlidersHorizontal, texto: 'Elegir mis electivas', alPulsar: alAbrirElectivas },
    { icono: Route, texto: 'Planificar mi ruta', alPulsar: alPlanificar },
    {
      icono: tema === 'oscuro' ? Sun : Moon,
      texto: tema === 'oscuro' ? 'Tema claro' : 'Tema oscuro',
      alPulsar: alternarTema,
    },
  ]

  return (
    <div ref={caja} className="relative shrink-0 sm:hidden">
      <Icono
        icono={MoreHorizontal}
        titulo="Más opciones"
        activo={abierto}
        alPulsar={() => setAbierto((v) => !v)}
      />
      {abierto && (
        <div className="surgir transicion-tema absolute top-full right-0 z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-panel-borde bg-panel/95 shadow-2xl backdrop-blur-xl">
          {opciones.map(({ icono: Ico, texto, alPulsar }) => (
            <button
              key={texto}
              type="button"
              onClick={() => {
                alPulsar()
                setAbierto(false)
              }}
              className="flex w-full items-center gap-2.5 border-b border-panel-borde px-3 py-2.5 text-left text-[12px] font-semibold text-tinta-suave last:border-b-0 hover:bg-panel-suave hover:text-tinta"
            >
              <Ico size={15} className="shrink-0" />
              {texto}
            </button>
          ))}
        </div>
      )}
    </div>
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
    <header className="transicion-tema barra-contenido z-40 flex shrink-0 items-center gap-1.5 border-b border-panel-borde bg-panel px-2.5 py-2.5 sm:gap-3 sm:px-5">
      <span
        className="grid size-8 shrink-0 place-items-center rounded-lg sm:size-9"
        style={{
          backgroundColor: 'color-mix(in oklab, var(--estado-aprobada) 16%, transparent)',
          color: 'var(--estado-aprobada)',
        }}
      >
        <Waypoints size={18} strokeWidth={2.4} />
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
        className={`transicion-tema flex shrink-0 items-center gap-2.5 rounded-lg border px-2.5 py-1.5 sm:px-3 ${
          avanceAbierto
            ? 'border-transparent bg-panel-suave'
            : 'border-panel-borde hover:bg-panel-suave'
        }`}
      >
        <span className="font-mono text-[13px] font-bold text-aprobada sm:text-sm">
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
          variante="segmento"
        />
        <Icono
          icono={LayoutList}
          titulo="Ver como lista"
          activo={vista === 'lista'}
          alPulsar={() => alCambiarVista('lista')}
          variante="segmento"
        />
      </div>

      {/* Sueltas en escritorio, plegadas en un menu en movil */}
      <div className="hidden shrink-0 items-center gap-3 sm:flex">
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
      </div>

      <MenuMas
        tema={tema}
        alternarTema={alternarTema}
        alAbrirElectivas={alAbrirElectivas}
        alPlanificar={alPlanificar}
      />

      <Icono icono={ChevronUp} titulo="Ocultar la barra" alPulsar={alOcultarBarra} />
    </header>
  )
}

export default BarraSuperior
