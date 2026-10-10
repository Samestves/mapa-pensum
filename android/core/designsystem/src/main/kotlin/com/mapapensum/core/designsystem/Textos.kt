package com.mapapensum.core.designsystem

import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp

/**
 * Estilos de la web traducidos a Compose. El interletrado va en `em` (como en CSS)
 * para que escale con el tamano de fuente. Las etiquetas no fuerzan mayusculas:
 * quien llama decide, porque cambiar el texto en el estilo rompe la accesibilidad.
 */
object Textos {
    private const val ALTURA_LINEA_TITULO_GRANDE = 1.1f

    val TituloGrande = TextStyle(
        fontFamily = Fuentes.Jost,
        fontWeight = FontWeight.Medium,
        fontSize = 34.sp,
        lineHeight = ALTURA_LINEA_TITULO_GRANDE.em,
        letterSpacing = (-0.01f).em,
        color = Colores.Tinta,
    )

    val Titulo = TextStyle(
        fontFamily = Fuentes.Jost,
        fontWeight = FontWeight.Medium,
        fontSize = 24.sp,
        color = Colores.Tinta,
    )

    val Cuerpo = TextStyle(
        fontFamily = Fuentes.Jost,
        fontWeight = FontWeight.Normal,
        fontSize = 17.sp,
        color = Colores.Tinta,
    )

    val CuerpoSuave = TextStyle(
        fontFamily = Fuentes.Jost,
        fontWeight = FontWeight.Normal,
        fontSize = 15.sp,
        color = Colores.TintaSuave,
    )

    val Etiqueta = TextStyle(
        fontFamily = Fuentes.PlexMono,
        fontWeight = FontWeight.Normal,
        fontSize = 11.sp,
        letterSpacing = 0.14f.em,
        color = Colores.TintaSecundaria,
    )

    val Cifra = TextStyle(
        fontFamily = Fuentes.PlexMono,
        fontWeight = FontWeight.Normal,
        fontSize = 13.sp,
        color = Colores.Tinta,
    )

    val Codigo = TextStyle(
        fontFamily = Fuentes.PlexMono,
        fontWeight = FontWeight.Normal,
        fontSize = 10.sp,
        color = Colores.TintaSecundaria,
    )
}
