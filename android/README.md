# Mapa de Pensum — Android

App nativa (Kotlin + Jetpack Compose) del mismo producto que la web. Comparte
con ella los pensums: `core/data` copia `../src/data/carreras/*.json` a sus
assets al compilar, así que hay una sola fuente de verdad.

## Módulos

```
app/                 Application, MainActivity, navegación e inyección (manual)
core/model/          Entidades. Kotlin puro.
core/domain/         Reglas y casos de uso + contratos de repositorio. Kotlin puro.
core/data/           Repositorios: assets (pensums) y DataStore (marcas, preferencias).
core/designsystem/   Tema, colores, tipografía, iconos y piezas comunes.
feature/inicio/      Pantalla de inicio: Continuar + carreras agrupadas.
feature/mapa/        Mapa de una carrera: grafo con zoom, marcar materias.
```

Las dependencias van hacia dentro:

```
app ─► feature/* ─► core/domain ─► core/model
 │         └──────► core/designsystem
 └──► core/data ──► core/domain
```

- `model` y `domain` no conocen Android: se prueban en la JVM, sin emulador.
- Las `feature` no conocen `data`: reciben casos de uso. Cambiar DataStore por
  una base de datos o por un servidor no toca ninguna pantalla.
- Ninguna `feature` conoce a otra: navegan por callbacks que conecta `app`.

## Convenciones

- Nombres del dominio en español, como la web: `Carrera`, `Asignatura`,
  `Marca`, `Estado`. Los sufijos de arquitectura siguen la costumbre de Android:
  `Repositorio`, `ViewModel`, `UiState`, `Pantalla`.
- Pantalla = `XRuta` (con ViewModel) + `XPantalla` (sin estado, solo pinta).
- Estado de UI inmutable en un `StateFlow`; eventos como funciones del ViewModel.
- Sin inyección por anotaciones en el MVP: `app/ContenedorApp` crea todo. Pasar
  a Hilt después solo toca `app`.

## Compilar

Requiere JDK 17+ y el Android SDK (plataforma 35).

```
./gradlew :app:assembleRelease      # APK firmado si existe firma.properties
./gradlew :core:domain:test         # reglas del dominio
```
