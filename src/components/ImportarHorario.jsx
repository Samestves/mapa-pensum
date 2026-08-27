import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronDown,
  ImageUp,
  Loader2,
  RotateCw,
  Maximize2,
  Minimize2,
  Sparkles,
  TriangleAlert,
  X,
} from 'lucide-react'
import { useCerrarConEscape } from '../hooks/useCerrarConEscape'
import { useFocoAtrapado } from '../hooks/useFocoAtrapado'
import { FORMATOS, SE_REINTENTA, leerHorarioDeImagen, prepararImagen } from '../data/leerHorario'
import { DIAS, aSesiones, avisosDe, marcarChoques, revisar } from '../layout/importarHorario'
import { aTexto, enDoceHoras } from '../layout/horario'

/* Por que una fila no se puede añadir tal cual. El texto dice el problema, no
   la solucion: los controles de debajo ya enseñan que se puede tocar, y
   repetirlo por escrito en cada fila llenaria la pantalla de instrucciones. */
const AVISO = {
  'sin-materia': 'No encontré esta materia en el pensum',
  'sin-dia': 'No entendí el día',
  'sin-hora': 'No entendí la hora',
  fuera: 'Queda fuera de la jornada',
  corta: 'Dura menos de media hora',
  choca: 'Se pisa con otra clase: desmarca una de las dos',
}

/* Que dice la cabecera en cada fase. En una tabla y no en un ternario dentro
   del JSX porque son tres estados con dos lineas cada uno: metido en linea,
   el de error se quedo diciendo "Leyendo tu horario. Suele tardar unos
   segundos" encima de un mensaje de fallo. */
const TITULO = {
  leyendo: { titulo: 'Leyendo tu horario', pie: 'Suele tardar unos segundos.' },
  revisar: {
    titulo: 'Revisa lo que leí',
    pie: 'Marca lo que quieras añadir. Nada entra a tu horario hasta que confirmes.',
  },
  error: { titulo: 'No pude leerlo', pie: 'Tu horario no se ha tocado.' },
}

const aMinutosDeCampo = (texto) => {
  const [h, m] = String(texto).split(':').map(Number)
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null
}

/** Una fila leída, con lo que se entendió y lo que se puede corregir. */
function Fila({ candidata, materias, abierta, alAbrir, alCambiar, alAlternar }) {
  const { materia, dia, inicio, fin, avisos, incluir, leido, seccion, aula } = candidata
  const roto = avisos.length > 0

  const resumen = [
    dia != null ? DIAS[dia] : null,
    inicio != null && fin != null ? `${enDoceHoras(inicio)} – ${enDoceHoras(fin)}` : null,
    seccion && `Sección ${seccion}`,
    aula,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <li className="transicion-tema border-b border-panel-borde last:border-b-0">
      <div className="flex items-start gap-3 px-4 py-3 sm:px-5">
        {/* La casilla es lo primero de la fila porque es la unica decision
            que hay que tomar en todas: entra o no entra. */}
        {/* La casilla sigue siendo util en una fila rota -desmarcar una de
            dos que chocan libera a la otra- pero no puede pintarse en verde:
            en verde dice "esta entra", y una fila con avisos no entra. En
            ambar dice lo que de verdad es, "la quieres pero todavia no
            puede". */}
        <input
          type="checkbox"
          checked={incluir}
          onChange={alAlternar}
          aria-label={`Añadir ${materia?.nombre ?? leido.nombre}`}
          className={`mt-0.5 size-[17px] shrink-0 ${
            roto ? 'accent-[var(--estado-cursando)]' : 'accent-[var(--estado-aprobada)]'
          }`}
        />

        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-[13px] font-bold ${
              materia ? 'text-tinta' : 'text-tinta-tenue italic'
            }`}
          >
            {materia?.nombre ?? leido.nombre ?? 'Sin nombre'}
          </p>

          {resumen && <p className="mt-0.5 truncate text-[11px] text-tinta-suave">{resumen}</p>}

          {/* Lo que decia la foto, cuando no coincide con lo que se entendio.
              Es la unica forma de comprobar una fila sin volver a abrir la
              imagen. */}
          {materia && leido.nombre && materia.nombre !== leido.nombre && (
            <p className="mt-0.5 truncate text-[10px] text-tinta-tenue">
              En la imagen: «{leido.nombre}»
            </p>
          )}

          {roto && (
            <p className="mt-1.5 flex items-start gap-1.5 text-[10.5px] leading-snug font-bold text-[var(--estado-cursando)]">
              <TriangleAlert size={12} className="mt-px shrink-0" />
              {avisos.map((a) => AVISO[a]).join(' · ')}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={alAbrir}
          aria-expanded={abierta}
          aria-label={abierta ? 'Cerrar los ajustes' : 'Ajustar esta clase'}
          className="grid size-7 shrink-0 place-items-center rounded-lg text-tinta-tenue transition-colors hover:bg-panel-suave hover:text-tinta"
        >
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${abierta ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {abierta && (
        <div className="grid grid-cols-2 gap-2 px-4 pb-3.5 sm:grid-cols-[1fr_auto_auto] sm:px-5">
          <select
            value={materia?.codigo ?? ''}
            onChange={(e) => alCambiar({ codigo: e.target.value || null })}
            aria-label="Materia"
            className="transicion-tema col-span-2 min-w-0 rounded-lg border border-panel-borde bg-panel px-2.5 py-2 text-[12px] text-tinta sm:col-span-1"
          >
            <option value="">— Elige la materia —</option>
            {materias.map((m) => (
              <option key={m.codigo} value={m.codigo}>
                {m.nombre}
              </option>
            ))}
          </select>

          <select
            value={dia ?? ''}
            onChange={(e) => alCambiar({ dia: e.target.value === '' ? null : Number(e.target.value) })}
            aria-label="Día"
            className="transicion-tema rounded-lg border border-panel-borde bg-panel px-2.5 py-2 text-[12px] text-tinta"
          >
            <option value="">— Día —</option>
            {DIAS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5">
            <input
              type="time"
              value={inicio == null ? '' : aTexto(inicio)}
              onChange={(e) => alCambiar({ inicio: aMinutosDeCampo(e.target.value) })}
              aria-label="Hora de inicio"
              className="transicion-tema w-full min-w-0 rounded-lg border border-panel-borde bg-panel px-2 py-2 text-[12px] text-tinta"
            />
            <span className="shrink-0 text-[11px] text-tinta-tenue">–</span>
            <input
              type="time"
              value={fin == null ? '' : aTexto(fin)}
              onChange={(e) => alCambiar({ fin: aMinutosDeCampo(e.target.value) })}
              aria-label="Hora de fin"
              className="transicion-tema w-full min-w-0 rounded-lg border border-panel-borde bg-panel px-2 py-2 text-[12px] text-tinta"
            />
          </div>
        </div>
      )}
    </li>
  )
}

/**
 * Leer un horario de una imagen, revisarlo y meterlo.
 *
 * El paso de revision no es una cortesia ni un adorno: es la diferencia entre
 * una herramienta y una apuesta. Lo que vuelve de la lectura es lo que un
 * modelo CREYO ver en una foto que puede estar torcida, con reflejos o a
 * medio enfocar, y una materia mal leida no se nota al importarla -se nota el
 * dia del parcial-. Asi que nada entra sin que alguien lo mire, y lo que no
 * cuadra se enseña roto en vez de arreglarse por dentro.
 *
 * Todo lo que decide si una fila esta bien vive en layout/importarHorario.js,
 * que es funcion pura y tiene sus pruebas. Aqui solo se dibuja y se recogen
 * las correcciones.
 */
function ImportarHorario({ archivo, materias, sesiones, alImportar, alCambiarImagen, alCerrar }) {
  const refCaja = useRef(null)
  const refArchivo = useRef(null)
  const [fase, setFase] = useState('leyendo')
  const [fallo, setFallo] = useState(null)
  const [imagen, setImagen] = useState(null)
  const [candidatas, setCandidatas] = useState([])
  const [abierta, setAbierta] = useState(null)
  const [ampliada, setAmpliada] = useState(false)

  /* Sube uno para volver a leer LA MISMA imagen. Es una dependencia del
     efecto y nada mas: sin el no habria forma de reintentar sin cambiar de
     archivo, y el fallo mas comun -que el modelo este lleno- se arregla
     exactamente con eso. */
  const [intento, setIntento] = useState(0)

  useCerrarConEscape(alCerrar)
  useFocoAtrapado(refCaja, true, false)

  useEffect(() => {
    const control = new AbortController()
    let preparada = null
    let vivo = true

    /* Se vuelve al principio en cada imagen. Elegir OTRA vez la misma foto da
       un File distinto con el mismo nombre, asi que el componente no se
       remonta y sin esto la pantalla se quedaria enseñando el error anterior
       mientras por detras vuelve a leer: parece que el boton no hizo nada. */
    setFase('leyendo')
    setFallo(null)
    setCandidatas([])
    setImagen(null)
    setAbierta(null)

    ;(async () => {
      try {
        preparada = await prepararImagen(archivo)
        if (!vivo) return
        setImagen(preparada)

        const filas = await leerHorarioDeImagen({
          base64: preparada.base64,
          tipo: preparada.tipo,
          materias: materias.map((m) => ({ codigo: m.codigo, nombre: m.nombre })),
          senal: control.signal,
        })
        if (!vivo) return

        setCandidatas(revisar(filas, materias, sesiones))
        setFase('revisar')
      } catch (e) {
        if (!vivo || e?.name === 'AbortError') return
        setFallo({ codigo: e.codigo, mensaje: e.message, detalle: e.detalle })
        setFase('error')
      }
    })()

    return () => {
      vivo = false
      control.abort()
      preparada?.soltar()
    }
    /* Solo el archivo. `materias` y `sesiones` se calculan con useMemo arriba
       pero cambian de identidad si la carrera se repinta, y volver a llamar a
       la lectura por eso costaria otra peticion -y otro trozo de cuota- por
       nada. Lo que importa es que la lectura ocurre UNA vez por imagen. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archivo, intento])

  const cambiar = (id, cambios) => {
    setCandidatas((previas) => {
      const tocadas = previas.map((c) => {
        if (c.id !== id) return c

        const siguiente = { ...c, ...cambios }
        if ('codigo' in cambios) {
          siguiente.materia = materias.find((m) => m.codigo === cambios.codigo) ?? null
          siguiente.codigo = siguiente.materia?.codigo ?? null
        }
        return { ...siguiente, avisos: avisosDe(siguiente) }
      })
      return marcarChoques(tocadas, sesiones)
    })
  }

  const alternar = (id) => {
    setCandidatas((previas) =>
      marcarChoques(
        previas.map((c) => (c.id === id ? { ...c, incluir: !c.incluir } : c)),
        sesiones,
      ),
    )
  }

  const listas = candidatas.filter((c) => c.incluir && !c.avisos.length)
  const conProblema = candidatas.filter((c) => c.avisos.length)

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-center overflow-hidden md:items-center md:p-4">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={alCerrar}
        className="fixed inset-0 cursor-default bg-black/55 backdrop-blur-[2px]"
      />

      <div
        ref={refCaja}
        role="dialog"
        aria-modal="true"
        aria-label="Leer mi horario de una imagen"
        className="surgir transicion-tema relative z-10 mt-auto flex max-h-[92dvh] w-full max-w-[640px] flex-col overflow-hidden rounded-t-2xl border border-panel-borde bg-panel shadow-2xl md:mt-0 md:max-h-[88vh] md:rounded-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-panel-borde px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-tinta">
              <Sparkles
                size={15}
                className={`shrink-0 ${
                  fase === 'error' ? 'text-tinta-tenue' : 'text-[var(--estado-aprobada)]'
                }`}
              />
              {TITULO[fase].titulo}
            </h2>
            <p className="mt-1 text-[11px] leading-snug text-tinta-suave">{TITULO[fase].pie}</p>
          </div>
          <button
            type="button"
            onClick={alCerrar}
            aria-label="Cerrar"
            className="-mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg text-tinta-tenue transition-colors hover:bg-panel-suave hover:text-tinta"
          >
            <X size={16} />
          </button>
        </header>

        {/* La imagen se queda a la vista durante toda la revision. Repasar
            catorce filas de texto sin poder mirar el original al lado es
            repasar a ciegas, y entonces nadie repasa: se confirma y ya. */}
        {imagen && (
          <div className="relative shrink-0 border-b border-panel-borde bg-panel-suave">
            <img
              src={imagen.vistaPrevia}
              alt="El horario que subiste"
              className={`mx-auto w-full object-contain transition-[max-height] duration-300 ${
                ampliada ? 'max-h-[58vh]' : 'max-h-[124px]'
              }`}
            />
            <button
              type="button"
              onClick={() => setAmpliada((v) => !v)}
              aria-label={ampliada ? 'Reducir la imagen' : 'Ampliar la imagen'}
              className="transicion-tema absolute right-2.5 bottom-2.5 grid size-8 place-items-center rounded-lg border border-panel-borde bg-panel/90 text-tinta-suave backdrop-blur transition-colors hover:text-tinta"
            >
              {ampliada ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>
        )}

        {fase === 'leyendo' && (
          <div className="flex min-h-[180px] flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
            <Loader2 size={22} className="animate-spin text-[var(--estado-aprobada)]" />
            <p className="text-[12.5px] font-bold text-tinta">
              {imagen ? 'Buscando tus clases…' : 'Preparando la imagen…'}
            </p>
            <p className="max-w-[34ch] text-[11px] leading-snug text-tinta-tenue">
              Estamos leyendo materias, días y horas para dejártelas listas.
            </p>
          </div>
        )}

        {fase === 'error' && (
          <div className="flex min-h-[180px] flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
            <TriangleAlert size={22} className="text-[var(--estado-rojo)]" />
            <p className="text-[12.5px] font-bold text-tinta">{fallo?.mensaje}</p>
            {/* El detalle tecnico se enseña porque es lo unico que distingue
                "se acabo la cuota" de "ese modelo ya no existe". Sin el,
                arreglarlo seria adivinar. */}
            {fallo?.detalle && (
              <p className="max-w-full overflow-x-auto font-mono text-[9.5px] break-all text-tinta-tenue">
                {String(fallo.detalle).slice(0, 220)}
              </p>
            )}
          </div>
        )}

        {fase === 'revisar' && (
          <>
            {candidatas.length === 0 ? (
              <div className="flex min-h-[160px] flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
                <p className="text-[12.5px] font-bold text-tinta">No encontré clases ahí.</p>
                <p className="max-w-[34ch] text-[11px] leading-snug text-tinta-tenue">
                  Prueba con una captura de pantalla o una foto más recta y con buena luz.
                </p>
              </div>
            ) : (
              <>
                <p className="shrink-0 border-b border-panel-borde bg-panel-suave px-4 py-2 text-[10.5px] text-tinta-tenue sm:px-5">
                  {listas.length === candidatas.length
                    ? `Las ${candidatas.length} entran`
                    : `Entran ${listas.length} de ${candidatas.length}`}
                  {conProblema.length > 0 &&
                    ` · ${conProblema.length} ${
                      conProblema.length === 1 ? 'necesita' : 'necesitan'
                    } un ajuste`}
                </p>
                <ul className="min-h-0 flex-1 overflow-y-auto">
                  {candidatas.map((c) => (
                    <Fila
                      key={c.id}
                      candidata={c}
                      materias={materias}
                      /* Las rotas nacen abiertas: si hay algo que arreglar,
                         que se vea con que se arregla sin tener que
                         descubrir que la fila se despliega. */
                      abierta={abierta === c.id || (abierta == null && c.avisos.length > 0)}
                      alAbrir={() => setAbierta(abierta === c.id ? '' : c.id)}
                      alCambiar={(cambios) => cambiar(c.id, cambios)}
                      alAlternar={() => alternar(c.id)}
                    />
                  ))}
                </ul>
              </>
            )}
          </>
        )}

        <footer className="flex shrink-0 gap-2 border-t border-panel-borde px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={alCerrar}
            className="transicion-tema rounded-xl border border-panel-borde px-4 py-2.5 text-[12.5px] font-bold text-tinta-suave transition-colors hover:text-tinta"
          >
            {fase === 'revisar' && listas.length ? 'Cancelar' : 'Volver'}
          </button>

          {/* Reintentar SIN salir. Casi todos los fallos de lectura se
              arreglan con otra foto -mas recta, con mas luz, una captura en
              vez de una foto de la pantalla-, y obligar a cerrar, volver a la
              bienvenida y buscar el archivo otra vez para probar eso es
              suficiente friccion para que nadie lo pruebe. */}
          {fase === 'error' && SE_REINTENTA.has(fallo?.codigo) && (
            <button
              type="button"
              onClick={() => setIntento((n) => n + 1)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-aprobada px-4 py-2.5 text-[12.5px] font-extrabold text-[var(--lienzo)] transition-transform active:scale-[0.98]"
            >
              <RotateCw size={15} />
              Reintentar
            </button>
          )}

          {(fase === 'error' || (fase === 'revisar' && candidatas.length === 0)) && (
            <button
              type="button"
              onClick={() => refArchivo.current?.click()}
              className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[12.5px] font-extrabold transition-transform active:scale-[0.98] ${
                fase === 'error' && SE_REINTENTA.has(fallo?.codigo)
                  ? 'transicion-tema border border-panel-borde text-tinta-suave hover:text-tinta'
                  : 'flex-1 bg-aprobada text-[var(--lienzo)]'
              }`}
            >
              <ImageUp size={15} />
              <span className={fase === 'error' && SE_REINTENTA.has(fallo?.codigo) ? 'hidden sm:inline' : ''}>
                Probar otra imagen
              </span>
            </button>
          )}

          <input
            ref={refArchivo}
            type="file"
            accept={FORMATOS}
            className="hidden"
            onChange={(e) => {
              const otra = e.target.files?.[0]
              e.target.value = ''
              if (otra) alCambiarImagen(otra)
            }}
          />

          {fase === 'revisar' && candidatas.length > 0 && (
            <button
              type="button"
              disabled={!listas.length}
              onClick={() => alImportar(aSesiones(candidatas))}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-aprobada px-4 py-2.5 text-[12.5px] font-extrabold text-[var(--lienzo)] transition-transform active:scale-[0.98] disabled:opacity-45"
            >
              {listas.length
                ? `Añadir ${listas.length} ${listas.length === 1 ? 'clase' : 'clases'}`
                : 'Nada que añadir'}
            </button>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  )
}

export default ImportarHorario
