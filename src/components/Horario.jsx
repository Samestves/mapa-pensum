import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import RejillaHorario from './RejillaHorario'

/**
 * Mi horario, a pantalla completa.
 *
 * Sale por portal a <body> y no dentro de la vista de la carrera: el mapa
 * cuelga de contenedores con overflow oculto, y desde ahi dentro una capa
 * fija se recortaria contra el primero que tenga transform.
 *
 * La unica cosa que hay ademas de la rejilla es la X. Nada de guardar, ni de
 * editar, ni de vaciar: mientras la semana este vacia no hay nada que hacer
 * con ella, y una barra de botones apagados solo enseña lo que todavia no
 * existe.
 */
function Horario({ alCerrar }) {
  /* Escape cierra. Es lo que espera cualquiera en una capa a pantalla
     completa, y ahorra tener que buscar la X con el raton. */
  useEffect(() => {
    const alTeclear = (e) => e.key === 'Escape' && alCerrar()
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [alCerrar])

  /* No hace falta bloquear el desplazamiento del fondo: la app ya lo tiene
     bloqueado siempre en index.css -"la app nunca scrollea", el mapa hace su
     propio pan y cada vista se desplaza por dentro-. Un candado aqui seria
     codigo que no apaga nada. */

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mi horario"
      className="entrada-horario transicion-tema fixed inset-0 z-50 flex flex-col bg-panel"
    >
      {/* Franja de cierre. Va suelta sobre blanco y no dentro de una barra
          con fondo: cuanto menos pese, mas sitio ocupa la semana. */}
      <div className="flex shrink-0 justify-end px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={alCerrar}
          title="Cerrar el horario"
          aria-label="Cerrar el horario"
          className="grid size-9 place-items-center rounded-full text-tinta-tenue transition-colors hover:bg-panel-suave hover:text-tinta"
        >
          <X size={20} strokeWidth={1.5} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]">
        <RejillaHorario />
      </div>
    </div>,
    document.body,
  )
}

export default Horario
