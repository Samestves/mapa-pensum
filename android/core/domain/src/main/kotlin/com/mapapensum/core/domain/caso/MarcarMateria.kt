package com.mapapensum.core.domain.caso

import com.mapapensum.core.domain.repositorio.MarcasRepositorio
import com.mapapensum.core.model.Marca

/** Aplica un toque sobre una materia y guarda la marca resultante. */
class MarcarMateria(private val marcas: MarcasRepositorio) {
    suspend operator fun invoke(slug: String, codigo: String, actual: Marca?, accion: Accion) {
        marcas.fijar(slug, codigo, ReglasAvance.siguienteMarca(actual, accion))
    }
}
