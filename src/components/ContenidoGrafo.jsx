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
          Cuatro cosas, ordenadas por lo que cada una vale:

            01                   el numero, lo unico que se lee de lejos
            SEMESTRE             la etiqueta, identica en las diez columnas
            6 materias · 17 UC   el dato
            ────────────         una regla que ademas dice cuanto llevas

          Estaba plano: los tres textos iban en tinta plena y extrabold, o sea
          los tres con el mismo peso, y encima con un contorno de 7 px que los
          emborronaba. El contorno estaba para separarlos de la rejilla del
          fondo y no hacia falta: medido en tema claro, la tinta tiene 14,08
          de contraste contra la linea de rejilla y el minimo para texto
          grande es 3. Un halo sobre 14 a 1 no separa nada.

          El numero cambia de tipografia. Iba en JetBrains Mono, que es una
          fuente para LEER CODIGO -cero punteado, terminales marcadas, formas
          pensadas para distinguir un 0 de una O en una linea diminuta-, y
          como numero de display eso se lee tecnico y no rotundo. Manrope a
          peso 800 da cifras cerradas y geometricas. Estaba en mono por la
          alineacion de las diez columnas, y resulta que no hacia falta:
          medido, Manrope trae cifras tabulares, asi que "01" y "10" ocupan
          exactamente lo mismo. Se gana la letra sin perder la rejilla y sin
          descargar una tercera fuente. */}
      {columnas.map((columna) => {
        const vivo = porColumna.get(columna.semestre) ?? { uc: 0, hechas: 0, total: 0 }
        const avance = vivo.total ? vivo.hechas / vivo.total : 0
        return (
          <g key={columna.semestre}>
            {/* De una pieza y de un solo color. Se probo a apagar el cero de
                relleno para destacar el digito que cuenta y era peor: dos
                tonos dentro de un mismo numero se leen como dos cosas, y
                "01" es una cosa. Un numero no se subraya por dentro. */}
            <text
              x={columna.x}
              y={MARGEN.top + 31}
              fontSize="46"
              fill="var(--tinta)"
              className="font-extrabold tracking-[-0.05em]"
            >
              {String(columna.semestre).padStart(2, '0')}
            </text>

            {/* El numero manda sobre la unidad: se lee el 6 y el 17, no
                "materias" y "UC", que son siempre las mismas dos palabras. */}
            <text
              x={columna.x + 66}
              y={MARGEN.top + 18}
              fontSize="11"
              fill="var(--tinta-tenue)"
              className="font-mono font-semibold"
            >
              <tspan fill="var(--tinta-suave)">{columna.cantidad}</tspan> materias
              <tspan dx="4">·</tspan>
              <tspan dx="4" fill="var(--tinta-suave)">
                {vivo.uc}
              </tspan>{' '}
              UC
            </text>

            <text
              x={columna.x + 66}
              y={MARGEN.top + 31}
              fontSize="8.5"
              fill="var(--tinta-tenue)"
              className="font-semibold tracking-[0.24em]"
            >
              SEMESTRE
            </text>

            {/* La regla hace dos trabajos y por eso no ensucia.
                Ya estaba ahi separando la cabecera de las tarjetas; ahora
                ademas se llena con lo que llevas aprobado de ese semestre.
                Un indicador de avance que no ocupa ni un pixel de mas es la
                unica clase de indicador que cabe en un mapa con diez columnas:
                cualquier barra añadida encima habria que restarsela al sitio
                de las materias. */}
            <line
              x1={columna.x}
              y1={MARGEN.top + 42}
              x2={columna.x + NODO.ancho}
              y2={MARGEN.top + 42}
              stroke="var(--tinta-tenue)"
              strokeOpacity="0.28"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {avance > 0 && (
              <line
                x1={columna.x}
                y1={MARGEN.top + 42}
                x2={columna.x + NODO.ancho * avance}
                y2={MARGEN.top + 42}
                stroke="var(--estado-aprobada)"
                strokeWidth="2.5"
                strokeLinecap="round"
                style={{ transition: 'stroke-width 200ms ease' }}
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
