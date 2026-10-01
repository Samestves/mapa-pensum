import { IconoBuscar, IconoInicio, IconoLuna, IconoSol } from './IconosSF'
import AnilloAvance from './AnilloAvance'
import SelectorVista from './SelectorVista'
import { BotonAvisos } from './AvisosCarrera'
import { CELDA, CELDA_ACTIVA } from './estiloCabecera'
import { useNumeroAnimado } from '../hooks/useNumeroAnimado'
import { avanceDe, describirAvance } from '../data/avance'

/* La cabecera ya no es una barra: son islas de cristal que flotan sobre la
   vista -el mismo idioma que la capsula inferior del telefono-.

   Tres formas, cada una para lo que es:
   - CIRCULO: un solo gesto -ir al inicio-.
   - CAPSULA: algo con contenido -el titulo, el buscador, el mando de vistas-.
   - GRUPO: varios botones pequeños que comparten una isla -el avance, los
     avisos y el tema-, separados por una raya fina. En el telefono solo
     quedan los avisos: el avance vive abajo, en su propia isla, y el tema
     dentro de la hoja que esa isla abre.
   Todas miden lo mismo de alto -40 px en telefono, 44 en escritorio, el
   minimo tactil- para que la fila se lea como una sola linea. */
const CRISTAL = 'barra-cristal relative pointer-events-auto shrink-0'
const CIRCULO =
  `${CRISTAL} grid size-10 place-items-center rounded-full md:size-11 ` +
  'text-tinta-suave transition-[color,transform] duration-200 ' +
  'hover:scale-[1.06] hover:text-tinta active:scale-[0.92]'

/* La raya entre dos celdas de un grupo. */
function Division({ className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`mx-0.5 h-4 w-px shrink-0 rounded-full bg-tinta/15 ${className}`}
    />
  )
}

/* Una tecla dibujada como tecla: cuadrada, con su contorno. Un atajo escrito
   en texto corrido -"Ctrl K"- se lee como una etiqueta mas; con forma de
   tecla se lee como algo que se pulsa, que es el unico motivo de enseñarlo.
   Translucida, no maciza: va sobre cristal y una tecla opaca se despegaba
   de el. */
function Tecla({ children }) {
  return (
    <kbd className="grid h-[18px] min-w-[18px] place-items-center rounded-[5px] border border-tinta/15 bg-tinta/[0.07] px-1 text-[10px] leading-none font-bold text-tinta-tenue">
      {children}
    </kbd>
  )
}

/* Boton de icono dentro de un grupo. 'claveIcono' es para los botones cuyo
   icono cambia con el estado: al cambiar ese valor React remonta el icono y
   la animacion de giro vuelve a correr, que es lo que convierte el cambio de
   tema en un gesto y no en un salto de un glifo a otro. */
function BotonCelda({ icono: Ico, titulo, claveIcono, alPulsar, className = '' }) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      title={titulo}
      aria-label={titulo}
      className={`${CELDA} w-9 text-tinta-suave hover:text-tinta ${className}`}
    >
      <Ico
        key={claveIcono}
        size={18}
        className={`shrink-0 transition-transform duration-200 group-hover:-translate-y-px ${
          claveIcono === undefined ? '' : 'icono-relevo'
        }`}
      />
    </button>
  )
}

/**
 * La cabecera de una carrera, en tres zonas sobre una rejilla de tres
 * columnas -las de los lados flexibles, la del centro a su medida-, de modo
 * que el centro cae en el eje de la ventana pase lo que pase con el largo
 * del nombre de la carrera:
 *
 * - Izquierda: DONDE ESTAS. Volver y el nombre.
 * - Centro: CON QUE MIRAS. El mando de vistas, que es la navegacion
 *   principal y por eso va en el eje, como el control segmentado de la barra
 *   de herramientas de macOS.
 * - Derecha: BUSCAR y COMO VAS. El buscador, y un grupo con el avance, los
 *   avisos y el tema.
 *
 * En el telefono la cabecera se vacia: solo quedan los avisos, en las
 * carreras que los tienen. Volver y el avance bajan a la barra de abajo, que
 * es donde llega el pulgar; el nombre de la carrera encabeza la hoja de
 * avance, y el tema entra en esa hoja: es un ajuste que se toca una vez, no
 * algo que merezca una esquina de la pantalla. Asi la vista llega hasta
 * arriba.
 *
 * El buscador se adapta al ancho: campo entero con su atajo desde xl, y solo
 * la lupa en lg, donde el campo no cabe junto al grupo. Por debajo de lg no
 * esta -en telefono la paleta no tiene puerta por decision propia: recorrer
 * un pensum se hace con el dedo-.
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
  const avance = avanceDe(resumen)
  const detalleAvance = describirAvance(resumen)

  /* El numero sube contando, igual que el anillo, con el mismo hook y la
     misma duracion: van a la vez. */
  const avanceAnimado = useNumeroAnimado(avance)
  const hayAvisos = (carrera.avisos?.length ?? 0) > 0

  return (
    /* Sin fondo ni linea: la cabecera es solo el hueco donde flotan las
       piezas. El envoltorio no atrapa toques -pointer-events-none-; cada
       pieza los recibe por su cuenta, asi que entre ellas el dedo o el raton
       llegan al mapa de debajo. */
    <header className="pointer-events-none z-40 flex shrink-0 items-center justify-between gap-2 px-3 pt-3 pb-2 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:px-5">
      <div className="flex min-w-0 items-center gap-2">
        {/* Inicio: un circulo con la casa, que lleva a todas las carreras. La
            casa sube un pelo al pasar por encima. Solo desde md: en el
            telefono vive en la barra de abajo, donde llega el pulgar. */}
        <button
          type="button"
          onClick={alVolver}
          title="Ver todas las carreras"
          aria-label="Ver todas las carreras"
          className={`${CIRCULO} group max-md:hidden`}
        >
          <IconoInicio
            size={18}
            className="transition-transform duration-300 group-hover:-translate-y-px"
          />
        </button>

        {/* El nombre, en su propia capsula, solo desde md. Debajo de lg va el
            corto: "Licenciatura en Tecnologia de los Alimentos" no cabe, y una
            capsula con el texto cortado se lee como un fallo. */}
        <div
          className={`${CRISTAL} hidden h-11 min-w-0 shrink items-center rounded-full px-5 md:flex`}
        >
          <h1 className="min-w-0 truncate text-[16px] font-light tracking-[-0.015em] text-tinta">
            <span className="lg:hidden">{carrera.nombreCorto}</span>
            <span className="hidden lg:inline">{carrera.nombre}</span>
          </h1>
        </div>
      </div>

      <SelectorVista vista={vista} alCambiar={alCambiarVista} />

      <div className="flex shrink-0 items-center justify-end gap-2">
        <button
          type="button"
          onClick={alBuscar}
          title="Buscar materias y acciones"
          aria-label="Buscar materias y acciones"
          aria-keyshortcuts="Meta+K Control+K"
          className={`${CRISTAL} group hidden h-11 w-11 items-center justify-center gap-2.5 rounded-full text-tinta-suave transition-[color,transform] duration-200 hover:scale-[1.03] hover:text-tinta active:scale-[0.97] lg:flex xl:w-[208px] xl:justify-start xl:px-4`}
        >
          <IconoBuscar size={17} className="shrink-0" />
          <span className="hidden flex-1 text-left text-[12.5px] font-medium text-tinta-tenue transition-colors group-hover:text-tinta-suave xl:block">
            Buscar…
          </span>
          <span className="hidden shrink-0 items-center gap-1 xl:flex" aria-hidden="true">
            <Tecla>{modificador}</Tecla>
            <Tecla>K</Tecla>
          </span>
        </button>

        {/* El grupo: una sola isla con tres zonas. El avance es una insignia
            -el anillo y el numero al lado, a tamaño de texto- y no un
            circulo con el numero dentro: a veinte pixeles el numero dentro
            no se lee, y fuera se lee al doble de distancia. */}
        <div
          className={`${CRISTAL} h-10 items-center rounded-full p-0.5 md:flex md:h-11 md:p-1 ${
            hayAvisos ? 'flex' : 'hidden'
          }`}
        >
          {/* El avance solo desde md: en el telefono lo lleva la isla de abajo. */}
          <button
            type="button"
            onClick={(e) => alAlternarAvance(e.currentTarget)}
            title={detalleAvance}
            aria-label={detalleAvance}
            aria-expanded={avanceAbierto}
            className={`${CELDA} gap-1.5 pr-3 pl-2.5 max-md:hidden ${
              avanceAbierto ? CELDA_ACTIVA : 'text-tinta-suave hover:text-tinta'
            }`}
          >
            <AnilloAvance
              valor={avance}
              tamano={20}
              grosor={4.5}
              activo={avanceAbierto}
              conNumero={false}
              /* Sobre cristal la pista de siempre casi no se ve: se pinta con la
                 tinta del tema, que se adapta a claro y oscuro. */
              pista="color-mix(in oklab, var(--tinta) 24%, transparent)"
            />
            <span className="text-[12.5px] leading-none font-semibold tabular-nums">
              {Math.round(avanceAnimado)}%
            </span>
          </button>

          <Division className="max-md:hidden" />

          {hayAvisos && (
            <>
              <BotonAvisos
                cantidad={carrera.avisos.length}
                abierto={avisosAbiertos}
                alPulsar={alAlternarAvisos}
              />
              <Division className="max-md:hidden" />
            </>
          )}

          {/* El tema solo desde md: en el telefono esta en la hoja de avance. */}
          <BotonCelda
            icono={tema === 'oscuro' ? IconoSol : IconoLuna}
            claveIcono={tema}
            titulo={tema === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            alPulsar={alternarTema}
            className="max-md:hidden"
          />
        </div>
      </div>
    </header>
  )
}

export default BarraSuperior
