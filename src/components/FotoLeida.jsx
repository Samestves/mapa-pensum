import { useLayoutEffect, useRef, useState } from 'react'
import { Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react'

/* Un boton redondo de 32 px sobre la foto, con una zona de toque de 44 */
function BotonDeFoto({ icono: Icono, etiqueta, alPulsar }) {
  return (
    <button type="button" aria-label={etiqueta} onClick={alPulsar} className="foto-leida-boton">
      <span>
        <Icono size={16} strokeWidth={1.75} aria-hidden="true" />
      </span>
    </button>
  )
}

/**
 * La foto que se subio, a la vista mientras se revisa lo leido.
 *
 * Revisar es comparar: ¿lo que dice la lista es lo que dice la foto? Por eso
 * la foto no es una pestaña a la que haya que ir -se iria la lista-, sino una
 * ventanita que se queda arriba mientras la lista pasa por debajo (quien la
 * coloca es LectorRevision). Compacta no tapa las materias; si hace falta
 * leer una letra pequeña, se acerca y se desplaza con el dedo, o se alarga.
 *
 * Los botones van fuera de lo que se desplaza: se mueve la foto, no ellos.
 * En escritorio la foto tiene su propia columna, asi que no hay boton de
 * alargar: solo el de acercar.
 *
 * @param {string} props.src  la imagen ya reducida (imagen.vistaPrevia)
 * @param {boolean} [props.enColumna]  true en escritorio, donde va al lado de la lista
 */
function FotoLeida({ src, enColumna = false }) {
  const [acercada, setAcercada] = useState(false)
  const [alargada, setAlargada] = useState(false)
  const refVisor = useRef(null)
  /* Que punto de la foto estaba en medio al pulsar, de 0 a 1. Al acercar o
     alejar se vuelve a poner en medio: sin esto el zoom salta a la esquina de
     arriba a la izquierda y hay que ir a buscar lo que se estaba mirando. */
  const centro = useRef(null)

  const alternarZoom = () => {
    const visor = refVisor.current
    centro.current = {
      x: (visor.scrollLeft + visor.clientWidth / 2) / visor.scrollWidth,
      y: (visor.scrollTop + visor.clientHeight / 2) / visor.scrollHeight,
    }
    setAcercada((previa) => !previa)
  }

  useLayoutEffect(() => {
    const visor = refVisor.current
    if (!centro.current || !visor) return
    visor.scrollLeft = centro.current.x * visor.scrollWidth - visor.clientWidth / 2
    visor.scrollTop = centro.current.y * visor.scrollHeight - visor.clientHeight / 2
  }, [acercada])

  return (
    <div
      className="foto-leida"
      data-acercada={acercada || undefined}
      data-alargada={alargada || undefined}
      data-columna={enColumna || undefined}
    >
      {/* tabIndex: con teclado, es lo unico que permite recorrer una foto acercada */}
      <div
        ref={refVisor}
        role="region"
        aria-label="La foto de tu horario"
        tabIndex={0}
        className="foto-leida-visor"
      >
        <img src={src} alt="El horario que subiste" draggable="false" />
      </div>

      <div className="foto-leida-botones">
        <BotonDeFoto
          icono={acercada ? ZoomOut : ZoomIn}
          etiqueta={acercada ? 'Alejar la foto' : 'Acercar la foto'}
          alPulsar={alternarZoom}
        />
        {!enColumna && (
          <BotonDeFoto
            icono={alargada ? Minimize2 : Maximize2}
            etiqueta={alargada ? 'Encoger la foto' : 'Ver la foto más grande'}
            alPulsar={() => setAlargada((previa) => !previa)}
          />
        )}
      </div>
    </div>
  )
}

export default FotoLeida
