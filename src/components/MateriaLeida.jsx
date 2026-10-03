import { DIAS, DIAS_CORTOS, tramoCorto } from '../layout/horario'
import { CampoHoras, Marca, SelectorDia, SelectorMateria } from './ControlesLector'

const SIN_MATERIA = 'sin-materia'
const CHOCA = 'choca'

/* Por que una clase no puede entrar tal cual, dicho para quien la va a
   arreglar. El choque no esta aqui: lleva el nombre de con quien se pisa. */
const PROBLEMA = {
  [SIN_MATERIA]: 'No encontré esta materia en tu pensum. Elígela tú.',
  'sin-dia': 'No entendí el día.',
  'sin-hora': 'No entendí la hora.',
  fuera: 'Queda fuera de la jornada, que va de 7 AM a 7 PM.',
  corta: 'Dura menos de media hora.',
}

/* Lo mismo en tres palabras, para la tarjeta cerrada */
const FALTA = {
  [SIN_MATERIA]: 'Falta elegir la materia',
  'sin-dia': 'Falta el día',
  'sin-hora': 'Falta la hora',
  fuera: 'Queda fuera de la jornada',
  corta: 'Dura muy poco',
  [CHOCA]: 'Se pisa con otra clase',
}

const diasDe = (dias) => dias.map((d) => DIAS_CORTOS[d]).join(' · ')

/* Lo que le pasa a UNA clase, en renglones. Que no se sepa la materia no es
   cosa de la clase sino de la tarjeta entera, y se dice junto a su selector. */
function problemasDe(sesion, nombreDelRival) {
  return sesion.avisos
    .filter((aviso) => aviso !== SIN_MATERIA)
    .map((aviso) =>
      aviso === CHOCA
        ? `Se pisa con ${nombreDelRival(sesion) ?? 'otra clase'}. Cámbiale la hora o quita una.`
        : PROBLEMA[aviso],
    )
}

/* Lo que falta, para la tarjeta cerrada: lo concreto si es una sola cosa */
function resumenDeDudas(sesiones, porRevisar) {
  if (porRevisar > 1) return `${porRevisar} clases por revisar`
  return FALTA[sesiones.find((s) => s.avisos.length).avisos[0]]
}

/* Una clase de la materia, con lo que se le puede corregir. El rotulo con su
   dia solo hace falta para distinguirla de sus hermanas o para poder quitarla
   sola; con una clase unica, el dia ya esta marcado justo debajo. */
function AjusteClase({ sesion, problemas, conRotulo, conQuitar, alCambiar, alIncluir }) {
  const sana = sesion.avisos.length === 0

  return (
    <div className="flex flex-col gap-2">
      {(conRotulo || conQuitar) && (
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-ui text-[10.5px] font-medium tracking-[0.2em] text-tinta-tenue uppercase">
            {sesion.dia == null ? 'Sin día' : DIAS[sesion.dia]}
          </p>
          {/* Sacar UNA clase y no la materia entera: es como se deshace un
              choque sin perder la otra sesion de la misma materia. */}
          {conQuitar && (
            <button
              type="button"
              onClick={() => alIncluir([sesion.id], !sesion.incluir)}
              className="text-[12.5px] font-medium text-tinta-suave transition-colors hover:text-tinta"
            >
              {sesion.incluir ? 'Quitar esta clase' : 'Volver a ponerla'}
            </button>
          )}
        </div>
      )}

      {problemas.map((problema) => (
        <p key={problema} className="aviso-leido text-[12.5px] leading-snug">
          {problema}
        </p>
      ))}

      <div className={sana && !sesion.incluir ? 'opacity-45' : undefined}>
        <SelectorDia dia={sesion.dia} alCambiar={(dia) => alCambiar(sesion.id, { dia })} />
        <div className="mt-2">
          <CampoHoras
            inicio={sesion.inicio}
            fin={sesion.fin}
            alCambiar={(cambios) => alCambiar(sesion.id, cambios)}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Una materia leida, con sus clases.
 *
 * Cerrada dice lo justo para comprobarla de un vistazo: que materia es, que
 * dias, a que hora y donde. La marca de la derecha la mete o la saca entera.
 * Al tocarla se abre con lo que se puede corregir: la materia, y el dia y la
 * hora de cada clase.
 *
 * Si alguna de sus clases no puede entrar, lo dice aqui mismo, en ambar, y
 * nace abierta: lo que hay que arreglar se ve con que se arregla.
 *
 * @param {object} props.tarjeta  una de ordenarRevision (layout/importarHorario.js)
 * @param {(sesion: object) => string|null} props.nombreDelRival  con quien se pisa una clase
 */
function MateriaLeida({
  tarjeta,
  color,
  materias,
  abierta,
  nombreDelRival,
  alAbrir,
  alCambiar,
  alIncluir,
}) {
  const { materia, sesiones, tramos, incluida, porRevisar } = tarjeta
  const sanas = sesiones.filter((s) => !s.avisos.length)
  const nombre = materia?.nombre ?? sesiones[0].leido.nombre ?? 'Sin nombre'

  /* Lo que decia la foto, cuando no coincide con lo que se entendio. Es la
     forma de comprobar la materia sin volver a abrir la imagen. Sin materia
     no hace falta: el titulo de la tarjeta ya es lo que decia la foto. */
  const enLaFoto = materia
    ? [...new Set(sesiones.map((s) => s.leido.nombre))].filter(
        (leido) => leido && leido !== materia.nombre,
      )
    : []

  return (
    <li className="materia-leida" data-fuera={(!incluida && porRevisar === 0) || undefined}>
      <div className="flex items-center gap-3.5 px-5 py-3.5 sm:px-6">
        <span
          aria-hidden="true"
          className="w-[3px] shrink-0 self-stretch rounded-full"
          style={{ background: materia ? color : 'var(--panel-borde)' }}
        />

        <button
          type="button"
          onClick={alAbrir}
          aria-expanded={abierta}
          className="resumen-leido min-w-0 flex-1 text-left"
        >
          <span
            className={`block truncate text-[15px] leading-snug font-medium ${
              materia ? 'text-tinta' : 'text-tinta-suave'
            }`}
          >
            {nombre}
          </span>
          {tramos.map((t) => (
            <span
              key={`${t.inicio}-${t.fin}-${t.aula}`}
              className="mt-0.5 block truncate text-[12.5px] text-tinta-suave tabular-nums"
            >
              {diasDe(t.dias)} · {tramoCorto(t.inicio, t.fin)}
              {t.aula && ` · ${t.aula}`}
            </span>
          ))}
          {porRevisar > 0 && (
            <span className="aviso-leido mt-0.5 block text-[12.5px]">
              {resumenDeDudas(sesiones, porRevisar)}
            </span>
          )}
        </button>

        {/* Sin ninguna clase sana no hay nada que meter ni sacar */}
        {sanas.length > 0 && (
          <Marca
            activa={incluida}
            alPulsar={() =>
              alIncluir(
                sanas.map((s) => s.id),
                !incluida,
              )
            }
            etiqueta={`Añadir ${nombre}`}
          />
        )}
      </div>

      <div className="plegable" data-abierto={abierta}>
        <div>
          <div className="flex flex-col gap-5 pt-1 pr-5 pb-5 pl-[2.375rem] sm:pr-6 sm:pl-[2.625rem]">
            <div className="flex flex-col gap-2">
              {enLaFoto.length > 0 && (
                <p className="text-[12px] text-tinta-tenue">
                  En la foto: {enLaFoto.map((leido) => `«${leido}»`).join(', ')}
                </p>
              )}
              {!materia && <p className="aviso-leido text-[12.5px]">{PROBLEMA[SIN_MATERIA]}</p>}
              <SelectorMateria
                codigo={materia?.codigo}
                materias={materias}
                alCambiar={(codigo) => sesiones.forEach((s) => alCambiar(s.id, { codigo }))}
              />
            </div>

            {sesiones.map((sesion) => (
              <AjusteClase
                key={sesion.id}
                sesion={sesion}
                problemas={problemasDe(sesion, nombreDelRival)}
                conRotulo={sesiones.length > 1}
                /* Con una sola clase, quitarla es quitar la materia: para eso
                   esta la marca. */
                conQuitar={sesiones.length > 1 || sesion.avisos.includes(CHOCA)}
                alCambiar={alCambiar}
                alIncluir={alIncluir}
              />
            ))}
          </div>
        </div>
      </div>
    </li>
  )
}

export default MateriaLeida
