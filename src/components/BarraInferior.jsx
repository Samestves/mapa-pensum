import { IconoInicio } from './IconosSF'
import IslaAvance from './IslaAvance'
import { VISTAS, indiceDeVista } from '../data/vistas'

/**
 * La barra de abajo del telefono: volver, las tres vistas y el avance.
 *
 * Todo lo que se toca vive aqui y no arriba. Sujetando el telefono con una
 * mano, el pulgar llega comodo al tercio de abajo y hay que recolocar el
 * agarre para tocar el borde superior; y lo que se quita de arriba se le da a
 * la vista, que llega hasta el borde.
 *
 * Dos piezas, cada una para lo que es:
 * - Una capsula con Inicio a la izquierda -salir a todas las carreras-,
 *   apartado por un filo fino, y las vistas: son SITIOS -cambian lo que
 *   llena la pantalla-. La elegida va encendida sobre su gota de cristal;
 *   las otras quedan apagadas, sin caja ni fondo propio. Los nombres van en
 *   minusculas, como las pestañas de iOS.
 * - El avance, una isla redonda (IslaAvance) cuyo borde es la barra de
 *   progreso: es una CONSULTA -abre una hoja encima y te deja donde estabas-,
 *   y desde esa hoja se llega a Planificar.
 *
 * Sobre el coste: el desenfoque de fondo es lo caro del cristal, y estas dos
 * superficies suman poco area. Nada se anima en bucle; la lente solo se mueve
 * al cambiar de vista.
 *
 * El area de toque de cada pestaña es su tercio de la capsula, unos 70 px de
 * ancho por 46 de alto, e Inicio 46 x 46: por encima de los 44 que se
 * consideran el minimo.
 */
function BarraInferior({ vista, alCambiar, resumen, avanceAbierto, alAlternarAvance, alVolver }) {
  const indice = indiceDeVista(vista)

  const cambiar = (id) => {
    if (id === vista) return
    /* Un toque de vibracion al cambiar, el acuse que da un mando. Solo en
       los telefonos que la tienen -Android-; en el resto la llamada no
       existe y no pasa nada. */
    try {
      navigator.vibrate?.(8)
    } catch {
      // Hay navegadores que la exponen pero la bloquean sin gesto previo
    }
    alCambiar(id)
  }

  return (
    /* md:hidden y no un hook de medida: el corte cae exactamente donde
       useEsTelefono pone el suyo, y resolverlo en CSS evita que la barra
       parpadee en el primer fotograma mientras JavaScript decide.

       El envoltorio ocupa el ancho entero pero no atrapa toques
       -pointer-events-none-: entre las piezas y a sus lados, el dedo tiene
       que llegar al contenido de debajo. Solo las piezas los reciben.

       La separacion del borde se suma a la del sistema en vez de
       sustituirla: en un telefono con barra de gestos, sin eso la capsula
       quedaria encima del indicador de inicio. */
    <nav
      aria-label="Vistas de la carrera"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex items-center justify-center gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+14px)] md:hidden"
    >
      {/* Una sola capsula: Inicio a la izquierda, separado por un filo, y
          las tres vistas. Inicio no es un sitio mas -sales de la carrera-,
          asi que no lleva lente: solo la linea lo aparta de las vistas. Crece
          hasta 288 px y encoge en pantallas estrechas. */}
      <div className="barra-cristal pointer-events-auto flex h-[52px] max-w-[288px] min-w-0 flex-1 items-center rounded-full p-[3px]">
        <button
          type="button"
          onClick={alVolver}
          title="Ver todas las carreras"
          aria-label="Ver todas las carreras"
          className="grid h-full w-[46px] shrink-0 place-items-center rounded-full text-tinta-suave transition-transform duration-200 ease-out active:scale-[0.92]"
        >
          <IconoInicio size={20} />
        </button>

        <span aria-hidden="true" className="separador-inicio mx-1 h-6 w-px shrink-0" />

        <div className="relative grid h-full min-w-0 flex-1 grid-cols-3">
          {/* La lente: una gota de cristal detras de la vista elegida. Se
              desliza hasta la nueva y es lo unico de la barra que se mueve. */}
          <span
            aria-hidden="true"
            className="lente-cristal pointer-events-none absolute inset-y-0 left-0 rounded-full"
            style={{
              width: 'calc(100% / 3)',
              transform: `translateX(${indice * 100}%)`,
            }}
          />

        {VISTAS.map(({ id, icono: Ico, etiqueta, titulo }) => {
          const activo = id === vista
          return (
            <button
              key={id}
              type="button"
              onClick={() => cambiar(id)}
              title={titulo}
              aria-label={titulo}
              aria-current={activo ? 'page' : undefined}
              className="pestana-dock group relative flex flex-col items-center justify-center gap-[3px] rounded-full"
              data-activa={activo}
            >
              {/* El acuse del toque va en el icono. Y la que se acaba de
                  elegir se asienta: la key cambia al encenderse y eso
                  reinicia su animacion. */}
              <span
                key={activo ? 'encendida' : 'apagada'}
                className={`grid h-5 place-items-center transition-[color,transform] duration-200 group-active:scale-90 ${
                  activo ? 'icono-asentado vista-activa' : 'text-tinta-tenue'
                }`}
              >
                <Ico size={20} relleno={activo} />
              </span>
              <span className="etiqueta-pestana font-ui text-[10px] leading-none font-medium">
                {etiqueta}
              </span>
            </button>
          )
        })}
        </div>
      </div>

      <IslaAvance resumen={resumen} abierta={avanceAbierto} alPulsar={alAlternarAvance} />
    </nav>
  )
}

export default BarraInferior
