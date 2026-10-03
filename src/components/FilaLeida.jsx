import { ChevronDown, TriangleAlert } from 'lucide-react'
import { DIAS } from '../layout/importarHorario'
import { aTexto, enDoceHoras } from '../layout/horario'

/* Por que una fila no se puede añadir tal cual. El texto dice el problema, no
   la solucion: los controles de debajo ya enseñan que se puede tocar, y
   repetirlo por escrito en cada fila llenaria la pantalla de instrucciones. */
const AVISO = {
  'sin-materia': 'No encontré esta materia en el pensum',
  'sin-dia': 'No entendí el día',
  'sin-hora': 'No entendí la hora',
  fuera: 'Queda fuera de la jornada',
  corta: 'Dura menos de media hora',
  choca: 'Se pisa con otra clase: desmarca una de las dos',
}

const aMinutosDeCampo = (texto) => {
  const [h, m] = String(texto).split(':').map(Number)
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null
}

/** Una fila leída, con lo que se entendió y lo que se puede corregir. */
function FilaLeida({ candidata, materias, abierta, alAbrir, alCambiar, alAlternar }) {
  const { materia, dia, inicio, fin, avisos, incluir, leido, seccion, aula } = candidata
  const roto = avisos.length > 0

  const resumen = [
    dia != null ? DIAS[dia] : null,
    inicio != null && fin != null ? `${enDoceHoras(inicio)} – ${enDoceHoras(fin)}` : null,
    seccion && `Sección ${seccion}`,
    aula,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <li className="border-b border-panel-borde last:border-b-0">
      <div className="flex items-start gap-3 px-4 py-3 sm:px-5">
        {/* La casilla es lo primero de la fila porque es la unica decision
            que hay que tomar en todas: entra o no entra. */}
        {/* La casilla sigue siendo util en una fila rota -desmarcar una de
            dos que chocan libera a la otra- pero no puede pintarse en verde:
            en verde dice "esta entra", y una fila con avisos no entra. En
            ambar dice lo que de verdad es, "la quieres pero todavia no
            puede". */}
        <input
          type="checkbox"
          checked={incluir}
          onChange={alAlternar}
          aria-label={`Añadir ${materia?.nombre ?? leido.nombre}`}
          className={`mt-0.5 size-[17px] shrink-0 ${
            roto ? 'accent-[var(--estado-cursando)]' : 'accent-[var(--estado-aprobada)]'
          }`}
        />

        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-[13px] font-medium ${
              materia ? 'text-tinta' : 'text-tinta-tenue italic'
            }`}
          >
            {materia?.nombre ?? leido.nombre ?? 'Sin nombre'}
          </p>

          {resumen && <p className="mt-0.5 truncate text-[11px] text-tinta-suave">{resumen}</p>}

          {/* Lo que decia la foto, cuando no coincide con lo que se entendio.
              Es la unica forma de comprobar una fila sin volver a abrir la
              imagen. */}
          {materia && leido.nombre && materia.nombre !== leido.nombre && (
            <p className="mt-0.5 truncate text-[10px] text-tinta-tenue">
              En la imagen: «{leido.nombre}»
            </p>
          )}

          {roto && (
            <p className="mt-1.5 flex items-start gap-1.5 text-[10.5px] leading-snug font-medium text-[var(--estado-cursando)]">
              <TriangleAlert size={12} className="mt-px shrink-0" />
              {avisos.map((a) => AVISO[a]).join(' · ')}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={alAbrir}
          aria-expanded={abierta}
          aria-label={abierta ? 'Cerrar los ajustes' : 'Ajustar esta clase'}
          className="grid size-7 shrink-0 place-items-center rounded-lg text-tinta-tenue transition-colors hover:bg-panel-suave hover:text-tinta"
        >
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${abierta ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {abierta && (
        <div className="grid grid-cols-2 gap-2 px-4 pb-3.5 sm:grid-cols-[1fr_auto_auto] sm:px-5">
          <select
            value={materia?.codigo ?? ''}
            onChange={(e) => alCambiar({ codigo: e.target.value || null })}
            aria-label="Materia"
            className="col-span-2 min-w-0 rounded-lg border border-panel-borde bg-panel px-2.5 py-2 text-[12px] text-tinta sm:col-span-1"
          >
            <option value="">— Elige la materia —</option>
            {materias.map((m) => (
              <option key={m.codigo} value={m.codigo}>
                {m.nombre}
              </option>
            ))}
          </select>

          <select
            value={dia ?? ''}
            onChange={(e) =>
              alCambiar({ dia: e.target.value === '' ? null : Number(e.target.value) })
            }
            aria-label="Día"
            className="rounded-lg border border-panel-borde bg-panel px-2.5 py-2 text-[12px] text-tinta"
          >
            <option value="">— Día —</option>
            {DIAS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5">
            <input
              type="time"
              value={inicio == null ? '' : aTexto(inicio)}
              onChange={(e) => alCambiar({ inicio: aMinutosDeCampo(e.target.value) })}
              aria-label="Hora de inicio"
              className="w-full min-w-0 rounded-lg border border-panel-borde bg-panel px-2 py-2 text-[12px] text-tinta"
            />
            <span className="shrink-0 text-[11px] text-tinta-tenue">–</span>
            <input
              type="time"
              value={fin == null ? '' : aTexto(fin)}
              onChange={(e) => alCambiar({ fin: aMinutosDeCampo(e.target.value) })}
              aria-label="Hora de fin"
              className="w-full min-w-0 rounded-lg border border-panel-borde bg-panel px-2 py-2 text-[12px] text-tinta"
            />
          </div>
        </div>
      )}
    </li>
  )
}

export default FilaLeida
