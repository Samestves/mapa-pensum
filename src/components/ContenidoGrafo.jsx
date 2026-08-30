import { memo, useMemo } from 'react'
import { NODO, MARGEN } from '../layout/constantes'
import { ESTADO } from '../data/estados'
import NodoAsignatura from './NodoAsignatura'
import NodoElectiva from './NodoElectiva'
import NodoHueco from './NodoHueco'
import Arista from './Arista'

/**
 * Todo lo que va dentro del <g> que se desplaza y se acerca: cabeceras de
 * semestre, cables, nodos y la zona de electivas.
 *
 * Existe como componente aparte por una sola razon, y es de rendimiento.
 * El transform de pan y zoom vive en el <g> de fuera y cambia en cada
 * fotograma del arrastre. Con este contenido escrito dentro de GrafoPensum,
 * cada uno de esos fotogramas obligaba a React a recrear ciento treinta y un
 * elementos y a correr ciento treinta y una comparaciones de memo para
 * acabar cambiando un solo atributo. Medido: 15,2 ms por movimiento con
 * React contra 6,7 ms escribiendo el transform a mano.
 *
 * Aqui dentro nada depende de la vista, asi que al mover el mapa React
 * compara UNA prop, se sale, y el subarbol entero ni se toca.
 *
 * La consecuencia es que sus props tienen que mantener la identidad entre
 * renders. Las funciones vienen fijadas con useCallback desde arriba
 * -incluida `atenuado`, que se calcula en useFocoGrafo-. Si alguna volviera
 * a crearse en cada render, esto dejaria de servir en silencio y solo se
 * notaria en un telefono.
 */
function ContenidoGrafo({
  columnas,
  aristas,
  nodos,
  electivas,
  gruposElectivas,
  porCodigo,
  estados,
  descarga,
  toque,
  seleccionado,
  cadena,
  atenuado,
  enCasilla,
  alAbrirCasilla,
  ancho,
  alSenalar,
  alDejarDeSenalar,
  alVerFicha,
  alMarcar,
}) {
  /* Lo que la cabecera dice de cada semestre, ya con lo que el estudiante ha
     hecho y elegido. Se calcula una vez para las diez columnas en vez de
     recorrer los nodos dentro de cada una.

     Las UC suman las electivas que hayas COLOCADO. La cabecera cuenta la
     casilla como una materia del semestre -y esta bien, porque vas a cursar
     algo ahi-, asi que sus creditos tienen que entrar en cuanto se sepan
     cuales son. Vacia aporta cero, que es lo honesto: todavia no lo has
     decidido, y el mapa no se lo inventa. */
  const porColumna = useMemo(() => {
    const mapa = new Map()
    for (const nodo of nodos) {
      if (!mapa.has(nodo.semestre)) mapa.set(nodo.semestre, { uc: 0, hechas: 0, total: 0 })
      const fila = mapa.get(nodo.semestre)
      fila.total += 1

      const materia = nodo.esHueco ? enCasilla(nodo.codigo) : nodo
      if (!materia) continue
      fila.uc += materia.uc ?? 0
      if (estados[materia.codigo] === ESTADO.APROBADA) fila.hechas += 1
    }
    return mapa
  }, [nodos, estados, enCasilla])

  return (
    <>
      {/* Cabecera de cada semestre.

          LA PREGUNTA ES QUE TIENE QUE DECIR, no como se adorna. Un estudiante
          que recorre las diez columnas quiere saber tres cosas y en este orden:
          cual es, cuanto lleva hecho de ella, y cuanto pesa. Nada mas.

          Antes decia cuatro cosas y tres estaban susurradas: el numero a 46 px
          y, apretados a su derecha, "6 materias · 17 UC" a 11 px y la palabra
          SEMESTRE a 8,5 con mucho espaciado. Y el avance era una linea de 1,5
          px que casi nadie veia.

          Lo que se va: la palabra SEMESTRE. Es identica en las diez columnas,
          o sea que no distingue nada, y diez repeticiones de la misma palabra
          en una fila son ruido puro. La informacion no se pierde: el <title>
          accesible la dice, que es donde hace falta.

          Lo que sube de rango: EL AVANCE. Es la unica de las tres que cambia
          contigo, y era la mas fina. Pasa a ser una barra de pildora de 5 px
          -el mismo lenguaje que las barras de vida de la referencia- y ocupa
          el ancho completo de la columna, asi que las diez juntas se leen como
          un perfil de tu carrera de un vistazo.

          Y todo se apila a la izquierda, alineado con el borde de las tarjetas
          de abajo. La cabecera deja de ser un numero con dos notas colgando al
          lado y pasa a ser la primera fila de la columna. */}
      {columnas.map((columna) => {
        const vivo = porColumna.get(columna.semestre) ?? { uc: 0, hechas: 0, total: 0 }
        const avance = vivo.total ? vivo.hechas / vivo.total : 0
        return (
          <g key={columna.semestre}>
            <title>{`Semestre ${columna.semestre}: ${vivo.hechas} de ${vivo.total} materias aprobadas, ${vivo.uc} UC`}</title>

            {/* El numero. De una pieza y de un solo color: se probo a apagar
                el cero de relleno para destacar el digito que cuenta y era
                peor, porque dos tonos dentro de un mismo numero se leen como
                dos cosas y "01" es una cosa. */}
            <text
              x={columna.x}
              y={MARGEN.top + 30}
              fontSize="40"
              fill="var(--tinta)"
              className="font-extrabold tabular-nums tracking-[-0.055em]"
            >
              {String(columna.semestre).padStart(2, '0')}
            </text>

            {/* El dato, a la derecha del numero y en su linea de base. El
                numero manda sobre la unidad: se lee el 6 y el 17, no las dos
                palabras que se repiten en las diez columnas. */}
            <text
              x={columna.x + 58}
              y={MARGEN.top + 30}
              fontSize="11"
              fill="var(--tinta-tenue)"
              className="tabular-nums font-semibold"
            >
              <tspan fill="var(--tinta)" fillOpacity="0.8">
                {vivo.hechas}
              </tspan>
              <tspan dx="3">de</tspan>
              <tspan dx="3" fill="var(--tinta)" fillOpacity="0.8">
                {columna.cantidad}
              </tspan>
              <tspan dx="6">·</tspan>
              <tspan dx="6" fill="var(--tinta)" fillOpacity="0.8">
                {vivo.uc}
              </tspan>
              <tspan dx="3">UC</tspan>
            </text>

            {/* La barra de avance. El canal siempre esta -si solo se dibujara
                cuando hay progreso, las columnas vacias perderian su linea de
                base y la fila de cabeceras se desalinearia-. */}
            <rect
              x={columna.x}
              y={MARGEN.top + 40}
              width={NODO.ancho}
              height={5}
              rx={2.5}
              fill="var(--tinta)"
              fillOpacity="0.1"
            />
            {avance > 0 && (
              <rect
                x={columna.x}
                y={MARGEN.top + 40}
                width={Math.max(5, NODO.ancho * avance)}
                height={5}
                rx={2.5}
                fill="var(--estado-aprobada)"
                style={{ transition: 'width 320ms cubic-bezier(0.32, 0.72, 0, 1)' }}
              />
            )}
          </g>
        )
      })}

      {/* Los cables van debajo de las tarjetas, pero el ruteo garantiza
          que ninguno pasa por encima de un nodo. */}
      <g>
        {aristas.map((arista, i) => (
          <Arista
            key={arista.id}
            d={arista.d}
            x2={arista.x2}
            y2={arista.y2}
            area={arista.area}
            codigoOrigen={arista.origen}
            // Retardo y velocidad distintos por cable: sincronizados
            // todos se veria como un metronomo. Se calculan del indice,
            // asi que son estables y no reinician la animacion.
            retardo={(i % 7) * 0.55}
            velocidad={3.8 + (i % 5) * 0.35}
            viva={estados[arista.origen] === ESTADO.APROBADA}
            /* Lleva corriente el cable que va de algo aprobado a algo que
               eso acaba de abrir. Es lo que el efecto siempre quiso decir, y
               de paso es lo unico que no crece sin freno segun avanza la
               carrera: la frontera de lo inscribible siempre es pequeña. */
            desbloqueando={
              estados[arista.origen] === ESTADO.APROBADA &&
              estados[arista.destino] === ESTADO.DISPONIBLE
            }
            resaltada={cadena != null && cadena.has(arista.origen) && cadena.has(arista.destino)}
            atenuada={atenuado(arista.origen) || atenuado(arista.destino)}
            descargando={descarga?.codigo === arista.origen}
            claveDescarga={descarga?.n}
          />
        ))}
      </g>

      {/* Los huecos de electiva no son materias: ni estado, ni marca, ni
          ficha. Se dibujan aparte para no meter ese caso dentro del nodo
          normal, que ya tiene cuatro estados que atender. */}
      {nodos
        .filter((nodo) => nodo.esHueco)
        .map((nodo) => (
          <NodoHueco
            key={nodo.codigo}
            nodo={nodo}
            electiva={enCasilla(nodo.codigo)}
            estado={estados[enCasilla(nodo.codigo)?.codigo]}
            /* El foco y la seleccion preguntan por la ELECTIVA cuando la hay,
               y solo por la casilla cuando esta vacia.

               Aqui habia un fallo que apagaba el mapa entero. Una casilla
               llena dibuja una materia, pero lo hacia bajo el codigo de la
               casilla -casilla-humanistica-1-, mientras que la cadena de
               prelaciones se calcula con el codigo real de la materia
               -0113053-. Al pulsarla, la cadena no contenia NI UN nodo de los
               que estan dibujados, asi que los cuarenta y nueve nodos y las
               ocho casillas se iban a opacidad 0,14 a la vez. Medido: 49/49 y
               8/8 atenuados.

               Una materia tiene un codigo. Que ademas ocupe una casilla es
               donde esta, no quien es. */
            atenuado={atenuado(enCasilla(nodo.codigo)?.codigo ?? nodo.codigo)}
            seleccionado={seleccionado === (enCasilla(nodo.codigo)?.codigo ?? nodo.codigo)}
            /* Por el mismo motivo que el atenuado: la cadena se calcula con el
               codigo de la MATERIA, no con el de la casilla que ocupa. */
            resaltado={cadena != null && cadena.has(enCasilla(nodo.codigo)?.codigo)}
            alAbrir={alAbrirCasilla}
            alVerFicha={alVerFicha}
          />
        ))}

      {nodos
        .filter((nodo) => !nodo.esHueco)
        .map((nodo) => (
          <NodoAsignatura
            key={nodo.codigo}
            nodo={nodo}
            estado={estados[nodo.codigo]}
            seleccionado={seleccionado === nodo.codigo}
            resaltado={cadena != null && cadena.has(nodo.codigo)}
            atenuado={atenuado(nodo.codigo)}
            destellando={
              descarga != null &&
              estados[nodo.codigo] === ESTADO.DISPONIBLE &&
              (nodo.prerrequisitos ?? []).includes(descarga.codigo)
            }
            claveDestello={descarga?.n}
            tocado={toque?.codigo === nodo.codigo}
            claveToque={toque?.n}
            alMarcar={alMarcar}
            alSenalar={alSenalar}
            alDejarDeSenalar={alDejarDeSenalar}
            alVerFicha={alVerFicha}
          />
        ))}

      {/* Zona de electivas, debajo de los 10 semestres */}
      {gruposElectivas.map((grupo) => (
        <g key={grupo.clave}>
          <line
            x1={MARGEN.left}
            y1={grupo.yTitulo + 4}
            x2={ancho - MARGEN.right}
            y2={grupo.yTitulo + 4}
            stroke="var(--tinta-tenue)"
            strokeOpacity="0.22"
            strokeWidth="1"
            strokeDasharray="2 8"
          />
          {/* Titulo y cuota son UN solo texto con dos tramos, no dos textos
              colocados cada uno por su cuenta.

              La cuota salia antes a 300 px del margen izquierdo, un numero
              que valia mientras el titulo fuese corto: "ELECTIVAS TECNICAS"
              acaba en 248 y cabia, pero "ELECTIVAS SOCIOHUMANISTICAS" acaba
              en 358 y se le montaba encima diez pixeles. Cualquier otro
              numero fijo solo mueve el titulo a partir del cual vuelve a
              romperse.

              Con dos tspan y un dx, el segundo tramo arranca donde acaba el
              primero: lo coloca el propio SVG y la separacion es la misma
              diga lo que diga el titulo, sin medir texto ni llevar refs.

              Anclarla al extremo derecho tambien evitaba el choque, pero era
              peor: a la escala en que el mapa entra entero, once pixeles y
              medio se dibujan a poco mas de cuatro y no se leen, asi que la
              cuota solo se lee acercandose -y acercandose, el otro extremo de
              la franja cae a tres mil pixeles del titulo-. Se leeria "elige
              15 UC de 25 opciones" sin ver de que grupo. Juntas o no sirve.

              Aqui tambien se fue el halo, por lo mismo que en la cabecera de
              semestre: la tinta tiene catorce veces el contraste que hace
              falta contra la rejilla, asi que un contorno de 4 px no separaba
              nada y solo engordaba los bordes. Quitarlo en un sitio de dos
              habria dejado el mapa con dos criterios distintos para el mismo
              problema. */}
          <text x={MARGEN.left} y={grupo.yTitulo + 34}>
            <tspan
              fontSize="15"
              fill="var(--tinta)"
              className="font-extrabold tracking-[0.16em]"
            >
              {grupo.titulo}
            </tspan>
            {/* La cuota sale del pensum, no del componente. Donde no la hay
                se dice cuantas opciones existen y nada mas. */}
            <tspan
              dx="18"
              fontSize="11.5"
              fill="var(--tinta-suave)"
              className="font-mono font-semibold tabular-nums"
            >
              {grupo.cuota != null
                ? `elige ${grupo.cuota} UC de ${grupo.cantidad} opciones`
                : `${grupo.cantidad} opciones`}
            </tspan>
          </text>
        </g>
      ))}

      {electivas.map((nodo) => (
        <NodoElectiva
          key={nodo.codigo}
          nodo={nodo}
          estado={estados[nodo.codigo]}
          // Primer requisito pendiente, para decirlo en la tarjeta
          requisito={
            (nodo.prerrequisitos ?? [])
              .filter((p) => estados[p] !== ESTADO.APROBADA)
              .map((p) => porCodigo.get(p)?.nombre ?? p)[0]
          }
          seleccionado={seleccionado === nodo.codigo}
          resaltado={cadena != null && cadena.has(nodo.codigo)}
          atenuado={atenuado(nodo.codigo)}
          alSenalar={alSenalar}
          alDejarDeSenalar={alDejarDeSenalar}
          alHacerClick={alVerFicha}
        />
      ))}
    </>
  )
}

export default memo(ContenidoGrafo)
