import { useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { ChevronRight, Download, FileText, GraduationCap, TriangleAlert, X } from 'lucide-react'
import { etiquetaSemestre, horasDe, mesEstimadoGrado, planificar } from '../layout/planificador'
import { useCerrarConEscape } from '../hooks/useCerrarConEscape'
import { useEsTelefono } from '../hooks/useEsTelefono'
import { guardar, leer } from '../data/almacen'
import { LIMITES_CARGA, guardarCarga, leerCarga, textoCarga } from '../data/cargaPlan'
import { descargarMarkdown, MES } from '../data/exportarPlan'
import { colorArea } from '../theme/areas'
import HojaInferior from './HojaInferior'
import HojaPlan, { ALTO_HOJA, ANCHO_HOJA } from './HojaPlan'

const CLAVE_NOMBRE = 'mapa-pensum:nombre'
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const ROTULO = 'text-[11px] font-semibold tracking-[0.14em] text-tinta-tenue uppercase'

/**
 * Planificar mi ruta: cuando te gradúas, con que carga, y en que orden.
 *
 * En el telefono es una hoja que sube desde abajo, como la del avance de la
 * que se abre. En escritorio, una ventana con la ruta a la izquierda y, a la
 * derecha, la hoja que se imprime tal como va a salir.
 *
 * Mientras esta cerrada no calcula nada: el plan vive en Ruta, que solo se
 * monta con la hoja abierta.
 */
function PlanRuta({ abierto, alCerrar, ...datos }) {
  const telefono = useEsTelefono()

  if (telefono) {
    return (
      <HojaInferior
        abierta={abierto}
        alCerrar={alCerrar}
        etiqueta="Tu ruta"
        cabecera={<Cabecera carrera={datos.carrera} alCerrar={alCerrar} />}
      >
        <Ruta {...datos} telefono />
      </HojaInferior>
    )
  }
  return abierto ? <Ruta {...datos} alCerrar={alCerrar} /> : null
}

function Cabecera({ carrera, alCerrar }) {
  return (
    <header className="flex items-start justify-between gap-3 px-5 pt-1 pb-3">
      <div className="min-w-0">
        <p className={ROTULO}>Tu ruta</p>
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
  )
}

/**
 * El plan y todo lo que se hace con el. La carga se guarda al momento, pero el
 * plan se recalcula con un valor diferido: arrastrar el mando tiene que
 * responder en el acto aunque el telefono tarde un poco en rehacer la lista.
 */
function Ruta({ carrera, marcas, progreso, elegidas, telefono = false, alCerrar }) {
  const { asignaturas, grupos } = carrera
  const [carga, setCarga] = useState(leerCarga)
  const [nombre, setNombre] = useState(() => leer(CLAVE_NOMBRE, ''))
  const cargaDelPlan = useDeferredValue(carga)
  const { imprimiendo, imprimir } = useImpresion()

  useEffect(() => {
    guardarCarga(carga)
  }, [carga])
  useEffect(() => {
    guardar(CLAVE_NOMBRE, nombre)
  }, [nombre])

  const plan = useMemo(
    () => planificar({ asignaturas, grupos, marcas, elegidas, carga: cargaDelPlan }),
    [asignaturas, grupos, marcas, elegidas, cargaDelPlan],
  )
  const grado = mesEstimadoGrado(plan.semestres.length)
  const terminado = plan.semestres.length === 0

  const hoja = (
    <HojaPlan
      nombre={nombre}
      carrera={carrera}
      progreso={progreso}
      plan={plan}
      carga={cargaDelPlan}
      grado={grado && MES(grado)}
    />
  )

  const cuerpo = (
    <>
      <Fecha plan={plan} grado={grado} />
      {!terminado && (
        <>
          <MandoCarga carga={carga} alCambiar={setCarga} plan={plan} />
          <ListaSemestres plan={plan} grado={grado} />
        </>
      )}
      <label className="mt-7 block">
        <span className={`px-1.5 ${ROTULO}`}>Tu nombre en la hoja</span>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Opcional"
          autoComplete="name"
          className="seleccionable mt-2 w-full rounded-2xl border border-panel-borde bg-panel-suave px-4 py-3 text-[15px] text-tinta outline-none placeholder:text-tinta-tenue focus:border-aprobada"
        />
      </label>
    </>
  )

  const acciones = (
    <Acciones
      alImprimir={imprimir}
      alDescargar={() =>
        descargarMarkdown({ carrera, nombre, progreso, plan, carga: cargaDelPlan, grado })
      }
      deshabilitado={terminado}
    />
  )

  return (
    <>
      {telefono ? (
        <>
          <div className="px-5 pb-6">{cuerpo}</div>
          <div className="sticky bottom-0 bg-gradient-to-t from-panel from-60% to-transparent px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {acciones}
          </div>
        </>
      ) : (
        <Ventana carrera={carrera} alCerrar={alCerrar} cuerpo={cuerpo} acciones={acciones}>
          {hoja}
        </Ventana>
      )}

      {/* Copia para el papel: cuelga de <body>, sin padres que la recorten,
          y con la paleta clara. Solo existe mientras se imprime. */}
      {imprimiendo &&
        createPortal(
          <div className="solo-impresion" data-tema="claro">
            {hoja}
          </div>,
          document.body,
        )}
    </>
  )
}

/**
 * Imprimir sin tener la hoja de papel montada todo el rato.
 *
 * La copia que va a la impresora se monta justo antes de imprimir y se quita
 * al terminar: mantenerla montada obligaba a rehacerla en cada movimiento del
 * mando de carga sin que nadie la viera. flushSync la deja pintada y medida
 * antes de que el navegador tome la foto. Tambien se engancha a beforeprint,
 * para que Ctrl+P con el plan abierto saque la hoja y no la pantalla.
 */
function useImpresion() {
  const [imprimiendo, setImprimiendo] = useState(false)

  useEffect(() => {
    const antes = () => flushSync(() => setImprimiendo(true))
    const despues = () => setImprimiendo(false)
    window.addEventListener('beforeprint', antes)
    window.addEventListener('afterprint', despues)
    return () => {
      window.removeEventListener('beforeprint', antes)
      window.removeEventListener('afterprint', despues)
    }
  }, [])

  const imprimir = () => {
    flushSync(() => setImprimiendo(true))
    window.print()
  }

  return { imprimiendo, imprimir }
}

/** Lo unico grande: cuando terminas. Lo demas es el camino hasta ahi. */
function Fecha({ plan, grado }) {
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
        {MESES_CORTOS[grado.getMonth()]} {grado.getFullYear()}
      </p>
      <p className="mt-3 text-[13px] text-tinta-tenue">
        {semestres} {semestres === 1 ? 'semestre' : 'semestres'} · {plan.materiasRestantes}{' '}
        {plan.materiasRestantes === 1 ? 'materia' : 'materias'} por delante
      </p>
    </section>
  )
}

/* Donde cae cada valor sobre el mando. El pulgar es invisible y mide 28 px:
   su centro recorre la pista desde 14 px hasta 14 px antes del final, y el
   relleno, las marcas y la escala usan la misma cuenta para no despegarse. */
const POSICION = (fraccion) => `calc(14px + (100% - 28px) * ${fraccion})`

/**
 * La carga por semestre, en un solo mando ancho como el limite de carga de
 * un coche electrico: se arrastra libre de punta a punta y el plan entero se
 * rehace al soltar cada paso.
 *
 * Se cuenta en UC o en materias. Las dos cosas se preguntan de verdad:
 * "¿cuanto me tardo a 20 UC?" y "si solo puedo con dos, ¿cuales dos?".
 */
function MandoCarga({ carga, alCambiar, plan }) {
  const { min, max } = LIMITES_CARGA[carga.unidad]
  const fraccion = (v) => (v - min) / (max - min)
  const marcas = Array.from({ length: max - min + 1 }, (_, i) => min + i).filter((v) =>
    carga.unidad === 'uc' ? v % 4 === 0 : true,
  )
  const proximo = plan.semestres[0]

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between px-0.5">
        <span className="text-[13.5px] text-tinta-suave">Carga por semestre</span>
        <span className="text-[17px] font-semibold text-tinta tabular-nums">
          {textoCarga(carga)}
        </span>
      </div>

      <div className="mando-carga mt-2.5" style={{ '--lleno': POSICION(fraccion(carga.valor)) }}>
        {marcas.slice(1, -1).map((v) => (
          <i
            key={v}
            aria-hidden="true"
            data-dentro={v < carga.valor}
            className="mando-marca"
            style={{ left: POSICION(fraccion(v)) }}
          />
        ))}
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={carga.valor}
          onChange={(e) => alCambiar({ unidad: carga.unidad, valor: Number(e.target.value) })}
          aria-label="Carga por semestre"
          aria-valuetext={textoCarga(carga)}
        />
      </div>

      <div className="relative mt-2 h-4 text-[11px] text-tinta-tenue tabular-nums" aria-hidden="true">
        {marcas.map((v) => (
          <span
            key={v}
            className="absolute -translate-x-1/2"
            style={{ left: POSICION(fraccion(v)) }}
          >
            {v}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex rounded-full bg-tinta/[0.07] p-[3px]" role="group" aria-label="Contar la carga en">
          {[
            ['uc', 'UC'],
            ['materias', 'Materias'],
          ].map(([unidad, etiqueta]) => (
            <button
              key={unidad}
              type="button"
              aria-pressed={carga.unidad === unidad}
              onClick={() =>
                carga.unidad !== unidad &&
                alCambiar({ unidad, valor: LIMITES_CARGA[unidad].porDefecto })
              }
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors ${
                carga.unidad === unidad
                  ? 'bg-panel font-semibold text-tinta shadow-[0_1px_3px_rgb(0_0_0/0.2),inset_0_0_0_1px_var(--panel-borde)]'
                  : 'text-tinta-suave'
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>
        {/* Lo que la carga significa en la semana. Por materias depende de
            cuales toquen, asi que se dice la del proximo semestre. */}
        <p className="text-right text-[12.5px] leading-snug text-tinta-tenue">
          {carga.unidad === 'uc'
            ? `Unas ${horasDe(carga.valor)} h a la semana`
            : proximo && `El próximo: ${proximo.uc} UC, unas ${horasDe(proximo.uc)} h`}
        </p>
      </div>

      {plan.nuevoIngreso && (
        <p className="mt-4 px-0.5 text-[12.5px] leading-relaxed text-tinta-tenue">
          Como nuevo ingreso, tu primer semestre es primero completo: así lo inscribe la UDO.
        </p>
      )}
    </section>
  )
}

/**
 * Los semestres en una lista agrupada. El proximo va abierto; los demas,
 * plegados en una fila con el color de cada materia y sus nombres, que se
 * abren al tocarlos.
 */
function ListaSemestres({ plan, grado }) {
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

      {plan.semestres.map((s) => (
        <GrupoSemestre
          key={s.numero}
          semestre={s}
          abierto={abiertos.has(s.numero)}
          alAlternar={() => alternar(s.numero)}
        />
      ))}

      <p className="mt-6 flex items-center gap-2.5 rounded-2xl border border-panel-borde bg-panel-suave px-4 py-3.5 text-[14.5px] font-semibold text-aprobada">
        <GraduationCap size={18} strokeWidth={1.8} />
        Grado hacia {MES(grado).toLowerCase()}
      </p>
    </section>
  )
}

function GrupoSemestre({ semestre, abierto, alAlternar }) {
  const { numero, materias, uc } = semestre
  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={alAlternar}
        aria-expanded={abierto}
        className="flex w-full items-baseline justify-between px-1.5 pb-2 text-left"
      >
        <span className={ROTULO}>{etiquetaSemestre(numero)}</span>
        <span className="text-[12px] text-tinta-tenue tabular-nums">{uc} UC</span>
      </button>

      {abierto ? (
        <ul className="rounded-2xl border border-panel-borde bg-panel-suave px-4">
          {materias.map((a) => (
            <FilaMateria key={a.codigo} materia={a} />
          ))}
        </ul>
      ) : (
        <button
          type="button"
          onClick={alAlternar}
          aria-expanded={false}
          aria-label={`${etiquetaSemestre(numero)}: ${materias.length} materias`}
          className="flex w-full items-center gap-3 rounded-2xl border border-panel-borde bg-panel-suave px-4 py-3.5 text-left"
        >
          <span className="flex shrink-0 gap-[3px]" aria-hidden="true">
            {materias.map((a) => (
              <i
                key={a.codigo}
                className="size-1.5 rounded-full"
                style={{ backgroundColor: colorArea(a.area) }}
              />
            ))}
          </span>
          <span className="min-w-0 flex-1 truncate text-[14.5px] text-tinta">
            {materias.map((a) => a.nombre).join(', ')}
          </span>
          <span className="flex shrink-0 items-center text-[13px] text-tinta-tenue tabular-nums">
            {materias.length}
            <ChevronRight size={15} />
          </span>
        </button>
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

function Acciones({ alImprimir, alDescargar, deshabilitado }) {
  return (
    <div className="flex gap-2">
      {/* El .md va de boton secundario y sin etiqueta: util para quien sabe
          lo que es, y sin quitarle sitio a lo que busca casi todo el mundo. */}
      <button
        type="button"
        onClick={alDescargar}
        disabled={deshabilitado}
        title="Descargar el plan en texto (.md)"
        aria-label="Descargar el plan en texto (.md)"
        className="barra-cristal relative grid size-[52px] shrink-0 place-items-center rounded-full text-tinta-suave transition-transform active:scale-95 disabled:opacity-40"
      >
        <FileText size={18} strokeWidth={1.8} />
      </button>
      <button
        type="button"
        onClick={alImprimir}
        disabled={deshabilitado}
        className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-full bg-aprobada text-[15.5px] font-semibold text-[var(--lienzo)] transition-transform active:scale-[0.98] disabled:opacity-40"
      >
        <Download size={17} strokeWidth={2.2} />
        Guardar PDF
      </button>
    </div>
  )
}

/**
 * Escritorio: la ruta a la izquierda y la hoja de papel a la derecha, tal
 * como va a salir. Se ve lo que se imprime antes de imprimirlo.
 */
function Ventana({ carrera, alCerrar, cuerpo, acciones, children }) {
  useCerrarConEscape(alCerrar)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={alCerrar}
        className="absolute inset-0 cursor-default bg-black/60"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tu ruta"
        className="surgir relative flex h-full max-h-[56rem] w-full max-w-6xl overflow-hidden rounded-[28px] border border-panel-borde bg-panel shadow-2xl"
      >
        <div className="flex w-[25rem] shrink-0 flex-col border-r border-panel-borde">
          <div className="pt-4">
            <Cabecera carrera={carrera} alCerrar={alCerrar} />
          </div>
          <div className="desplazable-limpio min-h-0 flex-1 overflow-y-auto px-5 pb-6">{cuerpo}</div>
          <div className="border-t border-panel-borde px-5 py-4">
            {acciones}
            <p className="mt-2.5 text-center text-[11.5px] leading-snug text-tinta-tenue">
              Se abre el diálogo de impresión: elige <strong>Guardar como PDF</strong>.
            </p>
          </div>
        </div>
        <VistaPrevia>{children}</VistaPrevia>
      </div>
    </div>
  )
}

/* Lo que respira la hoja dentro de su panel, a cada lado */
const MARGEN_PREVIA = 32

/**
 * La hoja ENTERA a la vista, encogida hasta que quepa a lo ancho y a lo alto:
 * es una pagina, y se revisa como una pagina. Se encoge con zoom y no con
 * transform porque zoom si reflota y el panel no reserva el hueco del tamaño
 * natural.
 */
function VistaPrevia({ children }) {
  const refPanel = useRef(null)
  const [escala, setEscala] = useState(1)

  useLayoutEffect(() => {
    const panel = refPanel.current
    const medir = () =>
      setEscala(
        Math.min(
          1,
          (panel.clientWidth - 2 * MARGEN_PREVIA) / ANCHO_HOJA,
          (panel.clientHeight - 2 * MARGEN_PREVIA) / ALTO_HOJA,
        ),
      )
    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(panel)
    return () => observador.disconnect()
  }, [])

  return (
    <div ref={refPanel} className="grid min-w-0 flex-1 place-items-center bg-lienzo">
      <div style={{ zoom: escala }} className="overflow-hidden rounded-md shadow-2xl">
        {children}
      </div>
    </div>
  )
}

export default PlanRuta
