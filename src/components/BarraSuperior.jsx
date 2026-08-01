import { useEffect, useRef, useState } from 'react'
import {
  CircuitBoard,
  Moon,
  PanelRight,
  RotateCcw,
  Sun,
  TriangleAlert,
} from 'lucide-react'

function BarraSuperior({
  meta,
  totales,
  tema,
  alternarTema,
  reiniciar,
  hayMarcas,
  resumen,
  panelAbierto,
  alAlternarPanel,
}) {
  const [confirmando, setConfirmando] = useState(false)
  const caja = useRef(null)

  // Se cierra al pulsar fuera o con Escape: un dialogo de confirmacion que
  // solo se cierra por temporizador se siente como que se te escapa.
  useEffect(() => {
    if (!confirmando) return
    const fuera = (e) => {
      if (!caja.current?.contains(e.target)) setConfirmando(false)
    }
    const tecla = (e) => e.key === 'Escape' && setConfirmando(false)
    document.addEventListener('pointerdown', fuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('pointerdown', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [confirmando])

  return (
    <header className="transicion-tema z-40 flex shrink-0 items-center gap-2 border-b border-panel-borde bg-panel px-4 py-3 sm:gap-3 sm:px-6">
      <CircuitBoard className="hidden shrink-0 text-aprobada sm:block" size={26} />

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-extrabold tracking-tight text-tinta sm:text-lg">
          Mapa de Pensum
        </h1>
        <p className="hidden truncate text-xs text-tinta-tenue sm:block">
          {meta.carrera} · {meta.nucleo} · {totales.asignaturas} asignaturas · {totales.uc} UC
        </p>
      </div>

      {/* Resumen siempre visible: el avance no deberia depender de tener
          el panel lateral abierto. */}
      <div className="hidden items-center gap-2.5 rounded-lg border border-panel-borde px-3 py-1.5 md:flex">
        <span className="font-mono text-sm font-bold text-aprobada">
          {resumen.porcentaje.toFixed(1)}%
        </span>
        <span className="h-1.5 w-20 overflow-hidden rounded-full bg-lienzo">
          <span
            className="block h-full rounded-full bg-aprobada transition-[width] duration-500 ease-out"
            style={{ width: `${resumen.porcentaje}%` }}
          />
        </span>
        <span className="font-mono text-[10px] text-tinta-tenue">
          {resumen.ucAprobadas}/{resumen.ucTotales} UC
        </span>
      </div>

      <div ref={caja} className="relative">
        <button
          type="button"
          onClick={() => setConfirmando((v) => !v)}
          disabled={!hayMarcas}
          title="Borrar todo tu avance"
          className={`transicion-tema flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-35 ${
            confirmando
              ? 'border-transparent bg-panel-suave text-tinta'
              : 'border-panel-borde text-tinta-suave hover:text-tinta'
          }`}
        >
          <RotateCcw
            size={15}
            className={`transition-transform duration-300 ${confirmando ? '-rotate-180' : ''}`}
          />
          <span className="hidden sm:inline">Reiniciar</span>
        </button>

        {confirmando && (
          <div className="surgir absolute top-full right-0 z-50 mt-2 w-60 rounded-xl border border-panel-borde bg-panel p-3 shadow-2xl">
            <p className="flex items-start gap-2 text-xs leading-snug text-tinta">
              <TriangleAlert size={15} className="mt-0.5 shrink-0 text-cursando" />
              Se borrarán todas tus marcas. Esto no se puede deshacer.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                className="flex-1 rounded-lg border border-panel-borde px-2 py-1.5 text-xs font-semibold text-tinta-suave hover:text-tinta"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  reiniciar()
                  setConfirmando(false)
                }}
                className="flex-1 rounded-lg px-2 py-1.5 text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--estado-rojo)' }}
              >
                Sí, borrar
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={alternarTema}
        title={tema === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        aria-label="Cambiar tema"
        className="transicion-tema grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-panel-borde text-tinta-suave hover:text-tinta"
      >
        <span key={tema} className="surgir grid place-items-center">
          {tema === 'oscuro' ? <Sun size={16} /> : <Moon size={16} />}
        </span>
      </button>

      {!panelAbierto && (
        <button
          type="button"
          onClick={alAlternarPanel}
          title="Mostrar mi avance"
          aria-label="Mostrar mi avance"
          className="transicion-tema grid size-9 shrink-0 place-items-center rounded-lg border border-panel-borde text-tinta-suave hover:text-tinta"
        >
          <PanelRight size={16} />
        </button>
      )}
    </header>
  )
}

export default BarraSuperior
