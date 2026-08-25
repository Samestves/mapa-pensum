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

/* Reposo y activo, SIN borde, y ese es el cambio que mas se nota.
   Cada control iba metido en su propia cajita de un pixel, y eso -tres
   rectangulos con borde y un circulo suelto entre ellos, ademas de tamaños
   distintos- es lenguaje de formulario, no de producto. En una barra, el
   chrome tiene que desaparecer para que mande el contenido: aqui el
   contenido es el nombre de la carrera.
   Lo que queda como señal de que se puede pulsar es el relleno al pasar por
   encima en escritorio, y el hundido al tocar en el telefono, que es donde
   no hay hover. Un icono suelto en una barra se entiende pulsable sin que
   haya que dibujarle el contorno. */
const REPOSO = 'text-tinta-suave hover:bg-panel-suave hover:text-tinta'

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
const ACTIVO = 'bg-panel-suave text-tinta'

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
  const ancho = etiqueta ? 'px-2.5' : 'w-9'

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
  alBuscar,
  alVolver,
}) {
  /* El anillo siempre enseña un porcentaje. Donde hay creditos oficiales es
     el de UC, que es el que cuenta para graduarse; donde el pensum no los
     trae, el de materias, que es lo unico que se puede saber. El title dice
     cual de los dos es, para que el numero no signifique dos cosas distintas
     sin avisar. */
  /* La tecla modificadora cambia con el aparato: ⌘ en un Mac y Ctrl en lo
     demas. Enseñar ⌘ en Windows seria nombrar una tecla que ese teclado no
     tiene, y el atajo dejaria de servir para lo unico que sirve un atajo
     escrito, que es poder pulsarlo. */
  const esMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
  const modificador = esMac ? '⌘' : 'Ctrl'

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
        className={`${BASE} group rounded-lg px-2 ${REPOSO}`}
      >
        <ArrowLeft
          size={16}
          className="shrink-0 transition-transform duration-300 group-hover:-translate-x-0.5"
        />
        <span className="hidden text-[12px] font-bold lg:inline">Carreras</span>
      </button>

      {/* El nombre de la carrera, que en el telefono no se enseñaba en
          ninguna parte: se entraba a un mapa sin titulo y solo el color decia
          de cual era. No cabia porque el mando de las tres vistas se llevaba
          114 px de los 355 utiles; ahora ese mando esta abajo y el sitio es
          suyo.
          Nombre corto arriba y el completo debajo. El subtitulo estaba en
          leading-tight pegado al titulo y en un peso demasiado ligero: ahora
          tiene aire y va en tinta-suave, que da 9:1 de contraste en los dos
          temas. */}
      {/* El nombre completo baja tambien al telefono. Antes solo se veia en
          pantallas grandes: en un movil quedaba un "Sistemas" suelto y mucho
          aire, que es parte de lo que hacia que la barra se viera a medio
          hacer. Al quitarle el borde a los botones sobro sitio, y dos lineas
          de texto llenan la barra mejor que tres cajitas.
          El nucleo solo desde lg: en 375 px no cabe y truncado no aporta. */}
      <div className="min-w-0 flex-1 pl-1">
        <h1 className="truncate text-base leading-tight font-extrabold tracking-tight text-tinta">
          {carrera.nombreCorto}
        </h1>
        <p className="mt-0.5 truncate text-[11px] leading-tight font-medium text-tinta-tenue">
          {carrera.nombre}
          <span className="hidden lg:inline"> · {carrera.nucleo}</span>
        </p>
      </div>

      {/* La entrada a la paleta. Va aqui, en el hueco que dejaba el nombre de
          la carrera, y con el atajo escrito al lado: un atajo que no se
          enseña en ninguna parte no existe, y el sitio donde se aprende es
          justo el boton que hace lo mismo.
          La lupa se queda TAMBIEN en el telefono, y ahi no es un adorno: es
          la unica puerta a la paleta, porque un movil no tiene Ctrl+K. Y es
          donde mas falta hace, que es donde recorrer el mapa cuesta mas.
          La palabra y la tecla solo desde xl, porque se comen 120 px que
          hacen falta para el nombre de la carrera. */}
      <button
        type="button"
        onClick={alBuscar}
        title="Buscar materias y acciones"
        aria-label="Buscar materias y acciones"
        aria-keyshortcuts="Meta+K Control+K"
        /* Con contorno y fondo hundido: esto no es un boton mas de la fila,
           es un CAMPO, y tiene que parecerlo antes de pulsarlo. Junto con el
           mando de vistas son las dos unicas piezas con caja de la barra, y
           eso es lo que deja que las demas -planificar, tema- se lean como lo
           que son: acciones sueltas. */
        className={`${BASE} transicion-tema mr-1 flex gap-2 rounded-lg border border-panel-borde bg-lienzo px-2 text-tinta-tenue hover:text-tinta sm:px-2.5 xl:w-[210px] xl:justify-start`}
      >
        <Search size={15} className="shrink-0" />
        <span className="hidden flex-1 text-left text-[12px] font-medium xl:inline">Buscar…</span>
        {/* Dos teclas y no una cadena de texto: asi se lee como se pulsa */}
        <span className="hidden shrink-0 items-center gap-1 xl:flex" aria-hidden="true">
          <Tecla>{modificador}</Tecla>
          <Tecla>K</Tecla>
        </span>
      </button>

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
        className={`${BASE} w-9 rounded-full p-0 ${
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
      {/* En el telefono este boton se va abajo, con las tres vistas.
          Arriba se quedaba solo y descolgado, y ademas en la peor esquina del
          aparato: sujetandolo con una mano el pulgar llega comodo al tercio
          de abajo y hay que recolocar el agarre para tocar el borde superior.
          Bajarlo deja la cabecera del telefono con una sola cosa -el anillo
          de avance- y junta en un sitio todo lo que se toca. */}
      {/* Planificar va DESPUES de una division, y ahi esta el arreglo.
          Medido antes de tocarlo: el mando de vistas son tres botones de 90 px
          con icono y palabra, y Planificar media 98 con icono y palabra, a
          ocho pixeles del ultimo. O sea cuatro piezas del mismo tamaño y el
          mismo formato en fila, tres montadas en una capsula con un pulgar que
          se desliza y la cuarta no. No se leia como "esto es de otra clase":
          se leia como "esto se salio del riel".
          Las tres vistas son SITIOS y esto es una ACCION -abre un panel encima
          y te deja donde estabas-, que es la misma distincion que la barra del
          telefono ya hacia no dejando que su linea llegara hasta aqui. La
          division dice en la pantalla lo que el codigo ya sabia. */}
      <Division />

      <span className="hidden md:contents">
        <Icono
          icono={GraduationCap}
          titulo="Planificar mi ruta hasta el grado y exportarla"
          etiqueta="Planificar"
          alPulsar={alPlanificar}
        />
      </span>

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
