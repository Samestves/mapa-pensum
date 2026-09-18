/**
 * Que icono lleva cada materia en la esquina de su tarjeta.
 *
 * Se decide por el NOMBRE, con reglas que van de lo concreto a lo general:
 * "Laboratorio de Química Orgánica" tiene que caer en el anillo de benceno
 * de la orgánica antes que en el matraz de la química, y "Producción de
 * Bovinos de Leche" en la leche antes que en la vaca. La primera regla que
 * encaja gana, asi que el orden importa.
 *
 * No hay icono de reserva. Una materia que no encaje en ninguna regla se
 * queda sin icono, y eso tiene que verse -lo avisa validar-pensum y lo
 * prueba el test-: un icono generico en una sola tarjeta se ve como un
 * descuido justo porque las demas dicen algo de si mismas.
 *
 * Los nombres de los iconos son los de Phosphor, salvo cinco de Tabler
 * (cerdo, leche, carne, semilla, satelite) y cuatro dibujados a mano porque
 * no existen en ninguna de las dos: la torre de perforacion, la oveja, el
 * panal y la regadera. Sus trazos viven en datos/iconos.json, que genera
 * scripts/extraerIconos.js.
 *
 * Se resuelve al normalizar y no en el navegador: la tarjeta recibe solo el
 * nombre del icono, y la carrera solo los trazos de los que usa.
 */

// Sin tildes ni mayusculas: la fuente escribe "Ingles" e "Inglés", "Etica" y
// "Ética", "Admón." y "Administración"
const normalizar = (nombre) =>
  nombre
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/** [expresion, icono]. La primera que encaja gana. */
export const REGLAS = [
  // --- Trabajo de grado, seminarios y actividades --------------------------
  [/seminario de contratos bancarios|instituciones financieras/, 'vault'],
  [/seminario de gerencia estrategica/, 'strategy'],
  [/seminario|proyecto de trabajo de grado|proyecto de investigacion/, 'notebook'],
  [/trabajo de grado|trab\. de grado|areas de grado/, 'graduation-cap'],
  [/pasantia de campo/, 'farm'],
  [/pasantia industrial/, 'factory'],
  [/pasantias tecnicas/, 'hard-hat'],
  [/pasantia/, 'briefcase'],
  [/servicio comunitario/, 'hand-heart'],
  [/deportiva/, 'sneaker-move'],
  [/extra-?academica/, 'mask-happy'],
  [/destrezas para el aprendizaje/, 'student'],
  [/tecnicas pedagogicas|capacitacion docente/, 'chalkboard-teacher'],
  [/metodologia de la investigacion|introduccion a la investigacion/, 'binoculars'],
  [/problemas y proyectos especiales/, 'puzzle-piece'],

  // --- Lengua y humanidades ---------------------------------------------------
  [/ingles/, 'translate'],
  [/comprension y expresion/, 'quotes'],
  [/informes tecnicos/, 'file-text'],
  [/expresion|redaccion/, 'pen-nib'],
  [/ortografia/, 'text-aa'],
  [/etimologia/, 'book-open-text'],
  [/literatura/, 'book-open'],
  [/historia de la cultura/, 'scroll'],
  [/filosofi/, 'lightbulb-filament'],
  [/derechos humanos/, 'person-arms-spread'],
  [/responsabilidad social/, 'hand-heart'],
  [/leyes y deontologia/, 'scales'],
  [/etica profesional y legislacion/, 'scroll'],
  [/\betica/, 'compass'],
  [/sexologia/, 'heart'],
  [/programacion neurolinguistica|psicolog|psicosociologia|inteligencia emocional/, 'brain'],
  [/problemas sociales|problematica del desarrollo/, 'flag'],
  [/sociologia urbana|desarrollo urbano/, 'city'],
  [/sociologia y desarrollo rural|desarrollo rural/, 'farm'],
  [/sociologia/, 'users-four'],
  [/antropologia/, 'campfire'],
  [/ciencias sociales|sociedad y ambiente/, 'users-three'],
  [/geografia/, 'globe-hemisphere-west'],

  // --- Grupos, liderazgo y personas ------------------------------------------
  [/dinamica de grupo/, 'users-three'],
  [/grupo y liderazgo|liderazgo/, 'flag-pennant'],
  [/direccion de reuniones/, 'presentation'],
  [/comunicacion industrial/, 'broadcast'],
  [/comunicacion/, 'chats'],
  [/comportamiento organizacional/, 'users-four'],
  [/ergonomia/, 'armchair'],
  [/problemas de personal/, 'user-focus'],
  [/relaciones laborales|cooperativismo|conflictos/, 'handshake'],
  [/gestion internacional/, 'globe-simple'],
  [/recursos humanos|rrhh|recursos humano/, 'identification-badge'],
  [/sueldos y salarios/, 'money'],
  [/seguridad social/, 'umbrella'],
  [/salud ocupacional/, 'first-aid'],
  [/procedimientos administrativos|proced\. administrativos/, 'files'],

  // --- Derecho --------------------------------------------------------------
  [/legislacion ambiental/, 'gavel'],
  [/derecho|legislacion/, 'gavel'],

  // --- Contabilidad, tributos y finanzas -------------------------------------
  [/costo/, 'tag'],
  [/contabilidad gerencial/, 'presentation-chart'],
  [/contabilidad gubernamental/, 'bank'],
  [/contabilidad computarizada/, 'desktop'],
  [/contabilidad|contabilidades|contaduria/, 'calculator'],
  [/auditoria ambiental/, 'clipboard-text'],
  [/audit\. de stmas|auditoria de sistemas/, 'shield-check'],
  [/auditoria/, 'magnifying-glass'],
  [/impuesto|tribut/, 'receipt'],
  [/ajuste por inflacion/, 'trend-up'],
  [/estados financieros/, 'chart-pie-slice'],
  [/presupuesto/, 'chart-pie'],
  [/matematicas financieras/, 'percent'],
  [/finanzas publicas|administracion publica/, 'bank'],
  [/moneda, banca/, 'vault'],
  [/finanzas corporativas/, 'chart-line-up'],
  [/administracion financiera|evaluacion economica|valoracion ambiental/, 'coins'],
  [/credito y desarrollo agricola/, 'hand-coins'],

  // --- Economia y mercado ----------------------------------------------------
  [/macroeconomia/, 'globe-simple'],
  [/microeconomia/, 'storefront'],
  [/economia y mercadeo agricola|comercial\. en la ind/, 'storefront'],
  [/mercadeo|mercadotecnia/, 'megaphone'],
  [/economi/, 'chart-line-up'],

  // --- Gestion y administracion ----------------------------------------------
  [/estrategi|planificacion estrategica/, 'strategy'],
  [/cuadro de mando/, 'speedometer'],
  [/control de proyectos/, 'kanban'],
  [/proyectos/, 'clipboard-text'],
  [/calidad y productividad|control de calidad/, 'seal-check'],
  [/planeacion y control de la produccion|planificacion administrativa/, 'calendar-check'],
  [/analisis de gestion/, 'presentation-chart'],
  [/control administrativo/, 'list-checks'],
  [/organizacion administrativa/, 'tree-structure'],
  [/logistica/, 'truck'],
  [/mantenimiento de sistemas de riego/, 'regadera'],
  [/mantenimiento/, 'wrench'],
  [/direccion de operaciones|tecnicas modernas/, 'gear-six'],
  [/optimizacion/, 'target'],
  [/administracion de la produccion/, 'factory'],
  [/empresas agricolas/, 'barn'],
  [/nuevos productos/, 'lightbulb'],
  [/consultoria/, 'flow-arrow'],
  [/serv\. de aliment|alimentos y bebidas/, 'fork-knife'],
  [/gestion empresarial|administracion de empresas|direccion administrativa/, 'buildings'],
  [/teoria administrativa|introd\. a la administracion/, 'briefcase'],
  [/decisiones/, 'arrows-split'],

  // --- Matematicas y estadistica ---------------------------------------------
  [/regresion|geoestadistica/, 'chart-scatter'],
  [/multivariante|mulrivariante/, 'intersect-three'],
  [/muestreo/, 'eyedropper-sample'],
  [/diseno de experimentos|diseno y analisis de experimentos|inferencia y diseno/, 'grid-nine'],
  [/superficie de respuesta|sistemas dinamicos/, 'wave-sine'],
  [/estadistic/, 'chart-bar'],
  [/estocastic/, 'dice-five'],
  [/teoria de colas/, 'queue'],
  [/sobrevivencia/, 'hourglass'],
  [/metodos cuantitativos/, 'math-operations'],
  [/metodos numericos/, 'calculator'],
  [/programacion no lineal|matematica aplicada/, 'function'],
  [/modelos de operaciones/, 'graph'],
  [/computacion y modelos/, 'cpu'],
  [/matematicas? iv\b/, 'infinity'],
  [/matematicas? iii\b/, 'sigma'],
  [/matematicas? ii\b/, 'function'],
  [/matematicas? i\b/, 'pi'],

  // --- Computacion y sistemas --------------------------------------------------
  [/base de datos/, 'database'],
  [/estructura de datos/, 'tree-structure'],
  [/orientada a objetos/, 'cube'],
  [/objet/, 'cube-transparent'],
  [/introduccion a la programacion/, 'terminal-window'],
  [/programacion|software/, 'code'],
  [/logica formal|algoritmos/, 'flow-arrow'],
  [/anal\. y diseno de stms/, 'flow-arrow'],
  [/sistemas de operacion/, 'cpu'],
  [/sistemas inteligentes/, 'robot'],
  [/simulacion/, 'cube-focus'],
  [/dinamica de sistemas/, 'arrows-clockwise'],
  [/control discreto/, 'wave-square'],
  [/espacios de estado/, 'sliders'],
  [/instrumentacion y control/, 'gauge'],
  [/sistemologia/, 'eye'],
  [/introduccion a la ingenieria de sistemas|seminario de ingenieria de sistemas/, 'graph'],
  [/teoria de sistemas|enfoque sistemico/, 'circles-three'],
  [/telematica/, 'network'],
  [/paquetes informaticos/, 'app-window'],
  [/informatica/, 'desktop'],
  [/circuitos|electronica/, 'circuitry'],
  [/electrotecnia/, 'lightning'],

  // --- Fisica, quimica y materiales ---------------------------------------------
  [/laboratorio (i )?de fisica/, 'magnet'],
  [/fisica de suelos|mecanica de suelos/, 'stack'],
  [/resistencia de materiales|mecanica de los materiales/, 'cube'],
  [/mecanica para ingenieros/, 'gear'],
  [/termodinamica/, 'thermometer-hot'],
  [/fisicoquimica/, 'thermometer-simple'],
  [/fenomenos de transporte/, 'waves'],
  [/fisica/, 'atom'],
  [/quimica organica/, 'hexagon'],
  [/bioquimica/, 'test-tube'],
  [
    /analisis quimico|quimica analitica|analisis de alimentos|calidad ambiental|suelo y agua/,
    'test-tube',
  ],
  [/quimica de suelos/, 'flask'],
  [/quimica/, 'flask'],
  [/toxicologia/, 'skull'],

  // --- Petroleo -----------------------------------------------------------------
  [/perforacion|ingenieria de petroleo/, 'torre'],
  [/registro de pozos/, 'chart-line'],
  [/prueba de pozos/, 'chart-line-down'],
  [/pozos horiz/, 'arrow-bend-down-right'],
  [/completacion/, 'wrench'],
  [/presiones anormales|gerencia de yacimientos/, 'gauge'],
  [/crudos pesados|hidrocarburos|petroleo y ambiente/, 'drop'],
  [/yacimientos/, 'stack'],
  [/propiedades de la roca|emulsiones/, 'drop-half'],
  [/gasotecnia|tratamiento de gas/, 'flame'],
  [/procesos de campo|bombas/, 'pipe'],
  [/sismica/, 'waveform'],
  [/hidrogeologia/, 'drop'],
  [/geologia/, 'mountains'],
  [/control de riesgos|riesgos ambientales/, 'shield-warning'],
  [/higiene y saneamiento/, 'hand-soap'],
  [/seguridad industrial|higiene y seguridad|seguridad, higiene/, 'hard-hat'],
  [/proteccion y seguridad/, 'shield-check'],

  // --- Agua, aire y territorio ----------------------------------------------------
  [/aguas residuales|tratamientos? de aguas|ingenieria sanitaria/, 'drop-half-bottom'],
  [/contaminacion de aguas/, 'drop-slash'],
  [/contaminacion atmosferica/, 'cloud-fog'],
  [/contaminacion de suelos|toxicos/, 'biohazard'],
  [/desechos solidos|residuos/, 'trash'],
  [/biorremediacion|sustentabilidad/, 'recycle'],
  [/\bpresas\b/, 'waves'],
  [/riego/, 'regadera'],
  [/hidraulica/, 'waves'],
  [/hidrologia/, 'cloud-rain'],
  [/agua potable/, 'drop'],
  [/fisioclimatologia/, 'thermometer'],
  [/climatologia/, 'cloud-sun'],
  [/atmosferic/, 'wind'],
  [/energias alternativas/, 'windmill'],
  [/teledeteccion/, 'satelite'],
  [/cartografia/, 'map-trifold'],
  [/informacion geografica/, 'map-pin'],
  [/ordenacion del territorio/, 'map-pin-area'],
  [/topografia y vialidad/, 'road-horizon'],
  [/topografia/, 'compass-rose'],
  [/dibujo y construcciones/, 'compass-tool'],
  [/dibujo/, 'pencil-ruler'],
  [/construcciones rurales/, 'house-line'],
  [/impacto ambiental/, 'footprints'],
  [/ecologia|ecosistemas/, 'tree'],
  [/recursos naturales|areas degradadas|silvicultura/, 'tree-evergreen'],
  [/flora y la fauna/, 'butterfly'],
  [/educacion ambiental|desarrollo agricola y ambiente/, 'plant'],
  [
    /sistemas ambientales|gestion ambiental|ing\. ambiental|extension ambiental/,
    'globe-hemisphere-west',
  ],

  // --- Campo: suelos, cultivos y plantas --------------------------------------------
  [/edafologia|agrologia/, 'stack'],
  [/conservacion de suelos/, 'shovel'],
  [/fertilidad|fertilizantes/, 'potted-plant'],
  [/maquinaria/, 'tractor'],
  [/extension rural/, 'megaphone-simple'],
  [/cafe y cacao/, 'coffee-bean'],
  [/cana de azucar|palma/, 'tree-palm'],
  [/cereales/, 'grains'],
  [/raices y tuberculos/, 'carrot'],
  [/hortalizas|post-?cosecha/, 'basket'],
  [/frutales/, 'orange'],
  [/textiles y oleaginosas/, 'flower'],
  [/semillas/, 'semilla'],
  [/forrajicultura/, 'plant'],
  [/malezas/, 'plant'],
  [/parques y jardines/, 'flower-tulip'],
  [/taxonomia/, 'flower-lotus'],
  [/botanica|anatomia vegetal/, 'leaf'],
  [/fitofisiologia/, 'sun'],
  [/fitopatologia/, 'virus'],
  [/fitomejoramiento|genetica|mejoramiento animal/, 'dna'],
  [/cultivo de tejidos/, 'test-tube'],
  [/especies/, 'plant'],
  [/politica y desarrollo agricola|introduccion a la agronomia/, 'plant'],

  // --- Animales ------------------------------------------------------------------------
  [/bovinos de leche|lactancia/, 'leche'],
  [/porcinos|no rumiantes/, 'cerdo'],
  [/bovinos|bufalos|rumiantes/, 'cow'],
  [/ovinos/, 'oveja'],
  [/\baves\b/, 'bird'],
  [/apicultura/, 'panal'],
  [/cunicultura/, 'rabbit'],
  [/piscicultura/, 'fish'],
  [/acuicultura/, 'shrimp'],
  [/entomologia/, 'bug-beetle'],
  [/ectoparasitos|parasitologia|zoologia/, 'bug'],
  [/inseminacion/, 'syringe'],
  [/sanidad animal/, 'stethoscope'],
  [/reproduccion/, 'egg-crack'],
  [/anatomia animal/, 'bone'],
  [/fisiologia/, 'heartbeat'],
  [/nutricion animal/, 'bowl-food'],
  [/zootecnia/, 'horse'],
  [/produccion animal/, 'paw-print'],

  // --- Alimentos -----------------------------------------------------------------------
  [/productos carnicos/, 'carne'],
  [/productos lacteos/, 'cheese'],
  [/alimentos acuicolas/, 'fish-simple'],
  [/alimentos vegetales/, 'avocado'],
  [/calidad proteinica/, 'egg'],
  [/evaluacion sensorial/, 'eye'],
  [/aditivos/, 'eyedropper'],
  [/empacado/, 'package'],
  [/fermentacion/, 'beer-bottle'],
  [/lab\. de procesos de conservacion/, 'jar'],
  [/conservacion de alimentos/, 'snowflake'],
  [/biodeterioro/, 'bug'],
  [/biotecnologia/, 'dna'],
  [/microbiologia/, 'virus'],
  [/biologia/, 'microscope'],
  [/ingenieria de alimentos|procesamiento de hidrocarburos/, 'factory'],
  [/tecnologia de alimentos/, 'cooking-pot'],
  [/alimentos y sociedad/, 'bowl-food'],
  [/nutricion humana/, 'heartbeat'],
]

const cache = new Map()

/** El icono de una materia, o null si ninguna regla la reconoce */
export function iconoDe(nombre) {
  if (cache.has(nombre)) return cache.get(nombre)
  const n = normalizar(nombre)
  const icono = REGLAS.find(([expresion]) => expresion.test(n))?.[1] ?? null
  cache.set(nombre, icono)
  return icono
}

/** Todos los iconos que pueden salir, para extraer solo esos */
export const ICONOS_USADOS = [...new Set(REGLAS.map(([, icono]) => icono))].sort()
