import { Moon, Sun, Waypoints } from 'lucide-react'
import { CARRERAS } from '../data/carreras'
import { ultimaCarrera } from '../data/ultimaCarrera'
import { useTema } from '../hooks/useTema'
import AvisoInstalar from './AvisoInstalar'
import PieSelector from './PieSelector'
import TarjetaCarrera from './TarjetaCarrera'

/**
 * Portada y selector. Es la primera impresion del proyecto, asi que las nueve
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
      {/* El ancho crece con la pantalla en vez de quedarse clavado en 1024px:
          en un monitor grande unas tarjetas apretadas al centro dejan medio
          lienzo vacio y se ven de juguete.

          El tope baja de 1600 a 1360 px al pasar a tres columnas: con cuatro
          hacia falta ese ancho para que las tarjetas no salieran pequeñas,
          con tres a 1600 saldrian de 520 px y la silueta, que nunca llena a
          lo ancho, quedaria nadando en hueco. */}
      <div className="mx-auto flex min-h-full max-w-5xl flex-col px-4 py-8 sm:px-6 sm:py-12 xl:max-w-[min(85rem,94vw)] xl:px-10 xl:py-14 2xl:px-16">
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="grid size-10 shrink-0 place-items-center rounded-xl xl:size-12"
              style={{
                backgroundColor: 'color-mix(in oklab, var(--estado-aprobada) 16%, transparent)',
                color: 'var(--estado-aprobada)',
              }}
            >
              <Waypoints size={21} strokeWidth={2.4} />
            </span>
            <div>
              <h1 className="text-xl leading-tight font-extrabold tracking-tight text-tinta sm:text-2xl xl:text-3xl">
                Mapa de Pensum
              </h1>
              <p className="mt-0.5 text-[12px] leading-snug font-medium text-tinta-suave xl:text-sm">
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

        {/* Esta frase estaba a la vista y ocupaba una banda entera que las
            tarjetas aprovechan mejor. No se borra, se esconde: sigue siendo
            la primera orientacion que oye quien entra con lector de pantalla,
            y la siguen leyendo los rastreadores que ejecutan JavaScript. Lo
            que ven los que no lo ejecutan es la meta description, que dice lo
            mismo y no depende de esto. */}
        <p className="sr-only">
          Tu carrera como un mapa: qué materia desbloquea cuál, qué puedes inscribir ahora y
          cuánto te falta. Elige la tuya.
        </p>

        {/* Sin flex-1. Lo tenia para empujar el pie hasta abajo, pero de paso
            la rejilla se quedaba todo el alto sobrante y estiraba sus filas:
            en 1920x1440 la tarjeta media 510 px para 198 px de contenido, o
            sea 156 px muertos. Ahora las tarjetas miden lo que miden y quien
            baja el pie es su propio mt-auto. */}
        {/* Tres columnas y no cuatro: son nueve carreras, asi que 3x3 cierra
            exacto. Con cuatro la ultima fila se quedaba con una tarjeta sola
            y la cuadricula parecia rota por abajo. */}
        <div className="mt-6 mb-10 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:mt-8 xl:mb-12 xl:gap-5 2xl:gap-6">
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

        <PieSelector />
      </div>

      {/* Solo aqui y no dentro de una carrera: quien esta leyendo su mapa
          esta haciendo algo, y no es el momento de interrumpirlo. */}
      <AvisoInstalar />
    </div>
  )
}

export default SelectorCarrera
