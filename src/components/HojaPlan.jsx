import { useLayoutEffect, useRef } from 'react'
import { etiquetaSemestre } from '../layout/planificador'
import { textoCarga } from '../data/cargaPlan'
import Logo from './Logo'

/* La hoja mide 210 x 279 mm: el ancho de un A4 y el alto de una carta. Cabe
   entera en los dos papeles, asi que sale en UNA sola pagina se imprima en el
   que se imprima. A 96 puntos por pulgada, que es la cuenta del navegador,
   210 mm son 794 px. */
export const ANCHO_HOJA = 794
export const ALTO_HOJA = 1054

/* Como se reparte la ruta en la hoja, del mas holgado al mas apretado. Se
   prueba uno tras otro hasta que todo cabe: un plan de tres semestres va a dos
   columnas y letra grande; el de un nuevo ingreso, diez semestres y casi
   sesenta materias, baja a tres columnas. Nunca a una segunda pagina. */
const FORMATOS = [
  { columnas: 2, escala: 1 },
  { columnas: 2, escala: 0.94 },
  { columnas: 2, escala: 0.88 },
  { columnas: 3, escala: 0.94 },
  { columnas: 3, escala: 0.88 },
  { columnas: 3, escala: 0.82 },
  { columnas: 3, escala: 0.76 },
  // Solo para planes enormes: cuatro UC por semestre son decenas de semestres
  { columnas: 4, escala: 0.74 },
  { columnas: 4, escala: 0.66 },
  { columnas: 5, escala: 0.6 },
]

/**
 * Elige el primer formato con el que la ruta cabe en la hoja.
 *
 * Se escribe directamente en el estilo del elemento, sin pasar por React:
 * hay que medir despues de cada prueba, y con estado serian siete renders
 * para llegar al mismo sitio.
 */
function ajustarALaHoja(hoja, cuerpo) {
  for (const { columnas, escala } of FORMATOS) {
    hoja.style.setProperty('--columnas', columnas)
    hoja.style.setProperty('--escala', escala)
    if (cuerpo.scrollHeight <= cuerpo.clientHeight + 1) return
  }
}

const udo = (carrera) => carrera.nucleo.replace(/^Núcleo de /, 'UDO ').split(' — ')[0]

/**
 * La hoja que se imprime o se guarda como PDF: tu ruta hasta el grado, para
 * tacharla a boligrafo semestre a semestre.
 *
 * Es de la misma familia que la imagen del horario -la baldosa del logo, el
 * titulo pesado, mucho blanco- y gasta poca tinta: un solo acento, el verde
 * de las materias clave, y todo lo demas en negro y grises que salen igual en
 * una impresora de blanco y negro.
 *
 * Las clave se distinguen dos veces, por el aro verde de la casilla y por el
 * nombre en seminegrita, para que se sigan viendo en una fotocopia.
 */
function HojaPlan({ nombre, carrera, progreso, plan, carga, grado }) {
  const refHoja = useRef(null)
  const refCuerpo = useRef(null)

  useLayoutEffect(() => {
    if (refCuerpo.current) ajustarALaHoja(refHoja.current, refCuerpo.current)
  }, [plan, nombre])

  const semestres = plan.semestres.length
  /* El avance se mide contra las UC del titulo, no contra la suma de las
     obligatorias: las electivas tambien cuentan para graduarse. */
  const conUc = progreso.porcentaje != null
  const avance = conUc
    ? progreso.porcentaje
    : (progreso.aprobadas / Math.max(1, progreso.total)) * 100
  const llevas = conUc
    ? `${progreso.ucAprobadas + progreso.ucElectivas} de ${progreso.ucTitulo} UC`
    : `${progreso.aprobadas} de ${progreso.total} materias`

  return (
    <div ref={refHoja} className="hoja-ruta" lang="es">
      <header className="hr-cabecera">
        <div className="hr-marca">
          <span className="hr-baldosa">
            <Logo className="size-[27px] text-white" />
          </span>
          <div>
            <h1>Mi ruta al grado</h1>
            <p>{[nombre.trim(), carrera.nombre, udo(carrera)].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
        {grado && (
          <div className="hr-fecha">
            <p>Te gradúas hacia</p>
            <p className="hr-mes">{grado}</p>
          </div>
        )}
      </header>

      <div className="hr-avance">
        <div className="hr-barra">
          <i style={{ width: `${Math.max(1.5, Math.min(100, avance))}%` }} />
        </div>
        <p>
          Llevas <b>{llevas}</b>
          {progreso.cursando > 0 && ` y cursas ${progreso.cursando}`}
          {semestres > 0 &&
            ` · ${semestres} ${semestres === 1 ? 'semestre' : 'semestres'} con ${textoCarga(carga)}`}
        </p>
      </div>

      {semestres === 0 ? (
        <section className="hr-terminado">
          <p>Terminaste el pensum</p>
          <span>{progreso.aprobadas} materias aprobadas. Enhorabuena.</span>
        </section>
      ) : (
        <>
          <p className="hr-nota">
            Cada número es un semestre desde hoy. Tacha cada materia al aprobarla. Las del
            <i className="hr-check clave" aria-hidden="true" /> aro verde son clave: van en tu
            cadena más larga de prelaciones, y atrasarlas es lo que más alarga la carrera.
            {plan.nuevoIngreso && ' El primero es primero completo, como lo inscribe la UDO.'}
          </p>

          <div ref={refCuerpo} className="hr-cuerpo">
            <div className="hr-columnas">
              {plan.semestres.map((s) => (
                <section key={s.numero} className="hr-semestre">
                  <header>
                    <span className="hr-numero">{s.numero}</span>
                    <span className="hr-titulo">{s.numero === 1 ? etiquetaSemestre(1) : ''}</span>
                    <span className="hr-meta">
                      {s.materias.length} {s.materias.length === 1 ? 'materia' : 'materias'} ·{' '}
                      {s.uc} UC
                    </span>
                  </header>
                  <ul>
                    {s.materias.map((a) => (
                      <li key={a.codigo} className={a.clave ? 'clave' : undefined}>
                        <i className={`hr-check ${a.clave ? 'clave' : ''}`} aria-hidden="true" />
                        <span className={a.uc == null ? 'hr-nombre hueco' : 'hr-nombre'}>
                          {a.nombre}
                          {a.esElectiva && <em> (electiva)</em>}
                        </span>
                        <span className="hr-uc">{a.uc ?? '—'}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>

          {plan.sinUbicar.length > 0 && (
            <p className="hr-nota">
              {plan.sinUbicar.length} materias quedaron fuera porque sus prelaciones no se pueden
              cumplir con lo marcado. Revísalas en el mapa.
            </p>
          )}
        </>
      )}

      <footer className="hr-pie">
        <span className="hr-firma">
          <span className="hr-baldosa mini">
            <Logo className="size-[11px] text-white" />
          </span>
          Hecho con <b>Mapa de Pensum</b> · mapa-pensum.vercel.app
        </span>
        <span>Orientativo: confirma con control de estudios antes de inscribir.</span>
      </footer>
    </div>
  )
}

export default HojaPlan
