import { RotateCcw } from 'lucide-react'
import { ESTADO } from '../../data/estados'
import { SITUACION } from '../../layout/situacion'
import { IconoSituacion } from '../IconoSituacion'
import { colorSituacion } from './aspecto'

/**
 * Los tres estados que se pueden marcar, en un solo control segmentado.
 * La pastilla de fondo se desliza hasta el activo en vez de saltar.
 */
export default function Selector({ estado, alElegir }) {
  const opciones = [
    { marca: ESTADO.APROBADA, texto: 'Aprobada', situacion: SITUACION.HECHA },
    { marca: ESTADO.CURSANDO, texto: 'Cursando', situacion: SITUACION.CURSANDO },
    { marca: null, texto: 'Sin cursar', icono: RotateCcw },
  ]
  const activa = Math.max(
    0,
    opciones.findIndex((o) =>
      o.marca ? o.marca === estado : estado !== ESTADO.APROBADA && estado !== ESTADO.CURSANDO,
    ),
  )

  return (
    <div className="relative grid grid-cols-3 rounded-xl bg-panel-suave p-1">
      <span
        aria-hidden="true"
        className="selector-pastilla absolute inset-y-1 left-1 rounded-lg border border-panel-borde bg-panel shadow-sm"
        style={{ width: 'calc((100% - 0.5rem) / 3)', transform: `translateX(${activa * 100}%)` }}
      />
      {opciones.map((o, i) => {
        const Icono = o.icono
        const activo = i === activa
        return (
          <button
            key={o.texto}
            type="button"
            onClick={() => alElegir(o.marca)}
            aria-pressed={activo}
            className={`relative flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] transition-colors ${
              activo ? 'text-tinta' : 'text-tinta-tenue'
            }`}
          >
            {Icono ? (
              <Icono size={12} strokeWidth={1.75} />
            ) : (
              <IconoSituacion
                situacion={o.situacion}
                color={activo ? colorSituacion(o.situacion) : 'currentColor'}
                size={12}
              />
            )}
            {o.texto}
          </button>
        )
      })}
    </div>
  )
}
