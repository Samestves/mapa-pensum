import { ChevronDown, GraduationCap, TriangleAlert } from 'lucide-react'
import { useState } from 'react'

import { MES } from '../../data/meses'
import { etiquetaSemestre } from '../../layout/planificador'
import { colorArea } from '../../theme/areas'

/**
 * Los semestres en una lista agrupada. El proximo va abierto; los demas,
 * plegados en una fila con el color de cada materia y sus nombres, que se
 * abren al tocarlos.
 */
export default function ListaSemestres({ plan, grado }) {
  const [abiertos, setAbiertos] = useState(() => new Set([1]))
  const alternar = (n) =>
    setAbiertos((antes) => {
      const despues = new Set(antes)
      if (!despues.delete(n)) despues.add(n)
      return despues
    })

  return (
    <section className="mt-8">
      <p className="px-1.5 text-[12.5px] leading-relaxed text-tinta-tenue">
        Las <span className="font-semibold text-aprobada">clave</span> van en tu cadena más larga de
        prelaciones: atrasarlas es lo que más alarga la carrera.
      </p>

      {plan.sinUbicar.length > 0 && (
        <p className="mt-3 flex items-start gap-2 px-1.5 text-[12.5px] leading-snug text-tinta-suave">
          <TriangleAlert size={14} className="mt-0.5 shrink-0 text-cursando" />
          {plan.sinUbicar.length} materias no se pudieron ubicar: revisa sus prelaciones en el mapa.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2.5">
        {plan.semestres.map((s) => (
          <GrupoSemestre
            key={s.numero}
            semestre={s}
            abierto={abiertos.has(s.numero)}
            alAlternar={() => alternar(s.numero)}
          />
        ))}
      </div>

      <p className="mt-2.5 flex items-center gap-2.5 rounded-2xl border border-panel-borde bg-panel-suave px-4 py-3.5 text-[14.5px] font-semibold text-aprobada">
        <GraduationCap size={18} strokeWidth={1.8} />
        Grado hacia {MES(grado).toLowerCase()}
      </p>
    </section>
  )
}

/**
 * Un semestre de la ruta, como una fila de ajustes de iOS que se despliega:
 * el titulo con su chevron, que apunta a la derecha plegado y hacia abajo
 * abierto. Plegado enseña de un vistazo que lleva -el color de cada materia
 * y sus nombres-; abierto, la lista entera.
 */
function GrupoSemestre({ semestre, abierto, alAlternar }) {
  const { numero, materias, uc } = semestre
  return (
    <div className="overflow-hidden rounded-2xl border border-panel-borde bg-panel-suave">
      <button
        type="button"
        onClick={alAlternar}
        aria-expanded={abierto}
        className="flex w-full items-center gap-3 px-4 pt-3.5 pb-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-tinta">
            {etiquetaSemestre(numero)}
          </span>
          <span className="mt-0.5 block text-[12.5px] text-tinta-tenue tabular-nums">
            {materias.length} {materias.length === 1 ? 'materia' : 'materias'} · {uc} UC
          </span>
        </span>
        <ChevronDown
          size={18}
          strokeWidth={2}
          aria-hidden="true"
          className={`shrink-0 text-tinta-tenue transition-transform duration-300 ${abierto ? '' : '-rotate-90'}`}
        />
      </button>

      {abierto ? (
        <ul className="mx-4 border-t border-panel-borde">
          {materias.map((a) => (
            <FilaMateria key={a.codigo} materia={a} />
          ))}
        </ul>
      ) : (
        <p className="-mt-0.5 flex items-center gap-2.5 px-4 pb-3.5" aria-hidden="true">
          <span className="flex shrink-0 gap-[3px]">
            {materias.map((a) => (
              <i
                key={a.codigo}
                className="size-1.5 rounded-full"
                style={{ backgroundColor: colorArea(a.area) }}
              />
            ))}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13.5px] text-tinta-suave">
            {materias.map((a) => a.nombre).join(', ')}
          </span>
        </p>
      )}
    </div>
  )
}

function FilaMateria({ materia: a }) {
  // Las casillas sin cuota y Areas de Grado son huecos: no tienen UC propias
  const hueco = a.uc == null
  return (
    <li className="flex items-center gap-[11px] border-t border-panel-borde py-3 first:border-t-0">
      <i
        aria-hidden="true"
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: colorArea(a.area) }}
      />
      <span
        className={`min-w-0 flex-1 text-[14.5px] leading-snug ${hueco ? 'text-tinta-suave italic' : 'text-tinta'}`}
      >
        {a.nombre}
      </span>
      {a.clave ? (
        <span className="shrink-0 text-[11.5px] font-semibold text-aprobada">Clave</span>
      ) : (
        a.esElectiva && <span className="shrink-0 text-[11.5px] text-tinta-tenue">Electiva</span>
      )}
      <span className="w-[42px] shrink-0 text-right text-[13px] text-tinta-tenue tabular-nums">
        {hueco ? 'a elegir' : `${a.uc} UC`}
      </span>
    </li>
  )
}
