import { ArrowLeft, CalendarRange, LayoutList, Map, Moon, Route, Sun } from 'lucide-react'
import AnilloAvance from './AnilloAvance'
import { BotonAvisos } from './AvisosCarrera'

/**
 * Boton de la cabecera. Todos miden y pesan igual; en movil bajan a 32px,
 * que sigue siendo objetivo tactil comodo.
 *
 * 'etiqueta' saca el texto a la vista a partir del ancho que se le diga. El
 * title solo aparece al dejar el raton quieto un segundo, y en un telefono
 * no aparece nunca: una barra entera de iconos pelados no se entiende, y de
 * hecho no se entendio. Donde hay sitio, la palabra se ve.
 */
function Icono({ icono: Ico, titulo, etiqueta, desde = 'sm', activo, alPulsar, variante = 'suelto' }) {
  const segmento = variante === 'segmento'
  const alto = segmento ? 'h-8' : 'h-8 sm:h-9'
  const borde = segmento ? 'border-0' : 'border'
  // Con etiqueta deja de ser cuadrado y crece con el texto
  const ancho = etiqueta ? 'px-2 sm:px-2.5' : segmento ? 'w-8' : 'w-8 sm:w-9'
  const visible =
    desde === 'xl' ? 'hidden xl:inline' : desde === 'lg' ? 'hidden lg:inline' : 'hidden sm:inline'

  return (
    <button
      type="button"
      onClick={alPulsar}
      title={titulo}
      aria-label={titulo}
      className={`transicion-tema flex shrink-0 items-center justify-center gap-1.5 rounded-lg ${alto} ${ancho} ${borde} ${
        activo
          ? 'border-transparent bg-panel-suave text-tinta'
          : 'border-panel-borde text-tinta-suave hover:text-tinta'
      }`}
    >
      <Ico size={16} className="shrink-0" />
      {etiqueta && <span className={`${visible} text-[12px] font-bold`}>{etiqueta}</span>}
    </button>
  )
}

/** Separador fino: agrupa la barra en bloques en vez de una fila plana */
function Division() {
  return <span aria-hidden="true" className="hidden h-5 w-px shrink-0 bg-panel-borde sm:block" />
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
  alAbrirHorario,
  alVolver,
}) {
  /* El anillo siempre enseña un porcentaje. Donde hay creditos oficiales es
     el de UC, que es el que cuenta para graduarse; donde el pensum no los
     trae, el de materias, que es lo unico que se puede saber. El title dice
     cual de los dos es, para que el numero no signifique dos cosas distintas
     sin avisar. */
  const conCreditos = resumen.porcentaje != null
  const avance = conCreditos
    ? resumen.porcentaje
    : resumen.total
      ? (resumen.aprobadas / resumen.total) * 100
      : 0
  const detalleAvance = conCreditos
    ? `Tu avance: ${Math.round(avance)}% · ${resumen.ucAprobadas + resumen.ucElectivas} de ${resumen.ucTitulo} UC. Pulsa para ver el detalle.`
    : `Tu avance: ${Math.round(avance)}% · ${resumen.aprobadas} de ${resumen.total} materias. Pulsa para ver el detalle.`

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

      {/* El anillo de avance es el acceso al detalle.
          Sin creditos oficiales no hay porcentaje de UC, pero si de materias:
          el anillo se llena igual y el detalle lo aclara al pasar por encima.
          Antes ahi habia un numero, una barra de ochenta pixeles y un
          contador de UC, tres formas de decir lo mismo en fila. */}
      <button
        type="button"
        onClick={alAlternarAvance}
        title={detalleAvance}
        aria-label={detalleAvance}
        className={`transicion-tema grid shrink-0 place-items-center rounded-full p-1 ${
          avanceAbierto ? 'bg-panel-suave' : 'hover:bg-panel-suave'
        }`}
      >
        <AnilloAvance valor={avance} activo={avanceAbierto} />
      </button>

      {/* Un solo boton que alterna, no un segmentado de dos.
          La lista no sobra en escritorio aunque lo parezca: marcar una
          materia son dos clicks en el mapa -abrir la ficha y pulsar- y uno
          solo en la lista. Quien entra por primera vez tiene cuarenta
          materias que marcar, y ahi la lista gana de calle. Ademas es HTML
          de verdad, no un lienzo SVG, que es lo unico que puede recorrer un
          lector de pantalla.
          Lo que sobraba era el peso visual: competia con Planificar. Ahora
          es un boton mas, y ensena a donde te lleva, no donde estas. */}
      <Icono
        icono={vista === 'mapa' ? LayoutList : Map}
        titulo={vista === 'mapa' ? 'Ver como lista' : 'Ver el mapa'}
        etiqueta={vista === 'mapa' ? 'Lista' : 'Mapa'}
        desde="xl"
        alPulsar={() => alCambiarVista(vista === 'mapa' ? 'lista' : 'mapa')}
      />

      <Division />

      {/* Solo aparece donde hay algo que advertir, o sea en las carreras cuya
          fuente tiene huecos o dudas. En las demas no ocupa sitio. */}
      <BotonAvisos
        cantidad={carrera.avisos?.length ?? 0}
        abierto={avisosAbiertos}
        alPulsar={alAlternarAvisos}
      />

      {/* El horario abre una capa a pantalla completa, no otra vista del
          mapa: por eso no se marca activo como Lista o Mapa. */}
      <Icono
        icono={CalendarRange}
        titulo="Abrir mi horario de la semana"
        etiqueta="Mi Horario"
        desde="lg"
        alPulsar={alAbrirHorario}
      />

      {/* Con etiqueta a partir de lg: es una funcion completa -calcula tu
          ruta hasta el grado y la exporta- y con solo el icono no la
          encontraba nadie, ni quien propuso la idea. */}
      <Icono
        icono={Route}
        titulo="Planificar mi ruta hasta el grado y exportarla"
        etiqueta="Planificar"
        alPulsar={alPlanificar}
      />

      <Division />

      {/* Sol y luna se entienden sin palabra en cualquier idioma */}
      <Icono
        icono={tema === 'oscuro' ? Sun : Moon}
        titulo={tema === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        alPulsar={alternarTema}
      />


    </header>
  )
}

export default BarraSuperior
