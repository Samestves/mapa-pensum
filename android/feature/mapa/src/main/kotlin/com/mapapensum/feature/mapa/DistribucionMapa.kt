package com.mapapensum.feature.mapa

import com.mapapensum.core.model.Asignatura
import com.mapapensum.core.model.Carrera

/**
 * Medidas del mapa en unidades de mundo (1 unidad = 1 dp con la camara en escala 1).
 * Viven aparte del dibujo para que la geometria se pueda probar en la JVM.
 */
internal object MedidasMapa {
    const val ANCHO_NODO = 156f
    const val ALTO_NODO = 64f
    const val ESPACIO_COLUMNA = 56f
    const val ESPACIO_FILA = 14f
    const val ALTO_CABECERA = 40f
    const val MARGEN = 24f

    /** Distancia entre el borde izquierdo de una columna y el de la siguiente. */
    const val PASO_COLUMNA = ANCHO_NODO + ESPACIO_COLUMNA
    const val PASO_FILA = ALTO_NODO + ESPACIO_FILA
}

internal data class PuntoMapa(val x: Float, val y: Float)

/** Esquina superior izquierda de una materia (o casilla de electiva) en el mundo. */
internal data class NodoMapa(val codigo: String, val x: Float, val y: Float) {
    val centroIzquierdo: PuntoMapa get() = PuntoMapa(x, y + MedidasMapa.ALTO_NODO / 2)
    val centroDerecho: PuntoMapa get() = PuntoMapa(x + MedidasMapa.ANCHO_NODO, y + MedidasMapa.ALTO_NODO / 2)

    /** El borde derecho e inferior quedan fuera: asi dos nodos vecinos nunca se solapan al tocar. */
    fun contiene(px: Float, py: Float): Boolean =
        px >= x && px < x + MedidasMapa.ANCHO_NODO && py >= y && py < y + MedidasMapa.ALTO_NODO
}

/** Cabecera «SEMESTRE 01»: su esquina superior izquierda coincide con la de su columna. */
internal data class CabeceraMapa(val numero: Int, val x: Float, val y: Float)

/** Prerrequisito -> materia. Solo existe si las dos son nodos. */
internal data class AristaMapa(val desde: String, val hasta: String, val inicio: PuntoMapa, val fin: PuntoMapa) {
    private val mitadDeDx: Float get() = (fin.x - inicio.x) / 2

    /** Controles horizontales a mitad de dx: la curva sale y entra de los nodos en horizontal. */
    val controlInicio: PuntoMapa get() = PuntoMapa(inicio.x + mitadDeDx, inicio.y)
    val controlFin: PuntoMapa get() = PuntoMapa(fin.x - mitadDeDx, fin.y)
}

/**
 * Donde cae cada cosa del mapa: una columna por semestre y, dentro de ella, las
 * materias en el orden de los datos. Kotlin puro (sin Compose ni Android).
 */
internal class DistribucionMapa private constructor(
    val cabeceras: List<CabeceraMapa>,
    val nodos: List<NodoMapa>,
    val aristas: List<AristaMapa>,
    val ancho: Float,
    val alto: Float,
) {
    /** Codigo de la materia bajo el punto del mundo, o null si cae en un hueco. */
    fun nodoEn(x: Float, y: Float): String? = nodos.firstOrNull { it.contiene(x, y) }?.codigo

    companion object {
        fun de(carrera: Carrera): DistribucionMapa {
            val porSemestre = carrera.asignaturas.filter { it.semestre != null }.groupBy { it.semestre }
            val nodos = nodosDe(carrera, porSemestre)
            val filas = carrera.semestres.maxOfOrNull { porSemestre[it.numero].orEmpty().size } ?: 0
            return DistribucionMapa(
                cabeceras = carrera.semestres.mapIndexed { columna, semestre ->
                    CabeceraMapa(semestre.numero, xDeColumna(columna), MedidasMapa.MARGEN)
                },
                nodos = nodos,
                aristas = aristasDe(carrera, nodos),
                ancho = anchoTotal(carrera.semestres.size),
                alto = altoTotal(filas),
            )
        }

        private fun nodosDe(carrera: Carrera, porSemestre: Map<Int?, List<Asignatura>>) =
            carrera.semestres.flatMapIndexed { columna, semestre ->
                porSemestre[semestre.numero].orEmpty().mapIndexed { fila, asignatura ->
                    NodoMapa(asignatura.codigo, xDeColumna(columna), yDeFila(fila))
                }
            }

        private fun aristasDe(carrera: Carrera, nodos: List<NodoMapa>): List<AristaMapa> {
            val nodoPorCodigo = nodos.associateBy { it.codigo }
            return carrera.asignaturas.flatMap { materia ->
                val destino = nodoPorCodigo[materia.codigo]
                materia.prerrequisitos.mapNotNull { codigoPrerrequisito ->
                    val origen = nodoPorCodigo[codigoPrerrequisito]
                    if (origen == null || destino == null) null
                    else AristaMapa(origen.codigo, destino.codigo, origen.centroDerecho, destino.centroIzquierdo)
                }
            }
        }

        private fun xDeColumna(columna: Int) = MedidasMapa.MARGEN + columna * MedidasMapa.PASO_COLUMNA

        private fun yDeFila(fila: Int) = MedidasMapa.MARGEN + MedidasMapa.ALTO_CABECERA + fila * MedidasMapa.PASO_FILA

        private fun anchoTotal(columnas: Int): Float {
            val huecos = (columnas - 1).coerceAtLeast(0)
            return 2 * MedidasMapa.MARGEN + columnas * MedidasMapa.ANCHO_NODO + huecos * MedidasMapa.ESPACIO_COLUMNA
        }

        private fun altoTotal(filas: Int): Float {
            val huecos = (filas - 1).coerceAtLeast(0)
            return 2 * MedidasMapa.MARGEN + MedidasMapa.ALTO_CABECERA +
                filas * MedidasMapa.ALTO_NODO + huecos * MedidasMapa.ESPACIO_FILA
        }
    }
}
