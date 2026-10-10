package com.mapapensum.feature.inicio

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.mapapensum.core.designsystem.Colores
import com.mapapensum.core.designsystem.Textos

// Sin el boton de tema (el MVP solo tiene tema oscuro) la barra superior quedaria vacia,
// asi que se reduce a un respiro en lugar de los 52dp del diseno.
private val RESPIRO_SUPERIOR = 24.dp
// Los contenidos de la lista llevan 16dp; el titulo se sangra 4dp mas para quedar a 20dp del borde.
private val SANGRIA_TITULO = 4.dp
private val SEPARACION_SUBTITULO = 6.dp

private const val TITULO = "Mapa de Pensum"
private const val SUBTITULO = "UDO · NÚCLEO DE MONAGAS"

@Composable
internal fun Cabecera(modifier: Modifier = Modifier) {
    Column(modifier = modifier.padding(start = SANGRIA_TITULO, end = SANGRIA_TITULO, top = RESPIRO_SUPERIOR)) {
        Text(
            text = TITULO,
            style = Textos.TituloGrande,
            color = Colores.Tinta,
            modifier = Modifier.semantics { heading() },
        )
        Text(
            text = SUBTITULO,
            style = Textos.Etiqueta,
            modifier = Modifier.padding(top = SEPARACION_SUBTITULO),
        )
    }
}
