plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.mapapensum"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.mapapensum"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
    }

    // La firma de prueba vive fuera del repo; sin ella el release sale sin firmar.
    val firma = rootProject.file("firma.properties")
    signingConfigs {
        if (firma.exists()) {
            create("prueba") {
                val p = java.util.Properties().apply { firma.inputStream().use(::load) }
                storeFile = rootProject.file(p.getProperty("archivo"))
                storePassword = p.getProperty("clave")
                keyAlias = p.getProperty("alias")
                keyPassword = p.getProperty("clave")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfigs.findByName("prueba")?.let { signingConfig = it }
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) } }

dependencies {
    implementation(projects.core.domain)
    implementation(projects.core.data)
    implementation(projects.core.designsystem)
    implementation(projects.feature.inicio)
    implementation(projects.feature.mapa)

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
}
