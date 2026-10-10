package com.mapapensum.feature.mapa

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import com.mapapensum.core.designsystem.Colores
import com.mapapensum.core.model.Estado

private const val OPACIDAD_RELLENO_MARCADA = 0.16f
private const val OPACIDAD_BORDE_DISPONIBLE = 0.70f
private const val OPACIDAD_RELLENO_BLOQUEADA = 0.60f
private const val OPACIDAD_ARISTA_ACTIVA = 0.45f
private const val OPACIDAD_ARISTA_BLOQUEADA = 0.08f

private const val GROSOR_BORDE = 1f
private const val RAYA_DISCONTINUA = 6f
private const val HUECO_DISCONTINUO = 4f

// Los trazos se crean una vez: el dibujo no debe reservar objetos en cada pasada.
private val TrazoContinuo = Stroke(width = GROSOR_BORDE)
private val TrazoDiscontinuo = Stroke(
    width = GROSOR_BORDE,
    pathEffect = PathEffect.dashPathEffect(floatArrayOf(RAYA_DISCONTINUA, HUECO_DISCONTINUO)),
)

/** Colores y trazo con que se pinta un nodo; salen del estado de la materia. */
internal data class EstiloNodo(
    val relleno: Color,
    val borde: Color,
    val trazoBorde: Stroke,
    val colorNombre: Color,
)

/** Una casilla de electiva es un hueco por llenar: contorno discontinuo, sin relleno y sin estado. */
internal fun estiloDeHueco() = EstiloNodo(
    relleno = Color.Transparent,
    borde = Colores.Borde,
    trazoBorde = TrazoDiscontinuo,
    colorNombre = Colores.TintaSecundaria,
)

internal fun estiloDeMateria(estado: Estado, colorCarrera: Color): EstiloNodo = when (estado) {
    Estado.APROBADA -> estiloMarcado(Colores.Aprobada)
    Estado.CURSANDO -> estiloMarcado(Colores.Cursando)
    Estado.DISPONIBLE -> EstiloNodo(
        relleno = Colores.Superficie,
        borde = colorCarrera.copy(alpha = OPACIDAD_BORDE_DISPONIBLE),
        trazoBorde = TrazoContinuo,
        colorNombre = Colores.Tinta,
    )
    Estado.BLOQUEADA -> EstiloNodo(
        relleno = Colores.Superficie.copy(alpha = OPACIDAD_RELLENO_BLOQUEADA),
        borde = Colores.Borde,
        trazoBorde = TrazoContinuo,
        colorNombre = Colores.TintaTenue,
    )
}

private fun estiloMarcado(color: Color) = EstiloNodo(
    relleno = color.copy(alpha = OPACIDAD_RELLENO_MARCADA),
    borde = color,
    trazoBorde = TrazoContinuo,
    colorNombre = Colores.Tinta,
)

/** La arista se apaga mientras la materia a la que llega no se pueda cursar todavia. */
internal fun colorDeArista(estadoDestino: Estado, colorCarrera: Color): Color = when (estadoDestino) {
    Estado.BLOQUEADA -> Color.White.copy(alpha = OPACIDAD_ARISTA_BLOQUEADA)
    Estado.DISPONIBLE, Estado.CURSANDO, Estado.APROBADA -> colorCarrera.copy(alpha = OPACIDAD_ARISTA_ACTIVA)
}
