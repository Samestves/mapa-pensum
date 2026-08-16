import { Check, CircleDot, Info, Lock, RotateCcw, X } from 'lucide-react'
import { ESTADO } from '../data/estados'
import { colorNodo, etiquetaArea } from '../theme/areas'
import { fondoMateria } from '../theme/fondos'
import { codigoVisible } from '../data/codigoVisible'
import ListaPrelaciones, { SIN_PRELACIONES } from './ListaPrelaciones'

const ANCHO = 300

function Accion({ icono: Icono, texto, activo, color, alPulsar }) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      className="flex flex-1 flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-bold transition-colors"
      style={{
        borderColor: activo ? color : 'var(--panel-borde)',
        backgroundColor: activo ? `color-mix(in oklab, ${color} 16%, transparent)` : 'transparent',
        color: activo ? color : 'var(--tinta-suave)',
      }}
    >
      <Icono size={16} />
      {texto}
    </button>
  )
}

/**
 * Tarjeta flotante del nodo seleccionado. Se ancla al lado del nodo en
 * coordenadas de pantalla, calculadas a partir de la vista (pan + zoom).
 * Si no cabe a la derecha se pasa a la izquierda sola.
 */
function DetalleAsignatura({
  nodo,
  estado,
  prerrequisitos,
  desbloquea,
  posicion,
  medida,
  alMarcar,
  alCerrar,
}) {
  const margen = 12
  const cabeDerecha = posicion.x + 16 + ANCHO + margen <= medida.ancho
  const izquierda = cabeDerecha
    ? posicion.x + 16
    : Math.max(margen, posicion.x - posicion.ancho - ANCHO - 16)

  // Se sujeta dentro del contenedor para que nunca se salga por abajo
  const arriba = Math.min(
    Math.max(margen, posicion.y - 90),
    Math.max(margen, medida.alto - 360),
  )

  const marca =
    estado === ESTADO.APROBADA || estado === ESTADO.CURSANDO ? estado : null

  return (
    <div
      className="surgir transicion-tema absolute z-20 flex flex-col overflow-hidden rounded-xl border border-panel-borde bg-panel shadow-2xl"
      style={{ left: izquierda, top: arriba, width: ANCHO }}
    >
      {/* Cabecera con fondo generado y desenfocado: el color viene del area
          y la forma del codigo, asi cada materia tiene el suyo. */}
      <div className="relative overflow-hidden border-b border-panel-borde">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-8"
          style={{ background: fondoMateria(nodo.codigo, colorNodo(nodo)), filter: 'blur(26px)' }}
        />
        <div className="relative flex items-start gap-2.5 px-4 py-3.5">
          <span
            className="mt-1 h-9 w-1 shrink-0 rounded-full"
            style={{ backgroundColor: colorNodo(nodo) }}
          />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] tracking-wider text-tinta-suave">
              {codigoVisible(nodo)}
              {nodo.semestre ? ` · Semestre ${nodo.semestre}` : ' · Electiva'}
            </p>
            <h3 className="text-[15px] leading-tight font-extrabold text-tinta">
              {nodo.nombre}
            </h3>
            <p className="mt-0.5 text-[11px] font-semibold text-tinta-suave">
              {nodo.area && `${etiquetaArea(nodo.area)} · `}
              {nodo.uc} UC
            </p>
          </div>
          <button
            type="button"
            onClick={alCerrar}
            aria-label="Cerrar"
            className="grid size-6 shrink-0 place-items-center rounded-md text-tinta-suave transition-colors hover:text-tinta"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex gap-2 px-3.5 py-3">
        <Accion
          icono={Check}
          texto="Aprobada"
          activo={marca === ESTADO.APROBADA}
          color="var(--estado-aprobada)"
          alPulsar={() => alMarcar(nodo.codigo, ESTADO.APROBADA)}
        />
        <Accion
          icono={CircleDot}
          texto="Cursando"
          activo={marca === ESTADO.CURSANDO}
          color="var(--estado-cursando)"
          alPulsar={() => alMarcar(nodo.codigo, ESTADO.CURSANDO)}
        />
        <Accion
          icono={RotateCcw}
          texto="Sin cursar"
          activo={marca === null}
          color="var(--tinta-suave)"
          alPulsar={() => alMarcar(nodo.codigo, null)}
        />
      </div>

      {estado === ESTADO.BLOQUEADA && (
        <p className="mx-3.5 mb-3 flex items-start gap-1.5 rounded-lg bg-panel-suave px-2.5 py-2 text-[11px] leading-snug text-tinta-suave">
          <Lock size={12} className="mt-0.5 shrink-0" />
          Te falta aprobar sus prerrequisitos. Puedes marcarla igual si ya la viste.
        </p>
      )}

      <div className="max-h-52 overflow-y-auto border-t border-panel-borde px-3.5 py-3">
        <ListaPrelaciones
          titulo="Requiere"
          materias={prerrequisitos}
          // Con requisito especial no se dice "nada": abajo viene la condicion
          vacio={nodo.requisitoEspecial ? '' : SIN_PRELACIONES}
        />

        {/* "120 UC aprobadas" no es una materia, asi que no puede ser un cable
            del mapa ni una fila con su punto de color. Es una condicion, y se
            dice con palabras para que no se confunda con una prelacion. */}
        {nodo.requisitoEspecial && (
          <p className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-panel-suave px-2.5 py-2 text-[11px] leading-snug text-tinta-suave">
            <Info size={12} className="mt-0.5 shrink-0" />
            <span>
              Además: <strong className="font-bold text-tinta">{nodo.requisitoEspecial}</strong>.
              Es una condición del pensum, no una materia.
            </span>
          </p>
        )}

        <div className="mt-3">
          <ListaPrelaciones
            titulo="Desbloquea"
            materias={desbloquea}
            vacio="Nada: es final de rama."
          />
        </div>
      </div>
    </div>
  )
}

export default DetalleAsignatura
