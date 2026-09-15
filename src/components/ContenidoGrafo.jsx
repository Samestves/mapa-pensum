import { memo, useMemo } from 'react'
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

/* Ancho estimado de un texto en Inter, para colocar lo que va a su lado. Es
   la misma idea que el reparto de nombres en tarjetas: medir en el DOM ataria
   la posicion al momento de montar. */
const anchoTexto = (texto, tamano) => texto.length * tamano * 0.58

/* La rejilla de la ficha, en un solo sitio. Todo lo de dentro se coloca
   contra estos cuatro numeros y nada contra el ancho de otro texto, que es
   lo que antes hacia que cada columna quedara distinta. */
const FICHA = {
  alto: 68,
  pad: 14,
  linea1: 28, // base del titulo
  linea2: 47, // base de los datos
  barra: 56, // arriba de la barra de avance
}

/**
 * Cabecera de un semestre: una ficha del ancho de las tarjetas.
 *
 *   ╭────────────────────────────────────╮
 *   │ SEMESTRE 04                   5/7  │   titulo        avance
 *   │ 18 UC · 7 materias        ◐ 1  ◉ 2 │   datos         estados
 *   │ ━━━━━━━━━━━━━━━━━━━━━━────────────  │   barra
 *   ╰────────────────────────────────────╯
 *
 * Tres reglas, y las tres corrigen algo que estaba mal:
 *
 * DOS TAMAÑOS, NO CUATRO. Titulo a 20 y todo lo demas a 11,5. Estuvo con la
 * palabra a 17 y el numero a 38: el numero doblaba a la palabra y parecian dos
 * titulares distintos pegados. Ahora "SEMESTRE" y "04" miden lo mismo y se
 * distinguen por peso y tinta, que es como se lee un nombre propio: una sola
 * cosa.
 *
 * CADA DATO EN SU ESQUINA. Izquierda, lo que el semestre ES -numero, UC,
 * materias-. Derecha, como VAS en el -avance y estados-. Los estados se
 * alinean contra el borde derecho y no a continuacion del texto: antes
 * empezaban donde acabara "7 materias · 18 UC", y como ese texto mide
 * distinto en cada columna, los iconos bailaban de una a otra.
 *
 * CONTENIDA. Una ficha con el mismo radio que las tarjetas, apenas marcada.
 * Sin ella las piezas flotaban sueltas sobre el lienzo; con ella la cabecera
 * es la tapa de la columna.
 */
function CabeceraSemestre({ columna, datos }) {
  const { x, semestre } = columna
  const y = MARGEN.top
  const ancho = NODO.ancho
  const izq = x + FICHA.pad
  const der = x + ancho - FICHA.pad

  const total = datos?.segmentos.length ?? 0
  const cuenta = datos?.cuenta ?? {}
  const hechas = cuenta[SITUACION.HECHA] ?? 0
  const cursando = cuenta[SITUACION.CURSANDO] ?? 0
  const completo = total > 0 && hechas === total

  const util = der - izq
  const anchoHechas = total ? (util * hechas) / total : 0
  const anchoCursando = total ? (util * cursando) / total : 0
  const crecer = 'width 600ms cubic-bezier(0.32, 0.72, 0, 1), x 600ms cubic-bezier(0.32, 0.72, 0, 1)'

  /* Estados, colocados de derecha a izquierda contra el borde. Solo los que
     tienen alguna materia: un "◉ 0" seria ruido. */
  const estados = []
  let hasta = der
  for (const situacion of [SITUACION.INSCRIBIBLE, SITUACION.CURSANDO]) {
    const n = cuenta[situacion] ?? 0
    if (!n) continue
    const anchoNumero = anchoTexto(String(n), 11.5)
    const inicio = hasta - anchoNumero - 16
    estados.push({ situacion, n, x: inicio })
    hasta = inicio - 10
  }

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={ancho}
        height={FICHA.alto}
        rx={NODO.radio}
        style={{ fill: 'var(--cabecera-fondo)', stroke: 'var(--cabecera-borde)' }}
      />

      <text x={izq} y={y + FICHA.linea1} fontSize="20" className="tabular-nums">
        <tspan fill="var(--tinta-suave)" className="font-semibold tracking-[0.06em]">
          SEMESTRE
        </tspan>
        <tspan dx="6" fill="var(--tinta)" className="font-bold">
          {String(semestre).padStart(2, '0')}
        </tspan>
      </text>

      {completo ? (
        <g transform={`translate(${der - 14}, ${y + FICHA.linea1 - 12})`}>
          <FormaSituacion situacion={SITUACION.HECHA} color="var(--estado-aprobada)" />
        </g>
      ) : (
        <text
          x={der}
          y={y + FICHA.linea1 - 1}
          textAnchor="end"
          fontSize="13"
          className="font-semibold tabular-nums"
        >
          <tspan fill="var(--tinta)">{hechas}</tspan>
          <tspan fill="var(--tinta-tenue)">/{total}</tspan>
        </text>
      )}

      <text
        x={izq}
        y={y + FICHA.linea2}
        fontSize="11.5"
        fill="var(--tinta-tenue)"
        className="font-medium tabular-nums"
      >
        {datos?.uc ?? 0} UC
        <tspan dx="4" fillOpacity={0.55}>
          ·
        </tspan>
        <tspan dx="4">
          {total} {total === 1 ? 'materia' : 'materias'}
        </tspan>
      </text>

      {estados.map((e) => {
        const a = ASPECTO[e.situacion]
        return (
          <g key={e.situacion}>
            <g transform={`translate(${e.x}, ${y + FICHA.linea2 - 10}) scale(0.86)`}>
              <FormaSituacion situacion={e.situacion} color={a.marca.color} />
            </g>
            <text
              x={e.x + 16}
              y={y + FICHA.linea2}
              fontSize="11.5"
              className="font-semibold tabular-nums"
              style={{ fill: a.marca.color }}
            >
              {e.n}
            </text>
          </g>
        )
      })}

      {/* Barra de avance: riel, tramo aprobado y a continuacion lo que cursas.
          Crece con transicion al aprobar en vez de saltar. */}
      <rect
        x={izq}
        y={y + FICHA.barra}
        width={util}
        height={3}
        rx={1.5}
        fill="var(--tinta)"
        fillOpacity={0.1}
      />
      <rect
        y={y + FICHA.barra}
        height={3}
        rx={1.5}
        style={{ x: izq, width: anchoHechas, fill: 'var(--estado-aprobada)', transition: crecer }}
      />
      <rect
        y={y + FICHA.barra}
        height={3}
        rx={1.5}
        style={{
          x: izq + anchoHechas,
          width: anchoCursando,
          fill: 'var(--estado-cursando)',
          transition: crecer,
        }}
      />
    </g>
  )
}

export default memo(ContenidoGrafo)
