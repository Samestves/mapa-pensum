import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronDown, Download, Printer, Route, TriangleAlert, X } from 'lucide-react'
import {
  planificar,
  ucSugeridas,
  horasDe,
  mesEstimadoGrado,
  HORAS_POR_UC,
} from '../layout/planificador'
import { pesoDesbloqueo } from '../layout/relaciones'
import HojaPlan from './HojaPlan'

const CLAVE_NOMBRE = 'mapa-pensum:nombre'
const CLAVE_UC = 'mapa-pensum:uc-semestre'

// Solo la inicial: capitalize de CSS pone mayuscula en cada palabra y en
// español deja cosas como "Agosto De 2031".
const MES = (fecha) => {
  const texto = fecha?.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : ''
}

function Control({ etiqueta, valor, sufijo, min, max, alCambiar, ayuda }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-bold text-tinta-suave">{etiqueta}</span>
        <span className="font-mono text-sm font-bold text-tinta">
          {valor}
          <span className="text-[10px] text-tinta-tenue"> {sufijo}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={valor}
        onChange={(e) => alCambiar(Number(e.target.value))}
        className="mt-2 w-full accent-[var(--estado-aprobada)]"
      />
      {ayuda && <p className="mt-1 text-[10px] leading-snug text-tinta-tenue">{ayuda}</p>}
    </label>
  )
}

function Boton({ icono: Ico, texto, principal, alPulsar }) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition-colors ${
        principal
          ? 'bg-aprobada text-[var(--lienzo)]'
          : 'border border-panel-borde text-tinta-suave hover:text-tinta'
      }`}
    >
      <Ico size={15} />
      {texto}
    </button>
  )
}

/**
 * Planificador y exportacion. Calcula en cuantos semestres terminas segun la
 * carga que puedas llevar, y deja llevarte el plan en PDF o en Markdown.
 *
 * La hoja se pinta dos veces a proposito: la del modal es la vista previa y
 * se adapta al ancho, y la del portal es la que sale por la impresora. Ver
 * el bloque @media print de index.css para por que no puede ser la misma.
 */
function PlanRuta({
  asignaturas,
  electivas,
  marcas,
  estados,
  progreso,
  relaciones,
  meta,
  alCerrar,
}) {
  const [nombre, setNombre] = useState(() => localStorage.getItem(CLAVE_NOMBRE) ?? '')
  const [ucPorSemestre, setUc] = useState(
    () => Number(localStorage.getItem(CLAVE_UC)) || 16,
  )
  const [horas, setHoras] = useState(() => horasDe(Number(localStorage.getItem(CLAVE_UC)) || 16))
  // En movil los ajustes arrancan plegados para que la hoja tenga sitio
  const [ajustes, setAjustes] = useState(() => window.innerWidth >= 768)

  useEffect(() => {
    localStorage.setItem(CLAVE_NOMBRE, nombre)
  }, [nombre])
  useEffect(() => {
    localStorage.setItem(CLAVE_UC, String(ucPorSemestre))
  }, [ucPorSemestre])

  useEffect(() => {
    const tecla = (e) => e.key === 'Escape' && alCerrar()
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [alCerrar])

  // Los dos mandos son el mismo dato visto de dos formas, asi que se
  // sincronizan en ambos sentidos. Antes mover las UC dejaba las horas
  // congeladas en el valor viejo y la ayuda mentia.
  const cambiarUc = (uc) => {
    setUc(uc)
    setHoras(horasDe(uc))
  }
  const cambiarHoras = (h) => {
    setHoras(h)
    setUc(ucSugeridas(h))
  }

  const pesos = useMemo(() => pesoDesbloqueo(relaciones), [relaciones])

  const plan = useMemo(
    () =>
      planificar(asignaturas, marcas, estados, pesos, ucPorSemestre, electivas, meta.creditos),
    [asignaturas, marcas, estados, pesos, ucPorSemestre, electivas, meta.creditos],
  )

  const totalSemestres = plan.semestres.length
  const grado = mesEstimadoGrado(totalSemestres)

  const descargarMarkdown = () => {
    const lineas = [
      `# Mi ruta hasta el grado`,
      ``,
      `${meta.carrera} — ${meta.nucleo}`,
      nombre ? `Estudiante: ${nombre}` : null,
      `Generado el ${new Date().toLocaleDateString('es-VE')}`,
      ``,
      `- Avance: ${progreso.porcentaje.toFixed(1)}% (${progreso.ucAprobadas}/${progreso.ucTotales} UC)`,
      `- Materias pendientes: ${plan.materiasRestantes}`,
      `- Semestres estimados: ${totalSemestres} con ${ucPorSemestre} UC por semestre`,
      grado ? `- Grado aproximado: ${MES(grado)}` : null,
      ``,
      ...plan.semestres.flatMap((s) => [
        `## Semestre ${s.numero} — ${s.materias.length} materias · ${s.uc} UC`,
        ``,
        ...s.materias.map((a) => `- [ ] \`${a.codigo}\` ${a.nombre} (${a.uc} UC)`),
        ``,
      ]),
      `---`,
      `Generado con Mapa de Pensum · https://mapa-pensum.vercel.app`,
      `Las unidades crédito no están verificadas contra el pensum oficial.`,
    ].filter((l) => l !== null)

    const blob = new Blob([lineas.join('\n')], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mi-ruta-pensum.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  const acciones = (
    <>
      <Boton icono={Printer} texto="Imprimir o PDF" principal alPulsar={() => window.print()} />
      <Boton icono={Download} texto="Descargar .md" alPulsar={descargarMarkdown} />
    </>
  )

  const hoja = (
    <HojaPlan
      nombre={nombre}
      meta={meta}
      progreso={progreso}
      plan={plan}
      ucPorSemestre={ucPorSemestre}
      grado={grado ? MES(grado) : null}
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
        <div className="surgir relative flex h-full w-full flex-col overflow-hidden bg-panel md:h-auto md:max-h-full md:max-w-5xl md:flex-row md:rounded-2xl md:border md:border-panel-borde md:shadow-2xl">
          <div className="no-imprimir flex shrink-0 flex-col border-panel-borde md:w-72 md:min-h-0 md:border-r">
            <div className="flex items-center justify-between gap-2 border-b border-panel-borde px-4 py-3 md:px-5 md:py-4">
              <h2 className="flex items-center gap-2 text-sm font-extrabold text-tinta">
                <Route size={16} className="text-aprobada" />
                Planificar mi ruta
              </h2>
              <button
                type="button"
                onClick={alCerrar}
                aria-label="Cerrar"
                className="grid size-8 shrink-0 place-items-center rounded-lg text-tinta-tenue hover:bg-panel-suave hover:text-tinta"
              >
                <X size={17} />
              </button>
            </div>

            <div className="flex flex-col gap-3 px-4 py-3 md:min-h-0 md:flex-1 md:gap-4 md:overflow-y-auto md:px-5 md:py-4">
              {/* El titular: cuanto falta y para cuando. Es lo que se viene
                  a mirar; todo lo demas son mandos para moverlo. */}
              <div className="transicion-tema rounded-xl border border-panel-borde bg-panel-suave px-3.5 py-3">
                {totalSemestres === 0 ? (
                  <p className="text-sm font-bold text-aprobada">
                    No queda nada pendiente. Enhorabuena.
                  </p>
                ) : (
                  <>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold tracking-wide text-tinta-tenue uppercase">
                          Te faltan
                        </p>
                        <p className="font-mono text-3xl leading-none font-extrabold text-aprobada">
                          {totalSemestres}
                        </p>
                        <p className="text-[10px] text-tinta-suave">
                          semestres · ≈ {(totalSemestres / 2).toFixed(1)} años
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="flex items-center justify-end gap-1 text-[10px] font-bold tracking-wide text-tinta-tenue uppercase">
                          <CalendarDays size={11} />
                          Grado
                        </p>
                        <p className="text-[13px] leading-tight font-bold text-tinta">
                          {MES(grado)}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {plan.sinUbicar.length > 0 && (
                <p className="flex items-start gap-2 rounded-lg border border-panel-borde px-3 py-2 text-[10px] leading-snug text-tinta-suave">
                  <TriangleAlert size={13} className="mt-0.5 shrink-0 text-cursando" />
                  {plan.sinUbicar.length} materias no se pudieron ubicar: revisa sus
                  prelaciones.
                </p>
              )}

              {/* En movil los mandos se pliegan; en escritorio siempre estan */}
              <button
                type="button"
                onClick={() => setAjustes((v) => !v)}
                className="transicion-tema flex items-center justify-between rounded-lg border border-panel-borde px-3 py-2 text-[11px] font-bold text-tinta-suave md:hidden"
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

              <div
                className={`flex-col gap-3 md:flex md:gap-4 ${ajustes ? 'flex' : 'hidden'}`}
              >
                <Control
                  etiqueta="Horas de estudio"
                  valor={horas}
                  sufijo="h/semana"
                  min={6}
                  max={60}
                  alCambiar={cambiarHoras}
                  ayuda={`Estimación: ~${HORAS_POR_UC} h por UC entre clase y estudio.`}
                />

                <Control
                  etiqueta="Carga por semestre"
                  valor={ucPorSemestre}
                  sufijo="UC"
                  min={4}
                  max={28}
                  alCambiar={cambiarUc}
                  ayuda="Ajústala si tu carga real es otra."
                />

                <label className="block">
                  <span className="text-[11px] font-bold text-tinta-suave">
                    Tu nombre (opcional)
                  </span>
                  <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Aparece en la hoja"
                    className="seleccionable mt-1.5 w-full rounded-lg border border-panel-borde bg-panel-suave px-2.5 py-2 text-xs text-tinta outline-none placeholder:text-tinta-tenue focus:border-aprobada"
                  />
                </label>
              </div>
            </div>

            {/* En escritorio las acciones cierran el rail */}
            <div className="hidden gap-2 border-t border-panel-borde px-5 py-4 md:flex md:flex-col">
              {acciones}
            </div>
          </div>

          {/* La vista previa va sobre el lienzo y con sombra para que se lea
              como una hoja de papel, no como otro panel de la app. */}
          <div className="min-h-0 flex-1 overflow-y-auto bg-lienzo p-3 sm:p-5">
            <div className="transicion-tema mx-auto max-w-[820px] overflow-hidden rounded-xl border border-panel-borde bg-panel shadow-lg">
              {hoja}
            </div>
          </div>

          {/* En movil van fijas abajo, siempre al alcance del pulgar */}
          <div className="no-imprimir transicion-tema flex shrink-0 gap-2 border-t border-panel-borde bg-panel px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
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
