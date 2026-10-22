import { Settings } from 'lucide-react'
import Logo from '../Logo'

/**
 * La marca y, al otro lado, los ajustes de la portada.
 *
 * El nombre es el h1 de la pagina: lo que nombra la cosa va primero. Lo demas
 * que estuvo aqui -el boton del tema, los enlaces- se usa una vez de cada
 * cien visitas y ocupaba el sitio de lo que se viene a hacer; ahora vive en
 * la hoja de ajustes. El boton es un engranaje y no tres puntos: dice que
 * hay dentro antes de tocarlo. Relleno y sin aro, como los botones de la
 * barra de iOS, y del mismo alto que la marca para que los dos extremos de
 * la cabecera caigan en la misma linea.
 */
function Cabecera({ menuAbierto, alAbrirMenu }) {
  return (
    <header className="flex items-center gap-3">
      <span className="relative grid size-11 shrink-0 place-items-center">
        <span className="marca-caja" aria-hidden="true" />
        <Logo animado className="relative size-[27px] text-tinta" />
      </span>
      <div className="min-w-0">
        <h1 className="truncate font-ui text-[19px] leading-tight font-normal tracking-[-0.01em] text-tinta">
          Mapa de Pensum
        </h1>
        <p className="truncate text-[12.5px] leading-snug text-tinta-tenue">
          UDO · Núcleo de Monagas
        </p>
      </div>
      <button
        type="button"
        onClick={alAbrirMenu}
        aria-label="Ajustes y ayuda"
        aria-haspopup="dialog"
        aria-expanded={menuAbierto}
        className="boton-ajustes ml-auto"
      >
        <Settings size={20} strokeWidth={1.75} />
      </button>
    </header>
  )
}

export default Cabecera
