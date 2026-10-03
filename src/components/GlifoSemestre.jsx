/**
 * El dibujo de una casilla de marcar, en un cuadro de 14: la caja, la raya
 * de "a medias" y el check. Los tres estan siempre; cual se ve lo decide el
 * CSS de .casilla-semestre segun su data-marca, asi que cambiar de estado
 * es cambiar colores y no un nodo que entra o sale.
 *
 * Lo usan la cabecera de semestre del mapa (dentro de su SVG) y la de la
 * lista (en su propio <svg>).
 */
export default function GlifoCasilla() {
  return (
    <>
      <rect width={14} height={14} rx={4} className="caja" />
      <path d="M4 7h6" className="raya" />
      <path d="M3.7 7.3 6.1 9.6 10.5 4.8" className="tilde" />
    </>
  )
}
