import { colorArea, etiquetaArea } from '../theme/areas'

const HOY = () =>
  new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })

function Cifra({ etiqueta, valor, sufijo }) {
  return (
    <div className="rounded-lg border border-panel-borde px-3 py-2">
      <div className="text-[9px] font-bold tracking-wide text-tinta-tenue uppercase">
        {etiqueta}
      </div>
      <div className="font-mono text-base leading-none font-bold text-tinta">
        {valor}
        {sufijo && <span className="text-[10px] text-tinta-tenue"> {sufijo}</span>}
      </div>
    </div>
  )
}

/**
 * La hoja que se imprime o se guarda como PDF. Se ve igual en pantalla que
 * en papel: lo que cambia en @media print es que se oculta todo lo demas.
 */
function HojaPlan({ nombre, meta, progreso, plan, ucPorSemestre }) {
  const anos = (plan.semestres.length / 2).toFixed(1)

  return (
    <div className="hoja bg-panel p-6 text-tinta">
      <header className="flex items-start justify-between gap-4 border-b-2 border-tinta pb-3">
        <div>
          <h2 className="text-lg leading-tight font-extrabold">Mi ruta hasta el grado</h2>
          <p className="text-[11px] text-tinta-suave">
            {meta.carrera} · {meta.nucleo}
          </p>
        </div>
        <div className="text-right text-[10px] text-tinta-tenue">
          <p className="font-mono">{HOY()}</p>
          {nombre && <p className="font-bold text-tinta">{nombre}</p>}
        </div>
      </header>

      <div className="mt-3 grid grid-cols-4 gap-2">
        <Cifra etiqueta="Avance" valor={progreso.porcentaje.toFixed(1)} sufijo="%" />
        <Cifra
          etiqueta="UC aprobadas"
          valor={progreso.ucAprobadas}
          sufijo={`/ ${progreso.ucTotales}`}
        />
        <Cifra etiqueta="Te faltan" valor={plan.materiasRestantes} sufijo="materias" />
        <Cifra etiqueta="Semestres" valor={plan.semestres.length} sufijo={`≈ ${anos} años`} />
      </div>

      <p className="mt-3 text-[10px] leading-snug text-tinta-tenue">
        Plan calculado con un tope de <strong>{ucPorSemestre} UC por semestre</strong>,
        respetando todas las prelaciones y priorizando las materias que desbloquean más
        cosas. La estimación en años supone dos semestres por año.
      </p>

      {plan.semestres.length === 0 ? (
        <p className="mt-6 text-center text-sm font-bold text-aprobada">
          No queda nada pendiente. Enhorabuena.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {plan.semestres.map((s) => (
            <section key={s.numero} className="break-inside-avoid">
              <div className="flex items-baseline justify-between border-b border-panel-borde pb-1">
                <h3 className="text-xs font-extrabold tracking-wide">
                  SEMESTRE {s.numero}
                </h3>
                <span className="font-mono text-[10px] text-tinta-tenue">
                  {s.materias.length} materias · {s.uc} UC
                </span>
              </div>
              <ul className="mt-1.5 flex flex-col gap-0.5">
                {s.materias.map((a) => (
                  <li key={a.codigo} className="flex items-center gap-2 text-[11px]">
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: colorArea(a.area) }}
                    />
                    <span className="w-16 shrink-0 font-mono text-[9px] text-tinta-tenue">
                      {a.codigo}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{a.nombre}</span>
                    <span className="shrink-0 text-[9px] text-tinta-tenue">
                      {etiquetaArea(a.area)}
                    </span>
                    <span className="w-9 shrink-0 text-right font-mono text-[9px] text-tinta-tenue">
                      {a.uc} UC
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <footer className="mt-5 border-t border-panel-borde pt-2 text-[9px] text-tinta-tenue">
        Generado con Mapa de Pensum · mapa-pensum.vercel.app · Las unidades crédito no están
        verificadas contra el pensum oficial: úsalas como referencia.
      </footer>
    </div>
  )
}

export default HojaPlan
