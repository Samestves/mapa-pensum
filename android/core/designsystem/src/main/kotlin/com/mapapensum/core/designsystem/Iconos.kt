package com.mapapensum.core.designsystem

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.PathBuilder
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.unit.dp

/**
 * Iconos de trazo (sin relleno), como los SVG de la web. El color del trazo es un
 * marcador: `Icon` los tine con `LocalContentColor` o con el `tint` indicado.
 */
object Iconos {
    private const val LADO_VIEWPORT = 24f
    private const val GROSOR_TRAZO = 1.75f

    val Chevron: ImageVector = icono("Chevron") {
        moveTo(9f, 5f)
        lineTo(16f, 12f)
        lineTo(9f, 19f)
    }

    val Atras: ImageVector = icono("Atras") {
        moveTo(15f, 5f)
        lineTo(8f, 12f)
        lineTo(15f, 19f)
    }

    val Lista: ImageVector = icono("Lista") {
        moveTo(4f, 6f)
        lineTo(20f, 6f)
        moveTo(4f, 12f)
        lineTo(20f, 12f)
        moveTo(4f, 18f)
        lineTo(14f, 18f)
    }

    val Check: ImageVector = icono("Check") {
        moveTo(5f, 12.5f)
        lineTo(10f, 17.5f)
        lineTo(19f, 7f)
    }

    private fun icono(nombre: String, trazo: PathBuilder.() -> Unit): ImageVector =
        ImageVector.Builder(
            name = nombre,
            defaultWidth = LADO_VIEWPORT.dp,
            defaultHeight = LADO_VIEWPORT.dp,
            viewportWidth = LADO_VIEWPORT,
            viewportHeight = LADO_VIEWPORT,
        ).path(
            fill = null,
            stroke = SolidColor(Color.Black),
            strokeLineWidth = GROSOR_TRAZO,
            strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round,
            pathBuilder = trazo,
        ).build()
}
