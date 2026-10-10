package com.mapapensum.core.designsystem

import androidx.compose.ui.graphics.Color

/**
 * Paleta oscura de la web. Los valores son los mismos para que ambas apps se vean
 * como un solo producto; los bordes son blanco translucido para adaptarse a
 * cualquier superficie sin definir un gris por cada fondo.
 */
object Colores {
    private const val OPACIDAD_BORDE = 0.08f
    private const val OPACIDAD_SEPARADOR = 0.06f

    val Fondo = Color(0xFF0A0B0E)
    val Superficie = Color(0xFF131519)
    val Superficie2 = Color(0xFF1A1D23)

    val Borde = Color.White.copy(alpha = OPACIDAD_BORDE)
    val Separador = Color.White.copy(alpha = OPACIDAD_SEPARADOR)

    val Tinta = Color(0xFFF2F3F5)
    val TintaSuave = Color(0xFFC8CCD3)
    val TintaSecundaria = Color(0xFFA3A9B4)
    val TintaTenue = Color(0xFF6F7682)

    val Aprobada = Color(0xFF3FCB74)
    val Cursando = Color(0xFFF5B544)
}
