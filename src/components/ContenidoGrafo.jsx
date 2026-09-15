import { memo, useMemo } from 'react'
import { NODO, MARGEN, FRANJA } from '../layout/constantes'
import { SITUACION, tramoDe } from '../layout/situacion'
import NodoAsignatura from './NodoAsignatura'
import NodoHueco from './NodoHueco'
import Arista from './Arista'
import { FormaSituacion } from './IconoSituacion'
import { ASPECTO } from '../theme/situacion'

/**
 * Todo lo que va dentro del <g> que se desplaza y se acerca: cabeceras de
 * semestre, cables, nodos y la franja de electivas.
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
  casillasFranja,
  filasFranja,
  porCodigo,
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

      {/* Las casillas de electiva se dibujan aparte para no meter ese caso
          dentro de la tarjeta normal. Son las mismas en un semestre que en la
          franja: solo cambia donde estan. */}
      {[...nodos.filter((nodo) => nodo.esHueco), ...casillasFranja].map((nodo) => {
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

      {filasFranja.map((fila) => (
        <CabeceraFranja key={fila.clave} fila={fila} />
      ))}

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

      {filasFranja.length > 0 && (
        /* Una sola regla separa los semestres de la franja: lo de abajo no es
           un semestre mas, y la regla evita que sus casillas se lean como la
           fila siguiente de cada columna. */
        <line
          x1={MARGEN.left}
          x2={ancho - MARGEN.right}
          y1={filasFranja[0].y - FRANJA.corredor / 2}
          y2={filasFranja[0].y - FRANJA.corredor / 2}
          stroke="var(--tinta)"
          strokeOpacity="0.08"
          strokeWidth="1"
        />
      )}
    </>
  )
}

/**
 * Rotulo de un grupo de la franja, con el mismo tono de tablero que la
 * cabecera de semestre: nombre en mayusculas espaciadas y, debajo, cuantas
 * llevas puestas de cuantas hay. Sin riel de avance: sin cuota oficial no hay
 * un 100 % contra el que medir, y una barra que nunca se llena mentiria.
 */
function CabeceraFranja({ fila }) {
  const { x, y, titulo, opciones, elegidas, cuota } = fila
  const datos = [
    elegidas ? `${elegidas} EN TU MAPA` : 'ELIGE LAS TUYAS',
    `${opciones} ${opciones === 1 ? 'OPCIÓN' : 'OPCIONES'}`,
    cuota != null && `ELIGE ${cuota} UC`,
  ].filter(Boolean)

  return (
    <g>
      <text
        x={x}
        y={y + CABECERA.titulo}
        fontSize="12"
        fill="var(--tinta)"
        className="font-semibold"
        style={espaciado(0.24)}
      >
        {titulo.toUpperCase()}
      </text>
      <text
        x={x}
        y={y + CABECERA.datos}
        fontSize="10"
        fill="var(--tinta-tenue)"
        className="font-medium tabular-nums"
        style={espaciado(0.14)}
      >
        {datos.join(' · ')}
      </text>
    </g>
  )
}

/* Ancho estimado de un texto en Inter, para colocar lo que va a su lado. Es
   la misma idea que el reparto de nombres en tarjetas: medir en el DOM ataria
   la posicion al momento de montar. */
const anchoTexto = (texto, tamano) => texto.length * tamano * 0.58

/* La rejilla de la cabecera, en un solo sitio: todo se coloca contra estas
   lineas base y contra los dos bordes de la columna, nunca a continuacion de
   otro texto, que es lo que hacia que cada columna quedara distinta. */
const CABECERA = {
  titulo: 14, // SEMESTRE 04
  datos: 31, // 18 UC · 7 MATERIAS, y el porcentaje grande a la derecha
  barra: 44, // riel de avance
  pie: 64, // 5/7 APROBADAS y los estados
}

/* Mayusculas espaciadas: el recurso del tablero. Van en estilo y no en clase
   porque el tracking cambia con el cuerpo de cada linea. */
const espaciado = (em) => ({ letterSpacing: `${em}em` })

/**
 * Cabecera de un semestre, estilo tablero.
 *
 *   SEMESTRE 04                        71%
 *   18 UC · 7 MATERIAS
 *   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━───────────
 *   5/7 APROBADAS                   ◐ 1  ◉ 1
 *
 * El dato principal no es el numero del semestre sino cuanto llevas de el: por
 * eso el porcentaje es lo mas grande, y va en peso fino. Un numero grande en
 * negrita grita; grande y fino se lee como la cifra de un instrumento, que es
 * justo el tono de un tablero de coche.
 *
 * Las etiquetas van en mayusculas muy espaciadas y pequeñas. A 10-12 px una
 * palabra en caja baja se lee como texto corrido; espaciada y en versalitas se
 * lee como rotulo, y separa lo que es NOMBRE de lo que es CIFRA sin necesitar
 * colores ni cajas.
 *
 * Sin contenedor. La estructura la hacen la rejilla fija y el riel de avance,
 * que cruza la columna entera y parte la cabecera en lo que el semestre es
 * -arriba- y como vas en el -abajo-. Los estados se anclan al borde derecho,
 * asi que caen en el mismo sitio en las diez columnas.
 */
function CabeceraSemestre({ columna, datos }) {
  const { x, semestre } = columna
  const y = MARGEN.top
  const ancho = NODO.ancho
  const der = x + ancho

  const total = datos?.segmentos.length ?? 0
  const cuenta = datos?.cuenta ?? {}
  const hechas = cuenta[SITUACION.HECHA] ?? 0
  const cursando = cuenta[SITUACION.CURSANDO] ?? 0
  const completo = total > 0 && hechas === total
  const porcentaje = total ? Math.round((hechas / total) * 100) : 0

  const anchoHechas = total ? (ancho * hechas) / total : 0
  const anchoCursando = total ? (ancho * cursando) / total : 0
  const crecer = 'width 600ms cubic-bezier(0.32, 0.72, 0, 1), x 600ms cubic-bezier(0.32, 0.72, 0, 1)'

  /* Estados de derecha a izquierda contra el borde. Solo los que tienen
     alguna materia: un "◉ 0" seria ruido. */
  const estados = []
  let hasta = der
  for (const situacion of [SITUACION.INSCRIBIBLE, SITUACION.CURSANDO]) {
    const n = cuenta[situacion] ?? 0
    if (!n) continue
    const inicio = hasta - anchoTexto(String(n), 11) - 16
    estados.push({ situacion, n, x: inicio })
    hasta = inicio - 12
  }

  return (
    <g>
      <text
        x={x}
        y={y + CABECERA.titulo}
        fontSize="12"
        fill="var(--tinta)"
        className="font-semibold tabular-nums"
        style={espaciado(0.24)}
      >
        SEMESTRE {String(semestre).padStart(2, '0')}
      </text>

      <text
        x={x}
        y={y + CABECERA.datos}
        fontSize="10"
        fill="var(--tinta-tenue)"
        className="font-medium tabular-nums"
        style={espaciado(0.14)}
      >
        {datos?.uc ?? 0} UC · {total} {total === 1 ? 'MATERIA' : 'MATERIAS'}
      </text>

      {/* La cifra del instrumento. El % va mas pequeño y apagado: es la
          unidad, no el dato. */}
      <text
        x={der}
        y={y + CABECERA.datos}
        textAnchor="end"
        fontSize="30"
        className="font-light tabular-nums"
        style={{
          fill: completo ? 'var(--estado-aprobada)' : 'var(--tinta)',
          letterSpacing: '-0.03em',
          transition: 'fill 240ms ease',
        }}
      >
        {porcentaje}
        <tspan dx="1" fontSize="15" fill="var(--tinta-tenue)">
          %
        </tspan>
      </text>

      {/* Riel de avance a lo ancho de la columna: aprobado y, a continuacion,
          lo que cursas. Crece con transicion al aprobar en vez de saltar. */}
      <rect
        x={x}
        y={y + CABECERA.barra}
        width={ancho}
        height={2}
        fill="var(--tinta)"
        fillOpacity={0.1}
      />
      <rect
        y={y + CABECERA.barra}
        height={2}
        style={{ x, width: anchoHechas, fill: 'var(--estado-aprobada)', transition: crecer }}
      />
      <rect
        y={y + CABECERA.barra}
        height={2}
        style={{
          x: x + anchoHechas,
          width: anchoCursando,
          fill: 'var(--estado-cursando)',
          transition: crecer,
        }}
      />

      <text
        x={x}
        y={y + CABECERA.pie}
        fontSize="10"
        className="font-semibold tabular-nums"
        style={{
          ...espaciado(0.12),
          fill: completo ? 'var(--estado-aprobada)' : 'var(--tinta-tenue)',
        }}
      >
        {completo ? 'COMPLETO' : `${hechas}/${total} APROBADAS`}
      </text>

      {estados.map((e) => {
        const a = ASPECTO[e.situacion]
        return (
          <g key={e.situacion}>
            <g transform={`translate(${e.x}, ${y + CABECERA.pie - 10}) scale(0.86)`}>
              <FormaSituacion situacion={e.situacion} color={a.marca.color} />
            </g>
            <text
              x={e.x + 16}
              y={y + CABECERA.pie}
              fontSize="11"
              className="font-semibold tabular-nums"
              style={{ fill: a.marca.color }}
            >
              {e.n}
            </text>
          </g>
        )
      })}
    </g>
  )
}

export default memo(ContenidoGrafo)
