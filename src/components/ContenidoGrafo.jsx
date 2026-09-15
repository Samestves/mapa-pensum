import { memo, useMemo } from 'react'
import { NODO, MARGEN } from '../layout/constantes'
import { ESTADO } from '../data/estados'
import { SITUACION, tramoDe } from '../layout/situacion'
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

/**
 * Cabecera de un semestre.
 *
 *   05  Semestre · 17 UC            ●  3/7
 *   ━━━━━━━━━━━━━━━━───────────────────────
 *
 * Una linea de texto y una linea de progreso, y nada mas. Estuvo en tres
 * pisos -rotulo en versalitas, numero con frase de estado y una barra de un
 * segmento por materia- y cada piso decia un pedazo de lo mismo con su propia
 * tipografia. Siete segmentos con huecos se leian como puntos sueltos, no
 * como avance.
 *
 * La linea de progreso se llena de izquierda a derecha en el orden en que se
 * vive un semestre: primero lo aprobado en verde, luego lo que cursas en
 * ambar. Lo que queda es riel vacio. Al aprobar, el tramo verde crece con una
 * transicion en vez de saltar.
 *
 * Lo inscribible NO entra en la linea. Entro, en tinta, y un semestre sin
 * nada aprobado salia con la barra al setenta por ciento al lado de un "0/7":
 * se leia como avance y era todo lo contrario, trabajo pendiente.
 *
 * El punto de la derecha solo aparece si en ese semestre hay algo que puedes
 * inscribir, y es del mismo color que la luz de esas tarjetas: es la forma
 * de encontrar tu frontera sin acercarte a leer.
 */
function CabeceraSemestre({ columna, datos }) {
  const { x, semestre } = columna
  const top = MARGEN.top
  const total = datos?.segmentos.length ?? 0
  const cuenta = datos?.cuenta ?? {}
  const hechas = cuenta[SITUACION.HECHA] ?? 0
  const completo = total > 0 && hechas === total
  const hayInscribibles = (cuenta[SITUACION.INSCRIBIBLE] ?? 0) > 0

  const RIEL = top + 44
  const tramos = [
    { n: hechas, color: 'var(--estado-aprobada)', opacidad: 1 },
    { n: cuenta[SITUACION.CURSANDO] ?? 0, color: 'var(--estado-cursando)', opacidad: 1 },
  ]
  let desde = 0

  const suave = 'x 520ms cubic-bezier(0.32, 0.72, 0, 1), width 520ms cubic-bezier(0.32, 0.72, 0, 1)'

  return (
    <g>
      <text
        x={x - 1}
        y={top + 30}
        fontSize="24"
        fill="var(--tinta)"
        className="font-semibold tabular-nums tracking-[-0.03em]"
      >
        {String(semestre).padStart(2, '0')}
      </text>
      <text x={x + 36} y={top + 29} fontSize="11" fill="var(--tinta-tenue)" className="font-medium">
        Semestre · {datos?.uc ?? 0} UC
      </text>

      {hayInscribibles && (
        <circle
          cx={x + NODO.ancho - 32}
          cy={top + 25.5}
          r={3.5}
          style={{ fill: 'var(--sit-inscribible-luz)' }}
        />
      )}
      <text
        x={x + NODO.ancho}
        y={top + 29}
        textAnchor="end"
        fontSize="11"
        className="font-mono tabular-nums"
        style={{
          fill: completo ? 'var(--estado-aprobada)' : 'var(--tinta-suave)',
          transition: 'fill 240ms ease',
        }}
      >
        {completo ? '✓' : `${hechas}/${total}`}
      </text>

      <rect
        x={x}
        y={RIEL}
        width={NODO.ancho}
        height={2}
        rx={1}
        fill="var(--tinta)"
        fillOpacity={0.08}
      />
      {tramos.map((tramo, i) => {
        const inicio = desde
        desde += tramo.n
        return (
          <rect
            key={i}
            y={RIEL}
            height={2}
            rx={1}
            style={{
              x: x + (total ? (NODO.ancho * inicio) / total : 0),
              width: total ? (NODO.ancho * tramo.n) / total : 0,
              fill: tramo.color,
              fillOpacity: tramo.opacidad,
              transition: suave,
            }}
          />
        )
      })}
    </g>
  )
}

export default memo(ContenidoGrafo)
