import { useEffect, useRef, useState } from 'react'
import { ChevronDown, RotateCcw, TriangleAlert } from 'lucide-react'
import { useNumeroAnimado } from '../hooks/useNumeroAnimado'
import { colorArea, colorNodo, etiquetaArea } from '../theme/areas'

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
 * Barra de composicion de la carrera.
 *
 * Antes era una barra de un solo color que solo decia el porcentaje, o sea
 * lo mismo que el numero de al lado. Esta reparte los cuatro estados en sus
 * colores, asi que de un vistazo se ve la forma de la carrera: cuanto llevas
 * hecho, cuanto tienes en marcha, cuanto se te ha abierto y cuanto sigue
 * cerrado. Es la misma tinta que usa el mapa, asi que no hay que aprender
 * una leyenda nueva.
 */
function BarraComposicion({ aprobadas, cursando, disponibles, bloqueadas, total }) {
  if (!total) return null

  const tramos = [
    { clave: 'aprobadas', n: aprobadas, color: 'var(--estado-aprobada)', texto: 'aprobadas' },
    { clave: 'cursando', n: cursando, color: 'var(--estado-cursando)', texto: 'cursando' },
    { clave: 'disponibles', n: disponibles, color: 'var(--tinta-suave)', texto: 'puedes inscribir' },
    { clave: 'bloqueadas', n: bloqueadas, color: 'var(--panel-borde)', texto: 'aun bloqueadas' },
  ].filter((t) => t.n > 0)

  return (
    <div>
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
        {tramos.map((t) => (
          <span
            key={t.clave}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(t.n / total) * 100}%`, backgroundColor: t.color }}
          />
        ))}
      </div>
      <ul className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1">
        {tramos.map((t) => (
          <li key={t.clave} className="flex items-center gap-1.5 text-[11px] text-tinta-suave">
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: t.color }}
            />
            <span className="font-mono font-bold text-tinta">{t.n}</span>
            <span className="min-w-0 truncate">{t.texto}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Lo que puedes inscribir ahora mismo.
 *
 * Es la razon de abrir este panel. Antes aqui solo habia un numero suelto
 * -"Disponibles: 11"- que no se puede usar para nada: lo que el estudiante
 * quiere saber es CUALES son esas once, y eso obligaba a ir a buscarlas al
 * mapa una por una.
 */
function ParaInscribir({ materias }) {
  if (!materias.length) return null

  return (
    <div>
      <h3 className="text-[10px] font-bold tracking-wide text-tinta-tenue uppercase">
        Puedes inscribir ahora ({materias.length})
      </h3>
      <ul className="mt-1.5 flex flex-col gap-1">
        {materias.map((a) => (
          <li
            key={a.codigo}
            className="flex items-center gap-2 rounded-lg border border-panel-borde px-2.5 py-1.5"
          >
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: colorNodo(a) }}
            />
            <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-tinta">
              {a.nombre}
            </span>
            <span className="shrink-0 font-mono text-[10px] text-tinta-tenue">
              {a.semestre ? `S${a.semestre}` : ''} · {a.uc} UC
            </span>
          </li>
        ))}
      </ul>
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
        {/* El panel no decia en ningun sitio que era. Ahora se presenta. */}
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[13px] leading-tight font-extrabold text-tinta">Tu avance</h2>
            <p className="mt-0.5 text-[11px] text-tinta-suave">
              {hayPorcentaje
                ? `${ucAprobadas + ucElectivas} de ${ucTitulo} UC del título`
                : `${ucAprobadas} UC de ${progreso.ucTotales} en obligatorias`}
            </p>
          </div>
          {/* Entero, no un decimal. "0.0%" se lee como un error de calculo, y
              nadie planifica su carrera por decimas. */}
          <div className="shrink-0 text-right">
            <span className="font-mono text-3xl leading-none font-extrabold text-aprobada">
              {hayPorcentaje ? `${Math.round(porcentaje)}%` : aprobadas}
            </span>
            {!hayPorcentaje && (
              <span className="font-mono text-sm text-tinta-tenue">/{total}</span>
            )}
          </div>
        </header>

        <BarraComposicion
          aprobadas={aprobadas}
          cursando={cursando}
          disponibles={disponibles}
          bloqueadas={progreso.bloqueadas}
          total={total}
        />

        {/* Lo unico accionable del panel va antes que cualquier resumen: es
            lo que se viene a mirar. */}
        <ParaInscribir materias={progreso.paraInscribir} />

        {/* Electivas y areas bajan a un desplegable cerrado. Son utiles pero
            no son lo que se busca al abrir el avance, y ocupando el sitio
            bueno tapaban lo que si. */}
        {(grupos.length > 0 || progreso.porArea.length > 0) && (
          <details className="group/mas">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg border border-panel-borde px-3 py-2 text-[11px] font-bold text-tinta-suave hover:text-tinta">
              Electivas y áreas
              <ChevronDown
                size={14}
                className="transition-transform duration-300 group-open/mas:rotate-180"
              />
            </summary>

            <div className="mt-2 flex flex-col gap-3">
              {grupos.length > 0 && (
                <div className="transicion-tema rounded-lg border border-panel-borde p-3">
                  <h3 className="text-[10px] font-bold tracking-wide text-tinta-tenue uppercase">
                    Electivas
                  </h3>
                  {/* Solo informa. Se marcan donde estan dibujadas: en la zona
                      de electivas del mapa o al final de la lista. */}
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

              <FiltroAreas
                areas={progreso.porArea}
                areaFiltrada={areaFiltrada}
                alFiltrarArea={alFiltrarArea}
              />
            </div>
          </details>
        )}

        <div className="mt-auto border-t border-panel-borde pt-3">
          <BotonReinicio reiniciar={reiniciar} hayMarcas={hayMarcas} />
        </div>
      </div>
    </>
  )
}

export default PanelProgreso
