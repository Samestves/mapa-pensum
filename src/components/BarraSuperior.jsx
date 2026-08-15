import { ArrowLeft, GraduationCap, Moon, Sun } from 'lucide-react'
import AnilloAvance from './AnilloAvance'
import SelectorVista from './SelectorVista'
import { BotonAvisos } from './AvisosCarrera'

/* La forma comun de TODO lo que se pulsa en la cabecera. Vive en una
   constante y no repetida en cada boton porque antes cada uno traia su
   propia mezcla: el de volver se iluminaba de fondo al pasar por encima y
   los demas solo cambiaban de tinta, y el anillo de avance ni siquiera media
   lo mismo. Una barra donde cada boton responde distinto al mismo gesto se
   lee como piezas pegadas, no como un mando. */
/* Sin radio: lo pone cada uso. Dejarlo aqui hacia que el 'rounded-full' del
   anillo compitiera con el 'rounded-lg' de la base a igual especificidad, y
   ganaba el que Tailwind emitiese despues -salia cuadrado-. */
const BASE =
  'transicion-tema flex shrink-0 items-center justify-center gap-1.5 h-8 sm:h-9 ' +
  'transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.97]'

/* Reposo, hover y activo. El activo se rellena y quita el borde: es un
   estado, no un boton mas fuerte. */
const REPOSO = 'border border-panel-borde text-tinta-suave hover:bg-panel-suave hover:text-tinta'
const ACTIVO = 'border border-transparent bg-panel-suave text-tinta'

/**
 * Boton de la cabecera. Todos miden y pesan igual; en movil bajan a 32px,
 * que sigue siendo objetivo tactil comodo.
 *
 * La etiqueta sale a la vista a partir de lg y de ningun otro sitio. Antes
 * cada boton elegia el suyo -uno en sm, otro en lg, otro en xl- y la barra
 * tenia cuatro formas distintas segun el ancho, apareciendo palabras de una
 * en una. Con un solo corte solo hay dos: compacta o con texto.
 *
 * 'claveIcono' es para los botones cuyo icono cambia con el estado. Al
 * cambiar ese valor React remonta el icono y la animacion de giro vuelve a
 * correr, que es lo que convierte el cambio de tema en un gesto y no en un
 * salto de un glifo a otro.
 */
function Icono({ icono: Ico, titulo, etiqueta, claveIcono, activo, alPulsar }) {
  // Con etiqueta deja de ser cuadrado y crece con el texto
  const ancho = etiqueta ? 'px-2 lg:px-2.5' : 'w-8 sm:w-9'

  return (
    <button
      type="button"
      onClick={alPulsar}
      title={titulo}
      aria-label={titulo}
      aria-pressed={activo === undefined ? undefined : activo}
      className={`${BASE} group rounded-lg ${ancho} ${activo ? ACTIVO : REPOSO}`}
    >
      {/* Todos los iconos de la barra suben un pixel al pasar por encima. Es
          la misma respuesta para todos a proposito: lo que hace que una fila
          de botones se lea como un mando es que contesten igual al mismo
          gesto. Los dos que tienen algo propio que decir -la flecha de salir
          y el sol que releva a la luna- añaden lo suyo encima. */}
      <Ico
        key={claveIcono}
        size={16}
        className={`shrink-0 transition-transform duration-200 group-hover:-translate-y-px ${
          claveIcono === undefined ? '' : 'icono-relevo'
        }`}
      />
      {etiqueta && <span className="hidden text-[12px] font-bold lg:inline">{etiqueta}</span>}
    </button>
  )
}

/** Separador fino: agrupa la barra en bloques en vez de una fila plana */
function Division() {
  return <span aria-hidden="true" className="h-5 w-px shrink-0 bg-panel-borde" />
}

/**
 * La cabecera de una carrera.
 *
 * Se lee en dos mitades y esa division es lo unico que la hace entendible de
 * un vistazo: a la IZQUIERDA, donde estas -de donde saliste, que carrera es y
 * como vas-; a la DERECHA, lo que puedes hacer. Antes las dos cosas iban
 * mezcladas en una fila de cuadrados iguales, con el anillo de avance
 * flotando en mitad de la nada.
 *
 * Y a la derecha, otra vez en orden de mando: primero el selector de vista,
 * que es lo que mas se toca; despues las acciones que abren algo encima
 * -avisos y planificar-; y al final, detras de una linea, el tema, que se
 * elige una vez en la vida. Lo que mas se usa nunca va en el extremo.
 */
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
    <header className="transicion-tema barra-contenido z-40 flex shrink-0 items-center gap-1 border-b border-panel-borde bg-panel px-2.5 py-2.5 sm:gap-2 sm:px-5">
      {/* Volver al selector. Antes esto era el logo, y nadie lo encontraba:
          un logo se lee como marca, no como boton. Una flecha con la palabra
          al lado no deja lugar a dudas. En movil queda solo la flecha, que
          es el gesto de "atras" que todo el mundo reconoce.
          La flecha se adelanta medio pixel al pasar por encima: es la unica
          pieza de la barra que te saca de aqui, y ese tiron hacia la
          izquierda dice hacia donde vas antes de pulsarla. */}
      <button
        type="button"
        onClick={alVolver}
        title="Ver todas las carreras"
        aria-label="Ver todas las carreras"
        className={`${BASE} group rounded-lg px-2 lg:px-2.5 ${REPOSO}`}
      >
        <ArrowLeft
          size={16}
          className="shrink-0 transition-transform duration-300 group-hover:-translate-x-0.5"
        />
        <span className="hidden text-[12px] font-bold lg:inline">Carreras</span>
      </button>

      {/* En movil el titulo no cabe y truncado se ve peor que ausente. */}
      {/* Nombre corto arriba y el completo debajo. El subtitulo estaba en
          leading-tight pegado al titulo y en un peso demasiado ligero: ahora
          tiene aire y va en tinta-suave, que da 9:1 de contraste en los dos
          temas. */}
      <div className="hidden min-w-0 flex-1 pl-1 sm:block">
        <h1 className="truncate text-[15px] leading-snug font-extrabold tracking-tight text-tinta lg:text-base">
          {carrera.nombreCorto}
        </h1>
        <p className="hidden truncate text-[11px] leading-snug font-medium text-tinta-suave lg:block">
          {carrera.nombre} · {carrera.nucleo}
        </p>
      </div>
      <div className="min-w-0 flex-1 sm:hidden" />

      {/* El anillo abre el detalle del avance, y va donde siempre estuvo: al
          principio del bloque de la derecha, pegado al selector de vista.
          Estuvo un tiempo a la izquierda con el nombre de la carrera, porque
          describe la carrera igual que el nombre y juntos se leen de una vez
          -"Sistemas, 34%"-. La razon era buena y aun asi pierde: la gente ya
          sabe donde esta este boton, y romper esa memoria cuesta mas de lo
          que da tenerlo mejor agrupado.
          Redondo y sin borde a proposito: es un indicador que ademas se
          pulsa. Cuadrado por fuera para que el circulo salga circulo: antes
          media 36x32 en movil y el 'rounded-full' lo dejaba en una elipse,
          con el dibujo de 34px asomando por arriba y por abajo. */}
      <button
        type="button"
        onClick={(e) => alAlternarAvance(e.currentTarget)}
        title={detalleAvance}
        aria-label={detalleAvance}
        aria-expanded={avanceAbierto}
        className={`${BASE} w-8 rounded-full border border-transparent p-0 sm:w-9 ${
          avanceAbierto ? 'bg-panel-suave' : 'hover:bg-panel-suave'
        }`}
      >
        <AnilloAvance valor={avance} tamano={30} activo={avanceAbierto} />
      </button>

      {/* Mapa, lista y horario son la misma carrera mirada de tres maneras,
          asi que son un mando de tres posiciones y no tres botones. */}
      <SelectorVista vista={vista} alCambiar={alCambiarVista} />

      {/* Solo aparece donde hay algo que advertir, o sea en las carreras cuya
          fuente tiene huecos o dudas. En las demas no ocupa sitio. */}
      <BotonAvisos
        cantidad={carrera.avisos?.length ?? 0}
        abierto={avisosAbiertos}
        alPulsar={alAlternarAvisos}
      />

      {/* El birrete y no la carretera de antes: lo que hace esto no es
          dibujarte un camino, es decirte cuanto te falta para graduarte, y el
          icono nombra la meta en vez del tramite. Ademas la carretera y el
          mapa de prelaciones eran dos glifos de lineas y puntos juntos en la
          misma barra queriendo decir cosas distintas.
          Se levanta un pelo al pasar por encima, como el gorro que se lanza. */}
      <Icono
        icono={GraduationCap}
        titulo="Planificar mi ruta hasta el grado y exportarla"
        etiqueta="Planificar"
        alPulsar={alPlanificar}
      />

      <Division />

      {/* Sol y luna se entienden sin palabra en cualquier idioma. El icono
          entra girando: el tema tarda 200ms en cambiar en toda la app y sin
          ese giro el boton se quedaba quieto mientras el resto se movia. */}
      <Icono
        icono={tema === 'oscuro' ? Sun : Moon}
        claveIcono={tema}
        titulo={tema === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        alPulsar={alternarTema}
      />
    </header>
  )
}

export default BarraSuperior
