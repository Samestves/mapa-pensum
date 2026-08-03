import { ArrowLeft, ChevronUp, LayoutList, Moon, Route, Sun, Waypoints } from 'lucide-react'
import { BotonAvisos } from './AvisosCarrera'

/** Boton de icono del sistema: todos los de la cabecera miden y pesan igual.
    En movil bajan a 32px, que sigue siendo objetivo tactil comodo. */
function Icono({ icono: Ico, titulo, activo, alPulsar, variante = 'suelto' }) {
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
      }`}
    >
      <Ico size={16} />
    </button>
  )
}

function BarraSuperior({
  carrera,
  tema,
  alternarTema,
  resumen,
  vista,
  alCambiarVista,
  avanceAbierto,
  alAlternarAvance,
  avisosAbiertos,
  alAlternarAvisos,
  alPlanificar,
  alOcultarBarra,
  alVolver,
}) {
  return (
    <header className="transicion-tema barra-contenido z-40 flex shrink-0 items-center gap-1 border-b border-panel-borde bg-panel px-2.5 py-2.5 sm:gap-3 sm:px-5">
      {/* Volver al selector. Antes esto era el logo, y nadie lo encontraba:
          un logo se lee como marca, no como boton. Una flecha con la palabra
          al lado no deja lugar a dudas. En movil queda solo la flecha, que
          es el gesto de "atras" que todo el mundo reconoce. */}
      <button
        type="button"
        onClick={alVolver}
        title="Ver todas las carreras"
        aria-label="Ver todas las carreras"
        className="transicion-tema group flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-panel-borde px-2 text-tinta-suave hover:bg-panel-suave hover:text-tinta sm:h-9 sm:px-2.5"
      >
        <ArrowLeft
          size={16}
          className="shrink-0 transition-transform duration-300 group-hover:-translate-x-0.5"
        />
        <span className="hidden text-[12px] font-bold lg:inline">Carreras</span>
      </button>

      {/* En movil el titulo no cabe y truncado se ve peor que ausente:
          queda solo el logo, que ya identifica la app. */}
      {/* Nombre corto arriba y el completo debajo. El subtitulo estaba en
          leading-tight pegado al titulo y en un peso demasiado ligero: ahora
          tiene aire y va en tinta-suave, que da 9:1 de contraste en los dos
          temas. */}
      <div className="hidden min-w-0 flex-1 sm:block">
        <h1 className="truncate text-[15px] leading-snug font-extrabold tracking-tight text-tinta lg:text-base">
          {carrera.nombreCorto}
        </h1>
        <p className="hidden truncate text-[11px] leading-snug font-medium text-tinta-suave lg:block">
          {carrera.nombre} · {carrera.nucleo}
        </p>
      </div>
      <div className="min-w-0 flex-1 sm:hidden" />

      {/* El chip de progreso es el acceso al detalle del avance */}
      <button
        type="button"
        onClick={alAlternarAvance}
        title="Ver el detalle de mi avance"
        className={`transicion-tema flex shrink-0 items-center gap-2.5 rounded-lg border px-2 py-1.5 sm:px-3 ${
          avanceAbierto
            ? 'border-transparent bg-panel-suave'
            : 'border-panel-borde hover:bg-panel-suave'
        }`}
      >
        {/* Sin creditos oficiales no hay porcentaje ni barra: el chip pasa a
            contar materias, que es un dato que si tenemos. */}
        {resumen.porcentaje != null ? (
          <>
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
          </>
        ) : (
          <span className="font-mono text-[13px] font-bold text-aprobada sm:text-sm">
            {resumen.aprobadas}
            <span className="text-tinta-tenue">/{resumen.total}</span>
          </span>
        )}
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

      {/* Solo aparece donde hay algo que advertir, o sea en las carreras cuya
          fuente tiene huecos o dudas. En las demas no ocupa sitio. */}
      <BotonAvisos
        cantidad={carrera.avisos?.length ?? 0}
        abierto={avisosAbiertos}
        alPulsar={alAlternarAvisos}
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
