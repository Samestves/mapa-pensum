import { ChevronRight, CircleHelp, Code, Download, Flag, Moon } from 'lucide-react'
import { useInstalable } from '../../hooks/useInstalable'
import { REPO, enlaceReporte } from '../../data/proyecto'

/* Un renglon del menu: su icono en una tecla, lo que hace y, a la derecha,
   el control o la flecha. Es un boton o un enlace segun lleve a otro sitio. */
function Renglon({ icono: Icono, titulo, texto, href, alPulsar, derecha }) {
  const dentro = (
    <>
      <span className="tecla-menu">
        <Icono size={19} strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <b>{titulo}</b>
        <span>{texto}</span>
      </span>
      {derecha ?? <ChevronRight size={18} strokeWidth={1.75} className="text-tinta-tenue" />}
    </>
  )
  return (
    <li>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="renglon-menu">
          {dentro}
        </a>
      ) : (
        <button type="button" onClick={alPulsar} className="renglon-menu">
          {dentro}
        </button>
      )}
    </li>
  )
}

/**
 * Lo que se usa poco y por eso no esta a la vista: el tema, instalar la app,
 * volver a ver la guia y las dos salidas del proyecto. Instalar solo sale
 * donde el navegador deja hacerlo desde un boton.
 */
function MenuPortada({ tema, alternarTema, alVerGuia }) {
  const { modo, instalar, hayEvento } = useInstalable()
  const oscuro = tema === 'oscuro'

  return (
    <div className="px-5 pb-5">
      <ul className="menu-portada">
        <Renglon
          icono={Moon}
          titulo="Tema oscuro"
          texto="Cambia también el mapa y la lista"
          alPulsar={alternarTema}
          derecha={<span className="interruptor" data-encendido={oscuro} aria-hidden="true" />}
        />
        {modo && modo !== 'ios' && hayEvento && (
          <Renglon
            icono={Download}
            titulo="Instalar la app"
            texto="Se abre sin internet y no gasta datos"
            alPulsar={instalar}
          />
        )}
        <Renglon
          icono={CircleHelp}
          titulo="Ver la guía otra vez"
          texto="Cómo funciona, en tres pasos"
          alPulsar={alVerGuia}
        />
        <Renglon
          icono={Flag}
          titulo="Reportar un error"
          texto="Una materia o una prelación mal puesta"
          href={enlaceReporte()}
        />
        <Renglon icono={Code} titulo="Código abierto" texto="Revísalo en GitHub" href={REPO} />
      </ul>
      <p className="mt-3 px-1 text-[12.5px] leading-relaxed text-tinta-tenue">
        Datos tomados de los pensums de la DACE del Núcleo de Monagas. Pueden tener errores:
        confirma con control de estudios antes de inscribir.
      </p>
    </div>
  )
}

export default MenuPortada
