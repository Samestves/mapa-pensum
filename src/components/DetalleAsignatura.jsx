import { Info, Repeat2, X } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'

import { codigoVisible } from '../data/codigoVisible'
import { ESTADO } from '../data/estados'
import { useEsTelefono } from '../hooks/useEsTelefono'
import { colocar } from '../layout/popover'
import { SITUACION } from '../layout/situacion'
import { colorNodo, etiquetaArea } from '../theme/areas'
import { ASPECTO } from '../theme/situacion'

import ListaPrelaciones, { SIN_PRELACIONES } from './ListaPrelaciones'
import PicoPopover from './PicoPopover'
import AvisoSituacion from './ficha/AvisoSituacion'
import TarjetaTelefono from './ficha/TarjetaTelefono'
import IconoMarca from './ficha/IconoMarca'
import { Opcion, SelectorTelefono } from './ficha/SelectorMarca'

const ANCHO = 320

const MARGEN = 12

/* La cara de la ficha: la misma rejilla fina de las tarjetas del mapa.
   Esquina de 10 y no de 16 -la tarjeta tiene 7-, borde de un pixel y la
   sombra que la separa del mapa que queda debajo. */
const CARA_FICHA = 'relative w-full rounded-[10px] border border-panel-borde bg-panel shadow-2xl'

/**
 * La ficha de la materia que se pulso en el mapa.
 *
 * Tiene dos formas, y no son la misma caja mas estrecha. En escritorio es una
 * nubecita anclada al nodo, con un piquito que sale hacia el; en telefono,
 * una tarjeta que flota abajo, donde llega el pulgar (ver TarjetaTelefono).
 * Ninguna de las dos oscurece el mapa: un velo apagaria justo lo que la ficha
 * esta explicando.
 *
 * Las materias de Requiere y Desbloquea se pueden pulsar: la ficha pasa a
 * esa materia y el mapa la trae a la vista, asi que la cadena se recorre sin
 * salir de aqui.
 *
 * Habla el mismo idioma que las tarjetas: codigo y UC en letra de maquina,
 * nombre en Jost, estado en una palabra espaciada y los iconos de aro. Tuvo
 * una cabecera con un degradado difuminado del color del area, y era lo mas
 * vistoso de la pantalla, por encima del propio mapa al que acompaña.
 *
 * Al marcarla aprobada se aparta sola: el que decide eso es GrafoPensum, que
 * cierra la ficha y mueve el mapa para que se vea la luz llegar a lo que se
 * desbloquea. Aqui solo se avisa de que se pulso.
 *
 * `refSeguir` engancha la nubecita de escritorio al mapa: mientras un gesto
 * mueve el mapa sin repintarlo, la desplaza con el (ver seguir en
 * useVistaGrafo).
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
  alIrA,
  puedeIr,
  alTapar,
  refSeguir,
  saliendo = false,
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

  /* La cabecera va aparte porque en el telefono es tambien el asa: desde
     ella se arrastra la tarjeta hacia abajo para cerrarla. */
  const cabecera = (
    <div className={`relative shrink-0 ${esTelefono ? 'px-5 pt-2.5 pb-4' : 'px-4 pt-4 pb-3.5'}`}>
      {/* La X en su esquina, fuera del flujo: asi la fila de abajo llega hasta
          el borde y la palabra de estado cae justo encima del borde derecho
          del selector, en vez de quedarse a media fila. */}
      <button
        type="button"
        onClick={alCerrar}
        aria-label="Cerrar"
        className={`boton-cerrar absolute grid place-items-center rounded-full ${
          esTelefono ? 'top-3 right-4 size-10' : 'top-3 right-3 size-8'
        }`}
      >
        <X size={esTelefono ? 18 : 15} strokeWidth={1.75} />
      </button>

      <p
        className={`flex items-baseline gap-2 text-tinta-tenue ${esTelefono ? 'pt-1 pr-14' : 'pr-10'}`}
      >
        <span className="font-ui text-[9.5px] font-medium tracking-[0.26em] uppercase">
          {nodo.semestre ? `Semestre ${String(nodo.semestre).padStart(2, '0')}` : 'Electiva'}
        </span>
        <span aria-hidden="true" className="h-px w-4 self-center bg-panel-borde" />
        <span className="font-dato text-[10.5px] font-light tracking-[0.04em]">
          {codigoVisible(nodo)}
        </span>
      </p>
      <h3
        className={`mt-2 font-ui leading-[1.12] tracking-[-0.01em] text-balance text-tinta ${esTelefono ? 'pr-12' : 'pr-8'} ${
          esTelefono ? 'text-[24px]' : 'text-[21px]'
        }`}
        style={{ fontWeight: 400 }}
      >
        {nodo.nombre}
      </h3>
      <div className="mt-3 flex items-center gap-2 text-[12px] text-tinta-suave">
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
  )

  /* Lo que responde "¿puedo verla?, ¿que pide?, ¿que abre?". Es lo mismo en
     las dos formas; lo que cambia es donde queda respecto a las marcas. */
  const informacion = (
    <>
      <AvisoSituacion estado={estado} situacion={situacion} prerrequisitos={prerrequisitos} />

      <ListaPrelaciones
        titulo="Requiere"
        materias={prerrequisitos}
        // Con requisito especial no se dice "nada": abajo viene la condicion
        vacio={nodo.requisitoEspecial ? '' : SIN_PRELACIONES}
        situacionDe={situacionDe}
        codigoDe={codigoVisible}
        alIrA={alIrA}
        puedeIr={puedeIr}
        holgada={esTelefono}
      />

      {/* "120 UC aprobadas" no es una materia, asi que no puede ser un cable
          del mapa ni una fila con su icono. Es una condicion, y se dice con
          palabras para que no se confunda con una prelacion. */}
      {nodo.requisitoEspecial && (
        <p className="-mt-3 flex items-start gap-2.5 text-[12.5px] leading-snug text-tinta-suave">
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
        alIrA={alIrA}
        puedeIr={puedeIr}
        holgada={esTelefono}
      />
    </>
  )

  /* Solo si esta materia ocupa una casilla del pensum. Cambiarla se ofrece
     AQUI y no pulsando la casilla del mapa: una vez elegida ahi hay una
     materia, y pulsar una materia lleva a su ficha. */
  const cambiarElectiva = enCasilla && (
    <button
      type="button"
      onClick={() => alCambiarElectiva(enCasilla)}
      className="flex shrink-0 items-center justify-center gap-2 rounded-[8px] border border-panel-borde py-2.5 font-ui text-[9.5px] font-medium tracking-[0.2em] text-tinta-suave uppercase transition-colors hover:text-tinta"
    >
      <Repeat2 size={13} strokeWidth={1.6} />
      Cambiar esta electiva
    </button>
  )

  const cuerpo = (
    <>
      <div className="mx-4 mb-4 flex shrink-0 divide-x divide-panel-borde overflow-hidden rounded-[8px] border border-panel-borde">
        <Opcion
          icono={<IconoMarca marca={ESTADO.APROBADA} size={15} />}
          texto="Aprobada"
          activa={marca === ESTADO.APROBADA}
          color="var(--estado-aprobada)"
          alPulsar={() => alMarcar(nodo.codigo, ESTADO.APROBADA)}
        />
        <Opcion
          icono={<IconoMarca marca={ESTADO.CURSANDO} size={15} />}
          texto="Cursando"
          activa={marca === ESTADO.CURSANDO}
          color="var(--estado-cursando)"
          alPulsar={() => alMarcar(nodo.codigo, ESTADO.CURSANDO)}
        />
        <Opcion
          icono={<IconoMarca marca={null} size={15} />}
          texto="Sin cursar"
          activa={marca === null}
          color="var(--tinta-suave)"
          alPulsar={() => alMarcar(nodo.codigo, null)}
        />
      </div>

      {cambiarElectiva && <div className="mx-4 mb-4 flex flex-col">{cambiarElectiva}</div>}

      <div className="flex max-h-72 min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain border-t border-panel-borde px-4 pt-3.5 pb-4">
        {informacion}
      </div>
    </>
  )

  if (esTelefono) {
    return (
      <TarjetaTelefono
        nombre={nodo.nombre}
        clave={nodo.codigo}
        alCerrar={alCerrar}
        alTapar={alTapar}
        cabecera={cabecera}
        filo={colorPalabra}
        saliendo={saliendo}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain border-t border-panel-borde px-5 pt-3.5 pb-3">
          {informacion}
          {cambiarElectiva}
        </div>
        {/* Las marcas, al pie: es lo que se viene a hacer, y abajo es donde
            llega el pulgar sin cambiar de mano. */}
        <div className="shrink-0 border-t border-panel-borde px-4 pt-3 pb-3.5">
          <SelectorTelefono marca={marca} alMarcar={(m) => alMarcar(nodo.codigo, m)} />
        </div>
      </TarjetaTelefono>
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
      ref={refSeguir}
      className={`menu-clase absolute top-0 left-0 z-30 ${saliendo ? 'ficha-saliendo pointer-events-none' : ''}`}
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
        <span aria-hidden="true" className="ficha-filo" style={{ '--filo': colorPalabra }} />
        {cabecera}
        {cuerpo}
      </div>
      {/* Detras del panel su base quedaba partida por el borde de la ficha.
          Delante, el relleno del pico tapa ese trozo de linea. */}
      <PicoPopover lado={pos.flecha.lado} posicion={pos.flecha.posicion} />
    </div>
  )
}

export default DetalleAsignatura
