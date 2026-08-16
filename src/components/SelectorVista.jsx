import { VISTAS, indiceDeVista } from '../data/vistas'

/**
 * Selector de vista de ESCRITORIO: un solo mando de tres posiciones.
 *
 * En el telefono no sale: alli las mismas tres vistas viven en la barra
 * inferior, que es donde llega el pulgar. Se apaga con md:hidden y no con un
 * hook de medida para que el corte lo resuelva CSS en el primer fotograma, y
 * cae exactamente donde useEsTelefono pone el suyo.
 *
 * Antes esto eran dos botones sueltos con dos ideas opuestas dentro de la
 * misma barra: el de mapa/lista enseñaba a DONDE ibas -icono de lista cuando
 * estabas en el mapa- y el de horario enseñaba DONDE estabas. Dos botones
 * identicos que significan cosas contrarias es de las pocas cosas que se
 * aprenden mal una vez y ya no se desaprenden.
 *
 * Con un segmentado solo cabe una lectura: lo iluminado es donde estas. Y el
 * pulgar se desliza de una posicion a otra en vez de encenderse en el destino
 * y apagarse en el origen, porque lo que se mueve se sigue con la vista: al
 * cambiar de vista no hay que volver a buscar donde quedaste.
 *
 * Las tres celdas miden lo mismo -grid-cols-3, no flex-1- y eso es lo que
 * permite colocar el pulgar con un translateX del ancho de una celda, sin
 * medir nada en JS ni refs que se desincronicen al cambiar la ventana.
 * Con flex-1 cada celda se quedaba del ancho de su palabra -"Horario" es mas
 * larga que "Lista"- y el pulgar, que mide un tercio fijo, aterrizaba nueve
 * pixeles corrido en la ultima. Las columnas iguales no son estetica: son la
 * condicion para que la cuenta del pulgar sea cierta.
 */
function SelectorVista({ vista, alCambiar }) {
  const indice = indiceDeVista(vista)

  return (
    <div
      role="group"
      aria-label="Vista de la carrera"
      /* La pista va hundida y el pulgar sale a la altura de la barra: el
         contraste entre los dos es lo que hace que se lea como un mando
         fisico de tres posiciones y no como tres botones pintados. */
      className="transicion-tema relative hidden h-8 shrink-0 grid-cols-3 rounded-xl border border-panel-borde bg-panel-suave p-0.5 sm:h-9 md:grid"
    >
      <span
        aria-hidden="true"
        style={{ transform: `translateX(${indice * 100}%)` }}
        className="pulgar-vista transicion-tema absolute top-0.5 bottom-0.5 left-0.5 w-[calc((100%-0.25rem)/3)] rounded-[0.625rem] bg-panel shadow-sm"
      />

      {VISTAS.map(({ id, icono: Ico, etiqueta, titulo }) => {
        const activo = id === vista
        return (
          <button
            key={id}
            type="button"
            onClick={() => alCambiar(id)}
            title={titulo}
            aria-label={titulo}
            aria-pressed={activo}
            /* z-10 para quedar por encima del pulgar, que es un hermano
               absoluto: si no, el pulgar taparia el icono al llegar. */
            className={`relative z-10 flex items-center justify-center gap-1.5 rounded-[0.625rem] px-2.5 transition-colors duration-200 lg:px-3 ${
              activo ? 'text-tinta' : 'text-tinta-tenue hover:text-tinta-suave'
            }`}
          >
            <Ico size={16} className="shrink-0" />
            <span className="hidden text-[12px] font-bold lg:inline">{etiqueta}</span>
          </button>
        )
      })}
    </div>
  )
}

export default SelectorVista
