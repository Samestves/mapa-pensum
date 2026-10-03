import { Check, ChevronDown } from 'lucide-react'
import { DIAS, DIAS_CORTOS, aTexto } from '../layout/horario'

/* Los controles con los que se corrige lo leido. Pequeños y sin estado: cada
   uno recibe un valor y avisa del cambio. */

/**
 * Un selector de pocas opciones a la vista, todas a un toque: los cinco dias,
 * o "Semana | Foto". La elegida lleva la misma pieza que el selector de tema.
 *
 * @param {{ valor: any, texto: string, nombre?: string }[]} props.opciones
 */
export function Segmentos({ opciones, valor, alCambiar, etiqueta }) {
  return (
    <div role="group" aria-label={etiqueta} className="segmentos">
      {opciones.map((opcion) => (
        <button
          key={String(opcion.valor)}
          type="button"
          aria-pressed={opcion.valor === valor}
          aria-label={opcion.nombre}
          onClick={() => alCambiar(opcion.valor)}
        >
          {opcion.texto}
        </button>
      ))}
    </div>
  )
}

const OPCIONES_DIA = DIAS.map((nombre, dia) => ({ valor: dia, texto: DIAS_CORTOS[dia], nombre }))

export function SelectorDia({ dia, alCambiar }) {
  return <Segmentos opciones={OPCIONES_DIA} valor={dia} alCambiar={alCambiar} etiqueta="Día" />
}

/* El selector de materia es el del sistema, vestido: en un telefono, la rueda
   o la lista nativa es la forma mas rapida de elegir entre sesenta nombres, y
   ninguna lista hecha a mano la mejora. */
export function SelectorMateria({ codigo, materias, alCambiar }) {
  return (
    <div className="relative">
      <select
        value={codigo ?? ''}
        onChange={(e) => alCambiar(e.target.value || null)}
        aria-label="Materia"
        className="campo-lector w-full appearance-none truncate pr-9"
      >
        <option value="">Elige la materia</option>
        {materias.map((m) => (
          <option key={m.codigo} value={m.codigo}>
            {m.nombre}
          </option>
        ))}
      </select>
      <ChevronDown
        size={15}
        strokeWidth={1.75}
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-tinta-tenue"
      />
    </div>
  )
}

const aMinutos = (texto) => {
  const [h, m] = String(texto).split(':').map(Number)
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null
}

/* De que hora a que hora. Los campos son los del sistema por lo mismo que la
   materia: el reloj nativo del telefono es mejor que cualquiera inventado. */
export function CampoHoras({ inicio, fin, alCambiar }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="time"
        value={inicio == null ? '' : aTexto(inicio)}
        onChange={(e) => alCambiar({ inicio: aMinutos(e.target.value) })}
        aria-label="Hora de inicio"
        className="campo-lector min-w-0 flex-1 tabular-nums"
      />
      <span aria-hidden="true" className="text-[12px] text-tinta-tenue">
        a
      </span>
      <input
        type="time"
        value={fin == null ? '' : aTexto(fin)}
        onChange={(e) => alCambiar({ fin: aMinutos(e.target.value) })}
        aria-label="Hora de fin"
        className="campo-lector min-w-0 flex-1 tabular-nums"
      />
    </div>
  )
}

/**
 * La marca de "esta entra": un circulo que se llena. Es un interruptor, no
 * una casilla: se pulsa con el pulgar, asi que su zona es de 44 px aunque el
 * circulo mida 24.
 */
export function Marca({ activa, alPulsar, etiqueta }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activa}
      aria-label={etiqueta}
      onClick={alPulsar}
      className="-my-2 -mr-2.5 grid size-11 shrink-0 place-items-center"
    >
      <span className="marca-leida" data-activa={activa || undefined}>
        <Check size={14} strokeWidth={2.75} />
      </span>
    </button>
  )
}
