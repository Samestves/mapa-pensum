import { Component } from 'react'
import { RotateCcw, TriangleAlert } from 'lucide-react'

/**
 * Corta la caida cuando algo revienta al pintar.
 *
 * Sin esto, un error en CUALQUIER componente desmonta el arbol entero y deja
 * la pantalla en blanco. No es teoria: se comprobo simulando los datos de
 * sitio bloqueados, con el tema leyendo localStorage sin proteger. El HTML
 * pasaba de 66.283 caracteres a 0. Aquella causa concreta se arreglo -ahora
 * todo pasa por data/almacen-, pero el mecanismo seguia intacto: cualquier
 * error futuro daba el mismo resultado, y el estudiante no tenia ni un boton
 * que pulsar.
 *
 * Tiene que ser una clase. Es lo unico que React no ha llevado a hooks, ni en
 * la 19: getDerivedStateFromError y componentDidCatch no tienen equivalente.
 * Es la unica clase del proyecto y esta es la razon.
 *
 * OJO con lo que NO atrapa, para no confiarse: solo coge errores lanzados
 * durante el render, en los efectos y en los constructores. Lo que falle
 * dentro de un manejador de eventos -pulsar un boton- o dentro de una
 * promesa no pasa por aqui, porque eso no rompe el pintado. Aquellos siguen
 * necesitando su try/catch donde toca, como el de cargar el pensum en App.
 *
 * No se reinicia solo, y esa es la parte que se olvida: una vez que atrapa,
 * se queda enseñando el fallo para siempre aunque el problema fuera de una
 * carrera concreta. Se resuelve desde fuera con una `key` que cambie -la
 * ruta-, porque cambiar la key monta una instancia nueva. Asi volver al
 * selector limpia el estado sin que este componente tenga que saber nada de
 * rutas.
 */
class LimiteDeError extends Component {
  state = { fallo: null }

  static getDerivedStateFromError(fallo) {
    return { fallo }
  }

  componentDidCatch(fallo, info) {
    /* A la consola y nada mas. El proyecto no manda errores a ningun sitio y
       montar esa tuberia por un fallo que aun no se ha visto seria construir
       para un problema que no existe. Cuando haga falta, este es el sitio.
       Mientras tanto, la pila queda a mano de quien abra las herramientas. */
    console.error('[mapa-pensum] fallo al pintar', fallo, info?.componentStack)
  }

  render() {
    const { fallo } = this.state
    if (!fallo) return this.props.children

    const { alReintentar, etiquetaReintento = 'Reintentar' } = this.props

    return (
      <div className="grid h-full place-items-center p-6 text-center">
        <div className="max-w-sm">
          <span className="mx-auto grid size-11 place-items-center rounded-xl bg-cursando/10 text-cursando">
            <TriangleAlert size={20} />
          </span>

          {/* Se dice que fallo la aplicacion, no el pensum. Un estudiante que
              lee "no se pudo cargar" se queda pensando que sus datos estan
              mal, y no lo estan: lo que se rompio es esto. */}
          <h1 className="mt-4 text-[15px] font-extrabold text-tinta">
            Algo se rompió por aquí
          </h1>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-tinta-suave">
            Es un fallo de la aplicación, no de tu avance: lo que tengas marcado sigue guardado.
          </p>

          {alReintentar && (
            <button
              type="button"
              onClick={alReintentar}
              className="transicion-tema mt-4 inline-flex items-center gap-2 rounded-lg border border-panel-borde px-3.5 py-2 text-[12px] font-bold text-tinta-suave transition-colors hover:text-tinta"
            >
              <RotateCcw size={14} />
              {etiquetaReintento}
            </button>
          )}

          {/* El detalle tecnico va plegado y no escondido. Para el estudiante
              es ruido, pero es EXACTAMENTE lo que hace falta pegar en el
              reporte de error que el pie de la portada ya invita a abrir. */}
          <details className="mt-5 text-left">
            <summary className="cursor-pointer list-none text-[11px] font-semibold text-tinta-tenue hover:text-tinta-suave">
              Detalle técnico
            </summary>
            <pre className="seleccionable mt-2 max-h-40 overflow-auto rounded-lg border border-panel-borde bg-panel-suave p-2.5 text-[10.5px] leading-relaxed whitespace-pre-wrap text-tinta-tenue">
              {String(fallo?.stack ?? fallo)}
            </pre>
          </details>
        </div>
      </div>
    )
  }
}

export default LimiteDeError
