/**
 * Un temporizador que se aplaza muchas veces seguidas sin que cueste.
 *
 * "Cuando el mapa lleve un rato quieto, haz esto" se escribe siempre igual:
 * en cada movimiento se cancela el temporizador y se pone otro. Pero un gesto
 * manda un movimiento por cuadro, o dos si es un pellizco, asi que eso era
 * quitar y poner temporizadores ciento veinte veces por segundo para que al
 * final solo venciera el ultimo.
 *
 * Aqui aplazar es apuntar una hora. Hay un solo temporizador puesto, y cuando
 * vence mira la hora apuntada: si la han corrido, se vuelve a dormir lo que
 * falte, y si no, avisa.
 *
 *  - aplazar(): que venza dentro de `ms`, contando desde ahora
 *  - asegurar(): que haya uno pendiente, sin correr la hora del que ya este
 *  - cancelar()
 *
 * `ahora` se puede pasar para probarlo sin esperar.
 */
export function relojAplazable(ms, alVencer, ahora = () => performance.now()) {
  let vence = 0
  let reloj = null

  const mirar = () => {
    const falta = vence - ahora()
    if (falta > 0) {
      reloj = setTimeout(mirar, falta)
      return
    }
    reloj = null
    alVencer()
  }

  const asegurar = () => {
    if (reloj != null) return
    vence = ahora() + ms
    reloj = setTimeout(mirar, ms)
  }

  return {
    aplazar() {
      if (reloj == null) asegurar()
      else vence = ahora() + ms
    },
    asegurar,
    cancelar() {
      clearTimeout(reloj)
      reloj = null
    },
  }
}
