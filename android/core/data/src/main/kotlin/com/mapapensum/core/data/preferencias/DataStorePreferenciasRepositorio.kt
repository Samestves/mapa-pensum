package com.mapapensum.core.data.preferencias

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.mapapensum.core.domain.repositorio.PreferenciasRepositorio
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map

private val claveCarreraReciente = stringPreferencesKey("carrera_reciente")

internal class DataStorePreferenciasRepositorio(
    private val almacen: DataStore<Preferences>,
) : PreferenciasRepositorio {

    // distinctUntilChanged: marcar materias tambien hace emitir al almacen, y el
    // inicio no debe recalcularse por una carrera reciente que no cambio.
    override val carreraReciente: Flow<String?> = almacen.datosLegibles()
        .map { preferencias -> preferencias[claveCarreraReciente] }
        .distinctUntilChanged()

    override suspend fun recordarCarrera(slug: String) {
        almacen.edit { preferencias -> preferencias[claveCarreraReciente] = slug }
    }
}
