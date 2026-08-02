import { resumenDe } from '../data/carreras'
import MiniMapa from './MiniMapa'

/**
 * Lo que ocupa el sitio del mapa mientras el mapa todavia no esta: porque su
 * pensum va bajando, o porque se esta montando.
 *
 * No es un girador generico. Es la silueta de ESA carrera, que vive en el
 * indice y por tanto ya esta en memoria en el mismo instante del click, sin
 * esperar a ninguna red. Hace dos cosas a la vez: confirma al momento que se
 * entro donde se queria, y deja el mapa apareciendo justo encima de la forma
 * que ya estaba ahi, asi que el relevo no se lee como un salto.
 *
 * El tema se lee del dataset del <html> en vez de recibirse por props: quien
 * pinta esto puede ser App, que no monta useTema. Es decoracion, y si por un
 * fotograma cayera en el color equivocado tampoco pasaria nada.
 */
function EsqueletoMapa({ slug, conNombre = false }) {
  const resumen = resumenDe(slug)
  if (!resumen) return null

  const claro = document.documentElement.dataset.tema === 'claro'
  const color = (claro ? resumen.color?.claro : resumen.color?.oscuro) ?? 'var(--tinta-suave)'

  return (
    <div
      className="grid h-full w-full flex-1 place-items-center p-8"
      role="status"
      aria-live="polite"
    >
      <div className="flex w-full max-w-md flex-col items-center gap-5">
        <MiniMapa
          silueta={resumen.silueta}
          color={color}
          className="esqueleto-mapa h-28 w-full sm:h-40"
        />
        {conNombre ? (
          <span className="text-[11px] font-semibold text-tinta-tenue">
            Abriendo {resumen.nombreCorto}…
          </span>
        ) : (
          <span className="sr-only">Cargando el mapa de {resumen.nombre}</span>
        )}
      </div>
    </div>
  )
}

export default EsqueletoMapa
