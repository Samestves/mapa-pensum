import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ZOOM } from '../layout/constantes'
import { escalaDeLectura } from '../layout/camara'
import {
  AUMENTO_VIAJE,
  capaCubre,
  mismaVista,
  transformRelativo,
  vistaParaViaje,
} from '../layout/vistaViva'

const MARGEN_ENCAJE = 28
/* Lo que tarda el zoom de los botones en llegar a su destino */
const DURACION_ZOOM = 220
/* Y lo que tarda el mapa en apartarse para enseñar algo, como lo que se
   desbloquea al aprobar: mas despacio que un boton, porque es un viaje y no
   un paso, y el ojo tiene que poder seguirlo. */
const DURACION_MOSTRAR = 420

const acotar = (v, min, max) => Math.min(Math.max(v, min), max)

/* El doble toque: cuanto pueden separarse los dos toques en tiempo y en
   espacio, y cuanto acerca */
const DOBLE_TOQUE_MS = 300
const DOBLE_TOQUE_PX = 30
const ACERCA_DOBLE_TOQUE = 2
/* La inercia al soltar un arrastre: la velocidad que hace falta para que
   siga solo, y cuanto tarda en perder dos tercios de ella. 325 ms es la
   friccion de los desplazamientos de iOS: largo y suave al final. */
const LANZAMIENTO_MIN = 0.25
const FRICCION_MS = 325

/* Cuanto se deja pasar del borde del contenido. Un poco de aire evita que
   llegar al final se sienta como chocar contra una pared. */
const MARGEN_PAN = 96

/**
 * Deja la vista dentro de los limites: el mapa no se puede perder.
 *
 * Sin esto se podia arrastrar indefinidamente en cualquier direccion y
 * acabar mirando una cuadricula vacia, sin nada en pantalla que dijera hacia
 * donde estaba el mapa ni cuanto habia que volver. El unico camino de vuelta
 * era el boton de encajar, y hay que saber que existe.
 *
 * No es una cuestion de rendimiento, aunque lo parezca: el contenido es un
 * <g> con un transform, siempre los mismos elementos, y el navegador descarta
 * lo que cae fuera del viewport. Medido, desplazarse a cincuenta mil pixeles
 * sale MAS barato que tener el mapa a la vista -21 ms contra 35 por sesenta
 * desplazamientos- porque no hay nada que rasterizar. Esto se arregla porque
 * se puede uno perder, no porque cueste.
 *
 * El rango se calcula igual que el de una barra de desplazamiento: el borde
 * de arriba del contenido no puede bajar mas de un margen por debajo del
 * borde de la ventana, y el de abajo no puede subir mas de un margen por
 * encima del suyo.
 *
 * Cuando el contenido es MAS PEQUEÑO que la ventana -mapa alejado- esos dos
 * limites se cruzan, y ahi el intervalo se lee al reves: en vez de dejar
 * recorrer el contenido, acota por donde puede moverse dentro de la ventana.
 * Por eso se ordenan en vez de asumir cual es cual; asumirlo daba un rango
 * vacio y clavaba el mapa en un punto.
 */
/* En el telefono la ficha tapa la parte de abajo del mapa. Para que una
   materia de la ultima fila pueda subir a la vista por encima de ella, el
   mapa se deja subir mas alla de su borde inferior: hasta que ese borde
   quede cerca de la mitad de la pantalla. En escritorio la ficha va al lado
   y no hace falta. */
const HOLGURA_TELEFONO = 0.62
const ANCHO_TELEFONO = 768

export function acotarVista(v, medida, anchoContenido, altoContenido) {
  if (!medida.ancho || !medida.alto) return v

  const rango = (ventana, contenido, extra = 0) => {
    const tope = MARGEN_PAN
    const suelo = ventana - contenido - MARGEN_PAN - extra
    return suelo <= tope ? [suelo, tope] : [tope, suelo]
  }

  const extraAbajo = medida.ancho < ANCHO_TELEFONO ? medida.alto * HOLGURA_TELEFONO : 0
  const [minX, maxX] = rango(medida.ancho, anchoContenido * v.escala)
  const [minY, maxY] = rango(medida.alto, altoContenido * v.escala, extraAbajo)
  return { ...v, x: acotar(v.x, minX, maxX), y: acotar(v.y, minY, maxY) }
}

/**
 * Pan y zoom del grafo. La vista es {x, y, escala} y se aplica como un
 * transform sobre un <g>, no tocando el viewBox: asi el fondo se queda
 * quieto y solo se mueve el contenido.
 *
 * `fichaAnclada` es una ref que dice si hay una ficha colocada al lado de su
 * tarjeta, que es lo que decide como se hacen los viajes de camara (ver
 * animarHacia).
 *
 * `vistaInicial(medida)` da la vista con la que abre el mapa, o null para
 * abrirlo encajado entero (ver layout/camara.js).
 */
export function useVistaGrafo(anchoContenido, altoContenido, fichaAnclada, vistaInicial) {
  const contenedorRef = useRef(null)
  const [vista, setVista] = useState({ x: 0, y: 0, escala: 1 })

  /* La vista tambien en una ref, y esta es la que manda.
     El estado existe para que React repinte; la ref para que el zoom pueda
     leer donde esta AHORA sin encadenar actualizaciones funcionales. Con
     setVista(v => ...) no hay forma de animar hacia un destino: haria falta
     calcular el destino dentro del updater, y un updater tiene que ser puro.
     Todo pasa por aplicarVista, asi que las dos nunca se separan. */
  const vistaRef = useRef(vista)
  const [medida, setMedida] = useState({ ancho: 0, alto: 0 })

  /* El pellizco en vivo, ver layout/vistaViva.js.
     capaRef es el <svg> del contenido; pintadaRef, la vista con la que esta
     pintado ahora mismo. Mientras los dedos se mueven, vistaRef se adelanta
     y la diferencia entre las dos se aplica a la capa como transform CSS. */
  const capaRef = useRef(null)
  const pintadaRef = useRef(vista)

  const estirarCapa = useCallback(() => {
    const capa = capaRef.current
    if (!capa) return
    const viva = vistaRef.current
    const pintada = pintadaRef.current
    if (mismaVista(viva, pintada)) {
      capa.style.transform = ''
      return
    }
    const { k, x, y } = transformRelativo(viva, pintada)
    capa.style.transform = `translate(${x}px, ${y}px) scale(${k})`
  }, [])

  /* Cuando React pinta una vista nueva, la capa se reajusta en el mismo
     cuadro, antes de que se vea: si los dedos ya van por delante, queda
     estirada lo que falte; si no, sin transform. Hacerlo en un efecto normal
     dejaria un cuadro con el mapa nuevo y el estiramiento viejo encima. */
  useLayoutEffect(() => {
    pintadaRef.current = vista
    estirarCapa()
  }, [vista, estirarCapa])

  /* Todo pasa por aqui -arrastre, rueda, pellizco, botones y encaje-, asi que
     acotar en este punto y en ninguno mas basta para que no exista ninguna
     forma de dejar el mapa fuera de la pantalla. Ponerlo en cada gesto seria
     cuatro sitios donde acordarse.

     `enVivo` lo pide solo el pellizco. Si estirar la capa basta, no se toca
     React; si no -se destaparia un borde o ya se ve borroso-, se pinta de
     verdad ese cuadro y el gesto sigue estirando desde ahi. */
  const aplicarVista = useCallback(
    (siguiente, enVivo = false) => {
      const acotada = acotarVista(siguiente, medida, anchoContenido, altoContenido)
      vistaRef.current = acotada
      if (enVivo && capaCubre(acotada, pintadaRef.current, medida, anchoContenido, altoContenido)) {
        estirarCapa()
        return
      }
      setVista(acotada)
    },
    [medida, anchoContenido, altoContenido, estirarCapa],
  )

  /* Al acabar el pellizco se pinta la vista a la que llegaron los dedos */
  const asentarVista = useCallback(() => {
    if (!mismaVista(vistaRef.current, pintadaRef.current)) setVista(vistaRef.current)
  }, [])
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

  // La vista con el grafo completo encajado y centrado
  const vistaEncajada = useCallback(() => {
    if (!medida.ancho || !medida.alto) return null
    const escala = acotar(
      Math.min(
        (medida.ancho - MARGEN_ENCAJE * 2) / anchoContenido,
        (medida.alto - MARGEN_ENCAJE * 2) / altoContenido,
      ),
      ZOOM.min,
      1,
    )
    return {
      escala,
      x: (medida.ancho - anchoContenido * escala) / 2,
      y: (medida.alto - altoContenido * escala) / 2,
    }
  }, [medida, anchoContenido, altoContenido])

  /* Al llegar de golpe a una vista nueva -al abrir el mapa, o al saltar
     entre verlo todo y tu semestre- el mapa se asienta: sube unos pixeles y
     aparece, en vez de cambiar en seco. Es una animacion de la capa, que la
     resuelve la GPU sin repintar el mapa. */
  const llegar = useCallback(() => {
    const capa = capaRef.current
    if (!capa) return
    capa.classList.remove('capa-llegando')
    void capa.offsetWidth
    capa.classList.add('capa-llegando')
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
    capaRef.current?.classList.remove('capa-viajando')
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

  /* Salta a una vista sin viaje, asentandose al llegar. Para saltos grandes
     -de ver la carrera entera a leer un semestre-, donde un viaje animado
     tendria que repintar el mapa entero en cada cuadro. */
  const irDeGolpe = useCallback(
    (v) => {
      if (!v) return
      detenerViaje()
      aplicarVista(v)
      llegar()
    },
    [detenerViaje, aplicarVista, llegar],
  )

  /** Donde queda la vista al aplicar un factor de zoom dejando fijo un punto */
  const conZoom = (v, factor, puntoX, puntoY) => {
    const escala = acotar(v.escala * factor, ZOOM.min, ZOOM.max)
    const k = escala / v.escala
    return { escala, x: puntoX - (puntoX - v.x) * k, y: puntoY - (puntoY - v.y) * k }
  }

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
   * viaje entero es estirar esa capa en la GPU.
   *
   * Con una ficha anclada al lado de su tarjeta -escritorio- se sigue
   * pintando cada cuadro: la ficha se coloca con la vista de React, y si
   * esta no cambiara durante el viaje se quedaria atras y saltaria al final.
   * En escritorio pintar cada cuadro sale barato.
   */
  const animarHacia = useCallback(
    (hasta, duracion) => {
      cancelAnimationFrame(animacion.current)
      clearTimeout(redZoom.current)
      const desde = vistaRef.current
      const destino = acotarVista(hasta, medida, anchoContenido, altoContenido)
      const base = fichaAnclada?.current
        ? null
        : vistaParaViaje(desde, destino, medida, anchoContenido, altoContenido)

      if (base) {
        enViaje.current = true
        capaRef.current?.classList.add('capa-viajando')
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
      fichaAnclada,
      estirarCapa,
      asentarViaje,
      aplicarVista,
      marcarGesto,
    ],
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
      const desde = vistaRef.current
      const hasta = conZoom(desde, factor, medida.ancho / 2, medida.alto / 2)
      // Si el zoom ya esta topado no hay nada que animar
      if (hasta.escala === desde.escala) return
      animarHacia(hasta, DURACION_ZOOM)
    },
    [medida, animarHacia],
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
      const m = { arriba: 40, abajo: 40, izq: 40, der: 40, ...margenes }
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
  // Los ultimos puntos del arrastre, para saber a que velocidad se solto
  const muestras = useRef([])
  // El toque anterior, para reconocer el doble toque
  const ultimoToque = useRef(null)
  // Si el gesto en curso ha sido de un solo dedo de principio a fin
  const deUnDedo = useRef(false)

  /* Soltar un arrastre con velocidad lo deja seguir solo y frenar poco a
     poco, como cualquier lista o mapa de un telefono. Parado en seco, cada
     arrastre largo pedia tres o cuatro arrastres cortos. Si choca con el
     borde, ese eje se para. */
  const lanzar = () => {
    const m = muestras.current
    muestras.current = []
    if (m.length < 2) return
    const ultimo = m[m.length - 1]
    // Si el dedo se quedo quieto antes de soltar, no lo estaba lanzando
    if (performance.now() - ultimo.t > 60) return
    const primero = m.find((p) => ultimo.t - p.t <= 80) ?? m[0]
    const dt = ultimo.t - primero.t
    if (dt <= 0) return
    let vx = (ultimo.x - primero.x) / dt
    let vy = (ultimo.y - primero.y) / dt
    if (Math.hypot(vx, vy) < LANZAMIENTO_MIN) return

    let previo = null
    const paso = (ahora) => {
      if (previo != null) {
        const d = Math.min(32, ahora - previo)
        const v = vistaRef.current
        const quiere = { ...v, x: v.x + vx * d, y: v.y + vy * d }
        aplicarVista(quiere)
        const llego = vistaRef.current
        if (Math.abs(llego.x - quiere.x) > 0.5) vx = 0
        if (Math.abs(llego.y - quiere.y) > 0.5) vy = 0
        const f = Math.exp(-d / FRICCION_MS)
        vx *= f
        vy *= f
        if (Math.hypot(vx, vy) < 0.02) return
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

  const alPresionar = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    detenerViaje()
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
      const ahora = medirPellizco()
      if (pellizco.current.distancia > 0) {
        zoomEn(ahora.distancia / pellizco.current.distancia, ahora.centroX, ahora.centroY, true)
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
    const ahora = performance.now()
    muestras.current.push({ t: ahora, x: e.clientX, y: e.clientY })
    while (muestras.current.length > 2 && ahora - muestras.current[0].t > 100) {
      muestras.current.shift()
    }
  }

  const alSoltar = (e) => {
    punteros.current.delete(e.pointerId)
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    const tactil = e.pointerType !== 'mouse' && e.type === 'pointerup'
    const eraArrastre = arrastre.current?.capturado && deUnDedo.current
    // Al levantar un dedo del pellizco no se reanuda el arrastre con el otro:
    // haria un salto feo. Hace falta volver a tocar.
    if (pellizco.current) asentarVista()
    pellizco.current = null
    arrastre.current = null
    if (punteros.current.size === 0) setArrastrando(false)

    if (tactil && eraArrastre) lanzar()

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
    vista,
    medida,
    encajado,
    arrastrando,
    enGesto,
    refEnGesto,
    huboMovimiento,
    encajar: () => irDeGolpe(vistaEncajada()),
    vistaEncajada,
    irDeGolpe,
    acercar: () => zoomAlCentro(ZOOM.paso),
    alejar: () => zoomAlCentro(1 / ZOOM.paso),
    mostrar,
    controlesArrastre: {
      onPointerDown: alPresionar,
      onPointerMove: alMover,
      onPointerUp: alSoltar,
      onPointerCancel: alSoltar,
    },
  }
}
