import { useMemo } from 'react'
import { DIAS, duracion, enDoceHoras, momentoDe, nombreDelDia, resumenDe } from '../layout/horario'
import { useAhora } from '../hooks/useAhora'
import AhoraYDespues from './AhoraYDespues'
import AgendaDia from './AgendaDia'
import RejillaHorario from './RejillaHorario'

const contar = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`

/**
 * El horario en escritorio: a la izquierda el dia de hoy, a la derecha la
 * semana.
 *
 * Son las dos preguntas que se le hacen a un horario, cada una en su sitio.
 * "Que me toca" se contesta en el panel -la clase en curso, la que viene y las
 * de hoy, con su hora escrita-. "Como es mi semana" se contesta en la rejilla,
 * que aqui si cabe, y donde ademas se arma: se pulsa un hueco para poner una
 * clase y se arrastra una clase para moverla.
 *
 * El fin de semana no hay "las de hoy": el panel enseña las del lunes, que es
 * lo siguiente que hay que saber.
 *
 * @param {object[][]} props.porDia  las clases de cada dia
 * @param {object[]} props.sesiones  todas, para el resumen de la semana
 * @param {import('react').ReactNode} props.acciones  compartir, descargar y lo demas
 */
function HorarioSemana({
  porDia,
  sesiones,
  porCodigo,
  colores,
  idMenuAbierto,
  aspectoDe,
  acciones,
  alEditar,
  alAbrirMenu,
  alAnadir,
  alPulsarHueco,
  alMoverClase,
}) {
  const ahora = useAhora()
  const momento = useMemo(() => momentoDe(porDia, ahora), [porDia, ahora])
  const resumen = useMemo(() => resumenDe(sesiones), [sesiones])

  const hayClaseHoy = ahora.dia < DIAS.length
  const diaDeLista = hayClaseHoy ? ahora.dia : 0
  const delDia = porDia[diaDeLista]

  return (
    <div className="mt-[var(--reserva-cabecera)] grid min-h-0 flex-1 grid-cols-[clamp(280px,25vw,340px)_minmax(0,1fr)]">
      <aside className="agenda-horario panel-hoy desplazable-panel mt-1 min-h-0 overflow-y-auto rounded-tr-[20px] bg-panel px-7 pb-8">
        <div className="flex h-[46px] items-center justify-between gap-3">
          <p className="rotulo-horario font-ui">
            <b>Hoy</b> · {nombreDelDia(ahora.dia)}
          </p>
          <span className="text-[12px] leading-none text-tinta-tenue tabular-nums">
            {enDoceHoras(ahora.minuto)}
          </span>
        </div>

        <AhoraYDespues momento={momento} ahora={ahora} aspectoDe={aspectoDe} />

        <header className="mt-9 flex items-baseline justify-between gap-3 pb-5">
          <h3 className="rotulo-horario font-ui">
            {hayClaseHoy ? 'Las de hoy' : `Las del ${DIAS[diaDeLista].toLowerCase()}`}
          </h3>
          <span className="text-[12px] leading-none text-tinta-tenue">
            {delDia.length ? contar(delDia.length, 'clase', 'clases') : 'Sin clases'}
          </span>
        </header>

        <AgendaDia
          sesiones={delDia}
          minuto={hayClaseHoy ? ahora.minuto : null}
          idMenuAbierto={idMenuAbierto}
          aspectoDe={aspectoDe}
          alEditar={alEditar}
          alAbrirMenu={alAbrirMenu}
          alAnadir={(franja, elemento) => alAnadir(diaDeLista, franja, elemento)}
        />
      </aside>

      <section aria-label="La semana" className="flex min-h-0 min-w-0 flex-col">
        <div className="flex h-[50px] shrink-0 items-center justify-between gap-5 pr-4 pl-7">
          <p className="min-w-0 truncate text-[13px] text-tinta-tenue">
            {resumen.clases > 0 && (
              <>
                <b className="font-medium text-tinta-suave">
                  {contar(resumen.materias, 'materia', 'materias')}
                </b>
                {' · '}
                {contar(resumen.clases, 'clase', 'clases')} a la semana ·{' '}
                {duracion(resumen.minutos)} de clase
              </>
            )}
          </p>
          {acciones}
        </div>

        <RejillaHorario
          porDia={porDia}
          porCodigo={porCodigo}
          colores={colores}
          ahora={ahora}
          idMenuAbierto={idMenuAbierto}
          alPulsarHueco={alPulsarHueco}
          alMoverClase={alMoverClase}
          alAbrirMenu={alAbrirMenu}
        />
      </section>
    </div>
  )
}

export default HorarioSemana
