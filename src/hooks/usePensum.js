import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { guardarJSON, leerJSON } from '../data/almacen'
import { ESTADO } from '../data/estados'
import { avanceDeGrupos, conMarcas, depurarMarcas, estadosDe, progresoDe } from '../data/avance'

const CLAVE_BASE = 'mapa-pensum:marcas'
// Antes de las multiples carreras habia una sola clave sin sufijo. Los
// estudiantes que ya usaban la app tienen su avance ahi, asi que la primera
// vez se adopta en vez de arrancar en blanco.
const CLAVE_HEREDADA = CLAVE_BASE
const SLUG_HEREDADO = 'ingenieria-de-sistemas'

const claveDe = (slug) => `${CLAVE_BASE}:${slug}`

/**
 * Las marcas guardadas de una carrera tal cual, sin depurar: la portada solo
 * quiere saber si hay avance y cuanto, y no tiene el pensum a mano para
 * validarlas. Un codigo que ya no existe no coincide con ninguna materia y
 * no cuenta.
 */
export function marcasGuardadasDe(slug) {
  const propia = leerJSON(claveDe(slug), null)
  if (propia) return propia
  // Migracion de la clave vieja, solo para la carrera que existia entonces
  if (slug === SLUG_HEREDADO) return leerJSON(CLAVE_HEREDADA, null)
  return null
}

/**
 * Lee las marcas guardadas de una carrera. Si el JSON esta corrupto se
 * arranca en limpio en vez de reventar.
 */
function leerGuardadas(slug, codigosValidos) {
  const guardadas = marcasGuardadasDe(slug)
  return guardadas ? depurarMarcas(guardadas, codigosValidos) : {}
}

/**
 * Fuente de verdad del avance de una carrera. Solo se persisten las marcas
 * del usuario (aprobada / cursando); disponible y bloqueada se derivan.
 *
 * Cada carrera guarda su avance por separado: un estudiante puede mirar otra
 * carrera sin que le ensucie la suya.
 */
export function usePensum(carrera) {
  const { slug, grupos, creditos } = carrera

  // Los huecos ("aqui va una electiva que tu eliges") se dibujan en su
  // semestre pero no son materias: no se marcan, no cuentan y no aparecen en
  // ningun total. La electiva de verdad se marca en su grupo, y contarla dos
  // veces inflaria el avance.
  const asignaturas = useMemo(
    () => carrera.asignaturas.filter((a) => !a.esHueco),
    [carrera.asignaturas],
  )

  // Las electivas comparten el mapa de marcas con las obligatorias: para el
  // estudiante "aprobada" significa lo mismo en las dos.
  const todas = useMemo(
    () => [...asignaturas, ...grupos.flatMap((g) => g.asignaturas)],
    [asignaturas, grupos],
  )
  const codigosValidos = useMemo(() => new Set(todas.map((a) => a.codigo)), [todas])

  // Las marcas van junto al slug de su carrera: asi nunca quedan desalineadas
  // y el guardado puede saber de cual son.
  const [estado, setEstado] = useState(() => ({
    slug,
    marcas: leerGuardadas(slug, codigosValidos),
  }))
  const marcas = estado.marcas

  // Al cambiar de carrera hay que traer las marcas de esa otra. Hasta que
  // llegan, estado.slug sigue siendo la carrera anterior.
  useEffect(() => {
    if (estado.slug === slug) return
    setEstado({ slug, marcas: leerGuardadas(slug, codigosValidos) })
  }, [slug, codigosValidos, estado.slug])

  // Descarga electrica de la ultima asignatura aprobada. El contador hace que
  // aprobar dos veces la misma vuelva a lanzar la animacion.
  const [descarga, setDescarga] = useState(null)
  // Ultima tarjeta que el usuario toco, para el anillo de confirmacion
  const [toque, setToque] = useState(null)
  const contador = useRef(0)

  useEffect(() => {
    // Si no se puede escribir, la app sigue funcionando sin persistir.
    // Entre el cambio de carrera y la llegada de sus marcas, estado sigue
    // siendo de la anterior: escribirlo en la clave nueva la mezclaria.
    if (estado.slug !== slug) return
    guardarJSON(claveDe(slug), estado.marcas)
  }, [slug, estado])

  /* La animacion entera -la luz del cable y el pulso de lo que se abre-
     acaba a los 2,1 s; despues se limpia el DOM. Con 900 ms, como antes, el
     pulso se desmontaba a medio camino. Ver .descarga y .destello. */
  useEffect(() => {
    if (!descarga) return
    const t = setTimeout(() => setDescarga(null), 2400)
    return () => clearTimeout(t)
  }, [descarga])

  const estados = useMemo(() => estadosDe(todas, marcas), [todas, marcas])

  const avanceGrupos = useMemo(() => avanceDeGrupos(grupos, marcas), [grupos, marcas])

  const progreso = useMemo(
    () => progresoDe(asignaturas, estados, creditos, avanceGrupos),
    [asignaturas, estados, creditos, avanceGrupos],
  )

  /* Fija varias marcas de una vez -{ codigo: marca }-, en un solo cambio de
     estado: aprobar un semestre entero, o deshacerlo. marca null desmarca. */
  const marcarVarias = useCallback((cambios) => {
    setEstado((previo) => ({ slug: previo.slug, marcas: conMarcas(previo.marcas, cambios) }))
  }, [])

  // Fija una marca concreta, con su anillo y su descarga. null desmarca.
  const marcar = useCallback(
    (codigo, marca) => {
      marcarVarias({ [codigo]: marca })

      contador.current += 1
      // Solo la tarjeta que se toco lleva el anillo de confirmacion
      setToque({ codigo, n: contador.current })

      // La descarga solo tiene sentido al aprobar: es el momento en que algo
      // se desbloquea. Pasar a cursando o desmarcar no enciende nada.
      if (marca === ESTADO.APROBADA) setDescarga({ codigo, n: contador.current })
    },
    [marcarVarias],
  )

  const reiniciar = useCallback(() => {
    setEstado({ slug, marcas: {} })
    setDescarga(null)
    setToque(null)
  }, [slug])

  return {
    marcas,
    estados,
    progreso,
    avanceGrupos,
    descarga,
    toque,
    marcar,
    marcarVarias,
    reiniciar,
  }
}
