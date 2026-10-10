import { memo, useCallback, useMemo, useState } from 'react'
import { ESTADO } from '../data/estados'
import { FILTROS, cuentasPorFiltro } from '../layout/filtrosLista'
import { semestreActual, semestresDeLista, seccionesDeGrupos } from '../layout/semestresLista'
import Filtros from './lista/Filtros'
import FilaMateria from './lista/FilaMateria'
import Resumen from './lista/Resumen'
import SeccionGrupo from './lista/SeccionGrupo'
import SeccionSemestre from './lista/SeccionSemestre'
import { PRIMERAS_SECCIONES, useListaCompleta } from './lista/useListaCompleta'

/**
 * Vista de lista por semestres. Es la que se ve por defecto en movil: el
 * grafo completo mide 3200 px de ancho y en un telefono solo cabe a escala
 * 0.10, donde el texto no se lee.
 *
 * Tiene que guiar sin explicar. La version anterior lo decia todo con
 * palabras -"abre 2", "falta Matematicas III", "Próximo sem."- y era mucha
 * lectura para algo que se consulta de un vistazo. Ahora:
 *
 *   - los semestres son un recorrido: una linea vertical los une, con un
 *     punto por semestre que se llena al completarlo y se enciende en el que
 *     te toca;
 *   - cada materia es su icono y su nombre;
 *   - al tocar una, la lista se ordena alrededor de ella -lo que abre y lo
 *     que le falta se marcan, lo demas se apaga- y dentro aparecen esas
 *     materias como pastillas que llevan hasta cada una.
 *
 * Asi "si paso esta, se me abre aquella" se ve, no se lee.
 */
function VistaLista({
  layout,
  estados,
  progreso,
  avanceGrupos,
  toque,
  descarga,
  alMirar,
  alMarcar,
  marcasSemestre,
  alAlternarSemestre,
}) {
  const { columnas, nodos, electivas, gruposElectivas, relaciones, porCodigo } = layout
  const [filtro, setFiltro] = useState('todo')
  const completa = useListaCompleta()
  /* La materia abierta. Una sola a la vez: es la que ordena la lista a su
     alrededor, y dos cadenas encendidas a la vez no se leerian. */
  const [foco, setFoco] = useState(null)
  /* Semestres que el estudiante abrio o cerro a mano. Sin entrada, un
     semestre completo sale plegado y el resto abierto. */
  const [plegados, setPlegados] = useState({})
  const [gruposAbiertos, setGruposAbiertos] = useState({})

  const entra = FILTROS.find((f) => f.id === filtro).entra

  const semestres = useMemo(
    () => semestresDeLista(columnas, nodos, estados, marcasSemestre),
    [columnas, nodos, estados, marcasSemestre],
  )
  const actual = semestreActual(semestres)

  const cuentas = useMemo(
    () => cuentasPorFiltro(semestres.flatMap((s) => s.situaciones)),
    [semestres],
  )

  const secciones = useMemo(
    () => seccionesDeGrupos(gruposElectivas, electivas, avanceGrupos, estados),
    [gruposElectivas, electivas, avanceGrupos, estados],
  )

  /* La cadena de la materia abierta: lo que desbloquea y lo que requiere */
  const cadena = useMemo(() => {
    if (!foco) return null
    return {
      abre: new Set(relaciones.adelante.get(foco) ?? []),
      requiere: new Set(relaciones.atras.get(foco) ?? []),
    }
  }, [foco, relaciones])

  const enfoqueDe = (codigo) => {
    if (!cadena) return null
    if (codigo === foco) return 'propia'
    if (cadena.abre.has(codigo)) return 'abre'
    if (cadena.requiere.has(codigo)) return 'requiere'
    return 'otra'
  }

  /* Las materias que la ultima aprobacion acaba de abrir, para encenderlas */
  const abiertasAhora = useMemo(() => {
    if (!descarga) return new Set()
    return new Set(
      (relaciones.adelante.get(descarga.codigo) ?? []).filter(
        (c) => estados[c] === ESTADO.DISPONIBLE,
      ),
    )
  }, [descarga, relaciones, estados])

  const alAlternar = useCallback(
    (codigo) =>
      setFoco((f) => {
        if (f === codigo) return null
        alMirar?.(codigo)
        return codigo
      }),
    [alMirar],
  )

  /* Llevar a una seccion o a una materia: quita el filtro si la esconde,
     despliega su semestre o su grupo, y se desliza hasta ella.

     El deslizamiento espera a que acaben los pliegues (.plegable, 360 ms).
     Lanzado antes, calcula el destino con la fila anterior aun abierta y la
     nueva aun cerrada, y cuando los dos cambian de alto a mitad del camino
     se queda corto por cientos de pixeles. */
  const deslizarA = (id, bloque = 'start') =>
    setTimeout(
      () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: bloque }),
      380,
    )

  const irASeccion = (id) => {
    setFiltro('todo')
    setPlegados((p) => ({ ...p, [id]: false }))
    deslizarA(`lista-${id}`)
  }

  const alIr = useCallback(
    (codigo) => {
      const materia = porCodigo.get(codigo)
      if (!materia) return
      setFiltro('todo')
      if (materia.semestre != null) {
        setPlegados((p) => ({ ...p, [`semestre-${materia.semestre}`]: false }))
      } else if (materia.grupo) {
        setGruposAbiertos((a) => ({ ...a, [materia.grupo]: true }))
      }
      setFoco(codigo)
      deslizarA(`fila-${codigo}`, 'center')
    },
    // deslizarA no lee estado: es la misma funcion en cada render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [porCodigo],
  )

  /* El contador (n) solo se le pasa a quien lo usa: darselo a todas las filas
     repintaba la lista entera en cada marca. */
  const fila = (nodo) => {
    const tocada = toque?.codigo === nodo.codigo
    const recienAbierta = abiertasAhora.has(nodo.codigo)
    return (
      <FilaMateria
        key={nodo.codigo}
        nodo={nodo}
        estado={estados[nodo.codigo]}
        estados={estados}
        relaciones={relaciones}
        porCodigo={porCodigo}
        abierta={foco === nodo.codigo}
        enfoque={enfoqueDe(nodo.codigo)}
        tocada={tocada}
        claveToque={tocada ? toque.n : undefined}
        recienAbierta={recienAbierta}
        claveDescarga={recienAbierta ? descarga.n : undefined}
        alMarcar={alMarcar}
        alAlternar={alAlternar}
        alIr={alIr}
      />
    )
  }

  const visibles = semestres
    .map((s) => ({ ...s, filas: s.materias.filter((_, i) => entra(s.situaciones[i])) }))
    .filter((s) => filtro === 'todo' || s.filas.length)

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div aria-hidden="true" className="velo-lista" />
      <div className="mx-auto flex max-w-2xl flex-col px-4 pt-[calc(var(--reserva-cabecera)+1rem)] pb-[calc(var(--reserva-barra)+3rem)] md:pb-24">
        <Resumen
          progreso={progreso}
          semestres={semestres}
          actual={actual}
          alIr={(n) => irASeccion(`semestre-${n}`)}
        />

        <Filtros
          filtro={filtro}
          cuentas={cuentas}
          alElegir={(id) => {
            setFiltro(id)
            setFoco(null)
          }}
        />

        {/* La key del filtro rearranca la entrada: al cambiar de filtro la
            lista nueva sube fundiendose en vez de cambiar de golpe. */}
        <div key={filtro} className="flex flex-col pt-4">
          {visibles.length === 0 && (
            <p className="lista-entrar py-16 text-center text-[13px] text-tinta-tenue">
              Nada por aquí
            </p>
          )}

          {(completa ? visibles : visibles.slice(0, PRIMERAS_SECCIONES)).map((s, i) => (
            <SeccionSemestre
              key={s.numero}
              s={s}
              indice={i}
              ultimo={i === visibles.length - 1}
              filtro={filtro}
              actual={actual}
              plegados={plegados}
              resumen={marcasSemestre.get(s.numero)}
              fila={fila}
              conCadena={Boolean(cadena)}
              alPlegar={(id, valor) => setPlegados((p) => ({ ...p, [id]: valor }))}
              alAlternarSemestre={alAlternarSemestre}
              alIrASeccion={irASeccion}
            />
          ))}

          {completa &&
            secciones.map((g) => (
              <SeccionGrupo
                key={g.clave}
                g={g}
                filtro={filtro}
                entra={entra}
                estados={estados}
                abierto={gruposAbiertos[g.clave] ?? false}
                fila={fila}
                alAbrir={(clave, valor) => setGruposAbiertos((a) => ({ ...a, [clave]: valor }))}
              />
            ))}
        </div>
      </div>
    </div>
  )
}

/* memo: VistaCarrera se repinta por cosas que a esta vista no le tocan -abrir
   el avance, cambiar el tema, la paleta-, y sin esto cada una repintaba la
   vista entera. Sus props son estables (useCallback/useMemo arriba). */
export default memo(VistaLista)
