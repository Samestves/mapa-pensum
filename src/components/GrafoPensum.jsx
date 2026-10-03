import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useVistaGrafo } from '../hooks/useVistaGrafo'
import { useFocoGrafo } from '../hooks/useFocoGrafo'
import { useMantenerRuta } from '../hooks/useMantenerRuta'
import { FormasBase, Luces, Plano, PlanosFoco, TextosBase } from './PlanosGrafo'
import { RotulosFormas, RotulosTextos } from './RotulosGrafo'
import DefsGrafo from './DefsGrafo'
import DetalleAsignatura from './DetalleAsignatura'
import ContornoCarga from './ContornoCarga'
import { situacionDe } from '../layout/situacion'
import { NODO } from '../layout/constantes'
import { ESTADO } from '../data/estados'
import { guardarCamara, leerCamara, semestreFrente, vistaDeColumna } from '../layout/camara'
import { cabecerasDe } from '../layout/cabeceras'
import { MARGEN_CAPA } from '../layout/vistaViva'

/* Cuanto tiene que pararse el raton en una tarjeta para encender su ruta.
   Encenderla monta el plano de foco y el de lo que sale (ver PlanosFoco):
   hacerlo en cada tarjeta que el raton cruza de pasada eran cuadros de
   hasta 90 ms al barrer el mapa. Parado, 80 ms no se notan. */
const INTENCION_MS = 80

/* Una sola lista vacia para las carreras sin franja: un [] nuevo en cada
   render cambiaria de identidad y tiraria el memo del contenido del mapa. */
const SIN_FRANJA = []

/* Dos juegos de manejadores de puntero sobre el mismo elemento: el lienzo
   lleva el arrastre del mapa y, encima, el mantener de las tarjetas. Se
   llaman los dos, primero `a`. */
function ambos(a, b) {
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

/* La capa pintada con margen: se sale de la ventana MARGEN_CAPA (fraccion
   de la ventana) por cada lado, y su origen de transformacion es la esquina
   de la ventana dentro de ella. Asi el estiramiento usa las mismas cuentas
   con margen que sin el (ver layout/vistaViva.js). */
const ORIGEN_CAPA = `${(MARGEN_CAPA / (1 + 2 * MARGEN_CAPA)) * 100}%`
const ESTILO_CAPA = {
  inset: `${-MARGEN_CAPA * 100}%`,
  transformOrigin: `${ORIGEN_CAPA} ${ORIGEN_CAPA}`,
}

function GrafoPensum({
  clave,
  layout,
  porCodigo,
  estados,
  descarga,
  toque,
  areaFiltrada,
  seleccionado,
  alSeleccionar,
  alMarcar,
  marcasSemestre,
  alAlternarSemestre,
  enCasilla,
  alAbrirCasilla,
  casillaDe,
}) {
  const { nodos, columnas, aristas, relaciones, ancho, alto } = layout
  // La franja de electivas solo existe en las carreras sin casillas oficiales
  const casillasFranja = layout.casillasFranja ?? SIN_FRANJA
  const filasFranja = layout.filasFranja ?? SIN_FRANJA

  /* Situacion de cada materia -hecha, cursando, inscribible, proxima o
     lejana-. Cambia de identidad solo cuando cambian los estados, que es
     cuando de verdad hay que repintar. */
  const situaciones = useMemo(() => {
    const mapa = new Map()
    const poner = (a) => {
      if (a && !mapa.has(a.codigo)) {
        mapa.set(a.codigo, situacionDe(a.codigo, a.prerrequisitos, estados))
      }
    }
    for (const nodo of nodos) poner(nodo.esHueco ? enCasilla(nodo.codigo) : nodo)
    for (const casilla of casillasFranja) poner(enCasilla(casilla.codigo))
    return mapa
  }, [nodos, casillasFranja, estados, enCasilla])

  /* Lo que dice la cabecera de cada semestre, para sus formas y su texto */
  const cabeceras = useMemo(
    () => cabecerasDe(columnas, nodos, enCasilla, situaciones),
    [columnas, nodos, enCasilla, situaciones],
  )

  /* Tu semestre a escala de lectura: la columna donde tienes algo que
     inscribir o que estas cursando (ver layout/camara.js). */
  const vistaDelFrente = useCallback(
    (m) => {
      const semestre = semestreFrente(nodos, situaciones)
      const columna = columnas.find((c) => c.semestre === semestre) ?? columnas[0]
      return columna ? vistaDeColumna(columna, m) : null
    },
    [nodos, situaciones, columnas],
  )

  /* Con que vista abre el mapa. La de la ultima vez, si vuelves a esta
     carrera en la misma sesion -del horario, de la lista, o recargando-. Si
     no, en el telefono, tu semestre; en escritorio, la carrera entera, que
     ahi si se lee. */
  const vistaInicial = useCallback(
    (m) => leerCamara(clave, m) ?? (m.ancho < 768 ? vistaDelFrente(m) : null),
    [clave, vistaDelFrente],
  )

  const {
    contenedorRef,
    capaRef,
    seguir,
    vista,
    medida,
    encajado,
    arrastrando,
    enGesto,
    refEnGesto,
    huboMovimiento,
    mostrar,
    controlesArrastre,
  } = useVistaGrafo(ancho, alto, vistaInicial)

  /* Se guarda donde esta la camara cada vez que se queda quieta */
  useEffect(() => {
    if (!encajado || !medida.ancho) return
    const reloj = setTimeout(() => guardarCamara(clave, vista, medida), 300)
    return () => clearTimeout(reloj)
  }, [clave, vista, medida, encajado])

  /* La ruta fijada manteniendo el dedo en una tarjeta (ver
     layout/mantenerRuta.js). Vive aqui y no con el señalado de arriba porque
     es otra cosa: el señalado se apaga al mover el mapa, y esta existe
     justamente para recorrerlo con ella puesta.
     Se guarda con la carrera a la que pertenece: al cambiar de carrera deja
     de valer sola, sin un efecto que la limpie. */
  const [ruta, setRuta] = useState(null)
  const rutaFijada = ruta?.clave === clave ? ruta.codigo : null
  const fijarRuta = useCallback((codigo) => setRuta({ clave, codigo }), [clave])
  const soltarRuta = useCallback(() => setRuta(null), [])
  const { carga, manejadores: gestosRuta, tragarToque } = useMantenerRuta(fijarRuta)

  /* La materia que señala el raton. Vive aqui y no mas arriba a proposito:
     cambia cada vez que el raton cruza una tarjeta, y en VistaCarrera cada
     cambio repintaba la pantalla entera -cabecera, paneles, paleta- para
     algo que solo le importa al mapa. */
  const [senalado, alSenalar] = useState(null)

  // Manda la seleccion, luego la ruta fijada, y por ultimo el raton
  const senaladoVisible = rutaFijada ?? senalado

  const { mirada, foco, nodoSeleccionado, detalle } = useFocoGrafo({
    seleccionado,
    senalado: senaladoVisible,
    areaFiltrada,
    estados,
    relaciones,
    porCodigo,
    nodos,
    casillasFranja,
    aristas,
    enCasilla,
    vista,
  })

  // Los nodos estan memoizados, asi que lo que reciben tiene que mantener su
  // identidad entre renders o el memo no sirve de nada. Estas tres funciones
  // son las unicas props de los nodos que no son valores simples, y por eso
  // son las unicas que hay que fijar. Reciben el codigo en vez de venir ya
  // atadas a un nodo concreto: una funcion por mapa, no una por materia.
  /* Señalar se ignora mientras el mapa se mueve: quien arrastra el mapa lo
     esta moviendo, no inspeccionando lo que le pasa por debajo, y cada
     tarjeta cruzada encenderia y apagaria su cadena.
     Se consulta una ref y no el estado para no cambiar de identidad, que es
     lo unico que mantiene vivo el memo. */
  /* Soltar el señalado espera un poco; cambiarlo, no.

     Entre dos tarjetas hay hueco, asi que al pasar de una a otra el puntero
     SALE de la primera antes de ENTRAR en la segunda. Con el soltado
     inmediato habia un instante sin nada señalado: el mapa entero volvia a
     encenderse y enseguida se apagaba otra vez para la segunda, y como las
     opacidades llevan transicion, ese ida y vuelta se veia como un destello
     de todas las tarjetas antes del resaltado bueno.

     Ahora salir solo PROGRAMA soltar, y entrar en otra tarjeta lo cancela y
     cambia directamente de una cadena a otra. Si de verdad te fuiste al
     lienzo vacio, a los 160 ms se suelta igual. Cruzar la fila de 26 px entre
     dos tarjetas lleva bastante menos que eso a cualquier velocidad normal. */
  const relojSoltar = useRef(null)
  const relojSenalar = useRef(null)

  /* Entrar en una tarjeta PROGRAMA encenderla (ver INTENCION_MS): si el
     raton sigue de largo, salir lo cancela y no se monta nada. Lo que
     estuviera encendido se queda hasta que la nueva se encienda, asi que
     pasar despacio de una tarjeta a la de al lado no apaga el mapa entre
     medias. */
  const senalar = useCallback(
    (codigo) => {
      if (refEnGesto.current) return
      clearTimeout(relojSoltar.current)
      clearTimeout(relojSenalar.current)
      relojSenalar.current = setTimeout(() => alSenalar(codigo), INTENCION_MS)
    },
    [alSenalar, refEnGesto],
  )
  const dejarDeSenalar = useCallback(() => {
    clearTimeout(relojSenalar.current)
    clearTimeout(relojSoltar.current)
    relojSoltar.current = setTimeout(() => alSenalar(null), 160)
  }, [alSenalar])

  useEffect(
    () => () => {
      clearTimeout(relojSoltar.current)
      clearTimeout(relojSenalar.current)
    },
    [],
  )

  /* Y al empezar a mover, lo que hubiera resaltado se apaga. Arrastrar el
     mapa con media pantalla atenuada estorba para ver a donde se va, y de
     paso deja el gesto con el arbol en su estado mas barato. */
  useEffect(() => {
    if (!enGesto) return
    clearTimeout(relojSenalar.current)
    clearTimeout(relojSoltar.current)
    alSenalar(null)
  }, [enGesto, alSenalar])
  /* La situacion de cualquier materia, tambien de las que no estan
     dibujadas -una electiva sin colocar que aparece en la ficha-. */
  const situacionDeCodigo = useCallback(
    (codigo) =>
      situaciones.get(codigo) ??
      situacionDe(codigo, porCodigo.get(codigo)?.prerrequisitos, estados),
    [situaciones, porCodigo, estados],
  )

  /* El rectangulo de una materia en coordenadas del mapa, o null si no esta
     dibujada -una electiva que no has colocado-. */
  const cajaDe = useCallback(
    (codigo) => {
      const a = porCodigo.get(codigo)
      if (!a || !Number.isFinite(a.x) || !Number.isFinite(a.y)) return null
      return { x0: a.x, y0: a.y, x1: a.x + NODO.ancho, y1: a.y + NODO.alto }
    },
    [porCodigo],
  )
  const puedeIr = useCallback((codigo) => cajaDe(codigo) != null, [cajaDe])

  /* En el telefono la ficha tapa la parte de abajo del mapa. Cuando se abre
     dice cuanto tapa, y el mapa se corre para que la materia pulsada quede a
     la vista encima de ella: tocar una tarjeta de la mitad de abajo la
     escondia justo debajo de su propia ficha. */
  const taparAbajo = useCallback(
    (abajo) => {
      const caja = cajaDe(seleccionado)
      if (caja) mostrar(caja, { arriba: 24, abajo: abajo + 16, izq: 20, der: 20 })
    },
    [cajaDe, seleccionado, mostrar],
  )

  /* Desde la ficha se puede saltar a una prelacion o a lo que desbloquea.
     En escritorio el mapa la trae a la vista aqui; en el telefono ya lo hace
     taparAbajo al abrirse la ficha de la nueva. */
  const irAMateria = useCallback(
    (codigo) => {
      if (codigo === seleccionado) return
      alSeleccionar(codigo)
      const caja = cajaDe(codigo)
      if (caja && medida.ancho >= 768) mostrar(caja, { arriba: 48, abajo: 48, izq: 48, der: 48 })
    },
    [seleccionado, alSeleccionar, cajaDe, medida.ancho, mostrar],
  )

  /* La ficha que se ve, y la que se esta yendo.

     Al cerrarse, la seleccion pasa a null en el acto y la ficha se
     desmontaria sin mas, cortada en seco. Asi que se guarda lo ultimo que
     enseño y se sigue pintando un cuarto de segundo mas, con `saliendo`, el
     tiempo de su animacion de salida. Va en el mismo sitio del arbol que la
     abierta para que React la trate como la MISMA ficha: si se cerro
     arrastrandola, conserva hasta donde la bajo el dedo y la salida sigue
     desde ahi. */
  const fichaAbierta = detalle
    ? {
        nodo: nodoSeleccionado,
        estado: estados[seleccionado],
        situacion: situacionDeCodigo(seleccionado),
        prerrequisitos: detalle.prerrequisitos,
        desbloquea: detalle.desbloquea,
        posicion: detalle.posicion,
        enCasilla: casillaDe?.[seleccionado],
      }
    : null
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
  const ficha = fichaAbierta ?? fichaSaliente

  /* En escritorio la ficha va al lado de su tarjeta, fuera de la capa del
     mapa. Mientras un gesto estira la capa, se engancha al borde derecho de
     la tarjeta y se desplaza con el (ver seguir en useVistaGrafo). */
  const nodoFicha = ficha?.nodo
  const refFicha = useMemo(
    () => (nodoFicha ? seguir(nodoFicha.x + NODO.ancho, nodoFicha.y) : undefined),
    [nodoFicha, seguir],
  )

  /**
   * Marcar desde la ficha. Cursando y sin cursar se quedan con la ficha
   * abierta: son cambios de estado y ya. Aprobar es otra cosa, es el momento
   * en que algo se abre, y la luz corre por los cables hacia lo que se
   * desbloquea. Con la ficha abierta esa luz pasaba por debajo de ella -la
   * ficha se pone al lado de la tarjeta, justo por donde salen sus cables- y
   * no se veia.
   *
   * Asi que al aprobar la ficha se aparta, el mapa se corre lo justo para
   * que quepan la materia y todo lo que desbloquea, y la luz sale cuando el
   * mapa ya llego (ver .descarga en estilos/mapa.css).
   */
  const marcarDesdeFicha = useCallback(
    (codigo, marca) => {
      const antes = estados[codigo]
      const marcaAntes = antes === ESTADO.APROBADA || antes === ESTADO.CURSANDO ? antes : null
      if (marca !== ESTADO.APROBADA || marcaAntes === ESTADO.APROBADA) {
        alMarcar(codigo, marca)
        return
      }

      const siguientes = relaciones.adelante.get(codigo) ?? []

      // La caja que tiene que verse: la materia y todo lo que sale de ella
      const cajas = [codigo, ...siguientes]
        .map((c) => porCodigo.get(c))
        .filter((a) => a && Number.isFinite(a.x) && Number.isFinite(a.y))
      if (cajas.length) {
        const telefono = medida.ancho < 768
        mostrar(
          {
            x0: Math.min(...cajas.map((a) => a.x)),
            y0: Math.min(...cajas.map((a) => a.y)),
            x1: Math.max(...cajas.map((a) => a.x + NODO.ancho)),
            y1: Math.max(...cajas.map((a) => a.y + NODO.alto)),
          },
          // En el telefono, abajo queda la barra de las vistas
          telefono
            ? { arriba: 32, abajo: 112, izq: 24, der: 24 }
            : { arriba: 48, abajo: 48, izq: 48, der: 48 },
        )
      }

      alSeleccionar(null)
      alMarcar(codigo, marca)
    },
    [estados, relaciones, porCodigo, medida.ancho, mostrar, alSeleccionar, alMarcar],
  )

  /* Marcar o desmarcar un semestre desde su casilla. Como un click en una
     tarjeta: si el puntero se movio fue un arrastre del lienzo, no un click. */
  const alternarSemestre = useCallback(
    (semestre) => {
      if (huboMovimiento.current) return
      alSeleccionar(null)
      alAlternarSemestre(semestre)
    },
    [huboMovimiento, alSeleccionar, alAlternarSemestre],
  )

  const verFicha = useCallback(
    (codigo) => {
      // Si el puntero se movio, fue un arrastre del lienzo, no un click
      if (huboMovimiento.current) return
      // El click de levantar el dedo de una ruta recien fijada no abre nada
      if (tragarToque()) return
      soltarRuta()
      alSeleccionar(codigo)
    },
    [alSeleccionar, huboMovimiento, tragarToque, soltarRuta],
  )

  /* La vista de todos los planos: la de la camara, corrida el margen con el
     que se pinta la capa por fuera de la ventana. */
  const vistaPlanos = {
    x: vista.x + MARGEN_CAPA * medida.ancho,
    y: vista.y + MARGEN_CAPA * medida.alto,
    escala: vista.escala,
  }
  const conFoco = foco ? '' : undefined
  /* Lo que necesitan los planos de foco para dibujar una tarjeta igual que
     la base. Todo estable entre renders: ver FormasBase. */
  const contexto = {
    situaciones,
    aristas,
    nodos,
    casillasFranja,
    porCodigo,
    descarga,
    toque,
    enCasilla,
    alAbrirCasilla,
    alSenalar: senalar,
    alDejarDeSenalar: dejarDeSenalar,
    alVerFicha: verFicha,
  }

  return (
    <div
      ref={contenedorRef}
      className="relative min-w-0 flex-1 overflow-hidden"
      style={{ backgroundColor: 'var(--lienzo-mapa)' }}
    >
      {/* El lienzo: aqui van los gestos, y no en el contenedor, para que la
          ficha -hermana de este div- no arranque un arrastre al pulsarla.
          El zoom es la rueda o el pellizco del trackpad en escritorio, y el
          pellizco o el doble toque en el telefono: sin botones encima. */}
      {/* Sin el globo del sistema al mantener el dedo (iOS lo saca sobre
          texto e imagenes aunque no se pueda seleccionar nada) */}
      <div
        className={`absolute inset-0 select-none ${arrastrando ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ touchAction: 'none', WebkitTouchCallout: 'none' }}
        {...ambos(gestosRuta, controlesArrastre)}
      >
        {/* La rejilla del fondo va aparte y se queda quieta; el contenido va
            en su propia capa para poder estirarla entera durante los gestos
            (ver layout/vistaViva.js). Un <g> no se puede estirar en la GPU;
            una capa HTML si. */}
        <svg width="100%" height="100%" className="absolute inset-0">
          <DefsGrafo />

          {/* Click en el vacio: cierra la seleccion. Le llega a traves de la
              capa del contenido, que solo atrapa lo que tiene dibujado. */}
          <rect
            width="100%"
            height="100%"
            fill="url(#rejilla)"
            onClick={() => {
              if (huboMovimiento.current) return
              alSeleccionar(null)
              soltarRuta()
            }}
          />
        </svg>

        {/* La capa que se estira: un div que envuelve los planos, y no los
            planos mismos. Estirarla mueve en la GPU lo ya pintado sin tocar
            nada de dentro; cambiarle el transform a un <svg> lo toma Chrome
            como un cambio de escala del dibujo y lo vuelve a maquetar.

            Dentro, los planos del mapa (ver PlanosGrafo), de abajo arriba:
            rotulos, base, luces y foco. Con foco, la base y las luces se
            apagan enteras (data-foco); los rotulos no, para que se siga
            leyendo en que semestre cae cada materia de la cadena.

            Oculta hasta que la vista se encaja. El primer fotograma tras
            montar dibuja el mapa a tamaño natural desde la esquina, y
            enseñarlo era el tiron que se veia al volver del horario. Se revela
            con la animacion de llegada (ver llegar en useVistaGrafo). */}
        <div
          ref={capaRef}
          className="capa-grafo font-ui absolute"
          style={{ ...ESTILO_CAPA, opacity: encajado ? 1 : 0 }}
        >
          <Plano
            vista={vistaPlanos}
            className="plano-rotulos"
            formas={
              <RotulosFormas
                cabeceras={cabeceras}
                filasFranja={filasFranja}
                ancho={ancho}
                marcas={marcasSemestre}
                alAlternar={alternarSemestre}
              />
            }
            textos={<RotulosTextos cabeceras={cabeceras} filasFranja={filasFranja} />}
          />

          <Plano
            vista={vistaPlanos}
            className="plano-base"
            data-foco={conFoco}
            formas={<FormasBase {...contexto} />}
            textos={<TextosBase {...contexto} />}
          />

          {/* lienzo-en-gesto congela las luces mientras el mapa se mueve. Ver
              .lienzo-en-gesto en estilos/mapa.css. */}
          <Plano
            vista={vistaPlanos}
            className={`plano-luces ${enGesto ? 'lienzo-en-gesto' : ''}`}
            data-foco={conFoco}
            formas={<Luces situaciones={situaciones} aristas={aristas} />}
          />

          <PlanosFoco
            vista={vistaPlanos}
            foco={foco}
            mirada={mirada}
            seleccionado={seleccionado}
            {...contexto}
            extra={
              /* Fuera de los planos memoizados a proposito: va y viene en
                 cada pulsacion, y como prop de ellos obligaria a repasar sus
                 ciento y pico hijos para dibujar una sola linea. */
              carga &&
              porCodigo.get(carga.codigo) && (
                <ContornoCarga
                  key={carga.t}
                  nodo={porCodigo.get(carga.codigo)}
                  hecha={carga.fase === 'hecha'}
                  escala={vista.escala}
                />
              )
            }
          />
        </div>
      </div>

      {ficha && (
        <DetalleAsignatura
          {...ficha}
          refSeguir={refFicha}
          saliendo={!fichaAbierta}
          situacionDe={situacionDeCodigo}
          medida={medida}
          alMarcar={marcarDesdeFicha}
          alCambiarElectiva={alAbrirCasilla}
          alCerrar={() => alSeleccionar(null)}
          alIrA={irAMateria}
          puedeIr={puedeIr}
          alTapar={taparAbajo}
        />
      )}
    </div>
  )
}

/* memo: VistaCarrera se repinta por cosas que a esta vista no le tocan -abrir
   el avance, cambiar el tema, la paleta-, y sin esto cada una repintaba la
   vista entera. Sus props son estables (useCallback/useMemo arriba). */
export default memo(GrafoPensum)
