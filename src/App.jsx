import { useEffect, useState } from 'react'
import { cargarCarrera, existe } from './data/carreras'
import VistaCarrera from './components/VistaCarrera'

// Mientras no exista el selector, Sistemas es la portada: es la carrera que
// ya usan los estudiantes y la unica con datos completos.
const POR_DEFECTO = 'ingenieria-de-sistemas'

/**
 * Fase 1: la app carga UNA carrera y la dibuja. El slug sale de ?carrera=,
 * que es un apaño temporal para poder abrir las otras siete antes de que
 * existan las rutas de verdad.
 *
 * En la fase 2 esto pasa a ser el enrutador: / es el selector y
 * /<slug> el mapa. La carga en si ya es la definitiva (un chunk por carrera),
 * asi que ese cambio solo toca de donde sale el slug.
 */
function App() {
  const [slug] = useState(() => {
    const pedida = new URLSearchParams(window.location.search).get('carrera')
    return pedida && existe(pedida) ? pedida : POR_DEFECTO
  })
  const [carrera, setCarrera] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let vigente = true
    setCarrera(null)
    setError(null)
    cargarCarrera(slug)
      .then((datos) => vigente && setCarrera(datos))
      .catch((e) => vigente && setError(e.message))
    // Si el usuario cambia de carrera antes de que llegue la anterior, la
    // respuesta vieja no debe pisar a la nueva
    return () => {
      vigente = false
    }
  }, [slug])

  if (error) {
    return (
      <div className="grid h-full place-items-center p-6 text-center">
        <p className="text-sm text-tinta-suave">
          No se pudo cargar el pensum. {error}
        </p>
      </div>
    )
  }

  if (!carrera) {
    return (
      <div className="grid h-full place-items-center">
        <span className="sr-only">Cargando el pensum</span>
      </div>
    )
  }

  // key por slug: cambiar de carrera remonta la vista en vez de arrastrar
  // el zoom y la seleccion de la anterior
  return <VistaCarrera key={carrera.slug} carrera={carrera} />
}

export default App
