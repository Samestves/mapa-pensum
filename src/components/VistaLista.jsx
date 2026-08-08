import { useMemo, useState } from 'react'
import { Check, ChevronDown, CircleDot, Lock } from 'lucide-react'
import { ESTADO } from '../hooks/usePensum'
import { colorNodo, etiquetaArea } from '../theme/areas'
import { COLOR_ESTADO } from '../theme/estados'
import { codigoVisible } from '../data/codigoVisible'

function Boton({ icono: Icono, texto, activo, color, alPulsar }) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[11px] font-bold transition-colors"
      style={{
        borderColor: activo ? color : 'var(--panel-borde)',
        backgroundColor: activo ? `color-mix(in oklab, ${color} 16%, transparent)` : 'transparent',
        color: activo ? color : 'var(--tinta-suave)',
      }}
    >
      <Icono size={14} />
      {texto}
    </button>
  )
}

function FilaMateria({ nodo, estado, relaciones, porCodigo, estados, alMarcar }) {
  const [abierta, setAbierta] = useState(false)
  const acento = colorNodo(nodo)
  const aprobada = estado === ESTADO.APROBADA
  const cursando = estado === ESTADO.CURSANDO

  const prerrequisitos = (relaciones.atras.get(nodo.codigo) ?? [])
    .map((c) => porCodigo.get(c))
    .filter(Boolean)

  return (
    <li className="transicion-tema overflow-hidden rounded-xl border border-panel-borde bg-panel">
      <div className="flex items-stretch">
        {/* Marcar aprobada de un toque: es la accion mas frecuente */}
        <button
          type="button"
          onClick={() => alMarcar(nodo.codigo, aprobada ? null : ESTADO.APROBADA)}
          aria-label={aprobada ? 'Desmarcar' : 'Marcar como aprobada'}
          className="grid w-12 shrink-0 place-items-center border-r border-panel-borde"
          style={{
            backgroundColor: aprobada
              ? 'color-mix(in oklab, var(--estado-aprobada) 16%, transparent)'
              : 'transparent',
          }}
        >
          <span
            className="grid size-6 place-items-center rounded-md border-2 transition-colors"
            style={{
              borderColor: COLOR_ESTADO[estado],
              backgroundColor: aprobada ? 'var(--estado-aprobada)' : 'transparent',
            }}
          >
            {aprobada && <Check size={14} className="text-[var(--panel)]" strokeWidth={3.5} />}
            {cursando && <CircleDot size={13} style={{ color: COLOR_ESTADO[estado] }} />}
            {estado === ESTADO.BLOQUEADA && (
              <Lock size={12} style={{ color: COLOR_ESTADO[estado] }} />
            )}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAbierta((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left"
        >
          <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: acento }} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-bold text-tinta">
              {nodo.nombre}
            </span>
            {/* El area solo existe donde esta clasificada a mano. Sin ella
                no se pinta el separador, o quedaria un "· undefined". */}
            <span className="block font-mono text-[10px] text-tinta-tenue">
              {codigoVisible(nodo)}
              {nodo.uc != null && ` · ${nodo.uc} UC`}
              {nodo.area && ` · ${etiquetaArea(nodo.area)}`}
            </span>
          </span>
          <ChevronDown
            size={16}
            className={`shrink-0 text-tinta-tenue transition-transform ${abierta ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {abierta && (
        <div className="border-t border-panel-borde px-3 py-3">
          <div className="flex gap-2">
            <Boton
              icono={Check}
              texto="Aprobada"
              activo={aprobada}
              color="var(--estado-aprobada)"
              alPulsar={() => alMarcar(nodo.codigo, aprobada ? null : ESTADO.APROBADA)}
            />
            <Boton
              icono={CircleDot}
              texto="Cursando"
              activo={cursando}
              color="var(--estado-cursando)"
              alPulsar={() => alMarcar(nodo.codigo, cursando ? null : ESTADO.CURSANDO)}
            />
          </div>

          <p className="mt-3 text-[10px] font-bold tracking-wide text-tinta-tenue uppercase">
            Requiere ({prerrequisitos.length})
          </p>
          {prerrequisitos.length === 0 ? (
            <p className="text-[11px] text-tinta-tenue">Nada: puedes verla desde el inicio.</p>
          ) : (
            <ul className="mt-1 flex flex-col gap-1">
              {prerrequisitos.map((p) => (
                <li key={p.codigo} className="flex items-center gap-2 text-[11px]">
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: colorNodo(p) }}
                  />
                  <span className="min-w-0 flex-1 truncate text-tinta-suave">{p.nombre}</span>
                  {estados[p.codigo] === ESTADO.APROBADA ? (
                    <Check size={12} className="shrink-0 text-aprobada" />
                  ) : (
                    <span className="shrink-0 text-[9px] text-tinta-tenue">pendiente</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  )
}

/**
 * Vista de lista por semestres. Es la que se ve por defecto en movil: el
 * grafo completo mide 3200 px de ancho y en un telefono solo cabe a escala
 * 0.10, donde el texto no se lee. Aqui la informacion es la misma pero en
 * un formato que si funciona con el pulgar.
 */
function VistaLista({ layout, estados, avanceGrupos, alMarcar }) {
  const { columnas, nodos, electivas, gruposElectivas, relaciones, porCodigo } = layout

  const porSemestre = useMemo(() => {
    const mapa = new Map()
    for (const n of nodos) {
      if (!mapa.has(n.semestre)) mapa.set(n.semestre, [])
      mapa.get(n.semestre).push(n)
    }
    return mapa
  }, [nodos])

  // Los grupos que no pertenecen a un semestre cierran la lista. Son N y los
  // define el pensum: Sistemas trae dos de electivas y Agronomica ademas las
  // Areas de Grado.
  const secciones = useMemo(
    () =>
      gruposElectivas.map((g) => ({
        ...g,
        avance: avanceGrupos[g.clave],
        items: electivas.filter((e) => e.grupo === g.clave),
      })),
    [gruposElectivas, electivas, avanceGrupos],
  )

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-2xl flex-col gap-5 p-4">
        {columnas.map((columna) => {
          const todas = porSemestre.get(columna.semestre) ?? []
          // Los huecos de electiva se listan al final del semestre, pero no
          // cuentan en el marcador: no son materias que se puedan aprobar.
          const materias = todas.filter((n) => !n.esHueco)
          const huecos = todas.filter((n) => n.esHueco)
          const aprobadas = materias.filter((m) => estados[m.codigo] === ESTADO.APROBADA).length

          return (
            <section key={columna.semestre}>
              <header className="transicion-tema sticky top-0 z-10 -mx-1 mb-2 flex items-baseline justify-between bg-lienzo px-1 py-2">
                <h2 className="flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-extrabold text-tinta">
                    {String(columna.semestre).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] font-bold tracking-[0.2em] text-tinta-suave">
                    SEMESTRE
                  </span>
                </h2>
                <span className="font-mono text-[10px] text-tinta-tenue">
                  {aprobadas}/{materias.length} · {columna.uc} UC
                </span>
              </header>

              <ul className="flex flex-col gap-2">
                {materias.map((nodo) => (
                  <FilaMateria
                    key={nodo.codigo}
                    nodo={nodo}
                    estado={estados[nodo.codigo]}
                    relaciones={relaciones}
                    porCodigo={porCodigo}
                    estados={estados}
                    alMarcar={alMarcar}
                  />
                ))}
                {huecos.map((nodo) => (
                  <li
                    key={nodo.codigo}
                    className="rounded-xl border border-dashed border-panel-borde px-3 py-2.5 text-[12px] font-semibold text-tinta-suave"
                  >
                    {nodo.nombre}
                    <span className="mt-0.5 block text-[10px] font-medium text-tinta-tenue">
                      Elígela abajo, en la zona de electivas
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}

        {secciones.map((grupo) => (
          <section key={grupo.clave}>
            <header className="transicion-tema sticky top-0 z-10 -mx-1 mb-2 bg-lienzo px-1 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-[11px] font-extrabold tracking-[0.18em] text-tinta">
                  {grupo.titulo}
                </h2>
                {/* Sin cuota oficial se dice lo que llevas y ya: un
                    denominador inventado seria peor que no poner ninguno. */}
                <span
                  className="shrink-0 font-mono text-[10px] font-bold"
                  style={{
                    color: grupo.avance?.completa
                      ? 'var(--estado-aprobada)'
                      : 'var(--estado-cursando)',
                  }}
                >
                  {grupo.avance?.meta != null
                    ? `${grupo.avance.uc}/${grupo.avance.meta} UC`
                    : `${grupo.avance?.uc ?? 0} UC`}
                </span>
              </div>
              <p className="text-[10px] text-tinta-tenue">
                {grupo.tipo === 'informativa'
                  ? 'Catálogo informativo: confirma con control de estudios cuántas debes cursar.'
                  : grupo.cuota != null
                    ? 'Elige las que quieras hasta cubrir la cuota.'
                    : 'Elige las que quieras. No tenemos la cuota oficial de esta carrera.'}
              </p>
            </header>
            <ul className="flex flex-col gap-2">
              {grupo.items.map((nodo) => (
                <FilaMateria
                  key={nodo.codigo}
                  nodo={nodo}
                  estado={estados[nodo.codigo]}
                  relaciones={relaciones}
                  porCodigo={porCodigo}
                  estados={estados}
                  alMarcar={alMarcar}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

export default VistaLista
