import Popover from './Popover'

const ANCHO = 178

/**
 * El menu de una clase ya puesta: editar, duplicar, eliminar.
 *
 * Existe para que los tres puntos hagan algo distinto que el resto del
 * bloque. Editar es una de tres cosas que se le pueden hacer a una clase, y
 * de las tres la que menos se usa: lo normal es duplicarla al otro dia que se
 * dicta, o quitarla. Enseñar las tres y dejar elegir cuesta un click y evita
 * abrir un formulario entero para acabar borrando.
 *
 * Cada opcion se cierra sola al ejecutarse: un menu que sigue abierto despues
 * de pulsar obliga a un segundo gesto para nada.
 */
function MenuClase({ ancla, opciones, alCerrar }) {
  return (
    <Popover
      ancla={ancla}
      ancho={ANCHO}
      etiqueta="Acciones de la clase"
      rol="menu"
      alCerrar={alCerrar}
      claseContenido="flex flex-col p-1.5"
    >
      <>
        {opciones.map(({ id, etiqueta, icono: Icono, peligro, alPulsar }) => (
          <button
            key={id}
            type="button"
            role="menuitem"
            onClick={() => {
              alPulsar()
              alCerrar()
            }}
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-semibold transition-colors hover:bg-panel-suave ${
              peligro ? 'text-[var(--estado-rojo)]' : 'text-tinta'
            }`}
          >
            <Icono size={14} className="shrink-0 opacity-70" />
            {etiqueta}
          </button>
        ))}
      </>
    </Popover>
  )
}

export default MenuClase
