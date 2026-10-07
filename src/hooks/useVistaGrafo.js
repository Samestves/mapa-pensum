import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { escalaDeLectura } from '../layout/camara'
import { ZOOM } from '../layout/constantes'
import {
  AUMENTO_GESTO,
  AUMENTO_VIAJE,
  MARGEN_CAPA,
  capaCubre,
  mismaVista,
  seMueve,
  transformRelativo,
  vistaAdelantada,
  vistaParaViaje,
} from '../layout/vistaViva'
import { moverCapa } from '../layout/moverCapa'
import { relojAplazable } from '../layout/relojAplazable'
import { holguraDe } from '../layout/mantenerRuta'
import {
  acotar,
  acotarVista,
  conZoom,
  frenado,
  velocidadDeLanzamiento,
} from '../layout/limitesVista'
import { esModoLigero } from '../data/ligero'

const MARGEN_ENCAJE = 28

/* Congela lo de dentro del mapa mientras dura un viaje (ver .capa-viajando
   en estilos/mapa.css). En modo ligero no hace falta: ahi el mapa no tiene
   transiciones nunca, y poner y quitar la clase recalculaba el estilo de los
   mil y pico elementos del mapa al salir y al llegar, unos 120 ms por viaje
   en un telefono modesto. */
function congelarCapa(capa, congelada) {
  if (!esModoLigero()) capa?.classList.toggle('capa-viajando', congelada)
}
/* Lo que tarda el mapa en apartarse para enseñar algo, como lo que se
   desbloquea al aprobar: un viaje y no un salto, a una velocidad que el ojo
   pueda seguir. */
const DURACION_MOSTRAR = 420

/* Lo que tiene que llevar quieto el mapa para pintarlo nitido donde quedo.
   Mientras se mueve va estirado (ver layout/vistaViva.js); al parar -los
   dedos quietos, la rueda sin girar, la inercia agotada- se pinta de verdad.
   Lo bastante corto para que no se llegue a ver borroso, y lo bastante largo
   para que entre dos arrastres seguidos no se pinte nada: pintar ahi era
   ocupar el telefono justo cuando el dedo volvia a moverlo. */
const REPOSO_MS = 150
/* Y lo que tarda en darse por terminado un gesto, que es cuando vuelven las
   luces de los cables y el hover. */
const FIN_GESTO_MS = 250

/* El doble toque: cuanto pueden separarse los dos toques en tiempo y en
   espacio, y cuanto acerca */
const DOBLE_TOQUE_MS = 300
const DOBLE_TOQUE_PX = 30
const ACERCA_DOBLE_TOQUE = 2

/**
 * Pan y zoom del grafo. La vista es {x, y, escala} y se aplica como un
 * transform sobre un <g>, no tocando el viewBox: asi el fondo se queda
 * quieto y solo se mueve el contenido.
 *
 * Mover el mapa no es repintarlo. El arrastre, la rueda, el pellizco y los
 * viajes de camara estiran la capa ya pintada en la GPU, y el mapa se pinta
 * cuando se queda quieto (ver layout/vistaViva.js). Solo si un gesto se sale
 * de lo que hay pintado se pinta por el camino, y entonces adelantado hacia
 * donde va, para que no vuelva a hacer falta. Lo que tiene que ir pegado al
 * mapa sin estar dentro de el -la ficha de escritorio- se engancha con
 * `seguir` y se desplaza con la capa.
 *
 * `vistaInicial(medida)` da la vista con la que abre el mapa, o null para
 * abrirlo encajado entero (ver layout/camara.js).
 */
export function useVistaGrafo(anchoContenido, altoContenido, vistaInicial) {
  const contenedorRef = useRef(null)
  const [vista, setVista] = useState({ x: 0, y: 0, escala: 1 })

  /* La vista tambien en una ref, y esta es la que manda.
     El estado existe para que React repinte; la ref para que el zoom pueda
     leer donde esta AHORA sin encadenar actualizaciones funcionales. Con
     setVista(v => ...) no hay forma de animar hacia un destino: haria falta
     calcular el destino dentro del updater, y un updater tiene que ser puro.
     Todo pasa por aplicarVista, asi que las dos nunca se separan. */
  const vistaRef = useRef(vista)
  const [medida, setMedida] = useState({ ancho: 0, alto: 0, arriba: 0 })

  /* La vista viva, ver layout/vistaViva.js.
     capaRef es la capa del contenido; pintadaRef, la vista con la que esta
     pintado ahora mismo. Mientras dura un gesto, vistaRef se adelanta y la
     diferencia entre las dos se aplica a la capa como transform CSS. */
  const capaRef = useRef(null)
  const pintadaRef = useRef(vista)

  /* Lo que va pegado a un punto del mapa sin estar dentro de la capa: cada
     elemento con el punto del mapa al que sigue. Mientras la capa se estira,
     se desplaza lo mismo que ese punto (con `translate`, que no pisa su
     transform); al pintarse la vista nueva, React lo recoloca y el
     desplazamiento vuelve a cero. No se escala: es una ficha, no parte del
     dibujo. */
  const seguidores = useRef(new Map())
  const moverSeguidor = useCallback((el, punto) => {
    const viva = vistaRef.current
    const pintada = pintadaRef.current
    const dx = viva.x - pintada.x + punto.x * (viva.escala - pintada.escala)
    const dy = viva.y - pintada.y + punto.y * (viva.escala - pintada.escala)
    el.style.translate = dx || dy ? `${dx}px ${dy}px` : ''
  }, [])

  const estirarCapa = useCallback(() => {
    const capa = capaRef.current
    if (!capa) return
    const viva = vistaRef.current
    const pintada = pintadaRef.current
    if (mismaVista(viva, pintada)) {
      moverCapa(capa, null)
    } else {
      const { k, x, y } = transformRelativo(viva, pintada)
      moverCapa(capa, `translate(${x}px, ${y}px) scale(${k})`)
    }
    for (const [el, punto] of seguidores.current) moverSeguidor(el, punto)
  }, [moverSeguidor])

  /* Un ref de React para enganchar un elemento al punto (x, y) del mapa. */
  const seguir = useCallback(
    (x, y) => (el) => {
      if (!el) return
      const punto = { x, y }
      seguidores.current.set(el, punto)
      moverSeguidor(el, punto)
      return () => seguidores.current.delete(el)
    },
    [moverSeguidor],
  )

  /* Cuando React pinta una vista nueva, la capa se reajusta en el mismo
     cuadro, antes de que se vea: si los dedos ya van por delante, queda
     estirada lo que falte; si no, sin transform. Hacerlo en un efecto normal
     dejaria un cuadro con el mapa nuevo y el estiramiento viejo encima. */
  useLayoutEffect(() => {
    pintadaRef.current = vista
    estirarCapa()
  }, [vista, estirarCapa])

  /* Pintar la vista a la que llego el gesto. Lo hace el reposo -el mapa
     quieto durante REPOSO_MS-, o antes quien sepa que su gesto termino, como
     levantar los dedos de un pellizco. */
  const pintarDondeQuedo = useCallback(() => {
    if (!mismaVista(vistaRef.current, pintadaRef.current)) setVista(vistaRef.current)
  }, [])
  const [reposo] = useState(() => relojAplazable(REPOSO_MS, pintarDondeQuedo))
  useEffect(() => () => reposo.cancelar(), [reposo])
  const asentarVista = useCallback(() => {
    reposo.cancelar()
    pintarDondeQuedo()
  }, [reposo, pintarDondeQuedo])
  /* La ultima vista que corrio el reposo: solo lo corre un movimiento de
     verdad. Un dedo apoyado tiembla, y si cada temblor contara, el mapa no
     se pintaria nitido hasta levantarlo... o, contando solo para pedir otro
     reposo, se pintaria entero cada 150 ms mientras siguiera apoyado. Asi
     que el temblor no cuenta para nada, y lo que deje sin pintar -un pixel,
     medio por ciento de escala- lo recoge quien da su gesto por acabado
     pidiendo un reposo (reposo.asegurar). */
  const vistaReposo = useRef(vista)

  /* Todo pasa por aqui -arrastre, rueda, pellizco, botones y encaje-, asi que
     acotar en este punto y en ninguno mas basta para que no exista ninguna
     forma de dejar el mapa fuera de la pantalla. Ponerlo en cada gesto seria
     cuatro sitios donde acordarse.

     `enVivo` lo piden los gestos. Si estirar la capa basta, no se toca
     React, y el mapa se pinta cuando el gesto repose. Si no basta -se
     destaparia un borde, o ya no se sabe que se mira-, se pinta ese cuadro,
     adelantado hacia donde va el gesto para no tener que volver a pintar
     enseguida, y se sigue estirando desde ahi. */
  const aplicarVista = useCallback(
    (siguiente, enVivo = false) => {
      const acotada = acotarVista(siguiente, medida, anchoContenido, altoContenido)
      vistaRef.current = acotada
      if (!enVivo) {
        setVista(acotada)
        return
      }

      if (seMueve(vistaReposo.current, acotada, medida)) {
        vistaReposo.current = acotada
        reposo.aplazar()
      }

      const pintada = pintadaRef.current
      const cubre = capaCubre(
        acotada,
        pintada,
        medida,
        anchoContenido,
        altoContenido,
        AUMENTO_GESTO,
        MARGEN_CAPA,
      )
      if (cubre) estirarCapa()
      else setVista(vistaAdelantada(acotada, pintada, medida, MARGEN_CAPA))
    },
    [medida, anchoContenido, altoContenido, estirarCapa, reposo],
  )
  const [arrastrando, setArrastrando] = useState(false)

  /* Cierto mientras se mueve el mapa: arrastre, pellizco o rueda. Sirve para
     congelar las animaciones de los cables durante el gesto, que es cuando el
     tiron se nota y cuando a nadie le importa la corriente. La rueda no tiene
     un "he terminado", asi que se apaga sola un cuarto de segundo despues del
     ultimo evento. `arrastrando` no vale para esto: el pellizco lo pone en
     falso a proposito, para no enseñar el cursor de agarre con dos dedos. */
  const [enGesto, setEnGesto] = useState(false)
  /* Lo mismo, en una ref. El estado sirve para repintar; la ref, para que
     quien tenga que consultarlo dentro de un manejador no dependa de el.
     Los nodos del mapa reciben sus funciones memoizadas, y una que dependiera
     del estado cambiaria de identidad al empezar y al acabar cada gesto,
     tirando abajo el memo de los ciento treinta y un hijos. */
  const refEnGesto = useRef(false)
  const [finGesto] = useState(() =>
    relojAplazable(FIN_GESTO_MS, () => {
      refEnGesto.current = false
      setEnGesto(false)
    }),
  )
  /* Se llama en cada movimiento, asi que hace lo justo: avisar a React la
     primera vez y correr la hora del final. */
  const marcarGesto = useCallback(() => {
    if (!refEnGesto.current) {
      refEnGesto.current = true
      setEnGesto(true)
    }
    finGesto.aplazar()
  }, [finGesto])
  useEffect(() => () => finGesto.cancelar(), [finGesto])

  /* La posicion del contenedor en pantalla, cacheada.
     Leerla con getBoundingClientRect en cada evento de rueda o de pellizco
     era lo que hacia el zoom pastoso: el fotograma anterior acaba de mover
     el <g>, asi que el layout esta invalidado, y pedir una medida obliga al
     navegador a recalcularlo entero -mil seiscientos elementos SVG- antes de
     responder. Escribir, leer, escribir, leer. Medido: eventos de rueda de
     hasta mil milisegundos.
     Solo hace falta de donde empieza el contenedor, y eso cambia al
     redimensionar, no sesenta veces por segundo. */
  const cajaRef = useRef({ left: 0, top: 0 })
  const refrescarCaja = useCallback(() => {
    const el = contenedorRef.current
    if (el) cajaRef.current = el.getBoundingClientRect()
  }, [])

  // El contenedor se re-mide solo: sirve para el encaje inicial y para
  // que cambiar el tamano de la ventana no rompa nada.
  const yaMedido = useRef(false)
  useLayoutEffect(() => {
    const el = contenedorRef.current
    if (!el) return

    // Se mide a mano la primera vez en vez de esperar el callback inicial
    // de ResizeObserver, que no siempre llega. Solo la primera: al volver al
    // mapa desde otra vista (se queda montado, oculto; ver VistaCarrera) la
    // medida ya esta, y medir a mano ahi obligaba a maquetar la pagina
    // entera en el acto, 160 ms a CPU x6. El observador avisa igual si
    // cambio algo mientras estaba oculto. Devolver la medida previa cuando
    // no cambia evita renders en bucle.
    const medir = () => {
      yaMedido.current = true
      const caja = el.getBoundingClientRect()
      cajaRef.current = caja
      const { width, height } = caja
      /* Cuanto de su borde de arriba tapa la cabecera flotante. Se lee del
         CSS al medir y no se vigila: es fijo por breakpoint, asi que basta
         con leerlo cuando cambia el tamaño. */
      const arriba = parseFloat(getComputedStyle(el).getPropertyValue('--reserva-cabecera')) || 0
      setMedida((previa) =>
        previa.ancho === width && previa.alto === height && previa.arriba === arriba
          ? previa
          : { ancho: width, alto: height, arriba },
      )
    }
    if (!yaMedido.current) medir()

    const observador = new ResizeObserver(medir)
    observador.observe(el)
    window.addEventListener('resize', medir)
    return () => {
      observador.disconnect()
      window.removeEventListener('resize', medir)
    }
  }, [])

  // La vista con el grafo completo encajado y centrado
  const vistaEncajada = useCallback(() => {
    if (!medida.ancho || !medida.alto) return null
    const arriba = medida.arriba ?? 0
    const escala = acotar(
      Math.min(
        (medida.ancho - MARGEN_ENCAJE * 2) / anchoContenido,
        (medida.alto - arriba - MARGEN_ENCAJE * 2) / altoContenido,
      ),
      ZOOM.min,
      1,
    )
    return {
      escala,
      x: (medida.ancho - anchoContenido * escala) / 2,
      y: arriba + (medida.alto - arriba - altoContenido * escala) / 2,
    }
  }, [medida, anchoContenido, altoContenido])

  /* Al llegar de golpe a una vista nueva -al abrir el mapa, o al saltar
     entre verlo todo y tu semestre- el mapa se asienta: sube unos pixeles y
     aparece, en vez de cambiar en seco. Es una animacion de la capa, que la
     resuelve la GPU sin repintar el mapa. La clase se quita al acabar: el
     mapa oculto al ir a otra vista se conserva, y una animacion que se
     quedara puesta volveria a arrancar cada vez que se enseña. */
  const llegar = useCallback(() => {
    const capa = capaRef.current
    if (!capa) return
    capa.classList.remove('capa-llegando')
    void capa.offsetWidth
    capa.classList.add('capa-llegando')
    // Solo la suya: las animaciones de las tarjetas de dentro tambien suben
    const acabar = (e) => {
      if (e.target !== capa) return
      capa.classList.remove('capa-llegando')
      capa.removeEventListener('animationend', acabar)
    }
    capa.addEventListener('animationend', acabar)
  }, [])

  /* Encaje automatico la primera vez que se conoce el tamaño del contenedor.
     Hasta que ocurre, la vista vale {0, 0, escala 1}: el mapa entero dibujado
     a tamaño natural desde la esquina. Eso es un fotograma valido que NO hay
     que enseñar -es el tiron que se veia al volver del horario al mapa-, asi
     que se avisa de cuando ya esta colocado y el grafo se revela ahi. */
  const [encajado, setEncajado] = useState(false)
  const yaEncajado = useRef(false)
  useEffect(() => {
    if (yaEncajado.current || !medida.ancho) return
    yaEncajado.current = true
    const inicial = vistaInicial?.(medida) ?? vistaEncajada()
    if (inicial) aplicarVista(inicial)
    setEncajado(true)
    llegar()
  }, [medida, vistaInicial, vistaEncajada, aplicarVista, llegar])

  // Cuadro y red de la animacion de los botones
  const animacion = useRef(0)
  const redZoom = useRef(null)
  // Cuadro de la inercia de un arrastre soltado
  const inercia = useRef(0)
  /* Si el viaje en curso va estirando la capa en vez de pintar cada cuadro.
     Al acabar -o al cortarlo un dedo- se pinta donde se quedo. */
  const enViaje = useRef(false)

  const asentarViaje = useCallback(() => {
    if (!enViaje.current) return
    enViaje.current = false
    congelarCapa(capaRef.current, false)
    if (mismaVista(vistaRef.current, pintadaRef.current)) estirarCapa()
    else setVista(vistaRef.current)
  }, [estirarCapa])

  /* Para lo que se este moviendo solo. La mano manda: un dedo o la rueda
     a mitad de viaje se quedan con el mapa donde iba, en vez de pelearse
     con la animacion cuadro a cuadro. */
  const detenerViaje = useCallback(() => {
    cancelAnimationFrame(animacion.current)
    cancelAnimationFrame(inercia.current)
    clearTimeout(redZoom.current)
    asentarViaje()
  }, [asentarViaje])

  // Zoom manteniendo fijo el punto bajo el cursor. Inmediato: la rueda y el
  // pellizco ya son continuos, el suavizado lo pone la mano del usuario.
  const zoomEn = useCallback(
    (factor, puntoX, puntoY, enVivo = false) => {
      detenerViaje()
      marcarGesto()
      aplicarVista(conZoom(vistaRef.current, factor, puntoX, puntoY), enVivo)
    },
    [detenerViaje, marcarGesto, aplicarVista],
  )

  /**
   * Lleva la vista hasta `hasta` en `duracion` ms, saliendo rapido y
   * frenando al llegar. Durante el viaje cuenta como gesto: el mapa se esta
   * moviendo, asi que el hover se ignora y la luz de los cables se congela
   * en tactil, igual que si lo moviera un dedo.
   *
   * Pintando cada cuadro, como el pellizco antes de vistaViva, en un
   * telefono el viaje iba a trompicones: a CPU x4, treinta y cuarenta ms por
   * cuadro, y al alejarse para enseñar lo que desbloquea aprobar eso es
   * justo lo que se siente como lag. Asi que el mapa se pinta UNA vez, a una
   * vista que tenga dentro la salida y la llegada (ver vistaParaViaje), y el
   * viaje entero es estirar esa capa en la GPU. Si no hay ninguna que sirva,
   * se pinta cada cuadro, como antes.
   */
  const animarHacia = useCallback(
    (hasta, duracion) => {
      cancelAnimationFrame(animacion.current)
      clearTimeout(redZoom.current)
      // El viaje pinta por su cuenta: que no lo pise el reposo de un gesto de antes
      reposo.cancelar()
      const desde = vistaRef.current
      const destino = acotarVista(hasta, medida, anchoContenido, altoContenido)
      const base = vistaParaViaje(
        desde,
        destino,
        medida,
        anchoContenido,
        altoContenido,
        MARGEN_CAPA,
      )

      if (base) {
        enViaje.current = true
        congelarCapa(capaRef.current, true)
        // Se pinta una sola vez; el efecto de arriba estira la capa en el
        // mismo cuadro para que se siga viendo `desde` hasta que arranque
        if (!mismaVista(base, pintadaRef.current)) setVista(base)
        else estirarCapa()
      } else {
        asentarViaje()
      }

      /* El reloj arranca en el primer cuadro y no al pedir el viaje. Aprobar
         pinta la materia, cierra la ficha y saca el aviso en ese mismo
         instante, y ese primer cuadro tarda: contando desde antes, el mapa
         se comia media animacion de golpe y el resto se arrastraba. */
      let inicio = null
      const paso = (ahora) => {
        if (inicio == null) {
          inicio = ahora
          programarRed(duracion + 200)
        }
        const t = Math.min((ahora - inicio) / duracion, 1)
        // easeOutCubic: sale rapido y frena al llegar
        const k = 1 - Math.pow(1 - t, 3)
        const v = {
          escala: desde.escala + (destino.escala - desde.escala) * k,
          x: desde.x + (destino.x - desde.x) * k,
          y: desde.y + (destino.y - desde.y) * k,
        }
        if (!enViaje.current) aplicarVista(v)
        else {
          vistaRef.current = v
          const cubre = capaCubre(
            v,
            pintadaRef.current,
            medida,
            anchoContenido,
            altoContenido,
            AUMENTO_VIAJE,
            MARGEN_CAPA,
          )
          if (cubre) estirarCapa()
          else setVista(v)
        }
        if (t < 1) {
          marcarGesto()
          animacion.current = requestAnimationFrame(paso)
        } else {
          clearTimeout(redZoom.current)
          asentarViaje()
        }
      }

      /* Red por si requestAnimationFrame no corre: la vista tiene que acabar
         en su destino aunque la animacion no llegue a pintarse. Se vuelve a
         armar en el primer cuadro, que es cuando arranca el reloj: armada
         solo aqui, un primer cuadro lento -un telefono modesto aprobando-
         la hacia saltar a mitad de viaje y el mapa llegaba de golpe. */
      const programarRed = (ms) => {
        clearTimeout(redZoom.current)
        redZoom.current = setTimeout(() => {
          cancelAnimationFrame(animacion.current)
          if (enViaje.current) {
            vistaRef.current = destino
            asentarViaje()
          } else aplicarVista(destino)
        }, ms)
      }

      marcarGesto()
      animacion.current = requestAnimationFrame(paso)
      programarRed(duracion + 1000)
    },
    [
      medida,
      anchoContenido,
      altoContenido,
      estirarCapa,
      asentarViaje,
      aplicarVista,
      marcarGesto,
      reposo,
    ],
  )

  /**
   * Mueve la vista lo justo para que se vea `caja` -un rectangulo en
   * coordenadas del mapa- dentro de los margenes que se le den.
   *
   * Lo justo es lo justo: si ya se ve, no se mueve nada, y si asoma por un
   * lado solo se corre ese lado. Centrarla siempre haria saltar el mapa
   * aunque ya estuviera a la vista, y el ojo perderia lo que estaba mirando.
   * Si no cabe a la escala de ahora se aleja lo necesario; acercarse, nunca:
   * quien estaba mirando el mapa de lejos no pidio que se lo acercaran.
   */
  const mostrar = useCallback(
    (caja, margenes = {}) => {
      if (!medida.ancho || !medida.alto) return
      const m = { arriba: 40 + (medida.arriba ?? 0), abajo: 40, izq: 40, der: 40, ...margenes }
      const v = vistaRef.current
      const libreX = medida.ancho - m.izq - m.der
      const libreY = medida.alto - m.arriba - m.abajo
      const escala = acotar(
        Math.min(v.escala, libreX / (caja.x1 - caja.x0), libreY / (caja.y1 - caja.y0)),
        ZOOM.min,
        ZOOM.max,
      )

      // Al alejarse, el centro de la caja se queda donde estaba en pantalla
      const cx = (caja.x0 + caja.x1) / 2
      const cy = (caja.y0 + caja.y1) / 2
      const x = v.x + cx * (v.escala - escala)
      const y = v.y + cy * (v.escala - escala)

      const correr = (pos, a, b, min, max) => {
        const inicio = pos + a * escala
        const fin = pos + b * escala
        if (fin - inicio > max - min) return pos + (min + max) / 2 - (inicio + fin) / 2
        if (inicio < min) return pos + min - inicio
        if (fin > max) return pos - (fin - max)
        return pos
      }
      const hasta = {
        escala,
        x: correr(x, caja.x0, caja.x1, m.izq, medida.ancho - m.der),
        y: correr(y, caja.y0, caja.y1, m.arriba, medida.alto - m.abajo),
      }
      const quieta =
        Math.abs(hasta.x - v.x) < 1 &&
        Math.abs(hasta.y - v.y) < 1 &&
        Math.abs(hasta.escala - v.escala) < 0.001
      if (!quieta) animarHacia(hasta, DURACION_MOSTRAR)
    },
    [medida, animarHacia],
  )
  useEffect(
    () => () => {
      cancelAnimationFrame(animacion.current)
      clearTimeout(redZoom.current)
    },
    [],
  )

  /* La rueda se engancha a mano porque React registra onWheel como pasivo
     y ahi preventDefault() no hace nada.

     Los eventos se acumulan y se aplican UNO por fotograma. Un raton bueno o
     un trackpad disparan mas eventos de rueda que fotogramas tiene la
     pantalla, y sin agrupar cada uno forzaba su propio ciclo de recalculo
     para un zoom que nadie llega a ver. Sumar el desplazamiento y aplicarlo
     una vez da exactamente el mismo destino con una fraccion del trabajo.

     Y en vivo, como el pellizco: la rueda estira la capa y el mapa se pinta
     nitido cuando deja de girar, que es cuando reposa (ver REPOSO_MS). Antes
     cada cuadro de rueda repintaba el mapa entero a la escala nueva, y en un
     portatil eso era el zoom a tirones. */
  useEffect(() => {
    const el = contenedorRef.current
    if (!el) return

    let acumulado = 0
    let cuadro = 0
    let puntero = { x: 0, y: 0 }

    const alRodar = (e) => {
      e.preventDefault()
      acumulado += e.deltaY
      puntero = { x: e.clientX, y: e.clientY }
      if (cuadro) return
      cuadro = requestAnimationFrame(() => {
        cuadro = 0
        const paso = acumulado
        acumulado = 0
        const { left, top } = cajaRef.current
        zoomEn(Math.exp(-paso * 0.0015), puntero.x - left, puntero.y - top, true)
        // La rueda no avisa de cuando termina: cada giro puede ser el ultimo
        reposo.asegurar()
      })
    }

    el.addEventListener('wheel', alRodar, { passive: false })
    return () => {
      el.removeEventListener('wheel', alRodar)
      cancelAnimationFrame(cuadro)
    }
  }, [zoomEn, reposo])

  // --- Arrastre y pellizco ----------------------------------------------
  // Se lleva la cuenta de los punteros activos: uno = mover, dos = pellizcar
  const punteros = useRef(new Map())
  const arrastre = useRef(null)
  const pellizco = useRef(null)
  // Distingue un click de un arrastre: si el puntero se movio, no es click
  const huboMovimiento = useRef(false)
  // Los ultimos puntos del arrastre, para saber a que velocidad se solto
  const muestras = useRef([])
  // El toque anterior, para reconocer el doble toque
  const ultimoToque = useRef(null)
  // Si el gesto en curso ha sido de un solo dedo de principio a fin
  const deUnDedo = useRef(false)

  /* Soltar un arrastre con velocidad lo deja seguir solo y frenar poco a
     poco, como cualquier lista o mapa de un telefono. Parado en seco, cada
     arrastre largo pedia tres o cuatro arrastres cortos. Si choca con el
     borde, ese eje se para.

     Como el arrastre, va estirando la capa (en vivo) y se pinta una vez al
     pararse, cuando reposa. */
  const lanzar = () => {
    const m = muestras.current
    muestras.current = []
    const lanzamiento = velocidadDeLanzamiento(m, performance.now())
    if (!lanzamiento) return
    let { vx, vy } = lanzamiento

    let previo = null
    const paso = (ahora) => {
      if (previo != null) {
        const d = Math.min(32, ahora - previo)
        const v = vistaRef.current
        const quiere = { ...v, x: v.x + vx * d, y: v.y + vy * d }
        aplicarVista(quiere, true)
        const llego = vistaRef.current
        if (Math.abs(llego.x - quiere.x) > 0.5) vx = 0
        if (Math.abs(llego.y - quiere.y) > 0.5) vy = 0
        const f = frenado(d)
        vx *= f
        vy *= f
        if (Math.hypot(vx, vy) < 0.02) {
          reposo.asegurar()
          return
        }
      }
      previo = ahora
      marcarGesto()
      inercia.current = requestAnimationFrame(paso)
    }
    inercia.current = requestAnimationFrame(paso)
  }

  /* Doble toque en el lienzo: acerca al doble alrededor del dedo, que es
     lo que hace cualquier mapa. Si ya estas muy cerca, vuelve a la escala a
     la que se lee el mapa. Solo en el vacio: un toque en una tarjeta abre
     su ficha. */
  const dobleToque = (px, py) => {
    const v = vistaRef.current
    const lectura = escalaDeLectura(medida.ancho)
    const factor = v.escala >= 1.6 ? lectura / v.escala : ACERCA_DOBLE_TOQUE
    animarHacia(conZoom(v, factor, px, py), 300)
  }

  const medirPellizco = () => {
    const [a, b] = [...punteros.current.values()]
    const { left, top } = cajaRef.current
    return {
      distancia: Math.hypot(a.x - b.x, a.y - b.y),
      centroX: (a.x + b.x) / 2 - left,
      centroY: (a.y + b.y) / 2 - top,
    }
  }

  /* El pellizco se aplica una vez por cuadro. Cada dedo manda su propio
     movimiento, asi que en cada cuadro llegan dos, y con cada uno se hacia el
     zoom entero para que solo se viera el segundo. */
  const cuadroPellizco = useRef(0)
  const aplicarPellizco = () => {
    cuadroPellizco.current = 0
    if (punteros.current.size < 2 || !pellizco.current) return
    const ahora = medirPellizco()
    if (pellizco.current.distancia > 0) {
      zoomEn(ahora.distancia / pellizco.current.distancia, ahora.centroX, ahora.centroY, true)
    }
    pellizco.current = ahora
  }
  useEffect(() => () => cancelAnimationFrame(cuadroPellizco.current), [])

  const alPresionar = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    detenerViaje()
    /* Si el mapa estaba a punto de pintarse tras el gesto anterior, que
       espere: este dedo viene a moverlo otra vez, y pintar ahora seria tener
       el telefono ocupado justo en sus primeros cuadros. */
    reposo.aplazar()
    // Una sola medida por gesto, no una por movimiento
    refrescarCaja()
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    huboMovimiento.current = false
    muestras.current = []
    deUnDedo.current = punteros.current.size === 1

    // Ojo: aqui NO se captura el puntero. Capturarlo en el pointerdown
    // redirige el click al elemento capturador, y entonces los botones
    // dibujados dentro del SVG dejan de recibir sus clicks. Se captura
    // solo cuando el arrastre empieza de verdad (ver alMover).
    if (punteros.current.size === 2) {
      arrastre.current = null
      pellizco.current = medirPellizco()
      setArrastrando(false)
    } else if (punteros.current.size === 1) {
      const v = vistaRef.current
      arrastre.current = { x: e.clientX, y: e.clientY, vx: v.x, vy: v.y, capturado: false }
    }
  }

  const alMover = (e) => {
    if (!punteros.current.has(e.pointerId)) return
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (punteros.current.size >= 2 && pellizco.current) {
      huboMovimiento.current = true
      if (!cuadroPellizco.current) {
        cuadroPellizco.current = requestAnimationFrame(aplicarPellizco)
      }
      return
    }

    const inicio = arrastre.current
    if (!inicio) return
    const dx = e.clientX - inicio.x
    const dy = e.clientY - inicio.y

    // Solo a partir del umbral esto es un arrastre. Ahi si se captura el
    // puntero, para no perderlo si el cursor se sale del lienzo. Con el dedo
    // el umbral es mas ancho: un dedo apoyado tiembla, y con 3 px mantenerlo
    // en una tarjeta movia el mapa en vez de cargar su ruta (ver
    // layout/mantenerRuta.js).
    if (!inicio.capturado && Math.hypot(dx, dy) > holguraDe(e.pointerType)) {
      inicio.capturado = true
      huboMovimiento.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
      /* El cursor de agarre solo existe con raton. Con el dedo no se ve, y
         cambiarlo no sale gratis: el cursor se hereda, asi que el cambio de
         clase recalcula el estilo de los setecientos elementos del mapa justo
         en el primer cuadro del arrastre. */
      if (e.pointerType === 'mouse') setArrastrando(true)
    }
    if (!inicio.capturado) return

    marcarGesto()
    /* En vivo: el arrastre desplaza la capa ya pintada en la GPU, y solo se
       repinta al soltar o al pasar del margen que se pinto alrededor. */
    aplicarVista({ ...vistaRef.current, x: inicio.vx + dx, y: inicio.vy + dy }, true)
    const ahora = performance.now()
    muestras.current.push({ t: ahora, x: e.clientX, y: e.clientY })
    while (muestras.current.length > 2 && ahora - muestras.current[0].t > 100) {
      muestras.current.shift()
    }
  }

  const alSoltar = (e) => {
    // El ultimo movimiento del pellizco, si aun esperaba su cuadro
    if (cuadroPellizco.current) {
      cancelAnimationFrame(cuadroPellizco.current)
      aplicarPellizco()
    }
    punteros.current.delete(e.pointerId)
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    const tactil = e.pointerType !== 'mouse' && e.type === 'pointerup'
    const eraArrastre = arrastre.current?.capturado && deUnDedo.current
    /* Al levantar un dedo del pellizco no se reanuda el arrastre con el otro:
       haria un salto feo. Hace falta volver a tocar. Y se pinta ya, sin
       esperar al reposo: el pellizco deja el mapa a otra escala, borroso, y
       quien suelta es porque ya esta donde queria mirar. */
    if (pellizco.current) asentarVista()
    pellizco.current = null
    arrastre.current = null
    if (punteros.current.size === 0) setArrastrando(false)

    /* Un arrastre no se pinta al soltar: lo pinta el reposo. La capa solo
       quedo corrida, sin estirar, asi que se ve igual de nitida, y si el dedo
       vuelve enseguida -que es como se recorre el mapa, a base de arrastres
       seguidos- no hay nada pintandose cuando empieza a moverlo. */
    if (tactil && eraArrastre) lanzar()
    reposo.asegurar()

    // Un toque limpio de un dedo en el vacio: puede ser la mitad de un doble toque
    if (tactil && deUnDedo.current && !huboMovimiento.current && punteros.current.size === 0) {
      if (e.target.closest?.('.grupo-nodo, button')) return
      const ahora = performance.now()
      const antes = ultimoToque.current
      if (
        antes &&
        ahora - antes.t < DOBLE_TOQUE_MS &&
        Math.hypot(e.clientX - antes.x, e.clientY - antes.y) < DOBLE_TOQUE_PX
      ) {
        ultimoToque.current = null
        const { left, top } = cajaRef.current
        dobleToque(e.clientX - left, e.clientY - top)
      } else {
        ultimoToque.current = { t: ahora, x: e.clientX, y: e.clientY }
      }
    }
  }

  return {
    contenedorRef,
    capaRef,
    seguir,
    vista,
    medida,
    encajado,
    arrastrando,
    enGesto,
    refEnGesto,
    huboMovimiento,
    mostrar,
    controlesArrastre: {
      onPointerDown: alPresionar,
      onPointerMove: alMover,
      onPointerUp: alSoltar,
      onPointerCancel: alSoltar,
    },
  }
}
