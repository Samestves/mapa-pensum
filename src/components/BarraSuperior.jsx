import { ArrowLeft, ChevronRight, Moon, Search, Sun } from 'lucide-react'
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
  'transicion-tema flex shrink-0 items-center justify-center gap-1.5 h-9 ' +
  'transition-[background-color,color,transform] duration-150 active:scale-[0.92]'

/* Los tres pesos de la barra. Que existan TRES y no uno es lo que permite
   saber de que clase es cada pieza sin leer su etiqueta:

     HUNDIDO   aqui se interactua con algo   el campo de busqueda, el mando
     FANTASMA  esto es auxiliar              volver, avance, tema

   Antes todo era fantasma. Con siete piezas iguales en fila, el mando de
   vistas no se leia como un grupo y Planificar, que va justo detras, parecia
   su cuarta pestaña, la que se salio del riel. */
const FANTASMA = 'text-tinta-suave hover:bg-panel-suave hover:text-tinta'
const HUNDIDO = 'border border-panel-borde bg-lienzo text-tinta-tenue hover:text-tinta'

const ACTIVO = 'bg-panel-suave text-tinta'

/* Una tecla dibujada como tecla: cuadrada, con su contorno y su relieve. Un
   atajo escrito en texto corrido -"Ctrl K"- se lee como una etiqueta mas; con
   forma de tecla se lee como algo que se pulsa, que es el unico motivo de
   enseñarlo. */
function Tecla({ children }) {
  return (
    <kbd className="transicion-tema grid h-[18px] min-w-[18px] place-items-center rounded-[5px] border border-panel-borde bg-panel px-1 text-[10px] leading-none font-bold text-tinta-tenue shadow-sm">
      {children}
    </kbd>
  )
}

/**
 * Boton fantasma de la cabecera. Todos miden y pesan igual.
 *
 * 'claveIcono' es para los botones cuyo icono cambia con el estado. Al
 * cambiar ese valor React remonta el icono y la animacion de giro vuelve a
 * correr, que es lo que convierte el cambio de tema en un gesto y no en un
 * salto de un glifo a otro.
 */
function Icono({ icono: Ico, titulo, etiqueta, claveIcono, activo, alPulsar }) {
  const ancho = etiqueta ? 'px-2.5' : 'w-9'

  return (
    <button
      type="button"
      onClick={alPulsar}
      title={titulo}
      aria-label={titulo}
      aria-pressed={activo === undefined ? undefined : activo}
      className={`${BASE} group rounded-lg ${ancho} ${activo ? ACTIVO : FANTASMA}`}
    >
      {/* Todos los iconos de la barra suben un pixel al pasar por encima. Es
          la misma respuesta para todos a proposito: lo que hace que una fila
          de botones se lea como un mando es que contesten igual al mismo
          gesto. */}
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
 * La cabecera de una carrera, en TRES zonas.
 *
 * Izquierda es DONDE ESTAS, en una linea: un rastro que va de "Carreras" a
 * la carrera abierta.
 * Centro es el BUSCADOR.
 * Derecha es COMO VAS, CON QUE MIRAS y QUE HACES.
 *
 * Antes era una sola fila de siete piezas del mismo peso separadas por ocho
 * pixeles, y con todo al mismo nivel la unica forma de saber que hacia cada
 * cosa era leer su etiqueta.
 *
 * El anillo de avance se queda en la derecha, delante del mando de vistas,
 * que es donde la gente ya sabe buscarlo. Lo que cambia es su forma: pasa de
 * circulo con el numero dentro a insignia con el numero fuera. Encajado entre
 * el campo y la capsula, un circulo suelto era la pieza que peor caia; con
 * forma de pastilla se lee como un dato y no como un boton mas de la fila.
 *
 * Planificar ya no vive aqui. Se fue al panel de avance, que es donde encaja:
 * este panel contesta "como voy" y Planificar contesta "cuando termino", y es
 * la pregunta siguiente de la misma conversacion. Arriba era la unica ACCION
 * en una fila de SITIOS, y obligaba a la barra a tener un peso visual solo
 * para ella.
 *
 * El buscador queda centrado de verdad: las dos zonas de los lados llevan
 * flex-1, asi que el campo cae en el eje de la ventana pase lo que pase con
 * el largo del nombre de la carrera.
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
  alBuscar,
  alVolver,
}) {
  /* La tecla modificadora cambia con el aparato: ⌘ en un Mac y Ctrl en lo
     demas. Enseñar ⌘ en Windows seria nombrar una tecla que ese teclado no
     tiene, y el atajo dejaria de servir para lo unico que sirve un atajo
     escrito, que es poder pulsarlo. */
  const esMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
  const modificador = esMac ? '⌘' : 'Ctrl'

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
      <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
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
          className={`${BASE} group rounded-lg px-2 ${FANTASMA}`}
        >
          <ArrowLeft
            size={16}
            className="shrink-0 transition-transform duration-300 group-hover:-translate-x-0.5"
          />
          <span className="hidden text-[12px] font-bold xl:inline">Carreras</span>
        </button>

        {/* Una sola linea, y con el nombre entero donde cabe.

            Antes eran dos: "Sistemas" arriba y "Ingenieria de Sistemas ·
            Nucleo de Monagas — Maturin" debajo. Las dos mitades de esa
            segunda linea sobraban por motivos distintos. La primera repetia
            el titulo, solo que mas largo -el nombre corto ES el nombre largo
            recortado, no otro dato-. Y la segunda es la misma en las nueve
            carreras: si nunca cambia, no informa de nada, solo alarga. Donde
            el nucleo si dice algo es en la portada y en la hoja impresa, que
            es donde alguien puede no saber de que universidad le hablan.

            La flecha con "Carreras" y el nombre de la carrera pasan a leerse
            como un rastro -de donde vengo, donde estoy- en vez de como un
            boton con un titulo al lado. El chevron es lo que convierte dos
            cosas sueltas en un camino, y solo aparece desde lg, que es donde
            hay sitio para el nombre completo.

            Debajo de lg va el nombre corto: "Licenciatura en Tecnologia de
            los Alimentos" a 15 px son 330, y en un telefono de 375 eso no es
            un titulo, es una linea cortada. */}
        <ChevronRight
          size={15}
          aria-hidden="true"
          className="hidden shrink-0 text-tinta-tenue lg:block"
        />
        <h1 className="min-w-0 flex-1 truncate text-[15px] font-extrabold tracking-tight text-tinta">
          <span className="lg:hidden">{carrera.nombreCorto}</span>
          <span className="hidden lg:inline">{carrera.nombre}</span>
        </h1>

      </div>

      {/* El campo de busqueda. Hundido y con contorno: no es un boton mas de
          la fila, y tiene que parecer un campo antes de pulsarlo.
          La lupa se queda tambien en el telefono, y ahi no es un adorno: es la
          unica puerta a la paleta, porque un movil no tiene Ctrl+K, y es donde
          mas falta hace, que es donde recorrer el mapa cuesta mas. */}
      <button
        type="button"
        onClick={alBuscar}
        title="Buscar materias y acciones"
        aria-label="Buscar materias y acciones"
        aria-keyshortcuts="Meta+K Control+K"
        /* flex md:hidden lg:flex, y no es un capricho de puntos de corte.
           Desde lg cabe el campo entero -lupa, palabra y teclas- y se lee como
           un campo. Por debajo de md no cabe nada mas que la lupa, y ahi tiene
           que estar igual porque es la unica puerta a la paleta: un telefono
           no tiene Ctrl+K.
           En medio, entre md y lg, es donde quedaba mal: una lupa suelta de
           33 px pegada a la insignia de avance, dos cosas redondeadas y sin
           relacion una contra otra. Ahi no sale, y no se pierde nada: es el
           tramo de tablet, donde casi siempre hay teclado o hay dedo. */
        className={`${BASE} flex gap-2 rounded-lg px-2 md:hidden sm:px-3 lg:flex lg:w-[240px] lg:justify-start ${HUNDIDO}`}
      >
        <Search size={15} className="shrink-0" />
        <span className="hidden flex-1 text-left text-[12px] font-medium lg:inline">Buscar…</span>
        {/* Dos teclas y no una cadena de texto: asi se lee como se pulsa */}
        <span className="hidden shrink-0 items-center gap-1 lg:flex" aria-hidden="true">
          <Tecla>{modificador}</Tecla>
          <Tecla>K</Tecla>
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2 lg:flex-1 lg:justify-end">
        {/* El avance, en un anillo con el numero dentro.
            Estuvo un rato con el numero FUERA, en una pastilla, porque a los
            treinta pixeles de entonces no cabia legible. La respuesta no era
            sacarlo: era darle sitio. El anillo sube a 34 px y su trazo baja a
            2,5, y con eso el hueco de dentro pasa de 23 px a 27, que es donde
            un numero de dos cifras se lee sin apretarse. Mas fino y mas
            grande, no mas gordo: es lo que hace que se vea un anillo y no una
            rosquilla.
            El signo de porcentaje no entra a proposito. Un anillo que se
            cierra ya dice que eso es una proporcion; el signo solo gastaria
            el sitio que necesita la cifra. La frase entera vive en el title y
            en la etiqueta accesible. */}
        <button
          type="button"
          onClick={(e) => alAlternarAvance(e.currentTarget)}
          title={detalleAvance}
          aria-label={detalleAvance}
          aria-expanded={avanceAbierto}
          className={`${BASE} w-9 rounded-full p-0 ${avanceAbierto ? ACTIVO : FANTASMA}`}
        >
          <AnilloAvance valor={avance} tamano={34} grosor={2.5} activo={avanceAbierto} />
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
      </div>
    </header>
  )
}

export default BarraSuperior
