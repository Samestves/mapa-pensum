import { mesCorto } from '../../data/meses'

/** Lo unico grande: cuando terminas. Lo demas es el camino hasta ahi. */
export default function Fecha({ plan, grado }) {
  if (!grado) {
    return (
      <section className="pt-4 pb-2 text-center">
        <p className="text-[48px] leading-none font-extralight tracking-[-0.04em] text-tinta">
          Terminaste
        </p>
        <p className="mt-3 text-[13.5px] text-tinta-suave">
          No te queda ninguna materia del pensum.
        </p>
      </section>
    )
  }

  const semestres = plan.semestres.length
  return (
    <section className="pt-3 text-center">
      {/* "Hacia" y no "en": la fecha cuenta seis meses por semestre desde hoy,
          y el calendario de la UDO no es tan puntual. Lo exacto es el numero
          de semestres. */}
      <p className="text-[13.5px] text-tinta-suave">Te gradúas hacia</p>
      <p className="mt-3 text-[64px] leading-[0.86] font-extralight tracking-[-0.05em] text-tinta tabular-nums">
        {mesCorto(grado)}
      </p>
      <p className="mt-3 text-[13px] text-tinta-tenue">
        {semestres} {semestres === 1 ? 'semestre' : 'semestres'} · {plan.materiasRestantes}{' '}
        {plan.materiasRestantes === 1 ? 'materia' : 'materias'} por delante
      </p>
    </section>
  )
}
