import { useEffect, useRef, useState } from 'react'
import {
  X,
  CircleDot,
  GraduationCap,
  ListChecks,
  LockOpen,
  RotateCcw,
  SlidersHorizontal,
  TriangleAlert,
} from 'lucide-react'
import { colorArea, etiquetaArea } from '../theme/areas'
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

function FilaArea({ fila, activa, alPulsar }) {
  const color = colorArea(fila.area)
  const pct = fila.uc ? (fila.ucAprobadas / fila.uc) * 100 : 0

  return (
    <button
      type="button"
      onClick={alPulsar}
      title={`Aislar ${etiquetaArea(fila.area)} en el mapa`}
      className="w-full rounded-lg border px-2.5 py-2 text-left transition-colors hover:bg-panel-suave"
      style={{ borderColor: activa ? color : 'transparent' }}
    >
      <div className="flex items-center gap-2">
        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-tinta">
          {etiquetaArea(fila.area)}
        </span>
        <span className="shrink-0 font-mono text-[10px] text-tinta-tenue">
          {fila.ucAprobadas}/{fila.uc}
        </span>
      </div>
      <div className="mt-1.5 ml-4 h-1 overflow-hidden rounded-full bg-lienzo">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </button>
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

function PanelProgreso({
  progreso,
  avanceElectivas,
  areaFiltrada,
  alFiltrarArea,
  alAbrirElectivas,
  reiniciar,
  hayMarcas,
  abierto,
  alCerrar,
}) {
  const { ucAprobadas, ucElectivas, ucTitulo, aprobadas, cursando, disponibles, total } =
    progreso
  const porcentaje = useNumeroAnimado(progreso.porcentaje)

  if (!abierto) return null

  return (
    // Ya no ocupa una columna fija: flota sobre el lienzo y se cierra al
    // pulsar fuera, asi el mapa recupera todo el ancho.
    <>
      <button
        type="button"
        aria-label="Cerrar"
        onClick={alCerrar}
        className="fixed inset-0 z-30 cursor-default"
      />
      <aside className="surgir transicion-tema absolute top-3 right-3 bottom-3 z-40 flex w-[19rem] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-panel-borde bg-panel/95 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-panel-borde px-4 py-3">
          <h2 className="text-sm font-bold text-tinta">Mi avance</h2>
          <button
            type="button"
            onClick={alCerrar}
            aria-label="Cerrar panel"
            title="Cerrar"
            className="grid size-7 place-items-center rounded-lg text-tinta-suave transition-colors hover:text-tinta"
          >
            <X size={16} />
          </button>
        </div>

      <div className="flex flex-col gap-4 overflow-y-auto p-4">
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
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[10px] font-bold tracking-wide text-tinta-tenue uppercase">
              Electivas
            </h3>
            <button
              type="button"
              onClick={alAbrirElectivas}
              className="flex items-center gap-1 text-[10px] font-bold text-aprobada"
            >
              <SlidersHorizontal size={12} />
              Elegir
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <CuotaElectiva etiqueta="Técnicas" avance={avanceElectivas.tecnica} />
            <CuotaElectiva etiqueta="Humanísticas" avance={avanceElectivas.humanistica} />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <h3 className="text-[10px] font-bold tracking-wide text-tinta-tenue uppercase">
              Avance por área
            </h3>
            {areaFiltrada && (
              <button
                type="button"
                onClick={() => alFiltrarArea(null)}
                className="text-[10px] font-bold text-aprobada"
              >
                Ver todo
              </button>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            {progreso.porArea.map((fila) => (
              <FilaArea
                key={fila.area}
                fila={fila}
                activa={areaFiltrada === fila.area}
                alPulsar={() => alFiltrarArea(areaFiltrada === fila.area ? null : fila.area)}
              />
            ))}
          </div>
        </div>

        {/* Reiniciar vive aqui, junto a los datos que borra, y no en la
            cabecera entre acciones que se usan a diario. */}
        <div className="mt-2 border-t border-panel-borde pt-4">
          <BotonReinicio reiniciar={reiniciar} hayMarcas={hayMarcas} />
        </div>
      </div>
      </aside>
    </>
  )
}

export default PanelProgreso
