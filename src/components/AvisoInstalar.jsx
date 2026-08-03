import { useState } from 'react'
import { Download, Share, WifiOff, X } from 'lucide-react'
import { useInstalable } from '../hooks/useInstalable'

const SALIDA = 260

/**
 * Ofrece guardar la aplicacion en el telefono.
 *
 * El argumento no es "instala nuestra app", que a nadie le importa, sino el
 * unico que aqui significa algo: una vez guardada abre sin conexion. En un
 * publico que paga los datos por megabyte y mira su pensum muchas veces, esa
 * es toda la propuesta.
 *
 * Sale abajo y por encima de todo, se desliza en medio segundo y se puede
 * cerrar para siempre. Un aviso de instalar que reaparece cada visita es
 * peor que no tenerlo.
 */
function AvisoInstalar() {
  const { modo, instalar, descartar } = useInstalable()
  const [saliendo, setSaliendo] = useState(false)

  if (!modo) return null

  // Se despide antes de irse, igual que el cambio de ruta
  const cerrar = () => {
    setSaliendo(true)
    setTimeout(descartar, SALIDA)
  }

  return (
    <div
      role="dialog"
      aria-label="Guardar la aplicación en tu teléfono"
      className={`fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[23rem] ${
        saliendo ? 'aviso-saliendo' : 'aviso-entrando'
      }`}
    >
      <div className="transicion-tema flex items-start gap-3 rounded-2xl border border-panel-borde bg-panel/95 p-4 shadow-2xl backdrop-blur-xl">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-xl"
          style={{
            backgroundColor: 'color-mix(in oklab, var(--estado-aprobada) 16%, transparent)',
            color: 'var(--estado-aprobada)',
          }}
        >
          <WifiOff size={17} strokeWidth={2.3} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] leading-snug font-extrabold text-tinta">
            Guárdala en tu teléfono
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-tinta-suave">
            {modo === 'ios' ? (
              <>
                Toca{' '}
                <Share size={11} className="inline align-[-1px]" aria-label="Compartir" /> y luego{' '}
                <strong className="font-bold text-tinta">Añadir a inicio</strong>. Después abre sin
                internet.
              </>
            ) : (
              <>
                Se abre sin internet y no gasta datos cada vez que consultas tu pensum.
              </>
            )}
          </p>

          {modo === 'dialogo' && (
            <button
              type="button"
              onClick={instalar}
              className="mt-3 flex items-center gap-2 rounded-lg bg-aprobada px-3 py-2 text-[11px] font-bold text-[var(--lienzo)] transition-transform duration-300 ease-out hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[var(--estado-aprobada)] focus-visible:outline-none"
            >
              <Download size={14} />
              Instalar
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={cerrar}
          aria-label="No, gracias"
          title="No, gracias"
          className="-mt-1 -mr-1 grid size-7 shrink-0 place-items-center rounded-lg text-tinta-tenue transition-colors duration-200 hover:text-tinta"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  )
}

export default AvisoInstalar
