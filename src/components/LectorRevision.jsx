import { useMemo, useState } from 'react'
import { ordenarRevision, rivalDe } from '../layout/importarHorario'
import { colorAutomatico, colorIndice, coloresDelHorario } from '../theme/areas'
import FotoLeida from './FotoLeida'
import MateriaLeida from './MateriaLeida'

const cuantas = (n, uno, varias) => `${n} ${n === 1 ? uno : varias}`

/**
 * Lo leido, listo para revisar.
 *
 * El paso de revision no es una cortesia ni un adorno: es la diferencia entre
 * una herramienta y una apuesta. Lo que vuelve de la lectura es lo que un
 * modelo CREYO ver en una foto que puede estar torcida, con reflejos o a
 * medio enfocar, y una materia mal leida no se nota al importarla -se nota el
 * dia del parcial-. Asi que nada entra sin que alguien lo mire.
 *
 * Y mirar es comparar con la foto. Por eso la foto esta SIEMPRE a la vista,
 * pegada arriba mientras la lista pasa por debajo, y compacta para no tapar
 * las materias (ver FotoLeida). En escritorio, donde sobra ancho, va en su
 * propia columna al lado de la lista.
 *
 * Debajo, una fila por materia; las que llegaron con dudas, primero y ya
 * abiertas.
 *
 * @param {boolean} props.enColumnas  escritorio: la foto a la izquierda, la lista a la derecha
 */
function LectorRevision({
  imagen,
  candidatas,
  materias,
  sesiones,
  enColumnas,
  alCambiar,
  alIncluir,
}) {
  /* Que fila tiene los ajustes abiertos. null es "todavia no se toco
     nada", y entonces las que tienen algo por revisar nacen abiertas: lo que
     hay que arreglar se ve con que se arregla, sin tener que descubrir que
     la fila se despliega. Al abrir una, las demas se cierran. */
  const [abierta, setAbierta] = useState(null)

  const filas = ordenarRevision(candidatas)

  /* Meter o sacar todo lo que puede entrar de una vez. Las rotas no cuentan:
     no entran por mucho que se marquen (ver incluir). */
  const sanas = candidatas.filter((c) => !c.avisos.length)
  const todasDentro = sanas.length > 0 && sanas.every((c) => c.incluir)

  /* El color que tendra cada materia en el horario: el que ya tiene si
     estaba, o el siguiente libre. Sale de las clases guardadas y de las
     leidas en su orden, que es como se repartira al añadirlas. */
  const colores = useMemo(
    () => coloresDelHorario([...sesiones, ...candidatas.filter((c) => c.codigo)]),
    [sesiones, candidatas],
  )
  const colorDe = (codigo) => colorIndice(colorAutomatico(colores, codigo))

  const nombreDelRival = (sesion) => {
    const rival = rivalDe(sesion, candidatas, sesiones)
    if (!rival) return null
    return (
      rival.materia?.nombre ??
      materias.find((m) => m.codigo === rival.codigo)?.nombre ??
      'una clase que ya tienes'
    )
  }

  return (
    <div className="lector-cara lector-revision" data-columnas={enColumnas || undefined}>
      {imagen && (
        <div className="lector-foto-pegada">
          <FotoLeida src={imagen.vistaPrevia} enColumna={enColumnas} />
        </div>
      )}

      <div className="lector-lista">
        <div className="flex items-center justify-between gap-3 px-2 pb-1">
          <p className="text-[12.5px] text-tinta-tenue tabular-nums">
            {cuantas(filas.length, 'materia', 'materias')} ·{' '}
            {cuantas(candidatas.length, 'clase', 'clases')}
          </p>
          {sanas.length > 0 && (
            <button
              type="button"
              onClick={() =>
                alIncluir(
                  sanas.map((c) => c.id),
                  !todasDentro,
                )
              }
              className="-my-3.5 -mr-2 px-2 py-3.5 text-[12.5px] font-medium text-tinta-suave transition-colors hover:text-tinta"
            >
              {todasDentro ? 'Quitar todas' : 'Marcar todas'}
            </button>
          )}
        </div>

        <ul className="lista-leida">
          {filas.map((fila) => {
            const estaAbierta = abierta === fila.grupo || (abierta == null && fila.porRevisar > 0)
            return (
              <MateriaLeida
                key={fila.grupo}
                tarjeta={fila}
                color={colorDe(fila.materia?.codigo)}
                materias={materias}
                abierta={estaAbierta}
                nombreDelRival={nombreDelRival}
                alAbrir={() => setAbierta(estaAbierta ? '' : fila.grupo)}
                alCambiar={alCambiar}
                alIncluir={alIncluir}
              />
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export default LectorRevision
