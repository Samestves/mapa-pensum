import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, GraduationCap, RotateCcw, TriangleAlert } from 'lucide-react'
import { useCerrarConEscape } from '../hooks/useCerrarConEscape'
import { useNumeroAnimado } from '../hooks/useNumeroAnimado'
import { colorArea, etiquetaArea } from '../theme/areas'
import Popover from './Popover'

const ANCHO = 304

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
          className="flex w-full items-center justify-center gap-2 rounded-lg py-1.5 text-[11px] font-semibold text-tinta-tenue transition-colors hover:text-tinta disabled:cursor-not-allowed disabled:opacity-35"
        >
          <RotateCcw size={13} />
          Reiniciar mi avance
        </button>
      )}
    </div>
  )
}

/**
 * Como esta repartida la carrera.
 *
 * Es lo unico que de verdad hace falta ver aqui, y por eso es lo unico que se
 * queda en primer plano. Reparte los cuatro estados en sus colores, asi que
 * de un vistazo se ve la forma de la carrera: cuanto llevas hecho, cuanto
 * tienes en marcha, cuanto se te ha abierto y cuanto sigue cerrado. Es la
 * misma tinta que usa el mapa, asi que no hay leyenda nueva que aprender.
 */
function BarraComposicion({ aprobadas, cursando, disponibles, bloqueadas, total }) {
  if (!total) return null

  const tramos = [
    { clave: 'aprobadas', n: aprobadas, color: 'var(--estado-aprobada)', texto: 'aprobadas' },
    { clave: 'cursando', n: cursando, color: 'var(--estado-cursando)', texto: 'cursando' },
    { clave: 'disponibles', n: disponibles, color: 'var(--tinta-suave)', texto: 'puedes inscribir' },
    { clave: 'bloqueadas', n: bloqueadas, color: 'var(--panel-borde)', texto: 'aún bloqueadas' },
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
            <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
            <span className="font-mono font-bold text-tinta">{t.n}</span>
            <span className="min-w-0 truncate">{t.texto}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Filtro por area. Vivia en la leyenda flotante del mapa, que se quito por
 * estorbar. El filtro si era una funcion de verdad -el unico sitio desde
 * donde se puede aislar un area-, asi que se conserva; pero es una
 * herramienta del mapa y no una medida de avance, y por eso va plegado.
 */
function FiltroAreas({ areas, areaFiltrada, alFiltrarArea }) {
  if (!areas.length) return null

  return (
    <div>
      <h3 className="text-[10px] font-bold tracking-wide text-tinta-tenue uppercase">Áreas</h3>
      <p className="mt-0.5 mb-1.5 text-[10px] text-tinta-tenue">Toca una para aislarla en el mapa.</p>
      <div className="flex flex-col gap-0.5">
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
              className={`flex items-center gap-2 rounded px-1 py-0.5 text-left transition-opacity ${
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
 * El avance de la carrera, colgado del anillo que lo abre.
 *
 * Antes era un cajon: pegado al borde derecho a lo alto en escritorio y una
 * hoja desde abajo en el telefono. Dos formas distintas del mismo contenido,
 * y las dos mucho mas grandes de lo que tenian que decir. Un cajon de pared a
 * pared promete el peso de una seccion entera de la aplicacion; esto es una
 * consulta de dos segundos: como voy.
 *
 * Ahora es una nubecita anclada al anillo, la misma pieza que ya usa el menu
 * de una clase en el horario -misma colocacion, mismo origen de animacion-, y
 * la misma en el telefono que en el escritorio. Colgar de lo que lo abrio dice
 * de donde salio y a que pertenece; una hoja que sube desde abajo no lo dice.
 *
 * Y adelgaza. Lo que se queda a la vista es el porcentaje, los creditos y como
 * esta repartida la carrera, que es lo que se viene a mirar. La lista de "lo
 * que puedes inscribir ahora" se va entera: eran hasta once filas ocupando el
 * mejor sitio para repetir lo que el mapa ya pinta en verde y lo que
 * Planificar calcula entero: cuantas son sigue estando, en la leyenda. Las
 * electivas y las areas quedan plegadas, que es donde estaban, porque ninguna
 * de las dos es la pregunta que trae a nadie aqui.
 */
function PanelProgreso({
  alPlanificar,
  progreso,
  avanceGrupos,
  reiniciar,
  hayMarcas,
  abierto,
  ancla,
  alCerrar,
  areaFiltrada,
  alFiltrarArea,
}) {
  const { ucAprobadas, ucElectivas, ucTitulo, aprobadas, cursando, disponibles, total } = progreso
  // Sin creditos oficiales no hay porcentaje: se muestran materias y UC sueltas
  const hayPorcentaje = progreso.porcentaje != null
  const porcentaje = useNumeroAnimado(progreso.porcentaje ?? 0)
  const grupos = Object.values(avanceGrupos)

  if (!abierto || !ancla) return null

  return (
    <Popover
      ancla={ancla}
      ancho={ANCHO}
      etiqueta="Tu avance"
      alCerrar={alCerrar}
      claseContenido="flex max-h-[min(78vh,34rem)] flex-col gap-3.5 overflow-y-auto p-4"
    >
        <>
          {/* El porcentaje grande y los creditos debajo. Entero, no un decimal:
              "0.0%" se lee como un error de calculo, y nadie planifica su
              carrera por decimas. */}
          <header className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[10px] font-bold tracking-wide text-tinta-tenue uppercase">
                Tu avance
              </h2>
              <p className="mt-1 truncate text-[11px] text-tinta-suave">
                {hayPorcentaje
                  ? `${ucAprobadas + ucElectivas} de ${ucTitulo} UC del título`
                  : `${ucAprobadas} UC de ${progreso.ucTotales} en obligatorias`}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className="font-mono text-3xl leading-none font-extrabold text-aprobada">
                {hayPorcentaje ? `${Math.round(porcentaje)}%` : aprobadas}
              </span>
              {!hayPorcentaje && <span className="font-mono text-sm text-tinta-tenue">/{total}</span>}
            </div>
          </header>

          <BarraComposicion
            aprobadas={aprobadas}
            cursando={cursando}
            disponibles={disponibles}
            bloqueadas={progreso.bloqueadas}
            total={total}
          />

          {/* Planificar vive AQUI, y no suelto en la cabecera.
              Este panel contesta "como voy" y Planificar contesta "cuando
              termino": es la pregunta siguiente de la misma conversacion, y
              se hace justo despues de mirar el porcentaje. Arriba, en cambio,
              estaba al lado del mando de vistas -que son SITIOS- pareciendo
              su cuarta pestaña, y siendo la unica accion de la fila obligaba
              a la barra a tener un peso visual solo para ella.
              En el telefono no sale de aqui porque alli ya esta en la barra
              de abajo, que es donde llega el pulgar. */}
          <button
            type="button"
            onClick={alPlanificar}
            className="group hidden w-full items-center justify-center gap-2 rounded-xl bg-aprobada px-3 py-2.5 text-[12.5px] font-extrabold text-[var(--lienzo)] transition-transform active:scale-[0.98] md:flex"
          >
            <GraduationCap
              size={15}
              className="shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5"
            />
            Planificar mi ruta hasta el grado
          </button>

          {(grupos.length > 0 || progreso.porArea.length > 0) && (
            <details className="group/mas border-t border-panel-borde pt-3">
              <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-bold text-tinta-suave hover:text-tinta">
                Electivas y áreas
                <ChevronDown
                  size={14}
                  className="transition-transform duration-300 group-open/mas:rotate-180"
                />
              </summary>

              <div className="mt-3 flex flex-col gap-3">
                {grupos.length > 0 && (
                  <div>
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

          <div className="border-t border-panel-borde pt-2.5">
            <BotonReinicio reiniciar={reiniciar} hayMarcas={hayMarcas} />
          </div>
        </>
    </Popover>
  )
}

export default PanelProgreso
