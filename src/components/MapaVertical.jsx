import { memo, useCallback, useMemo, useState } from 'react'
import { MARGEN } from '../layout/constantes'
import { GOTERA } from '../layout/layoutVertical'
import { ESTADO } from '../data/estados'
import { cadenaDe } from '../layout/relaciones'
import NodoAsignatura from './NodoAsignatura'
import NodoHueco from './NodoHueco'
import Arista from './Arista'
import DefsGrafo from './DefsGrafo'
import DetalleAsignatura from './DetalleAsignatura'

/**
 * El mapa en el telefono: una columna que se desplaza hacia abajo.
 *
 * No usa el pan y zoom del mapa de escritorio, y esa es la decision que hace
 * que se sienta de telefono. Un lienzo con dos ejes libres obliga a buscar:
 * te pierdes, no sabes si lo que quieres esta arriba o a la derecha, y en
 * tactil compite con el gesto de desplazar la pagina. Aqui el ancho se fija
 * -el mapa entra entero de lado a lado- y solo queda un eje, el de siempre en
 * un telefono. Se recorre con el pulgar sin pensarlo.
 *
 * El SVG se dibuja a su tamaño natural y se ESCALA con CSS hasta el ancho de
 * la pantalla, en vez de recalcular el layout segun el aparato. Asi la
 * geometria es la misma en un telefono estrecho que en uno grande, y las
 * tarjetas son exactamente las mismas piezas que en escritorio: NodoAsignatura
 * y NodoHueco se reutilizan sin tocarles una linea.
 */
function MapaVertical({
  layout,
  estados,
  descarga,
  toque,
  seleccionado,
  senalado,
  enCasilla,
  alSenalar,
  alSeleccionar,
  alAbrirCasilla,
  alMarcar,
  casillaDe,
}) {
  const { nodos, bandas, aristas, relaciones, porCodigo, ancho, alto } = layout
  const [tocando, setTocando] = useState(null)

  /* En tactil no hay raton que pase por encima, asi que la cadena se enciende
     al TOCAR y se apaga al tocar fuera. El foco por seleccion manda sobre el
     del toque, igual que en escritorio manda sobre el del raton. */
  const foco = seleccionado ?? tocando ?? senalado
  const cadena = useMemo(
    () => (foco ? cadenaDe(foco, relaciones) : null),
    [foco, relaciones],
  )

  const atenuado = useCallback(
    (codigo) => cadena != null && !cadena.has(codigo),
    [cadena],
  )

  const verFicha = useCallback(
    (codigo) => {
      setTocando(codigo)
      alSeleccionar(codigo)
    },
    [alSeleccionar],
  )

  const senalar = useCallback((codigo) => alSenalar(codigo), [alSenalar])
  const dejarDeSenalar = useCallback(() => alSenalar(null), [alSenalar])

  /* Avance por semestre, para la banda. Se calcula una vez para todas en vez
     de recorrer los nodos dentro de cada una. */
  const avancePorSemestre = useMemo(() => {
    const mapa = new Map()
    for (const nodo of nodos) {
      if (!mapa.has(nodo.semestre)) mapa.set(nodo.semestre, { hechas: 0, total: 0, uc: 0 })
      const fila = mapa.get(nodo.semestre)
      fila.total += 1
      const materia = nodo.esHueco ? enCasilla(nodo.codigo) : nodo
      if (!materia) continue
      fila.uc += materia.uc ?? 0
      if (estados[materia.codigo] === ESTADO.APROBADA) fila.hechas += 1
    }
    return mapa
  }, [nodos, estados, enCasilla])

  /* Los datos de la ficha. Se calculan aqui y no se traen de useFocoGrafo
     porque aquel ademas coloca la nube junto al nodo con las coordenadas de
     la vista, y en el telefono la ficha no se ancla a nada: sube desde
     abajo. */
  const nodoSeleccionado = seleccionado ? porCodigo.get(seleccionado) : null
  const detalle = useMemo(() => {
    if (!nodoSeleccionado) return null
    const relacionadas = (codigos) =>
      codigos
        .map((c) => porCodigo.get(c))
        .filter(Boolean)
        .map((asignatura) => ({ asignatura, estado: estados[asignatura.codigo] }))
    return {
      prerrequisitos: relacionadas(relaciones.atras.get(seleccionado) ?? []),
      desbloquea: relacionadas(relaciones.adelante.get(seleccionado) ?? []),
    }
  }, [nodoSeleccionado, seleccionado, relaciones, porCodigo, estados])

  return (
    /* overscroll-contain para que al llegar al final no arrastre la pagina
       de detras, que en un telefono se siente como que la aplicacion se
       despega. */
    <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <svg
        viewBox={`0 0 ${ancho} ${alto}`}
        width="100%"
        /* height explicito y no auto: sin el, un SVG con viewBox se estira al
           alto del contenedor y el mapa saldria aplastado. Con la razon del
           viewBox el navegador reserva el alto real y el scroll aparece. */
        style={{ height: (alto / ancho) * 100 + 'vw', display: 'block' }}
        className="select-none"
        onClick={(e) => {
          // Tocar el fondo apaga la cadena y cierra la ficha
          if (e.target === e.currentTarget) {
            setTocando(null)
            alSeleccionar(null)
          }
        }}
      >
        <DefsGrafo />
        <rect width={ancho} height={alto} fill="url(#rejilla)" />

        {/* Las bandas de semestre. En horizontal la cabecera va encima de su
            columna; aqui va encima de su tramo, con el numero pegado al canal
            de los cables para que el ojo no tenga que volver al margen. */}
        {bandas.map((banda) => {
          const av = avancePorSemestre.get(banda.semestre) ?? { hechas: 0, total: 0, uc: 0 }
          const parte = av.total ? av.hechas / av.total : 0
          return (
            <g key={banda.semestre}>
              <text
                x={8}
                y={banda.y + 26}
                fontSize="30"
                fill="var(--tinta)"
                className="font-extrabold tracking-[-0.05em]"
              >
                {String(banda.semestre).padStart(2, '0')}
              </text>
              <text
                x={GOTERA}
                y={banda.y + 14}
                fontSize="8.5"
                fill="var(--tinta-tenue)"
                className="font-semibold tracking-[0.24em]"
              >
                SEMESTRE
              </text>
              <text
                x={GOTERA}
                y={banda.y + 28}
                fontSize="11"
                fill="var(--tinta-tenue)"
                className="font-mono font-semibold"
              >
                <tspan fill="var(--tinta-suave)">{banda.cantidad}</tspan> materias
                <tspan dx="4">·</tspan>
                <tspan dx="4" fill="var(--tinta-suave)">
                  {av.uc}
                </tspan>{' '}
                UC
              </text>

              {/* La misma regla que en escritorio, haciendo los mismos dos
                  trabajos: separa la banda de las tarjetas y se llena con lo
                  que llevas aprobado del semestre. */}
              <line
                x1={GOTERA}
                y1={banda.y + 36}
                x2={ancho - MARGEN.right / 3}
                y2={banda.y + 36}
                stroke="var(--tinta-tenue)"
                strokeOpacity="0.28"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              {parte > 0 && (
                <line
                  x1={GOTERA}
                  y1={banda.y + 36}
                  x2={GOTERA + (ancho - MARGEN.right / 3 - GOTERA) * parte}
                  y2={banda.y + 36}
                  stroke="var(--estado-aprobada)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}
            </g>
          )
        })}

        <g>
          {aristas.map((arista, i) => (
            <Arista
              key={arista.id}
              d={arista.d}
              x2={arista.x2}
              y2={arista.y2}
              area={arista.area}
              codigoOrigen={arista.origen}
              retardo={(i % 7) * 0.55}
              velocidad={3.8 + (i % 5) * 0.35}
              viva={estados[arista.origen] === ESTADO.APROBADA}
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

        {nodos.map((nodo) =>
          nodo.esHueco ? (
            <NodoHueco
              key={nodo.codigo}
              nodo={nodo}
              electiva={enCasilla(nodo.codigo)}
              estado={estados[enCasilla(nodo.codigo)?.codigo]}
              atenuado={atenuado(enCasilla(nodo.codigo)?.codigo ?? nodo.codigo)}
              seleccionado={seleccionado === (enCasilla(nodo.codigo)?.codigo ?? nodo.codigo)}
              alAbrir={alAbrirCasilla}
              alVerFicha={verFicha}
            />
          ) : (
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
              alSenalar={senalar}
              alDejarDeSenalar={dejarDeSenalar}
              alVerFicha={verFicha}
            />
          ),
        )}
      </svg>

      {detalle && (
        <DetalleAsignatura
          comoHoja
          nodo={nodoSeleccionado}
          estado={estados[seleccionado]}
          prerrequisitos={detalle.prerrequisitos}
          desbloquea={detalle.desbloquea}
          alMarcar={alMarcar}
          enCasilla={casillaDe?.[seleccionado]}
          alCambiarElectiva={alAbrirCasilla}
          alCerrar={() => {
            setTocando(null)
            alSeleccionar(null)
          }}
        />
      )}
    </div>
  )
}

export default memo(MapaVertical)
