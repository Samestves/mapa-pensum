import { useEffect, useRef, useState } from 'react'
import {
  CircleDot,
  GraduationCap,
  ListChecks,
  LockOpen,
  RotateCcw,
  TriangleAlert,
} from 'lucide-react'
import { useNumeroAnimado } from '../hooks/useNumeroAnimado'

function Dato({ icono: Icono, valor, de, etiqueta, color }) {
  return (
    <div className="transicion-tema rounded-lg border border-panel-borde bg-panel-suave px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-tinta-tenue uppercase">
        <Icono size={12} color={color} />
        {etiqueta}
      </div>
      <div className="mt-1.5 font-mono text-lg leading-none font-bold text-tinta">
        {valor}
        {de != null && <span className="text-xs text-tinta-tenue"> / {de}</span>}
      </div>
    </div>
  )
}

function CuotaElectiva({ etiqueta, avance }) {
  const pct = avance.meta ? Math.min(100, (avance.uc / avance.meta) * 100) : 0
  const color = avance.completa ? 'var(--estado-aprobada)' : 'var(--estado-cursando)'
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold text-tinta">{etiqueta}</span>
        <span className="font-mono text-[10px] font-bold" style={{ color }}>
          {avance.uc}/{avance.meta} UC
        </span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-lienzo">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function BotonReinicio({ reiniciar, hayMarcas }) {
  const [confirmando, setConfirmando] = useState(false)
  const caja = useRef(null)

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
    <div ref={caja}>
      {confirmando ? (
        <div className="transicion-tema surgir rounded-lg border border-panel-borde bg-panel-suave p-3">
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
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-panel-borde px-3 py-2 text-[11px] font-semibold text-tinta-suave hover:text-tinta disabled:cursor-not-allowed disabled:opacity-35"
        >
          <RotateCcw size={14} />
          Reiniciar mi avance
        </button>
      )}
    </div>
  )
}

/**
 * Popover de detalle del avance, anclado al chip de progreso de la cabecera.
 * Solo trae lo que NO esta ya a la vista en otro sitio: el desglose en
 * numeros, las cuotas de electivas y el reinicio. El porcentaje vive en el
 * chip y el filtro por area en la leyenda.
 */
function PanelProgreso({ progreso, avanceElectivas, reiniciar, hayMarcas, abierto, alCerrar }) {
  const { ucAprobadas, ucElectivas, ucTitulo, aprobadas, cursando, disponibles, total } =
    progreso
  const porcentaje = useNumeroAnimado(progreso.porcentaje)

  if (!abierto) return null

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar"
        onClick={alCerrar}
        className="fixed inset-0 z-30 cursor-default"
      />
      <div className="surgir transicion-tema absolute top-2 right-3 z-40 flex max-h-[calc(100%-1rem)] w-[19rem] max-w-[calc(100vw-1.5rem)] flex-col gap-4 overflow-y-auto rounded-2xl border border-panel-borde bg-panel/95 p-4 shadow-2xl backdrop-blur-xl">
        <div>
          <div className="flex items-end justify-between">
            <span className="text-[10px] font-bold tracking-wide text-tinta-tenue uppercase">
              Título completado
            </span>
            <span className="font-mono text-2xl leading-none font-extrabold text-aprobada">
              {porcentaje.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-lienzo">
            <div
              className="h-full rounded-full bg-aprobada transition-[width] duration-500 ease-out"
              style={{ width: `${porcentaje}%` }}
            />
          </div>
          <p className="mt-1.5 text-[10px] text-tinta-tenue">
            {ucAprobadas + ucElectivas} de {ucTitulo} UC, contando obligatorias y electivas.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Dato
            icono={GraduationCap}
            etiqueta="UC oblig."
            valor={ucAprobadas}
            de={progreso.ucTotales}
            color="var(--estado-aprobada)"
          />
          <Dato
            icono={ListChecks}
            etiqueta="Materias"
            valor={aprobadas}
            de={total}
            color="var(--estado-aprobada)"
          />
          <Dato
            icono={CircleDot}
            etiqueta="Cursando"
            valor={cursando}
            color="var(--estado-cursando)"
          />
          <Dato
            icono={LockOpen}
            etiqueta="Disponibles"
            valor={disponibles}
            color="var(--tinta-suave)"
          />
        </div>

        <div className="transicion-tema rounded-lg border border-panel-borde p-3">
          <h3 className="text-[10px] font-bold tracking-wide text-tinta-tenue uppercase">
            Electivas
          </h3>
          {/* Solo informa. Se marcan donde estan dibujadas: en la zona de
              electivas del mapa o al final de la lista. */}
          <p className="mt-0.5 mb-2 text-[10px] text-tinta-tenue">
            Elígelas en el mapa o al final de la lista.
          </p>
          <div className="flex flex-col gap-2">
            <CuotaElectiva etiqueta="Técnicas" avance={avanceElectivas.tecnica} />
            <CuotaElectiva etiqueta="Humanísticas" avance={avanceElectivas.humanistica} />
          </div>
        </div>

        <div className="border-t border-panel-borde pt-3">
          <BotonReinicio reiniciar={reiniciar} hayMarcas={hayMarcas} />
        </div>
      </div>
    </>
  )
}

export default PanelProgreso
