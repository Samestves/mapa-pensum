import { useId, useState } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { curvaSuave, escalaRedonda } from './curva'
import { diaMes } from './formato'

/* El lienzo de las graficas de area: ancho fijo en unidades del SVG, que se
   estira al de su caja, y los margenes donde caen los ejes */
const LIENZO = { ancho: 600, arriba: 10, derecha: 6, abajo: 22, izquierda: 30 }

/**
 * Cuanto cambio algo frente al periodo anterior, en una pastilla verde si
 * sube y roja si baja. Sin nada con que comparar no se pinta.
 */
export function Cambio({ valor }) {
  if (valor == null) return null
  const sube = valor >= 0
  const Flecha = sube ? ArrowUp : ArrowDown
  return (
    <span className="cambio" data-sube={sube || undefined} title="frente al periodo anterior">
      <Flecha size={12} strokeWidth={2.4} />
      {Math.abs(valor)}%
    </span>
  )
}

/**
 * La grafica grande: una curva suave con su area en degradado y una marca en
 * el ultimo dia. Al pasar el dedo o el raton se marca el dia de debajo y se
 * avisa con `alLeer(indice)` -o null al salir-, para que quien la pinta diga
 * ese dia en su cifra grande, como la app Salud.
 *
 * @param {object[]} props.puntos  un punto por dia, con `fecha` ISO y el campo
 * @param {string} props.campo  que se dibuja de cada punto
 */
export function Area({ puntos, campo, alto = 200, alLeer }) {
  const id = useId()
  const [leido, setLeido] = useState(null)
  const { ancho, arriba, derecha, abajo, izquierda } = LIENZO
  const { tope, marcas } = escalaRedonda(Math.max(0, ...puntos.map((p) => p[campo])))
  const x = (i) => izquierda + (i / Math.max(1, puntos.length - 1)) * (ancho - izquierda - derecha)
  const y = (v) => arriba + (1 - v / tope) * (alto - arriba - abajo)
  const linea = curvaSuave(puntos.map((p, i) => [x(i), y(p[campo])]))
  const marcado = leido ?? puntos.length - 1

  const leer = (e) => {
    const caja = e.currentTarget.getBoundingClientRect()
    const en = ((e.clientX - caja.left) / caja.width) * ancho
    const i = Math.round(((en - izquierda) / (ancho - izquierda - derecha)) * (puntos.length - 1))
    const indice = Math.max(0, Math.min(puntos.length - 1, i))
    if (indice === leido) return
    setLeido(indice)
    alLeer?.(indice)
  }
  const soltar = () => {
    setLeido(null)
    alLeer?.(null)
  }

  if (puntos.length < 2) return null
  const medio = Math.floor((puntos.length - 1) / 2)

  return (
    <div className="area" onPointerMove={leer} onPointerLeave={soltar} onPointerCancel={soltar}>
      <svg viewBox={`0 0 ${ancho} ${alto}`} preserveAspectRatio="none" style={{ height: alto }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="area-lava-arriba" />
            <stop offset="1" className="area-lava-abajo" />
          </linearGradient>
        </defs>
        {marcas.map((m) => (
          <line
            key={m}
            className="rejilla"
            x1={izquierda}
            x2={ancho - derecha}
            y1={y(m)}
            y2={y(m)}
          />
        ))}
        <path
          d={`${linea}L${x(puntos.length - 1)},${y(0)}L${x(0)},${y(0)}Z`}
          fill={`url(#${CSS.escape(id)})`}
        />
        <path className="area-linea" d={linea} />
        {leido != null && (
          <line className="area-cruz" x1={x(leido)} x2={x(leido)} y1={arriba} y2={alto - abajo} />
        )}
      </svg>
      {marcas.map((m) => (
        <span key={m} className="eje-y" style={{ top: y(m) }}>
          {m}
        </span>
      ))}
      <span
        className="area-marca"
        style={{ left: `${(x(marcado) / ancho) * 100}%`, top: y(puntos[marcado][campo]) }}
      />
      <div className="ejes-x" style={{ left: `${(izquierda / ancho) * 100}%` }}>
        {[0, medio, puntos.length - 1].map((i) => (
          <span key={i}>{diaMes(puntos[i].fecha)}</span>
        ))}
      </div>
    </div>
  )
}

/**
 * Una grafica minima, sin ejes: como va algo en los ultimos dias, con su
 * ultimo valor marcado. `color` es el de lo que se mide -una carrera-, o el
 * verde de la serie si no se dice.
 */
export function Chispa({ valores, color, alto = 34 }) {
  if (valores.length < 2) return null
  const tope = Math.max(1, ...valores)
  const puntos = valores.map((v, i) => [
    (i / (valores.length - 1)) * 100,
    alto - 3 - (v / tope) * (alto - 6),
  ])
  const [ux, uy] = puntos.at(-1)
  return (
    <span className="chispa" style={{ '--c': color, height: alto }} aria-hidden="true">
      <svg viewBox={`0 0 100 ${alto}`} preserveAspectRatio="none">
        <path d={curvaSuave(puntos)} />
      </svg>
      <i style={{ left: `${ux}%`, top: uy }} />
    </span>
  )
}

/**
 * Columnas por dia, redondeadas arriba y rectas en la base. Tocar o señalar
 * una dice su numero arriba; un dia sin datos va en gris.
 *
 * @param {string} props.nombre  como se llama lo que se cuenta: "aperturas"
 */
export function Columnas({ puntos, campo, nombre, color, alto = 120 }) {
  const [elegida, setElegida] = useState(null)
  const tope = Math.max(1, ...puntos.map((p) => p[campo]))
  const p = elegida != null ? puntos[elegida] : null
  return (
    <div className="columnas" style={{ '--c': color }} onPointerLeave={() => setElegida(null)}>
      <p className="columnas-lectura">
        {p ? (
          <>
            <b>{p[campo]}</b> {nombre} · {diaMes(p.fecha)}
          </>
        ) : (
          <>
            <b>{puntos.reduce((s, x) => s + x[campo], 0)}</b> {nombre} en {puntos.length} días
          </>
        )}
      </p>
      <div className="columnas-barras" style={{ height: alto }}>
        {puntos.map((x, i) => (
          <i
            key={x.fecha}
            role="presentation"
            data-cero={!x[campo] || undefined}
            data-elegida={i === elegida || undefined}
            style={{ height: `${(x[campo] / tope) * 100}%` }}
            onPointerEnter={() => setElegida(i)}
            onClick={() => setElegida(i)}
          />
        ))}
      </div>
      <div className="columnas-ejes">
        <span>{diaMes(puntos[0].fecha)}</span>
        <span>{diaMes(puntos.at(-1).fecha)}</span>
      </div>
    </div>
  )
}

/** Un anillo como los de Apple Fitness: cuanto de algo, de 0 a 100 */
export function Anillo({ valor, tam = 96 }) {
  const id = useId()
  const radio = 40
  const vuelta = 2 * Math.PI * radio
  return (
    <div className="anillo" style={{ width: tam, height: tam }}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" className="anillo-claro" />
            <stop offset="1" className="anillo-pleno" />
          </linearGradient>
        </defs>
        <circle className="anillo-pista" cx="50" cy="50" r={radio} />
        <circle
          className="anillo-arco"
          cx="50"
          cy="50"
          r={radio}
          stroke={`url(#${CSS.escape(id)})`}
          strokeDasharray={`${(Math.min(100, Math.max(0, valor)) / 100) * vuelta} ${vuelta}`}
        />
      </svg>
      <p className="tabular-nums">{valor}%</p>
    </div>
  )
}

/**
 * Una lista de barras horizontales: el nombre, su numero y la barra debajo.
 * Con `porcentaje` el numero es su parte del total; si no, el valor tal cual.
 * Una fila con `color` lleva su punto y su barra en ese color; con
 * `alElegir`, cada fila es un boton.
 *
 * @param {{ clave: string, nombre: string, valor: number, color?: string, cambio?: number }[]} props.filas
 */
export function Barras({ filas, porcentaje = false, alElegir }) {
  const total = filas.reduce((s, f) => s + f.valor, 0) || 1
  const tope = Math.max(1, ...filas.map((f) => f.valor))
  return (
    <ul className="barras">
      {filas.map((f) => {
        const dentro = (
          <>
            <span className="barras-nombre">
              {f.color && <i style={{ background: f.color }} />}
              <span>{f.nombre}</span>
            </span>
            <span className="barras-valor tabular-nums">
              {porcentaje
                ? `${Math.round((f.valor / total) * 100)}%`
                : f.valor.toLocaleString('es-VE')}
              <Cambio valor={f.cambio} />
            </span>
            <span className="barras-pista">
              <b style={{ width: `${(f.valor / tope) * 100}%`, '--c': f.color }} />
            </span>
          </>
        )
        return (
          <li key={f.clave}>
            {alElegir ? (
              <button type="button" onClick={() => alElegir(f.clave)}>
                {dentro}
              </button>
            ) : (
              <div>{dentro}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
