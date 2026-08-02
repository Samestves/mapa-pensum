import { useEffect, useState } from 'react'
import { cargarCarrera, existe, resumenDe } from './data/carreras'
import { recordarCarrera } from './data/ultimaCarrera'
import { useRuta } from './hooks/useRuta'
import SelectorCarrera from './components/SelectorCarrera'
import VistaCarrera from './components/VistaCarrera'

/** El <title> y la descripcion cambian por carrera: cada una es su pagina */
function ponerMeta(carrera) {
  document.title = carrera
    ? `Pensum de ${carrera.nombre} — UDO Núcleo de Monagas`
    : 'Mapa de Pensum — UDO Núcleo de Monagas'

  const descripcion = carrera
    ? `Mapa interactivo del pensum de ${carrera.nombre} en la UDO Núcleo de Monagas: ` +
      `${carrera.asignaturas} materias en ${carrera.semestres} semestres, con sus prelaciones.`
    : 'Mapa interactivo de los pensums de la Universidad de Oriente, Núcleo de Monagas. ' +
      'Ocho carreras con sus materias, prelaciones y avance.'

  document.querySelector('meta[name="description"]')?.setAttribute('content', descripcion)
  document
    .querySelector('link[rel="canonical"]')
    ?.setAttribute('href', `https://mapa-pensum.vercel.app/${carrera?.slug ?? ''}`)
}

/**
 * Raiz: decide entre el selector y el mapa de una carrera.
 *
 *   /            selector
 *   /<slug>      mapa
 *
 * El pensum de cada carrera es un chunk aparte y se baja al entrar: nadie
 * paga los 107 nodos de Agronomica por mirar Sistemas.
 */
function App() {
  const { ruta, navegar } = useRuta()
  const slug = existe(ruta) ? ruta : null

  const [carrera, setCarrera] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!slug) {
      setCarrera(null)
      setError(null)
      ponerMeta(null)
      return
    }

    let vigente = true
    setError(null)
    // El resumen del indice basta para el <title> mientras baja el pensum
    ponerMeta(resumenDe(slug))
    recordarCarrera(slug)

    cargarCarrera(slug)
      .then((datos) => vigente && setCarrera(datos))
      .catch((e) => vigente && setError(e.message))

    // Si se cambia de carrera antes de que llegue la anterior, la respuesta
    // vieja no debe pisar a la nueva
    return () => {
      vigente = false
    }
  }, [slug])

  // Una ruta que no existe cae al selector en vez de dar pantalla en blanco
  useEffect(() => {
    if (ruta && !existe(ruta)) window.history.replaceState(null, '', '/')
  }, [ruta])

  if (!slug) return <SelectorCarrera alElegir={navegar} />

  if (error) {
    return (
      <div className="grid h-full place-items-center p-6 text-center">
        <div>
          <p className="text-sm text-tinta-suave">No se pudo cargar el pensum. {error}</p>
          <button
            type="button"
            onClick={() => navegar('')}
            className="mt-3 rounded-lg border border-panel-borde px-3 py-1.5 text-xs font-semibold text-tinta-suave hover:text-tinta"
          >
            Volver a las carreras
          </button>
        </div>
      </div>
    )
  }

  if (!carrera || carrera.slug !== slug) {
    return (
      <div className="grid h-full place-items-center">
        <span className="sr-only">Cargando el pensum</span>
      </div>
    )
  }

  // key por slug: cambiar de carrera remonta la vista en vez de arrastrar el
  // zoom y la seleccion de la anterior
  return <VistaCarrera key={slug} carrera={carrera} alVolver={() => navegar('')} />
}

export default App
