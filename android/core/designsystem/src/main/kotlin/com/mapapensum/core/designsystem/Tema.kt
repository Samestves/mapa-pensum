package com.mapapensum.core.designsystem

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily

private val EsquemaOscuro = darkColorScheme(
    primary = Colores.Tinta,
    onPrimary = Colores.Fondo,
    background = Colores.Fondo,
    onBackground = Colores.Tinta,
    surface = Colores.Superficie,
    onSurface = Colores.Tinta,
    surfaceVariant = Colores.Superficie2,
    onSurfaceVariant = Colores.TintaSecundaria,
    outline = Colores.Borde,
    outlineVariant = Colores.Separador,
)

private val Tipografia = Typography().conFuente(Fuentes.Jost)

/**
 * Solo oscuro: la web tambien lo es y evita mantener dos paletas en el MVP.
 * Se fija Jost como fuente por defecto para que ningun `Text` caiga en Roboto.
 */
@Composable
fun MapaPensumTema(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = EsquemaOscuro,
        typography = Tipografia,
        content = content,
    )
}

private fun Typography.conFuente(familia: FontFamily): Typography = Typography(
    displayLarge = displayLarge.conFuente(familia),
    displayMedium = displayMedium.conFuente(familia),
    displaySmall = displaySmall.conFuente(familia),
    headlineLarge = headlineLarge.conFuente(familia),
    headlineMedium = headlineMedium.conFuente(familia),
    headlineSmall = headlineSmall.conFuente(familia),
    titleLarge = titleLarge.conFuente(familia),
    titleMedium = titleMedium.conFuente(familia),
    titleSmall = titleSmall.conFuente(familia),
    bodyLarge = bodyLarge.conFuente(familia),
    bodyMedium = bodyMedium.conFuente(familia),
    bodySmall = bodySmall.conFuente(familia),
    labelLarge = labelLarge.conFuente(familia),
    labelMedium = labelMedium.conFuente(familia),
    labelSmall = labelSmall.conFuente(familia),
)

private fun TextStyle.conFuente(familia: FontFamily): TextStyle = copy(fontFamily = familia)
