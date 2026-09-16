import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, KeyRound, Loader2, LogOut, RefreshCw, TriangleAlert } from 'lucide-react'
import { CARRERAS, cargarCarrera } from '../data/carreras'

/**
 * El panel de uso. Privado: es la unica pantalla de la aplicacion que no es
 * para el estudiante.
 *
 * Vive dentro de la misma web -en /panel- y se baja en su propio trozo de
 * codigo: quien entra a mirar su pensum no descarga nada de esto.
 *
 * Todo lo que enseña esta sumado. No hay forma de mirar a una persona
 * concreta porque el servidor nunca guardo ninguna: ver api/latido.js.
 *
 * Cada bloque dice lo que significa debajo del numero. Un panel que solo
 * enseña cifras obliga a recordar que era cada una, y este se mira una vez
 * por semana: para entonces ya se olvido.
 */
const CLAVE_GUARDADA = 'mapa-pensum:panel'

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const NOMBRE_VISTA = { mapa: 'Mapa', lista: 'Lista', horario: 'Horario' }
const NOMBRE_APARATO = { movil: 'Teléfono', escritorio: 'Computadora' }
const TRAMOS = { '0-1': 'Menos de 1 min', '1-3': '1 a 3 min', '3-10': '3 a 10 min', '10+': 'Más de 10 min' }

const mesLargo = (iso) =>
  new Date(`${iso}-01T12:00:00Z`).toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })
const diaCorto = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit' })
const hora = (h) => `${String(h).padStart(2, '0')}:00`

/** Suma los valores de un objeto de contadores */
const total = (objeto) => Object.values(objeto ?? {}).reduce((s, n) => s + n, 0)

/* Verde de la casa con la fuerza que se le pida. Todo el panel tiñe con esto
   para que barras, reloj y mapa de calor se lean como la misma escala. */
const verde = (fuerza) =>
  `color-mix(in oklab, var(--estado-aprobada) ${Math.round(fuerza * 100)}%, var(--panel))`

/** Una cifra grande con su rotulo y una linea que explica que es */
function Cifra({ valor, rotulo, nota, acento }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-panel-borde bg-panel p-4">
      <p
        className="text-[34px] leading-none font-extralight tracking-[-0.04em] tabular-nums"
        style={{ color: acento ?? 'var(--tinta)' }}
      >
        {valor}
      </p>
      <p className="text-[10.5px] font-medium tracking-[0.16em] text-tinta-tenue uppercase">
        {rotulo}
      </p>
      {nota && <p className="text-[11.5px] leading-snug text-tinta-tenue">{nota}</p>}
    </div>
  )
}

/** Titulo de bloque con su explicacion, para no tener que adivinar nada */
function Bloque({ titulo, explica, children, acciones }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-light tracking-[-0.01em] text-tinta">{titulo}</h2>
          {explica && <p className="mt-0.5 text-[11.5px] text-tinta-tenue">{explica}</p>}
        </div>
        {acciones}
      </div>
      {children}
    </section>
  )
}

/**
 * Los dias, en barras. Las personas distintas en verde, y detras, mas palida,
 * la cuenta de visitas: cuando la gris asoma mucho por encima de la verde es
 * que la misma gente esta entrando varias veces al dia.
 */
function Dias({ dias }) {
  const techo = Math.max(...dias.map((d) => Math.max(d.activos, d.visitas)), 1)
  const media = dias.reduce((s, d) => s + d.activos, 0) / (dias.length || 1)

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-panel-borde bg-panel p-4">
      <div className="relative flex items-end gap-[2px]" style={{ height: 140 }}>
        {/* La media, como referencia: una linea y su numero */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-[color-mix(in_oklab,var(--tinta)_18%,transparent)]"
          style={{ bottom: `${(media / techo) * 100}%` }}
        />
        {dias.map((d) => (
          <div
            key={d.fecha}
            className="relative flex h-full flex-1 items-end"
            title={`${diaCorto(d.fecha)} · ${d.activos} personas · ${d.visitas} visitas · ${d.nuevos} nuevas`}
          >
            <span
              className="absolute inset-x-0 bottom-0 rounded-t-[2px] bg-[color-mix(in_oklab,var(--tinta)_14%,transparent)]"
              style={{ height: `${(d.visitas / techo) * 100}%` }}
            />
            <span
              className="riel-tramo relative w-full rounded-t-[2px] bg-aprobada"
              style={{ height: `${(d.activos / techo) * 100}%` }}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-between text-[10.5px] text-tinta-tenue tabular-nums">
        <span>{dias[0] && diaCorto(dias[0].fecha)}</span>
        <span>media {media.toFixed(1)} al día</span>
        <span>{dias.at(-1) && diaCorto(dias.at(-1).fecha)}</span>
      </div>

      <div className="flex gap-4 border-t border-panel-borde pt-2 text-[11.5px] text-tinta-tenue">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-[2px] bg-aprobada" />
          personas distintas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-[2px] bg-[color-mix(in_oklab,var(--tinta)_20%,transparent)]" />
          visitas
        </span>
      </div>
    </div>
  )
}

/** Un reparto en barras horizontales, con su comparacion si la hay */
function Reparto({ datos, nombres = {}, antes, orden, vacio = 'Todavía no hay datos.' }) {
  /* Por cantidad, salvo donde el orden significa algo: los tramos de
     duracion se leen de menos a mas tiempo, no de mas a menos visitas. */
  const filas = Object.entries(datos ?? {}).sort((a, b) =>
    orden ? orden.indexOf(a[0]) - orden.indexOf(b[0]) : b[1] - a[1],
  )
  const suma = total(datos)
  if (!filas.length) return <p className="text-[12.5px] text-tinta-tenue">{vacio}</p>

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-panel-borde bg-panel p-4">
      {filas.map(([clave, n]) => {
        const previo = antes?.[clave]
        const cambio = previo ? Math.round(((n - previo) / previo) * 100) : null
        return (
          <div key={clave} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="min-w-0 truncate text-tinta">{nombres[clave] ?? clave}</span>
              <span className="flex shrink-0 items-baseline gap-2 text-tinta-tenue tabular-nums">
                {cambio != null && (
                  <span
                    className="text-[11px]"
                    style={{
                      color:
                        cambio > 0
                          ? 'var(--estado-aprobada)'
                          : cambio < 0
                            ? 'var(--estado-rojo)'
                            : 'var(--tinta-tenue)',
                    }}
                  >
                    {cambio > 0 ? '+' : ''}
                    {cambio}%
                  </span>
                )}
                <span className="text-tinta">{n}</span>
                <span className="text-[11px]">{Math.round((n / suma) * 100)}%</span>
              </span>
            </div>
            <div className="h-[3px] overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--tinta)_9%,transparent)]">
              <span
                className="riel-tramo block h-full rounded-full bg-aprobada"
                style={{ width: `${(n / filas[0][1]) * 100}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * El reloj de la semana: una fila por dia y una columna por hora, teñidas por
 * cuantas visitas hubo. Dice cuando usa la gente esto -antes de clase, de
 * noche, el domingo- que es lo que no cuenta ningun total.
 */
function Reloj({ reloj }) {
  const techo = Math.max(...reloj.flat(), 1)
  const hay = reloj.flat().some((n) => n > 0)

  if (!hay) {
    return (
      <p className="rounded-2xl border border-panel-borde bg-panel p-4 text-[12.5px] text-tinta-tenue">
        Todavía no hay visitas suficientes para ver un patrón de horas.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-panel-borde bg-panel p-4">
      <div className="min-w-[520px]">
        <div className="mb-1 grid grid-cols-[34px_repeat(24,1fr)] gap-[2px] text-[9px] text-tinta-tenue tabular-nums">
          <span />
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} className="text-center">
              {h % 3 === 0 ? h : ''}
            </span>
          ))}
        </div>
        {reloj.map((fila, d) => (
          <div key={d} className="grid grid-cols-[34px_repeat(24,1fr)] items-center gap-[2px]">
            <span className="text-[10.5px] text-tinta-tenue">{DIAS_SEMANA[d]}</span>
            {fila.map((n, h) => (
              <span
                key={h}
                title={`${DIAS_SEMANA[d]} a las ${hora(h)} · ${n} ${n === 1 ? 'visita' : 'visitas'}`}
                className="h-4 rounded-[3px]"
                style={{
                  backgroundColor: n
                    ? verde(0.12 + (n / techo) * 0.68)
                    : 'color-mix(in oklab, var(--tinta) 5%, transparent)',
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * El mapa de calor de materias: el pensum de una carrera con cada materia
 * teñida por las veces que se abrio su ficha, en columnas por semestre como
 * en el mapa de verdad.
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

  const vistas = total(calor)
  const techo = Math.max(...Object.values(calor ?? {}), 1)
  const masVistas = Object.entries(calor ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([codigo, n]) => {
      const materia = pensum?.asignaturas.find((a) => a.codigo === codigo)
      return materia ? `${materia.nombre} (${n})` : null
    })
    .filter(Boolean)

  if (!pensum) {
    return (
      <p className="flex items-center gap-2 rounded-2xl border border-panel-borde bg-panel p-4 text-[12.5px] text-tinta-tenue">
        <Loader2 size={14} className="animate-spin" />
        Cargando el pensum…
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-panel-borde bg-panel p-4">
      {vistas === 0 ? (
        <p className="text-[12.5px] text-tinta-tenue">
          Nadie ha abierto todavía la ficha de una materia de esta carrera.
        </p>
      ) : (
        <p className="text-[12.5px] text-tinta-suave">
          {vistas} fichas abiertas. Las más miradas: {masVistas.join(' · ')}
        </p>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {columnas.map(([semestre, materias]) => (
          <div key={semestre} className="flex w-[52px] shrink-0 flex-col gap-1">
            <span className="text-center text-[9.5px] text-tinta-tenue tabular-nums">
              {String(semestre).padStart(2, '0')}
            </span>
            {materias.map((m) => {
              const n = calor?.[m.codigo] ?? 0
              const fuerza = n / techo
              return (
                <span
                  key={m.codigo}
                  title={`${m.nombre} · ${n} ${n === 1 ? 'ficha abierta' : 'fichas abiertas'}`}
                  className="grid h-6 place-items-center rounded-[5px] text-[10px] tabular-nums"
                  style={{
                    backgroundColor: n
                      ? verde(0.14 + fuerza * 0.66)
                      : 'color-mix(in oklab, var(--tinta) 5%, transparent)',
                    color: fuerza > 0.5 ? 'var(--lienzo)' : 'var(--tinta-tenue)',
                  }}
                >
                  {n || ''}
                </span>
              )
            })}
          </div>
        ))}
      </div>
      <p className="text-[11.5px] text-tinta-tenue">
        Una columna por semestre y un cuadro por materia, en el mismo orden que el mapa. Pasa el
        cursor para ver cuál es.
      </p>
    </div>
  )
}

function PanelUso({ alVolver }) {
  const [clave, setClave] = useState(() => sessionStorage.getItem(CLAVE_GUARDADA) ?? '')
  const [datos, setDatos] = useState(null)
  const [estado, setEstado] = useState('inicio')
  const [error, setError] = useState(null)
  /* Null hasta que llegan los datos: el servidor devuelve la carrera mas
     usada, que es la que tiene sentido enseñar al abrir. */
  const [carrera, setCarrera] = useState(null)
  const [actualizado, setActualizado] = useState(null)

  const nombres = useMemo(() => Object.fromEntries(CARRERAS.map((c) => [c.slug, c.nombreCorto])), [])

  const consultar = useCallback(async (valor, slug) => {
    if (!valor) return
    setEstado('cargando')
    setError(null)
    try {
      const url = `/api/panel?clave=${encodeURIComponent(valor)}&dias=30${slug ? `&calor=${slug}` : ''}`
      const respuesta = await fetch(url)
      if (respuesta.status === 401) throw new Error('Esa clave no es')
      if (respuesta.status === 503) throw new Error('Falta configurar PANEL_CLAVE o la base de datos')
      if (!respuesta.ok) throw new Error(`El servidor respondió ${respuesta.status}`)
      const recibido = await respuesta.json()
      setDatos(recibido)
      if (recibido.calorDe) setCarrera(recibido.calorDe)
      setActualizado(new Date())
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
  const activos = datos?.activos
  const cambioMes =
    activos?.mesAnterior > 0
      ? Math.round(((activos.mes - activos.mesAnterior) / activos.mesAnterior) * 100)
      : null
  const sinDatos = datos && visitas === 0 && activos?.treinta === 0

  return (
    <div className="transicion-tema h-full overflow-y-auto bg-lienzo px-5 py-8 text-tinta">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10.5px] font-medium tracking-[0.24em] text-tinta-tenue uppercase">
              Mapa de Pensum
            </p>
            <h1 className="mt-1 text-[28px] leading-tight font-light tracking-[-0.03em]">Uso</h1>
            {datos && (
              <p className="mt-1 text-[12px] text-tinta-tenue">
                Últimos 30 días · mes de {mesLargo(datos.mes)}
                {datos.desde && ` · midiendo desde el ${diaCorto(datos.desde)}`}
              </p>
            )}
          </div>
          {datos && (
            <div className="flex shrink-0 items-center gap-2">
              {actualizado && (
                <span className="text-[11px] text-tinta-tenue tabular-nums">
                  {actualizado.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <button
                type="button"
                onClick={() => consultar(clave, carrera)}
                aria-label="Actualizar"
                className="grid size-9 place-items-center rounded-full border border-panel-borde text-tinta-suave transition-colors hover:text-tinta"
              >
                <RefreshCw size={15} className={estado === 'cargando' ? 'animate-spin' : ''} />
              </button>
              <button
                type="button"
                onClick={() => {
                  sessionStorage.removeItem(CLAVE_GUARDADA)
                  setClave('')
                  setDatos(null)
                  setEstado('inicio')
                }}
                aria-label="Olvidar la clave"
                className="grid size-9 place-items-center rounded-full border border-panel-borde text-tinta-suave transition-colors hover:text-tinta"
              >
                <LogOut size={15} />
              </button>
              <button
                type="button"
                onClick={alVolver}
                className="flex h-9 items-center gap-2 rounded-full border border-panel-borde px-3.5 text-[12.5px] text-tinta-suave transition-colors hover:text-tinta"
              >
                <ArrowLeft size={14} />
                Salir
              </button>
            </div>
          )}
        </header>

        {datos && error && (
          <p className="flex items-center gap-2 rounded-xl border border-[color-mix(in_oklab,var(--estado-rojo)_40%,transparent)] px-4 py-3 text-[12.5px] text-[var(--estado-rojo)]">
            <TriangleAlert size={14} />
            No pude actualizar: {error}. Lo que ves es de la última consulta.
          </p>
        )}

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
                {estado === 'cargando' ? 'Entrando…' : 'Entrar'}
              </button>
            </div>
            {error && <p className="text-[12.5px] text-[var(--estado-rojo)]">{error}</p>}
          </form>
        )}

        {datos && (
          <>
            {sinDatos && (
              <p className="rounded-2xl border border-panel-borde bg-panel p-4 text-[13px] leading-relaxed text-tinta-suave">
                Todavía no hay visitas registradas. La cuenta empezó el{' '}
                {datos.desde ? diaCorto(datos.desde) : 'día del despliegue'}, y solo cuenta lo que
                pasa en la web publicada: lo que hagas en tu computadora mientras desarrollas no
                entra.
              </p>
            )}

            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Cifra valor={activos.hoy} rotulo="Hoy" nota="el día va en curso" />
              <Cifra valor={activos.siete} rotulo="7 días" nota="personas distintas" />
              <Cifra valor={activos.treinta} rotulo="30 días" nota="personas distintas" />
              <Cifra
                valor={activos.mes}
                rotulo={`Mes de ${mesLargo(datos.mes).split(' ')[0]}`}
                nota={
                  cambioMes == null
                    ? `${activos.mesAnterior} el mes pasado`
                    : `${cambioMes > 0 ? '+' : ''}${cambioMes}% frente al mes pasado`
                }
                acento={cambioMes > 0 ? 'var(--estado-aprobada)' : undefined}
              />
            </section>

            <Bloque
              titulo="Día a día"
              explica="Cuánta gente distinta entró cada día y cuántas visitas hubo en total."
            >
              <Dias dias={dias} />
            </Bloque>

            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Cifra valor={visitas} rotulo="Visitas" nota="en los 30 días" />
              <Cifra
                valor={suma('nuevos')}
                rotulo="Nuevas"
                nota="primera vez que entran desde ese aparato"
              />
              <Cifra
                valor={`${visitas ? Math.round((suma('pwa') / visitas) * 100) : 0}%`}
                rotulo="Instalada"
                nota="visitas desde la app instalada"
              />
              <Cifra
                valor={datos.acciones?.marcas ?? 0}
                rotulo="Materias marcadas"
                nota={`en ${datos.acciones?.['visitas-con-marcas'] ?? 0} visitas de este mes`}
              />
            </section>

            <Bloque
              titulo="Carreras"
              explica={`Cuántas visitas abrió cada carrera este mes, comparado con ${mesLargo(datos.mesAnterior)}.`}
            >
              <Reparto datos={datos.carreras} antes={datos.carrerasAntes} nombres={nombres} />
            </Bloque>

            <div className="grid gap-8 sm:grid-cols-2">
              <Bloque titulo="Vistas" explica="Qué parte de la aplicación se usa.">
                <Reparto datos={datos.vistas} nombres={NOMBRE_VISTA} />
              </Bloque>
              <Bloque titulo="Aparato" explica="Desde dónde entran.">
                <Reparto datos={datos.aparato} nombres={NOMBRE_APARATO} />
              </Bloque>
            </div>

            <Bloque
              titulo="Cuánto se quedan"
              explica="Duración de cada visita. Muchas visitas de menos de un minuto suelen ser gente que solo miraba."
            >
              <Reparto datos={datos.duracion} nombres={TRAMOS} orden={Object.keys(TRAMOS)} />
            </Bloque>

            <Bloque
              titulo="A qué hora entran"
              explica="Visitas por día de la semana y hora, en los últimos 30 días. Hora de Venezuela."
            >
              <Reloj reloj={datos.reloj ?? []} />
            </Bloque>

            <Bloque
              titulo="Materias más miradas"
              explica="Cuántas veces se abrió la ficha de cada materia, desde que se empezó a medir."
              acciones={
                <select
                  value={carrera ?? ''}
                  onChange={(e) => {
                    setCarrera(e.target.value)
                    consultar(clave, e.target.value)
                  }}
                  aria-label="Carrera del mapa de calor"
                  className="rounded-xl border border-panel-borde bg-panel px-3 py-2 text-[12.5px] text-tinta"
                >
                  {CARRERAS.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.nombreCorto}
                    </option>
                  ))}
                </select>
              }
            >
              {carrera && <Calor slug={carrera} calor={datos.calor} />}
            </Bloque>

            <p className="pb-6 text-[11.5px] leading-relaxed text-tinta-tenue">
              Todo está sumado: no se guarda quién hizo qué, ni sus marcas, ni su horario. Las
              personas distintas se cuentan con un identificador aleatorio guardado en cada
              aparato, así que entrar desde el teléfono y desde la computadora cuenta como dos, y
              borrar los datos del navegador cuenta como alguien nuevo. Tus propias visitas también
              entran.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default PanelUso
