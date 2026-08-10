import RejillaHorario from './RejillaHorario'

/**
 * Mi horario.
 *
 * Es una vista mas de la carrera, como el mapa y la lista: la cabecera de la
 * aplicacion se queda arriba y esto ocupa lo que queda. No es una ventana
 * que sale por encima. Armar un horario es sentarse a hacerlo, no una
 * consulta de paso, y una capa flotante obliga a cerrarla para volver a
 * cualquier otra cosa.
 *
 * El fondo va en el gris suave del tema y no en el blanco de la cabecera: sin
 * ese escalon, la rejilla y la barra se leerian como una sola superficie y no
 * se sabria donde acaba una y empieza la otra.
 *
 * Fase 1: solo la cuadricula vacia.
 */
function Horario() {
  return (
    <div className="transicion-tema flex min-h-0 flex-1 flex-col overflow-hidden bg-panel-suave">
      <div className="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]">
        <RejillaHorario />
      </div>
    </div>
  )
}

export default Horario
