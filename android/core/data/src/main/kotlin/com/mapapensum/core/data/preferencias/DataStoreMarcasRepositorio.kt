package com.mapapensum.core.data.preferencias

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.mapapensum.core.domain.repositorio.MarcasRepositorio
import com.mapapensum.core.model.Marca
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.Json

private const val PREFIJO_CLAVE_MARCAS = "marcas_"

/**
 * Las marcas de cada carrera viven en una sola entrada ("marcas_<slug>") con un
 * JSON {codigo: marca}. Una entrada por carrera mantiene las escrituras chicas
 * y aisla las carreras entre si.
 */
internal class DataStoreMarcasRepositorio(
    private val almacen: DataStore<Preferences>,
    private val json: Json,
) : MarcasRepositorio {

    // distinctUntilChanged: DataStore emite al cambiar *cualquier* clave (p. ej. la
    // carrera reciente); sin esto el mapa se repintaria sin que cambie nada.
    override fun marcas(slug: String): Flow<Map<String, Marca>> {
        val clave = claveDe(slug)
        return almacen.datosLegibles()
            .map { preferencias -> decodificarMarcas(preferencias[clave], json) }
            .distinctUntilChanged()
    }

    override suspend fun fijar(slug: String, codigo: String, marca: Marca?) {
        val clave = claveDe(slug)
        // Leer y escribir dentro de edit es atomico: dos toques seguidos no se pisan.
        almacen.edit { preferencias ->
            val actualizadas = decodificarMarcas(preferencias[clave], json).conMarca(codigo, marca)
            if (actualizadas.isEmpty()) {
                preferencias.remove(clave)
            } else {
                preferencias[clave] = codificarMarcas(actualizadas, json)
            }
        }
    }

    private fun claveDe(slug: String) = stringPreferencesKey("$PREFIJO_CLAVE_MARCAS$slug")
}

private fun Map<String, Marca>.conMarca(codigo: String, marca: Marca?): Map<String, Marca> =
    if (marca == null) this - codigo else this + (codigo to marca)
