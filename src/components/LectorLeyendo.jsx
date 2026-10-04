import { X } from 'lucide-react'

/**
 * El lector mientras lee: la imagen es la hoja.
 *
 * Durante esos segundos no hay nada que decidir ni que tocar, asi que se
 * enseña lo unico que importa -la foto que se subio, para comprobar de un
 * vistazo que es la buena- y una linea que la recorre. El texto va debajo a
 * la izquierda, sin caja.
 *
 * La foto va a todo el ancho y con su proporcion, y la hoja mide lo que mida
 * ella: una captura apaisada da una hoja baja; una foto en vertical se corta
 * a media pantalla.
 *
 * El texto NO se monta sobre la foto. Antes lo hacia, con un velo que la
 * fundia con la hoja, y ese velo se comia la mitad de abajo de una captura
 * apaisada -que en un telefono mide unos 180 px- y con ella la linea: parecia
 * que el barrido empezaba a media foto. La linea tiene que verse recorrerla
 * entera, asi que la foto acaba donde acaba y el texto empieza despues.
 *
 * Antes de que la imagen este lista -reducirla tarda un instante en un
 * telefono modesto- su hueco ya esta ahi, para que la hoja no de un salto
 * cuando llegue.
 */
function LectorLeyendo({ imagen, alCancelar }) {
  return (
    <div className="lector-cara relative">
      <div className="lector-foto relative max-h-[52dvh] min-h-[168px] overflow-hidden bg-panel-suave md:max-h-[46vh]">
        {imagen && (
          <>
            <img src={imagen.vistaPrevia} alt="El horario que subiste" className="block w-full" />
            <span aria-hidden="true" className="lector-barrido" />
          </>
        )}
      </div>

      <button
        type="button"
        onClick={alCancelar}
        aria-label="Cerrar"
        className="absolute top-3 right-3 z-10 grid size-8 place-items-center rounded-full bg-[color-mix(in_oklab,var(--panel)_72%,transparent)] text-tinta transition-colors hover:bg-panel"
      >
        <X size={16} strokeWidth={1.5} />
      </button>

      <div
        role="status"
        className="lector-lineas flex flex-col items-start gap-2.5 px-5 pt-7 pb-5 sm:px-7 sm:pb-6"
      >
        <p className="font-ui text-[10.5px] font-medium tracking-[0.26em] text-tinta-tenue uppercase">
          Leyendo
        </p>
        <h2 className="font-ui text-[28px] leading-[1.12] font-light tracking-[-0.012em] text-tinta">
          {imagen ? 'Buscando tus clases' : 'Preparando la imagen'}
        </h2>
        <p className="text-[13px] leading-normal text-tinta-suave">Suele tardar unos segundos.</p>
        <button
          type="button"
          onClick={alCancelar}
          className="mt-1 py-1.5 text-[13.5px] font-medium text-tinta-tenue transition-colors hover:text-tinta"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

export default LectorLeyendo
