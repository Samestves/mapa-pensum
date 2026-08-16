import { Suspense, useEffect, useRef, useState } from 'react'
import { cargarCarrera, carreraEnCache, existe, resumenDe } from './data/carreras'
import { recordarCarrera } from './data/ultimaCarrera'
import { ponerMeta } from './data/seo'
import { useRuta } from './hooks/useRuta'
import EsqueletoMapa from './components/EsqueletoMapa'
import LimiteDeError from './components/LimiteDeError'
import SelectorCarrera from './components/SelectorCarrera'

import { VistaCarreraDiferida } from './components/vistaDiferida'

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
    /* El fallback de Suspense es EXACTAMENTE el mismo que el de esperar los
       datos, y eso no es pereza: al estudiante le da igual si lo que falta
       por llegar es el pensum o el codigo que lo dibuja. Dos pantallas de
       espera distintas para la misma espera solo se notarian como un
       parpadeo entre una y otra. */
    <Suspense
      fallback={
        <div className="grid h-full place-items-center">
          <EsqueletoMapa slug={slug} conNombre />
        </div>
      }
    >
      {/* key por slug: cambiar de carrera remonta la vista en vez de
          arrastrar el zoom y la seleccion de la anterior */}
      <VistaCarreraDiferida key={slug} carrera={lista} alVolver={() => navegar('')} />
    </Suspense>
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

  /* La entrada se anima SOLO al cambiar de ruta, y esto es un arreglo, no un
     ajuste fino.

     entrar-vista empieza en opacidad 0, y esta pensada para ir DETRAS de una
     despedida: la vista actual se va, la nueva llega. En un cambio de ruta eso
     es un fundido correcto.

     El problema era que tambien corria en la primera pintada, donde no hay
     nada de lo que despedirse. Lo que hay es la cabecera que llega escrita en
     el HTML: React la sustituia por un contenedor invisible que tardaba 420 ms
     en aparecer, y durante ese rato lo unico a la vista era el fondo. En tema
     oscuro, negro. Ese era el destello de entrada -y no se arreglaba
     colocando mejor lo prerenderizado, porque el hueco lo dejaba la animacion,
     no la posicion-.

     Al navegar SI se mantiene, y ahi es correcta: la vista anterior acaba de
     irse con salida-vista, o sea que en ese momento detras no hay nada que
     tapar. El fundido cruza por el fondo a proposito.

     Se probo a decidirlo comparando con la ruta anterior, y salio peor: el
     valor cambiaba en el render siguiente y le arrancaba la clase a la
     animacion a los cuatro milisegundos de empezar, con lo que el cambio de
     ruta se quedaba sin su fundido. Una marca de "ya se pinto una vez" no
     tiene ese problema porque no vuelve a cambiar nunca. */
  const yaPinto = useRef(false)
  useEffect(() => {
    yaPinto.current = true
  }, [])

  return (
    <div
      key={`${ruta}:${fase}`}
      className={`h-full ${
        saliendo ? 'salida-vista' : yaPinto.current ? 'entrada-vista' : ''
      }`}
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
