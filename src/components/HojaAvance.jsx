import { ChevronRight, Moon, Route, Sun, X } from 'lucide-react'
import { avanceDe } from '../data/avance'
import { leerUcPorSemestre } from '../data/cargaPlan'
import { MES } from '../data/exportarPlan'
import { useGradoEstimado } from '../hooks/useGradoEstimado'
import { useNumeroAnimado } from '../hooks/useNumeroAnimado'
import HojaInferior from './HojaInferior'
import { BotonReinicio, CuotaGrupo } from './PiezasAvance'

/* Los tres estados que importan para decidir que inscribir. Las bloqueadas no
   van en la leyenda: son el resto de la barra, y nombrarlas solo repite que
   falta carrera. */
const TRAMOS = [
  { clave: 'aprobadas', color: 'var(--estado-aprobada)', texto: 'aprobadas' },
  { clave: 'cursando', color: 'var(--estado-cursando)', texto: 'cursando' },
  { clave: 'disponibles', color: 'var(--tinta-suave)', texto: 'puedes inscribir' },
]

const TEMAS = [
  { id: 'claro', texto: 'Claro', icono: Sun },
  { id: 'oscuro', texto: 'Oscuro', icono: Moon },
]

/** El porcentaje grande y, al lado, de que es ese porcentaje. */
function Cifra({ progreso }) {
  const numero = Math.round(useNumeroAnimado(avanceDe(progreso)))
  const conCreditos = progreso.porcentaje != null

  return (
    <div className="flex items-end justify-between gap-4">
      <p className="flex items-baseline text-tinta tabular-nums">
        <span className="text-[60px] leading-[0.8] font-extralight tracking-[-0.05em]">{numero}</span>
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
 * entero-, y asi solo lo calcula mientras la hoja esta abierta.
 */
function TarjetaPlan({ carrera, marcas, estados, relaciones, elegidas, alPlanificar }) {
  const { semestres, materias, fecha } = useGradoEstimado({
    asignaturas: carrera.asignaturas,
    grupos: carrera.grupos,
    marcas,
    estados,
    relaciones,
    elegidas,
  })
  const terminado = semestres === 0

  return (
    <button
      type="button"
      onClick={alPlanificar}
      className="tarjeta-plan group w-full overflow-hidden rounded-[22px] text-left transition-transform duration-200 active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3.5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-aprobada uppercase">
            {terminado ? 'Pensum completo' : 'Grado estimado'}
          </p>
          <p className="mt-1 text-[22px] leading-tight font-semibold tracking-[-0.02em] text-tinta">
            {terminado ? 'No te queda nada' : MES(fecha)}
          </p>
          {!terminado && (
            <p className="mt-1 text-[12.5px] text-tinta-suave">
              {semestres} {semestres === 1 ? 'semestre' : 'semestres'} a {leerUcPorSemestre()} UC
              · {materias} {materias === 1 ? 'materia' : 'materias'}
            </p>
          )}
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-aprobada text-[var(--lienzo)]">
          <Route size={19} strokeWidth={2.2} />
        </span>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--tarjeta-plan-linea)] px-4 py-3 text-[14px] font-semibold text-aprobada">
        Planificar mi ruta
        <ChevronRight
          size={18}
          className="transition-transform duration-200 group-active:translate-x-0.5"
        />
      </div>
    </button>
  )
}

/** Claro u oscuro, como el mando segmentado de Ajustes en iOS. */
function SelectorTema({ tema, alternarTema }) {
  return (
    <div
      role="radiogroup"
      aria-label="Apariencia"
      className="relative grid h-9 w-[184px] shrink-0 grid-cols-2 rounded-full bg-tinta/[0.07] p-[3px]"
    >
      <span
        aria-hidden="true"
        style={{ transform: `translateX(${tema === 'oscuro' ? 100 : 0}%)` }}
        className="lente-tema pointer-events-none absolute inset-y-[3px] left-[3px] w-[calc(50%-3px)] rounded-full"
      />
      {TEMAS.map(({ id, texto, icono: Icono }) => {
        const activo = id === tema
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => !activo && alternarTema()}
            className={`relative z-10 flex items-center justify-center gap-1.5 rounded-full text-[13px] font-medium transition-colors duration-200 ${
              activo ? 'text-tinta' : 'text-tinta-tenue'
            }`}
          >
            <Icono size={14} strokeWidth={2} />
            {texto}
          </button>
        )
      })}
    </div>
  )
}

/**
 * El avance en el TELEFONO: una hoja que sube desde la isla de abajo.
 *
 * No es el panel de escritorio encogido. Aquel es una consulta al lado del
 * mapa, con herramientas del mapa dentro -aislar un area-; esta es lo que se
 * mira con el telefono en la mano entre clase y clase, y responde tres cosas
 * en ese orden:
 *
 *   1. Como voy: el porcentaje y de que es.
 *   2. Que tengo entre manos: aprobadas, cursando y lo que puedo inscribir.
 *   3. Cuando termino: el grado estimado, que abre el plan de ruta.
 *
 * Despues, solo si la carrera las tiene con meta oficial, las cuotas de
 * electivas -cuentan para graduarse-. Y al final lo que no es avance pero no tiene mejor sitio en el
 * telefono: la apariencia, que sale de la cabecera para dejarla limpia, y
 * reiniciar, abajo del todo y con confirmacion.
 *
 * Lo que se quedo fuera: el filtro por areas, que es una herramienta del mapa
 * y en una pantalla de telefono no se ve el mapa detras; y las bloqueadas
 * como cifra, que son el resto de la barra.
 */
function HojaAvance({
  abierta,
  alCerrar,
  carrera,
  progreso,
  avanceGrupos,
  marcas,
  estados,
  relaciones,
  elegidas,
  reiniciar,
  hayMarcas,
  alPlanificar,
  tema,
  alternarTema,
}) {
  /* Solo las cuotas con meta oficial: un "0 UC" sin saber de cuantas no le
     dice a nadie si le falta algo. */
  const cuotas = Object.values(avanceGrupos).filter((g) => g.meta != null)

  return (
    <HojaInferior
      abierta={abierta}
      alCerrar={alCerrar}
      etiqueta="Tu avance"
      cabecera={
        <header className="flex items-start justify-between gap-3 px-5 pt-1 pb-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-tinta-tenue uppercase">
              Tu avance
            </p>
            <h2 className="mt-1 text-[17px] leading-snug font-semibold tracking-[-0.01em] text-tinta">
              {carrera.nombre}
            </h2>
          </div>
          <button
            type="button"
            onClick={alCerrar}
            aria-label="Cerrar"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-tinta/[0.08] text-tinta-suave transition-transform active:scale-90"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </header>
      }
    >
      <div className="flex flex-col gap-6 px-5 pb-5">
        <Cifra progreso={progreso} />
        <Reparto progreso={progreso} />

        <TarjetaPlan
          carrera={carrera}
          marcas={marcas}
          estados={estados}
          relaciones={relaciones}
          elegidas={elegidas}
          alPlanificar={alPlanificar}
        />

        {cuotas.length > 0 && (
          <section>
            <h3 className="mb-2.5 text-[11px] font-semibold tracking-[0.14em] text-tinta-tenue uppercase">
              Electivas
            </h3>
            <div className="flex flex-col gap-3">
              {cuotas.map((g) => (
                <CuotaGrupo key={g.clave} avance={g} />
              ))}
            </div>
          </section>
        )}

        <footer className="flex flex-col gap-2 border-t border-panel-borde pt-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[14px] text-tinta-suave">Apariencia</span>
            <SelectorTema tema={tema} alternarTema={alternarTema} />
          </div>
          <BotonReinicio reiniciar={reiniciar} hayMarcas={hayMarcas} />
        </footer>
      </div>
    </HojaInferior>
  )
}

export default HojaAvance
