const MARGEN = 10
const HUECO = 8

/* El piquito se aparta de las esquinas RADIO px, que no es un numero redondo
   elegido a ojo: el panel curva 16 px y el piquito, girado, asoma 8,5 a cada
   lado de su centro. Con menos de esos 24,5 una de sus puntas cae dentro de
   la curva y se dibuja mordida, que parece un error de pintado y no una
   flecha. */
const RADIO = 25

const acotar = (v, min, max) => Math.max(min, Math.min(v, max))

/**
 * Donde cabe un popover respecto a lo que lo abrio, y por donde le sale el
 * piquito.
 *
 * Una sola funcion para los dos casos que existen en la aplicacion, porque
 * son el mismo problema con los ejes cambiados:
 *
 *   'abajo'  cuelga DEBAJO del ancla y se alinea a un lado. Es lo que quiere
 *            un boton de una barra: el avance, el menu de una clase.
 *   'lado'   se pone AL LADO del ancla y se centra en vertical. Es lo que
 *            quiere una celda dentro de una rejilla o un nodo del mapa: si
 *            colgara debajo, taparia justo aquello sobre lo que se decide.
 *
 * En los dos ejes la regla es la misma: se intenta el lado natural y solo se
 * cambia si no cabe. El eje secundario no voltea, se sujeta dentro de la
 * ventana.
 *
 * En 'abajo' el eje secundario se alinea por el borde DERECHO del ancla y no
 * por el izquierdo. Los botones que abren estas cosas viven en la parte
 * derecha de su barra, asi que uno que creciera hacia la derecha se saldria
 * de la ventana; creciendo hacia la izquierda se queda debajo de su propio
 * boton.
 *
 * Devuelve tambien el origen de la transformacion, que es lo que hace que
 * parezca salir del ancla en vez de aparecer en un sitio. Apunta al CENTRO
 * del ancla, no a una esquina: cuando el popover no cabe alineado y hay que
 * correrlo para que entre, su esquina deja de coincidir con el ancla -en un
 * telefono llegan a quedar setenta pixeles- y la animacion nacia de un punto
 * donde no hay nada.
 *
 * El piquito sale del mismo calculo que el origen a proposito. Las dos
 * preguntas son "¿donde cae el ancla respecto a este panel?", y responderlas
 * por separado seria arriesgarse a que digan cosas distintas.
 *
 * `limites` es la caja dentro de la que hay que caber, y por defecto es la
 * ventana. La ficha del mapa pasa la suya: vive DENTRO del lienzo del grafo
 * porque tiene que moverse con el en cada fotograma del arrastre, asi que sus
 * coordenadas son las del contenedor y no las de la pagina. Sin esto habria
 * que traducirlas a coordenadas de ventana leyendo el rectangulo del
 * contenedor en cada fotograma, que es justo el trabajo que se evita moviendo
 * las cosas con transform.
 *
 * Es geometria pura y por eso vive fuera de React: se lee sola y se sigue con
 * un lapiz.
 */
export function colocar(ancla, medida, preferencia = 'abajo', limites) {
  const { ancho, alto } = medida
  const tope = limites ?? { ancho: window.innerWidth, alto: window.innerHeight }
  const centroX = (ancla.left + ancla.right) / 2
  const centroY = (ancla.top + ancla.bottom) / 2

  if (preferencia === 'lado') {
    const derecha = ancla.right + HUECO
    const cabeDerecha = derecha + ancho <= tope.ancho - MARGEN
    const x = cabeDerecha ? derecha : Math.max(MARGEN, ancla.left - HUECO - ancho)

    const y = acotar(
      centroY - alto / 2,
      MARGEN,
      Math.max(MARGEN, tope.alto - alto - MARGEN),
    )
    const origenY = acotar(centroY - y, 0, alto)

    return {
      x,
      y,
      origen: `${cabeDerecha ? 'left' : 'right'} ${Math.round(origenY)}px`,
      flecha: {
        lado: cabeDerecha ? 'izquierda' : 'derecha',
        posicion: Math.round(acotar(origenY, RADIO, Math.max(RADIO, alto - RADIO))),
      },
    }
  }

  const abajo = ancla.bottom + HUECO
  const cabeAbajo = abajo + alto <= tope.alto - MARGEN
  const y = cabeAbajo ? abajo : Math.max(MARGEN, ancla.top - HUECO - alto)

  const aLaIzquierda = ancla.right - ancho
  const x =
    aLaIzquierda >= MARGEN
      ? aLaIzquierda
      : Math.min(ancla.left, tope.ancho - ancho - MARGEN)
  const origenX = acotar(centroX - x, 0, ancho)

  return {
    x,
    y,
    origen: `${Math.round(origenX)}px ${cabeAbajo ? 'top' : 'bottom'}`,
    flecha: {
      lado: cabeAbajo ? 'arriba' : 'abajo',
      posicion: Math.round(acotar(origenX, RADIO, Math.max(RADIO, ancho - RADIO))),
    },
  }
}

/** El ancho que de verdad le cabe a un popover en esta ventana */
export const anchoQueCabe = (deseado) => Math.min(deseado, window.innerWidth - MARGEN * 2)
