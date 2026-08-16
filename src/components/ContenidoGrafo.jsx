import { memo } from 'react'
import { NODO, MARGEN } from '../layout/constantes'
import { ESTADO } from '../hooks/usePensum'
import NodoAsignatura from './NodoAsignatura'
import NodoElectiva from './NodoElectiva'
import NodoHueco from './NodoHueco'
import Arista from './Arista'

/**
 * Todo lo que va dentro del <g> que se desplaza y se acerca: cabeceras de
 * semestre, cables, nodos y la zona de electivas.
 *
 * Existe como componente aparte por una sola razon, y es de rendimiento.
 * El transform de pan y zoom vive en el <g> de fuera y cambia en cada
 * fotograma del arrastre. Con este contenido escrito dentro de GrafoPensum,
 * cada uno de esos fotogramas obligaba a React a recrear ciento treinta y un
 * elementos y a correr ciento treinta y una comparaciones de memo para
 * acabar cambiando un solo atributo. Medido: 15,2 ms por movimiento con
 * React contra 6,7 ms escribiendo el transform a mano.
 *
 * Aqui dentro nada depende de la vista, asi que al mover el mapa React
 * compara UNA prop, se sale, y el subarbol entero ni se toca.
 *
 * La consecuencia es que sus props tienen que mantener la identidad entre
 * renders. Las funciones vienen fijadas con useCallback desde arriba
 * -incluida `atenuado`, que se calcula en useFocoGrafo-. Si alguna volviera
 * a crearse en cada render, esto dejaria de servir en silencio y solo se
 * notaria en un telefono.
 */
function ContenidoGrafo({
  columnas,
  aristas,
  nodos,
  electivas,
  gruposElectivas,
  porCodigo,
  estados,
  descarga,
  toque,
  seleccionado,
  cadena,
  atenuado,
  ancho,
  alSenalar,
  alDejarDeSenalar,
  alVerFicha,
  alMarcar,
}) {
  return (
    <>
      {/* Encabezado de cada semestre: numero grande, conteo y una regla
          fina. Sin franja de fondo: ensuciaba mas de lo que ordenaba. */}
      {columnas.map((columna) => (
        <g key={columna.semestre}>
          {/* El numero se pinta dos veces: primero un trazo ancho y
              translucido que hace de halo, y encima el relleno nitido.
              paintOrder lo manda detras. Nada de filtros SVG. */}
          <text
            x={columna.x}
            y={MARGEN.top + 30}
            fontSize="38"
            fill="var(--tinta)"
            stroke="var(--halo-titulo)"
            strokeWidth="7"
            paintOrder="stroke"
            strokeLinejoin="round"
            className="font-mono font-extrabold"
          >
            {String(columna.semestre).padStart(2, '0')}
          </text>
          <text
            x={columna.x + 54}
            y={MARGEN.top + 17}
            fontSize="12"
            fill="var(--tinta)"
            stroke="var(--halo-titulo)"
            strokeWidth="4"
            paintOrder="stroke"
            strokeLinejoin="round"
            className="font-extrabold tracking-[0.2em]"
          >
            SEMESTRE
          </text>
          <text
            x={columna.x + 54}
            y={MARGEN.top + 31}
            fontSize="11"
            fill="var(--tinta-suave)"
            className="font-mono font-semibold"
          >
            {columna.cantidad} materias · {columna.uc} UC
          </text>
          <line
            x1={columna.x}
            y1={MARGEN.top + 42}
            x2={columna.x + NODO.ancho}
            y2={MARGEN.top + 42}
            stroke="var(--tinta-tenue)"
            strokeOpacity="0.35"
            strokeWidth="1"
          />
        </g>
      ))}

      {/* Los cables van debajo de las tarjetas, pero el ruteo garantiza
          que ninguno pasa por encima de un nodo. */}
      <g>
        {aristas.map((arista, i) => (
          <Arista
            key={arista.id}
            d={arista.d}
            x2={arista.x2}
            y2={arista.y2}
            area={arista.area}
            codigoOrigen={arista.origen}
            // Retardo y velocidad distintos por cable: sincronizados
            // todos se veria como un metronomo. Se calculan del indice,
            // asi que son estables y no reinician la animacion.
            retardo={(i % 7) * 0.55}
            velocidad={3.8 + (i % 5) * 0.35}
            viva={estados[arista.origen] === ESTADO.APROBADA}
            resaltada={cadena != null && cadena.has(arista.origen) && cadena.has(arista.destino)}
            atenuada={atenuado(arista.origen) || atenuado(arista.destino)}
            descargando={descarga?.codigo === arista.origen}
            claveDescarga={descarga?.n}
          />
        ))}
      </g>

      {/* Los huecos de electiva no son materias: ni estado, ni marca, ni
          ficha. Se dibujan aparte para no meter ese caso dentro del nodo
          normal, que ya tiene cuatro estados que atender. */}
      {nodos
        .filter((nodo) => nodo.esHueco)
        .map((nodo) => (
          <NodoHueco key={nodo.codigo} nodo={nodo} atenuado={atenuado(nodo.codigo)} />
        ))}

      {nodos
        .filter((nodo) => !nodo.esHueco)
        .map((nodo) => (
          <NodoAsignatura
            key={nodo.codigo}
            nodo={nodo}
            estado={estados[nodo.codigo]}
            seleccionado={seleccionado === nodo.codigo}
            resaltado={cadena != null && cadena.has(nodo.codigo)}
            atenuado={atenuado(nodo.codigo)}
            destellando={
              descarga != null &&
              estados[nodo.codigo] === ESTADO.DISPONIBLE &&
              (nodo.prerrequisitos ?? []).includes(descarga.codigo)
            }
            claveDestello={descarga?.n}
            tocado={toque?.codigo === nodo.codigo}
            claveToque={toque?.n}
            alMarcar={alMarcar}
            alSenalar={alSenalar}
            alDejarDeSenalar={alDejarDeSenalar}
            alVerFicha={alVerFicha}
          />
        ))}

      {/* Zona de electivas, debajo de los 10 semestres */}
      {gruposElectivas.map((grupo) => (
        <g key={grupo.clave}>
          <line
            x1={MARGEN.left}
            y1={grupo.yTitulo + 4}
            x2={ancho - MARGEN.right}
            y2={grupo.yTitulo + 4}
            stroke="var(--tinta-tenue)"
            strokeOpacity="0.22"
            strokeWidth="1"
            strokeDasharray="2 8"
          />
          {/* Titulo y cuota son UN solo texto con dos tramos, no dos textos
              colocados cada uno por su cuenta.

              La cuota salia antes a 300 px del margen izquierdo, un numero
              que valia mientras el titulo fuese corto: "ELECTIVAS TECNICAS"
              acaba en 248 y cabia, pero "ELECTIVAS SOCIOHUMANISTICAS" acaba
              en 358 y se le montaba encima diez pixeles. Cualquier otro
              numero fijo solo mueve el titulo a partir del cual vuelve a
              romperse.

              Con dos tspan y un dx, el segundo tramo arranca donde acaba el
              primero: lo coloca el propio SVG y la separacion es la misma
              diga lo que diga el titulo, sin medir texto ni llevar refs.

              Anclarla al extremo derecho tambien evitaba el choque, pero era
              peor: a la escala en que el mapa entra entero, once pixeles y
              medio se dibujan a poco mas de cuatro y no se leen, asi que la
              cuota solo se lee acercandose -y acercandose, el otro extremo de
              la franja cae a tres mil pixeles del titulo-. Se leeria "elige
              15 UC de 25 opciones" sin ver de que grupo. Juntas o no sirve.

              El halo va en el padre y lo heredan los dos: ambos se leen sobre
              la cuadricula del fondo y sobre la linea de puntos. */}
          <text
            x={MARGEN.left}
            y={grupo.yTitulo + 34}
            stroke="var(--halo-titulo)"
            strokeWidth="4"
            paintOrder="stroke"
            strokeLinejoin="round"
          >
            <tspan
              fontSize="15"
              fill="var(--tinta)"
              className="font-extrabold tracking-[0.16em]"
            >
              {grupo.titulo}
            </tspan>
            {/* La cuota sale del pensum, no del componente. Donde no la hay
                se dice cuantas opciones existen y nada mas. */}
            <tspan
              dx="18"
              fontSize="11.5"
              fill="var(--tinta-suave)"
              className="font-mono font-semibold tabular-nums"
            >
              {grupo.cuota != null
                ? `elige ${grupo.cuota} UC de ${grupo.cantidad} opciones`
                : `${grupo.cantidad} opciones`}
            </tspan>
          </text>
        </g>
      ))}

      {electivas.map((nodo) => (
        <NodoElectiva
          key={nodo.codigo}
          nodo={nodo}
          estado={estados[nodo.codigo]}
          // Primer requisito pendiente, para decirlo en la tarjeta
          requisito={
            (nodo.prerrequisitos ?? [])
              .filter((p) => estados[p] !== ESTADO.APROBADA)
              .map((p) => porCodigo.get(p)?.nombre ?? p)[0]
          }
          seleccionado={seleccionado === nodo.codigo}
          resaltado={cadena != null && cadena.has(nodo.codigo)}
          atenuado={atenuado(nodo.codigo)}
          alSenalar={alSenalar}
          alDejarDeSenalar={alDejarDeSenalar}
          alHacerClick={alVerFicha}
        />
      ))}
    </>
  )
}

export default memo(ContenidoGrafo)
