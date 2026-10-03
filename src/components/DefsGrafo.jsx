/**
 * Definiciones reutilizables del SVG: la rejilla de fondo.
 *
 * Los iconos de estado NO van aqui como <symbol>. Se probo: un <use> por
 * tarjeta trae su propio recorte y su propia transformacion, y eso partia el
 * pintado del mapa en el triple de trozos. Ver IconoSituacion.
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
