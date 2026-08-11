import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ZOOM } from '../layout/constantes'

const MARGEN_ENCAJE = 28
/* Lo que tarda el zoom de los botones en llegar a su destino */
const DURACION_ZOOM = 220

const acotar = (v, min, max) => Math.min(Math.max(v, min), max)

/**
 * Pan y zoom del grafo. La vista es {x, y, escala} y se aplica como un
 * transform sobre un <g>, no tocando el viewBox: asi el fondo se queda
 * quieto y solo se mueve el contenido.
 */
export function useVistaGrafo(anchoContenido, altoContenido) {
  const contenedorRef = useRef(null)
  const [vista, setVista] = useState({ x: 0, y: 0, escala: 1 })

  /* La vista tambien en una ref, y esta es la que manda.
     El estado existe para que React repinte; la ref para que el zoom pueda
     leer donde esta AHORA sin encadenar actualizaciones funcionales. Con
     setVista(v => ...) no hay forma de animar hacia un destino: haria falta
     calcular el destino dentro del updater, y un updater tiene que ser puro.
     Todo pasa por aplicarVista, asi que las dos nunca se separan. */
  const vistaRef = useRef(vista)
  const aplicarVista = useCallback((siguiente) => {
    vistaRef.current = siguiente
    setVista(siguiente)
  }, [])
  const [medida, setMedida] = useState({ ancho: 0, alto: 0 })
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
  const relojGesto = useRef(null)
  const marcarGesto = useCallback(() => {
    refEnGesto.current = true
    setEnGesto(true)
    clearTimeout(relojGesto.current)
    relojGesto.current = setTimeout(() => {
      refEnGesto.current = false
      setEnGesto(false)
    }, 250)
  }, [])
  useEffect(() => () => clearTimeout(relojGesto.current), [])

  /* La posicion del contenedor en pantalla, cacheada.
     Leerla con getBoundingClientRect en cada evento de rueda o de pellizco
     era lo que hacia el zoom pastoso: el fotograma anterior acaba de mover
     el <g>, asi que el layout esta invalidado, y pedir una medida obliga al
     navegador a recalcularlo entero -mil seiscientos elementos SVG- antes de
     responder. Escribir, leer, escribir, leer. Medido: eventos de rueda de
     hasta mil milisegundos.
     Solo hace falta de donde empieza el contenedor, y eso cambia al
     redimensionar o al plegar la barra, no sesenta veces por segundo. */
  const cajaRef = useRef({ left: 0, top: 0 })
  const refrescarCaja = useCallback(() => {
    const el = contenedorRef.current
    if (el) cajaRef.current = el.getBoundingClientRect()
  }, [])

  // El contenedor se re-mide solo: sirve para el encaje inicial y para
  // que cambiar el tamano de la ventana no rompa nada.
  useLayoutEffect(() => {
    const el = contenedorRef.current
    if (!el) return

    // Se mide a mano una primera vez en vez de esperar el callback inicial
    // de ResizeObserver, que no siempre llega. Devolver la medida previa
    // cuando no cambia evita renders en bucle.
    const medir = () => {
      const caja = el.getBoundingClientRect()
      cajaRef.current = caja
      const { width, height } = caja
      setMedida((previa) =>
        previa.ancho === width && previa.alto === height
          ? previa
          : { ancho: width, alto: height },
      )
    }
    medir()

    const observador = new ResizeObserver(medir)
    observador.observe(el)
    window.addEventListener('resize', medir)
    return () => {
      observador.disconnect()
      window.removeEventListener('resize', medir)
    }
  }, [])

  // Encaja el grafo completo y lo centra
  const encajar = useCallback(() => {
    if (!medida.ancho || !medida.alto) return
    const escala = acotar(
      Math.min(
        (medida.ancho - MARGEN_ENCAJE * 2) / anchoContenido,
        (medida.alto - MARGEN_ENCAJE * 2) / altoContenido,
      ),
      ZOOM.min,
      1,
    )
    aplicarVista({
      escala,
      x: (medida.ancho - anchoContenido * escala) / 2,
      y: (medida.alto - altoContenido * escala) / 2,
    })
  }, [medida, anchoContenido, altoContenido, aplicarVista])

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
    encajar()
    setEncajado(true)
  }, [medida, encajar])

  // Cuadro y red de la animacion de los botones
  const animacion = useRef(0)
  const redZoom = useRef(null)

  /** Donde queda la vista al aplicar un factor de zoom dejando fijo un punto */
  const conZoom = (v, factor, puntoX, puntoY) => {
    const escala = acotar(v.escala * factor, ZOOM.min, ZOOM.max)
    const k = escala / v.escala
    return { escala, x: puntoX - (puntoX - v.x) * k, y: puntoY - (puntoY - v.y) * k }
  }

  // Zoom manteniendo fijo el punto bajo el cursor. Inmediato: la rueda y el
  // pellizco ya son continuos, el suavizado lo pone la mano del usuario.
  const zoomEn = useCallback(
    (factor, puntoX, puntoY) => {
      marcarGesto()
      aplicarVista(conZoom(vistaRef.current, factor, puntoX, puntoY))
    },
    [marcarGesto, aplicarVista],
  )

  /**
   * Zoom de los botones, deslizando en vez de saltando.
   *
   * Un boton no es un gesto continuo: no hay dedo ni rueda que reparta el
   * cambio en el tiempo, asi que sin animar la vista aparecia de golpe un
   * treinta por ciento mas cerca y el ojo perdia donde estaba mirando. Dos
   * decimas de segundo con una curva que frena al final bastan para que el
   * salto se lea como un movimiento.
   */
  const zoomAlCentro = useCallback(
    (factor) => {
      cancelAnimationFrame(animacion.current)
      const desde = vistaRef.current
      const hasta = conZoom(desde, factor, medida.ancho / 2, medida.alto / 2)
      // Si el zoom ya esta topado no hay nada que animar
      if (hasta.escala === desde.escala) return

      const inicio = performance.now()
      const paso = (ahora) => {
        const t = Math.min((ahora - inicio) / DURACION_ZOOM, 1)
        // easeOutCubic: sale rapido y frena al llegar
        const k = 1 - Math.pow(1 - t, 3)
        aplicarVista({
          escala: desde.escala + (hasta.escala - desde.escala) * k,
          x: desde.x + (hasta.x - desde.x) * k,
          y: desde.y + (hasta.y - desde.y) * k,
        })
        if (t < 1) animacion.current = requestAnimationFrame(paso)
      }

      marcarGesto()
      animacion.current = requestAnimationFrame(paso)
      // Red por si requestAnimationFrame no corre: la vista tiene que
      // acabar en su destino aunque la animacion no llegue a pintarse.
      clearTimeout(redZoom.current)
      redZoom.current = setTimeout(() => {
        cancelAnimationFrame(animacion.current)
        aplicarVista(hasta)
      }, DURACION_ZOOM + 200)
    },
    [medida, aplicarVista, marcarGesto],
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
     una vez da exactamente el mismo destino con una fraccion del trabajo. */
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
        zoomEn(Math.exp(-paso * 0.0015), puntero.x - left, puntero.y - top)
      })
    }

    el.addEventListener('wheel', alRodar, { passive: false })
    return () => {
      el.removeEventListener('wheel', alRodar)
      cancelAnimationFrame(cuadro)
    }
  }, [zoomEn])

  // --- Arrastre y pellizco ----------------------------------------------
  // Se lleva la cuenta de los punteros activos: uno = mover, dos = pellizcar
  const punteros = useRef(new Map())
  const arrastre = useRef(null)
  const pellizco = useRef(null)
  // Distingue un click de un arrastre: si el puntero se movio, no es click
  const huboMovimiento = useRef(false)

  const medirPellizco = () => {
    const [a, b] = [...punteros.current.values()]
    const { left, top } = cajaRef.current
    return {
      distancia: Math.hypot(a.x - b.x, a.y - b.y),
      centroX: (a.x + b.x) / 2 - left,
      centroY: (a.y + b.y) / 2 - top,
    }
  }

  const alPresionar = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    // Una sola medida por gesto, no una por movimiento
    refrescarCaja()
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    huboMovimiento.current = false

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
      const ahora = medirPellizco()
      if (pellizco.current.distancia > 0) {
        zoomEn(ahora.distancia / pellizco.current.distancia, ahora.centroX, ahora.centroY)
      }
      pellizco.current = ahora
      huboMovimiento.current = true
      return
    }

    const inicio = arrastre.current
    if (!inicio) return
    const dx = e.clientX - inicio.x
    const dy = e.clientY - inicio.y

    // Solo a partir del umbral esto es un arrastre. Ahi si se captura el
    // puntero, para no perderlo si el cursor se sale del lienzo.
    if (!inicio.capturado && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      inicio.capturado = true
      huboMovimiento.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
      setArrastrando(true)
    }
    if (!inicio.capturado) return

    marcarGesto()
    aplicarVista({ ...vistaRef.current, x: inicio.vx + dx, y: inicio.vy + dy })
  }

  const alSoltar = (e) => {
    punteros.current.delete(e.pointerId)
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    // Al levantar un dedo del pellizco no se reanuda el arrastre con el otro:
    // haria un salto feo. Hace falta volver a tocar.
    pellizco.current = null
    arrastre.current = null
    if (punteros.current.size === 0) setArrastrando(false)
  }

  return {
    contenedorRef,
    vista,
    medida,
    encajado,
    arrastrando,
    enGesto,
    refEnGesto,
    huboMovimiento,
    encajar,
    acercar: () => zoomAlCentro(ZOOM.paso),
    alejar: () => zoomAlCentro(1 / ZOOM.paso),
    controlesArrastre: {
      onPointerDown: alPresionar,
      onPointerMove: alMover,
      onPointerUp: alSoltar,
      onPointerCancel: alSoltar,
    },
  }
}
