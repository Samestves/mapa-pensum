/* Dos juegos de manejadores de puntero sobre el mismo elemento: el lienzo
   lleva el arrastre del mapa y, encima, el mantener de las tarjetas. Se
   llaman los dos, primero `a`. */
export function ambos(a, b) {
  const juntos = { ...a }
  for (const evento in b) {
    juntos[evento] = a[evento]
      ? (e) => {
          a[evento](e)
          b[evento](e)
        }
      : b[evento]
  }
  return juntos
}
