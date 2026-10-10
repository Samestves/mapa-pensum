package com.mapapensum.feature.inicio

import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.mapapensum.core.designsystem.Textos
import com.mapapensum.core.domain.caso.GrupoCarreras
import com.mapapensum.core.model.TipoCarrera

// El titulo queda alineado con el texto de las filas: 16dp de la lista + 20dp propios.
private val SANGRIA_TITULO = 20.dp
private val SEPARACION_TITULO_CAJA = 8.dp

/**
 * Titulo y filas de un grupo como items de la lista y no como una Column anidada:
 * asi LazyColumn solo compone las filas visibles y cada una se identifica por su slug.
 */
internal fun LazyListScope.grupoCarreras(
    grupo: GrupoCarreras,
    separacionSuperior: Dp,
    alAbrirCarrera: (String) -> Unit,
) {
    if (grupo.carreras.isEmpty()) return

    item(key = "grupo-${grupo.tipo.name}") {
        Text(
            text = tituloDe(grupo.tipo),
            style = Textos.Etiqueta,
            modifier = Modifier
                .padding(start = SANGRIA_TITULO, end = SANGRIA_TITULO, top = separacionSuperior, bottom = SEPARACION_TITULO_CAJA)
                .semantics { heading() },
        )
    }
    val ultimo = grupo.carreras.lastIndex
    itemsIndexed(items = grupo.carreras, key = { _, carrera -> carrera.slug }) { indice, carrera ->
        FilaCarrera(
            carrera = carrera,
            esPrimera = indice == 0,
            esUltima = indice == ultimo,
            alAbrirCarrera = alAbrirCarrera,
        )
    }
}

private fun tituloDe(tipo: TipoCarrera): String = when (tipo) {
    TipoCarrera.INGENIERIA -> "INGENIERÍAS"
    TipoCarrera.LICENCIATURA -> "LICENCIATURAS"
}
