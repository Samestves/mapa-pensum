import { useState } from 'react'
import {
  Activity,
  BookOpen,
  CalendarDays,
  Clock,
  Download,
  LayoutGrid,
  Smartphone,
  SquareCheckBig,
  TriangleAlert,
  UserPlus,
  Users,
} from 'lucide-react'
import { CARRERAS } from '../../data/carreras'
import { Vacio, Widget } from './piezas'
import { Anillo, Area, Barras, Cambio, Chispa, Columnas } from './graficas'
import {
  DIAS_LARGOS,
  DIAS_SEMANA,
  VERDE,
  diaLargo,
  haceCuanto,
  hora,
  mesLargo,
  tinte,
  variacion,
} from './formato'

const NOMBRE_VISTA = { mapa: 'Mapa', lista: 'Lista', horario: 'Horario' }
const TRAMOS = {
  '0-1': 'Menos de 1 min',
  '1-3': '1 a 3 min',
  '3-10': '3 a 10 min',
  '10+': 'Más de 10 min',
}

/* Lo que se puede dibujar en la grafica grande: que es y como se dice */
const MEDIDAS = {
  activos: { nombre: 'Aparatos', unidad: 'aparatos distintos' },
  visitas: { nombre: 'Visitas', unidad: 'visitas' },
  nuevos: { nombre: 'Nuevos', unidad: 'aparatos nuevos' },
}

/* Pasado un dia sin un solo latido, el silencio ya no es una noche tranquila */
const SIN_LATIDOS_MS = 24 * 60 * 60 * 1000

const porcentaje = (parte, todo) => (todo ? Math.round((parte / todo) * 100) : 0)

/**
 * Lo primero: como va la cosa. Una grafica grande de los ultimos 30 dias que
 * se lee dia a dia con el dedo, y un selector para ver aparatos, visitas o
 * nuevos. El total de aparatos es el de distintos en los 30 dias -no la
 * suma de cada dia, que contaria tres veces a quien entra tres dias-.
 */
function Actividad({ datos }) {
  const [medida, setMedida] = useState('activos')
  const [leido, setLeido] = useState(null)
  const { dias, activos } = datos
  const { unidad } = MEDIDAS[medida]
  const dia = leido != null ? dias[leido] : null
  const total = medida === 'activos' ? activos.treinta : dias.reduce((s, d) => s + d[medida], 0)

  return (
    <Widget
      icono={Users}
      titulo="Actividad"
      className="ocupa-4 alto"
      extra={
        <span className="medidas" role="group" aria-label="Qué se dibuja">
          {Object.entries(MEDIDAS).map(([clave, { nombre }]) => (
            <button
              key={clave}
              type="button"
              aria-pressed={medida === clave}
              onClick={() => setMedida(clave)}
            >
              {nombre}
            </button>
          ))}
        </span>
      }
    >
      <p className="lectura" aria-live="polite">
        {dia ? (
          <>
            <b className="tabular-nums">{dia[medida].toLocaleString('es-VE')}</b>
            <span>
              {unidad} · {diaLargo(dia.fecha)}
            </span>
          </>
        ) : (
          <>
            <b className="tabular-nums">{total.toLocaleString('es-VE')}</b>
            <span>{unidad} en 30 días</span>
            {medida === 'activos' && (
              <span className="flex items-center gap-2">
                <Cambio valor={variacion(activos.mes, activos.mesAnterior)} />
                {mesLargo(datos.mes)} frente a {mesLargo(datos.mesAnterior)}
              </span>
            )}
          </>
        )}
      </p>
      <div className="mt-auto pt-4">
        <Area puntos={dias} campo={medida} alto={210} alLeer={setLeido} />
      </div>
    </Widget>
  )
}

/**
 * Si el contador esta guardando, de un vistazo. El aviso largo, con lo que
 * contesto Redis y donde se arregla, va arriba del panel (ver AvisoSalud).
 */
function Contador({ salud }) {
  const callado =
    salud?.ultimoLatido && Date.now() - new Date(salud.ultimoLatido).getTime() > SIN_LATIDOS_MS
  const mal = salud && (!salud.escribe || callado)
  const estado = !salud
    ? 'Sin datos'
    : !salud.escribe
      ? 'Sin guardar'
      : callado
        ? 'Callado'
        : salud.ultimoLatido
          ? 'Guardando'
          : 'Esperando'

  return (
    <Widget
      icono={mal ? TriangleAlert : Activity}
      titulo="Contador"
      className="widget-contador"
      data-mal={mal || undefined}
      extra={<span className="luz-contador" aria-hidden="true" />}
    >
      <p className="cifra-grande" style={{ fontSize: 24, letterSpacing: '-0.015em' }}>
        {estado}
      </p>
      <p className="widget-nota">
        {salud?.ultimoLatido
          ? `Último latido ${haceCuanto(salud.ultimoLatido)}`
          : 'Todavía no ha llegado ningún latido'}
      </p>
    </Widget>
  )
}

/**
 * El reloj de la semana: una fila por dia y una columna por hora, teñidas por
 * cuantas visitas hubo. Arriba, dicho en palabras, cuando es la hora pico;
 * tocar una celda la pone ahi con su numero.
 */
function Reloj({ reloj }) {
  const [celda, setCelda] = useState(null)
  const plano = reloj.flat()
  const techo = Math.max(...plano, 1)
  const suma = plano.reduce((s, n) => s + n, 0)

  if (!suma) {
    return (
      <p className="widget-nota">Todavía no hay visitas suficientes para ver un patrón de horas.</p>
    )
  }

  const pico = plano.indexOf(techo)
  const porDia = reloj.map((fila) => fila.reduce((s, n) => s + n, 0))
  const diaFuerte = porDia.indexOf(Math.max(...porDia))
  const mostrada = celda ?? { d: Math.floor(pico / 24), h: pico % 24 }
  const n = reloj[mostrada.d][mostrada.h]

  return (
    <div className="mt-3 flex flex-col gap-3">
      <p className="text-[12.5px] leading-snug">
        <span className="text-tinta">
          {celda ? '' : 'Hora pico: '}
          <span className={celda ? 'capitalize' : ''}>{DIAS_LARGOS[mostrada.d]}</span> a las{' '}
          {hora(mostrada.h)}
        </span>
        <span className="text-tinta-tenue">
          {' '}
          · {n} {n === 1 ? 'visita' : 'visitas'} · el día más fuerte es el {DIAS_LARGOS[diaFuerte]}
        </span>
      </p>

      <div className="desplazable-limpio overflow-x-auto" onPointerLeave={() => setCelda(null)}>
        <div className="min-w-[460px]">
          {reloj.map((fila, d) => (
            <div key={d} className="grid grid-cols-[30px_repeat(24,1fr)] gap-[3px] py-[1.5px]">
              <span className="flex items-center text-[10.5px] text-tinta-tenue">
                {DIAS_SEMANA[d]}
              </span>
              {fila.map((veces, h) => {
                const activa = mostrada.d === d && mostrada.h === h
                return (
                  <button
                    key={h}
                    type="button"
                    aria-label={`${DIAS_SEMANA[d]} ${hora(h)}: ${veces}`}
                    onPointerEnter={() => setCelda({ d, h })}
                    onClick={() => setCelda({ d, h })}
                    className="aspect-square rounded-[4px] outline-none"
                    style={{
                      backgroundColor: veces
                        ? tinte(VERDE, 0.14 + (veces / techo) * 0.8)
                        : 'color-mix(in oklab, var(--tinta) 6%, transparent)',
                      boxShadow: activa
                        ? '0 0 0 2px var(--panel), 0 0 0 3.5px var(--tinta)'
                        : undefined,
                    }}
                  />
                )
              })}
            </div>
          ))}
          <div className="grid grid-cols-[30px_repeat(24,1fr)] gap-[3px] pt-1 text-[10px] text-tinta-tenue tabular-nums">
            <span />
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} className="whitespace-nowrap">
                {h % 6 === 0 ? `${h} h` : ''}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PanelGeneral({ datos, colorDe, alAbrirCarrera }) {
  const { activos, dias, horarios } = datos
  const suma = (campo) => dias.reduce((s, d) => s + d[campo], 0)
  const visitas = suma('visitas')

  if (visitas === 0 && activos.treinta === 0) {
    return (
      <Vacio>
        Todavía no hay visitas registradas en estos 30 días. Solo cuenta lo que pasa en la web
        publicada: lo que hagas en tu computadora mientras desarrollas no entra.
      </Vacio>
    )
  }

  const telefono = datos.aparato?.movil ?? 0
  const computadora = datos.aparato?.escritorio ?? 0
  const vistas = Object.entries(NOMBRE_VISTA).map(([clave, nombre]) => [
    nombre,
    datos.vistas?.[clave] ?? 0,
  ])
  const todasLasVistas = vistas.reduce((s, [, n]) => s + n, 0)
  const carreras = CARRERAS.map((c) => ({ c, d: datos.carreras?.[c.slug] }))
    .filter(({ d }) => d?.mes)
    .sort((a, b) => b.d.mes - a.d.mes)
    .slice(0, 5)
  const creados = dias.map((d, i) => ({ fecha: d.fecha, creados: horarios?.porDia?.[i] ?? 0 }))

  return (
    <div className="bento">
      <Actividad datos={datos} />
      <Contador salud={datos.salud} />

      <Widget icono={Activity} titulo="Hoy">
        <p className="cifra-grande tabular-nums">
          {activos.hoy}
          <small>activos</small>
        </p>
        <div className="mt-3">
          <Chispa valores={dias.slice(-14).map((d) => d.activos)} />
        </div>
      </Widget>

      <Widget icono={UserPlus} titulo="Nuevos">
        <p className="cifra-grande tabular-nums">{suma('nuevos').toLocaleString('es-VE')}</p>
        <p className="widget-nota">aparatos que entraban por primera vez</p>
      </Widget>

      <Widget icono={Smartphone} titulo="Teléfono">
        <div className="mx-auto mt-3">
          <Anillo valor={porcentaje(telefono, telefono + computadora)} />
        </div>
        <p className="widget-nota text-center">
          {porcentaje(computadora, telefono + computadora)}% desde computadora
        </p>
      </Widget>

      <Widget
        icono={BookOpen}
        titulo="Carreras"
        className="ocupa-3"
        extra={`aperturas en ${mesLargo(datos.mes)}`}
      >
        <div className="mt-4">
          {carreras.length ? (
            <Barras
              filas={carreras.map(({ c, d }) => ({
                clave: c.slug,
                nombre: c.nombreCorto,
                valor: d.mes,
                color: colorDe(c),
                cambio: variacion(d.mes, d.mesAnterior),
              }))}
              alElegir={alAbrirCarrera}
            />
          ) : (
            <p className="widget-nota">Nadie ha abierto una carrera este mes todavía.</p>
          )}
        </div>
      </Widget>

      <Widget icono={Clock} titulo="Cuándo entran" className="ocupa-3" extra="hora de Venezuela">
        <Reloj reloj={datos.reloj ?? []} />
      </Widget>

      <Widget
        icono={LayoutGrid}
        titulo="Qué usan"
        className="ocupa-3"
        extra={`visitas de ${mesLargo(datos.mes)}`}
      >
        <div className="anillos">
          {vistas.map(([nombre, n]) => (
            <div key={nombre}>
              <Anillo valor={porcentaje(n, todasLasVistas)} tam={76} />
              {nombre}
            </div>
          ))}
        </div>
      </Widget>

      <Widget icono={Clock} titulo="Cuánto se quedan" className="ocupa-3">
        <p className="widget-nota">Muchas de menos de un minuto suele ser gente que solo miraba.</p>
        <div className="mt-4">
          <Barras
            porcentaje
            filas={Object.entries(TRAMOS).map(([clave, nombre]) => ({
              clave,
              nombre,
              valor: datos.duracion?.[clave] ?? 0,
            }))}
          />
        </div>
      </Widget>

      {horarios && (
        <Widget
          icono={CalendarDays}
          titulo="Horarios creados"
          className="ocupa-4"
          extra={`${horarios.hechos} hechos · ${porcentaje(horarios.foto, horarios.foto + horarios.mano)}% desde una foto`}
        >
          <div className="mt-3">
            <Columnas puntos={creados} campo="creados" nombre="creados" alto={90} />
          </div>
        </Widget>
      )}

      <Widget icono={SquareCheckBig} titulo="Materias marcadas">
        <p className="cifra-grande tabular-nums">
          {(datos.acciones?.marcas ?? 0).toLocaleString('es-VE')}
        </p>
        <p className="widget-nota">
          en {datos.acciones?.['visitas-con-marcas'] ?? 0} visitas de {mesLargo(datos.mes)}
        </p>
      </Widget>

      <Widget icono={Download} titulo="Con la app">
        <p className="cifra-grande tabular-nums">
          {porcentaje(suma('pwa'), visitas)}
          <small>%</small>
        </p>
        <p className="widget-nota">de las visitas, desde la app instalada</p>
      </Widget>
    </div>
  )
}
