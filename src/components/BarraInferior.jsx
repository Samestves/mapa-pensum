import AnilloAvance from './AnilloAvance'
import { VISTAS, indiceDeVista } from '../data/vistas'
import { avanceDe, describirAvance } from '../data/avance'

/**
 * Las tres vistas, abajo, en el telefono.
 *
 * Estaban arriba, dentro de la cabecera, y esa es la peor esquina de un
 * telefono: sujetando el aparato con una mano, el pulgar llega comodo al
 * tercio de abajo y hay que recolocar el agarre para tocar el borde superior.
 * Poner ahi lo que MAS se toca -cambiar de vista es el gesto mas repetido de
 * la aplicacion- era cobrar ese peaje cada vez.
 *
 * Es una capsula de cristal que flota sobre el contenido. Por dentro habla el
 * mismo idioma que el mapa: los nombres en mayusculas espaciadas y la vista
 * elegida encendida sobre su gota de cristal, como se marca lo elegido en un
 * menu de juego; las otras quedan apagadas, sin caja ni fondo propio.
 * Los nombres van en minusculas, como las pestañas de iOS: en mayusculas
 * espaciadas a 8 px no se leian bien en un telefono.
 *
 * Dos piezas y no una. Las tres vistas son SITIOS -cambian lo que llena la
 * pantalla- y van juntas en la capsula. El avance es una CONSULTA -abre un
 * panel encima y te deja donde estabas- y va aparte, en su propio circulo: el
 * anillo de progreso rodea el borde de la isla y el numero va dentro. Desde
 * ese panel se llega tambien a Planificar.
 *
 * Probe un adorno mas y se fue: una raya de luz verde bajo la vista elegida.
 * La gota ya dice donde estas.
 *
 * Sobre el coste: el desenfoque de fondo es lo caro del cristal, asi que solo
 * lo llevan estas dos superficies, que suman poco area. Nada se anima en
 * bucle; la lente solo se mueve al cambiar de vista.
 *
 * El area de toque de cada pestaña es su tercio entero de la capsula, unos
 * 80 x 46 px: por encima de los 44 que se consideran el minimo.
 */
function BarraInferior({ vista, alCambiar, resumen, avanceAbierto, alAlternarAvance }) {
  const indice = indiceDeVista(vista)
  const detalleAvance = describirAvance(resumen)

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
      className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex items-center justify-center gap-2.5 px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] md:hidden"
    >
      <div className="barra-cristal pointer-events-auto relative grid h-[58px] w-[264px] grid-cols-3 rounded-full p-1">
        {/* La lente: una gota de cristal detras de la vista elegida. Se
            desliza hasta la nueva y es lo unico de la barra que se mueve. */}
        <span
          aria-hidden="true"
          className="lente-cristal pointer-events-none absolute inset-y-1 left-1 rounded-full"
          style={{
            width: 'calc((100% - 8px) / 3)',
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
              className="pestana-dock group relative flex flex-col items-center justify-center gap-1 rounded-full"
              data-activa={activo}
            >
              {/* El acuse del toque va en el icono. Y la que se acaba de
                  elegir se asienta: la key cambia al encenderse y eso
                  reinicia su animacion. */}
              <span
                key={activo ? 'encendida' : 'apagada'}
                className={`grid h-[22px] place-items-center transition-[color,transform] duration-200 group-active:scale-90 ${
                  activo ? 'icono-asentado vista-activa' : 'text-tinta-tenue'
                }`}
              >
                <Ico size={22} relleno={activo} />
              </span>
              <span className="etiqueta-pestana font-ui text-[10.5px] leading-none font-medium">
                {etiqueta}
              </span>
            </button>
          )
        })}
      </div>

      {/* El anillo va pegado al borde de la isla y el numero dentro: a 50 px
          cabe el "100%" entero sin tocar el trazo. */}
      <button
        type="button"
        onClick={(e) => alAlternarAvance(e.currentTarget)}
        title={detalleAvance}
        aria-label={detalleAvance}
        aria-expanded={avanceAbierto}
        className="barra-cristal group pointer-events-auto relative grid size-[58px] shrink-0 place-items-center rounded-full"
      >
        <span className="grid place-items-center transition-transform duration-200 group-active:scale-90">
          <AnilloAvance
            valor={avanceDe(resumen)}
            tamano={50}
            grosor={2.8}
            activo={avanceAbierto}
            simbolo
            pista="color-mix(in oklab, var(--tinta) 18%, transparent)"
          />
        </span>
      </button>
    </nav>
  )
}

export default BarraInferior
