import { CAJA, TRANSFORMA, ROSA, NODOS } from '../data/logoTrazos'

/**
 * La marca: la rosa de los vientos del logotipo, a un solo color.
 *
 * Va dibujada en SVG y no como <img> por una razon que no es de gusto: el
 * logotipo original es una estrella NEGRA, y el lienzo de esta aplicacion en
 * tema oscuro es casi negro tambien. Una imagen no se entera del tema y ahi
 * desapareceria. Dibujada, hereda currentColor y se invierte sola.
 *
 * Estuvo un rato con una elipse azul pintada por detras, que asomaba por el
 * hueco que el calco dejo donde iba la orbita. Funcionaba, pero metia un
 * segundo color y un segundo centro de atencion en una marca que a 48 px
 * solo tiene sitio para una idea. A un solo color el hueco de la orbita se
 * lee igual -es un vacio con forma, y se entiende-, y la marca aguanta
 * cualquier fondo sin repintar nada.
 */
function Logo({ className = 'size-10', animado = false }) {
  return (
    <svg
      viewBox={CAJA}
      className={`${className} ${animado ? 'logo-entrada' : ''}`}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <g transform={TRANSFORMA}>
        {ROSA.map((d, i) => (
          <path key={i} d={d} />
        ))}
        {NODOS.map((d, i) => (
          <path key={`n${i}`} d={d} />
        ))}
      </g>
    </svg>
  )
}

export default Logo
