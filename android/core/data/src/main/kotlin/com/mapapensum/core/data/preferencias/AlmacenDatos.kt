package com.mapapensum.core.data.preferencias

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.preferencesDataStore
import java.io.IOException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch

private const val NOMBRE_ALMACEN = "mapa_pensum"

/**
 * El unico DataStore de la app. DataStore exige una sola instancia por archivo
 * (dos abiertas sobre el mismo archivo lanzan excepcion), por eso la declaracion
 * vive a nivel de archivo y marcas y preferencias comparten el mismo almacen.
 */
internal val Context.almacenMapaPensum: DataStore<Preferences> by preferencesDataStore(name = NOMBRE_ALMACEN)

/**
 * Lecturas que nunca revientan por un archivo danado o ilegible: se parte de
 * cero antes que cerrar la app. Cualquier otro error si se propaga.
 */
internal fun DataStore<Preferences>.datosLegibles(): Flow<Preferences> =
    data.catch { causa ->
        if (causa is IOException) emit(emptyPreferences()) else throw causa
    }
