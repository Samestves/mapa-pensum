import { ArrowLeft, GraduationCap, Moon, Search, Sun } from 'lucide-react'
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
     ELEVADO   esto ejecuta una accion       Planificar
     FANTASMA  esto es auxiliar              volver, avance, tema

   Antes todo era fantasma. Con siete piezas iguales en fila, el mando de
   vistas no se leia como un grupo y Planificar, que va justo detras, parecia
   su cuarta pestaña, la que se salio del riel. */
const FANTASMA = 'text-tinta-suave hover:bg-panel-suave hover:text-tinta'
const HUNDIDO = 'border border-panel-borde bg-lienzo text-tinta-tenue hover:text-tinta'
const ELEVADO = 'bg-panel-suave text-tinta hover:bg-panel-borde'

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
 * Izquierda es DONDE ESTAS: de donde vienes y que carrera.
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
 * Planificar sale a la derecha del todo y pasa a ser la unica pieza elevada.
 * Es una ACCION -abre un panel encima y te deja donde estabas- y las tres
 * vistas son SITIOS; con el mismo aspecto que ellas parecia su cuarta
 * pestaña.
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
  alPlanificar,
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

        {/* Nombre corto arriba y el completo debajo. El nucleo solo desde xl:
            en 375 px no cabe y truncado no aporta. */}
        <div className="min-w-0 flex-1 pl-1">
          <h1 className="truncate text-base leading-tight font-extrabold tracking-tight text-tinta">
            {carrera.nombreCorto}
          </h1>
          <p className="mt-0.5 truncate text-[11px] leading-tight font-medium text-tinta-tenue">
            {carrera.nombre}
            <span className="hidden xl:inline"> · {carrera.nucleo}</span>
          </p>
        </div>

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
        className={`${BASE} gap-2 rounded-lg px-2 sm:px-3 lg:w-[240px] lg:justify-start ${HUNDIDO}`}
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
        {/* El avance como INSIGNIA: el anillo dibuja y el numero se lee al
            lado, fuera, a tamaño de texto normal.
            Antes el porcentaje iba metido dentro del anillo, y a los treinta
            pixeles que mide aqui eso deja el numero en trece: hay que
            acercarse para leer justo el dato que se viene a mirar de reojo.
            Fuera cabe entero, con su signo, y el anillo se queda haciendo lo
            unico que sabe hacer mejor que un numero, que es enseñar cuanto
            falta sin que haya que leer nada.
            Forma de pastilla y no cuadrado: una insignia se lee como un dato,
            y un cuadrado con hover se lee como un boton mas de la fila. */}
        <button
          type="button"
          onClick={(e) => alAlternarAvance(e.currentTarget)}
          title={detalleAvance}
          aria-label={detalleAvance}
          aria-expanded={avanceAbierto}
          className={`${BASE} gap-1.5 rounded-full pr-2 pl-1 sm:pr-2.5 ${
            avanceAbierto ? ACTIVO : FANTASMA
          }`}
        >
          <AnilloAvance valor={avance} tamano={26} grosor={4} activo={avanceAbierto} conNumero={false} />
          {/* El numero se queda TAMBIEN en el telefono. Escondiendolo, el
              anillo se quedaba mudo: un arco sin cifra no dice 16, dice
              "algo empezado". Y en un telefono es donde menos se puede
              deducir mirando el mapa. */}
          <span className="text-[12.5px] font-extrabold tabular-nums">{Math.round(avance)}%</span>
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
            dibujarte un camino, es decirte cuanto te falta para graduarte.
            Se levanta un pelo al pasar por encima, como el gorro que se lanza.
            En el telefono se va abajo, con las tres vistas: arriba se quedaba
            solo y en la peor esquina del aparato para un pulgar. */}
        <span className="hidden md:contents">
          <button
            type="button"
            onClick={alPlanificar}
            title="Planificar mi ruta hasta el grado y exportarla"
            aria-label="Planificar mi ruta hasta el grado y exportarla"
            className={`${BASE} group rounded-lg px-2.5 ${ELEVADO}`}
          >
            <GraduationCap
              size={16}
              className="shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5"
            />
            <span className="hidden text-[12px] font-bold lg:inline">Planificar</span>
          </button>
        </span>

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
