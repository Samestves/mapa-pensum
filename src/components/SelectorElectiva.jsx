import { useMemo, useState } from 'react'
import { Check, Info, Lock, Search, X } from 'lucide-react'
import { sinTildes } from '../data/texto'
import { ESTADO } from '../data/estados'
import { colorNodo } from '../theme/areas'
import { codigoVisible } from '../data/codigoVisible'
import { useEsTelefono } from '../hooks/useEsTelefono'
import { tituloGrupo } from '../layout/franjaElectivas'
import HojaInferior from './HojaInferior'
import VentanaFlotante from './VentanaFlotante'
import { CuotaGrupo } from './PiezasAvance'

const TITULO = 'text-[11px] font-semibold tracking-[0.14em] text-tinta-tenue uppercase'

/* Con menos opciones el buscador estorba mas de lo que ayuda, y en un
   telefono ademas levanta el teclado encima de lo que vienes a leer. */
const BUSCADOR_DESDE = 10

/* La lista va en tres bloques, en el orden en que sirven para decidir:
   lo que ya aprobaste -ponerlo cierra la casilla de una vez-, lo que puedes
   inscribir y, al final, lo que aun no. Alfabetico dentro de cada bloque. */
const BLOQUES = [
  { titulo: 'Ya aprobadas', entra: (e) => e === ESTADO.APROBADA },
  { titulo: 'Puedes inscribirlas', entra: (e) => e !== ESTADO.APROBADA && e !== ESTADO.BLOQUEADA },
  { titulo: 'Te faltan prelaciones', entra: (e) => e === ESTADO.BLOQUEADA },
]

/**
 * Elegir que electiva va en una casilla del pensum.
 *
 * Se abre al pulsar una casilla y enseña SOLO las de su grupo: en una casilla
 * sociohumanistica no se ofrece una tecnica, porque no contaria para esa
 * cuota aunque quepa en el hueco. Filtrar aqui evita tener que explicar
 * despues por que una eleccion no sumo.
 *
 * El marco es el de todo lo demas que se abre encima: en el telefono la hoja
 * que sube desde abajo (como el avance), en escritorio una tarjeta flotante
 * con la misma piel. Lo de dentro es igual en los dos.
 *
 * Recuerda la ultima casilla abierta: al cerrarse, la hoja del telefono baja
 * enseñando lo que tenia, no vacia.
 */
function SelectorElectiva({ codigo, porCodigo, grupos, alCerrar, ...resto }) {
  const telefono = useEsTelefono()
  const [ultima, setUltima] = useState(codigo)
  if (codigo && codigo !== ultima) setUltima(codigo)

  const casilla = porCodigo.get(codigo ?? ultima)
  if (!casilla || (!telefono && !codigo)) return null

  const grupo = grupos.find((g) => g.clave === casilla.grupo)
  const opciones = grupo?.asignaturas ?? []
  const etiqueta = `Elegir ${casilla.nombre}`
  const cabecera = (
    <Cabecera casilla={casilla} grupo={grupo} opciones={opciones} alCerrar={alCerrar} telefono={telefono} />
  )
  const contenido = (
    <Contenido
      key={casilla.codigo}
      casilla={casilla}
      grupo={grupo}
      opciones={opciones}
      alCerrar={alCerrar}
      {...resto}
    />
  )

  return telefono ? (
    <HojaInferior abierta={codigo != null} alCerrar={alCerrar} etiqueta={etiqueta} cabecera={cabecera}>
      {contenido}
    </HojaInferior>
  ) : (
    <VentanaFlotante etiqueta={etiqueta} alCerrar={alCerrar} cabecera={cabecera}>
      {contenido}
    </VentanaFlotante>
  )
}

function Cabecera({ casilla, grupo, opciones, alCerrar, telefono }) {
  /* Una casilla de la franja no tiene semestre: es de las carreras de las
     que la UDO no publica ruta de electivas. */
  const donde = casilla.semestre == null && grupo ? tituloGrupo(grupo) : `Semestre ${casilla.semestre}`

  return (
    <header className={`flex items-start justify-between gap-3 px-5 pb-4 ${telefono ? 'pt-1' : 'pt-5'}`}>
      <div className="min-w-0">
        <p className={TITULO}>
          {donde} · {opciones.length} opciones
        </p>
        <h2 className="mt-1 text-[17px] leading-snug font-semibold tracking-[-0.01em] text-tinta">
          {casilla.nombre}
        </h2>
      </div>
      <button
        type="button"
        onClick={alCerrar}
        aria-label="Cerrar"
        className="grid size-8 shrink-0 place-items-center rounded-full bg-tinta/[0.08] text-tinta-suave transition-[background-color,color,transform] hover:bg-tinta/[0.12] hover:text-tinta active:scale-90"
      >
        <X size={16} strokeWidth={2.2} />
      </button>
    </header>
  )
}

function Contenido({ casilla, grupo, opciones, estados, casillaDe, alColocar, alCerrar }) {
  const [busqueda, setBusqueda] = useState('')

  const puesta = opciones.find((o) => casillaDe[o.codigo] === casilla.codigo) ?? null
  const enFranja = casilla.semestre == null
  /* Una electiva aprobada o en curso no sale de la franja: volveria a entrar
     sola, porque sigue siendo parte de tu pensum. Ofrecer quitarla seria un
     boton que no hace nada. */
  const puestaFija =
    enFranja &&
    puesta != null &&
    (estados[puesta.codigo] === ESTADO.APROBADA || estados[puesta.codigo] === ESTADO.CURSANDO)

  /* Lo que se cuenta es la cuota en UNIDADES DE CREDITO, no casillas. Las
     humanisticas piden 6 UC y las hay de 2 y de 3: con dos de 3 cumples y te
     sobra una casilla para siempre. Contar casillas le diria a esa persona
     que le falta una materia cuando ya termino. Las casillas son la ruta que
     sugiere la UDO; la cuota en UC es la verdad. */
  const ucColocadas = useMemo(
    () => opciones.reduce((s, o) => s + (casillaDe[o.codigo] ? (o.uc ?? 0) : 0), 0),
    [opciones, casillaDe],
  )

  const bloques = useMemo(() => {
    const q = sinTildes(busqueda.trim())
    const lista = (
      q ? opciones.filter((o) => sinTildes(o.nombre).includes(q) || o.codigo.includes(q)) : [...opciones]
    ).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    return BLOQUES.map((b) => ({
      titulo: b.titulo,
      filas: lista.filter((o) => b.entra(estados[o.codigo])),
    })).filter((b) => b.filas.length > 0)
  }, [opciones, busqueda, estados])

  const elegir = (o) => {
    const aqui = casillaDe[o.codigo] === casilla.codigo
    /* En la franja, una que ya esta en tu mapa no se mueve de casilla: solo
       cambiaria de orden, que ahi no significa nada. */
    if (enFranja && casillaDe[o.codigo] && !aqui) alCerrar()
    else alColocar(casilla.codigo, aqui ? null : o.codigo)
  }

  return (
    <div className="flex flex-col gap-5 px-5 pb-5">
      {grupo?.cuota != null && (
        <CuotaGrupo
          avance={{
            titulo: 'UC elegidas de este grupo',
            uc: ucColocadas,
            meta: grupo.cuota,
            completa: ucColocadas >= grupo.cuota,
          }}
        />
      )}

      {puesta && (
        <Puesta
          materia={puesta}
          enFranja={enFranja}
          alQuitar={puestaFija ? null : () => alColocar(casilla.codigo, null)}
        />
      )}

      {opciones.length > BUSCADOR_DESDE && (
        <label className="flex h-10 items-center gap-2.5 rounded-full bg-tinta/[0.05] px-4 transition-colors focus-within:bg-tinta/[0.08]">
          <Search size={15} className="shrink-0 text-tinta-tenue" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o código"
            aria-label="Buscar electiva"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-tinta outline-none placeholder:text-tinta-tenue"
          />
        </label>
      )}

      {bloques.map((b) => (
        <section key={b.titulo}>
          <h3 className={`mb-1.5 px-1 ${TITULO}`}>{b.titulo}</h3>
          <ul className="-mx-2 flex flex-col">
            {b.filas.map((o) => (
              <li key={o.codigo}>
                <FilaElectiva
                  materia={o}
                  estado={estados[o.codigo]}
                  aqui={casillaDe[o.codigo] === casilla.codigo}
                  enOtra={casillaDe[o.codigo] != null && casillaDe[o.codigo] !== casilla.codigo}
                  enFranja={enFranja}
                  alElegir={elegir}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {bloques.length === 0 && (
        <p className="py-6 text-center text-[13px] text-tinta-tenue">Ninguna coincide con «{busqueda}»</p>
      )}

      {/* El semestre de la casilla es la ruta que sugiere la UDO, no un
          registro de cuando la cursaste. Sin esta nota, alguien que curso
          una tecnica en otro semestre pensaria que el mapa le dice que lo
          hizo mal. Va al pie: es contexto, no lo primero que hay que leer. */}
      <p className="flex items-start gap-2 text-[12px] leading-snug text-tinta-tenue">
        <Info size={13} className="mt-px shrink-0" />
        {enFranja
          ? 'La UDO no publica en qué semestre va cada electiva de esta carrera. Añade las que vayas a cursar y quedan en tu mapa, debajo de los semestres.'
          : 'El semestre es la ruta que sugiere la UDO. Si la cursaste en otro, ponla igual: para el título cuentan las UC, no el semestre.'}
      </p>
    </div>
  )
}

/** El cuadrito de color de la materia con sus UC: lo que llena la cuota. */
function FichaUc({ materia, apagada }) {
  const color = colorNodo(materia)
  return (
    <span
      className="flex size-10 shrink-0 flex-col items-center justify-center rounded-[12px] leading-none tabular-nums"
      style={{
        backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)`,
        color: `color-mix(in oklab, ${color} 72%, var(--tinta))`,
        opacity: apagada ? 0.5 : undefined,
      }}
    >
      <span className="text-[15px] font-semibold">{materia.uc}</span>
      <span className="mt-0.5 text-[8.5px] font-semibold tracking-[0.08em]">UC</span>
    </span>
  )
}

/** La que ocupa la casilla ahora, arriba del todo y con su forma de quitarla. */
function Puesta({ materia, enFranja, alQuitar }) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] bg-tinta/[0.04] p-2.5 pr-3">
      <FichaUc materia={materia} />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold tracking-[0.1em] text-aprobada uppercase">
          {enFranja ? 'En tu mapa' : 'En esta casilla'}
        </p>
        <p className="truncate text-[14px] font-medium text-tinta">{materia.nombre}</p>
      </div>
      {alQuitar && (
        <button
          type="button"
          onClick={alQuitar}
          className="boton-peligro h-8 shrink-0 rounded-full bg-tinta/[0.06] px-3.5 text-[12.5px] font-medium text-tinta-suave transition-[background-color,color] duration-200"
        >
          Quitar
        </button>
      )}
    </div>
  )
}

/**
 * Una opcion. Dice lo que importa al decidir: sus UC, si ya la aprobaste o la
 * cursas, si esta en otra casilla -ponerla aqui la mueve, no la duplica- y
 * si le faltan prelaciones, que no impide ponerla -se puede planificar para
 * mas adelante- pero conviene saberlo antes.
 */
function FilaElectiva({ materia, estado, aqui, enOtra, enFranja, alElegir }) {
  const bloqueada = estado === ESTADO.BLOQUEADA
  const nota =
    (estado === ESTADO.APROBADA && { texto: 'Aprobada', color: 'var(--estado-aprobada)' }) ||
    (estado === ESTADO.CURSANDO && { texto: 'Cursando', color: 'var(--estado-cursando)' }) ||
    (enOtra && { texto: enFranja ? 'Ya en tu mapa' : 'En otra casilla' }) ||
    null

  return (
    <button
      type="button"
      aria-pressed={aqui}
      onClick={() => alElegir(materia)}
      className={`fila-electiva flex w-full cursor-pointer items-center gap-3 rounded-[16px] px-2 py-2 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--estado-aprobada)] ${
        aqui ? 'bg-[color-mix(in_oklab,var(--estado-aprobada)_11%,transparent)]' : 'hover:bg-tinta/[0.05]'
      }`}
    >
      <FichaUc materia={materia} apagada={bloqueada} />
      <span className="min-w-0 flex-1">
        <span
          className={`line-clamp-2 text-[14px] leading-snug font-medium ${bloqueada ? 'text-tinta-suave' : 'text-tinta'}`}
        >
          {materia.nombre}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-tinta-tenue">
          <span className="tabular-nums">{codigoVisible(materia)}</span>
          {bloqueada && <Lock size={11} className="shrink-0" aria-hidden="true" />}
          {nota && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-medium" style={{ color: nota.color }}>
                {nota.texto}
              </span>
            </>
          )}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={`grid size-[22px] shrink-0 place-items-center rounded-full border-2 transition-[background-color,border-color] duration-200 ${
          aqui ? 'border-transparent bg-aprobada text-[var(--lienzo)]' : 'border-tinta/15'
        }`}
      >
        {aqui && <Check size={13} strokeWidth={3} />}
      </span>
    </button>
  )
}

export default SelectorElectiva
