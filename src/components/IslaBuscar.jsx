import { IconoBuscar } from './IconosSF'

/* Una tecla dibujada como tecla: cuadrada, con su contorno. Un atajo escrito
   en texto corrido -"Ctrl K"- se lee como una etiqueta mas; con forma de
   tecla se lee como algo que se pulsa, que es el unico motivo de enseñarlo.
   Translucida, no maciza: va sobre cristal y una tecla opaca se despegaba
   de el. */
function Tecla({ children }) {
  return (
    <kbd className="grid h-[18px] min-w-[18px] place-items-center rounded-[5px] border border-tinta/15 bg-tinta/[0.07] px-1 text-[10px] leading-none font-bold text-tinta-tenue">
      {children}
    </kbd>
  )
}

/**
 * El buscador de escritorio: una isla redonda con la lupa, al lado del mando
 * de vistas. Al pasar el raton -o al llegar con el tabulador- se estira hacia
 * la derecha y dice lo que es: "Buscar" y su atajo. Al pulsarla abre la
 * paleta, que es donde se busca de verdad.
 *
 * Va junto a las vistas y no en la esquina porque buscar tambien es una forma
 * de moverse por la carrera, como cambiar de vista; y en reposo es un circulo
 * mas de la fila, sin un campo de texto que pida atencion para algo que se usa
 * de vez en cuando.
 *
 * Se estira POR ENCIMA del hueco, sin ocuparlo: el boton va en absoluto
 * dentro de un hueco fijo del tamaño del circulo. Si creciera dentro de la
 * fila, el grupo del centro se volveria a centrar en cada cuadro y el mando de
 * vistas se correria hacia la izquierda mientras el raton esta encima.
 *
 * En el telefono no esta: alli la paleta no tiene puerta por decision propia,
 * recorrer un pensum se hace con el dedo.
 */
export default function IslaBuscar({ alBuscar }) {
  /* La tecla modificadora cambia con el aparato: ⌘ en un Mac y Ctrl en lo
     demas. Enseñar ⌘ en Windows seria nombrar una tecla que ese teclado no
     tiene, y el atajo dejaria de servir para lo unico que sirve un atajo
     escrito, que es poder pulsarlo. */
  const esMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

  return (
    <div className="relative hidden size-11 shrink-0 md:block">
      <button
        type="button"
        onClick={alBuscar}
        aria-label="Buscar materias y acciones"
        aria-keyshortcuts="Meta+K Control+K"
        className="isla-buscar barra-cristal pointer-events-auto absolute top-0 left-0 z-10 flex h-11 items-center overflow-hidden rounded-full text-tinta-suave hover:text-tinta focus-visible:text-tinta active:scale-[0.97]"
      >
        <span className="grid size-11 shrink-0 place-items-center">
          <IconoBuscar size={17} />
        </span>
        <span className="isla-buscar-texto flex items-center gap-2.5 pr-4 whitespace-nowrap">
          <span className="text-[12.5px] font-medium">Buscar</span>
          <span className="flex items-center gap-1" aria-hidden="true">
            <Tecla>{esMac ? '⌘' : 'Ctrl'}</Tecla>
            <Tecla>K</Tecla>
          </span>
        </span>
      </button>
    </div>
  )
}
