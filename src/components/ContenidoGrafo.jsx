import { memo, useMemo } from 'react'
import { NODO, MARGEN } from '../layout/constantes'
import { ESTADO } from '../data/estados'
import { SITUACION, tramoDe } from '../layout/situacion'
import { SEGMENTO } from '../theme/situacion'
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
 * elementos para acabar cambiando un solo atributo. Medido: 15,2 ms por
 * movimiento con React contra 6,7 ms escribiendo el transform a mano.
 *
 * La consecuencia es que sus props tienen que mantener la identidad entre
 * renders. Las funciones vienen fijadas con useCallback desde arriba
 * -incluida `atenuado`-. Si alguna volviera a crearse en cada render, esto
 * dejaria de servir en silencio y solo se notaria en un telefono.
 */
function ContenidoGrafo({
  situaciones,
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
  enCasilla,
  alAbrirCasilla,
  ancho,
  alSenalar,
  alDejarDeSenalar,
  alVerFicha,
  alMarcar,
}) {
  /* `situaciones` llega calculada desde GrafoPensum y baja a cada tarjeta como
     texto. Calcularla dentro de cada una obligaria a pasarles el mapa entero
     de estados, que cambia de identidad con cada marca, y todas se volverian
     a pintar al aprobar una sola.

     Lo que la cabecera de cada semestre necesita, de una pasada: sus UC, una
     situacion por materia en el orden en que estan dibujadas -eso es la barra
     segmentada- y los recuentos para la frase de estado.

     Las UC suman las electivas que hayas COLOCADO. La casilla cuenta como una
     materia del semestre, porque vas a cursar algo ahi; vacia aporta cero UC,
     que es lo honesto: todavia no lo has decidido. */
  const porColumna = useMemo(() => {
    const mapa = new Map()
    const ordenados = [...nodos].sort((a, b) => a.y - b.y)
    for (const nodo of ordenados) {
      if (!mapa.has(nodo.semestre)) {
        mapa.set(nodo.semestre, { uc: 0, segmentos: [], cuenta: {} })
      }
      const fila = mapa.get(nodo.semestre)
      const materia = nodo.esHueco ? enCasilla(nodo.codigo) : nodo
      const situacion = materia ? situaciones.get(materia.codigo) : SITUACION.LEJANA
      fila.segmentos.push(situacion)
      fila.cuenta[situacion] = (fila.cuenta[situacion] ?? 0) + 1
      if (materia) fila.uc += materia.uc ?? 0
    }
    return mapa
  }, [nodos, enCasilla, situaciones])

  return (
    <>
      {columnas.map((columna) => (
        <CabeceraSemestre
          key={columna.semestre}
          columna={columna}
          datos={porColumna.get(columna.semestre)}
        />
      ))}

      {/* Los cables van debajo de las tarjetas, pero el ruteo garantiza que
          ninguno pasa por encima de un nodo. */}
      <g>
        {aristas.map((arista) => (
          <Arista
            key={arista.id}
            d={arista.d}
            x2={arista.x2}
            y2={arista.y2}
            tramo={tramoDe(situaciones.get(arista.origen), situaciones.get(arista.destino))}
            resaltada={cadena != null && cadena.has(arista.origen) && cadena.has(arista.destino)}
            atenuada={atenuado(arista.origen) || atenuado(arista.destino)}
            descargando={descarga?.codigo === arista.origen}
            claveDescarga={descarga?.n}
          />
        ))}
      </g>

      {/* Los huecos de electiva se dibujan aparte para no meter ese caso dentro
          de la tarjeta normal. */}
      {nodos
        .filter((nodo) => nodo.esHueco)
        .map((nodo) => {
          const electiva = enCasilla(nodo.codigo)
          /* El foco y la seleccion preguntan por la ELECTIVA cuando la hay, y
             solo por la casilla cuando esta vacia. Una casilla llena dibuja
             una materia, y la cadena de prelaciones se calcula con el codigo
             real de esa materia: preguntando por el de la casilla, al pulsarla
             no coincidia nada y el mapa entero se apagaba. */
          const codigo = electiva?.codigo ?? nodo.codigo
          return (
            <NodoHueco
              key={nodo.codigo}
              nodo={nodo}
              electiva={electiva}
              situacion={electiva ? situaciones.get(electiva.codigo) : null}
              atenuado={atenuado(codigo)}
              seleccionado={seleccionado === codigo}
              alAbrir={alAbrirCasilla}
              alVerFicha={alVerFicha}
            />
          )
        })}

      {nodos
        .filter((nodo) => !nodo.esHueco)
        .map((nodo) => (
          <NodoAsignatura
            key={nodo.codigo}
            nodo={nodo}
            situacion={situaciones.get(nodo.codigo)}
            seleccionado={seleccionado === nodo.codigo}
            resaltado={cadena != null && cadena.has(nodo.codigo)}
            atenuado={atenuado(nodo.codigo)}
            destellando={
              descarga != null &&
              situaciones.get(nodo.codigo) === SITUACION.INSCRIBIBLE &&
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
            stroke="var(--tinta)"
            strokeOpacity="0.08"
            strokeWidth="1"
          />
          {/* Titulo y cuota son UN texto con dos tramos: el segundo arranca
              donde acaba el primero, diga lo que diga el titulo. Con la cuota
              a una x fija, "ELECTIVAS SOCIOHUMANISTICAS" se le montaba encima. */}
          <text x={MARGEN.left} y={grupo.yTitulo + 34}>
            <tspan fontSize="14" fill="var(--tinta)" className="font-semibold tracking-[0.14em]">
              {grupo.titulo}
            </tspan>
            <tspan
              dx="16"
              fontSize="11.5"
              fill="var(--tinta-tenue)"
              className="font-mono tabular-nums"
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
          situacion={situaciones.get(nodo.codigo)}
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

/**
 * Cabecera de un semestre. Tres lineas, cada una con un trabajo:
 *
 *   SEMESTRE              17 UC     que es y cuanto pesa
 *   05             2 por inscribir  el numero, y lo que te dice HOY
 *   ▰▰▰▰▱▱▱                         una materia, un segmento
 *
 * La barra sustituye a la regla que se iba llenando en proporcion. Una regla
 * al 40 % no dice si ese 40 % son materias aprobadas o en curso, ni si lo que
 * falta se puede inscribir ya o queda lejos. Un segmento por materia, pintado
 * con el mismo color que su tarjeta, lo dice todo sin leer nada: a la escala
 * del mapa entero en un telefono, donde ninguna letra se lee, se sigue viendo
 * que semestres estan hechos, cual esta en curso y donde esta tu frontera.
 *
 * La frase de la derecha dice solo la cosa mas urgente del semestre, en este
 * orden: si esta completo, si tienes algo en curso, si hay algo que inscribir
 * o si algo se abre el que viene. Si no hay nada de eso, calla.
 */
function CabeceraSemestre({ columna, datos }) {
  const { x, semestre } = columna
  const top = MARGEN.top
  const segmentos = datos?.segmentos ?? []
  const cuenta = datos?.cuenta ?? {}
  const total = segmentos.length

  const HUECO = 3
  const anchoSegmento = total ? (NODO.ancho - HUECO * (total - 1)) / total : NODO.ancho

  const estado =
    total > 0 && cuenta[SITUACION.HECHA] === total
      ? { texto: 'Completo', color: 'var(--estado-aprobada)' }
      : cuenta[SITUACION.CURSANDO]
        ? { texto: `${cuenta[SITUACION.CURSANDO]} en curso`, color: 'var(--estado-cursando)' }
        : cuenta[SITUACION.INSCRIBIBLE]
          ? { texto: `${cuenta[SITUACION.INSCRIBIBLE]} por inscribir`, color: 'var(--tinta)' }
          : cuenta[SITUACION.PROXIMA]
            ? { texto: `${cuenta[SITUACION.PROXIMA]} el próximo`, color: 'var(--tinta-suave)' }
            : cuenta[SITUACION.HECHA]
              ? { texto: `${cuenta[SITUACION.HECHA]} de ${total}`, color: 'var(--tinta-tenue)' }
              : null

  return (
    <g>
      <text
        x={x}
        y={top + 8}
        fontSize="9"
        fill="var(--tinta-tenue)"
        className="font-semibold tracking-[0.22em]"
      >
        SEMESTRE
      </text>
      <text
        x={x + NODO.ancho}
        y={top + 8}
        textAnchor="end"
        fontSize="10"
        fill="var(--tinta-tenue)"
        className="font-mono tabular-nums"
      >
        {datos?.uc ?? 0} UC
      </text>

      <text
        x={x - 1}
        y={top + 38}
        fontSize="30"
        fill="var(--tinta)"
        className="font-semibold tabular-nums tracking-[-0.04em]"
      >
        {String(semestre).padStart(2, '0')}
      </text>
      {estado && (
        <text
          x={x + NODO.ancho}
          y={top + 37}
          textAnchor="end"
          fontSize="11"
          className="font-semibold"
          style={{ fill: estado.color, transition: 'fill 240ms ease' }}
        >
          {estado.texto}
        </text>
      )}

      {segmentos.map((situacion, i) => {
        const s = SEGMENTO[situacion]
        return (
          <rect
            key={i}
            x={x + i * (anchoSegmento + HUECO)}
            y={top + 46}
            width={anchoSegmento}
            height={4}
            rx={2}
            style={{
              fill: s.color,
              fillOpacity: s.opacidad,
              transition: 'fill 240ms ease, fill-opacity 240ms ease',
            }}
          />
        )
      })}
    </g>
  )
}

export default memo(ContenidoGrafo)
