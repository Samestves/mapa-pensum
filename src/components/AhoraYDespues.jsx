import { DIAS, MOMENTO, duracion, enDoceHoras, partesDeHora } from '../layout/horario'
import Trozos, { Entero } from './Trozos'

const ROTULO = {
  [MOMENTO.EN_CURSO]: 'En curso',
  [MOMENTO.LUEGO]: 'Próxima clase',
  [MOMENTO.LIBRE]: 'Hoy',
  [MOMENTO.VACIO]: 'Tu semana',
}

/* A partir de cuantas letras el nombre baja un cuerpo. "Comprensión y
   Expresión Lingüística I" a 34 px son tres renglones y medio telefono. */
const NOMBRE_LARGO = 26

const TITULAR = 'font-ui font-light tracking-[-0.015em] text-balance text-tinta'
const CUERPO_TITULAR = {
  normal: 'text-[34px] leading-[1.08] md:text-[30px]',
  largo: 'text-[27px] leading-[1.12] md:text-[25px]',
}

/* Cuando es la proxima clase, dicho como se dice de palabra */
function cuandoEs({ clase, dentroDe }) {
  if (dentroDe === 1) return 'Mañana'
  const dia = DIAS[clase.dia].toLowerCase()
  return dentroDe === 7 ? `El próximo ${dia}` : `El ${dia}`
}

/* Lo que se dice cuando hoy ya no queda ninguna clase */
function tituloLibre(momento, ahora) {
  if (momento.terminado) return 'Listo por hoy'
  return ahora.dia < DIAS.length ? 'Hoy no tienes clases' : 'Fin de semana'
}

/**
 * De que hora a que hora, como un trayecto: sale de un punto, llega a un
 * anillo. Con `avance` -de cero a uno- se llena hasta ahi y una cabeza marca
 * por donde va la clase.
 */
function Trayecto({ inicio, fin, avance }) {
  const entrada = partesDeHora(inicio)
  const salida = partesDeHora(fin)

  return (
    <div className="trayecto mt-5" style={{ '--avance': avance ?? 0 }}>
      <span className="trayecto-hora">
        {entrada.hora}
        {entrada.meridiano !== salida.meridiano && (
          <span className="meridiano font-ui">{entrada.meridiano}</span>
        )}
      </span>
      <span className="trayecto-via" aria-hidden="true">
        {avance != null && (
          <>
            <i />
            <b />
          </>
        )}
      </span>
      <span className="trayecto-hora">
        {salida.hora}
        <span className="meridiano font-ui">{salida.meridiano}</span>
      </span>
    </div>
  )
}

/* Una clase dicha en un renglon: su color, su nombre, cuando y donde.
   El nombre es lo unico que se parte -puede ocupar dos renglones-; cuando y
   donde son una unidad que, si no cabe detras del nombre, baja entera. */
function EnUnRenglon({ rotulo, clase, aspectoDe }) {
  const { nombre, color } = aspectoDe(clase)

  return (
    <div className="mt-6">
      <p className="rotulo-horario font-ui">{rotulo}</p>
      <p className="mt-2.5 flex items-baseline gap-2.5 text-[14px] leading-snug text-tinta-suave">
        <i className="marca-materia" aria-hidden="true" style={{ '--c': color }} />
        <span className="min-w-0">
          <Trozos>
            <b className="font-medium text-tinta">{nombre}</b>
            <Entero>
              <Trozos>
                <span className="tabular-nums">{enDoceHoras(clase.inicio)}</span>
                {clase.aula}
              </Trozos>
            </Entero>
          </Trozos>
        </span>
      </p>
    </div>
  )
}

/**
 * Lo primero que dice el horario: que toca ahora y que viene despues.
 *
 * Un horario se abre casi siempre con una pregunta -¿a donde voy?, ¿cuanto
 * queda?- y esto la contesta antes de enseñar la semana. Hay cuatro momentos
 * y uno solo a la vez (ver momentoDe): en plena clase, con una por delante,
 * con el dia acabado y con el horario vacio.
 *
 * No calcula nada: el momento llega ya decidido. Aqui solo se dice.
 *
 * @param {object} props.momento  lo que devuelve momentoDe
 * @param {{ dia: number, minuto: number }} props.ahora
 * @param {(sesion: object) => { nombre: string, color: string }} props.aspectoDe
 * @param {import('react').ReactNode} [props.aLaDerecha]  lo que va en la linea del rotulo, al otro lado
 */
function AhoraYDespues({ momento, ahora, aspectoDe, aLaDerecha }) {
  const { tipo, clase } = momento
  const aspecto = clase && aspectoDe(clase)
  const enCurso = tipo === MOMENTO.EN_CURSO

  const titulo = aspecto
    ? aspecto.nombre
    : tipo === MOMENTO.LIBRE
      ? tituloLibre(momento, ahora)
      : 'Aún sin clases'
  const cuerpo = CUERPO_TITULAR[titulo.length > NOMBRE_LARGO ? 'largo' : 'normal']

  return (
    <section aria-label="Ahora y después" style={aspecto && { '--c': aspecto.color }}>
      <div className="flex h-9 items-center justify-between gap-3">
        <p className="rotulo-horario flex items-center gap-2.5 font-ui">
          {enCurso && <i className="pulso-ahora" aria-hidden="true" />}
          {ROTULO[tipo]}
        </p>
        {aLaDerecha}
      </div>

      <h2 className={`mt-2 ${TITULAR} ${cuerpo}`}>{titulo}</h2>

      {clase && (
        <>
          <p className="mt-2.5 text-[14px] text-tinta-suave">
            <Trozos>
              <Entero>
                {enCurso ? 'Quedan ' : 'Empieza en '}
                <b className="font-medium text-tinta tabular-nums">
                  {duracion(enCurso ? momento.quedan : momento.faltan)}
                </b>
              </Entero>
              {clase.aula && <Entero>{clase.aula}</Entero>}
            </Trozos>
          </p>
          <Trayecto
            inicio={clase.inicio}
            fin={clase.fin}
            avance={enCurso ? momento.avance : null}
          />
          {momento.despues ? (
            <EnUnRenglon rotulo="Después" clase={momento.despues} aspectoDe={aspectoDe} />
          ) : (
            <div className="mt-6">
              <p className="rotulo-horario font-ui">Después</p>
              <p className="mt-2.5 text-[14px] text-tinta-suave">Es tu última clase de hoy.</p>
            </div>
          )}
        </>
      )}

      {tipo === MOMENTO.LIBRE && momento.proxima && (
        <EnUnRenglon
          rotulo={cuandoEs(momento.proxima)}
          clase={momento.proxima.clase}
          aspectoDe={aspectoDe}
        />
      )}

      {tipo === MOMENTO.VACIO && (
        <p className="mt-2.5 max-w-[32ch] text-[14px] leading-normal text-tinta-suave">
          Añade tu primera clase, o súbelas todas de una vez desde una foto.
        </p>
      )}
    </section>
  )
}

export default AhoraYDespues
