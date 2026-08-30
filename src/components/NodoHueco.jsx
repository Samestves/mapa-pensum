import { memo } from 'react'
import { Plus } from 'lucide-react'
import { NODO, TEXTO } from '../layout/constantes'
import { ESTADO } from '../data/estados'
import { colorNodo } from '../theme/areas'
import { pielDe } from '../theme/superficie'
import { iconoDeMateria } from '../theme/iconosMateria'
import CaraNodo from './CaraNodo'
import { codigoVisible } from '../data/codigoVisible'

/**
 * La casilla de electiva: el sitio que el pensum reserva para una materia que
 * eliges tu.
 *
 * El diagrama oficial de la UDO no deja las electivas en una lista al final.
 * Les reserva hueco dentro de semestres concretos -en Sistemas, tres
 * sociohumanisticas en el 2, 3 y 4, y cinco tecnicas en el 7, 8 y 9-, porque
 * esa es la ruta que la universidad considera optima. Un mapa que las amontona
 * todas abajo pierde ese dato, que es de los pocos que el estudiante no puede
 * deducir por su cuenta.
 *
 * Tiene dos estados, y son dos cosas distintas de leer:
 *
 *   VACIA   un sitio que te falta por decidir. Borde discontinuo, un mas bien
 *           visible y el nombre del grupo. Invita a pulsar.
 *   LLENA   la electiva que pusiste, dibujada como cualquier otra materia:
 *           codigo, nombre, UC y estado. Deja de ser un hueco.
 *
 * Que la llena se parezca a una tarjeta normal es el punto. Una vez elegida,
 * esa materia ES tu pensum: se aprueba, cuenta UC y se cursa igual que las
 * obligatorias, asi que dibujarla distinta la dejaria en un limbo visual que
 * no corresponde a nada real.
 */
function NodoHueco({
  nodo,
  electiva,
  estado,
  resaltado,
  atenuado,
  seleccionado,
  alAbrir,
  alVerFicha,
}) {
  const { x, y, nombre } = nodo
  const vacia = electiva == null

  const acento = electiva ? colorNodo(electiva) : 'var(--tinta-tenue)'
  const piel = pielDe(estado)
  const Icono = electiva ? (piel.sello ?? iconoDeMateria(electiva.nombre)) : null
  const bloqueada = estado === ESTADO.BLOQUEADA

  const primeraLinea = TEXTO.arribaNombre

  return (
    <g
      transform={`translate(${x}, ${y})`}
      /* Vacia lleva a elegir; llena lleva a la ficha de esa materia.
         Que una casilla llena volviera a abrir la lista era un fallo de
         concepto: una vez elegida, ahi hay una MATERIA, y lo que se espera al
         pulsar una materia en este mapa es su ficha, con sus prelaciones y
         los botones de aprobada y cursando. Cambiar la eleccion pasa a ser
         una accion dentro de esa ficha, que es donde se busca cuando ya
         estas mirando la materia que quieres cambiar. */
      onClick={() => (electiva ? alVerFicha(electiva.codigo) : alAbrir(nodo.codigo))}
      className="grupo-casilla cursor-pointer"
      opacity={atenuado ? 0.14 : 1}
      style={{ transition: 'opacity 320ms cubic-bezier(0.32, 0.72, 0, 1)' }}
    >
      <title>
        {vacia
          ? `${nombre} — casilla libre: pulsa para elegir una`
          : `${codigoVisible(electiva)} — ${electiva.nombre} · ${electiva.uc} UC · ${estado}`}
      </title>

      {/* La casilla vacia se hunde en vez de rodearse de rayas.

          El borde discontinuo era lo que peor envejecia del mapa: hasta ocho
          casillas por carrera, y ocho rectangulos a rayas en la misma pantalla
          se leen como un patron de fondo, no como ocho huecos. Ademas, por
          debajo del 50 % de zoom los guiones se juntan y el borde parece una
          linea entera mal pintada.

          Vacia usa la piel de bloqueada -que es lo que es, un sitio donde
          todavia no puedes hacer nada- y en cuanto tiene materia pasa a la de
          esa materia, como cualquier otra tarjeta. */}
      <CaraNodo
        alto={NODO.alto}
        piel={piel}
        resaltado={!vacia && resaltado}
        seleccionado={seleccionado}
      />

      {vacia ? (
        <>
          {/* El mas, dentro de un cuadrado redondeado y centrado.
              Cuadrado y no circulo porque es lo que significa "agregar" en
              cualquier interfaz moderna -el boton de nueva pestaña, de nuevo
              archivo, de nuevo bloque-, mientras que un circulo con un mas
              se lee mas como un boton flotante de accion principal, que esto
              no es: es un sitio del mapa, no un boton de la barra.

              Va a 30 px porque tiene que seguir leyendose cuando el mapa se
              aleja: a la escala en la que cabe una carrera entera esto se
              dibuja a unos diez pixeles, que es el minimo en el que un mas
              sigue siendo un mas y no un punto. */}
          <rect
            className="marco-mas"
            x={NODO.ancho / 2 - 15}
            y={21}
            width={30}
            height={30}
            rx={9}
            fill="var(--tinta)"
            fillOpacity={0.1}
          />
          <Plus
            x={NODO.ancho / 2 - 8}
            y={28}
            width={16}
            height={16}
            color="var(--tinta-suave)"
            strokeWidth={2.2}
            aria-hidden="true"
          />

          {/* Y debajo, lo unico que hay que saber: QUE va aqui.
              Antes decia ademas "elige una", y sobraba: el borde discontinuo
              ya dice que esta vacio y el mas ya dice que se agrega algo.
              Tres elementos diciendo lo mismo dejan la tarjeta cargada sin
              añadir un dato. */}
          <text
            x={NODO.ancho / 2}
            y={71}
            textAnchor="middle"
            fontSize={TEXTO.nombre}
            fill="var(--tinta-suave)"
            className="font-semibold"
          >
            {nombre}
          </text>
        </>
      ) : (
        <>
          <rect
            x={NODO.barra.x}
            y={NODO.barra.y}
            width={NODO.barra.ancho}
            height={NODO.barra.alto}
            rx={NODO.barra.ancho / 2}
            fill={acento}
            fillOpacity={bloqueada ? 0.4 : 1}
          />

          <text
            x={NODO.padIzq}
            y={26}
            fontSize={TEXTO.meta}
            fill="var(--tinta)"
            fillOpacity={piel.dato}
            className="tabular-nums tracking-wide"
          >
            {codigoVisible(electiva)}
          </text>

          {electiva.lineasNombre.map((linea, i) => (
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
            className="font-mono"
          >
            {electiva.uc} UC
          </text>

          {Icono && (
            <Icono
              x={NODO.ancho - NODO.padDer - 15}
              y={13}
              width={15}
              height={15}
              color="var(--tinta)"
              opacity={piel.icono}
              strokeWidth={2}
            />
          )}
        </>
      )}
    </g>
  )
}

export default memo(NodoHueco)
