import { useEffect, useMemo, useState } from 'react'
import { Download, Printer, X } from 'lucide-react'
import { planificar, ucSugeridas, HORAS_POR_UC } from '../layout/planificador'
import { pesoDesbloqueo } from '../layout/relaciones'
import HojaPlan from './HojaPlan'

const CLAVE_NOMBRE = 'mapa-pensum:nombre'
const CLAVE_UC = 'mapa-pensum:uc-semestre'

function Control({ etiqueta, valor, sufijo, min, max, alCambiar, ayuda }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between">
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
        className="mt-1.5 w-full accent-[var(--estado-aprobada)]"
      />
      {ayuda && <p className="mt-0.5 text-[10px] leading-snug text-tinta-tenue">{ayuda}</p>}
    </label>
  )
}

/**
 * Planificador y exportacion. Calcula en cuantos semestres terminas segun la
 * carga que puedas llevar, y deja llevarte el plan en PDF o en Markdown.
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
  const [horas, setHoras] = useState(() => (Number(localStorage.getItem(CLAVE_UC)) || 16) * HORAS_POR_UC)

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

  const pesos = useMemo(() => pesoDesbloqueo(relaciones), [relaciones])

  const plan = useMemo(
    () =>
      planificar(asignaturas, marcas, estados, pesos, ucPorSemestre, electivas, meta.creditos),
    [asignaturas, marcas, estados, pesos, ucPorSemestre, electivas, meta.creditos],
  )

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
      `- Semestres estimados: ${plan.semestres.length} con ${ucPorSemestre} UC por semestre`,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={alCerrar}
        className="no-imprimir absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
      />

      <div className="surgir relative flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-panel-borde bg-panel shadow-2xl md:flex-row">
        <div className="no-imprimir flex shrink-0 flex-col gap-4 border-b border-panel-borde p-5 md:w-64 md:border-r md:border-b-0">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-sm font-extrabold text-tinta">Planificar mi ruta</h2>
            <button
              type="button"
              onClick={alCerrar}
              aria-label="Cerrar"
              className="grid size-7 shrink-0 place-items-center rounded-md text-tinta-tenue hover:text-tinta"
            >
              <X size={16} />
            </button>
          </div>

          <label className="block">
            <span className="text-[11px] font-bold text-tinta-suave">Tu nombre (opcional)</span>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Aparece en la hoja"
              className="seleccionable mt-1 w-full rounded-lg border border-panel-borde bg-panel-suave px-2.5 py-1.5 text-xs text-tinta outline-none placeholder:text-tinta-tenue focus:border-aprobada"
            />
          </label>

          <Control
            etiqueta="Horas de estudio"
            valor={horas}
            sufijo="h/semana"
            min={6}
            max={60}
            alCambiar={(h) => {
              setHoras(h)
              setUc(ucSugeridas(h))
            }}
            ayuda={`Estimación: ~${HORAS_POR_UC} h por UC entre clase y estudio.`}
          />

          <Control
            etiqueta="Carga por semestre"
            valor={ucPorSemestre}
            sufijo="UC"
            min={4}
            max={28}
            alCambiar={setUc}
            ayuda="Ajústala si tu carga real es otra."
          />

          <div className="rounded-lg border border-panel-borde bg-panel-suave px-3 py-2.5">
            <p className="text-[10px] font-bold tracking-wide text-tinta-tenue uppercase">
              Te faltan
            </p>
            <p className="font-mono text-2xl leading-none font-extrabold text-aprobada">
              {plan.semestres.length}
            </p>
            <p className="text-[10px] text-tinta-suave">
              semestres · ≈ {(plan.semestres.length / 2).toFixed(1)} años
            </p>
          </div>

          <div className="mt-auto flex flex-col gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 rounded-lg bg-aprobada px-3 py-2 text-xs font-bold text-[var(--lienzo)]"
            >
              <Printer size={15} />
              Imprimir o guardar PDF
            </button>
            <button
              type="button"
              onClick={descargarMarkdown}
              className="flex items-center justify-center gap-2 rounded-lg border border-panel-borde px-3 py-2 text-xs font-bold text-tinta-suave hover:text-tinta"
            >
              <Download size={15} />
              Descargar .md
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <HojaPlan
            nombre={nombre}
            meta={meta}
            progreso={progreso}
            plan={plan}
            ucPorSemestre={ucPorSemestre}
          />
        </div>
      </div>
    </div>
  )
}

export default PlanRuta
