pluginManagement {
    repositories {
        google()
        // Espejo de Maven Central: el central limita peticiones (429) desde IPs compartidas
        maven("https://maven-central.storage-download.googleapis.com/maven2")
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        // Espejo de Maven Central: el central limita peticiones (429) desde IPs compartidas
        maven("https://maven-central.storage-download.googleapis.com/maven2")
        mavenCentral()
    }
}

rootProject.name = "MapaPensum"

enableFeaturePreview("TYPESAFE_PROJECT_ACCESSORS")

// Capas: model y domain son Kotlin puro (sin Android); data y designsystem
// son librerias Android; cada pantalla es un modulo feature; app las une.
include(":app")
include(":core:model")
include(":core:domain")
include(":core:data")
include(":core:designsystem")
include(":feature:inicio")
include(":feature:mapa")
