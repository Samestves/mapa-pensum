package com.mapapensum

import android.app.Application

/** Crea el contenedor una vez por proceso: lo comparten todas las pantallas. */
class MapaPensumApp : Application() {
    lateinit var contenedor: ContenedorApp
        private set

    override fun onCreate() {
        super.onCreate()
        contenedor = ContenedorApp(this)
    }
}
