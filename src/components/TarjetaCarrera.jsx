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
function TarjetaCarrera({ carrera, tema, indice = 0, hechas, esUltima, alElegir }) {
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
    /* En el telefono es una fila y no una tarjeta: la silueta pequeña a la
       izquierda, el nombre y la flecha. Como tarjeta medía 410 px y cabian
       tres por pantalla; como fila caben las nueve en pantalla y media. Es el
       mismo boton con otra disposicion -flex en el telefono, bloque desde
       sm-, asi que no hay dos componentes que mantener. */
    <button
      ref={caja}
      type="button"
      onPointerMove={seguirPuntero}
      onPointerDown={precargar}
      onFocus={precargar}
      onPointerLeave={() => setGiro(null)}
      onClick={entrar}
      className="tarjeta-carrera tarjeta-entrar group transicion-tema relative flex w-full items-center gap-4 rounded-[14px] border border-panel-borde bg-panel py-3 pr-4 pl-3 text-left focus-visible:ring-2 focus-visible:ring-[var(--acento)] focus-visible:outline-none sm:block sm:rounded-2xl sm:p-5 xl:p-6"
      style={{
        '--acento': color,
        '--i': indice,
        transform: giro
          ? `perspective(900px) rotateX(${giro.x}deg) rotateY(${giro.y}deg) scale(1.015)`
          : undefined,
      }}
    >
      {/* Brillo que se desplaza con el angulo. aria-hidden: es decoracion */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: giro
            ? `radial-gradient(60% 60% at ${giro.luzX}% ${giro.luzY}%, color-mix(in oklab, ${color} 16%, transparent) 0%, transparent 70%)`
            : `radial-gradient(60% 60% at 50% 0%, color-mix(in oklab, ${color} 10%, transparent) 0%, transparent 70%)`,
        }}
      />

      {/* El filo de luz del borde de arriba, en el color de la carrera: se
          enciende al señalarla, como la ficha de una materia. */}
      <span aria-hidden="true" className="filo-carrera" />

      <div className="relative flex min-w-0 flex-1 items-center justify-between gap-3">
        <div className="min-w-0">
          {/* Jost fina, como los nombres del mapa */}
          <h2
            className="truncate font-ui text-[17px] leading-tight tracking-[-0.01em] text-tinta sm:text-[20px] xl:text-[23px]"
            style={{ fontWeight: 300 }}
          >
            {carrera.nombreCorto}
          </h2>
          {/* En la fila del telefono el nombre largo va aqui debajo, en
              mayusculas espaciadas; en la tarjeta va al pie. */}
          <p className="mt-1 truncate font-ui text-[8.5px] font-medium tracking-[0.2em] text-tinta-tenue uppercase sm:hidden">
            {carrera.nombre}
          </p>
        </div>
        {/* La carrera donde lo dejaste no lleva una insignia AL LADO de la
            flecha: la flecha se mete dentro y el conjunto es un solo boton,
            "Continuar ↗". Cabe en la altura del titulo, asi que ninguna
            tarjeta crece ni estira a las demas de su fila.

            Estuvo un tiempo fuera, como primer renglon de la portada, y se
            veia mejor aqui: dentro de su tarjeta dice donde lo dejaste sin
            añadir otra pieza a la pagina. */}
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
            strokeWidth={1.5}
            className="shrink-0 text-tinta-tenue transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            style={{ color: giro ? color : undefined }}
          />
        )}
      </div>

      {/* La miniatura flota sobre el fondo de la tarjeta: es lo que le da
          volumen sin recurrir a sombras falsas, y lo que distingue a una
          carrera de otra de un vistazo. En el telefono va primero, pequeña,
          a la izquierda de la fila. */}
      <div
        className="silueta-carrera relative order-first h-11 w-[68px] shrink-0 sm:order-none sm:mt-4 sm:h-20 sm:w-auto xl:mt-5 xl:h-24"
        style={{ transform: giro ? 'translateZ(28px)' : undefined }}
      >
        <MiniMapa
          silueta={carrera.silueta}
          color={color}
          hechas={hechas}
          className="h-full w-full"
        />
      </div>

      {/* El nombre completo cierra la tarjeta detras de una regla fina, en
          mayusculas espaciadas: se lee como rotulo, que es lo que es. */}
      <p className="relative mt-4 hidden truncate border-t border-panel-borde pt-3 font-ui text-[9.5px] font-medium tracking-[0.2em] text-tinta-tenue uppercase transition-colors duration-300 group-hover:text-tinta-suave sm:block xl:mt-5">
        {carrera.nombre}
      </p>
    </button>
  )
}

export default TarjetaCarrera
