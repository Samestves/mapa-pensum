import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ZOOM } from '../layout/constantes'

const MARGEN_ENCAJE = 28

const acotar = (v, min, max) => Math.min(Math.max(v, min), max)

/**
 * Pan y zoom del grafo. La vista es {x, y, escala} y se aplica como un
 * transform sobre un <g>, no tocando el viewBox: asi el fondo se queda
 * quieto y solo se mueve el contenido.
 */
export function useVistaGrafo(anchoContenido, altoContenido) {
  const contenedorRef = useRef(null)
  const [vista, setVista] = useState({ x: 0, y: 0, escala: 1 })
  const [medida, setMedida] = useState({ ancho: 0, alto: 0 })
  const [arrastrando, setArrastrando] = useState(false)

  /* Cierto mientras se mueve el mapa: arrastre, pellizco o rueda. Sirve para
     congelar las animaciones de los cables durante el gesto, que es cuando el
     tiron se nota y cuando a nadie le importa la corriente. La rueda no tiene
     un "he terminado", asi que se apaga sola un cuarto de segundo despues del
     ultimo evento. `arrastrando` no vale para esto: el pellizco lo pone en
     falso a proposito, para no enseñar el cursor de agarre con dos dedos. */
  const [enGesto, setEnGesto] = useState(false)
  const relojGesto = useRef(null)
  const marcarGesto = useCallback(() => {
    setEnGesto(true)
    clearTimeout(relojGesto.current)
    relojGesto.current = setTimeout(() => setEnGesto(false), 250)
  }, [])
  useEffect(() => () => clearTimeout(relojGesto.current), [])

  // El contenedor se re-mide solo: sirve para el encaje inicial y para
  // que cambiar el tamano de la ventana no rompa nada.
  useLayoutEffect(() => {
    const el = contenedorRef.current
    if (!el) return

    // Se mide a mano una primera vez en vez de esperar el callback inicial
    // de ResizeObserver, que no siempre llega. Devolver la medida previa
    // cuando no cambia evita renders en bucle.
    const medir = () => {
      const { width, height } = el.getBoundingClientRect()
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
    setVista({
      escala,
      x: (medida.ancho - anchoContenido * escala) / 2,
      y: (medida.alto - altoContenido * escala) / 2,
    })
  }, [medida, anchoContenido, altoContenido])

  // Encaje automatico la primera vez que se conoce el tamano del contenedor
  const yaEncajado = useRef(false)
  useEffect(() => {
    if (yaEncajado.current || !medida.ancho) return
    yaEncajado.current = true
    encajar()
  }, [medida, encajar])

  // Zoom manteniendo fijo el punto bajo el cursor
  const zoomEn = useCallback(
    (factor, puntoX, puntoY) => {
      marcarGesto()
      setVista((v) => {
        const escala = acotar(v.escala * factor, ZOOM.min, ZOOM.max)
        const k = escala / v.escala
        return {
          escala,
          x: puntoX - (puntoX - v.x) * k,
          y: puntoY - (puntoY - v.y) * k,
        }
      })
    },
    [marcarGesto],
  )

  const zoomAlCentro = useCallback(
    (factor) => zoomEn(factor, medida.ancho / 2, medida.alto / 2),
    [zoomEn, medida],
  )

  // La rueda se engancha a mano porque React registra onWheel como pasivo
  // y ahi preventDefault() no hace nada.
  useEffect(() => {
    const el = contenedorRef.current
    if (!el) return
    const alRodar = (e) => {
      e.preventDefault()
      const caja = el.getBoundingClientRect()
      zoomEn(Math.exp(-e.deltaY * 0.0015), e.clientX - caja.left, e.clientY - caja.top)
    }
    el.addEventListener('wheel', alRodar, { passive: false })
    return () => el.removeEventListener('wheel', alRodar)
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
    const caja = contenedorRef.current.getBoundingClientRect()
    return {
      distancia: Math.hypot(a.x - b.x, a.y - b.y),
      centroX: (a.x + b.x) / 2 - caja.left,
      centroY: (a.y + b.y) / 2 - caja.top,
    }
  }

  const alPresionar = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
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
      arrastre.current = { x: e.clientX, y: e.clientY, vx: vista.x, vy: vista.y, capturado: false }
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
    setVista((v) => ({ ...v, x: inicio.vx + dx, y: inicio.vy + dy }))
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
    arrastrando,
    enGesto,
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
