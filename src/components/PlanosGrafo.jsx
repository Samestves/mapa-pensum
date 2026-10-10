import { memo, useEffect, useState } from 'react'
import { SITUACION, TRAMO, tramoDe } from '../layout/situacion'
import { salidaDeFoco } from '../layout/foco'
import { codigoVisible } from '../data/codigoVisible'
import { useDescarga, useToque } from '../hooks/useAvance'
import NodoAsignatura from './NodoAsignatura'
import NodoHueco, { TextoCasilla } from './NodoHueco'
import { TextoTarjeta } from './CaraTarjeta'
import { CableBase, CableEnFoco, LuzCable } from './Arista'

/* Lo que tarda en apagarse lo que sale del foco. Tiene que coincidir con
   .foco-saliendo y la transicion de .plano-base en estilos/mapa.css. */
const DURACION_FOCO = 320

/**
 * Los planos del mapa, de abajo arriba: ROTULOS, BASE, LUCES y FOCO. Cada uno
 * es una capa de la GPU dentro de la capa que se mueve (ver GrafoPensum).
 *
 * Es la idea de los pases de render de un motor de juego: lo que no cambia se
 * pinta una vez y se guarda como textura, y lo que cambia se pinta aparte,
 * sin arrastrar a lo demas.
 *
 *  - ROTULOS: las cabeceras de los semestres (ver RotulosGrafo). Nunca se
 *    apagan.
 *  - BASE: todo el mapa, siempre igual. Solo cambia con el avance -aprobar,
 *    cursar, elegir electivas-, nunca al señalar ni al elegir una materia.
 *  - LUCES: las luces que viajan por la frontera. Es lo unico que se anima
 *    solo, y en su plano cada cuadro repinta unas cuantas lineas en vez de
 *    las tarjetas que haya debajo.
 *  - FOCO: lo que esta en foco, dibujado otra vez encima, nitido. Mientras
 *    tanto la base se apaga y se desenfoca ENTERA, como una sola textura: en
 *    la GPU eso cuesta lo mismo con diez tarjetas que con cien.
 *
 * Antes cada tarjeta se apagaba por su cuenta: señalar una materia
 * re-renderizaba ciento y pico componentes y animaba ochenta filtros de
 * desenfoque a la vez, uno por tarjeta, cuadro a cuadro. Medido en un
 * portatil a CPU x4, pasar el raton por el mapa daba cuadros de 150 ms.
 *
 * Cada plano lleva dos piezas: las FORMAS en un <svg> y el TEXTO en HTML por
 * encima, con el mismo pan y zoom. El texto va aparte porque el de un SVG se
 * vuelve a maquetar cada vez que la capa cambia de escala (ver Texto).
 */
export function Plano({ vista, className, formas, textos, ...resto }) {
  return (
    <div className={`plano ${className}`} {...resto}>
      <svg width="100%" height="100%">
        <g transform={`translate(${vista.x}, ${vista.y}) scale(${vista.escala})`}>{formas}</g>
      </svg>
      {textos && (
        <div
          className="textos-plano"
          aria-hidden="true"
          style={{ transform: `translate(${vista.x}px, ${vista.y}px) scale(${vista.escala})` }}
        >
          {textos}
        </div>
      )}
    </div>
  )
}

/**
 * La forma de una tarjeta del mapa: una materia, o una casilla de electiva
 * -vacia o con la electiva que pusiste-. La dibujan la base y el foco con las
 * mismas props; solo cambia si esta resaltada o elegida, que en la base nunca.
 *
 * La descarga y el toque no vienen en `contexto`: los leen quienes dibujan
 * (FormasBase y FormasFoco) y los pasan aqui. Asi acabar la animacion solo
 * repinta a esos dos y no a GrafoPensum entero.
 */
function dibujarForma(nodo, contexto, { descarga, toque, seleccionado = null, cadena = null }) {
  const { situaciones, enCasilla, alAbrirCasilla } = contexto
  const { alSenalar, alDejarDeSenalar, alVerFicha } = contexto

  if (nodo.esHueco) {
    const electiva = enCasilla(nodo.codigo)
    return (
      <NodoHueco
        key={nodo.codigo}
        nodo={nodo}
        electiva={electiva}
        situacion={electiva ? situaciones.get(electiva.codigo) : null}
        seleccionado={seleccionado === (electiva?.codigo ?? nodo.codigo)}
        alAbrir={alAbrirCasilla}
        alVerFicha={alVerFicha}
      />
    )
  }

  const situacion = situaciones.get(nodo.codigo)
  /* El contador (n) solo se le pasa a quien lo usa: dárselo a todas las tarjetas
     y cables repintaba el mapa entero en cada marca. */
  const destellando =
    descarga != null &&
    situacion === SITUACION.INSCRIBIBLE &&
    (nodo.prerrequisitos ?? []).includes(descarga.codigo)
  const tocado = toque?.codigo === nodo.codigo
  return (
    <NodoAsignatura
      key={nodo.codigo}
      nodo={nodo}
      situacion={situacion}
      seleccionado={seleccionado === nodo.codigo}
      resaltado={cadena?.has(nodo.codigo) ?? false}
      destellando={destellando}
      claveDestello={destellando ? descarga.n : undefined}
      tocado={tocado}
      claveToque={tocado ? toque.n : undefined}
      alSenalar={alSenalar}
      alDejarDeSenalar={alDejarDeSenalar}
      alVerFicha={alVerFicha}
    />
  )
}

/** El texto de una tarjeta del mapa, para la capa de texto de su plano */
function dibujarTexto(nodo, { situaciones, enCasilla }) {
  if (nodo.esHueco) {
    const electiva = enCasilla(nodo.codigo)
    return (
      <TextoCasilla
        key={nodo.codigo}
        nodo={nodo}
        electiva={electiva}
        situacion={electiva ? situaciones.get(electiva.codigo) : null}
      />
    )
  }
  return (
    <TextoTarjeta
      key={nodo.codigo}
      x={nodo.x}
      y={nodo.y}
      situacion={situaciones.get(nodo.codigo)}
      codigo={codigoVisible(nodo)}
      lineasNombre={nodo.lineasNombre}
      uc={nodo.uc}
    />
  )
}

/* Las casillas primero y las materias despues, como siempre se dibujaron:
   las de la franja van al final de las casillas. */
const todasLasTarjetas = (nodos, casillasFranja) => [
  ...nodos.filter((nodo) => nodo.esHueco),
  ...casillasFranja,
  ...nodos.filter((nodo) => !nodo.esHueco),
]

/**
 * Las formas del plano base: cables y tarjetas, sin foco.
 *
 * Memoizadas por una razon de rendimiento: el pan y el zoom viven en el <g>
 * de fuera, que cambia al asentar cada gesto, y sin memo cada cambio obligaba
 * a React a recrear ciento treinta y un elementos para acabar cambiando un
 * atributo. Por eso sus props tienen que mantener la identidad entre
 * renders: las funciones vienen fijadas con useCallback desde GrafoPensum.
 * Si alguna volviera a crearse en cada render, esto dejaria de servir en
 * silencio.
 */
function FormasBaseSinMemo(props) {
  const { situaciones, aristas, nodos, casillasFranja, porCodigo } = props
  const descarga = useDescarga()
  const toque = useToque()
  return (
    <>
      {/* Los cables van debajo de las tarjetas, pero el ruteo garantiza que
          ninguno pasa por encima de un nodo. */}
      <g>
        {aristas.map((arista) => {
          const descargando = descarga?.codigo === arista.origen
          return (
            <CableBase
              key={arista.id}
              arista={arista}
              areaDestino={porCodigo.get(arista.destino)?.area}
              tramo={tramoDe(situaciones.get(arista.origen), situaciones.get(arista.destino))}
              descargando={descargando}
              claveDescarga={descargando ? descarga.n : undefined}
            />
          )
        })}
      </g>
      {todasLasTarjetas(nodos, casillasFranja).map((nodo) =>
        dibujarForma(nodo, props, { descarga, toque }),
      )}
    </>
  )
}

/** El texto del plano base, memoizado por lo mismo que sus formas */
function TextosBaseSinMemo(props) {
  return todasLasTarjetas(props.nodos, props.casillasFranja).map((nodo) =>
    dibujarTexto(nodo, props),
  )
}

/** El plano de las luces de la frontera, que van a su aire */
function LucesSinMemo({ situaciones, aristas }) {
  return aristas.map(
    (arista, indice) =>
      tramoDe(situaciones.get(arista.origen), situaciones.get(arista.destino)) ===
        TRAMO.FRONTERA && <LuzCable key={arista.id} arista={arista} indice={indice} />,
  )
}

/**
 * Las formas de lo que esta en `conjunto`: sus cables -con la cadena que se
 * mira dibujandose- y sus tarjetas. `mirada` es la materia que se mira: al
 * cambiar, la cadena se vuelve a dibujar desde el origen.
 */
function FormasFocoSinMemo({ conjunto, cadena, mirada, seleccionado, ...contexto }) {
  const { situaciones, aristas, nodos, casillasFranja, porCodigo } = contexto
  const descarga = useDescarga()
  const toque = useToque()
  return (
    <>
      {aristas.map(
        (arista, indice) =>
          conjunto.aristas.has(arista.id) && (
            <CableEnFoco
              key={arista.id}
              arista={arista}
              indice={indice}
              areaDestino={porCodigo.get(arista.destino)?.area}
              tramo={tramoDe(situaciones.get(arista.origen), situaciones.get(arista.destino))}
              resaltada={cadena != null && cadena.has(arista.origen) && cadena.has(arista.destino)}
              foco={mirada}
            />
          ),
      )}
      {todasLasTarjetas(nodos, casillasFranja).map(
        (nodo) =>
          conjunto.nodos.has(nodo.codigo) &&
          dibujarForma(nodo, contexto, { descarga, toque, seleccionado, cadena }),
      )}
    </>
  )
}

function TextosFocoSinMemo({ conjunto, ...contexto }) {
  return todasLasTarjetas(contexto.nodos, contexto.casillasFranja).map(
    (nodo) => conjunto.nodos.has(nodo.codigo) && dibujarTexto(nodo, contexto),
  )
}

const FormasFoco = memo(FormasFocoSinMemo)
const TextosFoco = memo(TextosFocoSinMemo)

/**
 * Los planos de foco: el de lo que esta en foco, y debajo, mientras se apaga,
 * el de lo que acaba de salir (ver salidaDeFoco). Ese plano saliente se funde
 * entero en la GPU: el hover pinta una vez lo nuevo y no repinta nada mientras
 * lo viejo se va.
 *
 * `extra` va en el plano de foco, encima de todo: el contorno que se carga al
 * mantener el dedo en una tarjeta.
 */
function PlanosFocoSinMemo({ vista, foco, mirada, seleccionado, extra, ...contexto }) {
  /* La salida se calcula DURANTE el render, como la ficha saliente de
     GrafoPensum: con un efecto habria un cuadro con el foco nuevo y sin lo
     que sale, y lo que sale desapareceria antes de empezar a fundirse. Se
     guarda tambien a quien se miraba y que estaba elegido, para que lo que
     sale se siga viendo como estaba. `n` cuenta las salidas: cada una monta
     su propio plano y su fundido arranca desde el principio. */
  const [anterior, setAnterior] = useState({ foco, mirada, seleccionado })
  const [salida, setSalida] = useState(null)
  if (anterior.foco !== foco) {
    setAnterior({ foco, mirada, seleccionado })
    const sale = salidaDeFoco(anterior.foco, foco)
    setSalida(
      sale && {
        ...sale,
        mirada: anterior.mirada,
        seleccionado: anterior.seleccionado,
        n: (salida?.n ?? 0) + 1,
      },
    )
  }

  useEffect(() => {
    if (!salida) return
    const reloj = setTimeout(() => setSalida(null), DURACION_FOCO)
    return () => clearTimeout(reloj)
  }, [salida])

  return (
    <>
      {salida && (
        <Plano
          key={salida.n}
          vista={vista}
          className={`plano-foco ${salida.fundir ? 'foco-saliendo' : ''}`}
          formas={
            <FormasFoco
              conjunto={salida}
              cadena={salida.cadena}
              mirada={salida.mirada}
              seleccionado={salida.seleccionado}
              {...contexto}
            />
          }
          textos={<TextosFoco conjunto={salida} {...contexto} />}
        />
      )}
      <Plano
        vista={vista}
        className="plano-foco"
        formas={
          <>
            {foco && (
              <FormasFoco
                conjunto={foco}
                cadena={foco.cadena}
                mirada={mirada}
                seleccionado={seleccionado}
                {...contexto}
              />
            )}
            {extra}
          </>
        }
        textos={foco && <TextosFoco conjunto={foco} {...contexto} />}
      />
    </>
  )
}

export const FormasBase = memo(FormasBaseSinMemo)
export const TextosBase = memo(TextosBaseSinMemo)
export const Luces = memo(LucesSinMemo)
export const PlanosFoco = memo(PlanosFocoSinMemo)
