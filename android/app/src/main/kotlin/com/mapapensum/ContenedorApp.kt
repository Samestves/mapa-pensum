package com.mapapensum

import android.content.Context
import com.mapapensum.core.data.ModuloDatos
import com.mapapensum.core.domain.caso.AbrirCarrera
import com.mapapensum.core.domain.caso.MarcarMateria
import com.mapapensum.core.domain.caso.ObtenerInicio
import com.mapapensum.core.domain.caso.ObtenerMapa

/**
 * Inyeccion de dependencias a mano. Es el unico sitio que conoce a la vez los
 * datos y los casos de uso: las pantallas solo reciben casos de uso, asi que
 * cambiar de donde salen los datos no toca ninguna. Si la app crece, este
 * archivo es lo unico que se cambia por Hilt.
 */
class ContenedorApp(contexto: Context) {
    private val datos = ModuloDatos(contexto)

    val obtenerInicio = ObtenerInicio(datos.catalogo, datos.marcas, datos.preferencias)
    val obtenerMapa = ObtenerMapa(datos.catalogo, datos.marcas)
    val marcarMateria = MarcarMateria(datos.marcas)
    val abrirCarrera = AbrirCarrera(datos.preferencias)
}
