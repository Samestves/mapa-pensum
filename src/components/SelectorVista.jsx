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
    /* La misma capsula y la misma lente que la barra inferior del telefono:
       son dos formas de ofrecer LAS MISMAS tres vistas y tienen que
       moverse igual. Celdas de igual ancho -grid-cols-3- para que la cuenta
       de la lente sea cierta: un translateX de una celda, sin medir nada. */
    <div
      role="group"
      aria-label="Vista de la carrera"
      className="barra-cristal pointer-events-auto relative hidden h-11 w-[140px] shrink-0 grid-cols-3 rounded-full p-1 md:grid lg:w-[270px]"
    >
      <span
        aria-hidden="true"
        style={{
          width: 'calc((100% - 8px) / 3)',
          transform: `translateX(${indice * 100}%)`,
        }}
        className="lente-cristal pointer-events-none absolute inset-y-1 left-1 rounded-full"
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
            className={`group relative z-10 flex items-center justify-center gap-1.5 rounded-full transition-[color,background-color,transform] duration-200 active:scale-[0.95] ${
              activo ? 'vista-activa' : 'text-tinta-tenue hover:bg-tinta/[0.07] hover:text-tinta'
            }`}
          >
            {/* Al elegirse el icono se rellena y se asienta: el mismo gesto que
                en la barra del telefono. La key reinicia la animacion. */}
            <Ico
              key={activo ? 'activo' : 'reposo'}
              size={18}
              relleno={activo}
              className={`shrink-0 ${activo ? 'icono-asentado' : ''}`}
            />
            <span className="hidden text-[13px] font-medium lg:inline">{etiqueta}</span>
          </button>
        )
      })}
    </div>
  )
}

export default SelectorVista
