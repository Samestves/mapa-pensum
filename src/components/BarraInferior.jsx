import { GraduationCap } from 'lucide-react'
import { VISTAS, indiceDeVista } from '../data/vistas'

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
 *
 * Dos piezas y no una. Las tres vistas son SITIOS -cambian lo que llena la
 * pantalla- y van juntas en la capsula. Planificar es una ACCION -abre un
 * panel encima y te deja donde estabas- y va aparte, en su propio circulo.
 *
 * Probe dos adornos mas y se fueron: una raya de luz verde bajo la vista
 * elegida y un aro de avance alrededor del boton de planificar. La gota ya
 * dice donde estas, y el avance ya lo dice el anillo de la cabecera.
 *
 * Sobre el coste: el desenfoque de fondo es lo caro del cristal, asi que solo
 * lo llevan estas dos superficies, que suman poco area. Nada se anima en
 * bucle; la lente solo se mueve al cambiar de vista.
 *
 * El area de toque de cada pestaña es su tercio entero de la capsula, unos
 * 80 x 46 px: por encima de los 44 que se consideran el minimo.
 */
function BarraInferior({ vista, alCambiar, alPlanificar }) {
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
      className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex items-center justify-center gap-2.5 px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] md:hidden"
    >
      <div className="barra-cristal pointer-events-auto relative grid h-[56px] w-[252px] grid-cols-3 rounded-full p-1">
        {/* La lente: una gota de cristal detras de la vista elegida. Se
            desliza hasta la nueva con un rebote corto al llegar, y es lo
            unico de la barra que se mueve. */}
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
              className="pestana-barra group relative flex flex-col items-center justify-center gap-[5px] rounded-full"
              data-activa={activo}
            >
              {/* El acuse del toque va en el icono. Y la que se acaba de
                  elegir se asienta con un rebote: la key cambia al
                  encenderse y eso reinicia su animacion. */}
              <span
                key={activo ? 'encendida' : 'apagada'}
                className={`grid h-5 place-items-center transition-[color,transform] duration-200 group-active:scale-90 ${
                  activo ? 'icono-asentado text-tinta' : 'text-tinta-tenue'
                }`}
              >
                <Ico size={18} strokeWidth={1.5} />
              </span>
              <span className="etiqueta-pestana font-ui text-[8.5px] leading-none font-medium uppercase">
                {etiqueta}
              </span>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={alPlanificar}
        title="Planificar mi ruta hasta el grado y exportarla"
        aria-label="Planificar mi ruta hasta el grado y exportarla"
        className="barra-cristal group pointer-events-auto relative grid size-[56px] shrink-0 place-items-center rounded-full text-tinta-suave"
      >
        <span className="grid place-items-center transition-transform duration-200 group-active:scale-90">
          <GraduationCap size={19} strokeWidth={1.5} />
        </span>
      </button>
    </nav>
  )
}

export default BarraInferior
