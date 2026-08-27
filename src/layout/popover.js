const MARGEN = 10

/* Hueco entre el ancla y el panel. Tiene que ser mayor que el ALTO del
   piquito -11,1- o la punta acabaria metida dentro de aquello a lo que
   apunta. Los dos que sobran son el aire que deja la punta antes de tocarlo. */
const HUECO = 13

/* El piquito se aparta de las esquinas RADIO px. Sale de sumar: el panel curva
   16 y el pico mide 23,1 de base, o sea 11,6 a cada lado de su centro. Con
   menos de 27,6 una de sus faldas caeria sobre la curva y la juntura -que es
   lo unico que hace que pico y panel se lean como una sola silueta- se veria
   rota. Los 30 son esos 27,6 con dos y medio de aire. */
const RADIO = 30

const acotar = (v, min, max) => Math.max(min, Math.min(v, max))

/* Donde cae el piquito a lo largo de un borde de `largo` px. En un panel tan
   corto que no quepan dos RADIOS no hay sitio legal en ninguna parte, y
   centrarlo es lo unico que no queda peor. */
const situarPico = (v, largo) =>
  largo < RADIO * 2 ? Math.round(largo / 2) : Math.round(acotar(v, RADIO, largo - RADIO))

/**
 * Donde cabe un popover respecto a lo que lo abrio, y por donde le sale el
 * piquito.
 *
 * Una sola funcion para los dos casos que existen en la aplicacion, porque
 * son el mismo problema con los ejes cambiados:
 *
 *   'abajo'  cuelga DEBAJO del ancla. Es lo que quiere un boton de una barra:
 *            el avance, el menu de una clase.
 *   'lado'   se pone AL LADO del ancla y se centra en vertical. Es lo que
 *            quiere una celda dentro de una rejilla o un nodo del mapa: si
 *            colgara debajo, taparia justo aquello sobre lo que se decide.
 *
 * En los dos ejes la regla es la misma: se intenta el lado natural y solo se
 * cambia si no cabe. El eje secundario no voltea, se sujeta dentro de la
 * ventana.
 *
 * En 'abajo' el eje secundario se coloca poniendo el borde derecho del panel a
 * RADIO del CENTRO DEL ANCLA. Antes se alineaban los bordes derechos de los
 * dos, y con un boton de 36 px eso deja su centro a 18 del borde del panel:
 * dentro de la zona donde el piquito no puede ponerse sin morderse con la
 * esquina redondeada, asi que el pico se quedaba clavado en el limite y
 * apuntaba siete pixeles al lado del boton. Naciendo del centro apunta al
 * boton, y como RADIO es mayor que medio boton el panel sigue creciendo hacia
 * la izquierda, que es lo que hace falta para que no se salga por la derecha.
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
        posicion: situarPico(origenY, alto),
      },
    }
  }

  const abajo = ancla.bottom + HUECO
  const cabeAbajo = abajo + alto <= tope.alto - MARGEN
  const y = cabeAbajo ? abajo : Math.max(MARGEN, ancla.top - HUECO - alto)

  const x = acotar(
    centroX + RADIO - ancho,
    MARGEN,
    Math.max(MARGEN, tope.ancho - ancho - MARGEN),
  )
  const origenX = acotar(centroX - x, 0, ancho)

  return {
    x,
    y,
    origen: `${Math.round(origenX)}px ${cabeAbajo ? 'top' : 'bottom'}`,
    flecha: {
      lado: cabeAbajo ? 'arriba' : 'abajo',
      posicion: situarPico(origenX, ancho),
    },
  }
}

/** El ancho que de verdad le cabe a un popover en esta ventana */
export const anchoQueCabe = (deseado) => Math.min(deseado, window.innerWidth - MARGEN * 2)
