/**
 * Lo que la portada necesita saber de las carreras para ordenarlas y
 * encontrarlas: de que tipo es cada una, como se buscan y cual es la tuya.
 */

/* Los tipos salen del propio nombre oficial, que empieza por ellos. Asi una
   carrera nueva cae sola en su grupo sin tocar nada. */
export const TIPOS = ['Ingeniería', 'Licenciatura', 'Gerencia']

/** Como se nombra un grupo entero en el filtro */
export const PLURAL = {
  Ingeniería: 'Ingenierías',
  Licenciatura: 'Licenciaturas',
  Gerencia: 'Gerencia',
}

export const TODAS = 'Todas'

export const tipoDe = (carrera) => TIPOS.find((t) => carrera.nombre.startsWith(t)) ?? null

/* Sin tildes ni mayusculas: quien busca en el telefono no escribe "Petróleo" */
const normalizar = (texto) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

/**
 * Las carreras de un tipo (o todas) cuyo nombre contiene lo escrito. Cada
 * palabra tiene que aparecer, en cualquier orden: "ing sistemas" encuentra
 * Ingenieria de Sistemas.
 */
export function buscarCarreras(carreras, texto = '', tipo = TODAS) {
  const palabras = normalizar(texto).split(/\s+/).filter(Boolean)
  return carreras.filter((c) => {
    if (tipo !== TODAS && tipoDe(c) !== tipo) return false
    const nombre = normalizar(c.nombre)
    return palabras.every((p) => nombre.includes(p))
  })
}

/**
 * La carrera de quien vuelve: la ultima que abrio, o si no consta, la primera
 * en la que tiene materias marcadas. Ninguna si es su primera vez.
 */
export function carreraPropia(carreras, ultima, conMarcas) {
  if (ultima && carreras.some((c) => c.slug === ultima)) return ultima
  return carreras.find((c) => conMarcas(c.slug))?.slug ?? null
}

/** Lo que se puede abrir encima de la portada (ver HojasPortada) */
export const HOJA = { CARRERA: 'carrera', BUSCAR: 'buscar', MENU: 'menu' }
