import { useState } from 'react'
import { VERDE, diaCorto, diaLargo, total, variacion } from './formato'

/**
 * Las piezas con las que se arma cada pestaña del panel. Todas tiñen con el
 * color que se les pase -el verde de la casa en lo general, el de cada
 * carrera en lo suyo- para que una misma escala se lea igual en todas partes.
 */

export const Tarjeta = ({ children, className = '' }) => (
  <div className={`rounded-2xl border border-panel-borde bg-panel p-4 ${className}`}>
    {children}
  </div>
)

/** El +12 % o -8 % junto a una cifra, en verde o en rojo */
export function Cambio({ valor, className = '' }) {
  if (valor == null) return null
  const color = valor > 0 ? VERDE : valor < 0 ? 'var(--estado-rojo)' : 'var(--tinta-tenue)'
  return (
    <span className={`text-[11px] tabular-nums ${className}`} style={{ color }}>
      {valor > 0 ? '+' : ''}
      {valor}%
    </span>
  )
}

/** Una cifra grande con su rotulo y una linea que explica que es */
export function Cifra({ valor, rotulo, nota, acento, cambio }) {
  return (
    <Tarjeta className="flex flex-col gap-1">
      <p className="flex items-baseline gap-2">
        <span
          className="text-[32px] leading-none font-extralight tracking-[-0.04em] tabular-nums"
          style={{ color: acento ?? 'var(--tinta)' }}
        >
          {valor}
        </span>
        <Cambio valor={cambio} />
      </p>
      <p className="text-[10.5px] tracking-[0.16em] text-tinta-tenue uppercase">{rotulo}</p>
      {nota && <p className="text-[11.5px] leading-snug text-tinta-tenue">{nota}</p>}
    </Tarjeta>
  )
}

/** Titulo de bloque con su explicacion, para no tener que adivinar nada */
export function Bloque({ titulo, explica, children, acciones }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[15px] font-light tracking-[-0.01em] text-tinta">{titulo}</h2>
          {explica && (
            <p className="mt-0.5 text-[11.5px] leading-snug text-tinta-tenue">{explica}</p>
          )}
        </div>
        {acciones}
      </div>
      {children}
    </section>
  )
}

export const Vacio = ({ children }) => (
  <Tarjeta>
    <p className="text-[12.5px] leading-relaxed text-tinta-tenue">{children}</p>
  </Tarjeta>
)

/** Un bloque gris que late mientras llega lo de verdad */
export const Hueco = ({ alto = 120 }) => (
  <div
    className="animate-pulse rounded-2xl border border-panel-borde bg-panel"
    style={{ height: alto }}
  />
)

/**
 * Una serie de dias en barras. La principal va en color y la de fondo, mas
 * palida, detras: cuando la de fondo asoma mucho es que la misma gente entra
 * varias veces. Tocar o pasar por un dia lo pone arriba con todo su detalle,
 * que en un telefono no hay tooltips.
 */
export function Serie({ puntos, principal, fondo, color = VERDE, detalle }) {
  const [elegido, setElegido] = useState(null)
  const indice = elegido ?? puntos.length - 1
  const punto = puntos[indice]
  const techo = Math.max(...puntos.map((p) => Math.max(p[principal], fondo ? p[fondo] : 0)), 1)
  const media = puntos.reduce((s, p) => s + p[principal], 0) / (puntos.length || 1)

  return (
    <Tarjeta className="flex flex-col gap-3">
      <div className="flex min-h-[38px] flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[13px] text-tinta first-letter:uppercase">
          {punto ? diaLargo(punto.fecha) : '—'}
          {elegido == null && <span className="text-tinta-tenue"> · hoy</span>}
        </p>
        {punto && <div className="text-[12px] text-tinta-suave tabular-nums">{detalle(punto)}</div>}
      </div>

      <div
        className="relative flex items-end gap-[2px]"
        style={{ height: 132 }}
        onPointerLeave={() => setElegido(null)}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-[color-mix(in_oklab,var(--tinta)_18%,transparent)]"
          style={{ bottom: `${(media / techo) * 100}%` }}
        />
        {puntos.map((p, n) => (
          <button
            key={p.fecha}
            type="button"
            aria-label={`${diaCorto(p.fecha)}: ${p[principal]}`}
            onPointerEnter={() => setElegido(n)}
            onClick={() => setElegido(n)}
            className="relative flex h-full flex-1 items-end outline-none"
          >
            {fondo && (
              <span
                className="absolute inset-x-0 bottom-0 rounded-t-[2px] bg-[color-mix(in_oklab,var(--tinta)_13%,transparent)]"
                style={{ height: `${(p[fondo] / techo) * 100}%` }}
              />
            )}
            <span
              className="riel-tramo relative w-full rounded-t-[2px] transition-opacity"
              style={{
                height: `${(p[principal] / techo) * 100}%`,
                minHeight: p[principal] ? 2 : 0,
                backgroundColor: color,
                opacity: n === indice ? 1 : 0.55,
              }}
            />
          </button>
        ))}
      </div>

      <div className="flex justify-between text-[10.5px] text-tinta-tenue tabular-nums">
        <span>{puntos[0] && diaCorto(puntos[0].fecha)}</span>
        <span>media {media.toFixed(1)} al día</span>
        <span>{puntos.at(-1) && diaCorto(puntos.at(-1).fecha)}</span>
      </div>
    </Tarjeta>
  )
}

/** Un cuadrito de color y su nombre, para las leyendas */
export const Muestra = ({ color, children }) => (
  <span className="flex items-center gap-1.5">
    <span className="size-2 rounded-[2px]" style={{ backgroundColor: color }} />
    {children}
  </span>
)

/**
 * Un reparto en barras horizontales: cuanto de cada cosa, y que parte del
 * total es. Con `antes`, cuanto cambio frente al periodo anterior; con
 * `tope`, las que no caben se suman en "y N mas" en vez de alargar la lista.
 */
export function Reparto({
  datos,
  nombres = {},
  antes,
  orden,
  color = VERDE,
  tope,
  vacio = 'Todavía no hay datos.',
}) {
  const todas = Object.entries(datos ?? {})
    .filter(([, n]) => n > 0)
    .sort((a, b) => (orden ? orden.indexOf(a[0]) - orden.indexOf(b[0]) : b[1] - a[1]))
  const suma = total(datos)
  if (!todas.length) return <Vacio>{vacio}</Vacio>

  const filas = tope ? todas.slice(0, tope) : todas
  const resto = todas.slice(filas.length)
  const mayor = Math.max(...filas.map(([, n]) => n))

  return (
    <Tarjeta className="flex flex-col gap-2.5">
      {filas.map(([clave, n]) => (
        <div key={clave} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate text-tinta">{nombres[clave] ?? clave}</span>
            <span className="flex shrink-0 items-baseline gap-2 text-tinta-tenue tabular-nums">
              {antes && <Cambio valor={variacion(n, antes[clave] ?? 0)} />}
              <span className="text-tinta">{n}</span>
              <span className="w-8 text-right text-[11px]">{Math.round((n / suma) * 100)}%</span>
            </span>
          </div>
          <div className="h-[3px] overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--tinta)_9%,transparent)]">
            <span
              className="riel-tramo block h-full rounded-full"
              style={{ width: `${(n / mayor) * 100}%`, backgroundColor: color }}
            />
          </div>
        </div>
      ))}
      {resto.length > 0 && (
        <p className="text-[11.5px] text-tinta-tenue">
          y {resto.length} más con {total(Object.fromEntries(resto))} en total
        </p>
      )}
    </Tarjeta>
  )
}

/** Una fila de botones de los que se elige uno */
export function Segmentos({ opciones, valor, alCambiar, etiqueta }) {
  return (
    <div
      role="radiogroup"
      aria-label={etiqueta}
      className="flex rounded-full border border-panel-borde bg-panel p-0.5"
    >
      {opciones.map(([clave, nombre]) => (
        <button
          key={clave}
          type="button"
          role="radio"
          aria-checked={valor === clave}
          onClick={() => alCambiar(clave)}
          className={`rounded-full px-3 py-1.5 text-[12px] transition-colors ${
            valor === clave
              ? 'bg-panel-suave text-tinta'
              : 'text-tinta-tenue hover:text-tinta-suave'
          }`}
        >
          {nombre}
        </button>
      ))}
    </div>
  )
}
