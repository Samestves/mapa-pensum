import { NODO } from '../layout/constantes'

/* Lo que se le resta a `y` para que la linea base caiga en `y`: el alto del
   ::before de .texto-mapa en estilos/mapa.css. Tiene que ser mayor que lo que sube
   la letra mas grande del mapa por encima de su linea base (la cifra de 32 px
   de las cabeceras). */
const ALTO_SOBRE_BASE = 40

/* Como se ancla `x`, igual que el text-anchor de SVG. Los margenes en % de un
   elemento de rejilla se miden contra el ancho de su celda, que es el de su
   Grupo: con eso basta para anclar por el final o por el medio sin medir. */
const ANCLA = {
  inicio: (x) => ({ marginLeft: x }),
  medio: (x) => ({ justifySelf: 'center', marginLeft: `calc(${2 * x}px - 100%)` }),
  fin: (x) => ({ justifySelf: 'end', marginRight: `calc(100% - ${x}px)` }),
}

/**
 * Un texto del mapa, en HTML, colocado como se colocaba en el SVG: `x` e `y`
 * son el punto de su linea base, en coordenadas de su Grupo.
 *
 * Por que HTML y no un <text> de SVG. La capa del mapa cambia de escala en
 * cada cuadro de un zoom, y Chrome vuelve a maquetar el texto de un SVG cada
 * vez que cambia la escala a la que se ve en pantalla: con la rueda o el
 * trackpad, que en cada evento obligan al navegador a mirar que hay bajo el
 * puntero, eso eran trescientos textos maquetados y el plano entero
 * repintado en cada cuadro. Medido con la capa estirada y una prueba de
 * puntero por cuadro: 6,95 ms con texto SVG, 0,13 con el mismo texto en HTML.
 * El texto HTML se maqueta a su tamaño y la escala solo la aplica la GPU.
 *
 * Y sin posicionar nada. Un elemento con position absolute es una capa de
 * pintado para Chrome, y con setecientos textos el envio de cada cuadro al
 * compositor se iba a 115 ms. Todos los textos de un Grupo caen en la misma
 * celda de una rejilla y se corren con margenes, que no crean nada.
 *
 * La linea base se pone sin conocer la fuente: la caja es un flex alineado
 * por la linea base, con un primer hijo vacio de ALTO_SOBRE_BASE pixeles, y
 * la linea base de un hijo vacio es su borde de abajo. Asi que el texto se
 * apoya justo ahi, sea Jost, Plex Mono o la letra de respaldo mientras carga.
 */
export default function Texto({ x, y, ancla = 'inicio', className = '', style, children }) {
  return (
    <span
      className={`texto-mapa ${className}`}
      style={{ marginTop: y - ALTO_SOBRE_BASE, ...ANCLA[ancla](x), ...style }}
    >
      {children}
    </span>
  )
}

/**
 * Un grupo de textos colocado en (x, y) del mapa, con el ancho de una
 * tarjeta: la cara de una tarjeta o la cabecera de una columna. Sus Texto se
 * colocan respecto a el.
 */
export function GrupoTexto({ x, y, children }) {
  return (
    <div className="grupo-texto" style={{ marginLeft: x, marginTop: y, width: NODO.ancho }}>
      {children}
    </div>
  )
}
