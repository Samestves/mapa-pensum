import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CornerDownLeft, Search } from 'lucide-react'
import { ESTADO } from '../data/estados'
import { colorNodo } from '../theme/areas'
import { ETIQUETA_ESTADO } from '../theme/estados'
import { codigoVisible } from '../data/codigoVisible'
import { useCerrarConEscape } from '../hooks/useCerrarConEscape'
import { useFocoAtrapado } from '../hooks/useFocoAtrapado'

/* Quita tildes y baja a minusculas: nadie escribe "Matemáticas" con tilde en
   un buscador. Es la misma funcion que usa el buscador del horario; si
   aparece una tercera, toca sacarla a un modulo. */
const normalizar = (t) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

const TOPE_MATERIAS = 7
const TOPE_CARRERAS = 4

/** Una fila de resultado. El icono lo pone quien la crea. */
function Fila({ resultado, activa, alElegir, alSenalar }) {
  const { etiqueta, detalle, icono: Ico, color, insignia } = resultado

  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={activa}
        onClick={alElegir}
        /* Al mover el raton se mueve tambien la seleccion del teclado. Sin
           esto quedan dos filas resaltadas -la del raton y la del teclado- y
           al pulsar Enter se ejecuta la que no estas mirando. */
        onPointerMove={alSenalar}
        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
          activa ? 'bg-panel-suave' : ''
        }`}
      >
        {Ico && (
          <Ico size={15} className="shrink-0" style={color ? { color } : undefined} aria-hidden="true" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-semibold text-tinta">{etiqueta}</span>
          {detalle && (
            <span className="block truncate text-[10.5px] text-tinta-tenue">{detalle}</span>
          )}
        </span>
        {insignia && (
          <span className="shrink-0 text-[9.5px] font-bold text-tinta-tenue">{insignia}</span>
        )}
        {/* La flecha solo en la fila activa: dice que Enter va A ESTA */}
        {activa && <CornerDownLeft size={13} className="shrink-0 text-tinta-tenue" />}
      </button>
    </li>
  )
}

/**
 * La paleta de comandos: Ctrl+K, o ⌘K en un Mac.
 *
 * Resuelve dos cosas que no tenian nada que ver entre si hasta que se juntan
 * aqui.
 *
 * Una: no habia busqueda. Cuatrocientas ochenta y una materias repartidas en
 * nueve carreras y la unica forma de llegar a una era mirar el mapa hasta dar
 * con ella. Ahora se escriben tres letras y esta.
 *
 * Y dos: la cabecera se estaba llenando de acciones sueltas. Planificar
 * media 98 px al lado de tres pestañas de 90 con el mismo icono y la misma
 * palabra, asi que no se leia como algo de otra clase sino como la cuarta
 * pestaña, la que se quedo fuera del riel. Aqui dentro caben las acciones
 * sin pelearse con la navegacion, porque una paleta no tiene jerarquia
 * visual que respetar: todo son filas.
 *
 * Se escribio a mano en vez de traer cmdk, que es la libreria estandar para
 * esto. No por gusto: se midio. cmdk arrastra Radix Dialog entero y son 15,7
 * kB comprimidos sobre un total de 123, o sea un 13% mas de JavaScript por
 * una pantalla. Lo que aporta -filtrar, moverse con flechas y los papeles
 * ARIA- son las doscientas lineas de aqui, y la mitad ya estaba escrita en
 * este proyecto: normalizar viene del buscador del horario y el foco lo
 * encierra el mismo hook que usan los modales.
 */
function PaletaComandos({ abierta, alCerrar, acciones, materias, estados, carreras, alIrAMateria, alIrACarrera }) {
  const refCaja = useRef(null)
  const refEntrada = useRef(null)
  const [texto, setTexto] = useState('')
  const [activa, setActiva] = useState(0)

  useCerrarConEscape(alCerrar)
  /* El foco se encierra pero NO se pone en el primer control: lo pone el
     efecto de abajo en el campo de texto, que es donde tiene que estar. */
  useFocoAtrapado(refCaja, abierta, false)

  /* Al abrir, foco al campo y campo en blanco. Lo segundo hay que hacerlo a
     mano: el componente no se desmonta al cerrarse -devuelve null despues de
     los hooks, que es lo que permite que el atajo siga escuchando-, asi que
     sin esto la paleta reabria con lo ultimo que se busco y con la fila de
     entonces seleccionada. Se abre para buscar algo nuevo, no para volver a
     lo de antes. */
  useEffect(() => {
    if (!abierta) return
    setTexto('')
    setActiva(0)
    refEntrada.current?.focus()
  }, [abierta])

  const busca = normalizar(texto.trim())

  const resultados = useMemo(() => {
    const coincide = (t) => normalizar(t).includes(busca)

    const acts = acciones
      .filter((a) => !busca || coincide(a.etiqueta) || (a.pista && coincide(a.pista)))
      .map((a) => ({ ...a, grupo: 'Acciones', clave: 'a:' + a.id }))

    /* Sin escribir nada no se listan las materias. Son sesenta por carrera y
       llenarian la paleta de ruido antes de que nadie busque nada; las
       acciones, que son seis, si caben y son lo que se viene a hacer. */
    const mats = !busca
      ? []
      : materias
          .filter((m) => coincide(m.nombre) || codigoVisible(m).includes(texto.trim()))
          .slice(0, TOPE_MATERIAS)
          .map((m) => ({
            clave: 'm:' + m.codigo,
            grupo: 'Materias',
            etiqueta: m.nombre,
            detalle: `${codigoVisible(m)}${m.semestre ? ` · Semestre ${m.semestre}` : ''}`,
            insignia: ETIQUETA_ESTADO[estados[m.codigo] ?? ESTADO.BLOQUEADA],
            color: colorNodo(m),
            icono: null,
            ejecutar: () => alIrAMateria(m.codigo),
          }))

    const carrs = !busca
      ? []
      : carreras
          .filter((c) => coincide(c.nombre) || coincide(c.nombreCorto ?? ''))
          .slice(0, TOPE_CARRERAS)
          .map((c) => ({
            clave: 'c:' + c.slug,
            grupo: 'Carreras',
            etiqueta: c.nombre,
            detalle: 'Cambiar de carrera',
            ejecutar: () => alIrACarrera(c.slug),
          }))

    return [...acts, ...mats, ...carrs]
  }, [busca, texto, acciones, materias, estados, carreras, alIrAMateria, alIrACarrera])

  // Al cambiar lo escrito, la seleccion vuelve arriba
  useEffect(() => setActiva(0), [busca])

  if (!abierta) return null

  const mover = (paso) => {
    if (!resultados.length) return
    setActiva((i) => (i + paso + resultados.length) % resultados.length)
  }

  const ejecutar = (r) => {
    if (!r) return
    r.ejecutar()
    alCerrar()
  }

  const alTeclear = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      mover(1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      mover(-1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      ejecutar(resultados[activa])
    }
  }

  // Los grupos se dibujan sobre la lista YA ordenada, para que el indice que
  // maneja el teclado y el que se pinta sean el mismo numero
  let grupoAnterior = null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={alCerrar}
        className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm"
      />

      <div
        ref={refCaja}
        role="dialog"
        aria-modal="true"
        aria-label="Buscar y ejecutar"
        className="surgir transicion-tema relative flex max-h-[70vh] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border border-panel-borde bg-panel shadow-2xl"
      >
        <div className="flex shrink-0 items-center gap-2.5 border-b border-panel-borde px-4">
          <Search size={16} className="shrink-0 text-tinta-tenue" aria-hidden="true" />
          <input
            ref={refEntrada}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={alTeclear}
            placeholder="Busca una materia o una acción…"
            aria-label="Buscar"
            role="combobox"
            aria-expanded="true"
            aria-controls="paleta-resultados"
            aria-activedescendant={resultados[activa] ? `paleta-${resultados[activa].clave}` : undefined}
            className="seleccionable min-w-0 flex-1 bg-transparent py-3.5 text-[13.5px] text-tinta outline-none placeholder:text-tinta-tenue"
          />
        </div>

        {resultados.length === 0 ? (
          <p className="px-4 py-6 text-center text-[12px] text-tinta-tenue">
            Nada coincide con «{texto.trim()}».
          </p>
        ) : (
          <ul id="paleta-resultados" role="listbox" className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {resultados.map((r, i) => {
              const abreGrupo = r.grupo !== grupoAnterior
              grupoAnterior = r.grupo
              return (
                <div key={r.clave} id={`paleta-${r.clave}`}>
                  {abreGrupo && (
                    <p className="px-2.5 pt-2 pb-1 text-[9.5px] font-extrabold tracking-wider text-tinta-tenue uppercase">
                      {r.grupo}
                    </p>
                  )}
                  <Fila
                    resultado={r}
                    activa={i === activa}
                    alElegir={() => ejecutar(r)}
                    alSenalar={() => setActiva(i)}
                  />
                </div>
              )
            })}
          </ul>
        )}

        {/* La pista de teclas solo donde hay teclas. En un telefono es una
            linea que ocupa sitio para explicar tres cosas que no se pueden
            hacer. */}
        <p className="hidden shrink-0 border-t border-panel-borde px-4 py-2 text-[10px] text-tinta-tenue sm:block">
          ↑↓ para moverte · Enter para abrir · Esc para cerrar
        </p>
      </div>
    </div>,
    document.body,
  )
}

export default PaletaComandos
