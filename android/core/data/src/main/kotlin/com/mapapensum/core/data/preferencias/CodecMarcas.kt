package com.mapapensum.core.data.preferencias

import com.mapapensum.core.model.Marca
import kotlinx.serialization.builtins.MapSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.json.Json

// Sin Android a proposito: la tolerancia a datos viejos o rotos se prueba en la JVM.

// Se guarda el nombre de la marca como texto, no un numero ni el enum serializado:
// asi un valor de una version futura de la app se reconoce como "desconocido" y
// se descarta, en vez de romper la lectura.
private val serializadorMarcas = MapSerializer(String.serializer(), String.serializer())

internal fun codificarMarcas(marcas: Map<String, Marca>, json: Json): String =
    json.encodeToString(serializadorMarcas, marcas.mapValues { (_, marca) -> marca.name })

/**
 * Lo guardado vive en el telefono del estudiante meses o anos: puede venir de
 * otra version o estar danado. Nunca debe tumbar la app, asi que lo ilegible se
 * descarta (JSON roto: todo; valor desconocido: solo esa materia).
 */
internal fun decodificarMarcas(texto: String?, json: Json): Map<String, Marca> {
    if (texto == null) return emptyMap()
    val crudas = leerCrudas(texto, json) ?: return emptyMap()
    return crudas.mapNotNull { (codigo, nombre) -> marcaDe(nombre)?.let { codigo to it } }.toMap()
}

// SerializationException hereda de IllegalArgumentException, que tambien cubre
// el JSON que no es un objeto de textos.
private fun leerCrudas(texto: String, json: Json): Map<String, String>? =
    try {
        json.decodeFromString(serializadorMarcas, texto)
    } catch (excepcion: IllegalArgumentException) {
        null
    }

private fun marcaDe(nombre: String): Marca? = Marca.entries.firstOrNull { it.name == nombre }
