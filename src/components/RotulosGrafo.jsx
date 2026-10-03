import { memo } from 'react'
import { NODO, MARGEN, FRANJA } from '../layout/constantes'
import { FormaSituacion } from './IconoSituacion'
import { ASPECTO } from '../theme/situacion'
import Texto, { GrupoTexto } from './Texto'
import { MARCA_SEMESTRE } from '../data/semestre'
import GlifoCasilla from './GlifoCasilla'

/**
 * Los rotulos del mapa: la cabecera de cada semestre, la de cada grupo de la
 * franja de electivas y la regla que separa la franja de los semestres.
 *
 * Van en su propio plano, debajo de la base (ver PlanosGrafo), y es a
 * proposito: cuando el mapa enfoca una cadena, la base se apaga entera, y los
 * semestres tienen que seguir leyendose para saber donde cae cada materia de
 * la cadena. Como todo el mapa, en dos piezas: las formas en el SVG
 * (RotulosFormas) y el texto en HTML (RotulosTextos), con los datos de
 * layout/cabeceras.js.
 */

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

const Y = MARGEN.top

/* La casilla de marcar el semestre, a la izquierda del titulo: centrada en
   la altura de sus mayusculas, y el titulo corrido lo que ocupa. La zona que
   se pulsa abarca casilla y titulo: a la escala del mapa entero un cuadrito
   de catorce pixeles no lo acierta nadie. */
const CASILLA_ARRIBA = 2.8
const SANGRIA_TITULO = 21
const PULSABLE = { izq: -6, arr: -10, ancho: 150, alto: 32 }
const CRECER = 'width 600ms cubic-bezier(0.32, 0.72, 0, 1), x 600ms cubic-bezier(0.32, 0.72, 0, 1)'

/**
 * Las formas de los rotulos: el riel de avance de cada semestre, el icono de
 * cada estado y la regla de la franja.
 *
 * El riel cruza la columna entera y parte la cabecera en lo que el semestre
 * es -arriba- y como vas en el -abajo-: aprobado y, a continuacion, lo que
 * cursas. Crece con transicion al aprobar en vez de saltar.
 */
function RotulosFormasSinMemo({ cabeceras, filasFranja, ancho, marcas, alAlternar }) {
  return (
    <>
      {cabeceras.map((c) => (
        <g key={c.semestre}>
          <rect
            x={c.x}
            y={Y + CABECERA.barra}
            width={NODO.ancho}
            height={2}
            fill="var(--tinta)"
            fillOpacity={0.1}
          />
          <rect
            y={Y + CABECERA.barra}
            height={2}
            style={{
              x: c.x,
              width: c.anchoHechas,
              fill: 'var(--estado-aprobada)',
              transition: CRECER,
            }}
          />
          <rect
            y={Y + CABECERA.barra}
            height={2}
            style={{
              x: c.x + c.anchoHechas,
              width: c.anchoCursando,
              fill: 'var(--estado-cursando)',
              transition: CRECER,
            }}
          />
          {/* Colocados con sus numeros y no con un transform: ver IconoSituacion */}
          {c.estados.map((e) => (
            <FormaSituacion
              key={e.situacion}
              situacion={e.situacion}
              x={e.x}
              y={Y + CABECERA.pie - 10}
              escala={0.6}
              color={ASPECTO[e.situacion].icono}
            />
          ))}
          {marcas.has(c.semestre) && (
            <CasillaSemestre
              semestre={c.semestre}
              x={c.x}
              marca={marcas.get(c.semestre)}
              alAlternar={alAlternar}
            />
          )}
        </g>
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
 * La casilla de marcar el semestre entero, delante de su nombre: la de una
 * lista de tareas, que todo el mundo sabe leer y pulsar.
 *
 * Vacia si no llevas nada aprobado, con una raya si llevas una parte y llena
 * con su check si esta todo. Pulsarla vacia o con raya aprueba lo que falta;
 * llena, lo desmarca todo. Al apuntarle anticipa lo que va a pasar: la
 * vacia se enciende con su check, la llena se apaga (ver alternarSemestre
 * en VistaCarrera).
 */
function CasillaSemestre({ semestre, x, marca, alAlternar }) {
  const marcada = marca === MARCA_SEMESTRE.MARCADO
  const etiqueta = marcada
    ? `Desmarcar el semestre ${semestre} entero`
    : `Aprobar el semestre ${semestre} entero`
  const alternar = () => alAlternar(semestre)

  return (
    <g
      role="checkbox"
      aria-checked={marcada ? 'true' : marca === MARCA_SEMESTRE.MIXTO ? 'mixed' : 'false'}
      aria-label={etiqueta}
      tabIndex={0}
      className="casilla-semestre"
      data-marca={marca}
      transform={`translate(${x}, ${Y + CASILLA_ARRIBA})`}
      onClick={alternar}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return
        e.preventDefault()
        alternar()
      }}
    >
      <title>{etiqueta}</title>
      <rect
        x={PULSABLE.izq}
        y={PULSABLE.arr}
        width={PULSABLE.ancho}
        height={PULSABLE.alto}
        fill="transparent"
      />
      <GlifoCasilla />
    </g>
  )
}

/**
 * El texto de los rotulos.
 *
 *   ☐ SEMESTRE 04                      71%
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
 * colores ni cajas. Los estados se anclan al borde derecho, asi que caen en
 * el mismo sitio en las diez columnas.
 */
function RotulosTextosSinMemo({ cabeceras, filasFranja }) {
  return (
    <>
      {cabeceras.map((c) => (
        <GrupoTexto key={c.semestre} x={c.x} y={Y}>
          <Texto
            x={SANGRIA_TITULO}
            y={CABECERA.titulo}
            className="tabular-nums"
            style={{ fontSize: 11.5, color: 'var(--tinta)', fontWeight: 500, ...espaciado(0.3) }}
          >
            SEMESTRE {String(c.semestre).padStart(2, '0')}
          </Texto>

          <Texto
            x={0}
            y={CABECERA.datos}
            className="font-dato tabular-nums"
            style={{
              fontSize: 10,
              color: 'var(--tinta-tenue)',
              fontWeight: 'var(--peso-dato)',
              ...espaciado(0.04),
            }}
          >
            {c.uc} UC · {c.total} {c.total === 1 ? 'MATERIA' : 'MATERIAS'}
          </Texto>

          {/* La cifra del instrumento. El % va mas pequeño y apagado: es la
              unidad, no el dato. */}
          <Texto
            x={NODO.ancho}
            y={CABECERA.datos}
            ancla="fin"
            className="tabular-nums"
            style={{
              fontSize: 32,
              color: c.completo ? 'var(--estado-aprobada)' : 'var(--tinta)',
              fontWeight: 200,
              letterSpacing: '-0.02em',
              transition: 'color 240ms ease',
            }}
          >
            {c.porcentaje}
            <span
              style={{
                marginLeft: 2,
                fontSize: 14,
                color: 'var(--tinta-tenue)',
                fontWeight: 300,
              }}
            >
              %
            </span>
          </Texto>

          <Texto
            x={0}
            y={CABECERA.pie}
            className="tabular-nums"
            style={{
              fontSize: 9.5,
              fontWeight: 500,
              color: c.completo ? 'var(--estado-aprobada)' : 'var(--tinta-tenue)',
              ...espaciado(0.22),
            }}
          >
            {c.completo ? 'COMPLETO' : `${c.hechas}/${c.total} APROBADAS`}
          </Texto>

          {c.estados.map((e) => (
            <Texto
              key={e.situacion}
              x={e.x - c.x + 16}
              y={CABECERA.pie}
              className="font-dato tabular-nums"
              style={{ fontSize: 11, color: ASPECTO[e.situacion].marca.color, fontWeight: 400 }}
            >
              {e.n}
            </Texto>
          ))}
        </GrupoTexto>
      ))}

      {filasFranja.map((fila) => (
        <CabeceraFranja key={fila.clave} fila={fila} />
      ))}
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
    <GrupoTexto x={x} y={y}>
      <Texto
        x={0}
        y={CABECERA.titulo}
        style={{ fontSize: 11.5, color: 'var(--tinta)', fontWeight: 500, ...espaciado(0.3) }}
      >
        {titulo.toUpperCase()}
      </Texto>
      <Texto
        x={0}
        y={CABECERA.datos}
        className="font-dato tabular-nums"
        style={{
          fontSize: 10,
          color: 'var(--tinta-tenue)',
          fontWeight: 'var(--peso-dato)',
          ...espaciado(0.04),
        }}
      >
        {datos.join(' · ')}
      </Texto>
    </GrupoTexto>
  )
}

export const RotulosFormas = memo(RotulosFormasSinMemo)
export const RotulosTextos = memo(RotulosTextosSinMemo)
