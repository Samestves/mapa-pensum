import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight } from 'lucide-react'
import { useFocoAtrapado } from '../../hooks/useFocoAtrapado'
import Logo from '../Logo'
import { EscenaAvance, EscenaMapa, EscenaMarcar } from './Escenas'
import '../../estilos/bienvenida.css'

/** Las tres laminas, en orden: la escena y lo que se dice debajo */
const LAMINAS = [
  {
    escena: <EscenaMapa />,
    titulo: 'Tu pensum, convertido en un mapa.',
    texto: 'Cada materia es una tarjeta. Al aprobar una, se abren las que dependen de ella.',
  },
  {
    escena: <EscenaMarcar />,
    titulo: 'Marca lo que ya aprobaste.',
    texto: 'Un toque por materia. Se guarda en este teléfono: sin cuentas ni contraseñas.',
  },
  {
    escena: <EscenaAvance />,
    titulo: 'Sabrás qué inscribir y cuánto te falta.',
    texto:
      'Te mostramos las materias que puedes inscribir, tu horario de la semana y tu avance hacia el título.',
  },
]

/* Lo que hay que arrastrar en horizontal para pasar de lamina */
const UMBRAL_PX = 50

/**
 * La guia de la primera visita: tres laminas que cuentan, con las piezas de
 * la propia app, que es esto y que se gana marcando lo aprobado.
 *
 * Sale una vez (ver data/bienvenida.js) y se puede saltar desde el primer
 * segundo. Se pasa con el boton, deslizando o con las flechas del teclado.
 *
 * Cada escena se anima al llegar a ella, una sola vez, y se queda en su
 * ultimo cuadro: nada se repite en bucle mientras se lee. La lamina activa
 * lleva data-activa y las animaciones cuelgan de ese atributo (ver
 * bienvenida.css); con menos movimiento no hay animacion y cada escena se
 * ve directamente terminada. En modo ligero si se animan: son pocas piezas,
 * una vez y casi todo opacidad y transform, y quien entra por primera vez
 * desde un telefono modesto es justo a quien mas le sirve ver el gesto.
 *
 * Va en su propio trozo de codigo: quien ya la vio no la baja nunca.
 */
function Bienvenida({ alTerminar }) {
  const [paso, setPaso] = useState(0)
  const caja = useRef(null)
  const arrastre = useRef(null)
  const ultima = paso === LAMINAS.length - 1

  useFocoAtrapado(caja, true, false)

  const ir = (destino) => setPaso(Math.max(0, Math.min(LAMINAS.length - 1, destino)))
  const siguiente = () => (ultima ? alTerminar() : ir(paso + 1))

  useEffect(() => {
    const tecla = (e) => {
      if (e.key === 'ArrowRight') ir(paso + 1)
      if (e.key === 'ArrowLeft') ir(paso - 1)
      if (e.key === 'Escape') alTerminar()
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })

  const soltar = (e) => {
    if (arrastre.current == null) return
    const dx = e.clientX - arrastre.current
    arrastre.current = null
    if (Math.abs(dx) >= UMBRAL_PX) ir(paso + (dx < 0 ? 1 : -1))
  }

  return createPortal(
    <div
      ref={caja}
      role="dialog"
      aria-modal="true"
      aria-label="Cómo funciona Mapa de Pensum"
      className="bienvenida"
    >
      <div className="ambiente-portada" aria-hidden="true">
        <span className="velo-oscuro" />
        <span className="velo-claro" />
      </div>

      <div className="bienvenida-columna">
        <div className="flex items-center justify-between">
          <span className="relative grid size-10 place-items-center">
            <span className="marca-caja" aria-hidden="true" />
            <Logo className="relative size-6 text-tinta" />
          </span>
          <button type="button" onClick={alTerminar} className="bienvenida-saltar">
            Saltar
          </button>
        </div>

        <div
          className="bienvenida-ventana"
          onPointerDown={(e) => (arrastre.current = e.clientX)}
          onPointerUp={soltar}
          onPointerCancel={() => (arrastre.current = null)}
        >
          <div className="bienvenida-pista" style={{ '--paso': paso }}>
            {LAMINAS.map(({ escena, titulo, texto }, i) => (
              <section
                key={titulo}
                className="bienvenida-lamina"
                data-activa={i === paso || undefined}
                aria-hidden={i !== paso}
                inert={i !== paso}
              >
                <div className="bienvenida-escena" aria-hidden="true">
                  {escena}
                </div>
                <h2 className="font-ui text-[32px] leading-[1.05] font-light tracking-[-0.02em] text-balance text-tinta">
                  {titulo}
                </h2>
                <p className="mt-3 text-[16px] leading-[1.5] text-pretty text-tinta-suave">
                  {texto}
                </p>
              </section>
            ))}
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-5">
          <div className="bienvenida-puntos" aria-label={`Paso ${paso + 1} de ${LAMINAS.length}`}>
            {LAMINAS.map((lamina, i) => (
              <button
                key={lamina.titulo}
                type="button"
                aria-label={`Ir al paso ${i + 1}`}
                aria-current={i === paso ? 'step' : undefined}
                onClick={() => ir(i)}
              />
            ))}
          </div>
          <button type="button" onClick={siguiente} className="boton-tinta w-full">
            {ultima ? 'Elegir mi carrera' : 'Siguiente'}
            <ArrowRight size={18} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default Bienvenida
