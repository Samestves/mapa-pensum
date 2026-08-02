import { useRef, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import MiniMapa from './MiniMapa'

// Grados de inclinacion en el borde de la tarjeta. Mas que esto se lee como
// truco; menos, no se nota.
const GIRO = 7

/**
 * Tarjeta de una carrera en el selector.
 *
 * El 3D es solo de escritorio y solo con puntero fino: en un telefono no hay
 * cursor que seguir, cuesta bateria y no aporta. Se apaga tambien con
 * prefers-reduced-motion, y sin el la tarjeta queda perfectamente usable.
 *
 * La miniatura lleva view-transition-name con el slug, y el mapa de destino
 * pone el mismo nombre en su lienzo: eso es lo que hace que al entrar la
 * tarjeta parezca desplegarse hasta convertirse en el mapa.
 */
function TarjetaCarrera({ carrera, tema, esUltima, alElegir }) {
  const caja = useRef(null)
  const [giro, setGiro] = useState(null)

  const color = (tema === 'oscuro' ? carrera.color?.oscuro : carrera.color?.claro) ?? 'var(--tinta-suave)'

  const seguirPuntero = (e) => {
    // Solo raton: el dedo no tiene hover y el giro quedaria pegado
    if (e.pointerType !== 'mouse' || !caja.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const r = caja.current.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    setGiro({ x: -py * GIRO * 2, y: px * GIRO * 2, luzX: (px + 0.5) * 100, luzY: (py + 0.5) * 100 })
  }

  return (
    <button
      ref={caja}
      type="button"
      onPointerMove={seguirPuntero}
      onPointerLeave={() => setGiro(null)}
      onClick={() => alElegir(carrera.slug)}
      className="tarjeta-carrera group transicion-tema relative block w-full rounded-2xl border border-panel-borde bg-panel p-4 text-left focus-visible:ring-2 focus-visible:ring-[var(--acento)] focus-visible:outline-none sm:p-5"
      style={{
        '--acento': color,
        transform: giro
          ? `perspective(900px) rotateX(${giro.x}deg) rotateY(${giro.y}deg) scale(1.015)`
          : undefined,
      }}
    >
      {/* Brillo que se desplaza con el angulo. aria-hidden: es decoracion */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: giro
            ? `radial-gradient(60% 60% at ${giro.luzX}% ${giro.luzY}%, color-mix(in oklab, ${color} 16%, transparent) 0%, transparent 70%)`
            : `radial-gradient(60% 60% at 50% 0%, color-mix(in oklab, ${color} 10%, transparent) 0%, transparent 70%)`,
        }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          {esUltima && (
            <span
              className="mb-1.5 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase"
              style={{
                color,
                backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)`,
              }}
            >
              Continuar
            </span>
          )}
          <h2 className="text-[15px] leading-tight font-extrabold text-tinta">
            {carrera.nombreCorto}
          </h2>
          <p className="mt-0.5 font-mono text-[10px] text-tinta-tenue">
            {carrera.asignaturas} materias · {carrera.semestres} semestres
          </p>
        </div>
        <ArrowUpRight
          size={16}
          className="shrink-0 text-tinta-tenue transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          style={{ color: giro ? color : undefined }}
        />
      </div>

      {/* La miniatura flota sobre el fondo de la tarjeta: es lo que le da
          volumen sin recurrir a sombras falsas. */}
      <div
        className="relative mt-4 h-16"
        style={{ transform: giro ? 'translateZ(28px)' : undefined }}
      >
        <MiniMapa
          silueta={carrera.silueta}
          color={color}
          className="h-full w-full"
          // Nombre compartido con el lienzo del mapa: el navegador interpola
          // uno en el otro al navegar
          style={{ viewTransitionName: `mapa-${carrera.slug}` }}
        />
      </div>

      <p className="relative mt-3 truncate text-[10px] text-tinta-tenue">{carrera.nombre}</p>
    </button>
  )
}

export default TarjetaCarrera
