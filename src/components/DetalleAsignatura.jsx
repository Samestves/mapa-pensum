import { useLayoutEffect, useRef, useState } from 'react'
import { Info, Repeat2, X } from 'lucide-react'
import { ESTADO } from '../data/estados'
import { useEsTelefono } from '../hooks/useEsTelefono'
import { colorNodo, etiquetaArea } from '../theme/areas'
import { ASPECTO } from '../theme/situacion'
import { codigoVisible } from '../data/codigoVisible'
import ListaPrelaciones, { SIN_PRELACIONES } from './ListaPrelaciones'
import PicoPopover from './PicoPopover'
import { colocar } from '../layout/popover'
import { SITUACION } from '../layout/situacion'
import { IconoSituacion } from './IconoSituacion'

const ANCHO = 320
const MARGEN = 12

/* La cara de la ficha: la misma rejilla fina de las tarjetas del mapa.
   Esquina de 10 y no de 16 -la tarjeta tiene 7-, borde de un pixel y la
   sombra que la separa del mapa que queda debajo. */
const CARA_FICHA =
  'transicion-tema relative w-full rounded-[10px] border border-panel-borde bg-panel shadow-2xl'

/* El aro vacio de «sin cursar», de la misma familia que los otros dos:
   mismo radio y mismo trazo, sin nada dentro. */
function AroVacio({ size = 15 }) {
  return (
    <svg viewBox="0 0 14 14" width={size} height={size} aria-hidden="true" focusable="false">
      <circle cx={7} cy={7} r={5.6} fill="none" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  )
}

/**
 * Una de las tres opciones para marcar la materia. Las tres forman un solo
 * selector partido por lineas finas, y la elegida se tiñe con el color de su
 * estado: el mismo verde o ambar que el borde de la tarjeta en el mapa.
 */
function Opcion({ icono, texto, activa, color, alPulsar }) {
  return (
    <button
      type="button"
      aria-pressed={activa}
      onClick={alPulsar}
      className="flex flex-1 flex-col items-center gap-1.5 py-2.5 transition-colors"
      style={{
        backgroundColor: activa ? `color-mix(in oklab, ${color} 13%, transparent)` : 'transparent',
        color: activa ? color : 'var(--tinta-tenue)',
      }}
    >
      {icono}
      <span className="font-ui text-[9.5px] font-medium tracking-[0.2em] uppercase">{texto}</span>
    </button>
  )
}

/* Quien falta, dicho con nombre. Una lista de dos se dice "A y B"; de tres o
   mas, las dos primeras y cuantas quedan, para que el aviso no crezca hasta
   repetir la lista de prelaciones que ya esta justo debajo. */
function nombrar(materias) {
  const n = materias.map((m) => m.asignatura.nombre)
  if (n.length <= 2) return n.join(' y ')
  return `${n.slice(0, 2).join(', ')} y ${n.length - 2} más`
}

/**
 * La frase que responde "¿puedo inscribirla?". A la disponible se le dice
 * que si; a la que se abre si apruebas lo que cursas, QUE tienes que aprobar
 * para meterla el semestre que viene; a la lejana, que le falta.
 */
function AvisoSituacion({ estado, situacion, prerrequisitos }) {
  const clase = 'flex items-start gap-2.5 text-[12.5px] leading-snug text-tinta-suave'
  const icono = (s) => (
    <IconoSituacion
      situacion={s}
      size={13}
      className="mt-[2px] shrink-0"
      color={s === SITUACION.LEJANA ? 'var(--tinta-tenue)' : ASPECTO[s].marca.color}
    />
  )

  if (estado === ESTADO.DISPONIBLE) {
    return (
      <p className={clase}>
        {icono(SITUACION.INSCRIBIBLE)}
        Puedes inscribirla: tienes aprobadas todas sus prelaciones.
      </p>
    )
  }
  if (estado !== ESTADO.BLOQUEADA) return null

  const pendientes = prerrequisitos.filter((p) => p.estado !== ESTADO.APROBADA)
  const sinEmpezar = pendientes.filter((p) => p.estado !== ESTADO.CURSANDO)

  if (situacion === SITUACION.PROXIMA && pendientes.length > 0) {
    return (
      <p className={clase}>
        {icono(SITUACION.PROXIMA)}
        <span>
          Se abre el próximo semestre si apruebas{' '}
          <span className="text-tinta">{nombrar(pendientes)}</span>.
        </span>
      </p>
    )
  }

  return (
    <p className={clase}>
      {icono(SITUACION.LEJANA)}
      <span>
        {sinEmpezar.length > 0 ? (
          <>
            Aún te falta{sinEmpezar.length > 1 ? 'n' : ''}{' '}
            <span className="text-tinta">{nombrar(sinEmpezar)}</span>.
          </>
        ) : (
          'Te falta aprobar sus prelaciones.'
        )}{' '}
        Puedes marcarla igual si ya la viste.
      </span>
    </p>
  )
}

/**
 * La ficha de la materia que se pulso en el mapa.
 *
 * Tiene dos formas, y no son la misma caja mas estrecha. En escritorio es una
 * nubecita anclada al nodo, con un piquito que sale hacia el; en telefono,
 * una hoja inferior, donde llega el pulgar. Ninguna de las dos oscurece el
 * mapa: un velo apagaria justo lo que la ficha esta explicando.
 *
 * Habla el mismo idioma que las tarjetas: codigo y UC en letra de maquina,
 * nombre en Jost, estado en una palabra espaciada y los iconos de aro. Tuvo
 * una cabecera con un degradado difuminado del color del area, y era lo mas
 * vistoso de la pantalla, por encima del propio mapa al que acompaña.
 *
 * Al marcarla aprobada se aparta sola: el que decide eso es GrafoPensum, que
 * cierra la ficha y mueve el mapa para que se vea la luz llegar a lo que se
 * desbloquea. Aqui solo se avisa de que se pulso.
 */
function DetalleAsignatura({
  nodo,
  estado,
  situacion,
  situacionDe,
  prerrequisitos,
  desbloquea,
  posicion,
  medida,
  alMarcar,
  enCasilla,
  alCambiarElectiva,
  alCerrar,
}) {
  const esTelefono = useEsTelefono()
  const refFicha = useRef(null)
  const [alto, setAlto] = useState(0)

  /* El alto se mide cuando cambia el CONTENIDO, no cuando cambia el sitio.
     La ficha sigue al nodo mientras se arrastra el mapa, asi que un efecto
     que dependiera de la posicion correria en cada fotograma del gesto, y
     leer offsetHeight obliga al navegador a recalcular el diseño entero
     antes de contestar. El alto del contenedor si entra: es el tope de la
     ficha, y al estrechar la ventana la ficha encoge de verdad. */
  useLayoutEffect(() => {
    if (esTelefono) return
    setAlto(refFicha.current?.offsetHeight ?? 0)
  }, [esTelefono, nodo.codigo, estado, enCasilla, medida.alto])

  const marca = estado === ESTADO.APROBADA || estado === ESTADO.CURSANDO ? estado : null
  const aspecto = ASPECTO[situacion] ?? ASPECTO[SITUACION.LEJANA]
  const palabra = aspecto.marca.texto ?? 'Bloqueada'
  const colorPalabra = situacion === SITUACION.LEJANA ? 'var(--tinta-tenue)' : aspecto.marca.color

  const contenido = (
    <>
      <div className="flex shrink-0 items-start gap-3 px-4 pt-4 pb-3.5">
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline gap-2 text-tinta-tenue">
            <span className="font-dato text-[10.5px] font-light tracking-[0.04em]">
              {codigoVisible(nodo)}
            </span>
            <span className="font-ui text-[9.5px] font-medium tracking-[0.24em] uppercase">
              {nodo.semestre ? `Semestre ${String(nodo.semestre).padStart(2, '0')}` : 'Electiva'}
            </span>
          </p>
          <h3
            className="mt-1.5 font-ui text-[21px] leading-[1.15] tracking-[-0.005em] text-tinta"
            style={{ fontWeight: 400 }}
          >
            {nodo.nombre}
          </h3>
          <div className="mt-2.5 flex items-center gap-2 text-[12px] text-tinta-suave">
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: colorNodo(nodo) }}
            />
            {nodo.area && <span className="truncate">{etiquetaArea(nodo.area)}</span>}
            <span className="shrink-0 font-dato text-[10.5px] font-light text-tinta-tenue">
              {nodo.uc} UC
            </span>
            <span
              className="ml-auto shrink-0 font-ui text-[9.5px] font-medium tracking-[0.22em] uppercase"
              style={{ color: colorPalabra }}
            >
              {palabra}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={alCerrar}
          aria-label="Cerrar"
          className="-mt-1 -mr-1.5 grid size-8 shrink-0 place-items-center rounded-full text-tinta-tenue transition-colors hover:text-tinta"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      <div className="mx-4 mb-3.5 flex shrink-0 divide-x divide-panel-borde overflow-hidden rounded-[8px] border border-panel-borde">
        <Opcion
          icono={<IconoSituacion situacion={SITUACION.HECHA} size={15} />}
          texto="Aprobada"
          activa={marca === ESTADO.APROBADA}
          color="var(--estado-aprobada)"
          alPulsar={() => alMarcar(nodo.codigo, ESTADO.APROBADA)}
        />
        <Opcion
          icono={<IconoSituacion situacion={SITUACION.CURSANDO} size={15} />}
          texto="Cursando"
          activa={marca === ESTADO.CURSANDO}
          color="var(--estado-cursando)"
          alPulsar={() => alMarcar(nodo.codigo, ESTADO.CURSANDO)}
        />
        <Opcion
          icono={<AroVacio />}
          texto="Sin cursar"
          activa={marca === null}
          color="var(--tinta-suave)"
          alPulsar={() => alMarcar(nodo.codigo, null)}
        />
      </div>

      {/* Solo si esta materia ocupa una casilla del pensum. Cambiarla se
          ofrece AQUI y no pulsando la casilla del mapa: una vez elegida ahi
          hay una materia, y pulsar una materia lleva a su ficha. */}
      {enCasilla && (
        <button
          type="button"
          onClick={() => alCambiarElectiva(enCasilla)}
          className="mx-4 mb-3.5 flex shrink-0 items-center justify-center gap-2 rounded-[8px] border border-panel-borde py-2 font-ui text-[9.5px] font-medium tracking-[0.2em] text-tinta-suave uppercase transition-colors hover:text-tinta"
        >
          <Repeat2 size={13} strokeWidth={1.6} />
          Cambiar esta electiva
        </button>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto border-t border-panel-borde px-4 pt-3.5 pb-4 md:max-h-72">
        <AvisoSituacion estado={estado} situacion={situacion} prerrequisitos={prerrequisitos} />

        <ListaPrelaciones
          titulo="Requiere"
          materias={prerrequisitos}
          // Con requisito especial no se dice "nada": abajo viene la condicion
          vacio={nodo.requisitoEspecial ? '' : SIN_PRELACIONES}
          situacionDe={situacionDe}
          codigoDe={codigoVisible}
        />

        {/* "120 UC aprobadas" no es una materia, asi que no puede ser un cable
            del mapa ni una fila con su icono. Es una condicion, y se dice con
            palabras para que no se confunda con una prelacion. */}
        {nodo.requisitoEspecial && (
          <p className="-mt-2 flex items-start gap-2.5 text-[12.5px] leading-snug text-tinta-suave">
            <Info size={13} strokeWidth={1.6} className="mt-[2px] shrink-0 text-tinta-tenue" />
            <span>
              Además: <span className="text-tinta">{nodo.requisitoEspecial}</span>. Es una condición
              del pensum, no una materia.
            </span>
          </p>
        )}

        <ListaPrelaciones
          titulo="Desbloquea"
          materias={desbloquea}
          vacio="Nada: es final de rama."
          situacionDe={situacionDe}
          codigoDe={codigoVisible}
        />
      </div>
    </>
  )

  /* Telefono: hoja pegada al borde de abajo, donde llega el pulgar sin
     recolocar el agarre. No tapa el mapa entero, solo su parte de abajo, asi
     que la cadena encendida se sigue viendo por encima. */
  if (esTelefono) {
    return (
      <div
        role="dialog"
        aria-label={nodo.nombre}
        className="hoja-ficha transicion-tema absolute inset-x-0 bottom-0 z-30 flex max-h-[72%] flex-col overflow-hidden rounded-t-[14px] border border-b-0 border-panel-borde bg-panel pb-[var(--reserva-barra)] shadow-2xl"
      >
        {/* El asidero no arrastra nada: dice "esto es una hoja" con la unica
            señal que ya conoce cualquiera que use un telefono. */}
        <span
          aria-hidden="true"
          className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-panel-borde"
        />
        {contenido}
      </div>
    )
  }

  /* La misma cuenta que usan el avance, el menu de una clase y la ficha del
     horario, con los limites del lienzo en vez de los de la ventana: esta
     nubecita vive DENTRO del mapa porque tiene que moverse con el. Se pone
     AL LADO del nodo y no debajo: colgando de el taparia justo la materia
     sobre la que se acaba de preguntar. */
  const ancho = Math.min(ANCHO, medida.ancho - MARGEN * 2)
  const pos = colocar(
    {
      left: posicion.x - posicion.ancho,
      right: posicion.x,
      top: posicion.y,
      bottom: posicion.y + posicion.alto,
    },
    { ancho, alto },
    'lado',
    { ancho: medida.ancho, alto: medida.alto },
  )

  return (
    /* Se mueve con transform y no con left/top: la ficha se recoloca en cada
       fotograma mientras se arrastra el mapa, y transform lo resuelve el
       compositor sin tocar el diseño de la pagina.

       El envoltorio lleva el sitio y la ficha lleva el recorte: el piquito
       asoma por fuera, y dentro de ella habria desaparecido recortado. */
    <div
      className="menu-clase absolute top-0 left-0 z-30"
      style={{
        width: ancho,
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        transformOrigin: pos.origen,
      }}
    >
      <div
        ref={refFicha}
        role="dialog"
        aria-label={nodo.nombre}
        style={{ maxHeight: Math.max(200, medida.alto - MARGEN * 2) }}
        className={`${CARA_FICHA} flex flex-col overflow-hidden`}
      >
        {contenido}
      </div>
      {/* Detras del panel su base quedaba partida por el borde de la ficha.
          Delante, el relleno del pico tapa ese trozo de linea. */}
      <PicoPopover lado={pos.flecha.lado} posicion={pos.flecha.posicion} />
    </div>
  )
}

export default DetalleAsignatura
