const MARGEN = 10
const HUECO = 6

/**
 * Donde cabe un popover respecto al boton que lo abrio.
 *
 * Dos decisiones, cada una en su eje, y las dos con la misma regla: se
 * intenta el lado natural y solo se cambia si no cabe.
 *
 * En vertical, debajo del boton; arriba si abajo se sale. En horizontal se
 * alinea por el borde DERECHO del ancla, no por el izquierdo. Los botones que
 * abren estas cosas viven en la parte derecha de su barra, asi que uno que
 * creciera hacia la derecha se saldria de la ventana; creciendo hacia la
 * izquierda se queda debajo de su propio boton. Solo cuando eso lo sacaria
 * por el borde izquierdo se voltea.
 *
 * Devuelve tambien el origen de la transformacion, que es lo que hace que
 * parezca salir del boton en vez de aparecer en un sitio. Va en pixeles y
 * apunta al CENTRO del ancla, no a una esquina con 'left' o 'right': cuando
 * el popover no cabe alineado y hay que correrlo para que entre en la
 * ventana, su esquina deja de coincidir con el boton -en un telefono llegan a
 * quedar setenta pixeles de diferencia- y la animacion nacia de un punto
 * donde no hay nada. Midiendo desde el centro del boton nace siempre de el,
 * quepa donde quepa.
 *
 * Vive aqui y no dentro de un componente porque lo usan el menu de una clase
 * y el avance de la carrera, y es geometria pura: sin React, se razona sola.
 */
export function colocarBajoAncla(ancla, ancho, alto) {
  const abajo = ancla.bottom + HUECO
  const cabeAbajo = abajo + alto <= window.innerHeight - MARGEN
  const y = cabeAbajo ? abajo : Math.max(MARGEN, ancla.top - HUECO - alto)

  const aLaIzquierda = ancla.right - ancho
  const x =
    aLaIzquierda >= MARGEN
      ? aLaIzquierda
      : Math.min(ancla.left, window.innerWidth - ancho - MARGEN)

  const centro = (ancla.left + ancla.right) / 2
  const origenX = Math.min(Math.max(centro - x, 0), ancho)

  return { x, y, origen: `${Math.round(origenX)}px ${cabeAbajo ? 'top' : 'bottom'}` }
}

/** El ancho que de verdad le cabe a un popover en esta ventana */
export const anchoQueCabe = (deseado) => Math.min(deseado, window.innerWidth - MARGEN * 2)
