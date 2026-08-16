import { Moon, Sun, Waypoints } from 'lucide-react'
import { CARRERAS } from '../data/carreras'
import { ultimaCarrera } from '../data/ultimaCarrera'
import { useTema } from '../hooks/useTema'
import AvisoInstalar from './AvisoInstalar'
import PieSelector from './PieSelector'
import TarjetaCarrera from './TarjetaCarrera'

/**
 * Portada y selector. Es la primera impresion del proyecto y su trabajo es
 * dejar comparar las nueve carreras de un vistazo.
 *
 * Decia que se veian las nueve sin desplazarse en escritorio, y no era
 * verdad: medido a 1440x900, la novena acababa 196 px por debajo del pliegue.
 * Las tarjetas adelgazaron 42 px cada una quitando aire sobrante -no
 * contenido- y ahora hacen falta 970 px de alto en vez de 1096, con lo que en
 * una pantalla de 1080 entran las nueve. En un portatil de 900 se sale la
 * ultima fila, y ahi se queda: cerrar esos setenta pixeles obligaria a
 * encoger la silueta, que es lo unico que distingue una carrera de otra de un
 * vistazo, y entonces la pagina cumpliria la promesa habiendo perdido la
 * razon por la que importaba.
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
        <header className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {/* La marca crece y se redondea mas. Un cuadrado de esquinas
                suaves a 11 px de radio se lee como icono de aplicacion, que
                es lo que es; con el radio anterior parecia un boton mas. */}
            <span
              className="grid size-11 shrink-0 place-items-center rounded-2xl xl:size-12"
              style={{
                backgroundColor: 'color-mix(in oklab, var(--estado-aprobada) 16%, transparent)',
                color: 'var(--estado-aprobada)',
              }}
            >
              <Waypoints size={22} strokeWidth={2.4} />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-[22px] leading-none font-extrabold tracking-tight text-tinta sm:text-2xl xl:text-3xl">
                Mapa de Pensum
              </h1>
              {/* En el telefono la universidad va abreviada, y no es una
                  rebaja: "Universidad de Oriente · Núcleo de Monagas" son
                  cuarenta y un caracteres que a 375 px partian en dos lineas
                  -"...Núcleo de" arriba y "Monagas" solo abajo-, y una
                  segunda linea con una palabra suelta es justo lo que hacia
                  que la cabecera se viera a medio terminar. UDO es ademas
                  como la llama todo el mundo en Monagas, asi que no se pierde
                  nada; el nombre entero vuelve en cuanto hay ancho. */}
              <p className="mt-1 truncate text-[11.5px] leading-none font-medium text-tinta-tenue xl:mt-1.5 xl:text-[13px]">
                <span className="sm:hidden">UDO</span>
                <span className="hidden sm:inline">Universidad de Oriente</span>
                {' · Núcleo de Monagas'}
              </p>
            </div>
          </div>

          {/* Sin borde, como toda la barra de una carrera desde el rework:
              el chrome se retira y lo que manda es la marca. */}
          <button
            type="button"
            onClick={alternarTema}
            title={tema === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            aria-label={tema === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            className="transicion-tema grid size-10 shrink-0 place-items-center rounded-xl text-tinta-suave transition-[background-color,color,transform] duration-150 hover:bg-panel hover:text-tinta active:scale-[0.92]"
          >
            {tema === 'oscuro' ? <Sun size={17} /> : <Moon size={17} />}
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
