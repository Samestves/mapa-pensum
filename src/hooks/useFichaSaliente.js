import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * La ficha que se ve, y la que se esta yendo.
 *
 * Al cerrarse, la seleccion pasa a null en el acto y la ficha se desmontaria
 * sin mas, cortada en seco. Asi que se guarda lo ultimo que enseño y se sigue
 * pintando un cuarto de segundo mas, con `saliendo`, el tiempo de su
 * animacion de salida. Va en el mismo sitio del arbol que la abierta para que
 * React la trate como la MISMA ficha: si se cerro arrastrandola, conserva
 * hasta donde la bajo el dedo y la salida sigue desde ahi.
 *
 * `fichaAbierta` es la ficha de la materia seleccionada, o null; `seleccionado`
 * es el codigo de esa materia.
 */
export function useFichaSaliente(fichaAbierta, seleccionado) {
  const ultimaFicha = useRef(null)
  const [fichaSaliente, setFichaSaliente] = useState(null)
  const [seleccionPrevia, setSeleccionPrevia] = useState(seleccionado)
  useLayoutEffect(() => {
    if (fichaAbierta) ultimaFicha.current = fichaAbierta
  })
  /* Se ajusta DURANTE el render y no en un efecto. Con un efecto habia un
     render entero sin ficha entre la que se cerraba y su copia saliente: la
     ficha se desmontaba, se volvia a montar y repetia su animacion de entrada
     encima de la de salida. Ajustado aqui, React rehace el render antes de
     pintarlo y la ficha nunca llega a desaparecer. */
  if (seleccionPrevia !== seleccionado) {
    setSeleccionPrevia(seleccionado)
    setFichaSaliente(seleccionado == null ? ultimaFicha.current : null)
  }
  useEffect(() => {
    if (!fichaSaliente) return
    const reloj = setTimeout(() => setFichaSaliente(null), 260)
    return () => clearTimeout(reloj)
  }, [fichaSaliente])
  return fichaAbierta ?? fichaSaliente
}
