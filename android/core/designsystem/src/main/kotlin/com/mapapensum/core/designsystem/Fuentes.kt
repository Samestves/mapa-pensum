package com.mapapensum.core.designsystem

import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight

/**
 * Jost es una fuente variable: un solo archivo (~130 KB) cubre todos los pesos en
 * vez de empaquetar un TTF por peso. En Android < 8 el sistema ignora la
 * variacion y usa el peso por defecto del archivo; es aceptable para el MVP.
 */
@OptIn(ExperimentalTextApi::class)
object Fuentes {
    private val PesosJost = listOf(
        FontWeight.Light,
        FontWeight.Normal,
        FontWeight.Medium,
        FontWeight.SemiBold,
    )

    val Jost: FontFamily = FontFamily(PesosJost.map(::jostConPeso))

    val PlexMono: FontFamily = FontFamily(
        Font(R.font.plex_mono_regular, FontWeight.Normal),
        Font(R.font.plex_mono_medium, FontWeight.Medium),
    )

    private fun jostConPeso(peso: FontWeight): Font = Font(
        resId = R.font.jost,
        weight = peso,
        variationSettings = FontVariation.Settings(FontVariation.weight(peso.weight)),
    )
}
