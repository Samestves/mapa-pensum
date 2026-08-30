/**
 * Definiciones reutilizables del SVG: rejilla de fondo y filtros de glow.
 *
 * Los filtros solo se aplican a lo que esta encendido (aristas vivas, cadena
 * resaltada, nodos aprobados). Ponerlos en los 49 nodos a la vez cuesta caro
 * en repintado y no aporta nada.
 */
function DefsGrafo() {
  return (
    <defs>
      <pattern id="rejilla" width="34" height="34" patternUnits="userSpaceOnUse">
        <path d="M34 0H0V34" fill="none" stroke="var(--rejilla)" strokeWidth="1" />
      </pattern>

      {/* El glow toma el color de lo que ilumina: se difumina el propio trazo
          y se vuelve a pintar el original encima, nitido. */}
      <filter id="glow-suave" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="2.5" result="borroso" />
        <feMerge>
          <feMergeNode in="borroso" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

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

      <filter id="glow-fuerte" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="5" result="borroso" />
        <feMerge>
          <feMergeNode in="borroso" />
          <feMergeNode in="borroso" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  )
}

export default DefsGrafo
