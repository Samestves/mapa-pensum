import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { CARRERAS } from '../../data/carreras'
import { Bloque, Cifra, Muestra, Reparto, Serie, Tarjeta, Vacio } from './piezas'
import {
  DIAS_LARGOS,
  DIAS_SEMANA,
  VERDE,
  diaCorto,
  hora,
  mesLargo,
  tinte,
  variacion,
} from './formato'

const NOMBRE_VISTA = { mapa: 'Mapa', lista: 'Lista', horario: 'Horario' }
const NOMBRE_APARATO = { movil: 'Teléfono', escritorio: 'Computadora' }
const TRAMOS = {
  '0-1': 'Menos de 1 min',
  '1-3': '1 a 3 min',
  '3-10': '3 a 10 min',
  '10+': 'Más de 10 min',
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

  if (!suma) return <Vacio>Todavía no hay visitas suficientes para ver un patrón de horas.</Vacio>

  const pico = plano.indexOf(techo)
  const porDia = reloj.map((fila) => fila.reduce((s, n) => s + n, 0))
  const porHora = Array.from({ length: 24 }, (_, h) => reloj.reduce((s, fila) => s + fila[h], 0))
  const diaFuerte = porDia.indexOf(Math.max(...porDia))
  const techoHora = Math.max(...porHora, 1)
  const mostrada = celda ?? { d: Math.floor(pico / 24), h: pico % 24 }
  const n = reloj[mostrada.d][mostrada.h]

  return (
    <Tarjeta className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-[12.5px]">
        <p className="text-tinta">
          {celda ? '' : 'Hora pico: '}
          <span className={celda ? 'capitalize' : ''}>{DIAS_LARGOS[mostrada.d]}</span> a las{' '}
          {hora(mostrada.h)}
          <span className="text-tinta-tenue">
            {' '}
            · {n} {n === 1 ? 'visita' : 'visitas'} · {Math.round((n / suma) * 100)}% del total
          </span>
        </p>
        <p className="text-tinta-tenue">El día más fuerte es el {DIAS_LARGOS[diaFuerte]}</p>
      </div>

      <div className="overflow-x-auto" onPointerLeave={() => setCelda(null)}>
        <div className="min-w-[540px]">
          {reloj.map((fila, d) => (
            <div
              key={d}
              className="grid grid-cols-[34px_repeat(24,1fr)_44px] items-center gap-[2px] py-[1px]"
            >
              <span className="text-[10.5px] text-tinta-tenue">{DIAS_SEMANA[d]}</span>
              {fila.map((veces, h) => {
                const activa = mostrada.d === d && mostrada.h === h
                return (
                  <button
                    key={h}
                    type="button"
                    aria-label={`${DIAS_SEMANA[d]} ${hora(h)}: ${veces}`}
                    onPointerEnter={() => setCelda({ d, h })}
                    onClick={() => setCelda({ d, h })}
                    className="h-[18px] rounded-[4px] outline-none"
                    style={{
                      backgroundColor: veces
                        ? tinte(VERDE, 0.14 + (veces / techo) * 0.76)
                        : 'color-mix(in oklab, var(--tinta) 5%, transparent)',
                      boxShadow: activa ? '0 0 0 1.5px var(--tinta)' : undefined,
                    }}
                  />
                )
              })}
              <span className="pl-1.5 text-right text-[10.5px] text-tinta-tenue tabular-nums">
                {porDia[d]}
              </span>
            </div>
          ))}
          {/* Cuanto pesa cada hora sumando toda la semana */}
          <div className="mt-1 grid grid-cols-[34px_repeat(24,1fr)_44px] items-end gap-[2px]">
            <span />
            {porHora.map((veces, h) => (
              <span key={h} className="flex h-5 items-end">
                <span
                  className="w-full rounded-t-[2px] bg-[color-mix(in_oklab,var(--tinta)_22%,transparent)]"
                  style={{ height: `${(veces / techoHora) * 100}%` }}
                />
              </span>
            ))}
            <span />
          </div>
          <div className="grid grid-cols-[34px_repeat(24,1fr)_44px] gap-[2px] text-[9.5px] text-tinta-tenue tabular-nums">
            <span />
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} className="text-center">
                {h % 6 === 0 ? String(h).padStart(2, '0') : ''}
              </span>
            ))}
            <span />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-panel-borde pt-2.5 text-[11px] text-tinta-tenue">
        menos
        <span
          className="h-2 w-24 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${tinte(VERDE, 0.14)}, ${tinte(VERDE, 0.9)})`,
          }}
        />
        más
        <span className="ml-auto">hora de Venezuela · últimos 30 días</span>
      </div>
    </Tarjeta>
  )
}

/**
 * Todas las carreras, de la mas usada a la que nadie ha abierto todavia.
 * Cada fila lleva a la pestaña de esa carrera.
 */
function Carreras({ carreras, mes, mesAnterior, colorDe, alAbrir }) {
  const filas = CARRERAS.map((c) => ({ ...c, datos: carreras?.[c.slug] ?? {} })).sort(
    (a, b) =>
      (b.datos.mes ?? 0) - (a.datos.mes ?? 0) || (b.datos.aparatos ?? 0) - (a.datos.aparatos ?? 0),
  )
  const mayor = Math.max(...filas.map((c) => c.datos.mes ?? 0), 1)

  return (
    <Tarjeta className="flex flex-col p-1.5">
      {filas.map((c) => {
        const color = colorDe(c)
        const { mes: aperturas = 0, mesAnterior: antes = 0, aparatos = 0 } = c.datos
        const cambio = variacion(aperturas, antes)
        return (
          <button
            key={c.slug}
            type="button"
            onClick={() => alAbrir(c.slug)}
            className="group flex flex-col gap-1.5 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-panel-suave"
            style={{ opacity: aperturas || aparatos ? 1 : 0.5 }}
          >
            <div className="flex w-full items-center gap-2.5 text-[13px]">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              <span className="min-w-0 flex-1 truncate text-tinta">{c.nombreCorto}</span>
              <span className="shrink-0 text-[11.5px] text-tinta-tenue tabular-nums">
                {aparatos} {aparatos === 1 ? 'aparato' : 'aparatos'}
              </span>
              <span className="w-[74px] shrink-0 text-right text-tinta tabular-nums">
                {aperturas}
                {cambio != null && (
                  <span
                    className="ml-1.5 text-[11px]"
                    style={{ color: cambio >= 0 ? VERDE : 'var(--estado-rojo)' }}
                  >
                    {cambio > 0 ? '+' : ''}
                    {cambio}%
                  </span>
                )}
              </span>
              <ChevronRight
                size={14}
                className="shrink-0 text-tinta-tenue transition-transform group-hover:translate-x-0.5"
              />
            </div>
            <div className="ml-[18px] mr-[22px] h-[3px] overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--tinta)_8%,transparent)]">
              <span
                className="riel-tramo block h-full rounded-full"
                style={{ width: `${(aperturas / mayor) * 100}%`, backgroundColor: color }}
              />
            </div>
          </button>
        )
      })}
      <p className="px-2.5 pt-1 pb-1.5 text-[11px] leading-snug text-tinta-tenue">
        El número es cuántas veces se abrió en {mesLargo(mes)}, comparado con{' '}
        {mesLargo(mesAnterior)}. Los aparatos son los distintos de los últimos 30 días.
      </p>
    </Tarjeta>
  )
}

export default function PanelGeneral({ datos, colorDe, alAbrirCarrera }) {
  const { activos, dias } = datos
  const suma = (campo) => dias.reduce((s, d) => s + d[campo], 0)
  const visitas = suma('visitas')
  const nuevos = suma('nuevos')

  if (visitas === 0 && activos.treinta === 0) {
    return (
      <Vacio>
        Todavía no hay visitas registradas. La cuenta empezó el{' '}
        {datos.desde ? diaCorto(datos.desde) : 'día del despliegue'}, y solo cuenta lo que pasa en
        la web publicada: lo que hagas en tu computadora mientras desarrollas no entra.
      </Vacio>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Cifra valor={activos.hoy} rotulo="Hoy" nota="aparatos distintos, el día va en curso" />
        <Cifra valor={activos.siete} rotulo="7 días" nota="aparatos distintos" />
        <Cifra valor={activos.treinta} rotulo="30 días" nota="aparatos distintos" />
        <Cifra
          valor={activos.mes}
          rotulo={`En ${mesLargo(datos.mes)}`}
          nota={`${activos.mesAnterior} en ${mesLargo(datos.mesAnterior)}`}
          cambio={variacion(activos.mes, activos.mesAnterior)}
        />
      </section>

      <Bloque
        titulo="Día a día"
        explica="Aparatos distintos cada día y, detrás, las visitas. Toca un día para ver su detalle."
      >
        <Serie
          puntos={dias}
          principal="activos"
          fondo="visitas"
          detalle={(d) => (
            <span className="flex flex-wrap gap-x-3">
              <span>
                <span className="text-tinta">{d.activos}</span> aparatos
              </span>
              <span>{d.visitas} visitas</span>
              <span>{d.nuevos} nuevos</span>
              {d.pwa > 0 && <span>{d.pwa} con la app</span>}
            </span>
          )}
        />
        <div className="flex gap-4 px-1 text-[11px] text-tinta-tenue">
          <Muestra color={VERDE}>aparatos distintos</Muestra>
          <Muestra color="color-mix(in oklab, var(--tinta) 20%, transparent)">visitas</Muestra>
          <span className="ml-auto">la raya es la media</span>
        </div>
      </Bloque>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Cifra valor={visitas} rotulo="Visitas" nota="veces que se abrió, en 30 días" />
        <Cifra valor={nuevos} rotulo="Nuevos" nota="aparatos que entraban por primera vez" />
        <Cifra
          valor={`${visitas ? Math.round((suma('pwa') / visitas) * 100) : 0}%`}
          rotulo="Con la app"
          nota="visitas desde la app instalada"
        />
        <Cifra
          valor={datos.acciones?.marcas ?? 0}
          rotulo="Materias marcadas"
          nota={`en ${datos.acciones?.['visitas-con-marcas'] ?? 0} visitas de ${mesLargo(datos.mes)}`}
        />
      </section>

      <Bloque titulo="Carreras" explica="Toca una para ver su detalle y su mapa de calor.">
        <Carreras
          carreras={datos.carreras}
          mes={datos.mes}
          mesAnterior={datos.mesAnterior}
          colorDe={colorDe}
          alAbrir={alAbrirCarrera}
        />
      </Bloque>

      <div className="grid gap-8 sm:grid-cols-2">
        <Bloque
          titulo="Qué parte usan"
          explica={`Visitas de ${mesLargo(datos.mes)} que abrieron cada vista.`}
        >
          <Reparto datos={datos.vistas} nombres={NOMBRE_VISTA} />
        </Bloque>
        <Bloque titulo="Desde qué aparato" explica={`Visitas de ${mesLargo(datos.mes)}.`}>
          <Reparto datos={datos.aparato} nombres={NOMBRE_APARATO} />
        </Bloque>
      </div>

      <Bloque
        titulo="Cuánto se quedan"
        explica="Duración de cada visita. Muchas de menos de un minuto suele ser gente que solo miraba."
      >
        <Reparto datos={datos.duracion} nombres={TRAMOS} orden={Object.keys(TRAMOS)} />
      </Bloque>

      <Bloque titulo="A qué hora entran" explica="Cada cuadro es una hora de un día de la semana.">
        <Reloj reloj={datos.reloj ?? []} />
      </Bloque>
    </div>
  )
}
