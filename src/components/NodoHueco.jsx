import { memo } from 'react'
import { Plus } from 'lucide-react'
import { NODO, TEXTO } from '../layout/constantes'
import { colorNodo } from '../theme/areas'
import { ETIQUETA_SITUACION } from '../theme/situacion'
import { codigoVisible } from '../data/codigoVisible'
import CaraTarjeta from './CaraTarjeta'

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
function NodoHueco({ nodo, electiva, situacion, atenuado, seleccionado, alAbrir, alVerFicha }) {
  const { x, y, nombre } = nodo
  const vacia = electiva == null
  const acento = 'var(--tinta-tenue)'

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
          : `${codigoVisible(electiva)} — ${electiva.nombre} · ${electiva.uc} UC · ${ETIQUETA_SITUACION[situacion]}`}
      </title>

      {vacia && (
        <>
          <rect width={NODO.ancho} height={NODO.alto} rx={NODO.radio} fill="var(--nodo)" />
          {/* El borde discontinuo es el unico del mapa que queda, y justo por
              eso significa algo: "aqui todavia no hay nada". Con guiones en
              las bloqueadas ademas, el mismo trazo decia dos cosas. */}
          <rect
            width={NODO.ancho}
            height={NODO.alto}
            rx={NODO.radio}
            fill="none"
            stroke="var(--tinta)"
            strokeOpacity={seleccionado ? 0.7 : 0.26}
            strokeWidth={seleccionado ? 2 : 1.25}
            strokeDasharray="6 5"
            strokeLinecap="round"
            style={{ transition: 'stroke-opacity 200ms ease' }}
          />
        </>
      )}

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
            rx={6}
            fill={acento}
            fillOpacity={0.08}
            stroke={acento}
            strokeOpacity={0.3}
            strokeWidth={1.25}
          />
          <Plus
            x={NODO.ancho / 2 - 8}
            y={28}
            width={16}
            height={16}
            color="var(--tinta-suave)"
            strokeWidth={1.6}
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
            style={{ fontWeight: 380 }}
          >
            {nombre}
          </text>
        </>
      ) : (
        <CaraTarjeta
          situacion={situacion}
          codigo={codigoVisible(electiva)}
          lineasNombre={electiva.lineasNombre}
          uc={electiva.uc}
          acento={colorNodo(electiva)}
          seleccionado={seleccionado}
        />
      )}
    </g>
  )
}

export default memo(NodoHueco)
