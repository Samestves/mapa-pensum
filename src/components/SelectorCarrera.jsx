import { Moon, Sun, Waypoints } from 'lucide-react'
import { CARRERAS } from '../data/carreras'
import { ultimaCarrera } from '../data/ultimaCarrera'
import { useTema } from '../hooks/useTema'
import TarjetaCarrera from './TarjetaCarrera'

/**
 * Portada y selector. Es la primera impresion del proyecto, asi que las ocho
 * carreras se ven a la vez sin scroll en escritorio.
 *
 * La carrera vista por ultima vez se marca con "Continuar" en vez de saltar
 * directo a ella: redirigir automaticamente dejaria el selector inalcanzable
 * para quien ya entro una vez, y esta pantalla es tambien la que tiene que
 * posicionar en buscadores.
 */
function SelectorCarrera({ alElegir }) {
  const { tema, alternarTema } = useTema()
  const ultima = ultimaCarrera()

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex min-h-full max-w-5xl flex-col px-4 py-8 sm:px-6 sm:py-12">
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="grid size-10 shrink-0 place-items-center rounded-xl"
              style={{
                backgroundColor: 'color-mix(in oklab, var(--estado-aprobada) 16%, transparent)',
                color: 'var(--estado-aprobada)',
              }}
            >
              <Waypoints size={21} strokeWidth={2.4} />
            </span>
            <div>
              <h1 className="text-xl leading-tight font-extrabold tracking-tight text-tinta sm:text-2xl">
                Mapa de Pensum
              </h1>
              <p className="text-[12px] text-tinta-suave">
                Universidad de Oriente · Núcleo de Monagas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={alternarTema}
            title={tema === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            aria-label={tema === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            className="transicion-tema grid size-9 shrink-0 place-items-center rounded-lg border border-panel-borde text-tinta-suave hover:text-tinta"
          >
            {tema === 'oscuro' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </header>

        <p className="mt-6 max-w-xl text-[13px] leading-relaxed text-tinta-suave sm:mt-8">
          Tu carrera como un mapa: qué materia desbloquea cuál, qué puedes inscribir ahora y
          cuánto te falta. Elige la tuya.
        </p>

        <div className="mt-6 grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {CARRERAS.map((carrera) => (
            <TarjetaCarrera
              key={carrera.slug}
              carrera={carrera}
              tema={tema}
              esUltima={carrera.slug === ultima}
              alElegir={alElegir}
            />
          ))}
        </div>

        <footer className="mt-10 border-t border-panel-borde pt-4 text-[11px] leading-relaxed text-tinta-tenue">
          Datos tomados de los pensums publicados por la{' '}
          <a
            href="http://dacemonagas.udo.edu.ve"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-tinta-suave"
          >
            DACE del Núcleo de Monagas
          </a>
          . Pueden contener errores u estar desactualizados:{' '}
          <strong className="font-semibold text-tinta-suave">
            confirma siempre con control de estudios
          </strong>{' '}
          antes de tomar una decisión.
        </footer>
      </div>
    </div>
  )
}

export default SelectorCarrera
