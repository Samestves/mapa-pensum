import { useCallback, useEffect, useRef, useState } from 'react'
import { RotateCcw, TriangleAlert } from 'lucide-react'
import { useCerrarConEscape } from '../hooks/useCerrarConEscape'

/* Piezas del avance (ver ContenidoAvance), aparte porque tienen estado o
   reglas propias: la cuota de un grupo de electivas y el reinicio con su
   confirmacion. */

/** Cuota de un grupo. Sin meta oficial no hay barra: solo lo acumulado. */
export function CuotaGrupo({ avance }) {
  const color = avance.completa ? 'var(--estado-aprobada)' : 'var(--estado-cursando)'
  const pct = avance.meta ? Math.min(100, (avance.uc / avance.meta) * 100) : 0

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-[13.5px] font-medium text-tinta">
          {avance.titulo}
        </span>
        <span className="shrink-0 text-[12.5px] font-semibold tabular-nums" style={{ color }}>
          {avance.meta != null ? `${avance.uc}/${avance.meta} UC` : `${avance.uc} UC`}
        </span>
      </div>
      {avance.meta != null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-tinta/[0.08]">
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
      )}
    </div>
  )
}

const ROJO_TENUE = 'color-mix(in oklab, var(--estado-rojo) 9%, transparent)'

/**
 * Reiniciar el avance de la carrera: la unica accion del avance que no se
 * puede deshacer, y por eso la mas callada hasta que se pide.
 *
 * Quieta es una fila ancha y apagada al pie, que solo enseña el rojo al
 * pasar por encima: si no, el boton mas peligroso seria el mas llamativo del
 * panel. Pulsarla no borra nada; la convierte en una confirmacion que dice
 * cuanto se va a perder -"tus 8 materias marcadas"- y deja Cancelar del lado
 * del pulgar. Se cierra sola con Escape o pulsando fuera.
 */
export function BotonReinicio({ reiniciar, cuantas }) {
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

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        disabled={!cuantas}
        className="boton-peligro flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-tinta/[0.04] text-[13.5px] font-medium text-tinta-suave transition-[background-color,color] duration-200 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <RotateCcw size={15} strokeWidth={2} />
        {cuantas ? 'Reiniciar mi avance' : 'Nada que reiniciar todavía'}
      </button>
    )
  }

  return (
    <div
      ref={caja}
      role="alertdialog"
      aria-label="Reiniciar mi avance"
      className="surgir rounded-[18px] border p-4"
      style={{
        backgroundColor: ROJO_TENUE,
        borderColor: 'color-mix(in oklab, var(--estado-rojo) 24%, transparent)',
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full"
          style={{ backgroundColor: ROJO_TENUE, color: 'var(--estado-rojo)' }}
        >
          <TriangleAlert size={17} strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-tinta">¿Reiniciar tu avance?</p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-tinta-suave">
            Se borrarán {cuantas === 1 ? 'tu materia marcada' : `tus ${cuantas} materias marcadas`}{' '}
            en esta carrera. No se puede deshacer.
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          autoFocus
          onClick={cancelar}
          className="h-10 flex-1 rounded-xl bg-tinta/[0.07] text-[13px] font-semibold text-tinta transition-colors hover:bg-tinta/[0.11]"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => {
            reiniciar()
            setConfirmando(false)
          }}
          className="h-10 flex-1 rounded-xl text-[13px] font-semibold text-white transition-[filter] hover:brightness-110"
          style={{ backgroundColor: 'var(--estado-rojo)' }}
        >
          Borrar todo
        </button>
      </div>
    </div>
  )
}
