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
 * Es una capsula de cristal que flota sobre el contenido, no una franja pegada
 * al borde: el mapa, la lista y el horario siguen por debajo y se ven
 * desenfocados a traves de ella, que es lo que la hace sentirse ligera. Es el
 * lenguaje de las barras de pestañas de los iPhone recientes, y por eso mismo
 * resulta familiar a quien lo va a usar.
 *
 * Dos piezas y no una. Las tres vistas son SITIOS -cambian lo que llena la
 * pantalla- y van juntas en la capsula, con una lente que marca donde estas.
 * Planificar es una ACCION -abre un panel encima y te deja donde estabas-, y
 * va aparte, en su propio circulo. Antes compartia fila con las vistas y hacia
 * falta explicar por que la marca nunca llegaba hasta ella; separada, la
 * diferencia se ve.
 *
 * Sobre el coste: el desenfoque de fondo es lo caro del cristal, asi que solo
 * lo llevan estas dos superficies, que suman poco area, y con un radio
 * moderado. Nada se anima en bucle; la lente solo se mueve al cambiar de
 * vista. Donde el navegador no sabe desenfocar, o el sistema pide menos
 * transparencia, el cristal pasa a panel opaco (ver .barra-cristal).
 *
 * El area de toque de cada pestaña es su tercio entero de la capsula, unos
 * 90 x 60 px: de sobra por encima de los 44 que se consideran el minimo.
 */
function BarraInferior({ vista, alCambiar, alPlanificar }) {
  const indice = indiceDeVista(vista)

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
      className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex items-center justify-center gap-2.5 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] md:hidden"
    >
      <div className="barra-cristal pointer-events-auto relative grid h-[62px] max-w-[330px] flex-1 grid-cols-3 rounded-full p-[5px]">
        {/* La lente: una pastilla de luz detras de la pestaña activa, que se
            desliza hasta la nueva con un rebote corto al llegar. Es la unica
            cosa de la barra que se mueve. */}
        <span
          aria-hidden="true"
          className="lente-cristal pointer-events-none absolute inset-y-[5px] left-[5px] rounded-full"
          style={{
            width: 'calc((100% - 10px) / 3)',
            transform: `translateX(${indice * 100}%)`,
          }}
        />

        {VISTAS.map(({ id, icono: Ico, etiqueta, titulo }) => {
          const activo = id === vista
          return (
            <button
              key={id}
              type="button"
              onClick={() => alCambiar(id)}
              title={titulo}
              aria-label={titulo}
              aria-current={activo ? 'page' : undefined}
              className="group relative flex flex-col items-center justify-center gap-[5px] rounded-full"
            >
              {/* El acuse del toque va en el icono: encoger la pestaña entera
                  se lee como que se hunde la barra, encoger el icono se lee
                  como pulsar algo. */}
              <span
                className={`grid h-[22px] place-items-center transition-[color,transform] duration-200 group-active:scale-90 ${
                  activo ? 'text-aprobada' : 'text-tinta-suave'
                }`}
              >
                <Ico size={20} strokeWidth={activo ? 2 : 1.6} />
              </span>
              <span
                className={`text-[10px] leading-none tracking-[0.01em] transition-colors duration-200 ${
                  activo ? 'font-medium text-tinta' : 'text-tinta-tenue'
                }`}
              >
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
        className="barra-cristal group pointer-events-auto relative grid size-[62px] shrink-0 place-items-center rounded-full text-tinta-suave"
      >
        <span className="grid place-items-center transition-transform duration-200 group-active:scale-90">
          <GraduationCap size={22} strokeWidth={1.6} />
        </span>
      </button>
    </nav>
  )
}

export default BarraInferior
