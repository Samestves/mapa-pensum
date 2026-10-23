import { useEffect, useMemo, useState } from 'react'
import { CARRERAS, cargarCarrera } from '../../data/carreras'
import MiniMapa from '../MiniMapa'
import { Hueco, Vacio } from './piezas'
import { Cambio, Chispa, Columnas } from './graficas'
import { diaCorto, mesLargo, tinte, total, variacion } from './formato'

/**
 * El mapa de calor de una carrera: su pensum por semestres, cada materia con
 * su nombre y teñida por las veces que se abrio su ficha. Arriba las cinco
 * mas miradas en palabras; tocar cualquier materia la pone ahi con su puesto.
 */
function Calor({ slug, calor, color }) {
  const [pensum, setPensum] = useState(null)
  const [elegida, setElegida] = useState(null)
  const [fallo, setFallo] = useState(false)

  useEffect(() => {
    let vigente = true
    setPensum(null)
    setElegida(null)
    setFallo(false)
    cargarCarrera(slug)
      .then((datos) => vigente && setPensum(datos))
      .catch(() => vigente && setFallo(true))
    return () => {
      vigente = false
    }
  }, [slug])

  const filas = useMemo(() => {
    if (!pensum) return []
    const porSemestre = new Map()
    for (const a of pensum.asignaturas) {
      if (a.esHueco) continue
      if (!porSemestre.has(a.semestre)) porSemestre.set(a.semestre, [])
      porSemestre.get(a.semestre).push(a)
    }
    const semestres = [...porSemestre.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([semestre, materias]) => ({
        clave: `s${semestre}`,
        rotulo: String(semestre).padStart(2, '0'),
        materias,
      }))
    // Las electivas no tienen semestre: van al final, una fila por grupo
    const electivas = (pensum.grupos ?? [])
      .filter((g) => g.asignaturas?.length)
      .map((g) => ({
        clave: `g-${g.clave}`,
        rotulo: 'EL',
        titulo: g.titulo,
        materias: g.asignaturas,
      }))
    return [...semestres, ...electivas]
  }, [pensum])

  const vistas = total(calor)
  const techo = Math.max(...Object.values(calor ?? {}), 1)
  const puesto = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(calor ?? {})
          .sort((a, b) => b[1] - a[1])
          .map(([c], i) => [c, i + 1]),
      ),
    [calor],
  )
  const materiaDe = (codigo) => filas.flatMap((f) => f.materias).find((m) => m.codigo === codigo)
  const top = Object.entries(calor ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([codigo, n]) => ({ codigo, n, materia: materiaDe(codigo) }))
    .filter((t) => t.materia)

  if (fallo) return <Vacio>No se pudo cargar el pensum de esta carrera.</Vacio>
  if (!pensum) return <Hueco alto={260} />
  if (!vistas) {
    return <Vacio>Nadie ha abierto todavía la ficha de una materia de esta carrera.</Vacio>
  }

  const detalle = elegida ? materiaDe(elegida) : null
  const nDetalle = elegida ? (calor?.[elegida] ?? 0) : 0

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <h3>Las más miradas</h3>
        {top.map((t, i) => (
          <button
            key={t.codigo}
            type="button"
            onClick={() => setElegida(t.codigo)}
            className="flex items-center gap-3 text-left text-[13px]"
          >
            <span className="w-4 shrink-0 text-right text-[11px] text-tinta-tenue tabular-nums">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-tinta">{t.materia.nombre}</span>
              <span className="mt-1 block h-[3px] overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--tinta)_8%,transparent)]">
                <span
                  className="riel-tramo block h-full rounded-full"
                  style={{ width: `${(t.n / techo) * 100}%`, backgroundColor: color }}
                />
              </span>
            </span>
            <span className="shrink-0 text-tinta-suave tabular-nums">{t.n}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t border-panel-borde pt-4">
        <p className="min-h-[36px] text-[12.5px] leading-snug">
          {detalle ? (
            <>
              <span className="text-tinta">{detalle.nombre}</span>
              <span className="text-tinta-tenue">
                {' '}
                · {detalle.semestre ? `semestre ${detalle.semestre}` : 'electiva'} · {nDetalle}{' '}
                {nDetalle === 1 ? 'vez' : 'veces'}
                {nDetalle > 0 && ` · puesto ${puesto[elegida]} de ${Object.keys(puesto).length}`}
              </span>
            </>
          ) : (
            <span className="text-tinta-tenue">
              {vistas} fichas abiertas en total. Toca una materia para ver su número.
            </span>
          )}
        </p>

        <div className="flex flex-col gap-2">
          {filas.map((fila) => (
            <div key={fila.clave} className="flex gap-2">
              <span
                className="w-6 shrink-0 pt-[5px] text-[10px] text-tinta-tenue tabular-nums"
                title={fila.titulo}
              >
                {fila.rotulo}
              </span>
              <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                {fila.materias.map((m) => {
                  const n = calor?.[m.codigo] ?? 0
                  /* Raiz y no lineal: con una materia muy por encima de las
                     demas, lineal deja todo el resto del mismo gris. */
                  const fuerza = Math.sqrt(n / techo)
                  const activa = elegida === m.codigo
                  return (
                    <button
                      key={m.codigo}
                      type="button"
                      onClick={() => setElegida(activa ? null : m.codigo)}
                      title={`${m.nombre} · ${n}`}
                      className="flex max-w-[11.5rem] items-center gap-1.5 rounded-[7px] border px-2 py-[5px] text-[11px] leading-none transition-[box-shadow]"
                      style={{
                        backgroundColor: n ? tinte(color, 0.1 + fuerza * 0.78) : 'transparent',
                        borderColor: n ? 'transparent' : 'var(--panel-borde)',
                        color:
                          fuerza > 0.55
                            ? 'var(--lienzo)'
                            : n
                              ? 'var(--tinta)'
                              : 'var(--tinta-tenue)',
                        boxShadow: activa ? '0 0 0 1.5px var(--tinta)' : undefined,
                      }}
                    >
                      <span className="truncate">{m.nombre}</span>
                      {n > 0 && <span className="shrink-0 tabular-nums opacity-75">{n}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 border-t border-panel-borde pt-2.5 text-[11px] text-tinta-tenue">
          menos
          <span
            className="h-2 w-24 rounded-full"
            style={{
              background: `linear-gradient(90deg, ${tinte(color, 0.1)}, ${tinte(color, 0.88)})`,
            }}
          />
          más
          <span className="ml-auto">una fila por semestre · EL son las electivas</span>
        </div>
      </div>
    </div>
  )
}

/* "Ingeniería", "Licenciatura" o "Gerencia": la primera palabra del nombre */
const tipoDe = (carrera) => carrera.nombre.split(' ')[0]

/**
 * Una carrera en la rejilla: su forma, sus aperturas del mes con la
 * tendencia de los ultimos 30 dias, y sus aparatos y marcas. Todo en su
 * color; tocarla la abre arriba.
 */
function TarjetaCarrera({ carrera, color, datos, mes, elegida, alElegir }) {
  const { mes: aperturas = 0, mesAnterior = 0, aparatos = 0, marcas = 0, porDia = [] } = datos ?? {}
  return (
    <button
      type="button"
      className="tarjeta-carrera-panel"
      aria-pressed={elegida}
      onClick={() => alElegir(carrera.slug)}
      style={{ '--c': color }}
    >
      <span className="cab">
        <span>
          <b>{carrera.nombreCorto}</b>
          <small>{tipoDe(carrera)}</small>
        </span>
        <MiniMapa silueta={carrera.silueta} color={color} className="forma" />
      </span>
      <span className="cifra">
        <span>
          <b className="tabular-nums">{aperturas.toLocaleString('es-VE')}</b>
          <small>aperturas en {mesLargo(mes)}</small>
        </span>
        <Chispa valores={porDia} color={color} />
      </span>
      <span className="pie">
        <span>
          <b>{aparatos}</b> aparatos
        </span>
        <span>
          <b>{marcas.toLocaleString('es-VE')}</b> marcas
        </span>
        <span className="ml-auto">
          <Cambio valor={variacion(aperturas, mesAnterior)} />
        </span>
      </span>
    </button>
  )
}

/** La carrera elegida, entera: sus cifras, su dia a dia y su mapa de calor */
function Detalle({ carrera, color, datos, cargando }) {
  return (
    <section
      className="widget detalle-carrera ocupa-6"
      style={{ '--c': color }}
      aria-label={carrera.nombre}
    >
      <div className="cabecera">
        <div className="min-w-0">
          <small>{tipoDe(carrera)}</small>
          <h2>{carrera.nombre}</h2>
          <p className="mt-1 text-[12px] text-tinta-tenue">
            {datos?.desde
              ? `Por día se mide desde el ${diaCorto(datos.desde)}.`
              : 'Aparatos y aperturas por día empiezan a medirse con esta versión del panel.'}
          </p>
        </div>
        <MiniMapa silueta={carrera.silueta} color={color} className="forma" />
      </div>

      {cargando || !datos ? (
        <div className="p-5">
          <Hueco alto={260} />
        </div>
      ) : (
        <>
          <div className="cifras">
            <div>
              <small>Aparatos 30 días</small>
              <b className="tabular-nums">{datos.aparatos.treinta}</b>
              <p>{datos.aparatos.siete} en los últimos 7</p>
            </div>
            <div>
              <small>Aperturas en {mesLargo(datos.mes)}</small>
              <b className="tabular-nums">
                {datos.aperturas.mes}
                <Cambio valor={variacion(datos.aperturas.mes, datos.aperturas.mesAnterior)} />
              </b>
              <p>
                {datos.aperturas.mesAnterior} en {mesLargo(datos.mesAnterior)}
              </p>
            </div>
            <div>
              <small>Marcas en {mesLargo(datos.mes)}</small>
              <b className="tabular-nums">
                {datos.marcas.mes}
                <Cambio valor={variacion(datos.marcas.mes, datos.marcas.mesAnterior)} />
              </b>
              <p>materias marcadas</p>
            </div>
            <div>
              <small>Fichas abiertas</small>
              <b className="tabular-nums">{total(datos.calor)}</b>
              <p>desde que se mide</p>
            </div>
          </div>

          <div className="cuerpo lg:grid-cols-2">
            <div>
              <h3>Aparatos distintos por día</h3>
              <Columnas puntos={datos.dias} campo="aparatos" nombre="aparatos" color={color} />
            </div>
            <div>
              <h3>Aperturas por día</h3>
              <Columnas puntos={datos.dias} campo="aperturas" nombre="aperturas" color={color} />
            </div>
            <div className="lg:col-span-2">
              <h3>Mapa de calor</h3>
              <p className="mb-3 text-[12px] text-tinta-tenue">
                Qué materias abre la gente para ver sus requisitos. Cuanto más intenso, más veces.
              </p>
              <Calor slug={carrera.slug} calor={datos.calor} color={color} />
            </div>
          </div>
        </>
      )}
    </section>
  )
}

/**
 * Las carreras: la elegida arriba, entera, y debajo las nueve en tarjetas
 * para comparar de un vistazo y cambiar de una a otra. Las mas usadas van
 * primero.
 */
export default function PanelCarreras({ slug, alElegir, datos, cargando, resumen, mes, colorDe }) {
  const carrera = CARRERAS.find((c) => c.slug === slug) ?? CARRERAS[0]
  const porUso = [...CARRERAS].sort(
    (a, b) => (resumen?.[b.slug]?.mes ?? 0) - (resumen?.[a.slug]?.mes ?? 0),
  )

  return (
    <div className="bento">
      <Detalle carrera={carrera} color={colorDe(carrera)} datos={datos} cargando={cargando} />
      <div className="carreras-rejilla ocupa-6">
        {porUso.map((c) => (
          <TarjetaCarrera
            key={c.slug}
            carrera={c}
            color={colorDe(c)}
            datos={resumen?.[c.slug]}
            mes={mes}
            elegida={c.slug === carrera.slug}
            alElegir={alElegir}
          />
        ))}
      </div>
    </div>
  )
}
