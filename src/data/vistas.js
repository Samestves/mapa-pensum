import { CalendarDays, List, Waypoints } from 'lucide-react'

/**
 * Las tres formas de mirar la misma carrera.
 *
 * El orden no es alfabetico ni casual: es el de la profundidad con la que se
 * usan. El mapa es lo que abre por defecto y responde "que desbloquea que";
 * la lista es ese mismo pensum leido en fila, para marcar rapido; el horario
 * ya es armar algo con lo que sabes. De mirar a hacer.
 *
 * Los iconos dicen lo que la vista ES, no una metafora prestada:
 * - Waypoints son puntos unidos por lineas, que es literalmente el grafo de
 *   prelaciones. El icono de mapa doblado prometia geografia.
 * - List, sin el bloque relleno de LayoutList: cuando los tres se enseñan
 *   juntos tienen que pesar lo mismo o el mas oscuro parece el activo.
 * - CalendarDays es una rejilla de dias, que es exactamente lo que se ve al
 *   entrar. CalendarRange dibujaba una barra de rango y sugeria fechas.
 *
 * Vive aqui y no dentro de un componente porque lo pintan dos: el mando
 * segmentado de la cabecera en escritorio y la barra inferior en el telefono.
 * Son dos formas distintas de ofrecer LAS MISMAS tres vistas, y el dia que se
 * añada una cuarta tiene que aparecer en las dos sin que nadie se acuerde.
 */
export const VISTAS = [
  { id: 'mapa', icono: Waypoints, etiqueta: 'Mapa', titulo: 'Ver el mapa de prelaciones' },
  { id: 'lista', icono: List, etiqueta: 'Lista', titulo: 'Ver el pensum como lista' },
  {
    id: 'horario',
    icono: CalendarDays,
    etiqueta: 'Horario',
    titulo: 'Ver mi horario de la semana',
  },
]

/** Que posicion ocupa una vista. -1 nunca: si no la encuentra, la primera. */
export const indiceDeVista = (vista) => Math.max(0, VISTAS.findIndex((v) => v.id === vista))
