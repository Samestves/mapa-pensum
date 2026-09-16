import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, KeyRound, Loader2, RefreshCw } from 'lucide-react'
import { CARRERAS, cargarCarrera } from '../data/carreras'

/**
 * El panel de uso. Privado: es la unica pantalla de la aplicacion que no es
 * para el estudiante.
 *
 * Vive dentro de la misma web -en /panel- y no en un sitio aparte porque asi
 * no hay un segundo despliegue que mantener, y se baja en su propio trozo de
 * codigo: quien entra a mirar su pensum no descarga nada de esto.
 *
 * La clave se recuerda solo mientras la pestaña este abierta
 * (sessionStorage): en un telefono prestado, cerrarla basta para que no quede
 * nada.
 *
 * Lo que enseña son numeros sumados. No hay forma de mirar a una persona
 * concreta, porque el servidor nunca guardo ninguna: ver api/latido.js.
 */
const CLAVE_GUARDADA = 'mapa-pensum:panel'

const mesLargo = (iso) =>
  new Date(`${iso}-01T12:00:00Z`).toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })
const diaCorto = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit' })

/** Una cifra grande con su rotulo, en el tono del resto de la aplicacion */
function Cifra({ valor, rotulo, nota }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[40px] leading-none font-extralight tracking-[-0.04em] text-tinta tabular-nums">
        {valor}
      </p>
      <p className="text-[10.5px] font-medium tracking-[0.18em] text-tinta-tenue uppercase">
        {rotulo}
      </p>
      {nota && <p className="text-[12px] text-tinta-tenue">{nota}</p>}
    </div>
  )
}

/** Barras por dia: los activos en verde y, detras, las visitas en gris */
function Barras({ dias }) {
  const techo = Math.max(...dias.map((d) => Math.max(d.activos, d.visitas)), 1)
  return (
    <div className="flex items-end gap-[3px]" style={{ height: 120 }}>
      {dias.map((d) => (
        <div
          key={d.fecha}
          className="relative flex h-full flex-1 items-end"
          title={`${diaCorto(d.fecha)} · ${d.activos} activos · ${d.visitas} visitas`}
        >
          <span
            className="absolute inset-x-0 bottom-0 rounded-t-[3px] bg-[color-mix(in_oklab,var(--tinta)_12%,transparent)]"
            style={{ height: `${(d.visitas / techo) * 100}%` }}
          />
          <span
            className="riel-tramo relative w-full rounded-t-[3px] bg-aprobada"
            style={{ height: `${(d.activos / techo) * 100}%` }}
          />
        </div>
      ))}
    </div>
  )
}

/** Un reparto -carreras, vistas- en barras horizontales */
function Reparto({ titulo, datos, nombres = {} }) {
  const filas = Object.entries(datos ?? {}).sort((a, b) => b[1] - a[1])
  const total = filas.reduce((s, [, n]) => s + n, 0)
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[10.5px] font-medium tracking-[0.18em] text-tinta-tenue uppercase">
        {titulo}
      </h2>
      {filas.length === 0 && <p className="text-[13px] text-tinta-tenue">Todavía no hay datos.</p>}
      {filas.map(([clave, n]) => (
        <div key={clave} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate text-tinta">{nombres[clave] ?? clave}</span>
            <span className="shrink-0 text-tinta-tenue tabular-nums">
              {n} <span className="text-[11px]">({Math.round((n / total) * 100)}%)</span>
            </span>
          </div>
          <div className="h-[3px] overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--tinta)_9%,transparent)]">
            <span
              className="riel-tramo block h-full rounded-full bg-aprobada"
              style={{ width: `${(n / filas[0][1]) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </section>
  )
}

/**
 * El mapa de calor: el pensum de una carrera con cada materia teñida por las
 * veces que se abrio su ficha. Misma forma que el mapa de verdad -una columna
 * por semestre- para reconocer de un vistazo donde esta mirando la gente.
 */
function Calor({ slug, calor }) {
  const [pensum, setPensum] = useState(null)

  useEffect(() => {
    let vigente = true
    setPensum(null)
    cargarCarrera(slug)
      .then((datos) => vigente && setPensum(datos))
      .catch(() => {})
    return () => {
      vigente = false
    }
  }, [slug])

  const columnas = useMemo(() => {
    if (!pensum) return []
    const mapa = new Map()
    for (const a of pensum.asignaturas) {
      if (a.esHueco) continue
      if (!mapa.has(a.semestre)) mapa.set(a.semestre, [])
      mapa.get(a.semestre).push(a)
    }
    return [...mapa.entries()].sort((a, b) => a[0] - b[0])
  }, [pensum])

  const techo = Math.max(...Object.values(calor ?? {}), 1)

  if (!pensum) {
    return (
      <p className="flex items-center gap-2 text-[13px] text-tinta-tenue">
        <Loader2 size={14} className="animate-spin" />
        Cargando el pensum…
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {columnas.map(([semestre, materias]) => (
          <div key={semestre} className="flex w-[74px] shrink-0 flex-col gap-1.5">
            <span className="text-center text-[10px] text-tinta-tenue tabular-nums">
              {String(semestre).padStart(2, '0')}
            </span>
            {materias.map((m) => {
              const n = calor?.[m.codigo] ?? 0
              return (
                <span
                  key={m.codigo}
                  title={`${m.nombre} · ${n} ${n === 1 ? 'visita' : 'visitas'}`}
                  className="grid h-7 place-items-center rounded-md border border-panel-borde text-[10px] tabular-nums"
                  style={{
                    backgroundColor: n
                      ? `color-mix(in oklab, var(--estado-aprobada) ${8 + (n / techo) * 62}%, var(--panel))`
                      : 'var(--panel)',
                    color: n / techo > 0.55 ? 'var(--lienzo)' : 'var(--tinta-tenue)',
                  }}
                >
                  {n || ''}
                </span>
              )
            })}
          </div>
        ))}
      </div>
      <p className="text-[12px] text-tinta-tenue">
        Cada cuadro es una materia, en la columna de su semestre. Cuanto más verde, más veces se
        abrió su ficha.
      </p>
    </div>
  )
}

function PanelUso({ alVolver }) {
  const [clave, setClave] = useState(() => sessionStorage.getItem(CLAVE_GUARDADA) ?? '')
  const [datos, setDatos] = useState(null)
  const [estado, setEstado] = useState('inicio')
  const [error, setError] = useState(null)
  const [carrera, setCarrera] = useState(CARRERAS[0]?.slug ?? null)

  const nombres = useMemo(() => Object.fromEntries(CARRERAS.map((c) => [c.slug, c.nombreCorto])), [])

  const consultar = useCallback(async (valor, slug) => {
    if (!valor) return
    setEstado('cargando')
    setError(null)
    try {
      const url = `/api/panel?clave=${encodeURIComponent(valor)}&dias=30${slug ? `&calor=${slug}` : ''}`
      const respuesta = await fetch(url)
      if (respuesta.status === 401) throw new Error('Esa clave no es')
      if (respuesta.status === 503) throw new Error('Falta configurar PANEL_CLAVE o el almacén')
      if (!respuesta.ok) throw new Error(`El servidor respondió ${respuesta.status}`)
      setDatos(await respuesta.json())
      sessionStorage.setItem(CLAVE_GUARDADA, valor)
      setEstado('listo')
    } catch (e) {
      setError(e.message)
      setEstado('error')
    }
  }, [])

  // Con la clave ya guardada en esta pestaña, entrar no vuelve a preguntarla
  useEffect(() => {
    if (clave) consultar(clave, carrera)
    // Solo al montar: a partir de ahi manda el formulario
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dias = datos?.dias ?? []
  const suma = (campo) => dias.reduce((s, d) => s + d[campo], 0)
  const visitas = suma('visitas')

  return (
    <div className="transicion-tema h-full overflow-y-auto bg-lienzo px-5 py-8 text-tinta">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10.5px] font-medium tracking-[0.24em] text-tinta-tenue uppercase">
              Mapa de Pensum
            </p>
            <h1 className="mt-1 text-[28px] leading-tight font-light tracking-[-0.03em]">Uso</h1>
            {datos && (
              <p className="mt-1 text-[12px] text-tinta-tenue">
                Últimos 30 días · {mesLargo(datos.mes)}
                {datos.desde && ` · desde ${diaCorto(datos.desde)}`}
              </p>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            {datos && (
              <button
                type="button"
                onClick={() => consultar(clave, carrera)}
                aria-label="Actualizar"
                className="grid size-9 place-items-center rounded-full border border-panel-borde text-tinta-suave transition-colors hover:text-tinta"
              >
                <RefreshCw size={15} className={estado === 'cargando' ? 'animate-spin' : ''} />
              </button>
            )}
            <button
              type="button"
              onClick={alVolver}
              className="flex h-9 items-center gap-2 rounded-full border border-panel-borde px-3.5 text-[12.5px] text-tinta-suave transition-colors hover:text-tinta"
            >
              <ArrowLeft size={14} />
              Salir
            </button>
          </div>
        </header>

        {!datos && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              consultar(clave, carrera)
            }}
            className="flex flex-col gap-3 rounded-2xl border border-panel-borde bg-panel p-5"
          >
            <label htmlFor="clave-panel" className="text-[13px] text-tinta-suave">
              Clave del panel
            </label>
            <div className="flex gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-panel-borde bg-panel-suave px-3">
                <KeyRound size={14} className="shrink-0 text-tinta-tenue" />
                <input
                  id="clave-panel"
                  type="password"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  autoComplete="current-password"
                  className="min-w-0 flex-1 bg-transparent py-2.5 text-[13px] text-tinta outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!clave || estado === 'cargando'}
                className="rounded-xl bg-aprobada px-4 text-[12.5px] font-semibold text-[var(--lienzo)] disabled:opacity-50"
              >
                Entrar
              </button>
            </div>
            {error && <p className="text-[12.5px] text-[var(--estado-rojo)]">{error}</p>}
          </form>
        )}

        {datos && (
          <>
            <section className="grid grid-cols-3 gap-4">
              <Cifra valor={dias.at(-1)?.activos ?? 0} rotulo="Hoy" nota="personas distintas" />
              <Cifra
                valor={datos.semanas.at(-1)?.activos ?? 0}
                rotulo="Esta semana"
                nota={`${datos.semanas.at(-2)?.activos ?? 0} la pasada`}
              />
              <Cifra
                valor={datos.meses.at(-1)?.activos ?? 0}
                rotulo="Este mes"
                nota={`${datos.meses.at(-2)?.activos ?? 0} el pasado`}
              />
            </section>

            <section className="flex flex-col gap-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-[10.5px] font-medium tracking-[0.18em] text-tinta-tenue uppercase">
                  Activos por día
                </h2>
                <p className="text-[12px] text-tinta-tenue tabular-nums">
                  {visitas} visitas · {suma('nuevos')} nuevos ·{' '}
                  {visitas ? Math.round((suma('pwa') / visitas) * 100) : 0}% instalada
                </p>
              </div>
              <Barras dias={dias} />
              <div className="flex justify-between text-[10.5px] text-tinta-tenue tabular-nums">
                <span>{dias[0] && diaCorto(dias[0].fecha)}</span>
                <span>{dias.at(-1) && diaCorto(dias.at(-1).fecha)}</span>
              </div>
            </section>

            <div className="grid gap-8 sm:grid-cols-2">
              <Reparto titulo="Carreras del mes" datos={datos.carreras} nombres={nombres} />
              <Reparto
                titulo="Vistas del mes"
                datos={datos.vistas}
                nombres={{ mapa: 'Mapa', lista: 'Lista', horario: 'Horario' }}
              />
            </div>

            <section className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-[10.5px] font-medium tracking-[0.18em] text-tinta-tenue uppercase">
                  Mapa de calor
                </h2>
                <select
                  value={carrera ?? ''}
                  onChange={(e) => {
                    setCarrera(e.target.value)
                    consultar(clave, e.target.value)
                  }}
                  className="rounded-xl border border-panel-borde bg-panel px-3 py-2 text-[12.5px] text-tinta"
                >
                  {CARRERAS.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.nombreCorto}
                    </option>
                  ))}
                </select>
              </div>
              {carrera && <Calor slug={carrera} calor={datos.calor} />}
            </section>

            <p className="pb-6 text-[11.5px] leading-relaxed text-tinta-tenue">
              Todo lo de aquí está sumado: no se guarda quién hizo qué. Las personas distintas se
              cuentan con un identificador aleatorio que vive en cada teléfono, así que borrar los
              datos del navegador o entrar desde otro aparato cuenta como alguien nuevo.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default PanelUso
