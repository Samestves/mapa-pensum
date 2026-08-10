import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ABRE, CIERRA, DIAS, posicionValida, repartirEnCarriles } from '../layout/horario'

const CLAVE = 'mapa-pensum:horario'
const claveDe = (slug) => `${CLAVE}:${slug}`

const texto = (v) => (typeof v === 'string' ? v : '')

/* Una fila guardada solo se acepta si describe una clase posible. Un dia
   fuera de lunes-viernes o un fin anterior al inicio no se corrigen: se
   descartan. Preferimos perder una fila corrupta a dibujar algo imposible. */
const valida = (s) =>
  typeof s?.codigo === 'string' &&
  Number.isInteger(s.dia) &&
  s.dia >= 0 &&
  s.dia < DIAS.length &&
  Number.isInteger(s.inicio) &&
  Number.isInteger(s.fin) &&
  s.inicio >= ABRE &&
  s.fin <= CIERRA &&
  s.fin > s.inicio

function leer(slug) {
  try {
    const guardado = JSON.parse(localStorage.getItem(claveDe(slug)) ?? '[]')
    if (!Array.isArray(guardado)) return []
    return guardado.filter(valida).map((s) => ({
      id: s.id ?? `${s.codigo}-${s.dia}-${s.inicio}`,
      codigo: s.codigo,
      dia: s.dia,
      inicio: s.inicio,
      fin: s.fin,
      seccion: texto(s.seccion),
      aula: texto(s.aula),
      profesor: texto(s.profesor),
      // null = toma el color del area, el mismo que la materia tiene en el mapa
      color: Number.isInteger(s.color) ? s.color : null,
    }))
  } catch {
    return []
  }
}

/**
 * El horario de una carrera, guardado en el navegador.
 *
 * Se guarda donde puso el estudiante cada clase -dia, hora, seccion, aula y
 * profesor-, no que materias existen: eso ya esta en el pensum. Si una
 * materia desapareciera del pensum, su clase se queda sin dueño y la vista la
 * ignora en vez de romperse.
 *
 * Es un hook y no un store global a proposito: el horario pertenece a UNA
 * carrera y recibe su slug como parametro. Un singleton tendria que llevar el
 * slug dentro para no mezclar carreras, que es justo el problema que el
 * parametro resuelve gratis.
 */
export function useHorario(slug) {
  const [sesiones, setSesiones] = useState(() => leer(slug))

  /* No se escribe en el primer render. Lo que hay en el estado nada mas
     montar es exactamente lo que se acaba de leer, asi que ese guardado no
     aporta nada; y si `leer` fallara devolviendo [], borraria el horario de
     quien solo venia a mirarlo. Se guarda a partir del primer cambio real. */
  const montado = useRef(false)
  useEffect(() => {
    if (!montado.current) {
      montado.current = true
      return
    }
    try {
      localStorage.setItem(claveDe(slug), JSON.stringify(sesiones))
    } catch {
      // Modo privado o cuota llena: se sigue usando, solo que sin recordar
    }
  }, [slug, sesiones])

  /** Crea o reemplaza. El id decide cual de las dos cosas es. */
  const guardar = useCallback((sesion) => {
    setSesiones((previas) => {
      const id = sesion.id ?? `${sesion.codigo}-${Date.now()}`
      return [...previas.filter((s) => s.id !== id), { ...sesion, id }]
    })
  }, [])

  const quitar = useCallback((id) => {
    setSesiones((previas) => previas.filter((s) => s.id !== id))
  }, [])

  /**
   * Copia una clase al primer hueco libre de su dia.
   *
   * Es la accion mas util del menu: casi toda materia se dicta dos o tres
   * veces por semana, y duplicar y cambiar el dia es mas rapido que volver a
   * escribir materia, seccion, aula y profesor. Si el dia esta lleno no se
   * duplica: mejor no hacer nada que crear un solape.
   */
  const duplicar = useCallback((id) => {
    setSesiones((previas) => {
      const original = previas.find((s) => s.id === id)
      if (!original) return previas
      const delDia = previas.filter((s) => s.dia === original.dia)
      const sitio = posicionValida(delDia, { ...original, id: null })
      if (!sitio) return previas
      return [...previas, { ...original, ...sitio, id: `${original.codigo}-${Date.now()}` }]
    })
  }, [])

  /** Cambia unos campos sueltos sin tocar el resto */
  const retocar = useCallback((id, cambios) => {
    setSesiones((previas) => previas.map((s) => (s.id === id ? { ...s, ...cambios } : s)))
  }, [])

  /* Las clases ya agrupadas por dia y con sus carriles resueltos. Lo consume
     la rejilla tal cual: el componente no vuelve a recorrer ni a ordenar. */
  const porDia = useMemo(
    () => DIAS.map((_, dia) => repartirEnCarriles(sesiones.filter((s) => s.dia === dia))),
    [sesiones],
  )

  return { sesiones, porDia, guardar, quitar, retocar, duplicar }
}
