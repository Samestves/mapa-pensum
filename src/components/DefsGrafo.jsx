/**
 * Definiciones reutilizables del SVG: la rejilla de fondo.
 *
 * Aqui vivio tambien el filo con degradado de las materias disponibles. Se
 * fue con la tarjeta nueva: ahora la disponible es la de borde mas claro, sin
 * luz puesta encima. Ver CaraTarjeta.
 */
function DefsGrafo() {
  return (
    <defs>
      <pattern id="rejilla" width="34" height="34" patternUnits="userSpaceOnUse">
        <path d="M34 0H0V34" fill="none" stroke="var(--rejilla)" strokeWidth="1" />
      </pattern>
    </defs>
  )
}

export default DefsGrafo
