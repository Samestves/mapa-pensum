import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Download, Printer, Route, TriangleAlert, X } from 'lucide-react'
import { planificar, horasDe, mesEstimadoGrado } from '../layout/planificador'
import { pesoDesbloqueo } from '../layout/relaciones'
import { useCerrarConEscape } from '../hooks/useCerrarConEscape'
import { useFocoAtrapado } from '../hooks/useFocoAtrapado'
import { guardar, leer } from '../data/almacen'
import { descargarMarkdown, MES } from '../data/exportarPlan'
import HojaPlan, { ANCHO_HOJA } from './HojaPlan'

const CLAVE_NOMBRE = 'mapa-pensum:nombre'
const CLAVE_UC = 'mapa-pensum:uc-semestre'

/**
 * La vista previa enseña la hoja ENTERA, encogida hasta que quepa.
 *
 * Antes la hoja se remaquetaba para el ancho que hubiera y el bloque de
 * impresion deshacia esos cambios uno por uno, asi que en un telefono se
 * revisaba una maqueta que no era la que iba a salir por la impresora. Una
 * previa que no es fiel no sirve para revisar nada.
 *
 * Se encoge con zoom y no con transform: scale porque zoom SI reflota el
 * diseño, y entonces el contenedor recibe el alto ya encogido y se desplaza
 * solo. Con scale el hueco reservado sigue siendo el de la hoja a tamaño
 * natural y hay que calcularlo a mano.
 */
function VistaPrevia({ children }) {
  const refCaja = useRef(null)
  const [escala, setEscala] = useState(1)

  useLayoutEffect(() => {
    const caja = refCaja.current
    if (!caja) return
    const medir = () => setEscala(Math.min(1, caja.clientWidth / ANCHO_HOJA))
    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(caja)
    return () => observador.disconnect()
  }, [])

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-lienzo p-3 sm:p-6">
      <div ref={refCaja}>
        {/* La sombra y el borde son los de una hoja de papel sobre una mesa,
            no los de otro panel de la aplicacion: es lo que hace entender de
            un vistazo que esto se imprime. */}
        <div
          style={{ zoom: escala }}
          className="transicion-tema mx-auto w-fit overflow-hidden rounded-lg border border-panel-borde bg-panel shadow-xl"
        >
          {children}
        </div>
      </div>
    </div>
  )
}

/** El titular: una sola frase, la misma que encabeza la hoja. */
function Resumen({ semestres, grado, materias }) {
  if (semestres === 0) {
    return (
      <div className="transicion-tema rounded-xl border border-panel-borde bg-panel-suave px-4 py-3.5">
        <p className="text-sm font-extrabold text-aprobada">No queda nada pendiente.</p>
        <p className="mt-1 text-[11px] text-tinta-suave">Terminaste el pensum. Enhorabuena.</p>
      </div>
    )
  }

  return (
    <div className="transicion-tema rounded-xl border border-panel-borde bg-panel-suave px-4 py-3.5">
      <p className="text-[9.5px] font-extrabold tracking-[0.14em] text-tinta-tenue uppercase">
        {grado ? 'Te gradúas en' : 'Te faltan'}
      </p>
      <p className="mt-1 text-[22px] leading-none font-extrabold tracking-[-0.03em] text-tinta">
        {grado ?? `${semestres} semestres`}
      </p>
      <p className="mt-1.5 text-[11px] text-tinta-suave">
        {semestres} {semestres === 1 ? 'semestre' : 'semestres'} · {materias} materias
      </p>
    </div>
  )
}

/**
 * Planificador y exportacion: en que orden puedes ver lo que te falta, y como
 * llevartelo en papel.
 *
 * El unico mando es la carga por semestre. Habia dos -horas de estudio y UC-
 * y eran el mismo numero visto de dos formas: mover uno movia el otro, y eso
 * obliga a entender la conversion para saber por que se movio algo que no
 * tocaste. Ahora se ajustan las UC, que es como se inscribe de verdad, y las
 * horas se dicen debajo como lo que son: la consecuencia.
 *
 * La hoja se pinta dos veces a proposito: la de la previa y la del portal,
 * que es la que sale por la impresora. Ver el bloque @media print de
 * index.css para por que no puede ser la misma.
 */
function PlanRuta({ carrera, marcas, estados, progreso, relaciones, elegidas, alCerrar }) {
  const { asignaturas, grupos } = carrera
  const refModal = useRef(null)
  const [nombre, setNombre] = useState(() => leer(CLAVE_NOMBRE, ''))
  const [ucPorSemestre, setUc] = useState(() => Number(leer(CLAVE_UC)) || 16)
  // En movil los ajustes arrancan plegados para que la hoja tenga sitio
  const [ajustes, setAjustes] = useState(() => window.innerWidth >= 768)

  useEffect(() => {
    guardar(CLAVE_NOMBRE, nombre)
  }, [nombre])
  useEffect(() => {
    guardar(CLAVE_UC, String(ucPorSemestre))
  }, [ucPorSemestre])

  useCerrarConEscape(alCerrar)
  useFocoAtrapado(refModal)

  const pesos = useMemo(() => pesoDesbloqueo(relaciones), [relaciones])

  const plan = useMemo(
    () => planificar(asignaturas, marcas, estados, pesos, ucPorSemestre, grupos, elegidas),
    [asignaturas, marcas, estados, pesos, ucPorSemestre, grupos, elegidas],
  )

  const totalSemestres = plan.semestres.length
  const grado = mesEstimadoGrado(totalSemestres)
  const textoGrado = grado ? MES(grado) : null

  const acciones = (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => window.print()}
        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-aprobada px-3 py-3 text-[13px] font-extrabold text-[var(--lienzo)] transition-transform active:scale-[0.98]"
      >
        <Printer size={16} />
        Guardar PDF
      </button>
      {/* El .md baja a boton secundario y sin etiqueta. Es util para quien
          sabe lo que es, y para quien no lo es era la mitad de la fila de
          acciones ocupada por una extension de archivo. */}
      <button
        type="button"
        title="Descargar el plan en texto (.md)"
        aria-label="Descargar el plan en texto (.md)"
        onClick={() =>
          descargarMarkdown({ carrera, nombre, progreso, plan, ucPorSemestre, grado })
        }
        className="grid size-[46px] shrink-0 place-items-center rounded-xl border border-panel-borde text-tinta-tenue transition-colors hover:text-tinta"
      >
        <Download size={16} />
      </button>
    </div>
  )

  const pista = (
    <p className="mt-2 text-[10px] leading-snug text-tinta-tenue">
      Se abre el diálogo de impresión: elige <strong>Guardar como PDF</strong> como destino.
    </p>
  )

  const hoja = (
    <HojaPlan
      nombre={nombre}
      carrera={carrera}
      progreso={progreso}
      plan={plan}
      ucPorSemestre={ucPorSemestre}
      grado={textoGrado}
    />
  )

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-center md:items-center md:p-4">
        <button
          type="button"
          aria-label="Cerrar"
          onClick={alCerrar}
          className="no-imprimir absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
        />

        {/* A pantalla completa en movil y como tarjeta a partir de md: en un
            telefono un modal centrado con margenes desperdicia el poco alto
            que hay y deja la hoja en una ranura. */}
        <div
          ref={refModal}
          role="dialog"
          aria-modal="true"
          aria-label="Planificar mi ruta"
          className="surgir relative flex h-full w-full flex-col overflow-hidden bg-panel md:h-auto md:max-h-full md:max-w-5xl md:flex-row md:rounded-2xl md:border md:border-panel-borde md:shadow-2xl"
        >
          <div className="no-imprimir flex shrink-0 flex-col border-panel-borde md:min-h-0 md:w-[19rem] md:border-r">
            <div className="flex items-start justify-between gap-2 border-b border-panel-borde px-4 py-3 md:px-5 md:py-4">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-sm font-extrabold text-tinta">
                  <Route size={16} className="shrink-0 text-aprobada" />
                  Planificar mi ruta
                </h2>
                {/* Que es y para que sirve, en una frase. Estaba escrito solo
                    dentro de la hoja, o sea despues de decidir abrirla. */}
                <p className="mt-1 text-[11px] leading-snug text-tinta-suave">
                  El orden en que puedes ver lo que te falta, sin saltarte ninguna prelación.
                </p>
              </div>
              <button
                type="button"
                onClick={alCerrar}
                aria-label="Cerrar"
                className="-mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg text-tinta-tenue hover:bg-panel-suave hover:text-tinta"
              >
                <X size={17} />
              </button>
            </div>

            <div className="flex flex-col gap-3 px-4 py-3 md:min-h-0 md:flex-1 md:gap-4 md:overflow-y-auto md:px-5 md:py-4">
              <Resumen
                semestres={totalSemestres}
                grado={textoGrado}
                materias={plan.materiasRestantes}
              />

              {plan.sinUbicar.length > 0 && (
                <p className="flex items-start gap-2 rounded-lg border border-panel-borde px-3 py-2 text-[10px] leading-snug text-tinta-suave">
                  <TriangleAlert size={13} className="mt-0.5 shrink-0 text-cursando" />
                  {plan.sinUbicar.length} materias no se pudieron ubicar: revisa sus
                  prelaciones.
                </p>
              )}

              {/* En movil el mando se pliega; en escritorio siempre esta */}
              <button
                type="button"
                onClick={() => setAjustes((v) => !v)}
                className="transicion-tema flex items-center justify-between rounded-lg border border-panel-borde px-3 py-2.5 text-[11.5px] font-bold text-tinta-suave md:hidden"
              >
                <span>Ajustar mi carga</span>
                <span className="flex items-center gap-1.5 font-mono text-tinta">
                  {ucPorSemestre} UC
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-300 ${ajustes ? 'rotate-180' : ''}`}
                  />
                </span>
              </button>

              <div className={`flex-col gap-4 md:flex ${ajustes ? 'flex' : 'hidden'}`}>
                <label className="block">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[11.5px] font-bold text-tinta-suave">
                      Carga por semestre
                    </span>
                    <span className="font-mono text-sm font-bold text-tinta">
                      {ucPorSemestre}
                      <span className="text-[10px] text-tinta-tenue"> UC</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={28}
                    value={ucPorSemestre}
                    onChange={(e) => setUc(Number(e.target.value))}
                    className="mt-2.5 w-full accent-[var(--estado-aprobada)]"
                  />
                  {/* Las horas ya no son un mando, son la consecuencia: es lo
                      que hay que poderse imaginar antes de subir la carga. */}
                  <p className="mt-1.5 text-[10px] leading-snug text-tinta-tenue">
                    Son unas <strong>{horasDe(ucPorSemestre)} h a la semana</strong> entre
                    clases y estudio.
                  </p>
                </label>

                <label className="block">
                  <span className="text-[11.5px] font-bold text-tinta-suave">
                    Tu nombre <span className="font-semibold text-tinta-tenue">(opcional)</span>
                  </span>
                  <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Sale en la hoja"
                    className="seleccionable mt-1.5 w-full rounded-lg border border-panel-borde bg-panel-suave px-2.5 py-2 text-xs text-tinta outline-none placeholder:text-tinta-tenue focus:border-aprobada"
                  />
                </label>
              </div>
            </div>

            {/* En escritorio las acciones cierran el rail */}
            <div className="hidden border-t border-panel-borde px-5 py-4 md:block">
              {acciones}
              {pista}
            </div>
          </div>

          <VistaPrevia>{hoja}</VistaPrevia>

          {/* En movil van fijas abajo, siempre al alcance del pulgar */}
          <div className="no-imprimir transicion-tema shrink-0 border-t border-panel-borde bg-panel px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
            {acciones}
          </div>
        </div>
      </div>

      {/* Copia para el papel: cuelga de <body>, sin padres que la recorten,
          y con la paleta clara para que salga tinta sobre blanco. */}
      {createPortal(
        <div className="solo-impresion" data-tema="claro">
          {hoja}
        </div>,
        document.body,
      )}
    </>
  )
}

export default PlanRuta
