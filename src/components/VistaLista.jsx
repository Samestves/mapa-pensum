import { memo, useCallback, useMemo, useState } from 'react'
import { ArrowRight, Check, Lock, LockOpen, Plus, RotateCcw } from 'lucide-react'
import { ESTADO } from '../data/estados'
import { ASPECTO } from '../theme/situacion'
import { SITUACION, situacionDe } from '../layout/situacion'
import { tituloGrupo } from '../layout/franjaElectivas'
import { useNumeroAnimado } from '../hooks/useNumeroAnimado'
import { IconoSituacion } from './IconoSituacion'

/* Los filtros son las preguntas que se le hacen a una lista de materias: que
   puedo inscribir, que llevo, que me falta y que ya pase. Cada uno con el
   mismo icono que llevan las filas, para que filtro y fila se reconozcan. */
const FILTROS = [
  { id: 'todo', entra: () => true },
  { id: 'disponibles', situacion: SITUACION.INSCRIBIBLE, entra: (s) => s === SITUACION.INSCRIBIBLE },
  { id: 'cursando', situacion: SITUACION.CURSANDO, entra: (s) => s === SITUACION.CURSANDO },
  {
    id: 'pendientes',
    situacion: SITUACION.LEJANA,
    entra: (s) => s === SITUACION.PROXIMA || s === SITUACION.LEJANA,
  },
  { id: 'aprobadas', situacion: SITUACION.HECHA, entra: (s) => s === SITUACION.HECHA },
]
const NOMBRE_FILTRO = {
  todo: 'Todas',
  disponibles: 'Disponibles',
  cursando: 'Cursando',
  pendientes: 'Pendientes',
  aprobadas: 'Aprobadas',
}

const colorSituacion = (s) => ASPECTO[s].marca.color
const bloqueada = (s) => s === SITUACION.PROXIMA || s === SITUACION.LEJANA

/**
 * Los tres estados que se pueden marcar, en un solo control segmentado.
 * La pastilla de fondo se desliza hasta el activo en vez de saltar.
 */
function Selector({ estado, alElegir }) {
  const opciones = [
    { marca: ESTADO.APROBADA, texto: 'Aprobada', situacion: SITUACION.HECHA },
    { marca: ESTADO.CURSANDO, texto: 'Cursando', situacion: SITUACION.CURSANDO },
    { marca: null, texto: 'Sin cursar', icono: RotateCcw },
  ]
  const activa = Math.max(
    0,
    opciones.findIndex((o) =>
      o.marca ? o.marca === estado : estado !== ESTADO.APROBADA && estado !== ESTADO.CURSANDO,
    ),
  )

  return (
    <div className="relative grid grid-cols-3 rounded-xl bg-panel-suave p-1">
      <span
        aria-hidden="true"
        className="selector-pastilla absolute inset-y-1 left-1 rounded-lg border border-panel-borde bg-panel shadow-sm"
        style={{ width: 'calc((100% - 0.5rem) / 3)', transform: `translateX(${activa * 100}%)` }}
      />
      {opciones.map((o, i) => {
        const Icono = o.icono
        const activo = i === activa
        return (
          <button
            key={o.texto}
            type="button"
            onClick={() => alElegir(o.marca)}
            aria-pressed={activo}
            className={`relative flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] transition-colors ${
              activo ? 'text-tinta' : 'text-tinta-tenue'
            }`}
          >
            {Icono ? (
              <Icono size={12} strokeWidth={1.75} />
            ) : (
              <IconoSituacion
                situacion={o.situacion}
                color={activo ? colorSituacion(o.situacion) : 'currentColor'}
                size={12}
              />
            )}
            {o.texto}
          </button>
        )
      })}
    </div>
  )
}

/**
 * El camino de una materia, sin palabras: un candado abierto y las que
 * desbloquea, o un candado cerrado y las que le faltan. Cada una es un boton
 * que lleva hasta ella en la lista. Entran una tras otra al abrir la fila.
 */
function Camino({ icono: Icono, rotulo, color, materias, estados, alIr }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-1.5 text-[11px] text-tinta-tenue">
        <Icono size={12} strokeWidth={1.75} style={{ color }} />
        {rotulo}
      </p>
      <ul className="flex min-w-0 flex-wrap gap-1.5">
        {materias.map((m, i) => {
          const s = situacionDe(m.codigo, m.prerrequisitos, estados)
          return (
            <li key={m.codigo} className="chip-entrar max-w-full" style={{ animationDelay: `${60 + i * 45}ms` }}>
              <button
                type="button"
                onClick={() => alIr(m.codigo)}
                className="flex max-w-full items-center gap-1.5 rounded-full border border-panel-borde py-1 pr-2.5 pl-1.5 text-[12px] text-tinta-suave transition-colors active:bg-panel-suave"
              >
                <IconoSituacion situacion={s} color={colorSituacion(s)} size={12} />
                <span className="truncate">{m.nombre}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * Una materia: su icono de estado -que es tambien el boton de aprobarla de un
 * toque- y su nombre. Nada mas en reposo.
 *
 * Lo demas lo cuenta la forma y no el texto. A la derecha, si abre algo, una
 * flecha con cuantas: es el dato que decide que inscribir primero. Y cuando
 * miras una materia, la lista entera se ordena alrededor de ella: lo que
 * desbloquea se marca con una linea de luz, lo que le falta con una ambar, y
 * el resto se apaga. Es la cadena del mapa, contada en vertical.
 */
const FilaMateria = memo(function FilaMateria({
  nodo,
  estado,
  estados,
  relaciones,
  porCodigo,
  abierta,
  enfoque,
  tocada,
  claveToque,
  recienAbierta,
  claveDescarga,
  alMarcar,
  alAlternar,
  alIr,
}) {
  const situacion = situacionDe(nodo.codigo, nodo.prerrequisitos, estados)
  const aprobada = estado === ESTADO.APROBADA

  const desbloquea = (relaciones.adelante.get(nodo.codigo) ?? [])
    .map((c) => porCodigo.get(c))
    .filter(Boolean)
  const faltan = (relaciones.atras.get(nodo.codigo) ?? [])
    .map((c) => porCodigo.get(c))
    .filter((a) => a && estados[a.codigo] !== ESTADO.APROBADA)
  const cerrada = bloqueada(situacion)

  const colorNombre = aprobada
    ? 'var(--tinta-suave)'
    : situacion === SITUACION.LEJANA
      ? 'var(--tinta-tenue)'
      : 'var(--tinta)'

  return (
    <li
      id={`fila-${nodo.codigo}`}
      data-enfoque={enfoque ?? undefined}
      className="fila-lista relative scroll-mt-24"
    >
      {/* La linea de la cadena: luz en lo que abre la materia que miras,
          ambar en lo que le falta. Crece desde el centro al aparecer. */}
      {(enfoque === 'abre' || enfoque === 'requiere') && (
        <span
          aria-hidden="true"
          className="marca-cadena absolute inset-y-2.5 left-0 w-[2.5px] rounded-full"
          style={{
            backgroundColor:
              enfoque === 'abre' ? 'var(--sit-inscribible-luz)' : 'var(--estado-cursando)',
          }}
        />
      )}
      {recienAbierta && (
        <span
          key={claveDescarga}
          aria-hidden="true"
          className="fila-destello pointer-events-none absolute inset-0"
        />
      )}

      <div className="relative flex items-center pr-4">
        <button
          type="button"
          onClick={() => alMarcar(nodo.codigo, aprobada ? null : ESTADO.APROBADA)}
          aria-label={aprobada ? `Desmarcar ${nodo.nombre}` : `Marcar ${nodo.nombre} como aprobada`}
          className="grid size-12 shrink-0 place-items-center"
        >
          <span key={tocada ? claveToque : 'quieto'} className={tocada ? 'marca-pulso grid' : 'grid'}>
            <IconoSituacion situacion={situacion} color={colorSituacion(situacion)} size={18} />
          </span>
        </button>

        <button
          type="button"
          onClick={() => alAlternar(nodo.codigo)}
          aria-expanded={abierta}
          className="flex min-w-0 flex-1 items-center gap-3 py-3.5 text-left"
        >
          <span
            className="min-w-0 flex-1 truncate text-[15px] leading-snug tracking-[-0.01em] transition-colors duration-300"
            style={{ color: colorNombre }}
          >
            {nodo.nombre}
          </span>
          {!aprobada && desbloquea.length > 0 && (
            <span
              className="flex shrink-0 items-center gap-0.5 text-[12px] text-tinta-tenue tabular-nums"
              title={`Desbloquea ${desbloquea.length}`}
              aria-label={`desbloquea ${desbloquea.length}`}
            >
              <LockOpen size={11} strokeWidth={1.75} className="mr-0.5" />
              {desbloquea.length}
            </span>
          )}
        </button>
      </div>

      <div className="plegable" data-abierto={abierta}>
        <div>
          <div className="flex flex-col gap-3 pr-4 pb-4 pl-12">
            <Selector estado={estado} alElegir={(marca) => alMarcar(nodo.codigo, marca)} />
            {/* La key rearranca la entrada de las pastillas cada vez que se
                abre la fila: el panel esta siempre montado para plegarse
                suave, y sin esto solo animarian la primera vez. */}
            <div key={abierta ? 'abierta' : 'cerrada'}>
              {cerrada && faltan.length > 0 ? (
                <Camino
                  icono={Lock}
                  rotulo="Le falta"
                  color="var(--estado-cursando)"
                  materias={faltan}
                  estados={estados}
                  alIr={alIr}
                />
              ) : desbloquea.length > 0 ? (
                <Camino
                  icono={LockOpen}
                  rotulo={aprobada ? 'Desbloqueó' : 'Desbloquea'}
                  color="var(--sit-inscribible-luz)"
                  materias={desbloquea}
                  estados={estados}
                  alIr={alIr}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </li>
  )
})

/**
 * Riel de avance: aprobado y, a continuacion, lo que cursas. Crece con
 * transicion al marcar.
 */
function Riel({ hechas, cursando, total }) {
  const pct = (n) => (total ? (n / total) * 100 : 0)
  return (
    <div className="relative h-[3px] overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--tinta)_9%,transparent)]">
      <span
        className="riel-tramo absolute inset-y-0 left-0 rounded-full bg-aprobada"
        style={{ width: `${pct(hechas)}%` }}
      />
      <span
        className="riel-tramo absolute inset-y-0 rounded-full bg-cursando"
        style={{ left: `${pct(hechas)}%`, width: `${pct(cursando)}%` }}
      />
    </div>
  )
}

/**
 * Lo primero de la lista: cuanto llevas y donde. El numero grande y fino, y
 * una barra por semestre que se llena de abajo arriba. Tocar una lleva a ese
 * semestre.
 */
function Resumen({ progreso, semestres, actual, alIr }) {
  const conTitulo = progreso.porcentaje != null
  const valor = useNumeroAnimado(conTitulo ? progreso.porcentaje : progreso.porcentajeObligatorias)

  return (
    <section className="lista-entrar flex flex-col gap-5 pt-2" aria-label="Tu avance">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="flex items-baseline leading-none">
            <span className="text-[52px] font-extralight tracking-[-0.04em] text-tinta tabular-nums">
              {Math.round(valor)}
            </span>
            <span className="ml-0.5 text-[20px] font-light text-tinta-tenue">%</span>
            <span className="ml-2 text-[11px] font-medium tracking-[0.16em] text-tinta-tenue uppercase">
              {conTitulo ? 'del título' : 'de avance'}
            </span>
          </p>
          <p className="mt-2 text-[12px] text-tinta-tenue tabular-nums">
            {conTitulo
              ? `${progreso.ucAprobadas + progreso.ucElectivas} de ${progreso.ucTitulo} UC aprobadas`
              : `${progreso.ucAprobadas} de ${progreso.ucTotales} UC aprobadas`}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5 pb-0.5 text-[12.5px] tabular-nums">
          {[
            { situacion: SITUACION.INSCRIBIBLE, n: progreso.disponibles, nombre: 'disponibles' },
            { situacion: SITUACION.CURSANDO, n: progreso.cursando, nombre: 'cursando' },
          ].map((d) => (
            <span key={d.situacion} className="flex items-center gap-1.5 text-tinta-tenue">
              <IconoSituacion situacion={d.situacion} color={colorSituacion(d.situacion)} size={13} />
              <span className="text-tinta">{d.n}</span>
              {d.nombre}
            </span>
          ))}
        </div>
      </div>

      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${semestres.length}, minmax(0, 1fr))` }}
      >
        {semestres.map((s) => {
          const pct = (n) => (s.total ? (n / s.total) * 100 : 0)
          const esActual = s.numero === actual
          return (
            <button
              key={s.numero}
              type="button"
              onClick={() => alIr(s.numero)}
              aria-label={`Semestre ${s.numero}: ${s.hechas} de ${s.total} aprobadas`}
              className="group flex flex-col items-center gap-1.5"
            >
              <span className="relative block h-10 w-full overflow-hidden rounded-[5px] bg-[color-mix(in_oklab,var(--tinta)_7%,transparent)]">
                <span
                  className="barra-semestre absolute inset-x-0 bottom-0 bg-aprobada"
                  style={{ height: `${pct(s.hechas)}%` }}
                />
                <span
                  className="barra-semestre absolute inset-x-0 bg-cursando"
                  style={{ bottom: `${pct(s.hechas)}%`, height: `${pct(s.cursando)}%` }}
                />
              </span>
              <span
                className={`text-[10px] tabular-nums transition-colors ${
                  esActual ? 'font-medium text-tinta' : 'text-tinta-tenue'
                }`}
              >
                {s.numero}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

/**
 * Vista de lista por semestres. Es la que se ve por defecto en movil: el
 * grafo completo mide 3200 px de ancho y en un telefono solo cabe a escala
 * 0.10, donde el texto no se lee.
 *
 * Tiene que guiar sin explicar. La version anterior lo decia todo con
 * palabras -"abre 2", "falta Matematicas III", "Próximo sem."- y era mucha
 * lectura para algo que se consulta de un vistazo. Ahora:
 *
 *   - los semestres son un recorrido: una linea vertical los une, con un
 *     punto por semestre que se llena al completarlo y se enciende en el que
 *     te toca;
 *   - cada materia es su icono y su nombre;
 *   - al tocar una, la lista se ordena alrededor de ella -lo que abre y lo
 *     que le falta se marcan, lo demas se apaga- y dentro aparecen esas
 *     materias como pastillas que llevan hasta cada una.
 *
 * Asi "si paso esta, se me abre aquella" se ve, no se lee.
 */
function VistaLista({ layout, estados, progreso, avanceGrupos, toque, descarga, alMirar, alMarcar }) {
  const { columnas, nodos, electivas, gruposElectivas, relaciones, porCodigo } = layout
  const [filtro, setFiltro] = useState('todo')
  /* La materia abierta. Una sola a la vez: es la que ordena la lista a su
     alrededor, y dos cadenas encendidas a la vez no se leerian. */
  const [foco, setFoco] = useState(null)
  /* Semestres que el estudiante abrio o cerro a mano. Sin entrada, un
     semestre completo sale plegado y el resto abierto. */
  const [plegados, setPlegados] = useState({})
  const [gruposAbiertos, setGruposAbiertos] = useState({})

  const entra = FILTROS.find((f) => f.id === filtro).entra

  const semestres = useMemo(
    () =>
      columnas.map((columna) => {
        const todas = nodos.filter((n) => n.semestre === columna.semestre)
        const materias = todas.filter((n) => !n.esHueco)
        const situaciones = materias.map((m) => situacionDe(m.codigo, m.prerrequisitos, estados))
        return {
          numero: columna.semestre,
          materias,
          huecos: todas.filter((n) => n.esHueco),
          situaciones,
          total: materias.length,
          hechas: situaciones.filter((s) => s === SITUACION.HECHA).length,
          cursando: situaciones.filter((s) => s === SITUACION.CURSANDO).length,
        }
      }),
    [columnas, nodos, estados],
  )
  const actual = semestres.find((s) => s.hechas < s.total)?.numero

  const cuentas = useMemo(() => {
    const todas = semestres.flatMap((s) => s.situaciones)
    return Object.fromEntries(FILTROS.map((f) => [f.id, todas.filter(f.entra).length]))
  }, [semestres])

  const secciones = useMemo(
    () =>
      gruposElectivas.map((g) => {
        const items = electivas.filter((e) => e.grupo === g.clave)
        const marcadas = items.filter(
          (e) => estados[e.codigo] === ESTADO.APROBADA || estados[e.codigo] === ESTADO.CURSANDO,
        )
        return { ...g, avance: avanceGrupos[g.clave], items, marcadas }
      }),
    [gruposElectivas, electivas, avanceGrupos, estados],
  )

  /* La cadena de la materia abierta: lo que desbloquea y lo que requiere */
  const cadena = useMemo(() => {
    if (!foco) return null
    return {
      abre: new Set(relaciones.adelante.get(foco) ?? []),
      requiere: new Set(relaciones.atras.get(foco) ?? []),
    }
  }, [foco, relaciones])

  const enfoqueDe = (codigo) => {
    if (!cadena) return null
    if (codigo === foco) return 'propia'
    if (cadena.abre.has(codigo)) return 'abre'
    if (cadena.requiere.has(codigo)) return 'requiere'
    return 'otra'
  }

  /* Las materias que la ultima aprobacion acaba de abrir, para encenderlas */
  const abiertasAhora = useMemo(() => {
    if (!descarga) return new Set()
    return new Set(
      (relaciones.adelante.get(descarga.codigo) ?? []).filter(
        (c) => estados[c] === ESTADO.DISPONIBLE,
      ),
    )
  }, [descarga, relaciones, estados])

  const alAlternar = useCallback(
    (codigo) =>
      setFoco((f) => {
        if (f === codigo) return null
        alMirar?.(codigo)
        return codigo
      }),
    [alMirar],
  )

  /* Llevar a una seccion o a una materia: quita el filtro si la esconde,
     despliega su semestre o su grupo, y se desliza hasta ella.

     El deslizamiento espera a que acaben los pliegues (.plegable, 360 ms).
     Lanzado antes, calcula el destino con la fila anterior aun abierta y la
     nueva aun cerrada, y cuando los dos cambian de alto a mitad del camino
     se queda corto por cientos de pixeles. */
  const deslizarA = (id, bloque = 'start') =>
    setTimeout(
      () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: bloque }),
      380,
    )

  const irASeccion = (id) => {
    setFiltro('todo')
    setPlegados((p) => ({ ...p, [id]: false }))
    deslizarA(`lista-${id}`)
  }

  const alIr = useCallback(
    (codigo) => {
      const materia = porCodigo.get(codigo)
      if (!materia) return
      setFiltro('todo')
      if (materia.semestre != null) {
        setPlegados((p) => ({ ...p, [`semestre-${materia.semestre}`]: false }))
      } else if (materia.grupo) {
        setGruposAbiertos((a) => ({ ...a, [materia.grupo]: true }))
      }
      setFoco(codigo)
      deslizarA(`fila-${codigo}`, 'center')
    },
    // deslizarA no lee estado: es la misma funcion en cada render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [porCodigo],
  )

  const fila = (nodo) => (
    <FilaMateria
      key={nodo.codigo}
      nodo={nodo}
      estado={estados[nodo.codigo]}
      estados={estados}
      relaciones={relaciones}
      porCodigo={porCodigo}
      abierta={foco === nodo.codigo}
      enfoque={enfoqueDe(nodo.codigo)}
      tocada={toque?.codigo === nodo.codigo}
      claveToque={toque?.n}
      recienAbierta={abiertasAhora.has(nodo.codigo)}
      claveDescarga={descarga?.n}
      alMarcar={alMarcar}
      alAlternar={alAlternar}
      alIr={alIr}
    />
  )

  const visibles = semestres
    .map((s) => ({ ...s, filas: s.materias.filter((_, i) => entra(s.situaciones[i])) }))
    .filter((s) => filtro === 'todo' || s.filas.length)

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-2xl flex-col px-4 pt-4 pb-[calc(var(--reserva-barra)+3rem)] md:pb-24">
        <Resumen
          progreso={progreso}
          semestres={semestres}
          actual={actual}
          alIr={(n) => irASeccion(`semestre-${n}`)}
        />

        {/* Filtros: el icono de cada estado y cuantas hay. Pegados arriba al
            desplazarse, con un degradado debajo en vez de una linea. */}
        <div className="transicion-tema sticky top-0 z-20 -mx-4 mt-6 bg-lienzo px-4 pt-2 pb-3 after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-5 after:bg-linear-to-b after:from-lienzo after:to-transparent">
          {/* Con su nombre: el icono solo se aprende, y un filtro tiene que
              entenderse antes de tocarlo. Se desplazan de lado si no caben. */}
          <div
            role="tablist"
            aria-label="Filtrar materias"
            className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]"
          >
            {FILTROS.map((f) => {
              const activo = f.id === filtro
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={activo}
                  onClick={() => {
                    setFiltro(f.id)
                    setFoco(null)
                  }}
                  className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[12.5px] transition-colors duration-200 ${
                    activo
                      ? 'border-transparent bg-[color-mix(in_oklab,var(--tinta)_10%,transparent)] text-tinta'
                      : 'border-panel-borde text-tinta-tenue'
                  }`}
                >
                  {f.situacion && (
                    <IconoSituacion
                      situacion={f.situacion}
                      color={activo ? colorSituacion(f.situacion) : 'currentColor'}
                      size={13}
                    />
                  )}
                  {NOMBRE_FILTRO[f.id]}
                  {f.situacion && (
                    <span className="text-tinta-tenue tabular-nums">{cuentas[f.id]}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* La key del filtro rearranca la entrada: al cambiar de filtro la
            lista nueva sube fundiendose en vez de cambiar de golpe. */}
        <div key={filtro} className="flex flex-col gap-7 pt-4">
          {visibles.length === 0 && (
            <p className="lista-entrar py-16 text-center text-[13px] text-tinta-tenue">
              Nada por aquí
            </p>
          )}

          {visibles.map((s, i) => {
            const id = `semestre-${s.numero}`
            const completo = s.total > 0 && s.hechas === s.total
            const plegado = filtro === 'todo' && (plegados[id] ?? completo)
            const ultimo = i === visibles.length - 1
            const nodoEstado = completo
              ? 'completo'
              : s.numero === actual
                ? 'actual'
                : s.hechas || s.cursando
                  ? 'empezado'
                  : 'pendiente'
            return (
              <section
                key={id}
                id={`lista-${id}`}
                className="lista-entrar relative scroll-mt-16 pl-7"
                style={{ animationDelay: `${Math.min(i, 6) * 35}ms` }}
              >
                {/* El recorrido: una linea que baja de este semestre al
                    siguiente, por detras del punto. */}
                {!ultimo && (
                  <span
                    aria-hidden="true"
                    className="absolute top-[22px] -bottom-7 left-[6.5px] w-px bg-[color-mix(in_oklab,var(--tinta)_10%,transparent)]"
                  />
                )}
                <span
                  aria-hidden="true"
                  data-estado={nodoEstado}
                  className="nodo-semestre absolute top-[9px] left-0 grid size-3.5 place-items-center rounded-full"
                >
                  {completo && <Check size={9} strokeWidth={3} className="text-[var(--lienzo)]" />}
                </span>

                <button
                  type="button"
                  onClick={() => setPlegados((p) => ({ ...p, [id]: !plegado }))}
                  aria-expanded={!plegado}
                  aria-label={`Semestre ${s.numero}`}
                  className="flex w-full flex-col gap-2.5 pb-3 text-left"
                >
                  <span className="flex w-full items-baseline gap-2.5">
                    <span className="text-[24px] leading-none font-extralight tracking-[-0.03em] text-tinta tabular-nums">
                      {String(s.numero).padStart(2, '0')}
                    </span>
                    <span className="text-[10.5px] font-medium tracking-[0.22em] text-tinta-tenue uppercase">
                      Semestre
                    </span>
                    <span
                      className={`ml-auto text-[12px] tabular-nums ${completo ? 'text-aprobada' : 'text-tinta-tenue'}`}
                    >
                      {completo ? 'Completo' : `${s.hechas} de ${s.total} aprobadas`}
                    </span>
                  </span>
                  <Riel hechas={s.hechas} cursando={s.cursando} total={s.total} />
                </button>

                <div className="plegable" data-abierto={!plegado}>
                  <div>
                    <ul className="divide-y divide-panel-borde overflow-hidden rounded-2xl border border-panel-borde bg-panel">
                      {s.filas.map(fila)}
                      {filtro === 'todo' &&
                        s.huecos.map((hueco) => (
                          <li
                            key={hueco.codigo}
                            className="fila-lista"
                            data-enfoque={cadena ? 'otra' : undefined}
                          >
                            <button
                              type="button"
                              onClick={() => irASeccion(`grupo-${hueco.grupo}`)}
                              className="flex w-full items-center pr-4 text-left"
                            >
                              <span className="grid size-12 shrink-0 place-items-center">
                                <IconoSituacion situacion={SITUACION.PROXIMA} color="var(--tinta-tenue)" size={18} />
                              </span>
                              <span className="min-w-0 flex-1 truncate py-3.5 text-[15px] tracking-[-0.01em] text-tinta-tenue">
                                {hueco.nombre}
                              </span>
                              <span className="flex shrink-0 items-center gap-1 text-[12px] text-tinta-tenue">
                                Elegir
                                <ArrowRight size={12} strokeWidth={1.75} className="rotate-90" />
                              </span>
                            </button>
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              </section>
            )
          })}

          {secciones.map((g) => {
            const id = `grupo-${g.clave}`
            /* Con un filtro solo salen las electivas que ya son tuyas: las
               veintitantas opciones del catalogo enterrarian las
               obligatorias, que son lo que el filtro viene a buscar. */
            const candidatas = filtro === 'todo' ? g.items : g.marcadas
            const items = candidatas.filter((e) =>
              entra(situacionDe(e.codigo, e.prerrequisitos, estados)),
            )
            if (filtro !== 'todo' && !items.length) return null

            const abierto = gruposAbiertos[g.clave] ?? false
            const mostradas = filtro === 'todo' && !abierto ? g.marcadas : items
            const avance = g.avance

            return (
              <section key={id} id={`lista-${id}`} className="lista-entrar scroll-mt-16 pl-7">
                <div className="flex items-center gap-4 pb-3">
                  <h2 className="min-w-0 flex-1 truncate text-[17px] leading-tight font-light tracking-[-0.02em] text-tinta">
                    {tituloGrupo(g)
                      .toLowerCase()
                      .replace(/^./, (c) => c.toUpperCase())}
                  </h2>
                  <span
                    className="shrink-0 text-[12px] tabular-nums"
                    style={{ color: avance?.completa ? 'var(--estado-aprobada)' : 'var(--tinta-tenue)' }}
                  >
                    {avance?.meta != null ? `${avance.uc}/${avance.meta} UC` : `${avance?.uc ?? 0} UC`}
                  </span>
                  {filtro === 'todo' && (
                    <button
                      type="button"
                      onClick={() => setGruposAbiertos((a) => ({ ...a, [g.clave]: !abierto }))}
                      aria-expanded={abierto}
                      aria-label={abierto ? 'Ver solo las tuyas' : `Ver las ${g.cantidad} opciones`}
                      className="flex h-8 shrink-0 items-center gap-1 rounded-full border border-panel-borde px-3 text-[12px] text-tinta-suave tabular-nums transition-colors"
                    >
                      <Plus
                        size={12}
                        strokeWidth={1.75}
                        className={`transition-transform duration-300 ${abierto ? 'rotate-45' : ''}`}
                      />
                      {abierto ? 'Ocultar' : `${g.cantidad} opciones`}
                    </button>
                  )}
                </div>
                {avance?.meta != null && (
                  <div className="pb-3">
                    <Riel hechas={Math.min(avance.uc, avance.meta)} cursando={0} total={avance.meta} />
                  </div>
                )}

                {mostradas.length > 0 && (
                  <ul className="divide-y divide-panel-borde overflow-hidden rounded-2xl border border-panel-borde bg-panel">
                    {mostradas.map(fila)}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default VistaLista
