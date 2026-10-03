import { useEffect, useState } from 'react'

/* El anillo se dibuja en los mismos pixeles que ocupa, para que su trazo
   mida lo que dice y no lo que salga de escalarlo. */
const LADO = 118
const GROSOR = 3
const CENTRO = LADO / 2
const RADIO = (LADO - GROSOR) / 2

const segundosHasta = (instante) => Math.max(0, Math.ceil((instante - Date.now()) / 1000))

/* Los segundos que faltan. Lleva su propio reloj para que cada segundo se
   repinte un numero y no la hoja entera. */
function CuentaAtras({ hasta }) {
  const [quedan, setQuedan] = useState(() => segundosHasta(hasta))

  useEffect(() => {
    const reloj = setInterval(() => setQuedan(segundosHasta(hasta)), 500)
    return () => clearInterval(reloj)
  }, [hasta])

  return (
    <span className="font-ui text-[44px] leading-none font-extralight tracking-[-0.02em] text-tinta tabular-nums">
      {quedan}
      <span className="ml-0.5 font-sans text-[13px] font-normal tracking-normal text-tinta-tenue">
        s
      </span>
    </span>
  )
}

/**
 * El anillo del lector. Con `espera` es una cuenta atras: el arco se vacia en
 * lo que dura y dentro van los segundos que faltan. Sin ella es solo el riel,
 * y dentro va lo que se le pase: el glifo de lo que ocurrio.
 */
function Anillo({ espera, children }) {
  return (
    <div className="relative" style={{ width: LADO, height: LADO }}>
      <svg
        viewBox={`0 0 ${LADO} ${LADO}`}
        aria-hidden="true"
        strokeWidth={GROSOR}
        className="lector-anillo size-full -rotate-90"
      >
        <circle className="lector-riel" cx={CENTRO} cy={CENTRO} r={RADIO} />
        {espera && (
          /* pathLength hace que la circunferencia mida 100, y asi el arco
             se vacia en tantos por ciento (ver .lector-arco). La duracion la
             pone la espera y CSS lo vacia solo; la key lo rearranca en cada
             espera nueva. */
          <circle
            key={espera.hasta}
            className="lector-arco"
            cx={CENTRO}
            cy={CENTRO}
            r={RADIO}
            pathLength="100"
            style={{ animationDuration: `${espera.plazo}ms` }}
          />
        )}
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        {espera ? <CuentaAtras hasta={espera.hasta} /> : children}
      </div>
    </div>
  )
}

/**
 * El lector cuando no esta leyendo ni hay nada que revisar: hay cola, o no se
 * pudo. Todo centrado alrededor del anillo, con una sola accion llena -la que
 * arregla lo que paso- y las demas como texto debajo.
 *
 * No sabe de fallos ni de fases: recibe lo que tiene que decir y lo dibuja.
 *
 * @param {object} props
 * @param {{ hasta: number, plazo: number }} [props.espera]  la cola, si es una cuenta atras
 * @param {import('react').ReactNode} [props.glifo]  lo que va dentro del anillo cuando no lo es
 * @param {{ texto: string, icono?: Function, alPulsar: Function }} [props.principal]
 * @param {{ texto: string, alPulsar: Function }[]} [props.otras]
 */
function LectorAviso({ espera, glifo, titulo, detalle, principal, otras = [] }) {
  const Icono = principal?.icono

  return (
    <div className="lector-cara mx-auto flex w-full max-w-[380px] flex-col items-center px-5 pt-4 pb-6 text-center">
      <Anillo espera={espera}>{glifo}</Anillo>

      <h2
        aria-live="polite"
        className="mt-4 text-[18px] leading-tight font-medium tracking-[-0.015em] text-tinta"
      >
        {titulo}
      </h2>
      <p className="mt-2 max-w-[30ch] text-[13px] leading-normal text-balance text-tinta-suave">
        {detalle}
      </p>

      {principal && (
        <button type="button" onClick={principal.alPulsar} className="boton-tinta mt-6 w-full">
          {Icono && <Icono size={16} strokeWidth={1.75} />}
          {principal.texto}
        </button>
      )}
      {otras.length > 0 && (
        <div className={`flex flex-col items-center gap-2 ${principal ? 'mt-3' : 'mt-5'}`}>
          {otras.map((otra) => (
            <button
              key={otra.texto}
              type="button"
              onClick={otra.alPulsar}
              className="py-1.5 text-[14px] font-medium text-tinta-suave transition-colors hover:text-tinta"
            >
              {otra.texto}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default LectorAviso
