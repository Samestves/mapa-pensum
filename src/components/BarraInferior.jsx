import { GraduationCap, Search } from 'lucide-react'
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
 * Abajo tambien deja sitio arriba. La cabecera se ahorra los 114 px del mando
 * segmentado y con eso cabe por fin el nombre de la carrera, que en el
 * telefono no se enseñaba en ninguna parte: se entraba a un mapa sin titulo.
 *
 * Es una barra de pestañas y no el mismo mando segmentado mudado de sitio.
 * Un segmentado es un control dentro de una pantalla; una barra inferior es
 * la navegacion de la aplicacion, ocupa el ancho entero y lleva las etiquetas
 * siempre puestas. Aqui hay espacio para las palabras y no hace falta que
 * nadie deduzca un icono.
 *
 * El area de toque es la pestaña COMPLETA -todo el alto y un tercio del
 * ancho-, no el icono. Da unos 125x56 px por destino, muy por encima de los
 * 44 que se consideran el minimo comodo.
 */
function BarraInferior({ vista, alCambiar, alBuscar, alPlanificar }) {
  const indice = indiceDeVista(vista)

  return (
    /* md:hidden y no un hook de medida: el corte cae exactamente donde
       useEsTelefono pone el suyo, y resolverlo en CSS evita que la barra
       parpadee en el primer fotograma mientras JavaScript decide.

       El padding de abajo se suma al del sistema en vez de sustituirlo: en un
       telefono con barra de gestos, sin eso las etiquetas quedan debajo del
       indicador de inicio. */
    <nav
      aria-label="Vistas de la carrera"
      className="transicion-tema relative z-30 grid shrink-0 grid-cols-5 border-t border-panel-borde bg-panel pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {/* La linea de arriba de la barra se ENCIENDE bajo la pestaña activa, y
          se desliza de una a otra con la curva de la casa.

          Antes habia una pastilla gris detras del icono, y estaba mal elegida
          por dos motivos. Uno de significado: una pastilla rellena es el
          lenguaje de un boton con el raton encima, no el de una pestaña
          seleccionada; se leia como si el dedo se hubiera quedado ahi. Y otro
          de identidad: era gris, y esta barra era la unica superficie grande
          de la aplicacion sin una gota del color de marca -el mismo verde del
          logotipo y del anillo de avance-, lo que la dejaba con aire de
          plantilla.

          La linea no compite con nada. Vive en el borde que la barra ya
          tenia, asi que no añade un objeto a la pantalla: solo lo colorea en
          el tramo que toca. Es lo que hace que se lea como "estas aqui" en
          vez de como un boton pulsado. */}
      <span
        aria-hidden="true"
        style={{ transform: `translateX(${indice * 100}%)` }}
        className="pulgar-vista pointer-events-none absolute -top-px left-0 flex w-1/5 justify-center"
      >
        <span className="h-[2.5px] w-9 rounded-full bg-aprobada" />
      </span>

      {VISTAS.map(({ id, icono: Ico, etiqueta, titulo }) => {
        const activo = id === vista
        return (
          <button
            key={id}
            type="button"
            onClick={() => alCambiar(id)}
            title={titulo}
            aria-label={titulo}
            aria-pressed={activo}
            className="relative flex flex-col items-center gap-1.5 pt-3 pb-2.5"
          >
            {/* El acuse de recibo al toque va en el icono y no en la pestaña
                entera: encoger un bloque de 125 px de ancho se lee como que
                se hunde la barra, encoger el icono se lee como pulsar algo. */}
            <span
              className={`grid h-6 place-items-center transition-[color,transform] duration-200 active:scale-90 ${
                activo ? 'text-aprobada' : 'text-tinta-tenue'
              }`}
            >
              {/* El trazo cambia de verdad -2,3 contra 1,7- y no por decimas.
                  Hubo una version con 2,2 contra 1,9: una diferencia que
                  existia en el codigo y no en la pantalla. */}
              <Ico size={21} strokeWidth={activo ? 2.3 : 1.7} />
            </span>
            {/* La etiqueta activa sube a tinta plena y a peso fuerte, pero NO
                se tiñe: con el icono y la linea ya en color, pintarla tambien
                dejaba tres cosas gritando lo mismo. Queda el color para
                señalar y el texto para leerse. */}
            <span
              className={`text-[10.5px] leading-none tracking-[0.01em] transition-colors duration-200 ${
                activo ? 'font-extrabold text-tinta' : 'font-semibold text-tinta-tenue'
              }`}
            >
              {etiqueta}
            </span>
          </button>
        )
      })}

      {/* Buscar baja aqui desde la cabecera. Arriba era una lupa suelta de 33
          px pegada al anillo de avance, dos cosas redondeadas sin relacion
          una contra otra; abajo es una accion mas entre acciones.
          Y tenia que quedarse en alguna parte: en un telefono no hay Ctrl+K,
          asi que este boton es la UNICA puerta a la paleta. Borrarlo sin mas
          no habria limpiado la cabecera, habria borrado la busqueda del
          telefono, que ademas es donde mas cuesta encontrar una materia
          recorriendo el mapa con el dedo. */}
      <button
        type="button"
        onClick={alBuscar}
        title="Buscar materias y acciones"
        aria-label="Buscar materias y acciones"
        className="relative flex flex-col items-center gap-1.5 pt-3 pb-2.5"
      >
        <span className="grid h-6 place-items-center text-tinta-tenue transition-transform duration-200 active:scale-90">
          <Search size={21} strokeWidth={1.7} />
        </span>
        <span className="text-[10.5px] leading-none font-semibold tracking-[0.01em] text-tinta-tenue">
          Buscar
        </span>
      </button>

      {/* Planificar cierra la fila, y es de otra clase que las tres de al
          lado: aquellas son SITIOS -cambian lo que llena la pantalla- y esta
          es una ACCION, que abre un panel encima y se cierra dejandote donde
          estabas.

          Por eso la linea de arriba nunca llega hasta aqui. Esa linea dice
          "estas aqui", y de una accion no se puede estar: mientras el panel
          esta abierto sigues en el mapa, en la lista o en el horario, y la
          linea se queda marcando cual. Deslizarla hasta este cuarto sitio
          habria dicho que las tres vistas se apagaron, que no es lo que pasa.

          Lo que si comparte es todo lo demas -mismo alto, misma area de
          toque, mismo tamaño de icono y de etiqueta-, porque el pulgar no
          tiene por que aprender dos gestos distintos en la misma barra. */}
      <button
        type="button"
        onClick={alPlanificar}
        title="Planificar mi ruta hasta el grado y exportarla"
        aria-label="Planificar mi ruta hasta el grado y exportarla"
        className="relative flex flex-col items-center gap-1.5 pt-3 pb-2.5"
      >
        <span className="grid h-6 place-items-center text-tinta-tenue transition-transform duration-200 active:scale-90">
          <GraduationCap size={21} strokeWidth={1.7} />
        </span>
        <span className="text-[10.5px] leading-none font-semibold tracking-[0.01em] text-tinta-tenue">
          Planificar
        </span>
      </button>
    </nav>
  )
}

export default BarraInferior
