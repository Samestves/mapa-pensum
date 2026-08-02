import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export const ESTADO = {
  APROBADA: 'aprobada',
  CURSANDO: 'cursando',
  DISPONIBLE: 'disponible',
  BLOQUEADA: 'bloqueada',
}

const CLAVE = 'mapa-pensum:marcas'
const MARCAS_VALIDAS = [ESTADO.APROBADA, ESTADO.CURSANDO]

// Ciclo del click: sin marcar → aprobada → cursando → sin marcar
function siguienteMarca(actual) {
  if (actual === ESTADO.APROBADA) return ESTADO.CURSANDO
  if (actual === ESTADO.CURSANDO) return null
  return ESTADO.APROBADA
}

/**
 * Lee las marcas guardadas descartando lo que ya no sirva: codigos que no
 * existen en el pensum actual y valores que no sean aprobada/cursando.
 * Si el JSON esta corrupto se arranca en limpio en vez de reventar.
 */
function leerGuardadas(codigosValidos) {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (!crudo) return {}
    const datos = JSON.parse(crudo)
    if (!datos || typeof datos !== 'object') return {}

    const limpias = {}
    for (const [codigo, marca] of Object.entries(datos)) {
      if (codigosValidos.has(codigo) && MARCAS_VALIDAS.includes(marca)) {
        limpias[codigo] = marca
      }
    }
    return limpias
  } catch {
    return {}
  }
}

/**
 * Fuente de verdad del avance. Solo se persisten las marcas del usuario
 * (aprobada / cursando); disponible y bloqueada se derivan siempre.
 */
export function usePensum(asignaturas, electivas = [], cuotas = null) {
  // Las electivas comparten el mismo mapa de marcas que las obligatorias:
  // para el usuario "aprobada" significa lo mismo en las dos.
  const codigosValidos = useMemo(
    () => new Set([...asignaturas, ...electivas].map((a) => a.codigo)),
    [asignaturas, electivas],
  )

  const [marcas, setMarcas] = useState(() => leerGuardadas(codigosValidos))

  // Descarga electrica de la ultima asignatura aprobada. El contador hace que
  // aprobar dos veces la misma vuelva a lanzar la animacion.
  const [descarga, setDescarga] = useState(null)
  // Ultima tarjeta que el usuario toco, para el anillo de confirmacion
  const [toque, setToque] = useState(null)
  const contador = useRef(0)

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(marcas))
    } catch {
      // Modo privado o cuota llena: la app sigue funcionando sin persistir
    }
  }, [marcas])

  // La animacion dura menos de un segundo; despues se limpia el DOM
  useEffect(() => {
    if (!descarga) return
    const t = setTimeout(() => setDescarga(null), 900)
    return () => clearTimeout(t)
  }, [descarga])

  const estados = useMemo(() => {
    const mapa = {}
    for (const a of [...asignaturas, ...electivas]) {
      const marca = marcas[a.codigo]
      if (marca) {
        mapa[a.codigo] = marca
        continue
      }
      // Sin prerrequisitos, every() da true: nace disponible
      const libre = (a.prerrequisitos ?? []).every(
        (pre) => marcas[pre] === ESTADO.APROBADA,
      )
      mapa[a.codigo] = libre ? ESTADO.DISPONIBLE : ESTADO.BLOQUEADA
    }
    return mapa
  }, [asignaturas, electivas, marcas])

  /**
   * Avance de las electivas. No cuenta cuantas escogiste sino cuantas UC
   * llevas de cada cuota: las tecnicas van de 1 a 3 UC, asi que contarlas
   * por cabeza daria un numero equivocado.
   */
  const avanceElectivas = useMemo(() => {
    const porTipo = (tipo, meta) => {
      const elegidas = electivas.filter(
        (e) => e.tipo === tipo && marcas[e.codigo] === ESTADO.APROBADA,
      )
      const uc = elegidas.reduce((s, e) => s + e.uc, 0)
      return {
        tipo,
        elegidas,
        uc,
        meta,
        completa: uc >= meta,
        // Lo que sobra no suma para el titulo, pero se muestra igual
        excedente: Math.max(0, uc - meta),
      }
    }
    return {
      tecnica: porTipo('tecnica', cuotas?.electivasTecnicas ?? 0),
      humanistica: porTipo('humanistica', cuotas?.electivasHumanisticas ?? 0),
    }
  }, [electivas, marcas, cuotas])

  const progreso = useMemo(() => {
    let ucAprobadas = 0
    let aprobadas = 0
    let cursando = 0
    let disponibles = 0

    // Desglose por area: es lo que alimenta las barras del panel lateral
    const areas = new Map()

    for (const a of asignaturas) {
      const estado = estados[a.codigo]
      if (!areas.has(a.area)) {
        areas.set(a.area, { area: a.area, uc: 0, ucAprobadas: 0, total: 0, aprobadas: 0 })
      }
      const fila = areas.get(a.area)
      fila.uc += a.uc
      fila.total += 1

      if (estado === ESTADO.APROBADA) {
        ucAprobadas += a.uc
        aprobadas += 1
        fila.ucAprobadas += a.uc
        fila.aprobadas += 1
      } else if (estado === ESTADO.CURSANDO) {
        cursando += 1
      } else if (estado === ESTADO.DISPONIBLE) {
        disponibles += 1
      }
    }

    const ucTotales = asignaturas.reduce((s, a) => s + a.uc, 0)

    // El porcentaje del titulo se mide sobre los 153 creditos completos, no
    // solo sobre las obligatorias: las electivas tambien hacen falta.
    const ucTitulo = cuotas?.total ?? ucTotales
    const ucElectivasValidas =
      Math.min(avanceElectivas.tecnica.uc, avanceElectivas.tecnica.meta) +
      Math.min(avanceElectivas.humanistica.uc, avanceElectivas.humanistica.meta)

    return {
      ucAprobadas,
      ucTotales,
      ucTitulo,
      ucElectivas: ucElectivasValidas,
      porcentaje: ucTitulo ? ((ucAprobadas + ucElectivasValidas) / ucTitulo) * 100 : 0,
      porcentajeObligatorias: ucTotales ? (ucAprobadas / ucTotales) * 100 : 0,
      aprobadas,
      cursando,
      disponibles,
      total: asignaturas.length,
      porArea: [...areas.values()].sort((a, b) => b.uc - a.uc),
    }
  }, [asignaturas, estados, cuotas, avanceElectivas])

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
    if (marca === ESTADO.APROBADA) {
      setDescarga({ codigo, n: contador.current })
    }
  }, [])

  // Click en la tarjeta: marcado tipo checklist, marcada o sin marcar.
  // Los tres estados completos siguen estando en la ficha.
  const alternarAprobada = useCallback(
    (codigo) =>
      marcar(codigo, marcas[codigo] === ESTADO.APROBADA ? null : ESTADO.APROBADA),
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
    avanceElectivas,
    descarga,
    toque,
    marcar,
    alternar,
    alternarAprobada,
    reiniciar,
    hayMarcas: Object.keys(marcas).length > 0,
  }
}
