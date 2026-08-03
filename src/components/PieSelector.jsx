import { ArrowUpRight, Flag } from 'lucide-react'
import { REPO, enlaceReporte } from '../data/proyecto'

/* lucide dejo de traer marcas en la v1, asi que el pulpo va a mano. Es la
   marca oficial y aqui solo identifica a donde lleva el enlace. */
function IconoGitHub({ size = 14, className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2 0-.3-.5-1.5.2-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.9 18.3 5.2 18.3 5.2c.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1.1.9 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3Z" />
    </svg>
  )
}

/**
 * Un enlace del pie. Todos se mueven igual que el resto de la app: 300 ms y
 * el mismo medio pixel de desplazamiento que la flecha de las tarjetas.
 *
 * No lleva .transicion-tema: esa clase declara su propia transition y pisaria
 * a esta. Las propiedades del cambio de tema van incluidas aqui.
 */
function Enlace({ href, icono: Icono, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group/enlace inline-flex items-center gap-2 rounded-xl border border-panel-borde bg-panel px-3.5 py-2.5 text-xs font-bold whitespace-nowrap text-tinta-suave transition-[transform,border-color,background-color,color,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:border-tinta-tenue hover:bg-panel-suave hover:text-tinta hover:shadow-[0_10px_28px_-16px_rgba(0,0,0,0.55)] focus-visible:ring-2 focus-visible:ring-[var(--estado-aprobada)] focus-visible:outline-none"
    >
      <Icono
        size={14}
        className="shrink-0 text-tinta-tenue transition-[transform,color] duration-300 ease-out group-hover/enlace:scale-110 group-hover/enlace:text-tinta"
      />
      {children}
      <ArrowUpRight
        size={13}
        className="shrink-0 text-tinta-tenue transition-transform duration-300 ease-out group-hover/enlace:-translate-y-0.5 group-hover/enlace:translate-x-0.5"
      />
    </a>
  )
}

/**
 * Pie del selector.
 *
 * El aviso de la fuente y los dos enlaces van juntos porque hablan de lo
 * mismo: de donde salen estos datos y que hacer si uno esta mal. El
 * repositorio no se anuncia como obra propia sino como la forma de
 * comprobarlo, que es lo que le da derecho a estar aqui.
 *
 * No se pone "actualizado en tal fecha" porque el scrape de la DACE no trae
 * fecha, y una fecha inventada en el sitio que promete honestidad con los
 * datos seria justo lo contrario.
 */
function PieSelector() {
  return (
    <footer className="mt-10 border-t border-panel-borde pt-5 xl:mt-12 xl:pt-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
        <p className="max-w-2xl text-[11px] leading-relaxed text-tinta-suave xl:text-xs">
          Datos tomados de los pensums publicados por la{' '}
          <a
            href="http://dacemonagas.udo.edu.ve"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-tinta underline decoration-panel-borde underline-offset-2 transition-colors duration-200 hover:decoration-current"
          >
            DACE del Núcleo de Monagas
          </a>
          . Pueden contener errores o estar desactualizados:{' '}
          <strong className="font-bold text-tinta">confirma con control de estudios</strong>{' '}
          antes de tomar cualquier decisión.
        </p>

        {/* Los enlaces se ajustan a su texto en vez de repartirse el ancho:
            estirados a media pantalla parecerian botones de formulario, y
            esto es un pie. Cada uno en una linea, sin subtitulo: a 10px el
            subtitulo tenia el mismo problema de legibilidad que acabamos de
            arreglar en las tarjetas. */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Enlace href={enlaceReporte()} icono={Flag}>
            Reportar un error
          </Enlace>
          <Enlace href={REPO} icono={IconoGitHub}>
            Código abierto
          </Enlace>
        </div>
      </div>
    </footer>
  )
}

export default PieSelector
