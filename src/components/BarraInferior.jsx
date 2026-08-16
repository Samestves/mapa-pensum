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
function BarraInferior({ vista, alCambiar }) {
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
      className="transicion-tema relative z-30 grid shrink-0 grid-cols-3 border-t border-panel-borde bg-panel pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {/* La pastilla se DESLIZA de una pestaña a otra, igual que el pulgar del
          mando de escritorio y con la misma curva: es la misma idea contada
          en el mismo idioma. El envoltorio ocupa un tercio y la pastilla va
          centrada dentro, asi que el desplazamiento sigue siendo un tercio
          exacto y no hay que medir nada. */}
      <span
        aria-hidden="true"
        style={{ transform: `translateX(${indice * 100}%)` }}
        className="pulgar-vista pointer-events-none absolute top-2 left-0 flex h-9 w-1/3 justify-center"
      >
        <span className="pastilla-vista transicion-tema h-full w-[4.5rem] rounded-full" />
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
            className="relative flex flex-col items-center gap-1 pt-2 pb-2.5"
          >
            {/* El acuse de recibo al toque va en el icono y no en la pestaña
                entera: encoger un bloque de 125 px de ancho se lee como que
                se hunde la barra, encoger el icono se lee como pulsar algo.
                Y va aqui dentro y no en el boton para no pelearse con el
                translate de la pastilla, que es su hermana absoluta. */}
            <span
              className={`grid h-9 place-items-center transition-transform duration-150 active:scale-90 ${
                activo ? 'text-tinta' : 'text-tinta-tenue'
              }`}
            >
              {/* El trazo cambia de verdad -2,4 contra 1,7- y no por decimas.
                  Antes iba 2,2 contra 1,9: una diferencia que existe en el
                  codigo y no en la pantalla. */}
              <Ico size={21} strokeWidth={activo ? 2.4 : 1.7} />
            </span>
            {/* La etiqueta activa sube de peso ademas de tinta. Solo con el
                color, sobre una pastilla que apenas se ve, la pestaña activa
                se distinguia por un gris contra otro gris. */}
            <span
              className={`text-[10.5px] leading-none tracking-[0.02em] transition-colors duration-200 ${
                activo ? 'font-extrabold text-tinta' : 'font-semibold text-tinta-tenue'
              }`}
            >
              {etiqueta}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

export default BarraInferior
