import { useMemo, useState } from 'react'
import { ordenarRevision, rivalDe } from '../layout/importarHorario'
import { colorAutomatico, colorIndice, coloresDelHorario } from '../theme/areas'
import { Segmentos } from './ControlesLector'
import MateriaLeida from './MateriaLeida'
import SemanaLeida from './SemanaLeida'

const ARRIBA = [
  { valor: 'semana', texto: 'Tu semana' },
  { valor: 'foto', texto: 'La foto' },
]

/**
 * Lo leido, listo para revisar.
 *
 * El paso de revision no es una cortesia ni un adorno: es la diferencia entre
 * una herramienta y una apuesta. Lo que vuelve de la lectura es lo que un
 * modelo CREYO ver en una foto que puede estar torcida, con reflejos o a
 * medio enfocar, y una materia mal leida no se nota al importarla -se nota el
 * dia del parcial-. Asi que nada entra sin que alguien lo mire.
 *
 * Pero mirar no puede ser leer catorce renglones. Arriba va la semana tal
 * como queda, que se comprueba de un vistazo -¿se parece a mi semana?-, y a
 * un toque, la foto original para comparar. Debajo, una tarjeta por materia;
 * las que llegaron con dudas primero y ya abiertas.
 *
 * Lo de arriba se queda pegado mientras la lista se desplaza: se corrige una
 * clase mirando como queda.
 */
function LectorRevision({ imagen, candidatas, materias, sesiones, alCambiar, alIncluir }) {
  const [arriba, setArriba] = useState('semana')
  /* Que tarjeta tiene los ajustes abiertos. null es "todavia no se toco
     nada", y entonces las que tienen algo por revisar nacen abiertas: lo que
     hay que arreglar se ve con que se arregla, sin tener que descubrir que
     la tarjeta se despliega. */
  const [abierta, setAbierta] = useState(null)

  const tarjetas = ordenarRevision(candidatas)
  /* Lo que se dibuja en la semana: las clases sanas y las que solo se pisan
     con otra. Estas no van a entrar, pero verlas una encima de la otra es la
     forma mas clara de entender que hay que mover. */
  const enLaSemana = candidatas.filter((c) => c.avisos.every((aviso) => aviso === 'choca'))

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
    <div className="lector-cara">
      <div className="sticky top-0 z-[1] border-b border-panel-borde bg-panel">
        {imagen && (
          <div className="px-5 pb-3 sm:px-6">
            <Segmentos opciones={ARRIBA} valor={arriba} alCambiar={setArriba} etiqueta="Qué ver" />
          </div>
        )}
        {arriba === 'foto' && imagen ? (
          <img
            src={imagen.vistaPrevia}
            alt="El horario que subiste"
            className="mx-auto max-h-[38vh] w-full bg-panel-suave object-contain"
          />
        ) : (
          <SemanaLeida sesiones={enLaSemana} colorDe={colorDe} />
        )}
      </div>

      <ul className="lista-leida">
        {tarjetas.map((tarjeta) => {
          const estaAbierta =
            abierta === tarjeta.grupo || (abierta == null && tarjeta.porRevisar > 0)
          return (
            <MateriaLeida
              key={tarjeta.grupo}
              tarjeta={tarjeta}
              color={colorDe(tarjeta.materia?.codigo)}
              materias={materias}
              abierta={estaAbierta}
              nombreDelRival={nombreDelRival}
              alAbrir={() => setAbierta(estaAbierta ? '' : tarjeta.grupo)}
              alCambiar={alCambiar}
              alIncluir={alIncluir}
            />
          )
        })}
      </ul>
    </div>
  )
}

export default LectorRevision
