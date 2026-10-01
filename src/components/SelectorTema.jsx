import { Moon, Sun } from 'lucide-react'

const TEMAS = [
  { id: 'claro', texto: 'Claro', icono: Sun },
  { id: 'oscuro', texto: 'Oscuro', icono: Moon },
]

/**
 * Claro u oscuro, como el mando segmentado de Ajustes en iOS.
 *
 * Vive dentro de lo que abre la isla de avance -la hoja en el telefono, el
 * panel en escritorio- y no como boton suelto en la cabecera: es un ajuste
 * que se toca una vez, no algo que merezca una esquina de la pantalla.
 */
export default function SelectorTema({ tema, alternarTema }) {
  return (
    <div
      role="radiogroup"
      aria-label="Apariencia"
      className="relative grid h-9 w-[184px] shrink-0 grid-cols-2 rounded-full bg-tinta/[0.07] p-[3px]"
    >
      <span
        aria-hidden="true"
        style={{ transform: `translateX(${tema === 'oscuro' ? 100 : 0}%)` }}
        className="lente-tema pointer-events-none absolute inset-y-[3px] left-[3px] w-[calc(50%-3px)] rounded-full"
      />
      {TEMAS.map(({ id, texto, icono: Icono }) => {
        const activo = id === tema
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => !activo && alternarTema()}
            className={`relative z-10 flex items-center justify-center gap-1.5 rounded-full text-[13px] font-medium transition-colors duration-200 ${
              activo ? 'text-tinta' : 'text-tinta-tenue'
            }`}
          >
            <Icono size={14} strokeWidth={2} />
            {texto}
          </button>
        )
      })}
    </div>
  )
}
