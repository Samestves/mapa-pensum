import { useCallback, useEffect, useRef, useState } from 'react'
import { RotateCcw, TriangleAlert } from 'lucide-react'
import { useCerrarConEscape } from '../hooks/useCerrarConEscape'

/* Piezas del avance que comparten el panel de escritorio (PanelProgreso) y la
   hoja del telefono (HojaAvance). Son el mismo dato en los dos sitios, asi que
   se dibujan con el mismo codigo: si la cuota de electivas o el reinicio
   cambian, cambian en los dos a la vez. */

/** Cuota de un grupo. Sin meta oficial no hay barra: solo lo acumulado. */
export function CuotaGrupo({ avance }) {
  const color = avance.completa ? 'var(--estado-aprobada)' : 'var(--estado-cursando)'
  const pct = avance.meta ? Math.min(100, (avance.uc / avance.meta) * 100) : 0

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-[11px] font-semibold text-tinta">
          {avance.titulo}
        </span>
        <span className="shrink-0 font-mono text-[10px] font-bold" style={{ color }}>
          {avance.meta != null ? `${avance.uc}/${avance.meta} UC` : `${avance.uc} UC`}
        </span>
      </div>
      {avance.meta != null && (
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-lienzo">
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
      )}
    </div>
  )
}

export function BotonReinicio({ reiniciar, hayMarcas }) {
  const [confirmando, setConfirmando] = useState(false)
  const caja = useRef(null)

  const cancelar = useCallback(() => setConfirmando(false), [])
  useCerrarConEscape(cancelar, confirmando)

  useEffect(() => {
    if (!confirmando) return
    const fuera = (e) => {
      if (!caja.current?.contains(e.target)) setConfirmando(false)
    }
    document.addEventListener('pointerdown', fuera)
    return () => document.removeEventListener('pointerdown', fuera)
  }, [confirmando])

  return (
    <div ref={caja}>
      {confirmando ? (
        <div className="surgir rounded-lg border border-panel-borde bg-panel-suave p-3">
          <p className="flex items-start gap-2 text-[11px] leading-snug text-tinta">
            <TriangleAlert size={14} className="mt-0.5 shrink-0 text-cursando" />
            Se borrarán todas tus marcas. No se puede deshacer.
          </p>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              className="flex-1 rounded-lg border border-panel-borde px-2 py-1.5 text-[11px] font-semibold text-tinta-suave hover:text-tinta"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                reiniciar()
                setConfirmando(false)
              }}
              className="flex-1 rounded-lg px-2 py-1.5 text-[11px] font-bold text-white"
              style={{ backgroundColor: 'var(--estado-rojo)' }}
            >
              Sí, borrar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          disabled={!hayMarcas}
          className="flex w-full items-center justify-center gap-2 rounded-lg py-1.5 text-[11px] font-semibold text-tinta-tenue transition-colors hover:text-tinta disabled:cursor-not-allowed disabled:opacity-35"
        >
          <RotateCcw size={13} />
          Reiniciar mi avance
        </button>
      )}
    </div>
  )
}
