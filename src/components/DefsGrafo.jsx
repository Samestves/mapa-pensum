/**
 * Lo unico que el mapa comparte por referencia: el brillo de las tarjetas.
 *
 * Aqui vivian ademas un <pattern> para la rejilla del fondo y dos filtros de
 * desenfoque. Los tres se fueron.
 *
 * LOS FILTROS estaban definidos y no los usaba nadie: el resplandor de los
 * cables se hace apilando trazos, porque feGaussianBlur usa objectBoundingBox
 * y en un cable horizontal la region tiene altura cero y no pinta nada. Eran
 * quince lineas de codigo muerto.
 *
 * EL PATTERN se fue por algo mas serio. En un telefono Android el mapa salia
 * roto en bandas horizontales con el contenido repetido y desplazado, desde el
 * primer fotograma y sin tocarlo. Un <pattern> es el UNICO elemento del mapa
 * que se dibuja repitiendo una baldosa, y "contenido repetido en baldosas" es
 * exactamente la forma que tenia el fallo. La rejilla pasa a ser un fondo de
 * CSS en el contenedor: dos degradados repetidos, que el navegador compone sin
 * rasterizar ninguna textura intermedia.
 */
function DefsGrafo() {
  return (
    <defs>
      {/* El brillo de las tarjetas: un degradado vertical de blanco a nada,
          compartido por las 494 materias del pensum. Se define una vez aqui y
          cada tarjeta lo referencia por url(), asi que no hay coste por
          tarjeta. Es lo que sustituye al contorno: una superficie con la luz
          cayendo por arriba se lee como una lamina delante del fondo. */}
      <linearGradient id="brillo-nodo" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.10" />
        <stop offset="52%" stopColor="#ffffff" stopOpacity="0.025" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>
    </defs>
  )
}

export default DefsGrafo
