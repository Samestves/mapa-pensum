import { memo, useMemo } from 'react'
import { BookOpen } from 'lucide-react'
import { NODO, MARGEN } from '../layout/constantes'
import { ESTADO } from '../data/estados'
import { SITUACION, tramoDe } from '../layout/situacion'
import NodoAsignatura from './NodoAsignatura'
import NodoElectiva from './NodoElectiva'
import NodoHueco from './NodoHueco'
import Arista from './Arista'
import { FormaSituacion } from './IconoSituacion'
import { ASPECTO } from '../theme/situacion'

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
  foco,
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
     situacion por materia en el orden en que estan dibujadas y cuantas hay de
     cada una, que es de donde sale su linea de progreso.

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
        {aristas.map((arista, i) => (
          <Arista
            key={arista.id}
            id={arista.id}
            d={arista.d}
            x1={arista.x1}
            y1={arista.y1}
            x2={arista.x2}
            y2={arista.y2}
            area={arista.area}
            codigoOrigen={arista.origen}
            areaDestino={porCodigo.get(arista.destino)?.area}
            codigoDestino={arista.destino}
            tramo={tramoDe(situaciones.get(arista.origen), situaciones.get(arista.destino))}
            /* Retraso negativo y estable, sacado del indice: cada luz de la
               frontera nace ya a mitad de su viaje y a un punto distinto que
               las demas. Todas a la vez se verian como un metronomo. */
            retraso={`-${((i * 7) % 11) * 0.26}s`}
            // Y cada una a su paso, entre 2,6 y 3,2 s: iguales se verian en fila
            duracion={`${(2.6 + ((i * 5) % 7) * 0.1).toFixed(1)}s`}
            foco={foco}
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

/* Estimacion del ancho de un texto a 11,5 px en Inter, para colocar lo que
   va detras de el. Es la misma idea que el reparto de nombres en tarjetas:
   medir en el DOM ataria la posicion al momento de montar. */
const anchoTexto = (texto, tamano) => texto.length * tamano * 0.55

/**
 * Cabecera de un semestre.
 *
 *   SEMESTRE 05                                ◔
 *   📖 7 materias · 17 UC          ◐ 1   ◉ 2
 *   ─────────────────────────────────────────────
 *
 * Dos lineas con trabajos distintos. La de arriba es el titulo: la palabra y
 * el numero grandes, que se lean de lejos, y a la derecha un anillo que se va
 * cerrando en verde con lo aprobado y en ambar con lo que cursas, con la
 * fraccion dentro. El anillo sustituye al riel plano: dice lo mismo en menos
 * sitio, y un circulo que se cierra se entiende como "completar" sin leer
 * ningun numero.
 *
 * La de abajo es de consulta, pequeña y apagada: cuantas materias y cuantas
 * UC pesa el semestre, y con los mismos iconos de estado de las tarjetas,
 * cuantas cursas y cuantas puedes inscribir. Solo aparecen los estados que
 * tienen algo; un "◉ 0" seria ruido.
 *
 * El numero va con dos cifras y tabulares para que las diez cabeceras queden
 * alineadas, y la palabra en versalitas espaciadas: con el mismo cuerpo que el
 * numero competiria con el, y en caja baja parecia un rotulo suelto.
 */
function CabeceraSemestre({ columna, datos }) {
  const { x, semestre } = columna
  const top = MARGEN.top
  const total = datos?.segmentos.length ?? 0
  const cuenta = datos?.cuenta ?? {}
  const hechas = cuenta[SITUACION.HECHA] ?? 0
  const cursando = cuenta[SITUACION.CURSANDO] ?? 0
  const inscribibles = cuenta[SITUACION.INSCRIBIBLE] ?? 0
  const completo = total > 0 && hechas === total

  // Anillo de avance, en porcentaje de su propio perimetro (pathLength 100)
  const R = 15
  const cx = x + NODO.ancho - R - 1
  const cy = top + 25
  const pctHechas = total ? (hechas / total) * 100 : 0
  const pctCursando = total ? (cursando / total) * 100 : 0
  const arco = 'stroke-dasharray 600ms cubic-bezier(0.32, 0.72, 0, 1), stroke-dashoffset 600ms cubic-bezier(0.32, 0.72, 0, 1)'

  const DATOS = top + 63
  const datosTexto = `${total} ${total === 1 ? 'materia' : 'materias'} · ${datos?.uc ?? 0} UC`
  let xEstado = x + 18 + anchoTexto(datosTexto, 11.5) + 14
  const estados = [
    { situacion: SITUACION.CURSANDO, n: cursando },
    { situacion: SITUACION.INSCRIBIBLE, n: inscribibles },
  ].filter((e) => e.n > 0)

  return (
    <g>
      <text x={x} y={top + 38} className="tabular-nums">
        <tspan fontSize="17" fill="var(--tinta-suave)" className="font-semibold tracking-[0.12em]">
          SEMESTRE
        </tspan>
        <tspan dx="8" fontSize="38" fill="var(--tinta)" className="font-bold tracking-[-0.03em]">
          {String(semestre).padStart(2, '0')}
        </tspan>
      </text>

      {/* El anillo: riel, tramo aprobado y tramo en curso a continuacion.
          Empieza arriba, como un reloj, y gira en el sentido de las agujas. */}
      <g transform={`rotate(-90 ${cx} ${cy})`}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--tinta)" strokeOpacity={0.1} strokeWidth={3} />
        <circle
          cx={cx}
          cy={cy}
          r={R}
          fill="none"
          pathLength="100"
          strokeLinecap="round"
          strokeWidth={3}
          style={{
            stroke: 'var(--estado-aprobada)',
            strokeDasharray: `${pctHechas} 100`,
            opacity: pctHechas > 0 ? 1 : 0,
            transition: arco,
          }}
        />
        <circle
          cx={cx}
          cy={cy}
          r={R}
          fill="none"
          pathLength="100"
          strokeLinecap="round"
          strokeWidth={3}
          style={{
            stroke: 'var(--estado-cursando)',
            strokeDasharray: `${pctCursando} 100`,
            strokeDashoffset: -pctHechas,
            opacity: pctCursando > 0 ? 1 : 0,
            transition: arco,
          }}
        />
      </g>
      {completo ? (
        <path
          d={`M${cx - 5} ${cy} l3.4 3.4 L${cx + 5.5} ${cy - 4}`}
          fill="none"
          stroke="var(--estado-aprobada)"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <text
          x={cx}
          y={cy + 3.5}
          textAnchor="middle"
          fontSize="9.5"
          fill="var(--tinta-suave)"
          className="font-semibold tabular-nums"
        >
          {hechas}/{total}
        </text>
      )}

      {/* Linea de datos */}
      <BookOpen
        x={x}
        y={DATOS - 10.5}
        width={13}
        height={13}
        color="var(--tinta-tenue)"
        strokeWidth={2}
        aria-hidden="true"
      />
      <text x={x + 18} y={DATOS} fontSize="11.5" fill="var(--tinta-tenue)" className="font-medium tabular-nums">
        {datosTexto}
      </text>
      {estados.map((e) => {
        const a = ASPECTO[e.situacion]
        const xi = xEstado
        xEstado += 18 + anchoTexto(String(e.n), 11.5) + 12
        return (
          <g key={e.situacion}>
            <g transform={`translate(${xi}, ${DATOS - 10.5}) scale(0.93)`}>
              <FormaSituacion situacion={e.situacion} color={a.marca.color} />
            </g>
            <text
              x={xi + 17}
              y={DATOS}
              fontSize="11.5"
              className="font-semibold tabular-nums"
              style={{ fill: a.marca.color }}
            >
              {e.n}
            </text>
          </g>
        )
      })}

      <line
        x1={x}
        x2={x + NODO.ancho}
        y1={top + 76}
        y2={top + 76}
        stroke="var(--tinta)"
        strokeOpacity={0.08}
      />
    </g>
  )
}

export default memo(ContenidoGrafo)
