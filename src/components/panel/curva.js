/**
 * El trazado de una curva suave que pasa por unos puntos, para las graficas
 * del panel.
 *
 * Es una spline monotona (Fritsch-Carlson simplificada): entre dos puntos la
 * curva nunca sube por encima del mas alto ni baja por debajo del mas bajo.
 * Una Bezier cualquiera redondea pasandose de largo, y en una grafica de
 * visitas eso dibuja picos y valles que no hubo -un dia con menos de cero-.
 *
 * @param {[number, number][]} puntos  en coordenadas del SVG, de izquierda a derecha
 * @returns {string} el atributo d de un path
 */
export function curvaSuave(puntos) {
  if (!puntos.length) return ''
  const f = (n) => Math.round(n * 10) / 10
  const [x0, y0] = puntos[0]
  if (puntos.length === 1) return `M${f(x0)},${f(y0)}`

  const n = puntos.length
  const pendientes = []
  for (let i = 0; i < n - 1; i++) {
    const [xa, ya] = puntos[i]
    const [xb, yb] = puntos[i + 1]
    pendientes.push((yb - ya) / (xb - xa || 1))
  }
  /* La tangente en cada punto: la media de las dos pendientes de al lado, o
     plana donde la curva cambia de sentido -ahi esta el pico o el valle, y
     una tangente inclinada lo haria pasarse-. */
  const tangentes = puntos.map((_, i) => {
    if (i === 0) return pendientes[0]
    if (i === n - 1) return pendientes[n - 2]
    const [a, b] = [pendientes[i - 1], pendientes[i]]
    return a * b <= 0 ? 0 : (a + b) / 2
  })

  let d = `M${f(x0)},${f(y0)}`
  for (let i = 0; i < n - 1; i++) {
    const [xa, ya] = puntos[i]
    const [xb, yb] = puntos[i + 1]
    const tercio = (xb - xa) / 3
    d += `C${f(xa + tercio)},${f(ya + tangentes[i] * tercio)} ${f(xb - tercio)},${f(yb - tangentes[i + 1] * tercio)} ${f(xb)},${f(yb)}`
  }
  return d
}

/**
 * Una escala redonda para el eje: el tope por encima del maximo en pasos de
 * 5, 10, 20... y tres marcas, abajo, en medio y arriba. Nunca menos de un
 * paso, para que una serie de ceros no divida por cero.
 */
export function escalaRedonda(maximo) {
  const paso = maximo > 200 ? 100 : maximo > 60 ? 20 : maximo > 30 ? 10 : 5
  const tope = Math.max(paso, Math.ceil(maximo / paso) * paso)
  return { tope, marcas: [0, tope / 2, tope] }
}
