package com.mapapensum

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.mapapensum.core.designsystem.MapaPensumTema
import com.mapapensum.navegacion.NavegacionApp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        val contenedor = (application as MapaPensumApp).contenedor
        setContent {
            MapaPensumTema {
                NavegacionApp(contenedor)
            }
        }
    }
}
