import { SITUACION } from '../../layout/situacion'
import { useNumeroAnimado } from '../../hooks/useNumeroAnimado'
import { IconoSituacion } from '../IconoSituacion'
import { colorSituacion } from './aspecto'

/**
 * Lo primero de la lista: cuanto llevas y donde. El numero grande y fino, y
 * una barra por semestre que se llena de abajo arriba. Tocar una lleva a ese
 * semestre.
 */
export default function Resumen({ progreso, semestres, actual, alIr }) {
  const conTitulo = progreso.porcentaje != null
  const valor = useNumeroAnimado(conTitulo ? progreso.porcentaje : progreso.porcentajeObligatorias)

  return (
    <section className="lista-entrar flex flex-col gap-5 pt-2" aria-label="Tu avance">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="flex items-baseline leading-none">
            <span className="text-[52px] font-extralight tracking-[-0.04em] text-tinta tabular-nums">
              {Math.round(valor)}
            </span>
            <span className="ml-0.5 text-[20px] font-light text-tinta-tenue">%</span>
            <span className="ml-2 text-[11px] font-medium tracking-[0.16em] text-tinta-tenue uppercase">
              {conTitulo ? 'del título' : 'de avance'}
            </span>
          </p>
          <p className="mt-2 text-[12px] text-tinta-tenue tabular-nums">
            {conTitulo
              ? `${progreso.ucAprobadas + progreso.ucElectivas} de ${progreso.ucTitulo} UC aprobadas`
              : `${progreso.ucAprobadas} de ${progreso.ucTotales} UC aprobadas`}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5 pb-0.5 text-[12.5px] tabular-nums">
          {[
            { situacion: SITUACION.INSCRIBIBLE, n: progreso.disponibles, nombre: 'disponibles' },
            { situacion: SITUACION.CURSANDO, n: progreso.cursando, nombre: 'cursando' },
          ].map((d) => (
            <span key={d.situacion} className="flex items-center gap-1.5 text-tinta-tenue">
              <IconoSituacion
                situacion={d.situacion}
                color={colorSituacion(d.situacion)}
                size={13}
              />
              <span className="text-tinta">{d.n}</span>
              {d.nombre}
            </span>
          ))}
        </div>
      </div>

      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${semestres.length}, minmax(0, 1fr))` }}
      >
        {semestres.map((s) => {
          const pct = (n) => (s.total ? (n / s.total) * 100 : 0)
          const esActual = s.numero === actual
          return (
            <button
              key={s.numero}
              type="button"
              onClick={() => alIr(s.numero)}
              aria-label={`Semestre ${s.numero}: ${s.hechas} de ${s.total} aprobadas`}
              className="group flex flex-col items-center gap-1.5"
            >
              <span className="relative block h-10 w-full overflow-hidden rounded-[5px] bg-[color-mix(in_oklab,var(--tinta)_7%,transparent)]">
                <span
                  className="barra-semestre absolute inset-x-0 bottom-0 bg-aprobada"
                  style={{ height: `${pct(s.hechas)}%` }}
                />
                <span
                  className="barra-semestre absolute inset-x-0 bg-cursando"
                  style={{ bottom: `${pct(s.hechas)}%`, height: `${pct(s.cursando)}%` }}
                />
              </span>
              <span
                className={`text-[10px] tabular-nums transition-colors ${
                  esActual ? 'font-medium text-tinta' : 'text-tinta-tenue'
                }`}
              >
                {s.numero}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
