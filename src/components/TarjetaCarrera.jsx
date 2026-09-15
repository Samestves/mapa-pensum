import { useRef, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { precargarCarrera } from '../data/carreras'
import { precargarVista } from './vistaDiferida'
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
 * Sobre la carga: el pensum se empieza a bajar al pasar por encima, decimas
 * de segundo antes del click, asi que casi siempre ya esta en memoria cuando
 * el usuario suelta. Pero el click NO lo espera. Hubo una version que si lo
 * esperaba, y con el dedo (que no tiene hover) o con la red lenta el boton se
 * quedaba pulsado sin que pasara nada visible, que es exactamente lo que se
 * lee como "se colgo". Se navega ya, y si el pensum aun no llego es el mapa
 * quien lo dice, con la silueta de la carrera puesta en su sitio.
 */
function TarjetaCarrera({ carrera, tema, esUltima, alElegir }) {
  const caja = useRef(null)
  const [giro, setGiro] = useState(null)

  const color =
    (tema === 'oscuro' ? carrera.color?.oscuro : carrera.color?.claro) ?? 'var(--tinta-suave)'

  /* Se calientan las dos cosas a la vez: los datos del pensum y el codigo que
     los dibuja, que desde que la vista se baja aparte tambien hay que ir a
     buscarlo. Precargar solo una de las dos cambiaria una espera por otra. */
  const precargar = () => {
    precargarCarrera(carrera.slug)
    precargarVista()
  }

  const seguirPuntero = (e) => {
    precargar()
    // Solo raton: el dedo no tiene hover y el giro quedaria pegado
    if (e.pointerType !== 'mouse' || !caja.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const r = caja.current.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    setGiro({ x: -py * GIRO * 2, y: px * GIRO * 2, luzX: (px + 0.5) * 100, luzY: (py + 0.5) * 100 })
  }

  const entrar = () => {
    // Por si se llego aqui sin pasar el puntero: teclado, o un toque limpio
    precargar()
    alElegir(carrera.slug)
  }

  return (
    <button
      ref={caja}
      type="button"
      onPointerMove={seguirPuntero}
      onPointerDown={precargar}
      onFocus={precargar}
      onPointerLeave={() => setGiro(null)}
      onClick={entrar}
      className="tarjeta-carrera group transicion-tema relative block w-full rounded-2xl border border-panel-borde bg-panel p-5 text-left focus-visible:ring-2 focus-visible:ring-[var(--acento)] focus-visible:outline-none xl:p-6"
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

      {/* Solo el nombre. Debajo llevo las cifras de obligatorias y electivas,
          y la silueta ya dice lo mismo -un punto por materia- sin tener que
          leer: eran dos lecturas del mismo dato. */}
      <div className="relative flex items-center justify-between gap-3">
        {/* Peso fino y cuerpo de titular: a 19-22 px Inter toma su dibujo
            optico de titular, que es el que aguanta el peso 300 sin
            deshacerse sobre el fondo oscuro. */}
        <h2 className="min-w-0 font-display text-[19px] leading-tight font-light tracking-[-0.02em] text-tinta xl:text-[22px]">
          {carrera.nombreCorto}
        </h2>

        {/* La carrera donde lo dejaste no lleva una insignia AL LADO de la
            flecha: la flecha se mete dentro y el conjunto es un solo boton,
            "Continuar ↗". Eran dos piezas -una pastilla de versalitas en
            negrita y la flecha suelta- con dos pesos y dos alineaciones
            distintas junto a un titulo fino, y por eso no cuadraba.
            Cabe en la altura del titulo, asi que ninguna tarjeta crece ni
            estira a las demas de su fila. */}
        {esUltima ? (
          <span
            className="flex shrink-0 items-center gap-1 rounded-full border py-[5px] pr-2 pl-2.5 text-[11px] leading-none font-medium transition-colors duration-300"
            style={{
              color,
              borderColor: `color-mix(in oklab, ${color} ${giro ? 55 : 32}%, transparent)`,
              backgroundColor: `color-mix(in oklab, ${color} ${giro ? 14 : 8}%, transparent)`,
            }}
          >
            Continuar
            <ArrowUpRight
              size={13}
              strokeWidth={2}
              className="shrink-0 transition-transform duration-300 group-hover:translate-x-px group-hover:-translate-y-px"
            />
          </span>
        ) : (
          <ArrowUpRight
            size={16}
            className="shrink-0 text-tinta-tenue transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            style={{ color: giro ? color : undefined }}
          />
        )}
      </div>

      {/* La miniatura flota sobre el fondo de la tarjeta: es lo que le da
          volumen sin recurrir a sombras falsas. Es tambien lo que distingue a
          una carrera de otra de un vistazo, asi que se lleva el sitio bueno y
          crece con la pantalla en vez de quedarse en su franja fija. */}
      <div
        className="silueta-carrera relative mt-4 h-20 xl:mt-5 xl:h-24"
        style={{ transform: giro ? 'translateZ(28px)' : undefined }}
      >
        <MiniMapa silueta={carrera.silueta} color={color} className="h-full w-full" />
      </div>

      {/* El nombre completo cierra la tarjeta detras de una regla fina. Antes
          iba suelto a tres pixeles de la miniatura y parecia un sobrante; con
          la regla se lee como pie, que es lo que es. */}
      <p className="relative mt-4 truncate border-t border-panel-borde pt-3 text-[11px] leading-snug font-medium text-tinta-tenue transition-colors duration-300 group-hover:text-tinta-suave xl:mt-5 xl:text-xs">
        {carrera.nombre}
      </p>
    </button>
  )
}

export default TarjetaCarrera
