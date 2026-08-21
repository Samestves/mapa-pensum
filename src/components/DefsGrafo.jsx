/**
 * Definiciones reutilizables del SVG: los filtros de glow.
 *
 * La rejilla del fondo vivia aqui como <pattern> y se mudo al fondo CSS del
 * contenedor, para poder meter la viñeta por encima de ella. Ver
 * .lienzo-profundo en index.css.
 *
 * Los filtros solo se aplican a lo que esta encendido (aristas vivas, cadena
 * resaltada, nodos aprobados). Ponerlos en los 49 nodos a la vez cuesta caro
 * en repintado y no aporta nada.
 */
function DefsGrafo() {
  return (
    <defs>
      {/* El glow toma el color de lo que ilumina: se difumina el propio trazo
          y se vuelve a pintar el original encima, nitido. */}
      <filter id="glow-suave" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="2.5" result="borroso" />
        <feMerge>
          <feMergeNode in="borroso" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

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
