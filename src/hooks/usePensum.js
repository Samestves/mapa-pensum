import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { guardarJSON, leerJSON } from '../data/almacen'
import { ESTADO } from '../data/estados'

const CLAVE_BASE = 'mapa-pensum:marcas'
// Antes de las multiples carreras habia una sola clave sin sufijo. Los
// estudiantes que ya usaban la app tienen su avance ahi, asi que la primera
// vez se adopta en vez de arrancar en blanco.
const CLAVE_HEREDADA = CLAVE_BASE
const SLUG_HEREDADO = 'ingenieria-de-sistemas'

const claveDe = (slug) => `${CLAVE_BASE}:${slug}`
const MARCAS_VALIDAS = [ESTADO.APROBADA, ESTADO.CURSANDO]

// Ciclo del click: sin marcar → aprobada → cursando → sin marcar
function siguienteMarca(actual) {
  if (actual === ESTADO.APROBADA) return ESTADO.CURSANDO
  if (actual === ESTADO.CURSANDO) return null
  return ESTADO.APROBADA
}

/** Descarta lo que ya no sirva: codigos ajenos al pensum y marcas invalidas */
function depurar(datos, codigosValidos) {
  if (!datos || typeof datos !== 'object') return {}
  const limpias = {}
  for (const [codigo, marca] of Object.entries(datos)) {
    if (codigosValidos.has(codigo) && MARCAS_VALIDAS.includes(marca)) limpias[codigo] = marca
  }
  return limpias
}

/**
 * Lee las marcas guardadas de una carrera. Si el JSON esta corrupto se
 * arranca en limpio en vez de reventar.
 */
function leerGuardadas(slug, codigosValidos) {
  const propia = leerJSON(claveDe(slug), null)
  if (propia) return depurar(propia, codigosValidos)

  // Migracion de la clave vieja, solo para la carrera que existia entonces
  if (slug === SLUG_HEREDADO) {
    const vieja = leerJSON(CLAVE_HEREDADA, null)
    if (vieja) return depurar(vieja, codigosValidos)
  }
  return {}
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

  const [marcas, setMarcas] = useState(() => leerGuardadas(slug, codigosValidos))

  // Al cambiar de carrera hay que traer las marcas de esa otra
  const slugMontado = useRef(slug)
  useEffect(() => {
    if (slugMontado.current === slug) return
    slugMontado.current = slug
    setMarcas(leerGuardadas(slug, codigosValidos))
  }, [slug, codigosValidos])

  // Descarga electrica de la ultima asignatura aprobada. El contador hace que
  // aprobar dos veces la misma vuelva a lanzar la animacion.
  const [descarga, setDescarga] = useState(null)
  // Ultima tarjeta que el usuario toco, para el anillo de confirmacion
  const [toque, setToque] = useState(null)
  const contador = useRef(0)

  useEffect(() => {
    // Si no se puede escribir, la app sigue funcionando sin persistir
    guardarJSON(claveDe(slug), marcas)
  }, [slug, marcas])

  // La animacion dura menos de un segundo; despues se limpia el DOM
  useEffect(() => {
    if (!descarga) return
    const t = setTimeout(() => setDescarga(null), 900)
    return () => clearTimeout(t)
  }, [descarga])

  const estados = useMemo(() => {
    const mapa = {}
    for (const a of todas) {
      const marca = marcas[a.codigo]
      if (marca) {
        mapa[a.codigo] = marca
        continue
      }
      // Sin prerrequisitos, every() da true: nace disponible
      const libre = (a.prerrequisitos ?? []).every((pre) => marcas[pre] === ESTADO.APROBADA)
      mapa[a.codigo] = libre ? ESTADO.DISPONIBLE : ESTADO.BLOQUEADA
    }
    return mapa
  }, [todas, marcas])

  /**
   * Avance de cada grupo de electivas. No cuenta cuantas escogiste sino
   * cuantas UC llevas de la cuota: las tecnicas de Sistemas van de 1 a 3 UC,
   * asi que contarlas por cabeza daria un numero equivocado.
   *
   * Los grupos sin cuota (las carreras de las que no tenemos los creditos
   * oficiales, y las secciones informativas como Areas de Grado) se cuentan
   * igual pero sin meta: se dice lo que llevas, no cuanto falta.
   */
  const avanceGrupos = useMemo(() => {
    const mapa = {}
    for (const g of grupos) {
      const elegidas = g.asignaturas.filter((e) => marcas[e.codigo] === ESTADO.APROBADA)
      const uc = elegidas.reduce((s, e) => s + (e.uc ?? 0), 0)
      mapa[g.clave] = {
        clave: g.clave,
        titulo: g.titulo,
        tipo: g.tipo,
        elegidas,
        uc,
        meta: g.cuota,
        completa: g.cuota != null && uc >= g.cuota,
        // Lo que sobra no suma para el titulo, pero se muestra igual
        excedente: g.cuota != null ? Math.max(0, uc - g.cuota) : 0,
      }
    }
    return mapa
  }, [grupos, marcas])

  const progreso = useMemo(() => {
    let ucAprobadas = 0
    let aprobadas = 0
    let cursando = 0
    // Las disponibles se guardan enteras, no solo contadas: saber que tienes
    // once por inscribir no sirve de nada si no sabes cuales son.
    const paraInscribir = []

    // Desglose por area. Solo tiene sentido donde las areas estan
    // clasificadas; en las demas carreras queda vacio.
    const areas = new Map()

    for (const a of asignaturas) {
      const estado = estados[a.codigo]
      const uc = a.uc ?? 0

      if (a.area) {
        if (!areas.has(a.area)) {
          areas.set(a.area, { area: a.area, uc: 0, ucAprobadas: 0, total: 0, aprobadas: 0 })
        }
        const fila = areas.get(a.area)
        fila.uc += uc
        fila.total += 1
        if (estado === ESTADO.APROBADA) {
          fila.ucAprobadas += uc
          fila.aprobadas += 1
        }
      }

      if (estado === ESTADO.APROBADA) {
        ucAprobadas += uc
        aprobadas += 1
      } else if (estado === ESTADO.CURSANDO) {
        cursando += 1
      } else if (estado === ESTADO.DISPONIBLE) {
        paraInscribir.push(a)
      }
    }

    const ucTotales = asignaturas.reduce((s, a) => s + (a.uc ?? 0), 0)

    // Solo cuentan las UC electivas que caben en su cuota
    const ucElectivas = Object.values(avanceGrupos).reduce(
      (s, g) => s + (g.meta != null ? Math.min(g.uc, g.meta) : 0),
      0,
    )

    // Sin creditos oficiales no hay denominador honesto, y preferimos no
    // decir nada a inventar un porcentaje. La UI lo detecta por null.
    const ucTitulo = creditos?.titulo ?? null
    const porcentaje = ucTitulo ? ((ucAprobadas + ucElectivas) / ucTitulo) * 100 : null

    return {
      ucAprobadas,
      ucTotales,
      ucTitulo,
      ucElectivas,
      porcentaje,
      porcentajeObligatorias: ucTotales ? (ucAprobadas / ucTotales) * 100 : 0,
      aprobadas,
      cursando,
      disponibles: paraInscribir.length,
      // Por semestre: lo primero que ofrece es lo que llevas mas atrasado
      paraInscribir: [...paraInscribir].sort(
        (a, b) => (a.semestre ?? 99) - (b.semestre ?? 99) || a.nombre.localeCompare(b.nombre, 'es'),
      ),
      bloqueadas: asignaturas.length - aprobadas - cursando - paraInscribir.length,
      total: asignaturas.length,
      porArea: [...areas.values()].sort((a, b) => b.uc - a.uc),
    }
  }, [asignaturas, estados, creditos, avanceGrupos])

  // Fija una marca concreta. marca === null desmarca.
  const marcar = useCallback((codigo, marca) => {
    setMarcas((previas) => {
      const copia = { ...previas }
      if (marca) copia[codigo] = marca
      else delete copia[codigo]
      return copia
    })

    contador.current += 1
    // Solo la tarjeta que se toco lleva el anillo de confirmacion
    setToque({ codigo, n: contador.current })

    // La descarga solo tiene sentido al aprobar: es el momento en que algo
    // se desbloquea. Pasar a cursando o desmarcar no enciende nada.
    if (marca === ESTADO.APROBADA) setDescarga({ codigo, n: contador.current })
  }, [])

  // Click en la tarjeta: marcado tipo checklist, marcada o sin marcar.
  // Los tres estados completos siguen estando en la ficha.
  const alternarAprobada = useCallback(
    (codigo) => marcar(codigo, marcas[codigo] === ESTADO.APROBADA ? null : ESTADO.APROBADA),
    [marcar, marcas],
  )

  const alternar = useCallback(
    (codigo) => marcar(codigo, siguienteMarca(marcas[codigo])),
    [marcar, marcas],
  )

  const reiniciar = useCallback(() => {
    setMarcas({})
    setDescarga(null)
    setToque(null)
  }, [])

  return {
    marcas,
    estados,
    progreso,
    avanceGrupos,
    descarga,
    toque,
    marcar,
    alternar,
    alternarAprobada,
    reiniciar,
    hayMarcas: Object.keys(marcas).length > 0,
  }
}
