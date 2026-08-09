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
import { colorArea, etiquetaArea } from '../theme/areas'

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

/** Cuota de un grupo. Sin meta oficial no hay barra: solo lo acumulado. */
function CuotaGrupo({ avance }) {
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
 * Filtro por area. Vivia en la leyenda flotante del mapa, que se quito por
 * estorbar: era un panel permanente sobre el lienzo y solo aparecia en
 * Sistemas, la unica carrera con las areas clasificadas.
 *
 * El filtro si era una funcion de verdad -el unico sitio desde donde se podia
 * aislar un area-, asi que se muda aqui en vez de perderse. Y encaja: el
 * desglose por area ya se calculaba en usePensum y no se pintaba en ningun
 * sitio, o sea que era dato muerto.
 */
function FiltroAreas({ areas, areaFiltrada, alFiltrarArea }) {
  if (!areas.length) return null

  return (
    <div className="transicion-tema rounded-lg border border-panel-borde p-3">
      <h3 className="text-[10px] font-bold tracking-wide text-tinta-tenue uppercase">Áreas</h3>
      <p className="mt-0.5 mb-2 text-[10px] text-tinta-tenue">
        Toca una para aislarla en el mapa.
      </p>
      <div className="flex flex-col gap-1">
        {areas.map((a) => {
          const activa = areaFiltrada === a.area
          const apagada = areaFiltrada && !activa
          return (
            <button
              key={a.area}
              type="button"
              onClick={() => alFiltrarArea(activa ? null : a.area)}
              title={`Aislar ${etiquetaArea(a.area)}`}
              aria-pressed={activa}
              className={`flex items-center gap-2 rounded px-1 py-1 text-left transition-opacity ${
                apagada ? 'opacity-40 hover:opacity-75' : ''
              }`}
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: colorArea(a.area) }}
              />
              <span
                className={`min-w-0 flex-1 truncate text-[11px] ${
                  activa ? 'font-bold text-tinta' : 'text-tinta-suave'
                }`}
              >
                {etiquetaArea(a.area)}
              </span>
              <span className="shrink-0 font-mono text-[10px] text-tinta-tenue">
                {a.aprobadas}/{a.total}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Popover de detalle del avance, anclado al chip de progreso de la cabecera.
 * Solo trae lo que NO esta ya a la vista en otro sitio: el desglose en
 * numeros, las cuotas de electivas y el reinicio. El porcentaje vive en el
 * chip. El filtro por area vive aqui desde que se quito la leyenda flotante.
 */
function PanelProgreso({
  progreso,
  avanceGrupos,
  reiniciar,
  hayMarcas,
  abierto,
  alCerrar,
  areaFiltrada,
  alFiltrarArea,
}) {
  const { ucAprobadas, ucElectivas, ucTitulo, aprobadas, cursando, disponibles, total } =
    progreso
  // Sin creditos oficiales no hay porcentaje: se muestran materias y UC sueltas
  const hayPorcentaje = progreso.porcentaje != null
  const porcentaje = useNumeroAnimado(progreso.porcentaje ?? 0)
  const grupos = Object.values(avanceGrupos)

  if (!abierto) return null

  return (
    <>
      {/* El velo solo oscurece en movil, donde la hoja tapa el mapa. En
          escritorio el panel va al lado y el mapa se sigue viendo y usando:
          atenuarlo ahi seria fingir que hay un modal donde no lo hay. */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={alCerrar}
        className="fixed inset-0 z-30 cursor-default bg-black/40 backdrop-blur-[2px] md:bg-transparent md:backdrop-blur-none"
      />

      {/* Antes era un globo flotando arriba a la derecha. En movil ocupaba
          casi toda la pantalla flotando en el aire, sin quedar anclado a
          ningun borde, y eso es lo que se siente raro: un panel de ese
          tamaño tiene que apoyarse en algo.
          Ahora se apoya. En movil sube desde abajo, que es de donde se
          esperan las hojas y donde llega el pulgar; en escritorio se pega al
          borde derecho a lo alto, como un cajon. Mismo contenido, dos formas
          que si tienen sitio propio. */}
      <div className="hoja-avance transicion-tema absolute inset-x-0 bottom-0 z-40 flex max-h-[85%] flex-col gap-4 overflow-y-auto rounded-t-2xl border border-b-0 border-panel-borde bg-panel/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-xl md:inset-x-auto md:top-0 md:right-0 md:bottom-0 md:max-h-none md:w-[20rem] md:rounded-t-none md:rounded-l-2xl md:border-b md:border-r-0 md:p-5">
        {/* Asa: en movil dice "esto se arrastra o se cierra tocando fuera" */}
        <span
          aria-hidden="true"
          className="mx-auto -mt-1 mb-1 h-1 w-10 shrink-0 rounded-full bg-panel-borde md:hidden"
        />
        {/* El porcentaje necesita un denominador oficial. Donde no lo hay se
            dice lo acumulado sin inventar un total. */}
        {hayPorcentaje ? (
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
        ) : (
          <div>
            <div className="flex items-end justify-between">
              <span className="text-[10px] font-bold tracking-wide text-tinta-tenue uppercase">
                Materias aprobadas
              </span>
              <span className="font-mono text-2xl leading-none font-extrabold text-aprobada">
                {aprobadas}
                <span className="text-sm text-tinta-tenue">/{total}</span>
              </span>
            </div>
            <p className="mt-1.5 text-[10px] leading-snug text-tinta-tenue">
              Llevas {ucAprobadas} UC. No mostramos porcentaje del título porque no tenemos
              los créditos oficiales de esta carrera.
            </p>
          </div>
        )}

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

        <FiltroAreas
          areas={progreso.porArea}
          areaFiltrada={areaFiltrada}
          alFiltrarArea={alFiltrarArea}
        />

        {grupos.length > 0 && (
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
              {grupos.map((g) => (
                <CuotaGrupo key={g.clave} avance={g} />
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-panel-borde pt-3">
          <BotonReinicio reiniciar={reiniciar} hayMarcas={hayMarcas} />
        </div>
      </div>
    </>
  )
}

export default PanelProgreso
