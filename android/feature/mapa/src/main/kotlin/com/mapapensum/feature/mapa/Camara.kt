package com.mapapensum.feature.mapa

import androidx.compose.runtime.Composable
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.saveable.listSaver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Dp

private const val ESCALA_MINIMA = 0.35f
private const val ESCALA_MAXIMA = 2.2f

/** Columnas que caben en el ancho de la pantalla al abrir el mapa: la tercera asoma para invitar a deslizar. */
private const val COLUMNAS_VISIBLES_AL_ABRIR = 2.3f

/**
 * Donde esta mirando el estudiante: zoom y desplazamiento en pixeles de pantalla.
 *
 * Los valores son estado de Compose, pero solo los lee `graphicsLayer { }` y los gestos:
 * moverlos invalida la capa y no recompone ni vuelve a grabar el dibujo del mapa.
 */
@Stable
internal class Camara(escalaInicial: Float, desplazamientoXInicial: Float, desplazamientoYInicial: Float) {
    var escala by mutableFloatStateOf(escalaInicial.coerceIn(ESCALA_MINIMA, ESCALA_MAXIMA))
        private set
    var desplazamientoX by mutableFloatStateOf(desplazamientoXInicial)
        private set
    var desplazamientoY by mutableFloatStateOf(desplazamientoYInicial)
        private set

    /** Arrastra y hace zoom a la vez; el punto del mapa bajo [centroide] queda bajo los dedos. */
    fun transformar(centroide: Offset, desplazamiento: Offset, zoom: Float) {
        val escalaNueva = (escala * zoom).coerceIn(ESCALA_MINIMA, ESCALA_MAXIMA)
        val factor = escalaNueva / escala
        desplazamientoX = centroide.x + desplazamiento.x - (centroide.x - desplazamientoX) * factor
        desplazamientoY = centroide.y + desplazamiento.y - (centroide.y - desplazamientoY) * factor
        escala = escalaNueva
    }

    /** Punto de pantalla (px) -> punto del mundo (dp), el espacio en que viven los nodos. */
    fun aMundo(pantalla: Offset, densidad: Float): Offset = Offset(
        x = (pantalla.x - desplazamientoX) / (escala * densidad),
        y = (pantalla.y - desplazamientoY) / (escala * densidad),
    )

    companion object {
        /** Sobrevive a girar el telefono: el estudiante no pierde el sitio donde estaba mirando. */
        val Guardador = listSaver<Camara, Float>(
            save = { listOf(it.escala, it.desplazamientoX, it.desplazamientoY) },
            restore = { Camara(it[0], it[1], it[2]) },
        )

        /** Arriba a la izquierda, bajo la barra, con ~2,3 columnas en el ancho. */
        fun inicial(anchoPantallaDp: Float, margenSuperiorPx: Float): Camara {
            val anchoDelMundoVisible = MedidasMapa.MARGEN + COLUMNAS_VISIBLES_AL_ABRIR * MedidasMapa.PASO_COLUMNA
            return Camara(anchoPantallaDp / anchoDelMundoVisible, 0f, margenSuperiorPx)
        }
    }
}

/** La camara de una carrera; [margenSuperior] deja el primer renglon libre de la barra al abrir. */
@Composable
internal fun rememberCamara(slug: String, margenSuperior: Dp): Camara {
    val anchoPantallaDp = LocalConfiguration.current.screenWidthDp.toFloat()
    val margenSuperiorPx = with(LocalDensity.current) { margenSuperior.toPx() }
    return rememberSaveable(slug, saver = Camara.Guardador) {
        Camara.inicial(anchoPantallaDp, margenSuperiorPx)
    }
}
