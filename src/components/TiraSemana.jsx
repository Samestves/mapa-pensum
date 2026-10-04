import { DIAS, DIAS_CORTOS, rangoDeClases, tramoCorto } from '../layout/horario'

const clases = (n) => `${n} ${n === 1 ? 'clase' : 'clases'}`

/**
 * La semana en miniatura, y el mando con el que se cambia de dia.
 *
 * Son las dos cosas a la vez a proposito. Cinco pestañas con el nombre del dia
 * dirian a donde se puede ir, pero no si vale la pena: aqui cada dia enseña
 * sus clases a su hora y con su color, y se ve de un vistazo cual esta cargado
 * y cual libre antes de tocarlo.
 *
 * El dia elegido lo marca una lente que se desliza hasta el que se toca (ver
 * .tira-lente): lo que se mueve entre opciones se lee como un selector sin
 * tener que decirlo.
 *
 * @param {object[][]} props.porDia  las clases de cada dia
 * @param {number} props.dia  el dia que se esta viendo
 * @param {{ dia: number, minuto: number }} props.ahora
 * @param {(sesion: object) => { color: string }} props.aspectoDe
 */
function TiraSemana({ porDia, dia, ahora, aspectoDe, alElegir }) {
  const [desde, hasta] = rangoDeClases(porDia.flat())
  const altura = (minuto) => ((minuto - desde) / (hasta - desde)) * 100
  const ahoraSeVe = ahora.minuto >= desde && ahora.minuto <= hasta

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="rotulo-horario font-ui">Semana</span>
        <span className="text-[12px] leading-none text-tinta-tenue tabular-nums">
          {tramoCorto(desde, hasta)}
        </span>
      </div>

      <div role="group" aria-label="Día" className="tira-semana mt-2" style={{ '--dia': dia }}>
        <span className="tira-lente" aria-hidden="true" />

        {DIAS.map((nombre, i) => (
          <button
            key={nombre}
            type="button"
            onClick={() => alElegir(i)}
            aria-pressed={i === dia}
            aria-label={`${nombre}, ${clases(porDia[i].length)}`}
            data-hoy={i === ahora.dia || undefined}
          >
            <span className="tira-dia font-ui">{DIAS_CORTOS[i]}</span>
            <span className="tira-columna">
              {porDia[i].map((s) => (
                <i
                  key={s.id}
                  style={{
                    '--c': aspectoDe(s).color,
                    top: `${altura(s.inicio)}%`,
                    height: `${altura(s.fin) - altura(s.inicio)}%`,
                    left: `${(s.carril / s.carriles) * 100}%`,
                    width: `${100 / s.carriles}%`,
                  }}
                />
              ))}
              {i === ahora.dia && ahoraSeVe && <b style={{ top: `${altura(ahora.minuto)}%` }} />}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default TiraSemana
