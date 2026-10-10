package com.mapapensum.core.data

import kotlinx.serialization.json.Json

/**
 * Configuracion unica de JSON para todo el modulo.
 *
 * - `ignoreUnknownKeys`: los JSON se comparten con la web, que les agrega campos
 *   (areas, profundidad, avisos...) que la app no usa; no deben romper la lectura.
 * - `explicitNulls = false`: un campo opcional ausente y uno en null significan
 *   lo mismo, asi que no se escriben ni se exigen.
 */
internal val jsonDatos: Json = Json {
    ignoreUnknownKeys = true
    explicitNulls = false
}
