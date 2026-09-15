/**
 * Definiciones reutilizables del SVG: la rejilla de fondo y el filo de las
 * materias que puedes inscribir.
 *
 * El filo es el borde de la casa: la luz que en la cajita del logo y en el
 * aviso de instalar se enciende arriba a la izquierda, se apaga por el medio y
 * vuelve floja abajo a la derecha. Aqui va quieto -la luz que da la vuelta es
 * aparte, en CaraTarjeta- y en objectBoundingBox, que en un rectangulo es
 * seguro: una tarjeta nunca tiene alto cero.
 *
 * Sustituye al degradado de tinta, azul y verde que giraba. Se veia como un
 * efecto puesto encima, de otro lenguaje que el resto de la aplicacion.
 */
function DefsGrafo() {
  return (
    <defs>
      <pattern id="rejilla" width="34" height="34" patternUnits="userSpaceOnUse">
        <path d="M34 0H0V34" fill="none" stroke="var(--rejilla)" strokeWidth="1" />
      </pattern>

      <linearGradient id="filo-inscribible" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" style={{ stopColor: 'var(--sit-inscribible-luz)', stopOpacity: 0.9 }} />
        <stop offset="0.32" style={{ stopColor: 'var(--sit-inscribible-luz)', stopOpacity: 0.16 }} />
        <stop offset="0.58" style={{ stopColor: 'var(--sit-inscribible-luz)', stopOpacity: 0 }} />
        <stop offset="1" style={{ stopColor: 'var(--sit-inscribible-luz)', stopOpacity: 0.24 }} />
      </linearGradient>
    </defs>
  )
}

export default DefsGrafo
