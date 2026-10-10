package com.mapapensum.core.data.catalogo

import android.content.res.AssetManager
import com.mapapensum.core.domain.repositorio.CatalogoRepositorio
import com.mapapensum.core.model.Carrera
import com.mapapensum.core.model.CarreraResumen
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json

private const val CARPETA_CARRERAS = "carreras"
private const val ARCHIVO_INDICE = "$CARPETA_CARRERAS/indice.json"

/**
 * Lee los pensums que viajan dentro del APK. Son de solo lectura, asi que cada
 * archivo se parsea una sola vez y se guarda en memoria: volver a una carrera
 * no cuesta leer ni decodificar otra vez en un telefono de gama baja.
 */
internal class AssetsCatalogoRepositorio(
    private val assets: AssetManager,
    private val json: Json,
) : CatalogoRepositorio {

    // Un solo candado: evita parsear dos veces si dos pantallas piden lo mismo
    // a la vez. Los pensums son pocos y pequenos, no vale la pena uno por clave.
    private val candado = Mutex()
    private var resumenes: List<CarreraResumen>? = null
    private val carrerasLeidas = mutableMapOf<String, Carrera>()

    override suspend fun carreras(): List<CarreraResumen> = candado.withLock {
        resumenes ?: leerResumenes().also { resumenes = it }
    }

    override suspend fun carrera(slug: String): Carrera = candado.withLock {
        carrerasLeidas[slug] ?: leerCarrera(slug).also { carrerasLeidas[slug] = it }
    }

    private suspend fun leerResumenes(): List<CarreraResumen> =
        leerAsset(ARCHIVO_INDICE) { texto ->
            json.decodeFromString(ListSerializer(ResumenCarreraDto.serializer()), texto).map { it.aModelo() }
        }

    private suspend fun leerCarrera(slug: String): Carrera =
        leerAsset("$CARPETA_CARRERAS/$slug.json") { texto ->
            json.decodeFromString(CarreraDto.serializer(), texto).aModelo()
        }

    // Leer y decodificar van juntos en IO: decodificar un pensum grande tampoco
    // debe correr en el hilo principal.
    private suspend fun <T> leerAsset(ruta: String, decodificar: (String) -> T): T =
        withContext(Dispatchers.IO) {
            val texto = assets.open(ruta).use { it.readBytes() }.decodeToString()
            decodificar(texto)
        }
}
