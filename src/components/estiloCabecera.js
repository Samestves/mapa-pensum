/* Estilo compartido de las celdas de la cabecera: los botones que viven DENTRO
   de una isla de cristal -no los que son una isla-.

   Una celda no lleva cristal propio: lo pone la isla que la contiene, y ella
   solo responde al gesto: al pulsar se hunde un poco, y el fondo de hover lo
   pone cada una con su color. Es lo que hace la barra de
   herramientas de macOS, y por lo mismo aqui: el cristal es UNA pieza y los
   botones son sus zonas, no cinco cristales pegados. Menos capas de
   desenfoque, que es lo que cuesta en un movil modesto, y una cabecera que
   se lee como un mando y no como un montón de piezas.

   Las celdas miden 36 px de alto siempre: con el relleno de la isla dan 40 en
   telefono y 44 en escritorio, el mismo alto que el resto de la fila. */
export const CELDA_BASE =
  'group relative flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full ' +
  'transition-[color,background-color,transform] duration-150 active:scale-[0.93]'
