import { ESTADO } from '../../data/estados'

import IconoMarca from './IconoMarca'

/**
 * Una de las tres opciones para marcar la materia. Las tres forman un solo
 * selector partido por lineas finas, y la elegida se tiñe con el color de su
 * estado: el mismo verde o ambar que el borde de la tarjeta en el mapa.
 *
 * El icono lleva su color siempre, este elegida o no: asi el selector se
 * explica solo -verde es aprobada, ambar es cursando- antes de tocarlo, y
 * elegir es encender la palabra y el fondo.
 */
export function Opcion({ icono, texto, activa, color, alPulsar }) {
  return (
    <button
      type="button"
      aria-pressed={activa}
      onClick={alPulsar}
      className="flex flex-1 flex-col items-center gap-1.5 py-2.5 transition-colors"
      style={{
        backgroundColor: activa ? `color-mix(in oklab, ${color} 13%, transparent)` : 'transparent',
        color: activa ? color : 'var(--tinta-tenue)',
      }}
    >
      <span className="transition-opacity" style={{ color, opacity: activa ? 1 : 0.8 }}>
        {icono}
      </span>
      <span className="font-ui text-[9.5px] font-medium tracking-[0.2em] uppercase">{texto}</span>
    </button>
  )
}

/* Las tres marcas, en el orden en que se leen */
const MARCAS = [
  { marca: ESTADO.APROBADA, texto: 'Aprobada', color: 'var(--estado-aprobada)' },
  { marca: ESTADO.CURSANDO, texto: 'Cursando', color: 'var(--estado-cursando)' },
  { marca: null, texto: 'Sin cursar', color: 'var(--tinta-suave)' },
]

/**
 * Las tres marcas en el telefono: una sola fila al pie de la tarjeta, donde
 * llega el pulgar, en vez de tres cajas altas con el icono encima de la
 * palabra en medio de la ficha.
 *
 * La elegida la señala una lente que se desliza de una a otra, la misma
 * pieza que marca la vista en la barra de abajo, teñida con el color de su
 * estado. Al pulsar vibra un instante, el acuse de un mando.
 *
 * Cada icono lleva su color siempre -verde, ambar, gris- y no solo el de la
 * elegida: sin eso las dos que no estaban elegidas eran dos palabras grises
 * iguales, y habia que leerlas para saber que era cada una.
 */
export function SelectorTelefono({ marca, alMarcar }) {
  const indice = Math.max(
    0,
    MARCAS.findIndex((m) => m.marca === marca),
  )
  const elegida = MARCAS[indice]

  return (
    <div className="relative grid h-12 grid-cols-3 rounded-[12px] border border-panel-borde p-1">
      <span
        aria-hidden="true"
        className="selector-lente pointer-events-none absolute inset-y-1 left-1 rounded-[9px]"
        style={{
          width: 'calc((100% - 0.5rem) / 3)',
          transform: `translateX(${indice * 100}%)`,
          '--lente': elegida.color,
        }}
      />
      {MARCAS.map((m) => {
        const activa = m === elegida
        return (
          <button
            key={m.texto}
            type="button"
            aria-pressed={activa}
            onClick={() => {
              navigator.vibrate?.(8)
              alMarcar(m.marca)
            }}
            className="relative flex items-center justify-center gap-1.5 rounded-[9px] transition-colors duration-300 active:scale-[0.97]"
            style={{ color: activa ? m.color : 'var(--tinta-suave)' }}
          >
            <span
              className="transition-opacity"
              style={{ color: m.color, opacity: activa ? 1 : 0.85 }}
            >
              <IconoMarca marca={m.marca} size={15} />
            </span>
            <span className="font-ui text-[9px] font-medium tracking-[0.16em] whitespace-nowrap uppercase">
              {m.texto}
            </span>
          </button>
        )
      })}
    </div>
  )
}
