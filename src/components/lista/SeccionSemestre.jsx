import { ArrowRight, Check } from 'lucide-react'
import { MARCA_SEMESTRE, pistaDeCasilla, textoFaltaElegir } from '../../data/semestre'
import { altoDeSemestre, reserva } from '../../layout/alturaLista'
import { SITUACION } from '../../layout/situacion'
import { estadoDeSemestre } from '../../layout/semestresLista'
import { IconoSituacion } from '../IconoSituacion'
import CasillaLista from './CasillaLista'
import Riel from './Riel'

/**
 * Un semestre de la lista: su cabecera -numero, cuanto llevas, riel y casilla
 * para marcarlo entero- y, plegable, sus materias. Una linea lo une al
 * siguiente por detras del punto que dice como va.
 *
 * `fila` pinta una materia (la comparten las secciones de electivas), y
 * `conCadena` dice si hay una materia abierta que apaga lo que no es suyo.
 */
export default function SeccionSemestre({
  s,
  indice,
  ultimo,
  filtro,
  actual,
  plegados,
  resumen,
  fila,
  conCadena,
  alPlegar,
  alAlternarSemestre,
  alIrASeccion,
}) {
  const id = `semestre-${s.numero}`
  const completo = s.total > 0 && s.hechas === s.total
  const plegado = filtro === 'todo' && (plegados[id] ?? completo)
  const nodoEstado = estadoDeSemestre(s, actual)
  return (
    <section
      id={`lista-${id}`}
      className="seccion-lista lista-entrar relative scroll-mt-[var(--margen-seccion)] pb-7 pl-7"
      style={{
        animationDelay: `${Math.min(indice, 6) * 35}ms`,
        ...reserva(
          altoDeSemestre({
            plegado,
            filas: s.filas.length + (filtro === 'todo' ? s.huecos.length : 0),
          }),
        ),
      }}
    >
      {/* El recorrido: una linea que baja de este semestre al
          siguiente, por detras del punto. */}
      {!ultimo && (
        <span
          aria-hidden="true"
          className="absolute top-[22px] bottom-0 left-[6.5px] w-px bg-[color-mix(in_oklab,var(--tinta)_10%,transparent)]"
        />
      )}
      <span
        aria-hidden="true"
        data-estado={nodoEstado}
        className="nodo-semestre absolute top-[9px] left-0 grid size-3.5 place-items-center rounded-full"
      >
        {completo && <Check size={9} strokeWidth={3} className="text-[var(--lienzo)]" />}
      </span>

      <div className="cabecera-semestre flex items-start gap-3 pb-3">
        <button
          type="button"
          onClick={() => alPlegar(id, !plegado)}
          aria-expanded={!plegado}
          aria-label={`Semestre ${s.numero}`}
          className="flex min-w-0 flex-1 flex-col gap-2.5 text-left"
        >
          <span className="flex w-full items-baseline gap-2.5">
            <span className="text-[24px] leading-none font-extralight tracking-[-0.03em] text-tinta tabular-nums">
              {String(s.numero).padStart(2, '0')}
            </span>
            <span className="text-[10.5px] font-medium tracking-[0.22em] text-tinta-tenue uppercase">
              Semestre
            </span>
            <span
              className={`cuenta-semestre ml-auto text-[12px] tabular-nums ${completo ? 'text-aprobada' : 'text-tinta-tenue'}`}
            >
              {completo
                ? 'Completo'
                : resumen?.marca === MARCA_SEMESTRE.FALTA_ELEGIR
                  ? textoFaltaElegir(resumen.huecos)
                  : `${s.hechas} de ${s.total} aprobadas`}
            </span>
            {/* Lo que hara la casilla, en lugar de la cuenta mientras
                el raton esta sobre ella (ver .pista-semestre). */}
            {resumen && (
              <span
                aria-hidden="true"
                className={`pista-semestre ml-auto text-[12px] font-medium ${completo ? 'text-tinta' : 'text-aprobada'}`}
              >
                {pistaDeCasilla(resumen.marca)}
              </span>
            )}
          </span>
          <Riel hechas={s.hechas} cursando={s.cursando} total={s.total} />
        </button>
        {/* La casilla de marcar el semestre entero, la misma de su
            cabecera en el mapa (ver CasillaSemestre). */}
        {resumen && (
          <CasillaLista semestre={s.numero} resumen={resumen} alAlternar={alAlternarSemestre} />
        )}
      </div>

      <div className="plegable" data-abierto={!plegado}>
        <div>
          <ul className="divide-y divide-panel-borde overflow-hidden rounded-2xl border border-panel-borde bg-panel">
            {s.filas.map(fila)}
            {filtro === 'todo' &&
              s.huecos.map((hueco) => (
                <li
                  key={hueco.codigo}
                  className="fila-lista"
                  data-enfoque={conCadena ? 'otra' : undefined}
                >
                  <button
                    type="button"
                    onClick={() => alIrASeccion(`grupo-${hueco.grupo}`)}
                    className="flex w-full items-center pr-4 text-left"
                  >
                    <span className="grid size-12 shrink-0 place-items-center">
                      <IconoSituacion
                        situacion={SITUACION.PROXIMA}
                        color="var(--tinta-tenue)"
                        size={18}
                      />
                    </span>
                    <span className="min-w-0 flex-1 truncate py-3.5 text-[15px] tracking-[-0.01em] text-tinta-tenue">
                      {hueco.nombre}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-[12px] text-tinta-tenue">
                      Elegir
                      <ArrowRight size={12} strokeWidth={1.75} className="rotate-90" />
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
