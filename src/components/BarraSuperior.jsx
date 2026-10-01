import { IconoInicio } from './IconosSF'
import IslaAvance from './IslaAvance'
import IslaBuscar from './IslaBuscar'
import SelectorVista from './SelectorVista'
import { BotonAvisos } from './AvisosCarrera'

/* La cabecera no es una barra: son islas de cristal que flotan sobre la
   vista -el mismo idioma que la capsula inferior del telefono-.

   Dos formas, cada una para lo que es:
   - CIRCULO: un solo gesto -ir al inicio, buscar, el avance, los avisos-.
   - CAPSULA: algo con contenido -el titulo, el mando de vistas-.
   Todas miden lo mismo de alto -40 px en telefono, 44 en escritorio, el
   minimo tactil- para que la fila se lea como una sola linea. */
const CRISTAL = 'barra-cristal relative pointer-events-auto shrink-0'
const CIRCULO =
  `${CRISTAL} grid size-10 place-items-center rounded-full md:size-11 ` +
  'text-tinta-suave transition-[color,transform] duration-200 ' +
  'hover:scale-[1.06] hover:text-tinta active:scale-[0.92]'

/* El alto de la fila en escritorio, que es el lado de la isla de avance */
const ALTO_FILA = 44

/**
 * La cabecera de una carrera, en tres zonas sobre una rejilla de tres
 * columnas -las de los lados flexibles, la del centro a su medida-, de modo
 * que el centro cae en el eje de la ventana pase lo que pase con el largo
 * del nombre de la carrera:
 *
 * - Izquierda: DONDE ESTAS. Volver y el nombre.
 * - Centro: COMO TE MUEVES. El mando de vistas, que es la navegacion
 *   principal y por eso va en el eje, como el control segmentado de la barra
 *   de herramientas de macOS; y a su lado la lupa, que es la otra forma de
 *   moverse por la carrera.
 * - Derecha: COMO VAS. La isla de avance, la misma del telefono: el borde es
 *   la barra de progreso y el porcentaje va dentro. El tema ya no tiene boton
 *   aqui: vive en el panel que abre esa isla, como en el telefono vive en su
 *   hoja. Una pieza para "como voy" en vez de un grupo de botones sueltos.
 *
 * Los avisos, en las carreras que los tienen, son una isla aparte: no son
 * avance, son una salvedad sobre los datos, y en ambar se distinguen solos.
 *
 * En el telefono la cabecera se vacia: solo quedan los avisos. Volver y el
 * avance bajan a la barra de abajo, que es donde llega el pulgar, y el nombre
 * de la carrera encabeza la hoja de avance. Asi la vista llega hasta arriba.
 */
function BarraSuperior({
  carrera,
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

      <div className="flex items-center gap-2">
        <SelectorVista vista={vista} alCambiar={alCambiarVista} />
        <IslaBuscar alBuscar={alBuscar} />
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2">
        {hayAvisos && (
          <div className={`${CRISTAL} flex h-10 items-center rounded-full p-0.5 md:h-11 md:p-1`}>
            <BotonAvisos
              cantidad={carrera.avisos.length}
              abierto={avisosAbiertos}
              alPulsar={alAlternarAvisos}
            />
          </div>
        )}

        {/* Solo desde md: en el telefono la misma isla va en la barra de
            abajo. */}
        <IslaAvance
          resumen={resumen}
          abierta={avanceAbierto}
          alPulsar={alAlternarAvance}
          lado={ALTO_FILA}
          className="hover:scale-[1.06] max-md:hidden"
        />
      </div>
    </header>
  )
}

export default BarraSuperior
