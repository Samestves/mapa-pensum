import { useCallback, useMemo, useState } from 'react'
import { guardarJSON, leerJSON } from '../data/almacen'

const CLAVE_BASE = 'mapa-pensum:casillas'
const claveDe = (slug) => `${CLAVE_BASE}:${slug}`

/**
 * Que electiva has puesto en cada casilla del pensum.
 *
 * El diagrama oficial de la UDO no deja las electivas en una lista al final:
 * les reserva sitio dentro de semestres concretos -tres sociohumanisticas en
 * el 2, 3 y 4, cinco tecnicas en el 7, 8 y 9-. Esas casillas son el plan; lo
 * que va dentro lo elige cada estudiante.
 *
 * Esto guarda SOLO esa eleccion: {casilla -> codigo de electiva}. No guarda
 * si la aprobaste, y esa separacion es deliberada. Aprobar una materia lo
 * sigue llevando usePensum en su propio mapa de marcas, que ya trata las
 * electivas igual que las obligatorias. Si la eleccion y la marca vivieran
 * juntas, sacar una electiva de una casilla te borraria el haberla aprobado,
 * y son dos cosas distintas: una es donde piensas cursarla y la otra es que
 * ya la cursaste.
 *
 * Mismo patron de guardado que el resto: una clave por carrera, y depurado al
 * leer para que un JSON viejo o corrupto no arrastre basura.
 */
function depurar(datos, casillasValidas, electivasValidas) {
  if (!datos || typeof datos !== 'object') return {}
  const limpio = {}
  const usados = new Set()
  for (const [casilla, codigo] of Object.entries(datos)) {
    if (!casillasValidas.has(casilla) || !electivasValidas.has(codigo)) continue
    /* La misma electiva no puede ocupar dos casillas. Cursarla dos veces no
       existe, y permitirlo dejaria cumplir la cuota repitiendo una materia. */
    if (usados.has(codigo)) continue
    /* Y tiene que ser del grupo de esa casilla: una tecnica no cuenta para
       la cuota humanistica aunque quepa en el hueco. */
    if (casillasValidas.get(casilla) !== electivasValidas.get(codigo)) continue
    usados.add(codigo)
    limpio[casilla] = codigo
  }
  return limpio
}

export function useCasillas(carrera) {
  const { slug, asignaturas, grupos } = carrera

  // Casilla -> a que grupo pertenece
  const casillasValidas = useMemo(() => {
    const mapa = new Map()
    for (const a of asignaturas) {
      if (a.esHueco && a.grupo) mapa.set(a.codigo, a.grupo)
    }
    return mapa
  }, [asignaturas])

  // Electiva -> a que grupo pertenece
  const electivasValidas = useMemo(() => {
    const mapa = new Map()
    for (const g of grupos) {
      for (const e of g.asignaturas) mapa.set(e.codigo, g.clave)
    }
    return mapa
  }, [grupos])

  const [elegidas, setElegidas] = useState(() =>
    depurar(leerJSON(claveDe(slug), null), casillasValidas, electivasValidas),
  )

  const colocar = useCallback(
    (casilla, codigo) => {
      setElegidas((previas) => {
        const siguiente = { ...previas }
        if (codigo == null) {
          delete siguiente[casilla]
        } else {
          /* Si esa electiva ya estaba en otra casilla, se muda: se quita de
             donde estaba en vez de aparecer dos veces. Es lo que espera
             cualquiera que arrastre algo de un sitio a otro. */
          for (const [otra, puesta] of Object.entries(siguiente)) {
            if (puesta === codigo) delete siguiente[otra]
          }
          siguiente[casilla] = codigo
        }
        guardarJSON(claveDe(slug), siguiente)
        return siguiente
      })
    },
    [slug],
  )

  /* El camino de vuelta: de una electiva a la casilla donde esta. Lo necesita
     el selector para marcar las que ya estan colocadas, y calcularlo una vez
     aqui evita recorrer el objeto entero por cada fila de la lista. */
  const casillaDe = useMemo(() => {
    const mapa = {}
    for (const [casilla, codigo] of Object.entries(elegidas)) mapa[codigo] = casilla
    return mapa
  }, [elegidas])

  return { elegidas, casillaDe, colocar }
}
