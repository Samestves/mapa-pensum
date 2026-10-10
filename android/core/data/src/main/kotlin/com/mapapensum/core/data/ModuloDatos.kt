package com.mapapensum.core.data

import android.content.Context
import com.mapapensum.core.data.catalogo.AssetsCatalogoRepositorio
import com.mapapensum.core.data.preferencias.DataStoreMarcasRepositorio
import com.mapapensum.core.data.preferencias.DataStorePreferenciasRepositorio
import com.mapapensum.core.data.preferencias.almacenMapaPensum
import com.mapapensum.core.domain.repositorio.CatalogoRepositorio
import com.mapapensum.core.domain.repositorio.MarcasRepositorio
import com.mapapensum.core.domain.repositorio.PreferenciasRepositorio

/**
 * Unico punto por el que el resto de la app conoce esta capa: expone los
 * repositorios como contratos del dominio y esconde las implementaciones.
 */
class ModuloDatos(contexto: Context) {
    // applicationContext: este objeto vive tanto como la app y no debe retener una Activity.
    private val contextoApp: Context = contexto.applicationContext

    val catalogo: CatalogoRepositorio = AssetsCatalogoRepositorio(contextoApp.assets, jsonDatos)

    val marcas: MarcasRepositorio = DataStoreMarcasRepositorio(contextoApp.almacenMapaPensum, jsonDatos)

    val preferencias: PreferenciasRepositorio = DataStorePreferenciasRepositorio(contextoApp.almacenMapaPensum)
}
