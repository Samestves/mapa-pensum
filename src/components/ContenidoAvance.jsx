import { ChevronRight, GraduationCap } from 'lucide-react'
import { avanceDe } from '../data/avance'
import { textoCarga } from '../data/cargaPlan'
import { mesCorto } from '../data/exportarPlan'
import { useGradoEstimado } from '../hooks/useGradoEstimado'
import { useNumeroAnimado } from '../hooks/useNumeroAnimado'
import { colorArea, etiquetaArea } from '../theme/areas'
import SelectorTema from './SelectorTema'
import { BotonReinicio, CuotaGrupo } from './PiezasAvance'

/* Los tres estados que importan para decidir que inscribir. Las bloqueadas no
   van en la leyenda: son el resto de la barra, y nombrarlas solo repite que
   falta carrera. */
const TRAMOS = [
  { clave: 'aprobadas', color: 'var(--estado-aprobada)', texto: 'aprobadas' },
  { clave: 'cursando', color: 'var(--estado-cursando)', texto: 'cursando' },
  { clave: 'disponibles', color: 'var(--tinta-suave)', texto: 'puedes inscribir' },
]

const TITULO = 'text-[11px] font-semibold tracking-[0.14em] text-tinta-tenue uppercase'

/** El porcentaje grande y, al lado, de que es ese porcentaje. */
function Cifra({ progreso }) {
  const numero = Math.round(useNumeroAnimado(avanceDe(progreso)))
  const conCreditos = progreso.porcentaje != null

  return (
    <div className="flex items-end justify-between gap-4">
      <p className="flex items-baseline text-tinta tabular-nums">
        <span className="text-[60px] leading-[0.8] font-extralight tracking-[-0.05em]">
          {numero}
        </span>
        <span className="ml-1 text-[22px] font-light text-tinta-tenue">%</span>
      </p>
      <p className="text-right text-[13px] leading-snug text-tinta-suave">
        {conCreditos ? (
          <>
            <span className="font-semibold text-tinta tabular-nums">
              {progreso.ucAprobadas + progreso.ucElectivas}
            </span>{' '}
            de {progreso.ucTitulo} UC
            <br />
            del título
          </>
        ) : (
          <>
            <span className="font-semibold text-tinta tabular-nums">{progreso.aprobadas}</span> de{' '}
            {progreso.total}
            <br />
            materias
          </>
        )}
      </p>
    </div>
  )
}

/** Como esta repartida la carrera, en una barra y tres numeros. */
function Reparto({ progreso }) {
  if (!progreso.total) return null

  return (
    <div>
      <div className="flex h-1.5 gap-[3px] overflow-hidden rounded-full bg-tinta/[0.08]">
        {TRAMOS.map(
          (t) =>
            progreso[t.clave] > 0 && (
              <span
                key={t.clave}
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${(progreso[t.clave] / progreso.total) * 100}%`,
                  backgroundColor: t.color,
                }}
              />
            ),
        )}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {TRAMOS.map((t) => (
          <li key={t.clave} className="flex items-center gap-1.5 text-[12.5px] text-tinta-suave">
            <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
            <span className="font-semibold text-tinta tabular-nums">{progreso[t.clave]}</span>
            {t.texto}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * La puerta al plan de ruta, con la respuesta que da el plan ya puesta: cuando
 * te gradúas. Un boton que dice "Planificar" promete trabajo; uno que dice
 * "julio de 2029" da ganas de ver como se llega.
 *
 * Vive en su propio componente porque es el unico que calcula algo -el plan
 * entero-, y asi solo lo calcula mientras el avance esta abierto.
 */
function TarjetaPlan({ carrera, marcas, elegidas, alPlanificar }) {
  const { semestres, materias, fecha, carga } = useGradoEstimado({
    asignaturas: carrera.asignaturas,
    grupos: carrera.grupos,
    marcas,
    elegidas,
  })
  const terminado = semestres === 0

  return (
    <button
      type="button"
      onClick={alPlanificar}
      className="tarjeta-plan group w-full overflow-hidden rounded-[22px] text-left transition-transform duration-200 active:scale-[0.98]"
    >
      <div className="px-4 pt-4 pb-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] text-tinta-suave">
            {terminado ? 'Pensum completo' : 'Te gradúas hacia'}
          </p>
          <GraduationCap size={18} strokeWidth={1.8} className="shrink-0 text-aprobada" />
        </div>
        {/* La misma fecha grande y fina con la que abre la ruta: esta tarjeta
            es su portada */}
        <p className="mt-2 text-[44px] leading-[0.9] font-extralight tracking-[-0.045em] text-tinta tabular-nums">
          {terminado ? 'Terminaste' : mesCorto(fecha)}
        </p>
        {!terminado && (
          <>
            {/* Un tramo por semestre que falta; el verde es el que viene */}
            <div className="mt-4 flex gap-[3px]" aria-hidden="true">
              {Array.from({ length: semestres }, (_, i) => (
                <i
                  key={i}
                  className={`h-1 flex-1 rounded-full ${i === 0 ? 'bg-aprobada' : 'bg-tinta/[0.12]'}`}
                />
              ))}
            </div>
            <p className="mt-2.5 text-[12.5px] text-tinta-tenue">
              {semestres} {semestres === 1 ? 'semestre' : 'semestres'} con {textoCarga(carga)} ·{' '}
              {materias} {materias === 1 ? 'materia' : 'materias'}
            </p>
          </>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-panel-borde px-4 py-3 text-[14px] font-semibold text-aprobada">
        Planificar mi ruta
        <ChevronRight
          size={18}
          className="transition-transform duration-200 group-hover:translate-x-0.5 group-active:translate-x-0.5"
        />
      </div>
    </button>
  )
}

/**
 * Aislar un area en el mapa: una pastilla por area, con su color y cuantas
 * llevas de ella. Es una herramienta del mapa y no una medida de avance, por
 * eso solo sale en escritorio, donde el mapa se ve detras del panel. Pulsar
 * la elegida la suelta.
 */
function FiltroAreas({ areas, areaFiltrada, alFiltrarArea }) {
  return (
    <section>
      <h3 className={TITULO}>Ver un área en el mapa</h3>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {areas.map((a) => {
          const activa = areaFiltrada === a.area
          return (
            <button
              key={a.area}
              type="button"
              onClick={() => alFiltrarArea(activa ? null : a.area)}
              aria-pressed={activa}
              className={`flex h-8 items-center gap-2 rounded-full border px-3 text-[12px] transition-[background-color,border-color,color,opacity] duration-200 ${
                activa
                  ? 'border-transparent bg-tinta/[0.1] text-tinta'
                  : `border-panel-borde text-tinta-suave hover:bg-tinta/[0.05] hover:text-tinta ${
                      areaFiltrada ? 'opacity-50 hover:opacity-100' : ''
                    }`
              }`}
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: colorArea(a.area) }}
              />
              {etiquetaArea(a.area)}
              <span className="text-[11px] text-tinta-tenue tabular-nums">
                {a.aprobadas}/{a.total}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

/**
 * Lo que dice el avance, el mismo en el telefono (HojaAvance) y en
 * escritorio (PanelProgreso): solo cambia el marco. Responde tres cosas en
 * este orden:
 *
 *   1. Como voy: el porcentaje y de que es.
 *   2. Que tengo entre manos: aprobadas, cursando y lo que puedo inscribir.
 *   3. Cuando termino: el grado estimado, que abre el plan de ruta.
 *
 * Despues, solo si la carrera las tiene con meta oficial, las cuotas de
 * electivas, que cuentan para graduarse. En escritorio, si se le pasa
 * `alFiltrarArea`, las areas para aislarlas en el mapa. Y al final lo que no
 * es avance pero no tiene mejor sitio: la apariencia y reiniciar.
 */
export default function ContenidoAvance({
  carrera,
  progreso,
  avanceGrupos,
  marcas,
  elegidas,
  reiniciar,
  alPlanificar,
  tema,
  alternarTema,
  areaFiltrada,
  alFiltrarArea,
}) {
  /* Solo las cuotas con meta oficial: un "0 UC" sin saber de cuantas no le
     dice a nadie si le falta algo. */
  const cuotas = Object.values(avanceGrupos).filter((g) => g.meta != null)

  return (
    <div className="flex flex-col gap-6">
      <Cifra progreso={progreso} />
      <Reparto progreso={progreso} />

      <TarjetaPlan
        carrera={carrera}
        marcas={marcas}
        elegidas={elegidas}
        alPlanificar={alPlanificar}
      />

      {cuotas.length > 0 && (
        <section>
          <h3 className={`mb-2.5 ${TITULO}`}>Electivas</h3>
          <div className="flex flex-col gap-3">
            {cuotas.map((g) => (
              <CuotaGrupo key={g.clave} avance={g} />
            ))}
          </div>
        </section>
      )}

      {alFiltrarArea && progreso.porArea.length > 0 && (
        <FiltroAreas
          areas={progreso.porArea}
          areaFiltrada={areaFiltrada}
          alFiltrarArea={alFiltrarArea}
        />
      )}

      <footer className="flex flex-col gap-3 border-t border-panel-borde pt-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[14px] text-tinta-suave">Apariencia</span>
          <SelectorTema tema={tema} alternarTema={alternarTema} />
        </div>
        <BotonReinicio reiniciar={reiniciar} cuantas={Object.keys(marcas).length} />
      </footer>
    </div>
  )
}
