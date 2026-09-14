import { useMemo } from 'react'
import { Check } from 'lucide-react'
import { SITUACION } from '../layout/situacion'

/* En este orden: lo que viniste a buscar primero. Inscribible y proximo son
   la respuesta a "que meto el semestre que viene"; cursando y aprobadas son
   contexto. */
const ORDEN = [
  { situacion: SITUACION.INSCRIBIBLE, texto: 'Inscribibles', corto: 'Inscribir', titulo: 'Puedes inscribirlas ya: tienes aprobadas todas sus prelaciones' },
  { situacion: SITUACION.PROXIMA, texto: 'Próximo semestre', corto: 'Próximo', titulo: 'Se abren si apruebas lo que estás cursando' },
  { situacion: SITUACION.CURSANDO, texto: 'Cursando', corto: 'Cursando', titulo: 'Las marcaste como en curso' },
  { situacion: SITUACION.HECHA, texto: 'Aprobadas', corto: 'Hechas', titulo: 'Las marcaste como aprobadas' },
]

/** La muestra de color de cada situacion, igual que en la tarjeta */
function Muestra({ situacion }) {
  if (situacion === SITUACION.HECHA) {
    return (
      <span className="grid size-3.5 place-items-center rounded-full bg-aprobada text-[var(--nodo)]">
        <Check size={9} strokeWidth={3.6} />
      </span>
    )
  }
  const estilo = {
    [SITUACION.INSCRIBIBLE]: { background: 'var(--tinta)' },
    [SITUACION.PROXIMA]: { boxShadow: 'inset 0 0 0 1.5px color-mix(in oklab, var(--tinta) 45%, transparent)' },
    [SITUACION.CURSANDO]: { background: 'var(--estado-cursando)' },
  }[situacion]
  return <span className="size-3 rounded-full" style={estilo} />
}

/**
 * Leyenda y resumen a la vez.
 *
 * Una leyenda que solo explica colores se lee una vez y luego estorba. Esta
 * ademas CUENTA, y el primer numero es justo la respuesta a la pregunta con
 * la que se abre el mapa antes de inscribir: cuantas materias puedo meter.
 *
 * Cuenta materias del pensum -obligatorias y electivas ya colocadas en su
 * casilla-, no el catalogo de electivas de abajo. Ahi hay treinta y tantas
 * opciones sin requisitos, y contarlas daria "41 inscribibles" a alguien que
 * no puede cursar ni la mitad: el numero seria verdad y no serviria de nada.
 */
function LeyendaMapa({ situaciones, nodos, enCasilla }) {
  const cuenta = useMemo(() => {
    const c = {}
    for (const nodo of nodos) {
      const materia = nodo.esHueco ? enCasilla(nodo.codigo) : nodo
      if (!materia) continue
      const s = situaciones.get(materia.codigo)
      c[s] = (c[s] ?? 0) + 1
    }
    return c
  }, [situaciones, nodos, enCasilla])

  return (
    /* Dos capas y no una, por una trampa de especificidad: .panel-cristal
       declara position: relative fuera de las capas de Tailwind, asi que le
       gana a la clase absolute puesta en el mismo elemento. Con las dos
       juntas la leyenda caia al flujo, debajo del lienzo, y no se veia.

       Tampoco se atenua con el reposo, como el dock del zoom. Los botones de
       zoom se buscan cuando hacen falta; la leyenda es la respuesta a lo que
       uno viene a mirar, y apagarla a los dos segundos es esconderla justo
       mientras se lee el mapa. */
    /* En el telefono baja un poco: arriba al centro cuelga el boton que pliega
       la barra, y a la altura de siempre la leyenda se le montaba encima.
       Y las etiquetas se acortan en vez de dejar que la pastilla se desplace:
       una leyenda que hay que arrastrar para leer entera ya no es un vistazo. */
    <div className="pointer-events-none absolute top-9 left-3 z-20 max-w-[calc(100%-1.5rem)] sm:top-4 sm:left-4">
      <div className="panel-cristal pointer-events-auto flex items-center gap-2.5 overflow-x-auto rounded-full py-2 pr-3.5 pl-2.5 text-[10.5px] leading-none whitespace-nowrap [scrollbar-width:none] sm:gap-3.5 sm:pr-4 sm:pl-3 sm:text-[11px]">
        {ORDEN.map(({ situacion, texto, corto, titulo }) => (
          <span key={situacion} title={titulo} className="flex shrink-0 items-center gap-1.5">
            <Muestra situacion={situacion} />
            <span className="font-semibold text-tinta tabular-nums">{cuenta[situacion] ?? 0}</span>
            <span className="text-tinta-tenue sm:hidden">{corto}</span>
            <span className="hidden text-tinta-tenue sm:inline">{texto}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export default LeyendaMapa
