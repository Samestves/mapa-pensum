import { X } from 'lucide-react'

import { ROTULO } from './estilos'

export default function Cabecera({ carrera, alCerrar }) {
  return (
    <header className="flex items-start justify-between gap-3 px-5 pt-1 pb-3">
      <div className="min-w-0">
        <p className={ROTULO}>Tu ruta</p>
        <h2 className="mt-1 text-[17px] leading-snug font-semibold tracking-[-0.01em] text-tinta">
          {carrera.nombre}
        </h2>
      </div>
      <button
        type="button"
        onClick={alCerrar}
        aria-label="Cerrar"
        className="grid size-8 shrink-0 place-items-center rounded-full bg-tinta/[0.08] text-tinta-suave transition-transform active:scale-90"
      >
        <X size={16} strokeWidth={2.2} />
      </button>
    </header>
  )
}
