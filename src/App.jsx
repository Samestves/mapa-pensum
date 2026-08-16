import { useEffect, useState } from 'react'
import { cargarCarrera, carreraEnCache, existe, resumenDe } from './data/carreras'
import { recordarCarrera } from './data/ultimaCarrera'
import { ponerMeta } from './data/seo'
import { useRuta } from './hooks/useRuta'
import EsqueletoMapa from './components/EsqueletoMapa'
import LimiteDeError from './components/LimiteDeError'
import SelectorCarrera from './components/SelectorCarrera'
import VistaCarrera from './components/VistaCarrera'

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
  const { ruta, saliendo, navegar } = useRuta()
  const slug = existe(ruta) ? ruta : null

  const [carrera, setCarrera] = useState(() => (slug ? carreraEnCache(slug) : null))
  const [error, setError] = useState(null)

  // La cache se consulta DURANTE el render, no en un efecto. Si se dejara en
  // el efecto, el primer render tras cambiar de ruta seguiria teniendo la
  // carrera vieja y se colaria un fotograma de pantalla de carga aunque el
  // pensum ya estuviera bajado desde el hover.
  const lista = carrera?.slug === slug ? carrera : slug ? carreraEnCache(slug) : null

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

    const listo = carreraEnCache(slug)
    if (listo) {
      setCarrera(listo)
      return
    }

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

  // Se ve poco: la tarjeta empieza a bajar el pensum al pasar el puntero por
  // encima. Pero con el dedo no hay hover, y entrando directo por la URL con
  // la red lenta puede durar. Lo que se enseña entonces no es un girador sino
  // la silueta de esta carrera, que viene del indice y por tanto ya esta en
  // memoria: se ve al instante que se entro donde se queria.
  const contenido = !slug ? (
    <SelectorCarrera alElegir={navegar} />
  ) : error ? (
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
  ) : !lista ? (
    <div className="grid h-full place-items-center">
      <EsqueletoMapa slug={slug} conNombre />
    </div>
  ) : (
    // key por slug: cambiar de carrera remonta la vista en vez de arrastrar
    // el zoom y la seleccion de la anterior
    <VistaCarrera key={slug} carrera={lista} alVolver={() => navegar('')} />
  )

  // Las dos fases del cambio de ruta cuelgan de aqui y no de cada vista, que
  // es lo que permite que la que se va y la que llega se animen igual sin que
  // ninguna de las dos sepa que existe la otra.
  //
  // La key lleva tambien la fase, no solo la ruta: una animacion CSS no se
  // reinicia sola si el elemento sobrevive al cambio, y entrar con la red
  // lenta pasa por el esqueleto antes que por el mapa sin cambiar de ruta.
  // Sin la fase, ese segundo relevo apareceria de golpe.
  const fase = !slug ? 'selector' : error ? 'error' : !lista ? 'esqueleto' : 'mapa'

  return (
    <div
      key={`${ruta}:${fase}`}
      className={`h-full ${saliendo ? 'salida-vista' : 'entrada-vista'}`}
    >
      {/* La key es la ruta y no algo fijo: un limite que ya atrapo se queda
          enseñando el fallo para siempre, asi que cambiar de carrera tiene
          que montar uno nuevo. Con esto, volver al selector -que es lo que
          hace el boton- limpia el estado sin que el limite sepa de rutas.
          Va aqui dentro y no envolviendo al div para no romper la animacion
          de entrada y salida, que depende de esa otra key. */}
      <LimiteDeError
        key={ruta}
        alReintentar={() => navegar('')}
        etiquetaReintento="Volver a las carreras"
      >
        {contenido}
      </LimiteDeError>
    </div>
  )
}

export default App
