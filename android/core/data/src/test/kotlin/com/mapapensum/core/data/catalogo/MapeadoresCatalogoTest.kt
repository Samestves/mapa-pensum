package com.mapapensum.core.data.catalogo

import com.mapapensum.core.data.jsonDatos
import com.mapapensum.core.model.TipoCarrera
import kotlinx.serialization.builtins.ListSerializer
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class MapeadoresCatalogoTest {

    @Test
    fun `el color hexadecimal se vuelve ARGB opaco`() {
        assertEquals(0xFF6094FFL, "#6094ff".aColorArgb())
        assertEquals(0xFF0B7391L, "#0B7391".aColorArgb())
    }

    @Test
    fun `un color mal formado falla con un mensaje claro`() {
        val error = assertThrows(IllegalArgumentException::class.java) { "6094ff".aColorArgb() }
        assertTrue(error.message.orEmpty().contains("6094ff"))
        assertThrows(IllegalArgumentException::class.java) { "#fff".aColorArgb() }
    }

    @Test
    fun `el resumen del indice calcula el tipo con la regla del dominio`() {
        val resumenes = jsonDatos.decodeFromString(ListSerializer(ResumenCarreraDto.serializer()), INDICE)
            .map { it.aModelo() }

        assertEquals(listOf(TipoCarrera.INGENIERIA, TipoCarrera.LICENCIATURA), resumenes.map { it.tipo })
        val sistemas = resumenes.first()
        assertEquals("ingenieria-de-sistemas", sistemas.slug)
        assertEquals(0xFF6094FFL, sistemas.color.oscuro)
        assertEquals(0xFF2C5BD6L, sistemas.color.claro)
        assertEquals(listOf(6, 5, 5), sistemas.silueta)
        assertEquals(49, sistemas.asignaturas)
    }

    @Test
    fun `la carrera conserva uc nulo y semestre ausente de las electivas`() {
        val carrera = jsonDatos.decodeFromString(CarreraDto.serializer(), CARRERA).aModelo()

        val sinCreditos = carrera.asignaturas.first { it.codigo == "0000001" }
        assertNull(sinCreditos.uc)
        assertEquals(1, sinCreditos.semestre)

        val electiva = carrera.gruposElectivas.single().asignaturas.single()
        assertNull(electiva.semestre)
        assertEquals(3, electiva.uc)
    }

    @Test
    fun `las casillas de electiva se marcan y quedan fuera de las obligatorias`() {
        val carrera = jsonDatos.decodeFromString(CarreraDto.serializer(), CARRERA).aModelo()

        val casilla = carrera.asignaturas.first { it.codigo == "casilla-tecnica-1" }
        assertTrue(casilla.esHueco)
        assertEquals("tecnica", casilla.grupo)
        assertFalse(carrera.obligatorias.any { it.esHueco })
        assertEquals(2, carrera.obligatorias.size)
    }

    @Test
    fun `las electivas de un grupo heredan la clave del grupo`() {
        val carrera = jsonDatos.decodeFromString(CarreraDto.serializer(), CARRERA).aModelo()

        assertEquals("tecnica", carrera.gruposElectivas.single().asignaturas.single().grupo)
    }

    @Test
    fun `los campos desconocidos y los semestres sin creditos no rompen la lectura`() {
        val carrera = jsonDatos.decodeFromString(CarreraDto.serializer(), CARRERA).aModelo()

        assertEquals(listOf(null, 14), carrera.semestres.map { it.uc })
        assertEquals(listOf("0000001"), carrera.asignaturas.first { it.codigo == "0000002" }.prerrequisitos)
    }

    private companion object {
        val INDICE = """
            [
              {"slug":"ingenieria-de-sistemas","nombre":"Ingeniería de Sistemas","nombreCorto":"Sistemas",
               "color":{"oscuro":"#6094ff","claro":"#2c5bd6"},"semestres":10,"asignaturas":49,"electivas":30,
               "conCreditos":true,"silueta":[6,5,5]},
              {"slug":"licenciatura-en-administracion","nombre":"Licenciatura en Administración","nombreCorto":"Administración",
               "color":{"oscuro":"#f5b544","claro":"#a86b00"},"semestres":10,"asignaturas":56,"electivas":0,
               "conCreditos":false,"silueta":[5]}
            ]
        """.trimIndent()

        val CARRERA = """
            {
              "slug":"ingenieria-de-sistemas","nombre":"Ingeniería de Sistemas","nombreCorto":"Sistemas",
              "institucion":"UDO","creditos":null,"avisos":[],"campoNuevoDeLaWeb":{"a":1},
              "color":{"oscuro":"#6094ff","claro":"#2c5bd6"},
              "semestres":[{"numero":1,"cantidad":1},{"numero":2,"cantidad":1,"uc":14,"huecos":1}],
              "asignaturas":[
                {"codigo":"0000001","nombre":"Sin creditos","semestre":1,"uc":null,"prerrequisitos":[],"profundidad":1},
                {"codigo":"0000002","nombre":"Con creditos","semestre":2,"uc":4,"area":"sistemas","prerrequisitos":["0000001"]},
                {"codigo":"casilla-tecnica-1","nombre":"Electiva tecnica","semestre":2,"uc":null,
                 "prerrequisitos":[],"esHueco":true,"grupo":"tecnica"}
              ],
              "grupos":[
                {"clave":"tecnica","titulo":"Electivas Tecnicas","tipo":"electiva","cuota":null,
                 "asignaturas":[{"codigo":"0714303","nombre":"Programacion No Lineal","uc":3,"prerrequisitos":["0000002"]}]}
              ]
            }
        """.trimIndent()
    }
}
