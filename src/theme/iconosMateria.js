import {
  Atom, Beaker, BookOpen, Boxes, Briefcase, Bug, Calculator, ChartColumn,
  CircuitBoard, Cpu, Database, Dna, Droplets, Fuel, GraduationCap, HardHat,
  Landmark, Languages, Leaf, Map, Microscope, Network, PencilRuler,
  Presentation, Recycle, Scale, Settings, Sigma, Sparkles, TrendingUp, Users,
  Utensils, Waves, Wheat, Wrench, Zap,
} from 'lucide-react'

/**
 * Un icono para cada materia, deducido de su NOMBRE.
 *
 * La alternativa evidente era un icono por area, y no sirve: el area solo esta
 * clasificada en Ingenieria de Sistemas. En las otras ocho carreras el campo
 * viene vacio en las 437 materias, asi que un icono por area habria salido en
 * una carrera de nueve y en las demas no se habria visto ninguno.
 *
 * El nombre, en cambio, esta siempre. "Laboratorio de Fisica I" lleva
 * "laboratorio" lo mismo en Sistemas que en Agronomica. Con estas reglas se
 * cubren 666 de las 749 materias del pensum -el 88,9 %-, y lo que no casa se
 * queda SIN icono en vez de recibir uno inventado: una tarjeta sin icono se
 * lee perfectamente, y una con el icono equivocado enseña algo falso.
 *
 * EL ORDEN IMPORTA: gana la primera regla que casa, asi que lo especifico va
 * antes que lo general. Y no es teoria: con la regla de "sistema" delante
 * salian CINCO engranajes identicos en la misma pantalla, porque en esta
 * carrera medio pensum lleva la palabra dentro. Un icono repetido cinco veces
 * deja de identificar; es papel pintado.
 */
const REGLAS = [
  // Lo que manda por encima del tema: el formato de la materia
  [/laboratorio|\blab\b/, Beaker],
  [/taller/, Wrench],
  [/trabajo de grado|areas? de grado|tesis|pasantia|seminario/, GraduationCap],
  [/extra[- ]?academica|deporte|cultural|servicio comunitario/, Sparkles],
  [/proyecto|formulacion|evaluacion de proy/, Presentation],

  // Ciencias básicas
  [/matematic|calculo|algebra|analisis matem|numeric|logica formal/, Sigma],
  [/fisica|mecanica racional|estatica|dinamica/, Atom],
  [/quimica/, Beaker],
  [/estadistic|probabilidad|inferencia|muestreo|experimento|regresion/, ChartColumn],
  [/fluido|hidraulic|hidrolog|riego|bomba|bombeo|piscicultur|acuicultur|pesca/, Waves],
  [/dibujo|geometri|topografi/, PencilRuler],

  /* Estas tres van ANTES que la regla de "sistema" a proposito: en una carrera
     de Ingenieria de Sistemas medio pensum lleva la palabra dentro, y lo que
     distingue a esas materias no es el "sistemas", es el costo y el circuito. */
  [/electronic|circuito/, CircuitBoard],
  [/electric|energia|potencia/, Zap],
  [/contabilidad|contadur|costo|auditor/, Calculator],

  // Computación y sistemas
  [/programacion|algoritmo|lenguaje de prog|compilador|software|informatic|computac|digital/, Cpu],
  [/base de datos|bases de datos/, Database],
  [/redes|teleproces|comunicacion (de )?datos|teleinformatic|telematic/, Network],
  [/sistemic|sistema|simulacion|investigacion de operaciones|optimizacion|decision/, Settings],

  // Gestión, economía y derecho
  [/finanz|mercadeo|mercado|inversion|presupuesto/, TrendingUp],
  [/econom|banca|monetari|macro|micro/, Landmark],
  [/derecho|legislacion|legal|juridic|deontolog|etica|tributar|fiscal|impuesto|renta|laboral|sindical/, Scale],
  [/recursos humanos|personal|sueldo|salario|comportamiento|sociolog|psicolog|human|emocional|reunion|cooperativ|ergonom|liderazgo|negociac|capacitac/, Users],
  [/gerenc|administrat|administrac|gestion|organizac|planificacion|estrateg|empresa|consultor|procedimiento|direccion/, Briefcase],
  [/inventario|almacen|logistic|produccion|manufactur/, Boxes],
  [/seguridad|higiene|riesgo|industrial|resistencia de material|estructura/, HardHat],

  // Agro, ambiente y alimentos
  [/suelo|edafolog|geolog|cartograf|climat|meteorolog|topograf|fertiliz|enmienda/, Map],
  [/ambient|ecolog|contaminac|residuo|reciclaj|impacto/, Recycle],
  [/agua|potable|saneamiento|sanitari|efluente|acueducto|cloaca/, Droplets],
  [/entomolog|plaga|fitopatolog|insecto/, Bug],
  [/genetic|biolog|celular|molecular|microbiolog/, Dna],
  [/cultivo|cereal|semilla|fito|cosecha|agricol|vegetal|botanic|angiosperma|planta|horticultur|hortaliza|frutal|malez|raices|tuberculo|cafe|cacao|ca(n|ñ)a|palma|oleaginosa|forrajicultura|especie|rural|extension/, Wheat],
  [/animal|pecuar|zootecni|bovin|avicol|porcin|caprin|apicultur|forraje|pasto|parque|jardin|silvicultur|forestal|ornamental/, Leaf],
  [/aliment|nutricion|conserva|lacteo|carne|bebida/, Utensils],
  [/petroleo|yacimiento|perforacion|crudo|gas |refinac/, Fuel],
  [/investigac|metodolog|epistemolog/, Microscope],

  // Lo transversal va al final: son las palabras más comunes
  [/ingles|idioma|frances|portugues/, Languages],
  [/lenguaje|linguistic|expresion|comprension|redaccion|comunicacion|aprendizaje|destreza|historia|filosof|pensamiento/, BookOpen],
  [/agronom|agro/, Wheat],
]

const sinTildes = (t) =>
  String(t ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/** El icono que le toca a una materia, o null si ninguna regla la reconoce. */
export function iconoDeMateria(nombre) {
  const limpio = sinTildes(nombre)
  return limpio ? (REGLAS.find(([patron]) => patron.test(limpio))?.[1] ?? null) : null
}
