/**
 * Las piezas con las que se arma cada pestaña del panel: el widget del bento
 * y lo poco que se repite alrededor. Las graficas viven en graficas.jsx.
 */

/**
 * Una pieza del bento: su titulo con icono y, a la derecha, lo que haga falta
 * -una nota, un selector-. El tamaño en la rejilla lo dice `className` (ver
 * ocupa-2, ocupa-3, ocupa-4, ocupa-6 y alto en estilos/panel.css).
 */
export function Widget({ icono: Icono, titulo, extra, className = '', children, ...resto }) {
  return (
    <section className={`widget ${className}`} {...resto}>
      {titulo && (
        <h2 className="widget-titulo">
          {Icono && <Icono size={16} strokeWidth={1.8} aria-hidden="true" />}
          {titulo}
          {extra && <span className="extra">{extra}</span>}
        </h2>
      )}
      {children}
    </section>
  )
}

/** Una caja simple, para texto: la guia y los avisos de vacio */
export const Tarjeta = ({ children, className = '' }) => (
  <div className={`widget ${className}`}>{children}</div>
)

export const Vacio = ({ children }) => (
  <Tarjeta>
    <p className="text-[13px] leading-relaxed text-tinta-tenue">{children}</p>
  </Tarjeta>
)

/** Un bloque gris que late mientras llega lo de verdad */
export const Hueco = ({ alto = 120, className = '' }) => (
  <div className={`widget animate-pulse ${className}`} style={{ height: alto }} />
)

/** Una fila de botones de los que se elige uno, como el selector de iOS */
export function Segmentos({ opciones, valor, alCambiar, etiqueta }) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="medidas">
      {opciones.map(([clave, nombre]) => (
        <button
          key={clave}
          type="button"
          role="radio"
          aria-checked={valor === clave}
          onClick={() => alCambiar(clave)}
        >
          {nombre}
        </button>
      ))}
    </div>
  )
}
