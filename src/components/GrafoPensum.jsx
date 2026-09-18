import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useVistaGrafo } from '../hooks/useVistaGrafo'
import { useInactividad } from '../hooks/useInactividad'
import { useFocoGrafo } from '../hooks/useFocoGrafo'
import ContenidoGrafo from './ContenidoGrafo'
import DefsGrafo from './DefsGrafo'
import DetalleAsignatura from './DetalleAsignatura'
import ControlesZoom from './ControlesZoom'
import AvisoRecogida from './AvisoRecogida'
import { situacionDe } from '../layout/situacion'
import { NODO } from '../layout/constantes'
import { ESTADO } from '../data/estados'

/* Una sola lista vacia para las carreras sin franja: un [] nuevo en cada
   render cambiaria de identidad y tiraria el memo del contenido del mapa. */
const SIN_FRANJA = []

function GrafoPensum({
  layout,
  porCodigo,
  estados,
  descarga,
  toque,
  areaFiltrada,
  seleccionado,
  senalado,
  alSenalar,
  alSeleccionar,
  alMarcar,
  enCasilla,
  alAbrirCasilla,
  casillaDe,
}) {
  const { nodos, columnas, aristas, relaciones, ancho, alto } = layout
  // La franja de electivas solo existe en las carreras sin casillas oficiales
  const casillasFranja = layout.casillasFranja ?? SIN_FRANJA
  const filasFranja = layout.filasFranja ?? SIN_FRANJA

  const {
    contenedorRef,
    capaRef,
    vista,
    medida,
    encajado,
    arrastrando,
    enGesto,
    refEnGesto,
    huboMovimiento,
    encajar,
    acercar,
    alejar,
    mostrar,
    controlesArrastre,
  } = useVistaGrafo(ancho, alto)

  /* Situacion de cada materia -hecha, cursando, inscribible, proxima o
     lejana-. Cambia de identidad solo cuando cambian los estados, que es
     cuando de verdad hay que repintar. */
  const situaciones = useMemo(() => {
    const mapa = new Map()
    const poner = (a) => {
      if (a && !mapa.has(a.codigo)) {
        mapa.set(a.codigo, situacionDe(a.codigo, a.prerrequisitos, estados))
      }
    }
    for (const nodo of nodos) poner(nodo.esHueco ? enCasilla(nodo.codigo) : nodo)
    for (const casilla of casillasFranja) poner(enCasilla(casilla.codigo))
    return mapa
  }, [nodos, casillasFranja, estados, enCasilla])

  // El dock se apaga si nadie toca el mapa en dos segundos
  const { quieto, despertar } = useInactividad(2000)

  const { cadena, atenuado, nodoSeleccionado, detalle } = useFocoGrafo({
    seleccionado,
    senalado,
    areaFiltrada,
    estados,
    relaciones,
    porCodigo,
    vista,
  })

  // Los nodos estan memoizados, asi que lo que reciben tiene que mantener su
  // identidad entre renders o el memo no sirve de nada. Estas tres funciones
  // son las unicas props de los nodos que no son valores simples, y por eso
  // son las unicas que hay que fijar. Reciben el codigo en vez de venir ya
  // atadas a un nodo concreto: una funcion por mapa, no una por materia.
  /* Señalar se ignora mientras el mapa se mueve.
     Al arrastrar, el puntero cruza decenas de tarjetas y cada una dispara su
     hover: eso recalcula la cadena, cambia la identidad de `atenuado` y
     obliga a rehacer los ciento treinta y un hijos memoizados, ademas de
     relanzar la transicion de opacidad de setenta y cinco nodos. Medido: el
     arrastre pasa de 6,9 a entre 9,7 y 15,9 ms por movimiento.
     Ademas de caro, no es lo que se pide: quien arrastra el mapa lo esta
     moviendo, no inspeccionando lo que le pasa por debajo.
     Se consulta una ref y no el estado para no cambiar de identidad, que es
     lo unico que mantiene vivo el memo. */
  /* Soltar el señalado espera un poco; cambiarlo, no.

     Entre dos tarjetas hay hueco, asi que al pasar de una a otra el puntero
     SALE de la primera antes de ENTRAR en la segunda. Con el soltado
     inmediato habia un instante sin nada señalado: el mapa entero volvia a
     encenderse y enseguida se apagaba otra vez para la segunda, y como las
     opacidades llevan transicion, ese ida y vuelta se veia como un destello
     de todas las tarjetas antes del resaltado bueno.

     Ahora salir solo PROGRAMA soltar, y entrar en otra tarjeta lo cancela y
     cambia directamente de una cadena a otra. Si de verdad te fuiste al
     lienzo vacio, a los 160 ms se suelta igual. Cruzar la fila de 26 px entre
     dos tarjetas lleva bastante menos que eso a cualquier velocidad normal. */
  const relojSoltar = useRef(null)

  const senalar = useCallback(
    (codigo) => {
      if (refEnGesto.current) return
      clearTimeout(relojSoltar.current)
      alSenalar(codigo)
    },
    [alSenalar, refEnGesto],
  )
  const dejarDeSenalar = useCallback(() => {
    clearTimeout(relojSoltar.current)
    relojSoltar.current = setTimeout(() => alSenalar(null), 160)
  }, [alSenalar])

  useEffect(() => () => clearTimeout(relojSoltar.current), [])

  /* Y al empezar a mover, lo que hubiera resaltado se apaga. Arrastrar el
     mapa con media pantalla atenuada estorba para ver a donde se va, y de
     paso deja el gesto con el arbol en su estado mas barato. */
  useEffect(() => {
    if (!enGesto) return
    clearTimeout(relojSoltar.current)
    alSenalar(null)
  }, [enGesto, alSenalar])
  /* La situacion de cualquier materia, tambien de las que no estan
     dibujadas -una electiva sin colocar que aparece en la ficha-. */
  const situacionDeCodigo = useCallback(
    (codigo) =>
      situaciones.get(codigo) ??
      situacionDe(codigo, porCodigo.get(codigo)?.prerrequisitos, estados),
    [situaciones, porCodigo, estados],
  )

  /* El rectangulo de una materia en coordenadas del mapa, o null si no esta
     dibujada -una electiva que no has colocado-. */
  const cajaDe = useCallback(
    (codigo) => {
      const a = porCodigo.get(codigo)
      if (!a || !Number.isFinite(a.x) || !Number.isFinite(a.y)) return null
      return { x0: a.x, y0: a.y, x1: a.x + NODO.ancho, y1: a.y + NODO.alto }
    },
    [porCodigo],
  )
  const puedeIr = useCallback((codigo) => cajaDe(codigo) != null, [cajaDe])

  /* En el telefono la ficha tapa la parte de abajo del mapa. Cuando se abre
     dice cuanto tapa, y el mapa se corre para que la materia pulsada quede a
     la vista encima de ella: tocar una tarjeta de la mitad de abajo la
     escondia justo debajo de su propia ficha. */
  const taparAbajo = useCallback(
    (abajo) => {
      const caja = cajaDe(seleccionado)
      if (caja) mostrar(caja, { arriba: 24, abajo: abajo + 16, izq: 20, der: 20 })
    },
    [cajaDe, seleccionado, mostrar],
  )

  /* Desde la ficha se puede saltar a una prelacion o a lo que desbloquea.
     En escritorio el mapa la trae a la vista aqui; en el telefono ya lo hace
     taparAbajo al abrirse la ficha de la nueva. */
  const irAMateria = useCallback(
    (codigo) => {
      if (codigo === seleccionado) return
      alSeleccionar(codigo)
      const caja = cajaDe(codigo)
      if (caja && medida.ancho >= 768) mostrar(caja, { arriba: 48, abajo: 48, izq: 48, der: 48 })
    },
    [seleccionado, alSeleccionar, cajaDe, medida.ancho, mostrar],
  )

  /* La ficha que se ve, y la que se esta yendo.

     Al cerrarse, la seleccion pasa a null en el acto y la ficha se
     desmontaria sin mas, cortada en seco. Asi que se guarda lo ultimo que
     enseño y se sigue pintando un cuarto de segundo mas, con `saliendo`, el
     tiempo de su animacion de salida. Va en el mismo sitio del arbol que la
     abierta para que React la trate como la MISMA ficha: si se cerro
     arrastrandola, conserva hasta donde la bajo el dedo y la salida sigue
     desde ahi. */
  const fichaAbierta = detalle
    ? {
        nodo: nodoSeleccionado,
        estado: estados[seleccionado],
        situacion: situacionDeCodigo(seleccionado),
        prerrequisitos: detalle.prerrequisitos,
        desbloquea: detalle.desbloquea,
        posicion: detalle.posicion,
        enCasilla: casillaDe?.[seleccionado],
      }
    : null
  const ultimaFicha = useRef(null)
  const [fichaSaliente, setFichaSaliente] = useState(null)
  const [seleccionPrevia, setSeleccionPrevia] = useState(seleccionado)
  useLayoutEffect(() => {
    if (fichaAbierta) ultimaFicha.current = fichaAbierta
  })
  /* Se ajusta DURANTE el render y no en un efecto. Con un efecto habia un
     render entero sin ficha entre la que se cerraba y su copia saliente: la
     ficha se desmontaba, se volvia a montar y repetia su animacion de entrada
     encima de la de salida. Ajustado aqui, React rehace el render antes de
     pintarlo y la ficha nunca llega a desaparecer. */
  if (seleccionPrevia !== seleccionado) {
    setSeleccionPrevia(seleccionado)
    setFichaSaliente(seleccionado == null ? ultimaFicha.current : null)
  }
  useEffect(() => {
    if (!fichaSaliente) return
    const reloj = setTimeout(() => setFichaSaliente(null), 260)
    return () => clearTimeout(reloj)
  }, [fichaSaliente])
  const ficha = fichaAbierta ?? fichaSaliente

  /* Lo que acabas de conseguir al aprobar, para el aviso de la esquina */
  const [recogida, setRecogida] = useState(null)
  const cerrarRecogida = useCallback(() => setRecogida(null), [])

  /**
   * Marcar desde la ficha. Cursando y sin cursar se quedan con la ficha
   * abierta: son cambios de estado y ya. Aprobar es otra cosa, es el momento
   * en que algo se abre, y la luz corre por los cables hacia lo que se
   * desbloquea. Con la ficha abierta esa luz pasaba por debajo de ella -la
   * ficha se pone al lado de la tarjeta, justo por donde salen sus cables- y
   * no se veia.
   *
   * Asi que al aprobar la ficha se aparta, el mapa se corre lo justo para
   * que quepan la materia y todo lo que desbloquea, la luz sale cuando el
   * mapa ya llego (ver .descarga en index.css) y en la esquina queda el
   * aviso de lo que se abrio, con Deshacer.
   */
  const marcarDesdeFicha = useCallback(
    (codigo, marca) => {
      const antes = estados[codigo]
      const marcaAntes = antes === ESTADO.APROBADA || antes === ESTADO.CURSANDO ? antes : null
      if (marca !== ESTADO.APROBADA || marcaAntes === ESTADO.APROBADA) {
        alMarcar(codigo, marca)
        return
      }

      const siguientes = relaciones.adelante.get(codigo) ?? []
      const despues = { ...estados, [codigo]: ESTADO.APROBADA }
      const abiertas = siguientes
        .map((c) => porCodigo.get(c))
        .filter(
          (a) =>
            a &&
            despues[a.codigo] !== ESTADO.APROBADA &&
            despues[a.codigo] !== ESTADO.CURSANDO &&
            (a.prerrequisitos ?? []).every((p) => despues[p] === ESTADO.APROBADA),
        )

      // La caja que tiene que verse: la materia y todo lo que sale de ella
      const cajas = [codigo, ...siguientes]
        .map((c) => porCodigo.get(c))
        .filter((a) => a && Number.isFinite(a.x) && Number.isFinite(a.y))
      if (cajas.length) {
        const telefono = medida.ancho < 768
        mostrar(
          {
            x0: Math.min(...cajas.map((a) => a.x)),
            y0: Math.min(...cajas.map((a) => a.y)),
            x1: Math.max(...cajas.map((a) => a.x + NODO.ancho)),
            y1: Math.max(...cajas.map((a) => a.y + NODO.alto)),
          },
          // Abajo quedan la barra del telefono y el propio aviso
          { arriba: 48, abajo: telefono ? 180 : 104, izq: 48, der: 48 },
        )
      }

      alSeleccionar(null)
      alMarcar(codigo, marca)
      setRecogida({
        codigo,
        marcaAntes,
        nombre: porCodigo.get(codigo)?.nombre ?? '',
        desbloqueadas: abiertas.map((a) => a.nombre),
        n: Date.now(),
      })
    },
    [estados, relaciones, porCodigo, medida.ancho, mostrar, alSeleccionar, alMarcar],
  )

  /* Deshacer solo devuelve la marca: el aviso se va solo, con su salida, y al
     acabar llama a cerrarRecogida. */
  const deshacerRecogida = useCallback(() => {
    if (!recogida) return
    alMarcar(recogida.codigo, recogida.marcaAntes)
  }, [recogida, alMarcar])

  const verFicha = useCallback(
    (codigo) => {
      // Si el puntero se movio, fue un arrastre del lienzo, no un click
      if (huboMovimiento.current) return
      alSeleccionar(codigo)
    },
    [alSeleccionar, huboMovimiento],
  )

  return (
    <div
      ref={contenedorRef}
      className="relative min-w-0 flex-1 overflow-hidden"
      style={{ backgroundColor: 'var(--lienzo-mapa)' }}
    >
      {/* El lienzo: aqui van los gestos, y no en el contenedor, para que la
          ficha y los botones de zoom -hermanos de este div- no arranquen un
          arrastre al pulsarlos.

          Los *Capture avisan de actividad en fase de captura, antes de que
          corran los manejadores de arrastre de controlesArrastre: asi
          despiertan el dock sin pisar ni duplicar el pan y el zoom. */}
      <div
        className={`absolute inset-0 select-none ${arrastrando ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ touchAction: 'none' }}
        {...controlesArrastre}
        onPointerMoveCapture={despertar}
        onPointerDownCapture={despertar}
        onWheelCapture={despertar}
      >
        {/* Dos <svg> y no uno: la rejilla del fondo se queda quieta, y el
            contenido va en su propia capa para poder estirarla entera
            durante el pellizco (ver layout/vistaViva.js). Un <g> no se puede
            estirar en la GPU; una capa HTML si. */}
        <svg width="100%" height="100%" className="absolute inset-0">
          <DefsGrafo />

          {/* Click en el vacio: cierra la seleccion. Le llega a traves de la
              capa del contenido, que solo atrapa lo que tiene dibujado. */}
          <rect
            width="100%"
            height="100%"
            fill="url(#rejilla)"
            onClick={() => {
              if (!huboMovimiento.current) alSeleccionar(null)
            }}
          />
        </svg>

        {/* La capa que se estira es un div y no el propio <svg>. Medido:
            cambiar el transform CSS del <svg> hace a Chrome rehacer la
            maqueta de todo su texto igual que cambiar el del <g>, porque lo
            toma como un cambio de escala del dibujo; el de un div que lo
            envuelve no le afecta, y el cuadro pasa de 3,8 ms a 0,01.

            lienzo-en-gesto congela la luz de los cables mientras el mapa se
            mueve. Ver .lienzo-en-gesto en index.css.

            textRendering geometricPrecision es por el zoom que si repinta.
            Chrome dibuja el texto de un SVG recalculando la letra al tamaño
            al que se ve en pantalla, asi que cada cuadro de zoom rehace la
            maqueta de los doscientos y pico textos del mapa. Con
            geometricPrecision usa el tamaño declarado y escala los glifos:
            medido a CPU x4, de 40-45 ms por cuadro a 16-17. En pantalla no se
            distingue. */}
        <div ref={capaRef} className="capa-grafo absolute inset-0">
          <svg
            width="100%"
            height="100%"
            className={`font-ui ${enGesto ? 'lienzo-en-gesto' : ''}`}
            style={{ textRendering: 'geometricPrecision' }}
          >
            {/* Oculto hasta que la vista se encaja. El primer fotograma tras
                montar dibuja el mapa a tamaño natural desde la esquina, y
                enseñarlo era el tiron que se veia al volver del horario. Se
                revela con una transicion corta de opacidad, que el compositor
                resuelve sin repintar los mil seiscientos elementos. */}
            <g
              transform={`translate(${vista.x}, ${vista.y}) scale(${vista.escala})`}
              style={{
                opacity: encajado ? 1 : 0,
                transition: 'opacity 200ms ease-out',
              }}
            >
              {/* Todo el contenido del mapa vive memoizado ahi dentro. Este <g>
                  es lo unico que cambia al desplazar o acercar, y su unico
                  hijo se salta el render entero comparando una prop. */}
              <ContenidoGrafo
                situaciones={situaciones}
                foco={seleccionado ?? senalado}
                columnas={columnas}
                aristas={aristas}
                nodos={nodos}
                casillasFranja={casillasFranja}
                filasFranja={filasFranja}
                porCodigo={porCodigo}
                descarga={descarga}
                toque={toque}
                seleccionado={seleccionado}
                cadena={cadena}
                atenuado={atenuado}
                enCasilla={enCasilla}
                alAbrirCasilla={alAbrirCasilla}
                ancho={ancho}
                alSenalar={senalar}
                alDejarDeSenalar={dejarDeSenalar}
                alVerFicha={verFicha}
                alMarcar={alMarcar}
              />
            </g>
          </svg>
        </div>
      </div>

      {ficha && (
        <DetalleAsignatura
          {...ficha}
          saliendo={!fichaAbierta}
          situacionDe={situacionDeCodigo}
          medida={medida}
          alMarcar={marcarDesdeFicha}
          alCambiarElectiva={alAbrirCasilla}
          alCerrar={() => alSeleccionar(null)}
          alIrA={irAMateria}
          puedeIr={puedeIr}
          alTapar={taparAbajo}
        />
      )}

      {recogida && (
        <AvisoRecogida
          key={recogida.n}
          aviso={recogida}
          alDeshacer={deshacerRecogida}
          alCerrar={cerrarRecogida}
        />
      )}

      <ControlesZoom acercar={acercar} alejar={alejar} encajar={encajar} atenuado={quieto} />
    </div>
  )
}

export default GrafoPensum
