import { useState } from 'react'
import { AppWindow, Download, Share, WifiOff, X } from 'lucide-react'
import { useInstalable } from '../hooks/useInstalable'
import Logo from './Logo'

const SALIDA = 260

/* Lo que se le dice a cada quien, que no es lo mismo porque no le resuelve
   lo mismo. En un telefono guardar la aplicacion evita gastar datos cada vez
   que miras el pensum, y eso en un publico que paga por megabyte es toda la
   propuesta. En un PC eso no significa nada: ahi lo que se gana es una
   ventana propia sin barra de navegador. Prometer ahorro de datos a alguien
   sentado en un escritorio es delatar que el mensaje esta escrito para otro. */
const GUION = {
  movil: {
    icono: WifiOff,
    titulo: 'Guárdala en tu teléfono',
    texto: 'Se abre sin internet y no gasta datos cada vez que consultas tu pensum.',
    boton: 'Instalar',
  },
  escritorio: {
    icono: AppWindow,
    titulo: 'Instálala en tu escritorio',
    texto: 'Se abre en su propia ventana, sin barra de navegador, y sigue funcionando sin conexión.',
    boton: 'Instalar',
  },
  ios: {
    icono: Share,
    titulo: 'Guárdala en tu iPhone',
    texto: null, // lleva instrucciones con iconos, se arma aparte
    boton: null,
  },
}

/**
 * Ofrece guardar la aplicacion.
 *
 * El argumento no es "instala nuestra app", que a nadie le importa, sino el
 * que en cada aparato significa algo. Ver GUION.
 *
 * Sale abajo y por encima de todo, se desliza en medio segundo y se puede
 * cerrar para siempre. Un aviso de instalar que reaparece cada visita es
 * peor que no tenerlo.
 */
function AvisoInstalar() {
  const { modo, instalar, descartar, porque, hayEvento, forzado } = useInstalable()
  const [saliendo, setSaliendo] = useState(false)

  if (!modo) return null

  const guion = GUION[modo]
  const Icono = guion.icono

  // Se despide antes de irse, igual que el cambio de ruta
  const cerrar = () => {
    setSaliendo(true)
    setTimeout(descartar, SALIDA)
  }

  return (
    <div
      role="dialog"
      aria-label="Guardar la aplicación"
      className={`fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[24rem] ${
        saliendo ? 'aviso-saliendo' : 'aviso-entrando'
      }`}
    >
      <div className="panel-cristal flex items-start gap-3.5 rounded-2xl p-4">
        {/* La marca, no un icono cualquiera: lo que se ofrece guardar es
            ESTO, y enseñarlo es mas directo que describirlo. Lleva el icono
            de la ventaja encima, en una pastilla pequeña, que es donde un
            icono de estado se lee sin competir con la marca. */}
        <span className="relative grid size-11 shrink-0 place-items-center">
          <span className="marca-caja" aria-hidden="true" />
          <Logo className="relative size-[26px] text-tinta" />
          <span
            aria-hidden="true"
            className="absolute -right-1 -bottom-1 grid size-[18px] place-items-center rounded-full"
            style={{
              backgroundColor: 'var(--estado-aprobada)',
              color: 'var(--lienzo)',
            }}
          >
            <Icono size={10} strokeWidth={2.8} />
          </span>
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] leading-snug font-semibold tracking-[-0.01em] text-tinta">
            {guion.titulo}
          </p>

          <p className="mt-1 text-[11.5px] leading-relaxed text-tinta-suave">
            {modo === 'ios' ? (
              <>
                Toca <Share size={11} className="inline align-[-1px]" aria-label="Compartir" /> y
                luego <strong className="font-semibold text-tinta">Añadir a inicio</strong>. Después
                abre sin internet.
              </>
            ) : (
              guion.texto
            )}
          </p>

          {guion.boton && (
            <button
              type="button"
              onClick={instalar}
              disabled={!hayEvento}
              className="mt-3 flex items-center gap-2 rounded-lg bg-aprobada px-3 py-2 text-[11.5px] font-bold text-[var(--lienzo)] transition-transform duration-300 ease-out hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[var(--estado-aprobada)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
            >
              <Download size={14} />
              {guion.boton}
            </button>
          )}

          {/* Solo con ?instalar=forzar. Dice POR QUE no saldria por su cuenta,
              que es lo unico que se puede hacer cuando el aparato donde falla
              es el telefono de otro y no hay consola donde mirar. */}
          {forzado && porque && (
            <p className="mt-3 border-t border-panel-borde pt-2 font-mono text-[9.5px] leading-relaxed text-tinta-tenue">
              {[
                `evento ${porque.hayEvento ? 'sí' : 'NO'}`,
                `instalada ${porque.instalada ? 'sí' : 'no'}`,
                `descartada ${porque.descartada ? 'sí' : 'no'}${porque.veces ? ` (${porque.veces}×)` : ''}`,
                porque.movil ? 'móvil' : 'escritorio',
                porque.ios ? 'ios' : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              {!porque.hayEvento && !porque.ios && (
                <>
                  <br />
                  Sin evento el botón no puede abrir el diálogo. Chrome no lo da si ya está
                  instalada.
                </>
              )}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={cerrar}
          aria-label="No, gracias"
          title="No, gracias"
          className="relative -mt-1 -mr-1 grid size-7 shrink-0 place-items-center rounded-lg text-tinta-tenue transition-colors duration-200 hover:text-tinta"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  )
}

export default AvisoInstalar
