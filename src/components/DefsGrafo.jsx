/* Se lee una vez al cargar el modulo. La animacion del brillo es SMIL y no
   CSS, asi que la regla prefers-reduced-motion del CSS no la alcanza: hay que
   decidir desde aqui si se dibuja. */
const sinMovimiento =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Definiciones reutilizables del SVG: la rejilla de fondo y el brillo de las
 * materias que puedes inscribir.
 *
 * El brillo es un degradado de tres tonos -tinta, el azul de sistemas y el
 * verde de aprobada- que gira despacio. Lo usan el borde y el halo de cada
 * tarjeta inscribible, y al vivir aqui una sola vez es UNA animacion para
 * todas: con ocho inscribibles no son ocho relojes, es uno que las mueve a la
 * vez.
 *
 * Gira en objectBoundingBox, o sea sobre la propia tarjeta, asi que el color
 * recorre el contorno en vez de desplazarse por el mapa. Da la sensacion de
 * que la tarjeta esta "viva" sin que nada se mueva de sitio.
 */
function DefsGrafo() {
  return (
    <defs>
      <pattern id="rejilla" width="34" height="34" patternUnits="userSpaceOnUse">
        <path d="M34 0H0V34" fill="none" stroke="var(--rejilla)" strokeWidth="1" />
      </pattern>

      <linearGradient id="brillo-inscribible" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" style={{ stopColor: 'var(--tinta)' }} />
        <stop offset="0.38" style={{ stopColor: 'var(--area-sistemas)' }} />
        <stop offset="0.68" style={{ stopColor: 'var(--estado-aprobada)' }} />
        <stop offset="1" style={{ stopColor: 'var(--tinta)' }} />
        {!sinMovimiento && (
          <animateTransform
            attributeName="gradientTransform"
            type="rotate"
            from="0 0.5 0.5"
            to="360 0.5 0.5"
            dur="6s"
            repeatCount="indefinite"
          />
        )}
      </linearGradient>
    </defs>
  )
}

export default DefsGrafo
