import { GraduationCap, Moon, Sun } from 'lucide-react'
import { CARRERAS } from '../data/carreras'
import { ultimaCarrera } from '../data/ultimaCarrera'
import { useTema } from '../hooks/useTema'
import AvisoInstalar from './AvisoInstalar'
import Logo from './Logo'
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
    <div className="relative h-full overflow-y-auto">
      {/* Veladura de color arriba. Va aqui fuera y no dentro del contenedor
          centrado para que cruce todo el ancho de la pantalla: una luz que
          se corta en el margen del contenido se ve como un rectangulo. */}
      <div className="ambiente-portada" aria-hidden="true">
        <span className="velo-oscuro" />
        <span className="velo-claro" />
      </div>
      {/* El ancho crece con la pantalla en vez de quedarse clavado en 1024px:
          en un monitor grande unas tarjetas apretadas al centro dejan medio
          lienzo vacio y se ven de juguete.

          El tope baja de 1600 a 1360 px al pasar a tres columnas: con cuatro
          hacia falta ese ancho para que las tarjetas no salieran pequeñas,
          con tres a 1600 saldrian de 520 px y la silueta, que nunca llena a
          lo ancho, quedaria nadando en hueco.

          En escritorio el bloque entero -cabecera, tarjetas y pie- se centra
          en alto. Iba todo arriba y el alto que sobraba quedaba debajo del
          pie, que en un monitor de 1080 son cien pixeles vacios solo por
          abajo: la pagina parecia cortada y no compuesta. Si no cabe, el
          centrado no hace nada y se desplaza como siempre. */}
      <div className="portada mx-auto flex min-h-full max-w-5xl flex-col px-4 py-8 sm:px-6 sm:py-12 lg:justify-center xl:max-w-[min(85rem,94vw)] xl:px-10 xl:py-14 2xl:px-16">
        {/* Cabecera.

            Sin filete divisorio y sin contrapesos a la derecha. Lo unico que
            ordena esto es la jerarquia de tamaño: el titulo manda, la linea
            de universidad acompaña, y la marca sujeta las dos. Todo lo demas
            que se probo aqui -un pelo difuminado, un contador de carreras en
            versalitas- eran cosas puestas para llenar el ancho, y el ancho no
            hay que llenarlo.

            El orden es titulo primero y universidad debajo. Estuvo al reves,
            con la universidad de cejilla encima en mono y versalitas anchas,
            y se leia como una ficha tecnica: lo primero que decia la pagina
            era donde queda la universidad, no que esto es un mapa de pensum.
            Lo que nombra la cosa va primero. */}
        <header className="relative flex items-center justify-between gap-6">
          <div className="flex min-w-0 items-center gap-3 xl:gap-3.5">
            {/* La marca vuelve a tener caja, y es a proposito.

                Estuvo suelta sobre el lienzo y quedaba flotando en el margen:
                sin nada que la sujete, una estrella de puntas finas no tiene
                borde con el que alinearse y se lee como despegada del titulo.
                La caja le da ese borde.

                No es la caja de antes -un cuadrado con verde plano al 16 %,
                que es color de relleno y no material-, sino uno cuyo contorno
                es un degradado de un pixel: se enciende por una esquina y se
                apaga por el resto, asi que nunca hay cuatro lados a la vez.
                Ver .marca-caja.

                En pantalla grande la caja NO crece. Es un apoyo, y un apoyo
                que se hace mas grande que lo que sujeta deja de apoyar. */}
            <span className="relative grid size-12 shrink-0 place-items-center sm:size-14">
              <span className="marca-caja" aria-hidden="true" />
              <Logo
                animado
                className="transicion-tema relative size-[30px] text-tinta sm:size-[35px]"
              />
            </span>
            <div className="min-w-0">
              {/* Semibold y no extrabold. Un titulo en extrabold a 22 px
                  grita para que se le note un tamaño que no tiene; a 40 el
                  tamaño ya esta, y lo que hace falta entonces no es peso sino
                  cerrar el tracking. Inter aguanta -0,03em sin que las letras
                  se toquen, que es justo para lo que se cambio de fuente. */}
              <h1 className="font-display truncate text-[26px] leading-[1.06] font-semibold tracking-[-0.025em] text-tinta sm:text-[30px] xl:text-[28px]">
                Mapa de Pensum
              </h1>
              {/* En caja baja y peso normal. Estuvo en versalitas anchas y
                  chillaba mas que el titulo teniendo un tercio de su tamaño:
                  el espaciado ancho estira una linea corta hasta que compite
                  por el ancho, y entonces las dos cosas piden el mismo turno.

                  En el telefono la universidad va abreviada, y no es una
                  rebaja: "Universidad de Oriente · Núcleo de Monagas" son
                  cuarenta y un caracteres que a 375 px partian en dos lineas
                  -"...Núcleo de" arriba y "Monagas" solo abajo-, y una
                  segunda linea con una palabra suelta es justo lo que hacia
                  que la cabecera se viera a medio terminar. UDO es ademas
                  como la llama todo el mundo en Monagas. */}
              <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[12.5px] leading-none font-medium text-tinta-tenue sm:text-[13px] xl:mt-1.5 xl:text-[12.5px]">
                {/* Un birrete diminuto delante. La linea estaba sola y se
                    leia como un pie de foto; con una marca delante se lee
                    como una credencial, que es lo que es.

                    Va del tamaño de la altura-x de la letra que acompaña y no
                    del cuerpo entero: un icono a la altura de las mayusculas
                    se ve siempre mas grande que el texto y acaba pareciendo
                    un boton. Y lleva el punto del separador como divisoria
                    -el que ya estaba entre universidad y nucleo-, en vez de
                    inventar una linea nueva. */}
                <GraduationCap
                  size={13}
                  strokeWidth={2.1}
                  className="shrink-0 opacity-80"
                  aria-hidden="true"
                />
                <span className="truncate">
                  <span className="sm:hidden">UDO</span>
                  <span className="hidden sm:inline">Universidad de Oriente</span>
                  {' · Núcleo de Monagas'}
                </span>
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
            sea 156 px muertos. Ahora las tarjetas miden lo que miden, y el
            alto sobrante lo reparte el centrado de la portada. */}
        {/* Tres columnas y no cuatro: son nueve carreras, asi que 3x3 cierra
            exacto. Con cuatro la ultima fila se quedaba con una tarjeta sola
            y la cuadricula parecia rota por abajo. */}
        <div className="rejilla-carreras mt-6 mb-10 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:mt-12 xl:mb-12 xl:gap-5 2xl:gap-6">
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
