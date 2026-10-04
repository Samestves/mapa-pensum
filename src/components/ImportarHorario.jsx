import { useRef, useState } from 'react'
import { ImageUp, PencilLine, RotateCw, X } from 'lucide-react'
import { useEsTelefono } from '../hooks/useEsTelefono'
import { FASE, MOTOR, useLecturaHorario } from '../hooks/useLecturaHorario'
import { FORMATOS, SALIDA } from '../data/leerHorario'
import { aSesiones, corregir, incluir } from '../layout/importarHorario'
import { SITUACION } from '../layout/situacion'
import HojaInferior from './HojaInferior'
import { IconoSituacion } from './IconoSituacion'
import LectorAviso from './LectorAviso'
import LectorLeyendo from './LectorLeyendo'
import LectorRevision from './LectorRevision'
import MotorLector from './MotorLector'
import Ventana from './Ventana'

const ETIQUETA = 'Leer mi horario de una imagen'

/* El ancho de la ventana al revisar, en px: la foto en una columna y la
   lista en otra */
const ANCHO_CON_FOTO = 960

const enKilos = (bytes) => `${Math.max(1, Math.round(bytes / 1024))} kB`

/* Las dudas del lector del aparato que la lista no puede enseñar: un bloque
   que no se leyo no es una fila con aviso, es una fila que no esta. */
const PUEDE_FALTAR = ['sin-leer', 'de-menos', 'pegadas']

/* La guia de la revision, debajo del titulo */
function guiaDeRevision(porMirar, puedeFaltar) {
  if (puedeFaltar) return 'Puede faltar alguna clase: compárala con la foto.'
  if (!porMirar) return 'Compárala con la foto. Toca una materia para ajustarla.'
  const cuales =
    porMirar === 1
      ? 'Una clase necesita que la mires'
      : `${porMirar} clases necesitan que las mires`
  return `${cuales}. El resto está listo.`
}

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
        className="relative grid size-8 shrink-0 place-items-center rounded-full bg-panel-suave text-tinta-suave transition-colors before:absolute before:-inset-1.5 before:content-[''] hover:text-tinta"
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
 * cola o no se pudo, y LectorRevision con lo leido. Las tres dicen quien lee
 * o quien leyo: el OCR del aparato o la IA (ver MotorLector).
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
  const {
    fase,
    motor,
    avance,
    porQue,
    dudas: dudasDelAparato,
    fallo,
    espera,
    imagen,
    candidatas,
    setCandidatas,
    reintentar,
  } = useLecturaHorario({ archivo, materias, sesiones })

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
     arregla: ver SALIDA en data/leerHorario.js- y las demas debajo, como
     texto. Armarlo a mano esta siempre: el dia de la inscripcion nadie puede
     quedarse sin su horario porque una foto no se deja leer. */
  const otraImagen = { texto: 'Probar otra imagen', alPulsar: elegirOtra }
  const crearloAMano = { texto: 'Crearlo a mano', alPulsar: aMano }
  const salidas = {
    [SALIDA.REINTENTAR]: {
      principal: { texto: 'Reintentar', icono: RotateCw, alPulsar: reintentar },
      otras: [otraImagen, crearloAMano],
    },
    [SALIDA.OTRA_IMAGEN]: {
      principal: { ...otraImagen, icono: ImageUp },
      otras: [crearloAMano],
    },
    [SALIDA.A_MANO]: {
      principal: { ...crearloAMano, icono: PencilLine },
      otras: [otraImagen],
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
      return {
        cuerpo: (
          <LectorLeyendo
            imagen={imagen}
            motor={motor}
            avance={avance}
            porQue={porQue}
            telefono={telefono}
            alCancelar={cerrar}
          />
        ),
      }
    }
    if (fase === FASE.ESPERANDO) {
      return {
        cabecera: laImagen,
        cuerpo: (
          <LectorAviso
            espera={espera}
            etiqueta={<MotorLector motor={MOTOR.IA} telefono={telefono} />}
            titulo="Hay cola en la IA"
            detalle="Mucha gente está leyendo su horario a la vez. Se vuelve a intentar sola."
            // Quien no quiere esperar la cola tiene la otra forma de hacerlo
            otras={[crearloAMano]}
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
            nota={fallo.nota}
            {...salidas[fallo.salida]}
          />
        ),
      }
    }

    const listas = candidatas.filter((c) => c.incluir && !c.avisos.length).length
    const porMirar = candidatas.filter((c) => c.avisos.length).length
    const puedeFaltar = dudasDelAparato?.some((d) => PUEDE_FALTAR.includes(d))
    return {
      /* Con la foto al lado hace falta sitio: en escritorio la ventana se
         ensancha para darle su columna. Las demas caras siguen en 560. */
      ancho: imagen ? ANCHO_CON_FOTO : undefined,
      cabecera: (
        <Cabecera alCerrar={cerrar}>
          <div className="flex items-center gap-2">
            <h2 className="text-[17px] leading-tight font-medium tracking-[-0.015em] text-tinta">
              Revisa tu semana
            </h2>
            <MotorLector motor={motor} telefono={telefono} compacto />
          </div>
          <p className="mt-1 text-[12px] leading-snug text-tinta-suave">
            {guiaDeRevision(porMirar, puedeFaltar)}
          </p>
        </Cabecera>
      ),
      cuerpo: (
        <LectorRevision
          imagen={imagen}
          candidatas={candidatas}
          materias={materias}
          sesiones={sesiones}
          enColumnas={!telefono}
          alCambiar={cambiar}
          alIncluir={meter}
        />
      ),
      pie: (
        <footer className="flex shrink-0 items-center gap-2 border-t border-panel-borde px-5 py-3 sm:px-6">
          <button
            type="button"
            onClick={cerrar}
            className="px-3 py-3.5 text-[14px] font-medium text-tinta-suave transition-colors hover:text-tinta"
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

  const { ancho, cabecera, cuerpo, pie } = cara()

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
        <Ventana etiqueta={ETIQUETA} ancho={ancho} alCerrar={cerrar} cabecera={cabecera} pie={pie}>
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
