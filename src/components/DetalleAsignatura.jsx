import { useLayoutEffect, useRef, useState } from 'react'
import { Check, CircleDot, Info, Lock, Repeat2, RotateCcw, X } from 'lucide-react'
import { ESTADO } from '../data/estados'
import { useEsTelefono } from '../hooks/useEsTelefono'
import { colorNodo, etiquetaArea } from '../theme/areas'
import { fondoMateria } from '../theme/fondos'
import { codigoVisible } from '../data/codigoVisible'
import ListaPrelaciones, { SIN_PRELACIONES } from './ListaPrelaciones'
import PicoPopover from './PicoPopover'
import { CARA } from './Popover'
import { colocar } from '../layout/popover'

const ANCHO = 300
const MARGEN = 12

function Accion({ icono: Icono, texto, activo, color, alPulsar }) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      className="flex flex-1 flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-bold transition-colors"
      style={{
        borderColor: activo ? color : 'var(--panel-borde)',
        backgroundColor: activo ? `color-mix(in oklab, ${color} 16%, transparent)` : 'transparent',
        color: activo ? color : 'var(--tinta-suave)',
      }}
    >
      <Icono size={16} />
      {texto}
    </button>
  )
}

/**
 * La ficha de la materia que se pulso en el mapa.
 *
 * Tiene dos formas, y no son la misma caja mas estrecha. En escritorio es una
 * nubecita anclada al nodo, con un piquito que sale hacia el: al lado del
 * nodo se puede seguir viendo la cadena que se acaba de encender, que es la
 * respuesta a la pregunta que se hizo al pulsar. En telefono se convierte en
 * hoja inferior, por el mismo motivo que la ficha del horario: trescientos
 * pixeles dentro de una pantalla de trescientos setenta y cinco ya son un
 * modal, solo que peor colocado y mas lejos del pulgar.
 *
 * Ninguna de las dos oscurece el mapa. Un velo apagaria justo lo que la ficha
 * esta explicando.
 */
function DetalleAsignatura({
  nodo,
  estado,
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
     antes de contestar. Sesenta veces por segundo, para contestar siempre lo
     mismo: lo que hace alta a una ficha es cuantas prelaciones tiene la
     materia, y eso no cambia porque el mapa se mueva.

     El alto del contenedor si entra, y no por simetria: es el tope de la
     ficha, asi que al estrechar la ventana la ficha encoge de verdad y sin
     volver a medirla se colocaria con el alto de antes. */
  useLayoutEffect(() => {
    if (esTelefono) return
    setAlto(refFicha.current?.offsetHeight ?? 0)
  }, [esTelefono, nodo.codigo, estado, enCasilla, medida.alto])

  const marca =
    estado === ESTADO.APROBADA || estado === ESTADO.CURSANDO ? estado : null

  const contenido = (
    <>
      {/* Cabecera con fondo generado y desenfocado: el color viene del area
          y la forma del codigo, asi cada materia tiene el suyo. */}
      <div className="relative shrink-0 overflow-hidden border-b border-panel-borde">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-8"
          style={{ background: fondoMateria(nodo.codigo, colorNodo(nodo)), filter: 'blur(26px)' }}
        />
        <div className="relative flex items-start gap-2.5 px-4 py-3.5">
          <span
            className="mt-1 h-9 w-1 shrink-0 rounded-full"
            style={{ backgroundColor: colorNodo(nodo) }}
          />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] tracking-wider text-tinta-suave">
              {codigoVisible(nodo)}
              {nodo.semestre ? ` · Semestre ${nodo.semestre}` : ' · Electiva'}
            </p>
            <h3 className="text-[15px] leading-tight font-extrabold text-tinta">
              {nodo.nombre}
            </h3>
            <p className="mt-0.5 text-[11px] font-semibold text-tinta-suave">
              {nodo.area && `${etiquetaArea(nodo.area)} · `}
              {nodo.uc} UC
            </p>
          </div>
          <button
            type="button"
            onClick={alCerrar}
            aria-label="Cerrar"
            className="grid size-6 shrink-0 place-items-center rounded-md text-tinta-suave transition-colors hover:text-tinta"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex shrink-0 gap-2 px-3.5 py-3">
        <Accion
          icono={Check}
          texto="Aprobada"
          activo={marca === ESTADO.APROBADA}
          color="var(--estado-aprobada)"
          alPulsar={() => alMarcar(nodo.codigo, ESTADO.APROBADA)}
        />
        <Accion
          icono={CircleDot}
          texto="Cursando"
          activo={marca === ESTADO.CURSANDO}
          color="var(--estado-cursando)"
          alPulsar={() => alMarcar(nodo.codigo, ESTADO.CURSANDO)}
        />
        <Accion
          icono={RotateCcw}
          texto="Sin cursar"
          activo={marca === null}
          color="var(--tinta-suave)"
          alPulsar={() => alMarcar(nodo.codigo, null)}
        />
      </div>

      {/* Solo si esta materia ocupa una casilla del pensum. Cambiarla se
          ofrece AQUI y no pulsando la casilla del mapa, que es lo que hacia
          antes: una vez elegida ahi hay una materia, y pulsar una materia
          tiene que llevar a su ficha. Cambiarla es una accion sobre ella, y
          las acciones sobre una materia viven en su ficha. */}
      {enCasilla && (
        <button
          type="button"
          onClick={() => alCambiarElectiva(enCasilla)}
          className="mx-3.5 mb-3 flex shrink-0 items-center justify-center gap-2 rounded-lg border border-panel-borde py-2 text-[11px] font-bold text-tinta-suave transition-colors hover:border-[var(--acento)] hover:text-tinta"
        >
          <Repeat2 size={13} />
          Cambiar esta electiva
        </button>
      )}

      {estado === ESTADO.BLOQUEADA && (
        <p className="mx-3.5 mb-3 flex shrink-0 items-start gap-1.5 rounded-lg bg-panel-suave px-2.5 py-2 text-[11px] leading-snug text-tinta-suave">
          <Lock size={12} className="mt-0.5 shrink-0" />
          Te falta aprobar sus prerrequisitos. Puedes marcarla igual si ya la viste.
        </p>
      )}

      <div className="max-h-52 min-h-0 flex-1 overflow-y-auto border-t border-panel-borde px-3.5 py-3">
        <ListaPrelaciones
          titulo="Requiere"
          materias={prerrequisitos}
          // Con requisito especial no se dice "nada": abajo viene la condicion
          vacio={nodo.requisitoEspecial ? '' : SIN_PRELACIONES}
        />

        {/* "120 UC aprobadas" no es una materia, asi que no puede ser un cable
            del mapa ni una fila con su punto de color. Es una condicion, y se
            dice con palabras para que no se confunda con una prelacion. */}
        {nodo.requisitoEspecial && (
          <p className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-panel-suave px-2.5 py-2 text-[11px] leading-snug text-tinta-suave">
            <Info size={12} className="mt-0.5 shrink-0" />
            <span>
              Además: <strong className="font-bold text-tinta">{nodo.requisitoEspecial}</strong>.
              Es una condición del pensum, no una materia.
            </span>
          </p>
        )}

        <div className="mt-3">
          <ListaPrelaciones
            titulo="Desbloquea"
            materias={desbloquea}
            vacio="Nada: es final de rama."
          />
        </div>
      </div>
    </>
  )

  /* Telefono: hoja pegada al borde de abajo, donde llega el pulgar sin
     recolocar el agarre. No lleva piquito porque no lo necesita: ocupa el
     ancho entero, no sale de ningun sitio en concreto. Y no tapa el mapa
     entero, solo su tercio de abajo, asi que la cadena encendida se sigue
     viendo por encima. */
  if (esTelefono) {
    return (
      <div
        role="dialog"
        aria-label={nodo.nombre}
        className="hoja-ficha transicion-tema absolute inset-x-0 bottom-0 z-30 flex max-h-[72%] flex-col overflow-hidden rounded-t-2xl border border-b-0 border-panel-borde bg-panel shadow-2xl"
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
     nubecita vive DENTRO del mapa porque tiene que moverse con el.
     Se pone AL LADO del nodo y no debajo: colgando de el taparia justo la
     materia sobre la que se acaba de preguntar. */
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
    /* Se mueve con transform y no con left/top. La ficha se recoloca en cada
       fotograma mientras se arrastra el mapa, y left/top pasan por el diseño
       de la pagina; transform lo resuelve el compositor sin tocarlo.

       El envoltorio lleva el sitio y la ficha lleva el recorte: el piquito
       asoma por fuera, y la ficha recorta lo que se sale para redondearse las
       esquinas. Dentro de ella el piquito habria desaparecido por ese mismo
       recorte. */
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
        className={`${CARA} flex flex-col overflow-hidden`}
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
