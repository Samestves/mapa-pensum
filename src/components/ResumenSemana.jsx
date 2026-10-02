import { memo, useMemo } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { colorClase } from '../theme/areas'
import { momentoEnSemana, tramoCorto } from '../layout/horario'

const TITULO = 'text-[11px] font-semibold tracking-[0.14em] text-tinta-tenue uppercase'

const fechaLarga = (fecha) =>
  fecha.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })

/** Horas con una coma decimal solo si hace falta: 4, 1,5 */
const cifraHoras = (minutos) => {
  const h = minutos / 60
  return Number.isInteger(h) ? String(h) : h.toFixed(1).replace('.', ',')
}

/**
 * La columna de la derecha del horario de escritorio: lo que la semana dice
 * en palabras.
 *
 * Arriba cuanto pesa -horas de clase, materias, UC-; despues hoy, que es lo
 * que se viene a mirar casi siempre, con la que esta en curso señalada; y
 * las materias con su color, que hacen de leyenda de la cuadricula. Al pie,
 * descargar la semana como imagen: una accion de esta vista, en su sitio y
 * no flotando encima de las clases.
 *
 * Cuenta todo de las sesiones; no guarda nada propio.
 */
function ResumenSemana({ sesiones, porCodigo, colores, fecha, bajando, alDescargar }) {
  const momento = momentoEnSemana(fecha)
  const materias = useMemo(() => {
    const porMateria = new Map()
    for (const s of sesiones) {
      const m = porMateria.get(s.codigo) ?? { sesion: s, minutos: 0 }
      m.minutos += s.fin - s.inicio
      porMateria.set(s.codigo, m)
    }
    return [...porMateria.entries()].map(([codigo, m]) => ({
      codigo,
      ...m,
      asignatura: porCodigo.get(codigo),
    }))
  }, [sesiones, porCodigo])

  const minutosSemana = materias.reduce((t, m) => t + m.minutos, 0)
  const uc = materias.reduce((t, m) => t + (m.asignatura?.uc ?? 0), 0)
  const hoy = momento
    ? sesiones.filter((s) => s.dia === momento.dia).sort((a, b) => a.inicio - b.inicio)
    : []

  return (
    <aside className="hidden w-[19rem] shrink-0 flex-col overflow-hidden rounded-[28px] border border-panel-borde bg-panel lg:flex">
      <div className="desplazable-limpio flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto p-6">
        <header>
          <p className={TITULO}>Tu semana</p>
          <p className="mt-2 flex items-baseline gap-1.5 text-tinta">
            <span className="text-[44px] leading-none font-extralight tracking-[-0.04em] tabular-nums">
              {cifraHoras(minutosSemana)}
            </span>
            <span className="text-[15px] text-tinta-suave">h de clase</span>
          </p>
          <p className="mt-2 text-[13px] text-tinta-suave">
            {materias.length} {materias.length === 1 ? 'materia' : 'materias'}
            {uc > 0 && ` · ${uc} UC`}
          </p>
        </header>

        <section>
          <h3 className={TITULO}>Hoy · {fechaLarga(fecha)}</h3>
          {hoy.length ? (
            <ul className="mt-3 flex flex-col gap-2">
              {hoy.map((s) => {
                const enCurso = momento.minuto >= s.inicio && momento.minuto < s.fin
                return (
                  <li
                    key={s.id}
                    data-en-curso={enCurso}
                    style={{ '--c': colorClase(s, colores) }}
                    className="clase-hoy flex items-stretch gap-3 rounded-[16px] p-3"
                  >
                    <span aria-hidden="true" className="w-1 shrink-0 rounded-full bg-[var(--c)]" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-[11px] font-semibold tabular-nums text-tinta-suave">
                        {tramoCorto(s.inicio, s.fin)}
                        {enCurso && (
                          <span className="rounded-full bg-[var(--ahora)] px-1.5 py-px text-[9.5px] tracking-[0.08em] text-white uppercase">
                            Ahora
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-[13.5px] font-medium text-tinta">
                        {porCodigo.get(s.codigo)?.nombre ?? s.codigo}
                      </span>
                      {s.aula && (
                        <span className="block truncate text-[11.5px] text-tinta-tenue">{s.aula}</span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="mt-3 text-[13px] text-tinta-suave">
              {momento ? 'Hoy no tienes clases.' : 'Es fin de semana.'}
            </p>
          )}
        </section>

        <section>
          <h3 className={TITULO}>Materias</h3>
          <ul className="mt-3 flex flex-col gap-2.5">
            {materias.map((m) => (
              <li key={m.codigo} className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-[4px]"
                  style={{ backgroundColor: colorClase(m.sesion, colores) }}
                />
                <span className="min-w-0 flex-1 truncate text-[13px] text-tinta">
                  {m.asignatura?.nombre ?? m.codigo}
                </span>
                <span className="shrink-0 text-[12px] tabular-nums text-tinta-tenue">
                  {cifraHoras(m.minutos)} h
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <footer className="shrink-0 border-t border-panel-borde p-4">
        <button
          type="button"
          onClick={alDescargar}
          disabled={bajando}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-tinta text-[13.5px] font-semibold text-[var(--panel)] transition-[opacity,transform] duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
        >
          {bajando ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Descargar como imagen
        </button>
      </footer>
    </aside>
  )
}

export default memo(ResumenSemana)
