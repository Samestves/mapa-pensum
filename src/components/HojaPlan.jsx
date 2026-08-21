import { Waypoints } from 'lucide-react'
import { etiquetaSemestre } from '../layout/planificador'
import { codigoVisible } from '../data/codigoVisible'

/* La hoja mide siempre lo mismo, en pantalla y en papel.
   Un A4 con 12 mm de margen deja 186 mm utiles, que a 96 puntos por pulgada
   -la equivalencia que usa el navegador al imprimir- son 703 px. Una carta
   deja todavia mas. Con 680 entra en las dos y sobra un poco, y ese poco se
   reparte a los lados centrandola.

   Que el numero sea fijo es lo que hace que la vista previa sea una vista
   previa de verdad. Antes la hoja se adaptaba al ancho con clases sm: y el
   bloque de impresion las deshacia una por una, asi que lo que se miraba en
   el telefono no era la hoja: era otra maqueta parecida. Ahora la previa
   ENCOGE la misma hoja, y lo que se ve es lo que sale. */
export const ANCHO_HOJA = 680

const HOY = () =>
  new Date().toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' })

const ROTULO = 'text-[9px] font-extrabold tracking-[0.14em] text-tinta-tenue uppercase'

/** Una materia del plan: casilla para tachar, codigo, nombre y sus UC. */
function Fila({ asignatura }) {
  /* "Areas de Grado" y las casillas de electiva sin cuota conocida no son
     materias: son huecos del pensum que el estudiante llenara con algo. No
     tienen codigo que enseñar -el 9099999 que llevan dentro se lo inventa el
     normalizador para poder identificarlas- ni UC, y sacarlos en la hoja se
     leia como un dato roto justo donde mas se nota, sobre papel. */
  const esHueco = asignatura.esComodin || asignatura.esHueco

  return (
    <li className="flex items-baseline gap-2.5 py-[3px]">
      {/* La casilla existe para tacharla a boligrafo. Es la razon por la que
          esta hoja se imprime en vez de mirarse: al terminar un semestre se
          marca lo aprobado y se ve el avance sin abrir nada. */}
      <span
        aria-hidden="true"
        className="mt-[3px] size-[11px] shrink-0 self-start rounded-[3px] border border-tinta-tenue"
      />
      <span className="w-[62px] shrink-0 font-mono text-[9px] tracking-tight text-tinta-tenue">
        {esHueco ? '' : codigoVisible(asignatura)}
      </span>
      {/* Sin recortar. Una hoja impresa no tiene donde enseñar lo que corta:
          un nombre que acaba en tres puntos no se termina de leer nunca. */}
      <span
        className={`min-w-0 flex-1 text-[12px] leading-snug font-semibold ${
          esHueco ? 'text-tinta-suave italic' : 'text-tinta'
        }`}
      >
        {asignatura.nombre}
      </span>
      <span className="w-[52px] shrink-0 text-right font-mono text-[9.5px] text-tinta-tenue">
        {asignatura.uc != null ? `${asignatura.uc} UC` : 'a elegir'}
      </span>
    </li>
  )
}

/**
 * La hoja que se imprime o se guarda como PDF.
 *
 * Esta pensada para acabar pegada en una pared, no para consultarse en una
 * pantalla, y de ahi salen casi todas las decisiones: un solo color de
 * acento, mucho blanco, y una sola cosa grande -la fecha de grado- porque es
 * la que hace que alguien quiera imprimirla.
 *
 * Los semestres van en una linea de tiempo con un punto por paso y un aro
 * abierto al final. Una lista de titulos no dice que hay un recorrido; la
 * linea si, y ademas se lee de un vistazo desde lejos.
 *
 * Lo que se quito tambien cuenta: el area de cada materia era una cuarta
 * columna que solo servia para estrechar los nombres hasta tener que
 * recortarlos, y el porcentaje con decimal se leia como un error de calculo.
 */
function HojaPlan({ nombre, carrera, progreso, plan, ucPorSemestre, grado }) {
  const semestres = plan.semestres.length
  const anos = (semestres / 2).toFixed(1).replace('.0', '')

  /* El avance se mide contra las UC del titulo, no contra la suma de las
     obligatorias: las electivas tambien cuentan para graduarse. Mezclar las
     dos bases daba "7 de 132" en una carrera que pide 153. */
  const hayPorcentaje = progreso.porcentaje != null
  const ucLogradas = progreso.ucAprobadas + progreso.ucElectivas
  const avance = hayPorcentaje
    ? progreso.porcentaje
    : (progreso.aprobadas / Math.max(1, progreso.total)) * 100

  return (
    /* <article> y no un <div>: la hoja lleva su propio <header> y su propio
       <footer>, y sueltos en la pagina esos dos cuentan como la cabecera y el
       pie DEL SITIO. Con el modal abierto habia tres cabeceras anunciadas y
       dos pies. Dentro de un article quedan donde tienen que estar, que es
       encabezando y cerrando la hoja. Y es lo que la hoja es: algo completo
       que se entiende sacado de aqui, que para eso se imprime. */
    <article className="hoja bg-panel px-9 py-8 text-tinta" style={{ width: ANCHO_HOJA }} lang="es">
      <header className="flex items-center justify-between gap-4 border-b border-tinta pb-2.5">
        <span className="flex items-center gap-1.5 text-[9.5px] font-extrabold tracking-[0.18em] text-tinta uppercase">
          <Waypoints size={13} strokeWidth={2.6} className="text-aprobada" />
          Mapa de Pensum
        </span>
        <span className="font-mono text-[9.5px] text-tinta-tenue">{HOY()}</span>
      </header>

      <div className="mt-5 flex items-end justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-[25px] leading-none font-extrabold tracking-[-0.035em]">
            {carrera.nombre}
          </h1>
          <p className="mt-1.5 text-[10.5px] text-tinta-suave">
            Universidad de Oriente · {carrera.nucleo}
          </p>
        </div>
        {nombre && (
          <p className="shrink-0 text-right text-[10.5px] font-extrabold tracking-[0.08em] text-tinta uppercase">
            {nombre}
          </p>
        )}
      </div>

      {semestres === 0 ? (
        <section className="mt-9 border-y border-tinta py-9 text-center">
          <p className={ROTULO}>No queda nada pendiente</p>
          <p className="mt-2 text-[34px] leading-none font-extrabold tracking-[-0.04em] text-aprobada">
            Terminaste el pensum
          </p>
          <p className="mt-2.5 text-[11px] text-tinta-suave">
            {progreso.aprobadas} materias aprobadas. Enhorabuena.
          </p>
        </section>
      ) : (
        <>
          {/* Lo unico grande de la hoja. Todo lo demas es el camino hasta
              aqui, y por eso ninguna otra cifra compite en tamaño. */}
          <section className="mt-7">
            <p className={ROTULO}>{grado ? 'Te gradúas en' : 'Te faltan'}</p>
            <p className="mt-1.5 text-[40px] leading-none font-extrabold tracking-[-0.045em]">
              {grado ?? `${semestres} semestres`}
            </p>
            <p className="mt-2.5 text-[11.5px] text-tinta-suave">
              {semestres} {semestres === 1 ? 'semestre' : 'semestres'} por delante
              {grado && ` · unos ${anos} años`} · {plan.materiasRestantes} materias ·{' '}
              {plan.ucRestantes} UC
            </p>
          </section>

          {/* La barra dice de un golpe lo que el porcentaje dice con numeros,
              y es lo que se entiende sin leer. */}
          <section className="mt-5">
            <div className="flex items-baseline justify-between gap-3">
              <span className={ROTULO}>Tu avance</span>
              <span className="font-mono text-[10px] text-tinta-suave">
                {hayPorcentaje
                  ? `${ucLogradas} de ${progreso.ucTitulo} UC · ${Math.round(progreso.porcentaje)} %`
                  : `${progreso.aprobadas} de ${progreso.total} materias`}
              </span>
            </div>
            <div className="mt-1.5 h-[7px] w-full overflow-hidden rounded-full border border-panel-borde bg-panel-suave">
              <div
                className="h-full rounded-full bg-aprobada"
                style={{ width: `${Math.max(1.5, Math.min(100, avance))}%` }}
              />
            </div>
          </section>

          <p className="mt-6 border-t border-panel-borde pt-2.5 text-[9.5px] leading-relaxed text-tinta-tenue">
            Esta ruta respeta todas las prelaciones del pensum y pone primero las materias que
            desbloquean más cosas, con un tope de{' '}
            <strong className="font-bold text-tinta-suave">{ucPorSemestre} UC</strong> por
            semestre. Cambia el tope y cambia la ruta.
          </p>

          {/* Linea de tiempo. El borde izquierdo es continuo y cada semestre
              cuelga de el con su punto; el aro abierto del final es la meta.
              Los puntos van SOBRE la linea, no al lado, para que se lea como
              un recorrido y no como una lista con viñetas. */}
          <div className="mt-6 ml-[5px] flex flex-col border-l border-aprobada/45 pl-6">
            {plan.semestres.map((s) => (
              <section key={s.numero} className="relative break-inside-avoid pb-5">
                <span
                  aria-hidden="true"
                  className="absolute top-[3px] -left-[28.5px] size-[9px] rounded-full bg-aprobada"
                />
                <div className="flex items-baseline justify-between gap-3 border-b border-panel-borde pb-1.5">
                  {/* Nunca "SEMESTRE 1": ese numero es un paso desde hoy, no
                      el semestre 1 del pensum, que quien lea esto ya aprobo. */}
                  <h2 className="text-[11px] font-extrabold tracking-[0.12em] text-tinta uppercase">
                    {etiquetaSemestre(s.numero)}
                  </h2>
                  <span className="shrink-0 font-mono text-[9.5px] text-tinta-tenue">
                    {s.materias.length} materias · {s.uc} UC
                  </span>
                </div>
                <ul className="mt-1.5 flex flex-col">
                  {s.materias.map((a) => (
                    <Fila key={a.codigo} asignatura={a} />
                  ))}
                </ul>
              </section>
            ))}

            <section className="relative break-inside-avoid">
              {/* Aro abierto y no punto relleno: lo de arriba son pasos que se
                  van a dar y esto todavia no lo es. */}
              <span
                aria-hidden="true"
                className="absolute top-[1px] -left-[30.5px] size-[13px] rounded-full border-2 border-aprobada bg-panel"
              />
              <p className="text-[11px] font-extrabold tracking-[0.12em] text-aprobada uppercase">
                Grado{grado && ` · ${grado}`}
              </p>
            </section>
          </div>

          {plan.sinUbicar.length > 0 && (
            <p className="mt-5 border border-panel-borde px-3 py-2 text-[9.5px] leading-relaxed text-tinta-suave">
              <strong className="font-bold">{plan.sinUbicar.length} materias</strong> quedaron
              fuera de la ruta porque sus prelaciones no se pueden cumplir con lo que hay
              marcado. Revísalas en el mapa.
            </p>
          )}
        </>
      )}

      <footer className="mt-8 flex items-end justify-between gap-6 border-t border-tinta pt-2.5">
        <p className="text-[9px] leading-relaxed text-tinta-tenue">
          Las unidades crédito no están verificadas contra el pensum oficial:
          <br />
          úsalas como referencia, no como documento.
        </p>
        {/* La direccion va grande y a la derecha a proposito. Esta hoja acaba
            en una pared o en la foto de un grupo, y es lo unico que le dice a
            quien la ve donde se hace la suya. */}
        <p className="shrink-0 text-right">
          <span className="block text-[11px] font-extrabold tracking-[-0.01em] text-tinta">
            mapa-pensum.vercel.app
          </span>
          <span className={ROTULO}>Arma la tuya gratis</span>
        </p>
      </footer>
    </article>
  )
}

export default HojaPlan
