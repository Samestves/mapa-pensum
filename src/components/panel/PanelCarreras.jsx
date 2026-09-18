import { useEffect, useMemo, useState } from 'react'
import { CARRERAS, cargarCarrera } from '../../data/carreras'
import { Bloque, Cifra, Hueco, Muestra, Serie, Tarjeta, Vacio } from './piezas'
import { diaCorto, mesLargo, tinte, total, variacion } from './formato'

/**
 * El mapa de calor de una carrera: su pensum por semestres, cada materia con
 * su nombre y teñida por las veces que se abrio su ficha. Arriba las cinco
 * mas miradas en palabras; tocar cualquier materia la pone ahi con su puesto.
 */
function Calor({ slug, calor, color }) {
  const [pensum, setPensum] = useState(null)
  const [elegida, setElegida] = useState(null)

  useEffect(() => {
    let vigente = true
    setPensum(null)
    setElegida(null)
    cargarCarrera(slug)
      .then((datos) => vigente && setPensum(datos))
      .catch(() => {})
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

  if (!pensum) return <Hueco alto={260} />
  if (!vistas) {
    return <Vacio>Nadie ha abierto todavía la ficha de una materia de esta carrera.</Vacio>
  }

  const detalle = elegida ? materiaDe(elegida) : null
  const nDetalle = elegida ? (calor?.[elegida] ?? 0) : 0

  return (
    <div className="flex flex-col gap-3">
      <Tarjeta className="flex flex-col gap-2">
        <p className="text-[11px] tracking-[0.14em] text-tinta-tenue uppercase">Las más miradas</p>
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
      </Tarjeta>

      <Tarjeta className="flex flex-col gap-3">
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
      </Tarjeta>
    </div>
  )
}

/**
 * Una carrera sola. Lo de arriba -las pastillas para elegir- no se mueve al
 * cambiar: solo se recarga lo de debajo, y lo demas del panel ni se entera.
 */
export default function PanelCarreras({ slug, alElegir, datos, cargando, resumen, colorDe }) {
  const carrera = CARRERAS.find((c) => c.slug === slug) ?? CARRERAS[0]
  const color = colorDe(carrera)
  // Las mas usadas primero: las que se miran estan siempre a mano
  const porUso = [...CARRERAS].sort(
    (a, b) => (resumen?.[b.slug]?.aparatos ?? 0) - (resumen?.[a.slug]?.aparatos ?? 0),
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="-mx-5 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        <div className="flex w-max gap-1.5">
          {porUso.map((c) => {
            const activa = c.slug === carrera.slug
            const tono = colorDe(c)
            const aparatos = resumen?.[c.slug]?.aparatos ?? 0
            return (
              <button
                key={c.slug}
                type="button"
                onClick={() => alElegir(c.slug)}
                aria-pressed={activa}
                className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] whitespace-nowrap transition-colors"
                style={{
                  borderColor: activa
                    ? `color-mix(in oklab, ${tono} 55%, transparent)`
                    : 'var(--panel-borde)',
                  backgroundColor: activa
                    ? `color-mix(in oklab, ${tono} 14%, var(--panel))`
                    : 'var(--panel)',
                  color: activa ? 'var(--tinta)' : 'var(--tinta-suave)',
                }}
              >
                <span className="size-1.5 rounded-full" style={{ backgroundColor: tono }} />
                {c.nombreCorto}
                <span className="text-[11px] text-tinta-tenue tabular-nums">{aparatos}</span>
              </button>
            )
          })}
        </div>
      </div>

      <header className="flex flex-col gap-1">
        <h2 className="text-[22px] leading-tight font-light tracking-[-0.02em]" style={{ color }}>
          {carrera.nombre}
        </h2>
        <p className="text-[12px] text-tinta-tenue">
          {datos?.desde
            ? `Aparatos y aperturas por día se miden desde el ${diaCorto(datos.desde)}.`
            : 'Aparatos y aperturas por día empiezan a medirse con esta versión del panel.'}
        </p>
      </header>

      {cargando || !datos ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((n) => (
              <Hueco key={n} alto={104} />
            ))}
          </div>
          <Hueco alto={220} />
          <Hueco alto={300} />
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Cifra
              valor={datos.aparatos.treinta}
              rotulo="Aparatos 30 días"
              nota={`${datos.aparatos.siete} en los últimos 7`}
              acento={color}
            />
            <Cifra
              valor={datos.aperturas.mes}
              rotulo="Aperturas"
              nota={`en ${mesLargo(datos.mes)}; ${datos.aperturas.mesAnterior} en ${mesLargo(datos.mesAnterior)}`}
              cambio={variacion(datos.aperturas.mes, datos.aperturas.mesAnterior)}
            />
            <Cifra
              valor={datos.marcas.mes}
              rotulo="Marcas"
              nota={`materias marcadas en ${mesLargo(datos.mes)}`}
              cambio={variacion(datos.marcas.mes, datos.marcas.mesAnterior)}
            />
            <Cifra valor={total(datos.calor)} rotulo="Fichas abiertas" nota="desde que se mide" />
          </section>

          <Bloque
            titulo="Día a día"
            explica="Aparatos distintos que abrieron esta carrera cada día y, detrás, cuántas veces se abrió."
          >
            <Serie
              puntos={datos.dias}
              principal="aparatos"
              fondo="aperturas"
              color={color}
              detalle={(d) => (
                <span className="flex gap-3">
                  <span>
                    <span className="text-tinta">{d.aparatos}</span> aparatos
                  </span>
                  <span>{d.aperturas} aperturas</span>
                </span>
              )}
            />
            <div className="flex gap-4 px-1 text-[11px] text-tinta-tenue">
              <Muestra color={color}>aparatos distintos</Muestra>
              <Muestra color="color-mix(in oklab, var(--tinta) 20%, transparent)">
                aperturas
              </Muestra>
            </div>
          </Bloque>

          <Bloque
            titulo="Mapa de calor"
            explica="Qué materias abre la gente para ver sus requisitos. Cuanto más intenso, más veces."
          >
            <Calor slug={carrera.slug} calor={datos.calor} color={color} />
          </Bloque>
        </>
      )}
    </div>
  )
}
