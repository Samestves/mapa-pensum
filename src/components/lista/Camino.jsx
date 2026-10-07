import { situacionDe } from '../../layout/situacion'
import { IconoSituacion } from '../IconoSituacion'
import { colorSituacion } from './aspecto'

/**
 * El camino de una materia, sin palabras: un candado abierto y las que
 * desbloquea, o un candado cerrado y las que le faltan. Cada una es un boton
 * que lleva hasta ella en la lista. Entran una tras otra al abrir la fila.
 */
export default function Camino({ icono: Icono, rotulo, color, materias, estados, alIr }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-1.5 text-[11px] text-tinta-tenue">
        <Icono size={12} strokeWidth={1.75} style={{ color }} />
        {rotulo}
      </p>
      <ul className="flex min-w-0 flex-wrap gap-1.5">
        {materias.map((m, i) => {
          const s = situacionDe(m.codigo, m.prerrequisitos, estados)
          return (
            <li
              key={m.codigo}
              className="chip-entrar max-w-full"
              style={{ animationDelay: `${60 + i * 45}ms` }}
            >
              <button
                type="button"
                onClick={() => alIr(m.codigo)}
                className="flex max-w-full items-center gap-1.5 rounded-full border border-panel-borde py-1 pr-2.5 pl-1.5 text-[12px] text-tinta-suave transition-colors active:bg-panel-suave"
              >
                <IconoSituacion situacion={s} color={colorSituacion(s)} size={12} />
                <span className="truncate">{m.nombre}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
