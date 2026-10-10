package com.mapapensum.navegacion

/** Las rutas de la app, en un solo sitio para no repetir cadenas. */
object Destino {
    const val INICIO = "inicio"
    const val ARG_SLUG = "slug"
    const val MAPA = "mapa/{$ARG_SLUG}"

    fun mapa(slug: String) = "mapa/$slug"
}
