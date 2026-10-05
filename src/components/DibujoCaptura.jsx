import { ArrowRight } from 'lucide-react'

const DIAS = ['L', 'M', 'X', 'J', 'V']
const FRANJAS = 7

/* Las clases del dibujo: dia, franja en la que empieza, franjas que dura y el
   color de su materia (--clase-N). Inventadas a proposito y sin nombre: es un
   dibujo de lo que vas a tener, no un horario, y con nombres reales se leeria
   como uno que alguien ya te armo. La misma materia repite color en sus dos
   dias, como en un horario de verdad. */
const CLASES = [
  { dia: 0, desde: 0, franjas: 2, color: 1 },
  { dia: 0, desde: 3, franjas: 2, color: 3 },
  { dia: 1, desde: 1, franjas: 2, color: 2 },
  { dia: 1, desde: 4, franjas: 2, color: 5 },
  { dia: 2, desde: 0, franjas: 2, color: 1 },
  { dia: 2, desde: 3, franjas: 2, color: 3 },
  { dia: 3, desde: 1, franjas: 2, color: 2 },
  { dia: 3, desde: 4, franjas: 3, color: 6 },
  { dia: 4, desde: 0, franjas: 3, color: 4 },
  { dia: 4, desde: 4, franjas: 2, color: 7 },
]

/* Donde cae cada pieza, en % de la caja del dibujo. "uno": la captura y la
   semana ocupan el mismo sitio y una se vuelve la otra (telefono). "par": la
   captura a la izquierda, la semana a la derecha y las clases cruzan de una a
   otra (escritorio). */
const FORMAS = {
  uno: { hoja: { x: 0, ancho: 100 }, semana: { x: 0, ancho: 100 } },
  par: { hoja: { x: 0, ancho: 43 }, semana: { x: 57, ancho: 43 } },
}

/* La rejilla dentro de cada una. En la captura deja sitio a los dias (13% a la
   izquierda) y a las franjas (16% arriba); en la semana, a las letras (14%).
   Son los mismos porcentajes de .dibujo-rejilla y .dibujo-horas, en
   horario-vacio.css. */
const REJILLA_HOJA = { izquierda: 0.13, arriba: 16, ancho: 0.84, alto: 79 }
const REJILLA_SEMANA = { arriba: 14, alto: 86 }

const r3 = (n) => +n.toFixed(3)
const porciento = (n) => `${r3(n)}%`

/* Cada clase se maqueta en su sitio FINAL de la semana, y de ahi se lleva a su
   sitio de la captura con transform. Asi lo unico que se anima es transform y
   opacity -ambas en el compositor- y el layout no se toca en ningun cuadro.

   Aqui se precalcula el viaje: cuanto hay que mover la clase (--dx, --dy, en
   % de la caja del dibujo; el CSS los pasa a unidades de contenedor) y cuanto
   estirarla (--ex, --ey) para que, en el sitio de la captura, ocupe justo la
   fila y las franjas que ocupaba alli. */
function estiloDeClase(clase, { hoja, semana }) {
  const enSemana = {
    x: semana.x + (clase.dia * semana.ancho) / DIAS.length,
    y: REJILLA_SEMANA.arriba + (clase.desde * REJILLA_SEMANA.alto) / FRANJAS,
    ancho: semana.ancho / DIAS.length,
    alto: (clase.franjas * REJILLA_SEMANA.alto) / FRANJAS,
  }
  const enCaptura = {
    x:
      hoja.x + hoja.ancho * (REJILLA_HOJA.izquierda + (clase.desde * REJILLA_HOJA.ancho) / FRANJAS),
    y: REJILLA_HOJA.arriba + (clase.dia * REJILLA_HOJA.alto) / DIAS.length,
    ancho: (hoja.ancho * clase.franjas * REJILLA_HOJA.ancho) / FRANJAS,
    alto: REJILLA_HOJA.alto / DIAS.length,
  }
  return {
    left: porciento(enSemana.x),
    top: porciento(enSemana.y),
    width: porciento(enSemana.ancho),
    height: porciento(enSemana.alto),
    '--dx': r3(enCaptura.x - enSemana.x),
    '--dy': r3(enCaptura.y - enSemana.y),
    '--ex': r3(enCaptura.ancho / enSemana.ancho),
    '--ey': r3(enCaptura.alto / enSemana.alto),
    '--dia': clase.dia,
    '--c': `var(--clase-${clase.color})`,
  }
}

/* El eco: lo que queda en la captura cuando la clase ya paso a la semana.
   Va dentro de la rejilla de la captura, asi que sus porcentajes son de ella:
   una columna por franja y una fila por dia. */
const estiloDeEco = (clase) => ({
  left: porciento((clase.desde / FRANJAS) * 100),
  top: porciento((clase.dia * 100) / DIAS.length),
  width: porciento((clase.franjas / FRANJAS) * 100),
  height: porciento(100 / DIAS.length),
})

const ESTILOS_CLASE = {
  uno: CLASES.map((c) => estiloDeClase(c, FORMAS.uno)),
  par: CLASES.map((c) => estiloDeClase(c, FORMAS.par)),
}
const ESTILOS_ECO = CLASES.map(estiloDeEco)

/* El rotulo que dice que se esta viendo. En el telefono la captura y la semana
   comparten sitio, asi que el rotulo va solo mientras se ve la captura. En
   escritorio se ven las dos a la vez y cada una lleva el suyo, pegado a su
   columna (las mismas tres del dibujo: 43%, 14% y 43%). */
const ROTULO =
  'font-ui text-[9.5px] leading-none font-medium tracking-[0.24em] text-tinta-tenue uppercase'

/**
 * El dibujo que abre la pantalla: la captura de INTRADACE se lee y se vuelve
 * tu semana. Cuenta lo que hace la funcion sin una palabra: la captura -una
 * fila por dia, bloques azules y rayitas en vez de texto- la recorre una linea
 * de lectura, y cada clase sale a su sitio en la semana -una columna por dia,
 * del color de su materia-.
 *
 * El azul y la hoja oscura viven solo aqui dentro: es "una imagen", igual en
 * tema claro y oscuro, y en el resto de la app el azul esta reservado para
 * otra cosa. No lleva nombres ni datos de nadie.
 *
 * Todo el movimiento esta en horario-vacio.css, como fotogramas estaticos.
 */
function DibujoCaptura({ forma }) {
  const par = forma === 'par'
  const { hoja, semana } = FORMAS[forma]

  return (
    <div aria-hidden="true" className="w-full">
      <div
        className="dibujo"
        data-forma={forma}
        style={{
          '--hx': porciento(hoja.x),
          '--hw': porciento(hoja.ancho),
          '--wx': porciento(semana.x),
          '--ww': porciento(semana.ancho),
        }}
      >
        <span className="dibujo-hoja">
          <span className="dibujo-cabecera" />
          <span className="dibujo-dias" />
          <span className="dibujo-rejilla">
            {CLASES.map((clase, i) => (
              <span key={i} className="dibujo-eco" data-dia={clase.dia} style={ESTILOS_ECO[i]} />
            ))}
          </span>
        </span>

        <span className="dibujo-semana">
          <span className="absolute inset-x-0 top-0 grid h-[14%] grid-cols-5 items-center pb-[1%] text-center font-ui text-[10px] leading-none font-medium tracking-[0.22em] text-tinta-tenue">
            {DIAS.map((dia) => (
              <span key={dia} className="pl-[0.22em]">
                {dia}
              </span>
            ))}
          </span>
          <span className="dibujo-horas" />
        </span>

        {par && (
          <span className="absolute top-[14%] left-[43%] grid h-[86%] w-[14%] place-items-center text-tinta-tenue">
            <ArrowRight size={20} strokeWidth={1.25} />
          </span>
        )}

        {CLASES.map((_, i) => (
          <span key={i} className="dibujo-clase" style={ESTILOS_CLASE[forma][i]} />
        ))}

        <span className="dibujo-lector-caja">
          <span className="dibujo-lector" />
        </span>
      </div>

      {par ? (
        <p className="mt-3 grid grid-cols-[43fr_14fr_43fr] text-left">
          <span className={ROTULO}>Captura de INTRADACE</span>
          <span className={`col-start-3 ${ROTULO}`}>Tu semana</span>
        </p>
      ) : (
        <p className={`dibujo-fase mt-[13px] pl-[0.24em] text-center ${ROTULO}`}>
          Captura de INTRADACE
        </p>
      )}
    </div>
  )
}

export default DibujoCaptura
