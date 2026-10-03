import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ImageUp,
  Loader2,
  Maximize2,
  Minimize2,
  PencilLine,
  RotateCw,
  Sparkles,
  TriangleAlert,
  X,
} from 'lucide-react'
import { useCerrarConEscape } from '../hooks/useCerrarConEscape'
import { useFocoAtrapado } from '../hooks/useFocoAtrapado'
import { FASE, useLecturaHorario } from '../hooks/useLecturaHorario'
import { FORMATOS, SALIDA } from '../data/leerHorario'
import { aSesiones, avisosDe, marcarChoques } from '../layout/importarHorario'
import FilaLeida from './FilaLeida'

/* Que dice la cabecera en cada fase. En una tabla y no en un ternario dentro
   del JSX porque son cuatro estados con dos lineas cada uno: metido en linea,
   el de error se quedo diciendo "Leyendo tu horario. Suele tardar unos
   segundos" encima de un mensaje de fallo. */
const TITULO = {
  [FASE.LEYENDO]: { titulo: 'Leyendo tu horario', pie: 'Suele tardar unos segundos.' },
  [FASE.ESPERANDO]: {
    titulo: 'Hay cola en el lector',
    pie: 'Tu imagen ya está lista para leerse.',
  },
  [FASE.REVISAR]: {
    titulo: 'Revisa lo que leí',
    pie: 'Marca lo que quieras añadir. Nada entra a tu horario hasta que confirmes.',
  },
  [FASE.ERROR]: { titulo: 'No pude leerlo', pie: 'Tu horario no se ha tocado.' },
}

const BOTON = {
  principal:
    'flex flex-1 items-center justify-center gap-2 rounded-xl bg-aprobada px-4 py-2.5 text-[12.5px] font-semibold text-[var(--lienzo)] transition-transform active:scale-[0.98] disabled:opacity-45',
  secundario:
    'flex items-center justify-center gap-2 rounded-xl border border-panel-borde px-4 py-2.5 text-[12.5px] font-medium text-tinta-suave transition-colors hover:text-tinta',
}

/* `compacto` deja el boton en su icono en un telefono: al lado de la accion
   principal no cabe con el texto, y es ella la que tiene que leerse. */
function Boton({ tono = 'secundario', icono: Ico, compacto, children, ...resto }) {
  return (
    <button
      type="button"
      className={BOTON[tono]}
      aria-label={compacto ? children : undefined}
      {...resto}
    >
      {Ico && <Ico size={15} />}
      {compacto ? <span className="hidden sm:inline">{children}</span> : children}
    </button>
  )
}

/* El cuerpo de las fases que no tienen lista: un icono, una frase y, si hace
   falta, otra mas pequeña debajo. */
function Aviso({ icono, titulo, children }) {
  return (
    <div className="flex min-h-[180px] flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      {icono}
      <p className="text-[13px] font-normal text-tinta">{titulo}</p>
      {children && (
        <p className="max-w-[34ch] text-[11px] leading-snug text-tinta-tenue">{children}</p>
      )}
    </div>
  )
}

const segundosHasta = (instante) => Math.max(0, Math.ceil((instante - Date.now()) / 1000))

/* Los segundos que faltan. Lleva su propio reloj para que cada segundo se
   repinte un numero y no la hoja entera. */
function CuentaAtras({ hasta }) {
  const [quedan, setQuedan] = useState(() => segundosHasta(hasta))

  useEffect(() => {
    const reloj = setInterval(() => setQuedan(segundosHasta(hasta)), 500)
    return () => clearInterval(reloj)
  }, [hasta])

  return <span className="tabular-nums">{quedan}</span>
}

/* La imagen se queda a la vista durante toda la revision. Repasar catorce
   filas de texto sin poder mirar el original al lado es repasar a ciegas, y
   entonces nadie repasa: se confirma y ya. */
function FotoSubida({ imagen }) {
  const [ampliada, setAmpliada] = useState(false)

  return (
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
        className="absolute right-2.5 bottom-2.5 grid size-8 place-items-center rounded-lg border border-panel-borde bg-panel/90 text-tinta-suave backdrop-blur transition-colors hover:text-tinta"
      >
        {ampliada ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      </button>
    </div>
  )
}

/* Lo leido, fila a fila, con cuantas entran arriba. */
function Revision({ candidatas, listas, materias, alCambiar, alAlternar }) {
  /* Que fila tiene los ajustes abiertos. null es "todavia no se toco nada",
     y entonces las rotas nacen abiertas: si hay algo que arreglar, que se vea
     con que se arregla sin tener que descubrir que la fila se despliega. */
  const [abierta, setAbierta] = useState(null)
  const conProblema = candidatas.filter((c) => c.avisos.length).length

  return (
    <>
      <p className="shrink-0 border-b border-panel-borde bg-panel-suave px-4 py-2 text-[10.5px] text-tinta-tenue sm:px-5">
        {listas === candidatas.length
          ? `Las ${candidatas.length} entran`
          : `Entran ${listas} de ${candidatas.length}`}
        {conProblema > 0 &&
          ` · ${conProblema} ${conProblema === 1 ? 'necesita' : 'necesitan'} un ajuste`}
      </p>
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {candidatas.map((c) => (
          <FilaLeida
            key={c.id}
            candidata={c}
            materias={materias}
            abierta={abierta === c.id || (abierta == null && c.avisos.length > 0)}
            alAbrir={() => setAbierta(abierta === c.id ? '' : c.id)}
            alCambiar={(cambios) => alCambiar(c.id, cambios)}
            alAlternar={() => alAlternar(c.id)}
          />
        ))}
      </ul>
    </>
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
 * Aqui solo se dibuja y se recogen las correcciones. La lectura -preparar la
 * imagen, preguntar, esperar si hay cola- vive en useLecturaHorario, y lo que
 * decide si una fila esta bien, en layout/importarHorario.js, que es funcion
 * pura y tiene sus pruebas.
 */
function ImportarHorario({
  archivo,
  materias,
  sesiones,
  alImportar,
  alCambiarImagen,
  alCrearAMano,
  alCerrar,
}) {
  const refCaja = useRef(null)
  const refArchivo = useRef(null)
  const { fase, fallo, hasta, imagen, candidatas, setCandidatas, reintentar } = useLecturaHorario({
    archivo,
    materias,
    sesiones,
  })

  useCerrarConEscape(alCerrar)
  useFocoAtrapado(refCaja, true, false)

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

  const listas = candidatas.filter((c) => c.incluir && !c.avisos.length).length
  const sinClases = fase === FASE.REVISAR && candidatas.length === 0
  const elegirOtra = () => refArchivo.current?.click()

  const otraImagen = (tono, compacto) => (
    <Boton tono={tono} icono={ImageUp} compacto={compacto} onClick={elegirOtra}>
      Probar otra imagen
    </Boton>
  )
  const aMano = (tono) => (
    <Boton tono={tono} icono={PencilLine} onClick={alCrearAMano}>
      Crearlo a mano
    </Boton>
  )

  /* Lo que se ofrece al pie, ademas de volver. Una salida por situacion, la
     que la arregla: ver SALIDA en data/leerHorario.js. */
  const salidas = () => {
    if (fase === FASE.LEYENDO) return null
    // Quien no quiere esperar la cola tiene la otra forma de hacerlo
    if (fase === FASE.ESPERANDO) return aMano('secundario')
    if (sinClases) return otraImagen('principal')
    if (fase === FASE.REVISAR) {
      return (
        <Boton
          tono="principal"
          disabled={!listas}
          onClick={() => alImportar(aSesiones(candidatas))}
        >
          {listas ? `Añadir ${listas} ${listas === 1 ? 'clase' : 'clases'}` : 'Nada que añadir'}
        </Boton>
      )
    }
    if (fallo.salida === SALIDA.OTRA_IMAGEN) return otraImagen('principal')
    if (fallo.salida === SALIDA.REINTENTAR) {
      /* Reintentar SIN salir, y con la otra imagen al lado: obligar a cerrar,
         volver a la bienvenida y buscar el archivo otra vez es suficiente
         friccion para que nadie lo pruebe. */
      return (
        <>
          <Boton tono="principal" icono={RotateCw} onClick={reintentar}>
            Reintentar
          </Boton>
          {otraImagen('secundario', true)}
        </>
      )
    }
    return aMano('principal')
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-center overflow-hidden md:items-center md:p-4">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={alCerrar}
        className="fixed inset-0 cursor-default bg-black/55"
      />

      <div
        ref={refCaja}
        role="dialog"
        aria-modal="true"
        aria-label="Leer mi horario de una imagen"
        className="surgir relative z-10 mt-auto flex max-h-[92dvh] w-full max-w-[640px] flex-col overflow-hidden rounded-t-2xl border border-panel-borde bg-panel shadow-2xl md:mt-0 md:max-h-[88vh] md:rounded-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-panel-borde px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-[15px] font-normal tracking-[-0.01em] text-tinta">
              <Sparkles
                size={15}
                className={`shrink-0 ${
                  fase === FASE.ERROR ? 'text-tinta-tenue' : 'text-[var(--estado-aprobada)]'
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

        {imagen && <FotoSubida imagen={imagen} />}

        {fase === FASE.LEYENDO && (
          <Aviso
            icono={<Loader2 size={22} className="animate-spin text-[var(--estado-aprobada)]" />}
            titulo={imagen ? 'Buscando tus clases…' : 'Preparando la imagen…'}
          >
            Estamos leyendo materias, días y horas para dejártelas listas.
          </Aviso>
        )}

        {fase === FASE.ESPERANDO && (
          <Aviso
            icono={<Loader2 size={22} className="animate-spin text-tinta-tenue" />}
            titulo={
              <>
                Tu turno llega en <CuentaAtras hasta={hasta} /> s
              </>
            }
          >
            Mucha gente está leyendo su horario a la vez. No cierres esta pantalla: se vuelve a
            intentar sola.
          </Aviso>
        )}

        {fase === FASE.ERROR && (
          <Aviso
            icono={<TriangleAlert size={22} className="text-[var(--estado-rojo)]" />}
            titulo={fallo.message}
          />
        )}

        {sinClases && (
          <Aviso titulo="No encontré clases ahí.">
            Prueba con una captura de pantalla o una foto más recta y con buena luz.
          </Aviso>
        )}

        {fase === FASE.REVISAR && !sinClases && (
          <Revision
            candidatas={candidatas}
            listas={listas}
            materias={materias}
            alCambiar={cambiar}
            alAlternar={alternar}
          />
        )}

        <footer className="flex shrink-0 gap-2 border-t border-panel-borde px-4 py-3 sm:px-5">
          <Boton onClick={alCerrar}>
            {fase === FASE.REVISAR && listas ? 'Cancelar' : 'Volver'}
          </Boton>
          {salidas()}

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
        </footer>
      </div>
    </div>,
    document.body,
  )
}

export default ImportarHorario
