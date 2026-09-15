import { memo, useMemo, useState } from 'react'
import { ChevronDown, RotateCcw } from 'lucide-react'
import { ESTADO } from '../data/estados'
import { colorNodo } from '../theme/areas'
import { ASPECTO } from '../theme/situacion'
import { codigoVisible } from '../data/codigoVisible'
import { SITUACION, situacionDe } from '../layout/situacion'
import { tituloGrupo } from '../layout/franjaElectivas'
import { useNumeroAnimado } from '../hooks/useNumeroAnimado'
import { IconoSituacion } from './IconoSituacion'

/* La palabra de cada situacion en la fila. Hecha y lejana no llevan: el check
   y el candado se explican solos, y son las que menos atencion piden.
   "Disponible" y no "Inscribible", que se leia como jerga de formulario. */
const PALABRA = {
  [SITUACION.CURSANDO]: 'Cursando',
  [SITUACION.INSCRIBIBLE]: 'Disponible',
  [SITUACION.PROXIMA]: 'Próximo sem.',
}

/* Los filtros son las cuatro preguntas que se le hacen a una lista de
   materias, en el orden en que se hacen: que puedo inscribir, que llevo, que
   me falta y que ya pase. */
const FILTROS = [
  { id: 'todo', etiqueta: 'Todo', entra: () => true },
  { id: 'disponibles', etiqueta: 'Disponibles', entra: (s) => s === SITUACION.INSCRIBIBLE },
  { id: 'cursando', etiqueta: 'Cursando', entra: (s) => s === SITUACION.CURSANDO },
  {
    id: 'pendientes',
    etiqueta: 'Pendientes',
    entra: (s) => s === SITUACION.PROXIMA || s === SITUACION.LEJANA,
  },
  { id: 'aprobadas', etiqueta: 'Aprobadas', entra: (s) => s === SITUACION.HECHA },
]

const colorSituacion = (s) => ASPECTO[s].marca.color
const nombres = (lista) =>
  lista.length === 1 ? lista[0].nombre : `${lista.length} materias`

/**
 * La linea pequeña de debajo del nombre: codigo, UC y lo que la materia
 * significa para ti. Es lo que hace que la lista diga mas que el pensum en
 * papel sin abrir nada: que abre, que le falta, detras de que va.
 */
function pista(situacion, prerrequisitos, desbloquea) {
  const pendientes = prerrequisitos.filter((p) => p.estado !== ESTADO.APROBADA)
  switch (situacion) {
    case SITUACION.INSCRIBIBLE:
    case SITUACION.CURSANDO:
      if (!desbloquea.length) return null
      return situacion === SITUACION.CURSANDO
        ? `al aprobar abre ${desbloquea.length}`
        : `abre ${desbloquea.length}`
    case SITUACION.PROXIMA:
      return `tras ${nombres(pendientes.map((p) => p.asignatura))}`
    case SITUACION.LEJANA:
      return pendientes.length === 1
        ? `falta ${pendientes[0].asignatura.nombre}`
        : `faltan ${pendientes.length} prelaciones`
    default:
      return null
  }
}

/** Una materia dentro de la ficha desplegada: su estado y su nombre */
function Chip({ asignatura, estados }) {
  const situacion = situacionDe(asignatura.codigo, asignatura.prerrequisitos, estados)
  return (
    <li className="flex max-w-full items-center gap-1.5 rounded-full border border-panel-borde py-1 pr-2.5 pl-1.5 text-[11.5px] text-tinta-suave">
      <IconoSituacion situacion={situacion} color={colorSituacion(situacion)} size={12} />
      <span className="truncate">{asignatura.nombre}</span>
    </li>
  )
}

/**
 * Los tres estados que se pueden marcar, en un solo control segmentado.
 * La pastilla de fondo se desliza hasta el activo en vez de saltar: es lo
 * que hace que cambiar de estado se sienta como mover un interruptor.
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
              activo ? 'text-tinta' : 'text-tinta-tenue hover:text-tinta-suave'
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
 * Una materia de la lista.
 *
 * Una linea y nada de caja propia: el icono de estado a la izquierda -que es
 * tambien el boton de aprobarla de un toque-, el nombre en peso normal, y
 * debajo, en pequeño, lo que la lista sabe y el papel no. Al tocarla se abre
 * en su sitio con el selector de estado y sus prelaciones.
 */
const FilaMateria = memo(function FilaMateria({
  nodo,
  estado,
  estados,
  relaciones,
  porCodigo,
  tocada,
  claveToque,
  recienAbierta,
  claveDescarga,
  alMarcar,
}) {
  const [abierta, setAbierta] = useState(false)
  const situacion = situacionDe(nodo.codigo, nodo.prerrequisitos, estados)
  const aprobada = estado === ESTADO.APROBADA

  const prerrequisitos = (relaciones.atras.get(nodo.codigo) ?? [])
    .map((c) => porCodigo.get(c))
    .filter(Boolean)
    .map((asignatura) => ({ asignatura, estado: estados[asignatura.codigo] }))
  const desbloquea = (relaciones.adelante.get(nodo.codigo) ?? [])
    .map((c) => porCodigo.get(c))
    .filter(Boolean)

  const texto = pista(situacion, prerrequisitos, desbloquea)
  const palabra = PALABRA[situacion]
  const apagada = situacion === SITUACION.LEJANA
  const idDetalle = `detalle-${nodo.codigo}`

  return (
    <li className="relative">
      {/* La materia que tu ultima aprobacion acaba de abrir se enciende un
          instante. La key cambia con cada aprobacion: asi vuelve a encenderse
          si otra prelacion la abre despues. */}
      {recienAbierta && (
        <span
          key={claveDescarga}
          aria-hidden="true"
          className="fila-destello pointer-events-none absolute inset-0"
        />
      )}
      <div className="relative flex items-center gap-1 pr-2">
        <button
          type="button"
          onClick={() => alMarcar(nodo.codigo, aprobada ? null : ESTADO.APROBADA)}
          aria-label={aprobada ? `Desmarcar ${nodo.nombre}` : `Marcar ${nodo.nombre} como aprobada`}
          className="grid size-12 shrink-0 place-items-center rounded-full"
        >
          <span
            key={tocada ? claveToque : 'quieto'}
            className={`grid size-7 place-items-center rounded-full transition-colors ${
              tocada ? 'marca-pulso' : ''
            }`}
          >
            <IconoSituacion situacion={situacion} color={colorSituacion(situacion)} size={17} />
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAbierta((v) => !v)}
          aria-expanded={abierta}
          aria-controls={idDetalle}
          className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left"
        >
          <span className="min-w-0 flex-1">
            <span
              className="block truncate text-[14.5px] leading-snug tracking-[-0.01em] transition-colors"
              style={{
                color: aprobada
                  ? 'var(--tinta-suave)'
                  : apagada
                    ? 'var(--tinta-tenue)'
                    : 'var(--tinta)',
              }}
            >
              {nodo.nombre}
            </span>
            <span className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-tinta-tenue">
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: colorNodo(nodo) }}
              />
              <span className="shrink-0 font-mono text-[10.5px] tabular-nums">
                {codigoVisible(nodo)}
              </span>
              {nodo.uc != null && <span className="shrink-0 tabular-nums">· {nodo.uc} UC</span>}
              {texto && <span className="truncate">· {texto}</span>}
            </span>
          </span>

          {palabra && (
            <span
              className="shrink-0 text-[11px] font-medium"
              style={{ color: colorSituacion(situacion) }}
            >
              {palabra}
            </span>
          )}
          <ChevronDown
            size={15}
            strokeWidth={1.5}
            className={`shrink-0 text-tinta-tenue transition-transform duration-300 ${
              abierta ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Siempre montado y plegado con grid-template-rows: asi se abre y se
          cierra con su alto real, sin medirlo y sin saltar. */}
      <div id={idDetalle} className="plegable" data-abierto={abierta}>
        <div>
          <div className="flex flex-col gap-3.5 pr-4 pb-4 pl-12">
            <Selector estado={estado} alElegir={(marca) => alMarcar(nodo.codigo, marca)} />

            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] font-medium tracking-[0.16em] text-tinta-tenue uppercase">
                Requiere
              </p>
              {prerrequisitos.length ? (
                <ul className="flex flex-wrap gap-1.5">
                  {prerrequisitos.map(({ asignatura }) => (
                    <Chip key={asignatura.codigo} asignatura={asignatura} estados={estados} />
                  ))}
                </ul>
              ) : (
                <p className="text-[12px] text-tinta-suave">Nada: puedes verla desde el inicio.</p>
              )}
            </div>

            {desbloquea.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] font-medium tracking-[0.16em] text-tinta-tenue uppercase">
                  Abre
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {desbloquea.map((asignatura) => (
                    <Chip key={asignatura.codigo} asignatura={asignatura} estados={estados} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  )
})

/**
 * Riel de avance: aprobado y, a continuacion, lo que cursas. Crece con
 * transicion al marcar, como la cabecera de semestre del mapa.
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
 * al lado una barra por semestre que se llena de abajo arriba -verde lo
 * aprobado, ambar lo que cursas-. De un vistazo se ve que semestres estan
 * cerrados y cual es el que toca, y tocar uno lleva a el.
 */
function Resumen({ progreso, semestres, alIr }) {
  const conTitulo = progreso.porcentaje != null
  const valor = useNumeroAnimado(conTitulo ? progreso.porcentaje : progreso.porcentajeObligatorias)
  const actual = semestres.find((s) => s.hechas < s.total)?.numero

  return (
    <section className="lista-entrar flex flex-col gap-5 pt-2" aria-label="Tu avance">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-baseline leading-none">
            <span className="text-[52px] font-extralight tracking-[-0.04em] text-tinta tabular-nums">
              {Math.round(valor)}
            </span>
            <span className="ml-0.5 text-[20px] font-light text-tinta-tenue">%</span>
          </p>
          <p className="mt-2 text-[12px] text-tinta-tenue">
            {conTitulo
              ? `${progreso.ucAprobadas + progreso.ucElectivas} de ${progreso.ucTitulo} UC del título`
              : `${progreso.ucAprobadas} de ${progreso.ucTotales} UC obligatorias`}
          </p>
        </div>

        <dl className="flex shrink-0 flex-col items-end gap-1.5 text-[12.5px]">
          {[
            { situacion: SITUACION.INSCRIBIBLE, n: progreso.disponibles, texto: 'disponibles' },
            { situacion: SITUACION.CURSANDO, n: progreso.cursando, texto: 'cursando' },
          ].map((d) => (
            <div key={d.situacion} className="flex items-center gap-2">
              <dt className="sr-only">{d.texto}</dt>
              <IconoSituacion situacion={d.situacion} color={colorSituacion(d.situacion)} size={13} />
              <dd className="tabular-nums text-tinta">
                {d.n} <span className="text-tinta-tenue">{d.texto}</span>
              </dd>
            </div>
          ))}
        </dl>
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
              <span className="relative block h-11 w-full overflow-hidden rounded-[5px] bg-[color-mix(in_oklab,var(--tinta)_7%,transparent)] transition-colors group-hover:bg-[color-mix(in_oklab,var(--tinta)_12%,transparent)]">
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
 * 0.10, donde el texto no se lee. Aqui la informacion es la misma pero en
 * un formato que si funciona con el pulgar.
 *
 * Lo que cambia respecto a la version de cajas: una materia es una linea y
 * no una tarjeta, el estado es un icono y no un cuadrado de check, y cada
 * linea dice que abre o que le falta sin tener que abrirla. Los semestres ya
 * cerrados se pliegan solos, y los filtros de arriba contestan de un toque la
 * pregunta con la que casi siempre se abre esta vista: que puedo inscribir.
 */
function VistaLista({ layout, estados, progreso, avanceGrupos, toque, descarga, alMarcar }) {
  const { columnas, nodos, electivas, gruposElectivas, relaciones, porCodigo } = layout
  const [filtro, setFiltro] = useState('todo')
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
          uc: columna.uc,
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

  const cuentas = useMemo(() => {
    const todas = semestres.flatMap((s) => s.situaciones)
    return Object.fromEntries(FILTROS.map((f) => [f.id, todas.filter(f.entra).length]))
  }, [semestres])

  const secciones = useMemo(
    () =>
      gruposElectivas.map((g) => {
        const items = electivas.filter((e) => e.grupo === g.clave)
        const marcadas = items.filter((e) => estados[e.codigo] === ESTADO.APROBADA || estados[e.codigo] === ESTADO.CURSANDO)
        return { ...g, avance: avanceGrupos[g.clave], items, marcadas }
      }),
    [gruposElectivas, electivas, avanceGrupos, estados],
  )

  /* Las materias que la ultima aprobacion acaba de abrir, para encenderlas */
  const abiertasAhora = useMemo(() => {
    if (!descarga) return new Set()
    return new Set(
      (relaciones.adelante.get(descarga.codigo) ?? []).filter(
        (c) => estados[c] === ESTADO.DISPONIBLE,
      ),
    )
  }, [descarga, relaciones, estados])

  const ir = (id) => {
    if (filtro !== 'todo') setFiltro('todo')
    setPlegados((p) => ({ ...p, [id]: false }))
    requestAnimationFrame(() =>
      document.getElementById(`lista-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )
  }

  const fila = (nodo) => (
    <FilaMateria
      key={nodo.codigo}
      nodo={nodo}
      estado={estados[nodo.codigo]}
      estados={estados}
      relaciones={relaciones}
      porCodigo={porCodigo}
      tocada={toque?.codigo === nodo.codigo}
      claveToque={toque?.n}
      recienAbierta={abiertasAhora.has(nodo.codigo)}
      claveDescarga={descarga?.n}
      alMarcar={alMarcar}
    />
  )

  const visibles = semestres
    .map((s) => ({ ...s, filas: s.materias.filter((_, i) => entra(s.situaciones[i])) }))
    .filter((s) => filtro === 'todo' || s.filas.length)

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-2xl flex-col px-4 pt-4 pb-[calc(var(--reserva-barra)+3rem)] md:pb-24">
        <Resumen progreso={progreso} semestres={semestres} alIr={(n) => ir(`semestre-${n}`)} />

        {/* Filtros. Pegados arriba al desplazarse: son la forma de moverse
            por la lista, y un control que se va con el scroll obliga a subir
            para usarlo. */}
        {/* Debajo, un degradado hacia el fondo en vez de una linea: lo que
            pasa por detras se funde al llegar, sin cortarse en seco. */}
        <div className="transicion-tema sticky top-0 z-20 -mx-4 mt-6 bg-lienzo px-4 pt-2 pb-3 after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-5 after:bg-linear-to-b after:from-lienzo after:to-transparent">
          <div
            role="tablist"
            aria-label="Filtrar materias"
            className="-mx-1 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none]"
          >
            {FILTROS.map((f) => {
              const activo = f.id === filtro
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={activo}
                  onClick={() => setFiltro(f.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] transition-colors duration-200 ${
                    activo
                      ? 'border-transparent bg-[color-mix(in_oklab,var(--tinta)_10%,transparent)] text-tinta'
                      : 'border-panel-borde text-tinta-tenue hover:text-tinta-suave'
                  }`}
                >
                  {f.etiqueta}
                  {f.id !== 'todo' && (
                    <span className="text-[11px] text-tinta-tenue tabular-nums">{cuentas[f.id]}</span>
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
              {filtro === 'disponibles'
                ? 'No tienes materias disponibles ahora mismo.'
                : filtro === 'cursando'
                  ? 'No estás cursando ninguna materia.'
                  : filtro === 'aprobadas'
                    ? 'Todavía no has aprobado ninguna materia.'
                    : 'No te queda nada pendiente.'}
            </p>
          )}

          {visibles.map((s, i) => {
            const id = `semestre-${s.numero}`
            const completo = s.total > 0 && s.hechas === s.total
            const plegado = filtro === 'todo' && (plegados[id] ?? completo)
            return (
              <section
                key={id}
                id={`lista-${id}`}
                className="lista-entrar scroll-mt-16"
                style={{ animationDelay: `${Math.min(i, 6) * 35}ms` }}
              >
                <button
                  type="button"
                  onClick={() => setPlegados((p) => ({ ...p, [id]: !plegado }))}
                  aria-expanded={!plegado}
                  className="group flex w-full flex-col gap-2.5 pb-3 text-left"
                >
                  <span className="flex w-full items-baseline gap-2.5">
                    <span className="text-[26px] leading-none font-extralight tracking-[-0.03em] text-tinta tabular-nums">
                      {String(s.numero).padStart(2, '0')}
                    </span>
                    <span className="text-[10.5px] font-medium tracking-[0.2em] text-tinta-tenue uppercase">
                      Semestre
                    </span>
                    <span className="ml-auto flex items-center gap-2 text-[12px] text-tinta-tenue tabular-nums">
                      {completo ? (
                        <span className="flex items-center gap-1.5 text-aprobada">
                          <IconoSituacion situacion={SITUACION.HECHA} color="var(--estado-aprobada)" size={12} />
                          Completo
                        </span>
                      ) : (
                        <span>
                          <span className="text-tinta">{s.hechas}</span>/{s.total}
                        </span>
                      )}
                      <span>· {s.uc} UC</span>
                      {filtro === 'todo' && (
                        <ChevronDown
                          size={14}
                          strokeWidth={1.5}
                          className={`transition-transform duration-300 ${plegado ? '-rotate-90' : ''}`}
                        />
                      )}
                    </span>
                  </span>
                  <Riel hechas={s.hechas} cursando={s.cursando} total={s.total} />
                </button>

                <div className="plegable" data-abierto={!plegado}>
                  <div>
                    <ul className="divide-y divide-panel-borde rounded-2xl border border-panel-borde bg-panel">
                      {s.filas.map(fila)}
                      {filtro === 'todo' &&
                        s.huecos.map((hueco) => (
                          <li key={hueco.codigo}>
                            <button
                              type="button"
                              onClick={() => ir(`grupo-${hueco.grupo}`)}
                              className="flex w-full items-center gap-1 pr-4 text-left"
                            >
                              <span className="grid size-12 shrink-0 place-items-center">
                                <IconoSituacion situacion={SITUACION.PROXIMA} color="var(--tinta-tenue)" size={17} />
                              </span>
                              <span className="min-w-0 flex-1 py-3">
                                <span className="block truncate text-[14.5px] tracking-[-0.01em] text-tinta-suave">
                                  {hueco.nombre}
                                </span>
                                <span className="mt-1 block text-[11px] text-tinta-tenue">
                                  Casilla de electiva · elígela más abajo
                                </span>
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
               veintitantas opciones del catalogo "disponibles" enterrarian
               las obligatorias, que son lo que el filtro viene a buscar. */
            const candidatas = filtro === 'todo' ? g.items : g.marcadas
            const items = candidatas.filter((e) =>
              entra(situacionDe(e.codigo, e.prerrequisitos, estados)),
            )
            if (filtro !== 'todo' && !items.length) return null

            const abierto = gruposAbiertos[g.clave] ?? false
            /* El catalogo entero es largo -Agronomica trae 28 tecnicas-, asi
               que se enseñan las tuyas y el resto detras de un boton. */
            const cortas = filtro === 'todo' && !abierto
            const mostradas = cortas ? g.marcadas : items
            const avance = g.avance

            return (
              <section key={id} id={`lista-${id}`} className="lista-entrar scroll-mt-16">
                <div className="flex flex-col gap-1 pb-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-[19px] leading-tight font-light tracking-[-0.02em] text-tinta">
                      {tituloGrupo(g)
                        .toLowerCase()
                        .replace(/^./, (c) => c.toUpperCase())}
                    </h2>
                    <span
                      className="shrink-0 text-[12px] tabular-nums"
                      style={{
                        color: avance?.completa ? 'var(--estado-aprobada)' : 'var(--tinta-tenue)',
                      }}
                    >
                      {avance?.meta != null ? (
                        <>
                          <span className="text-tinta">{avance.uc}</span>/{avance.meta} UC
                        </>
                      ) : (
                        `${avance?.uc ?? 0} UC aprobadas`
                      )}
                    </span>
                  </div>
                  {avance?.meta != null && (
                    <div className="mt-1.5">
                      <Riel hechas={Math.min(avance.uc, avance.meta)} cursando={0} total={avance.meta} />
                    </div>
                  )}
                  <p className="mt-1 text-[12px] leading-snug text-tinta-tenue">
                    {g.tipo === 'informativa'
                      ? 'Catálogo informativo: confirma con control de estudios cuántas debes cursar.'
                      : g.cuota != null
                        ? `Elige de ${g.cantidad} opciones hasta cubrir la cuota.`
                        : `${g.cantidad} opciones. No tenemos la cuota oficial de esta carrera.`}
                  </p>
                </div>

                {mostradas.length > 0 && (
                  <ul className="divide-y divide-panel-borde rounded-2xl border border-panel-borde bg-panel">
                    {mostradas.map(fila)}
                  </ul>
                )}

                {filtro === 'todo' && (
                  <button
                    type="button"
                    onClick={() => setGruposAbiertos((a) => ({ ...a, [g.clave]: !abierto }))}
                    aria-expanded={abierto}
                    className={`flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-panel-borde py-3 text-[12.5px] text-tinta-suave transition-colors hover:text-tinta ${
                      mostradas.length ? 'mt-2' : ''
                    }`}
                  >
                    {abierto
                      ? 'Ver solo las tuyas'
                      : `Ver las ${g.cantidad} opciones`}
                    <ChevronDown
                      size={14}
                      strokeWidth={1.5}
                      className={`transition-transform duration-300 ${abierto ? 'rotate-180' : ''}`}
                    />
                  </button>
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
