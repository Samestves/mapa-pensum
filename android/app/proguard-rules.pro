# kotlinx.serialization: conserva los serializadores generados de los DTO.
-keepattributes *Annotation*, InnerClasses
-keepclassmembers class com.mapapensum.** {
    *** Companion;
}
-keepclasseswithmembers class com.mapapensum.** {
    kotlinx.serialization.KSerializer serializer(...);
}
