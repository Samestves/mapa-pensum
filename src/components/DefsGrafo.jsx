/**
 * Definiciones reutilizables del SVG. Solo queda la rejilla de fondo.
 *
 * Habia dos filtros de resplandor, glow-suave y glow-fuerte, y hacia tiempo
 * que nadie los usaba: el brillo de los cables se hacia apilando trazos,
 * porque un filtro con objectBoundingBox no pinta nada sobre una linea
 * perfectamente horizontal. Ahora ya no hay ni eso.
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
