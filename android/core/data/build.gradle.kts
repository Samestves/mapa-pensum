// Implementa los repositorios del dominio: pensums desde assets, marcas y
// preferencias en DataStore.
plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.serialization)
}

android {
    namespace = "com.mapapensum.core.data"
    compileSdk = 35
    defaultConfig { minSdk = 24 }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    // Una sola fuente de verdad: los mismos JSON que usa la web.
    sourceSets["main"].assets.srcDir(layout.buildDirectory.dir("generated/pensums"))
}

kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) } }

val copiarPensums by tasks.registering(Copy::class) {
    from(rootProject.file("../src/data/carreras")) { include("*.json") }
    into(layout.buildDirectory.dir("generated/pensums/carreras"))
}
tasks.named("preBuild") { dependsOn(copiarPensums) }

dependencies {
    implementation(projects.core.domain)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.androidx.datastore.preferences)

    testImplementation(libs.junit)
}
