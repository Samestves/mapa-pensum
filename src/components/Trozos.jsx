import { Children, Fragment } from 'react'

/* Lo que se pinta en un renglon corto -"A-46 · Sec. 02 · Pérez", "10:20 AM ·
   A-46"- se parte donde el navegador quiera: en un telefono, con un nombre
   largo, queda "A-" arriba y "46" abajo. Un aula partida por su guion no se
   lee. Lo que se busca es que el renglon solo se parta ENTRE trozos, y que
   cada trozo baje entero al siguiente cuando no cabe. */

/** Un trozo que no se parte por dentro: ni por un espacio ni por un guion */
export function Entero({ children }) {
  return <span className="whitespace-nowrap">{children}</span>
}

/* El punto va pegado al trozo de antes con un espacio duro: el renglon se
   parte DESPUES del punto, nunca antes, y ninguno empieza con un "·" suelto. */
const PUNTO = ' ·'

/**
 * Sus hijos, separados por " · " y partibles solo en esos separadores.
 *
 * No envuelve a nadie: un hijo envuelto en <Entero> no se parte por dentro, y
 * uno sin envolver -un nombre largo- puede ocupar dos renglones. Los hijos
 * vacios (false, null, "") no estan, asi que un trozo opcional se escribe
 * como `{aula && <Entero>{aula}</Entero>}` y no deja un separador colgando.
 */
function Trozos({ children }) {
  const trozos = Children.toArray(children).filter((trozo) => trozo !== '')

  return trozos.map((trozo, i) => (
    <Fragment key={i}>
      {trozo}
      {i < trozos.length - 1 && `${PUNTO} `}
    </Fragment>
  ))
}

export default Trozos
