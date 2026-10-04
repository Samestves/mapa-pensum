import { useRef, useState } from 'react'
import { ImageUp, PencilLine, RotateCw, X } from 'lucide-react'
import { useEsTelefono } from '../hooks/useEsTelefono'
import { FASE, useLecturaHorario } from '../hooks/useLecturaHorario'
import { FORMATOS, SALIDA } from '../data/leerHorario'
import { aSesiones, corregir, incluir } from '../layout/importarHorario'
import { SITUACION } from '../layout/situacion'
import HojaInferior from './HojaInferior'
import { IconoSituacion } from './IconoSituacion'
import LectorAviso from './LectorAviso'
import LectorLeyendo from './LectorLeyendo'
import LectorRevision from './LectorRevision'
import Ventana from './Ventana'

const ETIQUETA = 'Leer mi horario de una imagen'

const enKilos = (bytes) => `${Math.max(1, Math.round(bytes / 1024))} kB`

/* Lo que va dentro del anillo cuando algo no salio. El reloj de arena es el
   mismo de "todavia no" del mapa: el lector vuelve solo. La raya, para lo que
   si es un fallo. */
const GLIFO = {
  aplazado: <IconoSituacion situacion={SITUACION.PROXIMA} size={28} color="var(--tinta-suave)" />,
  fallo: (
    <svg viewBox="0 0 30 30" width="30" height="30" aria-hidden="true">
      <path
        d="M15 7v10M15 22.4v.6"
        fill="none"
        stroke="var(--estado-rojo)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
}

/* La fila de arriba de la hoja: de que se trata y como cerrarla. En el
   telefono es ademas de donde se tira para bajarla (ver HojaInferior). */
function Cabecera({ miniatura, alCerrar, children }) {
  return (
    <header className="flex items-center gap-3 px-5 pt-1 pb-3 sm:px-6 md:pt-5">
      {miniatura && (
        <img
          src={miniatura}
          alt=""
          className="size-11 shrink-0 rounded-[10px] object-cover object-top ring-1 ring-panel-borde"
        />
      )}
      <div className="min-w-0 flex-1">{children}</div>
      <button
        type="button"
        onClick={alCerrar}
        aria-label="Cerrar"
        className="grid size-8 shrink-0 place-items-center rounded-full bg-panel-suave text-tinta-suave transition-colors hover:text-tinta"
      >
        <X size={16} strokeWidth={1.5} />
      </button>
    </header>
  )
}

/**
 * Leer un horario de una imagen, revisarlo y meterlo.
 *
 * Aqui se decide que cara de la hoja toca y se conectan las piezas; ninguna
 * se dibuja aqui. La lectura -preparar la imagen, preguntar, esperar si hay
 * cola- vive en useLecturaHorario; lo que decide si una fila esta bien, en
 * layout/importarHorario.js, que es funcion pura y tiene sus pruebas.
 *
 * Las caras son tres: LectorLeyendo mientras se lee, LectorAviso cuando hay
 * cola o no se pudo, y LectorRevision con lo leido.
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
  const telefono = useEsTelefono()
  const refArchivo = useRef(null)
  const { fase, fallo, espera, imagen, candidatas, setCandidatas, reintentar } = useLecturaHorario({
    archivo,
    materias,
    sesiones,
  })

  /* Lo que hay que hacer cuando la hoja termine de irse. En el telefono la
     hoja baja antes de desaparecer, y cerrar, importar o pasar a armarlo a
     mano la desmontan: se guarda la accion y se cumple al acabar la bajada.
     En escritorio no hay bajada y se hace en el acto. */
  const [despedida, setDespedida] = useState(null)
  const irse = (accion) => (telefono ? setDespedida(() => accion) : accion())

  const cerrar = () => irse(alCerrar)
  const aMano = () => irse(alCrearAMano)
  const elegirOtra = () => refArchivo.current?.click()

  /* Corregir una clase y meter o sacar varias: las reglas viven en
     layout/importarHorario.js, aqui solo se guarda lo que devuelven. */
  const cambiar = (id, cambios) =>
    setCandidatas((previas) => corregir(previas, id, cambios, materias, sesiones))
  const meter = (ids, dentro) => setCandidatas((previas) => incluir(previas, ids, dentro, sesiones))

  /* Lo que ofrece cada fallo, ademas de cerrar. Una salida llena -la que lo
     arregla- y, si acaso, otra debajo: ver SALIDA en data/leerHorario.js. */
  const salidas = {
    [SALIDA.REINTENTAR]: {
      principal: { texto: 'Reintentar', icono: RotateCw, alPulsar: reintentar },
      otras: [{ texto: 'Probar otra imagen', alPulsar: elegirOtra }],
    },
    [SALIDA.OTRA_IMAGEN]: {
      principal: { texto: 'Probar otra imagen', icono: ImageUp, alPulsar: elegirOtra },
    },
    [SALIDA.A_MANO]: {
      principal: { texto: 'Crearlo a mano', icono: PencilLine, alPulsar: aMano },
    },
  }

  const laImagen = imagen && (
    <Cabecera miniatura={imagen.vistaPrevia} alCerrar={cerrar}>
      <p className="truncate text-[14px] font-medium text-tinta">Tu imagen</p>
      <p className="mt-0.5 truncate text-[12px] text-tinta-tenue tabular-nums">
        {imagen.ancho} × {imagen.alto} · {enKilos(imagen.peso)}
      </p>
    </Cabecera>
  )
  const soloCerrar = <Cabecera alCerrar={cerrar} />

  /* Cada cara es lo mismo para la hoja del telefono y para la ventana: una
     cabecera, un cuerpo que se desplaza y, a veces, un pie que se queda. */
  const cara = () => {
    if (fase === FASE.LEYENDO) {
      return { cuerpo: <LectorLeyendo imagen={imagen} alCancelar={cerrar} /> }
    }
    if (fase === FASE.ESPERANDO) {
      return {
        cabecera: laImagen,
        cuerpo: (
          <LectorAviso
            espera={espera}
            titulo="Hay cola en el lector"
            detalle="Mucha gente está leyendo su horario a la vez. Se vuelve a intentar sola."
            // Quien no quiere esperar la cola tiene la otra forma de hacerlo
            otras={[{ texto: 'Crearlo a mano', alPulsar: aMano }]}
          />
        ),
      }
    }
    if (fase === FASE.ERROR) {
      return {
        cabecera: laImagen || soloCerrar,
        cuerpo: (
          <LectorAviso
            glifo={fallo.aplazado ? GLIFO.aplazado : GLIFO.fallo}
            titulo={fallo.titulo}
            detalle={fallo.consejo}
            {...salidas[fallo.salida]}
          />
        ),
      }
    }

    const listas = candidatas.filter((c) => c.incluir && !c.avisos.length).length
    const dudas = candidatas.filter((c) => c.avisos.length).length
    return {
      cabecera: (
        <Cabecera alCerrar={cerrar}>
          <h2 className="text-[17px] leading-tight font-medium tracking-[-0.015em] text-tinta">
            Revisa tu semana
          </h2>
          <p className="mt-1 text-[12px] leading-snug text-tinta-suave">
            {dudas
              ? `${dudas === 1 ? 'Una clase necesita que la mires' : `${dudas} clases necesitan que las mires`}. El resto está listo.`
              : 'Así queda con lo que leí. Toca una materia para ajustarla.'}
          </p>
        </Cabecera>
      ),
      cuerpo: (
        <LectorRevision
          imagen={imagen}
          candidatas={candidatas}
          materias={materias}
          sesiones={sesiones}
          alCambiar={cambiar}
          alIncluir={meter}
        />
      ),
      pie: (
        <footer className="flex shrink-0 items-center gap-2 border-t border-panel-borde px-5 py-3 sm:px-6">
          <button
            type="button"
            onClick={cerrar}
            className="px-3 py-2.5 text-[14px] font-medium text-tinta-suave transition-colors hover:text-tinta"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!listas}
            onClick={() => irse(() => alImportar(aSesiones(candidatas)))}
            className="boton-tinta flex-1"
          >
            {listas ? `Añadir ${listas} ${listas === 1 ? 'clase' : 'clases'}` : 'Nada que añadir'}
          </button>
        </footer>
      ),
    }
  }

  const { cabecera, cuerpo, pie } = cara()

  return (
    <>
      {telefono ? (
        <HojaInferior
          abierta={!despedida}
          alCerrar={cerrar}
          alIrse={despedida}
          etiqueta={ETIQUETA}
          cabecera={cabecera}
          pie={pie}
        >
          {cuerpo}
        </HojaInferior>
      ) : (
        <Ventana etiqueta={ETIQUETA} alCerrar={cerrar} cabecera={cabecera} pie={pie}>
          {cuerpo}
        </Ventana>
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
    </>
  )
}

export default ImportarHorario
