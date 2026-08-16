import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Search, Trash2 } from 'lucide-react'
import { COLORES_CLASE, colorIndice, colorNodo } from '../theme/areas'
import { codigoVisible } from '../data/codigoVisible'
import { useCerrarConEscape } from '../hooks/useCerrarConEscape'
import { useEsTelefono } from '../hooks/useEsTelefono'
import {
  ABRE,
  CIERRA,
  DIAS,
  MIN_DURACION,
  aMinutos,
  aTexto,
  choqueCon,
  enDoceHoras,
} from '../layout/horario'

const MARGEN = 10
const FLECHA = 7
const HUECO = 12
const ANCHO = 312

/* Las duraciones de verdad de un pensum: una hora, hora y media, dos y tres.
   Poner "de 8 a 10" con dos relojes son ocho pulsaciones; con un atajo, una.
   Los relojes se quedan igualmente, porque una seccion de 8:40 a 10:15 no
   cabe en ningun atajo y ese caso tambien tiene que ser posible. */
const DURACIONES = [60, 90, 120, 180]
const etiquetaDuracion = (min) =>
  min % 60 === 0 ? `${min / 60} h` : `${Math.floor(min / 60)} h ${min % 60}`

const CAMPO =
  'seleccionable w-full rounded-lg border border-panel-borde bg-panel-suave px-2 py-1.5 text-[12px] text-tinta outline-none placeholder:text-tinta-tenue focus:border-aprobada'
const ROTULO = 'text-[9.5px] font-bold tracking-wide text-tinta-tenue uppercase'

/** Quita tildes y baja a minusculas para poder buscar sin acentos */
const normalizar = (t) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/**
 * Alta y edicion de una clase, colgando del bloque que se pulso.
 *
 * Es un popover anclado y no un modal centrado porque la decision que se toma
 * aqui -a que hora, que dia- se toma mirando el resto de la semana. Taparla
 * para preguntar por ella le quita al estudiante justo el dato que necesita.
 *
 * En telefono se convierte en hoja inferior: un popover de trescientos
 * pixeles dentro de una pantalla de trescientos setenta y cinco ya es un
 * modal, solo que peor colocado y mas lejos del pulgar.
 */
function PopoverClase({ inicial, ancla, materias, sugeridas, porCodigo, sesiones, alGuardar, alQuitar, alCerrar }) {
  const esTelefono = useEsTelefono()
  const refPanel = useRef(null)
  const [pos, setPos] = useState(null)

  const [codigo, setCodigo] = useState(inicial.codigo ?? '')
  const [dia, setDia] = useState(inicial.dia ?? 0)
  const [inicio, setInicio] = useState(aTexto(inicial.inicio))
  const [fin, setFin] = useState(aTexto(inicial.fin))
  const [seccion, setSeccion] = useState(inicial.seccion ?? '')
  const [aula, setAula] = useState(inicial.aula ?? '')
  const [profesor, setProfesor] = useState(inicial.profesor ?? '')
  const [color, setColor] = useState(inicial.color ?? null)
  const [busqueda, setBusqueda] = useState('')

  useCerrarConEscape(alCerrar)

  /* Se coloca AL LADO del cuadrado, no debajo del punto que se pulso.
     Colgando del click, la ficha tapaba la propia franja sobre la que se
     estaba decidiendo; al lado, el cuadrado y sus vecinos siguen a la vista
     mientras se eligen las horas. A la derecha por defecto, y a la izquierda
     cuando el dia es viernes y no queda sitio.

     Se mide despues de pintar y antes de que el navegador lo enseñe: si se
     calculara durante el render no habria alto que medir y el panel daria un
     salto visible al recolocarse. */
  useLayoutEffect(() => {
    if (esTelefono || !refPanel.current) return
    const alto = refPanel.current.offsetHeight
    const centro = (ancla.arriba + ancla.abajo) / 2

    const aLaDerecha = ancla.derecha + HUECO
    const cabeDerecha = aLaDerecha + ANCHO <= window.innerWidth - MARGEN
    const x = cabeDerecha ? aLaDerecha : Math.max(MARGEN, ancla.izquierda - HUECO - ANCHO)

    // Centrado en el cuadrado, sin salirse por arriba ni por abajo
    const y = Math.max(
      MARGEN,
      Math.min(centro - alto / 2, window.innerHeight - alto - MARGEN),
    )

    setPos({ x, y, aLaIzquierda: !cabeDerecha, flechaY: Math.max(16, Math.min(centro - y, alto - 16)) })
  }, [ancla.izquierda, ancla.derecha, ancla.arriba, ancla.abajo, esTelefono, codigo])

  const elegida = codigo ? porCodigo.get(codigo) : null

  /* Sin escribir nada se ofrecen las materias que el pensum ya desbloqueo:
     es lo que el estudiante puede inscribir de verdad este semestre. La
     busqueda libre sigue llegando a cualquier otra, porque una equivalencia
     o un permiso especial no salen de nuestros datos. */
  const busca = normalizar(busqueda.trim())
  const resultados = busca
    ? materias
        .filter((a) => normalizar(a.nombre).includes(busca) || a.codigo.includes(busca))
        .slice(0, 5)
    : (sugeridas.length ? sugeridas : materias).slice(0, 5)

  const minInicio = aMinutos(inicio)
  const minFin = aMinutos(fin)

  /* Mover la hora de inicio arrastra la de fin y conserva la duracion. Es lo
     que se espera al corregir "empieza a las 8 y no a las 7": nadie quiere
     que la clase pase de durar una hora a durar dos. */
  const cambiarInicio = (texto) => {
    const nuevo = aMinutos(texto)
    const duracion = Math.max(MIN_DURACION, minFin - minInicio)
    setInicio(texto)
    setFin(aTexto(Math.min(CIERRA, nuevo + duracion)))
  }

  const candidata = { id: inicial.id, dia: Number(dia), inicio: minInicio, fin: minFin }
  const choque = minFin > minInicio ? choqueCon(sesiones, candidata) : null

  const problema = !codigo
    ? 'Elige una materia.'
    : minFin - minInicio < MIN_DURACION
      ? `La clase tiene que durar al menos ${MIN_DURACION} minutos.`
      : minInicio < ABRE || minFin > CIERRA
        ? `El horario va de ${enDoceHoras(ABRE)} a ${enDoceHoras(CIERRA)}.`
        : choque
          ? `Se cruza con ${porCodigo.get(choque.codigo)?.nombre ?? choque.codigo}, de ${enDoceHoras(choque.inicio)} a ${enDoceHoras(choque.fin)}.`
          : null

  const enviar = (e) => {
    e.preventDefault()
    if (problema) return
    alGuardar({
      ...inicial,
      codigo,
      dia: Number(dia),
      inicio: minInicio,
      fin: minFin,
      seccion: seccion.trim(),
      aula: aula.trim(),
      profesor: profesor.trim(),
      color,
    })
  }

  const formulario = (
    <form onSubmit={enviar} className="flex flex-col p-3">
      {/* Materia: lo primero y lo unico obligatorio */}
      {elegida ? (
        <button
          type="button"
          onClick={() => setCodigo('')}
          className="flex w-full items-center gap-2 rounded-lg border border-panel-borde px-2 py-1.5 text-left hover:border-tinta-tenue"
        >
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: color ? colorIndice(color) : colorNodo(elegida) }}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-bold text-tinta">{elegida.nombre}</span>
            <span className="block font-mono text-[9px] text-tinta-tenue">
              {codigoVisible(elegida)} · {elegida.uc} UC
            </span>
          </span>
          <span className="shrink-0 text-[10px] font-bold text-tinta-tenue">Cambiar</span>
        </button>
      ) : (
        <>
          <span className="relative block">
            <Search
              size={13}
              className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-tinta-tenue"
            />
            <input
              autoFocus
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar materia…"
              className={`${CAMPO} pl-7`}
            />
          </span>
          {!busca && sugeridas.length > 0 && (
            <p className="mt-1.5 px-0.5 text-[10px] leading-snug text-tinta-tenue">
              Estas las tienes desbloqueadas. Busca para poner cualquier otra.
            </p>
          )}
          <div className="mt-1 flex flex-col">
            {resultados.length === 0 ? (
              <p className="px-2 py-1.5 text-[11px] text-tinta-tenue">Ninguna materia coincide.</p>
            ) : (
              resultados.map((a) => (
                <button
                  key={a.codigo}
                  type="button"
                  onClick={() => setCodigo(a.codigo)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-panel-suave"
                >
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: colorNodo(a) }}
                  />
                  <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-tinta">
                    {a.nombre}
                  </span>
                  <span className="shrink-0 font-mono text-[9px] text-tinta-tenue">{a.uc} UC</span>
                </button>
              ))
            )}
          </div>
        </>
      )}

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <label className="col-span-2 block">
          <span className={ROTULO}>Día</span>
          <select
            value={dia}
            onChange={(e) => setDia(Number(e.target.value))}
            className={`${CAMPO} mt-1`}
          >
            {DIAS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </label>

        {/* Dos horas y no una hora mas una duracion: "2 h" no puede decir que
            la clase es de 8:40 a 10:15, que es como son muchas secciones. El
            control nativo ademas abre el selector del sistema en el telefono. */}
        <label className="block">
          <span className={ROTULO}>Desde</span>
          <input
            type="time"
            value={inicio}
            step={300}
            onChange={(e) => cambiarInicio(e.target.value)}
            className={`${CAMPO} mt-1`}
          />
        </label>
        <label className="block">
          <span className={ROTULO}>Hasta</span>
          <input
            type="time"
            value={fin}
            step={300}
            onChange={(e) => setFin(e.target.value)}
            className={`${CAMPO} mt-1`}
          />
        </label>

        {/* Atajos de duracion. Se marca el que coincide con lo que hay
            puesto, asi que tambien sirven para leer cuanto dura la clase sin
            restar las dos horas de cabeza. */}
        <div className="col-span-2 -mt-0.5 flex gap-1.5">
          {DURACIONES.map((min) => {
            const activo = minFin - minInicio === min
            return (
              <button
                key={min}
                type="button"
                onClick={() => setFin(aTexto(Math.min(CIERRA, minInicio + min)))}
                className={`flex-1 rounded-lg border py-1 text-[11px] font-bold transition-colors ${
                  activo
                    ? 'border-transparent bg-aprobada text-[var(--lienzo)]'
                    : 'border-panel-borde text-tinta-suave hover:text-tinta'
                }`}
              >
                {etiquetaDuracion(min)}
              </button>
            )
          })}
        </div>

        <label className="col-span-2 block">
          <span className={ROTULO}>Profesor</span>
          <input
            value={profesor}
            onChange={(e) => setProfesor(e.target.value)}
            placeholder="Opcional"
            className={`${CAMPO} mt-1`}
          />
        </label>

        <label className="block">
          <span className={ROTULO}>Sección</span>
          <input
            value={seccion}
            onChange={(e) => setSeccion(e.target.value)}
            placeholder="Opcional"
            className={`${CAMPO} mt-1`}
          />
        </label>
        <label className="block">
          <span className={ROTULO}>Aula</span>
          <input
            value={aula}
            onChange={(e) => setAula(e.target.value)}
            placeholder="Opcional"
            className={`${CAMPO} mt-1`}
          />
        </label>
      </div>

      {/* Color. Por defecto el del area, que es el que la materia ya tiene en
          el mapa: asi el horario y el mapa hablan el mismo idioma sin que
          nadie elija nada. */}
      <div className="mt-2.5">
        <span className={ROTULO}>Color</span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <button
            type="button"
            aria-label="Color de su área"
            onClick={() => setColor(null)}
            className={`size-4 rounded-full border border-dashed border-tinta-tenue ${
              color ? '' : 'ring-2 ring-tinta ring-offset-1 ring-offset-panel'
            }`}
          />
          {COLORES_CLASE.map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`Color ${n}`}
              onClick={() => setColor(n)}
              style={{ backgroundColor: colorIndice(n) }}
              className={`size-4 rounded-full ${
                color === n ? 'ring-2 ring-tinta ring-offset-1 ring-offset-panel' : ''
              }`}
            />
          ))}
        </div>
      </div>

      {problema && codigo && (
        <p className="mt-2.5 text-[10.5px] leading-snug text-[var(--estado-rojo)]">{problema}</p>
      )}

      <div className="mt-3 flex gap-2">
        {inicial.id && (
          <button
            type="button"
            onClick={() => alQuitar(inicial.id)}
            aria-label="Quitar del horario"
            className="grid size-8 shrink-0 place-items-center rounded-lg border border-panel-borde text-tinta-suave hover:text-[var(--estado-rojo)]"
          >
            <Trash2 size={14} />
          </button>
        )}
        <button
          type="submit"
          disabled={!!problema}
          className="h-8 flex-1 rounded-lg bg-aprobada text-[11.5px] font-bold text-[var(--lienzo)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {inicial.id ? 'Guardar cambios' : 'Agregar al horario'}
        </button>
      </div>
    </form>
  )

  const cuerpo = esTelefono ? (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={alCerrar}
        className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-label="Clase"
        className="popover-clase relative max-h-[88vh] w-full overflow-y-auto rounded-t-2xl border border-b-0 border-panel-borde bg-panel pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl"
      >
        {formulario}
      </div>
    </div>
  ) : (
    <div className="fixed inset-0 z-50">
      {/* Fondo invisible: cierra al pulsar fuera sin oscurecer la semana, que
          es justo lo que se esta mirando para decidir. */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={alCerrar}
        className="absolute inset-0 cursor-default"
      />
      <div
        ref={refPanel}
        role="dialog"
        aria-label="Clase"
        style={{
          width: ANCHO,
          transform: `translate3d(${pos?.x ?? 0}px, ${pos?.y ?? 0}px, 0)`,
          visibility: pos ? 'visible' : 'hidden',
        }}
        className="popover-clase absolute top-0 left-0 rounded-xl border border-panel-borde bg-panel shadow-2xl"
      >
        {pos && (
          <span
            aria-hidden="true"
            style={{
              top: pos.flechaY,
              [pos.aLaIzquierda ? 'right' : 'left']: -FLECHA + 1,
            }}
            className={`absolute size-3 -translate-y-1/2 rotate-45 border-panel-borde bg-panel ${
              pos.aLaIzquierda ? 'border-t border-r' : 'border-b border-l'
            }`}
          />
        )}
        <div className="relative">{formulario}</div>
      </div>
    </div>
  )

  return createPortal(cuerpo, document.body)
}

export default PopoverClase
