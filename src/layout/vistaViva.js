/**
 * El pellizco en vivo: mover la capa ya pintada en vez de volver a pintarla.
 *
 * Pintar el mapa a otra escala es lo caro de un zoom. Chrome rehace la
 * maqueta de los doscientos y pico textos y vuelve a rasterizar todo lo que
 * se ve, y en un telefono eso son decenas de milisegundos por cuadro. Pero
 * mientras los dedos se mueven no hace falta nitidez, hace falta que el mapa
 * siga a los dedos. Asi que durante el gesto el <svg> ya pintado se estira y
 * se desplaza con un transform CSS, que resuelve la GPU sin repintar nada, y
 * al parar se pinta una sola vez a la escala final.
 *
 * Dos vistas: la VIVA, a donde van los dedos, y la PINTADA, la que tiene el
 * DOM. Todo lo de aqui es aritmetica entre las dos, sin React, para poder
 * probarlo.
 */

/* Cuanto se puede estirar la capa sin que se note. Estirada al doble ya se ve
   borrosa; hasta aqui pasa por el desenfoque normal de un gesto. */
export const AUMENTO_MAX = 1.8

/* Y cuanto se deja estirar mientras la mueve una mano. Mas, a proposito:
   pintar a mitad de un pellizco es parar el mapa unas decenas de ms, y eso
   se ve mucho mas que unas letras borrosas que van creciendo. Es lo que hace
   el navegador al ampliar una pagina con dos dedos: estira lo que tiene y lo
   afina cuando los dedos paran. Aqui igual -se pinta al quedarse quieto o al
   soltar (ver REPOSO_MS en useVistaGrafo)-, y a partir de cuatro veces se
   pinta de todos modos, que ahi ya no se sabe que se esta mirando.

   Medido en un telefono emulado a CPU x4, acercando de 0,45 a 2,3: con el
   tope en 1,8 el mapa se pintaba dos veces por el camino, con el cuadro
   parado unos 40 ms cada vez; con cuatro, una sola, casi al final. Y en un
   pellizco normal, de dos o tres veces, ninguna. */
export const AUMENTO_GESTO = 4

/* Cuanto mas grande que la ventana se pinta la capa, por cada lado y en
   fraccion de la ventana. Con 0,4 la capa mide 1,8 veces la ventana en cada
   eje, asi que se puede alejar hasta 1/1,8 -o arrastrar el 40 % de la
   pantalla- estirando lo ya pintado, sin repintar nada. Igual con el dedo que
   con el raton: la rueda y el arrastre de escritorio se resuelven igual que
   el pellizco.

   Sin margen la capa media justo la ventana, y alejar con el mapa llenando
   la pantalla destapaba un borde en el primer cuadro: el pellizco hacia
   alejarse repintaba el mapa entero en CADA cuadro, mientras que acercarse
   casi nunca. Esa era la diferencia entre alejar con tirones y acercar fluido.

   No mas: la capa vive en la memoria de la GPU, y a 1,8 por eje ya ocupa
   3,2 veces la ventana. Se probo con menos en los telefonos (0,25) para
   ahorrar memoria de GPU, y medido a CPU x6 salio peor: un arrastre normal
   ya se salia del margen y repintaba el mapa entero a mitad del gesto. */
export const MARGEN_CAPA = 0.4

/* Holgura alrededor del contenido, en unidades del mapa: el halo de las
   tarjetas y los puntos de llegada de los cables asoman unos pixeles fuera
   de la caja que da el layout. */
const HOLGURA = 12

/**
 * El transform que hace que la capa pintada con `pintada` se vea como `viva`.
 * Un punto del mapa X cae en pantalla en p = x + escala * X con cada vista;
 * despejando, la viva es la pintada escalada k y desplazada (x, y).
 */
export function transformRelativo(viva, pintada) {
  const k = viva.escala / pintada.escala
  return { k, x: viva.x - k * pintada.x, y: viva.y - k * pintada.y }
}

/** Mismo sitio y misma escala: no hay nada que estirar */
export function mismaVista(a, b) {
  return a.x === b.x && a.y === b.y && a.escala === b.escala
}

/**
 * Si estirar la capa pintada basta para enseñar la vista viva sin que falte
 * nada.
 *
 * La capa solo tiene lo que cabia en ella cuando se pinto: la ventana y
 * `margen` (fraccion de la ventana) por cada lado. Estirada, cubre ese
 * rectangulo transformado; si lo que la vista viva tiene de mapa dentro de la
 * ventana se sale de ahi, se veria un borde vacio. Pasa al alejar o arrastrar
 * mas alla del margen: en esos cuadros toca pintar de verdad.
 *
 * Alejando desde el mapa entero si cubre: contenido y ventana encogen
 * alrededor del mismo punto, asi que lo que estaba dentro sigue dentro.
 */
export function capaCubre(
  viva,
  pintada,
  medida,
  anchoContenido,
  altoContenido,
  aumentoMax = AUMENTO_MAX,
  margen = 0,
) {
  const { k, x, y } = transformRelativo(viva, pintada)
  if (k > aumentoMax) return false

  const m = HOLGURA * viva.escala
  const x0 = Math.max(0, viva.x - m)
  const x1 = Math.min(medida.ancho, viva.x + anchoContenido * viva.escala + m)
  const y0 = Math.max(0, viva.y - m)
  const y1 = Math.min(medida.alto, viva.y + altoContenido * viva.escala + m)
  // El mapa entero fuera de la ventana: no hay nada que pueda faltar
  if (x0 >= x1 || y0 >= y1) return true

  const TOLERANCIA = 0.5
  const mx = margen * medida.ancho
  const my = margen * medida.alto
  return (
    x0 >= x - k * mx - TOLERANCIA &&
    y0 >= y - k * my - TOLERANCIA &&
    x1 <= x + k * (medida.ancho + mx) + TOLERANCIA &&
    y1 <= y + k * (medida.alto + my) + TOLERANCIA
  )
}

/* Cuanto de la capa se deja por delante al pintarla a mitad de un arrastre,
   en fraccion del margen: con 0 la ventana queda en el centro de la capa, y
   con 1, pegada a su borde de atras. A tres cuartos queda por delante el
   70 % de la pantalla en vez del 40, y por detras lo justo para que
   rectificar un poco no destape el borde nada mas pintar. */
const ADELANTO = 0.75

/**
 * La vista a la que pintar cuando un gesto se sale de lo pintado y toca
 * pintar con el mapa en marcha.
 *
 * No la de ahora: una adelantada hacia donde va el gesto. Pintar es el tiron
 * de un gesto, y pintando justo lo que se ve, un arrastre largo o un mapa
 * lanzado volvian a salirse de la capa a los cuatro decimos de pantalla, y
 * alejar, cada vez que el mapa encogia a algo mas de la mitad. En pantalla
 * no cambia nada: la capa se estira desde la vista adelantada hasta la viva
 * igual que desde cualquier otra, y al parar se pinta la de verdad.
 *
 *  - Alejando: se pinta mas lejos de lo que se esta, lo que da el aumento
 *    que no se nota. La capa abarca mas mapa, y seguir alejando la encoge en
 *    vez de destaparle los bordes.
 *  - Arrastrando: se pinta corrida hacia donde va el mapa.
 *  - Acercando no hay nada que adelantar: lo que viene ya esta dentro.
 */
export function vistaAdelantada(viva, pintada, medida, margen) {
  if (viva.escala > pintada.escala) return viva

  if (viva.escala < pintada.escala) {
    const cx = medida.ancho / 2
    const cy = medida.alto / 2
    return {
      escala: viva.escala / AUMENTO_MAX,
      x: cx - (cx - viva.x) / AUMENTO_MAX,
      y: cy - (cy - viva.y) / AUMENTO_MAX,
    }
  }

  // El recorrido desde que se pinto, en pantallas: de ahi sale la direccion
  const dx = viva.x - pintada.x
  const dy = viva.y - pintada.y
  const recorrido = Math.max(Math.abs(dx) / medida.ancho, Math.abs(dy) / medida.alto)
  if (!recorrido) return viva
  const paso = (ADELANTO * margen) / recorrido
  return { ...viva, x: viva.x + dx * paso, y: viva.y + dy * paso }
}

/* Lo que tiene que cambiar una vista para que se note: un par de pixeles, o
   un uno por ciento de escala. Por debajo es el temblor de un dedo apoyado. */
const TEMBLOR_PX = 2
const TEMBLOR_ESCALA = 0.01

/**
 * Si de la vista `a` a la `b` el mapa se ha movido de verdad, y no solo
 * temblado.
 *
 * Se mira lo que se ve y no los numeros de la vista: cuanto se ha corrido lo
 * que estaba en el centro de la ventana. `x` e `y` dicen donde cae el origen
 * del mapa, que con el mapa ampliado esta a miles de pixeles: ahi el temblor
 * de un pellizco los mueve decenas de pixeles sin que en pantalla cambie
 * nada.
 */
export function seMueve(a, b, medida) {
  const k = b.escala / a.escala
  const cx = medida.ancho / 2
  const cy = medida.alto / 2
  return (
    Math.abs(b.x + k * (cx - a.x) - cx) > TEMBLOR_PX ||
    Math.abs(b.y + k * (cy - a.y) - cy) > TEMBLOR_PX ||
    Math.abs(k - 1) > TEMBLOR_ESCALA
  )
}

/* En un viaje de camara se deja estirar mas de lo que no se nota. El viaje
   dura menos de medio segundo y va deprisa justo al principio, que es
   cuando la capa esta mas estirada: el ojo va siguiendo el movimiento y no
   llega a leer letras. */
export const AUMENTO_VIAJE = 3

/**
 * La vista a la que pintar el mapa UNA vez para hacer un viaje de camara
 * entero estirando la capa, sin volver a pintar en ningun cuadro. O null si
 * no hay ninguna que sirva y toca pintar cada cuadro, como antes.
 *
 * Tiene que tener dentro lo que se ve al salir y lo que se ve al llegar. Lo
 * de en medio va solo: cada esquina de la ventana recorre el mapa en una
 * sola direccion durante el viaje, asi que no se sale de lo que cubren las
 * dos puntas.
 *
 * Se prueba primero la punta mas cercana, la de mas escala, que es la que
 * solo hay que encoger y se ve nitida todo el viaje:
 *
 *  - Alejarse, que es lo que hace aprobar: si el mapa entero ya cabia,
 *    encoger lo pintado basta. Si llenaba la pantalla, encogerlo destaparia
 *    los bordes, asi que se pinta el destino: al salir se ve algo estirado
 *    y al llegar esta nitido sin pintar nada mas.
 *  - Acercarse: lo que ya esta pintado se estira, y se pinta nitido al
 *    final.
 *  - Desplazarse, cuando ninguna punta contiene a la otra: una vista algo
 *    mas lejana que abarque las dos, y se pinta nitido al final.
 */
export function vistaParaViaje(desde, hasta, medida, anchoContenido, altoContenido, margen = 0) {
  const cubre = (viva, pintada) =>
    capaCubre(viva, pintada, medida, anchoContenido, altoContenido, AUMENTO_VIAJE, margen)
  const [cerca, lejos] = hasta.escala < desde.escala ? [desde, hasta] : [hasta, desde]
  if (cubre(lejos, cerca)) return cerca
  if (cubre(cerca, lejos)) return lejos

  // Lo que se ve de mapa desde cada punta, en coordenadas del mapa
  const visto = (v) => ({
    x0: Math.max(-HOLGURA, -v.x / v.escala),
    y0: Math.max(-HOLGURA, -v.y / v.escala),
    x1: Math.min(anchoContenido + HOLGURA, (medida.ancho - v.x) / v.escala),
    y1: Math.min(altoContenido + HOLGURA, (medida.alto - v.y) / v.escala),
  })
  const a = visto(desde)
  const b = visto(hasta)
  const x0 = Math.min(a.x0, b.x0)
  const y0 = Math.min(a.y0, b.y0)
  const x1 = Math.max(a.x1, b.x1)
  const y1 = Math.max(a.y1, b.y1)
  if (x1 <= x0 || y1 <= y0) return null

  const escala = Math.min(medida.ancho / (x1 - x0), medida.alto / (y1 - y0))
  const base = {
    escala,
    x: (medida.ancho - (x1 + x0) * escala) / 2,
    y: (medida.alto - (y1 + y0) * escala) / 2,
  }
  return cubre(desde, base) && cubre(hasta, base) ? base : null
}
