import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { planificar } from '../layout/planificador.js'
import { LIMITES_CARGA } from './cargaPlan.js'
import { ESTADO } from './estados.js'
import { ALTO_MAXIMO, ENCOGER_MINIMO, disponerRuta } from './exportarPlan.js'

/* Lo que promete la imagen de la ruta, comprobado con los pensums de verdad:
   que una carrera entera se lee en una captura de pantalla. El dibujo
   necesita un canvas, pero donde va cada cosa es aritmetica, y es lo que se
   puede romper sin que nadie lo note hasta el dia que alguien comparte una
   ruta larga. */

const CARPETA = new URL('./carreras/', import.meta.url)
const carreras = existsSync(CARPETA)
  ? readdirSync(CARPETA)
      .filter((f) => f.endsWith('.json') && f !== 'indice.json')
      .map((f) => JSON.parse(readFileSync(new URL(f, CARPETA), 'utf8')))
  : []
const sinDatos = carreras.length === 0 && 'faltan los pensums: npm run datos'

/* Cuantas lineas ocupa un nombre en la lista del proximo semestre. Sin la
   letra no se puede medir: a 13,5 px caben unos cuarenta caracteres, y aqui
   se cuenta por lo bajo para que la prueba sea la mas exigente. */
const lineas = (nombre) => (nombre.length > 36 ? 2 : 1)

const disponer = (plan) =>
  disponerRuta(plan.semestres, {
    lineasCabecera: 2,
    lineasProximo: plan.semestres[0].materias.map((a) => lineas(a.nombre)),
  })

const planDe = (carrera, marcas, carga) =>
  planificar({
    asignaturas: carrera.asignaturas,
    grupos: carrera.grupos,
    marcas,
    elegidas: {},
    carga,
  })

const CARGAS = [
  ...[4, 8, 12, 16, 20, 24, 28].map((valor) => ({ unidad: 'uc', valor })),
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((valor) => ({ unidad: 'materias', valor })),
]

test(
  'un nuevo ingreso con la carga normal ve su carrera entera, con nombres',
  { skip: sinDatos },
  () => {
    const carga = { unidad: 'uc', valor: LIMITES_CARGA.uc.porDefecto }
    for (const carrera of carreras) {
      const d = disponer(planDe(carrera, {}, carga))
      assert.ok(d.formato.filas, `${carrera.slug}: los semestres salen sin nombres`)
      assert.ok(d.encoger >= ENCOGER_MINIMO, `${carrera.slug}: encoge a ${d.encoger.toFixed(2)}`)
    }
  },
)

test('con cualquier carga la imagen cabe, se lee y nada se pisa', { skip: sinDatos }, () => {
  for (const carrera of carreras) {
    const primero = Object.fromEntries(
      carrera.asignaturas
        .filter((a) => a.semestre === 1 && !a.esHueco)
        .map((a) => [a.codigo, ESTADO.APROBADA]),
    )
    for (const marcas of [{}, primero]) {
      for (const carga of CARGAS) {
        const d = disponer(planDe(carrera, marcas, carga))
        const donde = `${carrera.slug} con ${carga.valor} ${carga.unidad}`
        assert.ok(d.alto * d.encoger <= ALTO_MAXIMO, `${donde}: pasa del alto maximo`)
        // Encoger es el ultimo recurso: mas de un 15 % y la letra ya no se lee
        assert.ok(d.encoger >= 0.85, `${donde}: encoge a ${d.encoger.toFixed(2)}`)
        assert.ok(d.firma >= d.tarjeta.y + d.tarjeta.alto, `${donde}: la firma pisa el camino`)
      }
    }
  }
})

test('cada semestre del camino tiene su sitio, en orden y sin pisarse', () => {
  const semestre = (numero, materias) => ({
    numero,
    uc: materias * 3,
    materias: Array.from({ length: materias }, (_, i) => ({
      codigo: `${numero}-${i}`,
      nombre: `Materia ${i}`,
    })),
  })
  for (const cuantos of [1, 2, 5, 10, 14, 24, 45]) {
    const semestres = Array.from({ length: cuantos }, (_, i) => semestre(i + 1, i ? 3 : 5))
    const d = disponerRuta(semestres)
    assert.equal(d.filas.length, cuantos - 1)
    assert.equal(d.materias.length, 5)
    if (d.formato.filas) {
      const ys = d.filas.map((f) => f.y)
      assert.ok(
        ys.every((y, i) => i === 0 || y - ys[i - 1] >= d.formato.filas),
        `${cuantos} semestres: filas encimadas`,
      )
    }
    const ultima = Math.max(d.materias.at(-1), ...d.filas.map((f) => f.y))
    assert.ok(ultima < d.meta, `${cuantos} semestres: el grado no va al final`)
  }
})
