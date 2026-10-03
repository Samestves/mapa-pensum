import { ABRE, DIAS_CORTOS } from '../layout/horario'

const HORA = 60

/* Lo minimo que abarca el dibujo. Con una sola clase de hora y media, sin
   esto el bloque ocuparia todo el alto y no diria nada de cuando es. */
const MINIMO = 4 * HORA

/* De que hora a que hora va: de la primera clase a la ultima, en horas
   enteras. No la jornada entera -de siete a siete-, que dejaria media tarde
   vacia y las clases apretadas arriba. */
function rangoDe(sesiones) {
  if (!sesiones.length) return [ABRE, ABRE + MINIMO]
  const desde = Math.floor(Math.min(...sesiones.map((s) => s.inicio)) / HORA) * HORA
  const hasta = Math.ceil(Math.max(...sesiones.map((s) => s.fin)) / HORA) * HORA
  return [desde, Math.max(hasta, desde + MINIMO)]
}

/* "7 AM", "1 PM": la hora en punto, corta */
const enPunto = (min) => {
  const h = Math.floor(min / HORA)
  return `${((h + 11) % 12) + 1} ${h < 12 ? 'AM' : 'PM'}`
}

/**
 * La semana tal como va a quedar con lo leido.
 *
 * Es la forma mas rapida de revisar una lectura: no hay que leer catorce
 * renglones, basta mirar si el dibujo se parece a tu semana. Cada clase es
 * un bloque en su dia y a su hora, del color que tendra su materia en el
 * horario. Las que se sacan se apagan en su sitio en vez de desaparecer, para
 * que se vea que hueco dejan; las que se pisan llevan un filo ambar.
 *
 * @param {object[]} props.sesiones  las clases con dia y hora, entren o no
 * @param {(codigo: string) => string} props.colorDe  el color de cada materia
 */
function SemanaLeida({ sesiones, colorDe }) {
  const [desde, hasta] = rangoDe(sesiones)
  const horas = Array.from({ length: (hasta - desde) / HORA + 1 }, (_, i) => desde + i * HORA)
  const alto = (min) => `${((min - desde) / (hasta - desde)) * 100}%`
  /* Con muchas horas no caben todas las etiquetas: una si y otra no */
  const salto = horas.length > 7 ? 2 : 1

  return (
    <div role="img" aria-label="Así queda tu semana" className="px-5 pt-1 pb-4 sm:px-6">
      <div className="ml-11 grid grid-cols-5 pb-2">
        {DIAS_CORTOS.map((dia) => (
          <span
            key={dia}
            className="text-center font-ui text-[10px] font-medium tracking-[0.18em] text-tinta-tenue uppercase"
          >
            {dia}
          </span>
        ))}
      </div>

      <div className="flex">
        <div className="relative w-11 shrink-0">
          {horas.map(
            (hora, i) =>
              i % salto === 0 && (
                <span
                  key={hora}
                  className="absolute right-2.5 -translate-y-1/2 text-[9.5px] whitespace-nowrap text-tinta-tenue tabular-nums"
                  style={{ top: alto(hora) }}
                >
                  {enPunto(hora)}
                </span>
              ),
          )}
        </div>

        <div className="relative h-[124px] flex-1">
          {horas.map((hora) => (
            <span key={hora} className="hora-leida" style={{ top: alto(hora) }} />
          ))}
          {sesiones.map((s, i) => (
            <span
              key={s.id}
              className="clase-leida"
              data-fuera={!s.incluir || undefined}
              data-choca={s.avisos.length > 0 || undefined}
              style={{
                left: `calc(${s.dia * 20}% + 2px)`,
                width: 'calc(20% - 4px)',
                top: alto(s.inicio),
                height: `calc(${alto(s.fin)} - ${alto(s.inicio)} - 2px)`,
                '--color': colorDe(s.codigo),
                animationDelay: `${80 + i * 45}ms`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default SemanaLeida
