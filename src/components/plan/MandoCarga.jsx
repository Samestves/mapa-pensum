import { LIMITES_CARGA, textoCarga } from '../../data/cargaPlan'
import { horasDe } from '../../layout/planificador'

/* Hasta donde llega el relleno: 28 px en el minimo -para que el asa quepa
   dentro- y la barra entera en el maximo. El pulgar del input, invisible y
   de 28 px, se mueve a la par: su centro va siempre 14 px por detras del
   borde, debajo del asa, asi que el relleno no se despega del dedo. */
const RELLENO = (fraccion) => `calc(28px + (100% - 28px) * ${fraccion})`

/* Donde cae el asa para cada valor, 10 px antes del borde del relleno. Las
   marcas y los numeros de la escala van ahi: el asa se posa justo encima. */
const POSICION = (fraccion) => `calc(18px + (100% - 28px) * ${fraccion})`

/**
 * La carga por semestre, en un solo mando ancho como el limite de carga de
 * un coche electrico: se arrastra libre de punta a punta y el plan entero se
 * rehace al soltar cada paso.
 *
 * Se cuenta en UC o en materias. Las dos cosas se preguntan de verdad:
 * "¿cuanto me tardo a 20 UC?" y "si solo puedo con dos, ¿cuales dos?".
 */
export default function MandoCarga({ carga, alCambiar, plan }) {
  const { min, max } = LIMITES_CARGA[carga.unidad]
  const fraccion = (v) => (v - min) / (max - min)
  const marcas = Array.from({ length: max - min + 1 }, (_, i) => min + i).filter((v) =>
    carga.unidad === 'uc' ? v % 4 === 0 : true,
  )
  const proximo = plan.semestres[0]

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between px-0.5">
        <span className="text-[13.5px] text-tinta-suave">Carga por semestre</span>
        <span className="text-[17px] font-semibold text-tinta tabular-nums">
          {textoCarga(carga)}
        </span>
      </div>

      <div className="mando-carga mt-2.5" style={{ '--lleno': RELLENO(fraccion(carga.valor)) }}>
        {marcas.slice(1, -1).map((v) => (
          <i
            key={v}
            aria-hidden="true"
            data-dentro={v < carga.valor}
            className="mando-marca"
            style={{ left: POSICION(fraccion(v)) }}
          />
        ))}
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={carga.valor}
          onChange={(e) => alCambiar({ unidad: carga.unidad, valor: Number(e.target.value) })}
          aria-label="Carga por semestre"
          aria-valuetext={textoCarga(carga)}
        />
      </div>

      <div
        className="relative mt-2 h-4 text-[11px] text-tinta-tenue tabular-nums"
        aria-hidden="true"
      >
        {marcas.map((v) => (
          <span
            key={v}
            className="absolute -translate-x-1/2"
            style={{ left: POSICION(fraccion(v)) }}
          >
            {v}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div
          className="flex rounded-full bg-tinta/[0.07] p-[3px]"
          role="group"
          aria-label="Contar la carga en"
        >
          {[
            ['uc', 'UC'],
            ['materias', 'Materias'],
          ].map(([unidad, etiqueta]) => (
            <button
              key={unidad}
              type="button"
              aria-pressed={carga.unidad === unidad}
              onClick={() =>
                carga.unidad !== unidad &&
                alCambiar({ unidad, valor: LIMITES_CARGA[unidad].porDefecto })
              }
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors ${
                carga.unidad === unidad
                  ? 'bg-panel font-semibold text-tinta shadow-[0_1px_3px_rgb(0_0_0/0.2),inset_0_0_0_1px_var(--panel-borde)]'
                  : 'text-tinta-suave'
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>
        {/* Lo que la carga significa en la semana. Por materias depende de
            cuales toquen, asi que se dice la del proximo semestre. */}
        <p className="text-right text-[12.5px] leading-snug text-tinta-tenue">
          {carga.unidad === 'uc'
            ? `Unas ${horasDe(carga.valor)} h a la semana`
            : proximo && `El próximo: ${proximo.uc} UC, unas ${horasDe(proximo.uc)} h`}
        </p>
      </div>

      {plan.nuevoIngreso && (
        <p className="mt-4 px-0.5 text-[12.5px] leading-relaxed text-tinta-tenue">
          Como nuevo ingreso, tu primer semestre es primero completo: así lo inscribe la UDO.
        </p>
      )}
    </section>
  )
}
