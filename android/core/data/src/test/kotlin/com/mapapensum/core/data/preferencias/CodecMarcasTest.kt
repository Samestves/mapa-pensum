package com.mapapensum.core.data.preferencias

import com.mapapensum.core.data.jsonDatos
import com.mapapensum.core.model.Marca
import org.junit.Assert.assertEquals
import org.junit.Test

class CodecMarcasTest {

    @Test
    fun `lo codificado se recupera igual`() {
        val marcas = mapOf("0714303" to Marca.APROBADA, "0714353" to Marca.CURSANDO)

        val texto = codificarMarcas(marcas, jsonDatos)

        assertEquals(marcas, decodificarMarcas(texto, jsonDatos))
    }

    @Test
    fun `sin nada guardado no hay marcas`() {
        assertEquals(emptyMap<String, Marca>(), decodificarMarcas(null, jsonDatos))
    }

    @Test
    fun `se descartan los valores que no son marcas`() {
        val texto = """{"a":"APROBADA","b":"BLOQUEADA","c":"cursando","d":"","e":"CURSANDO"}"""

        val marcas = decodificarMarcas(texto, jsonDatos)

        assertEquals(mapOf("a" to Marca.APROBADA, "e" to Marca.CURSANDO), marcas)
    }

    @Test
    fun `un JSON roto o de otra forma da cero marcas en vez de fallar`() {
        listOf("", "no es json", """{"a":"APROBADA""", """["APROBADA"]""", "null", """{"a":{"b":"c"}}""")
            .forEach { texto ->
                assertEquals(
                    "texto: $texto",
                    emptyMap<String, Marca>(),
                    decodificarMarcas(texto, jsonDatos),
                )
            }
    }
}
