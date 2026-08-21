import { memo } from 'react'
import { NODO, TEXTO } from '../layout/constantes'
import { ESTADO } from '../data/estados'
import { colorNodo, etiquetaArea } from '../theme/areas'
import { ICONO_ESTADO, colorBordeEstado } from '../theme/estados'
import { codigoVisible } from '../data/codigoVisible'

/**
 * Los cuatro estados se distinguen por el RELLENO de la tarjeta y por nada
 * mas. No hay borde.
 *
 * Antes lo decian cinco cosas a la vez -borde de color, grosor de borde,
 * guiones, tinte y barra de area- y cinco señales para un solo dato no es
 * enfasis, es ruido: ninguna llegaba a leerse de lejos y el ojo tenia que
 * comparar tarjeta con tarjeta para saber cual podia inscribir.
 *
 * La idea es del arbol de habilidades de ARC Raiders, y lo que hace bien no
 * es no tener borde: es que ALLI EL COLOR SIGNIFICA POSESION. Lo que ya
 * tienes viene relleno; lo que no, oscuro. Una sola escala, se lee a un metro
 * de la pantalla. Aqui esa escala tiene cuatro peldaños y sube en el mismo
 * sentido: cuanto mas avanzada esta la materia, mas encendida esta la
 * tarjeta.
 *
 * `base` es lo que hunde a la bloqueada: no se apaga con un borde mas tenue,
 * se acerca al color del lienzo hasta quedarse casi dentro de el. Y `apagado`
 * baja la tarjeta entera.
 *
 * El 0,68 no es a ojo. Hundir y seguir siendo legible tiran en sentidos
 * opuestos, asi que se midio el contraste del nombre sobre su propia tarjeta
 * a varios valores: a 0,6 daba 4,40 en tema claro, por debajo del 4,5 que
 * pide la norma para texto normal, o sea que hundirla la habria dejado a
 * medio leer. A 0,68 da 5,69 en claro y 7,84 en oscuro. Bloqueada no es
 * inaccesible: es una materia que vas a cursar, solo que todavia no.
 */
const ESTILO = {
  [ESTADO.BLOQUEADA]: { base: 'var(--nodo-hundido)', tinte: 0, acento: 0.3, apagado: 0.68 },
  [ESTADO.DISPONIBLE]: { base: 'var(--nodo)', tinte: 0.09, acento: 1, apagado: 1 },
  [ESTADO.CURSANDO]: { base: 'var(--nodo)', tinte: 0.2, acento: 1, apagado: 1 },
  [ESTADO.APROBADA]: { base: 'var(--nodo)', tinte: 0.3, acento: 1, apagado: 1 },
}

function NodoAsignatura({
  nodo,
  estado,
  resaltado,
  atenuado,
  seleccionado,
  destellando,
  claveDestello,
  tocado,
  claveToque,
  alVerFicha,
  alSenalar,
  alDejarDeSenalar,
}) {
  const { x, y, nombre, uc, lineasNombre } = nodo
  const acento = colorNodo(nodo)
  const estilo = ESTILO[estado]

  const colorBorde = colorBordeEstado(estado, acento)
  const colorTinte =
    estado === ESTADO.CURSANDO ? 'var(--estado-cursando)' : 'var(--estado-aprobada)'

  const aprobada = estado === ESTADO.APROBADA
  const Icono = ICONO_ESTADO[estado]

  // El bloque de nombre se centra: 1, 2 o 3 lineas quedan siempre equilibradas
  const primeraLinea =
    TEXTO.centroNombre - ((lineasNombre.length - 1) * TEXTO.altoLinea) / 2

  return (
    <g
      transform={`translate(${x}, ${y})`}
      /* La bloqueada baja ENTERA -texto, candado y barra-, no solo su fondo.
         Bajar solo el fondo dejaba el nombre a tinta plena flotando sobre una
         tarjeta apagada, y el nombre es lo que mas pesa de lejos: la tarjeta
         seguia pidiendo la misma atencion que una que si puedes inscribir. */
      opacity={atenuado ? 0.14 : estilo.apagado}
      onClick={() => alVerFicha(nodo.codigo)}
      onPointerEnter={() => alSenalar(nodo.codigo)}
      onPointerLeave={alDejarDeSenalar}
      className={`grupo-nodo cursor-pointer ${seleccionado ? 'activo' : ''}`}
      style={{ transition: 'opacity 320ms cubic-bezier(0.32, 0.72, 0, 1)' }}
    >
      {/* Etiqueta accesible. El area solo existe donde esta clasificada */}
      <title>
        {[codigoVisible(nodo), '—', nombre, nodo.area && `· ${etiquetaArea(nodo.area)}`, `· ${estado}`]
          .filter(Boolean)
          .join(' ')}
      </title>

      <rect
        width={NODO.ancho}
        height={NODO.alto}
        rx={NODO.radio}
        fill={estilo.base}
        style={{ transition: 'fill 300ms ease' }}
      />

      <rect
        width={NODO.ancho}
        height={NODO.alto}
        rx={NODO.radio}
        fill={estado === ESTADO.DISPONIBLE ? acento : colorTinte}
        fillOpacity={estilo.tinte}
        className={estado === ESTADO.CURSANDO ? 'respirando' : undefined}
        style={{ transition: 'fill-opacity 300ms ease' }}
      />

      {destellando && (
        <rect
          key={claveDestello}
          width={NODO.ancho}
          height={NODO.alto}
          rx={NODO.radio}
          className="destello"
          fill={acento}
        />
      )}

      <rect
        width={NODO.ancho}
        height={NODO.alto}
        rx={NODO.radio}
        fill={acento}
        fillOpacity={resaltado && !seleccionado ? 0.08 : 0}
        style={{ transition: 'fill-opacity 180ms ease' }}
      />

      {/* Resplandor de las aprobadas, apilando trazos en vez de usar filtro */}
      <rect
        x="-3"
        y="-3"
        width={NODO.ancho + 6}
        height={NODO.alto + 6}
        rx={NODO.radio + 3}
        fill="none"
        stroke={colorBorde}
        strokeOpacity={aprobada ? 0.26 : 0}
        strokeWidth="5"
        style={{ transition: 'stroke-opacity 300ms ease' }}
      />

      {/* El unico trazo que queda, y solo en la tarjeta abierta. No es
          decoracion: es "esta es la que estas mirando", y sin el la ficha
          flotante apuntaria con su piquito a una tarjeta igual que las demas.
          Va en pixeles de pantalla, como los cables, para que siga marcando
          algo con la vista alejada. */}
      <rect
        width={NODO.ancho}
        height={NODO.alto}
        rx={NODO.radio}
        fill="none"
        stroke={colorBorde}
        strokeOpacity={seleccionado ? 0.95 : 0}
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
        style={{ transition: 'stroke-opacity 200ms ease' }}
      />

      {/* Anillo de confirmacion. Solo en la tarjeta que el usuario acaba de
          tocar: si se lanzara en cada cambio de estado derivado, aprobar una
          materia haria parpadear medio mapa. */}
      {tocado && (
        <rect
          key={claveToque}
          className="anillo-cambio"
          width={NODO.ancho}
          height={NODO.alto}
          rx={NODO.radio}
          fill="none"
          stroke={colorBorde}
        />
      )}

      {/* Barra de acento del area */}
      <rect
        x={NODO.barra.x}
        y={NODO.barra.y}
        width={NODO.barra.ancho}
        height={NODO.barra.alto}
        rx={NODO.barra.ancho / 2}
        fill={acento}
        fillOpacity={estilo.acento}
        style={{ transition: 'fill-opacity 300ms ease' }}
      />

      <text
        x={NODO.padIzq}
        y={26}
        fontSize={TEXTO.codigo}
        fill="var(--tinta-tenue)"
        className="tabular-nums tracking-wider"
      >
        {codigoVisible(nodo)}
      </text>

      {lineasNombre.map((linea, i) => (
        <text
          key={i}
          x={NODO.padIzq}
          y={primeraLinea + i * TEXTO.altoLinea}
          fontSize={TEXTO.nombre}
          fill="var(--tinta)"
          className="font-semibold"
        >
          {linea}
        </text>
      ))}

      <text
        x={NODO.padIzq}
        y={86}
        fontSize={TEXTO.meta}
        fill="var(--tinta-tenue)"
        className="tabular-nums"
      >
        {uc} UC
      </text>
      <text
        x={NODO.ancho - NODO.padDer}
        y={86}
        textAnchor="end"
        fontSize={TEXTO.meta}
        fill={acento}
        fillOpacity={estilo.acento}
        className="font-medium"
      >
        {nodo.area ? etiquetaArea(nodo.area) : ''}
      </text>

      {Icono && (
        <Icono
          x={NODO.ancho - NODO.padDer - 15}
          y={13}
          width={15}
          height={15}
          color={estado === ESTADO.BLOQUEADA ? 'var(--tinta-tenue)' : colorBorde}
          strokeWidth={2.6}
        />
      )}
    </g>
  )
}

/**
 * memo porque son hasta ciento siete de estos en pantalla y todos cuelgan de
 * un estado que vive arriba: sin el, señalar UNA materia repintaba el mapa
 * entero -medido: 413 mutaciones del DOM en 337 elementos por cada hover-.
 * Con el, solo se repintan los nodos cuyo resaltado o atenuacion cambian.
 *
 * Todas las props son valores simples menos las tres funciones, y esas vienen
 * fijadas con useCallback desde GrafoPensum. Si alguna volviera a crearse en
 * cada render, esto dejaria de servir en silencio.
 */
export default memo(NodoAsignatura)
