import { memo } from 'react'
import { NODO, TEXTO } from '../layout/constantes'
import { etiquetaArea } from '../theme/areas'
import { pielDe } from '../theme/superficie'
import { iconoDeMateria } from '../theme/iconosMateria'
import { codigoVisible } from '../data/codigoVisible'
import CaraNodo from './CaraNodo'

/**
 * Una materia en el mapa.
 *
 * La tarjeta no tiene contorno: el estado se lee en el color de la superficie,
 * y de donde sale ese color lo explica theme/superficie.js.
 *
 * Lo que hay dentro, y por que hay tan poco:
 *
 *   NOMBRE arriba y a todo el ancho. Es lo unico que alguien busca cuando
 *   recorre el mapa, asi que va primero y se lleva el peso tipografico.
 *
 *   CODIGO Y UC abajo, en una linea. El codigo iba antes por delante del
 *   nombre, y es un dato de consulta: nadie escanea un pensum buscando el
 *   0081814.
 *
 *   UN ICONO abajo a la derecha. El de la materia, deducido de su nombre, o un
 *   candado si esta bloqueada. Uno u otro, nunca los dos: dos glifos en una
 *   tarjeta de 224 px es ruido.
 *
 * Fuera se quedo la etiqueta del area, que repetia en 9,5 px lo que el color
 * ya decia y solo se leia con la nariz pegada a la pantalla.
 */
function NodoAsignatura({
  nodo,
  estado,
  resaltado,
  atenuado,
  seleccionado,
  destellando,
  claveDestello,
  tocado,
  claveToque,
  alVerFicha,
  alSenalar,
  alDejarDeSenalar,
}) {
  const { x, y, nombre, uc, lineasNombre } = nodo
  const piel = pielDe(estado)
  const Icono = piel.sello ?? iconoDeMateria(nombre)

  return (
    <g
      transform={`translate(${x}, ${y})`}
      opacity={atenuado ? 0.14 : 1}
      onClick={() => alVerFicha(nodo.codigo)}
      onPointerEnter={() => alSenalar(nodo.codigo)}
      onPointerLeave={alDejarDeSenalar}
      className={`grupo-nodo cursor-pointer ${seleccionado ? 'activo' : ''}`}
      style={{ transition: 'opacity 320ms cubic-bezier(0.32, 0.72, 0, 1)' }}
    >
      {/* Etiqueta accesible. El area solo existe donde esta clasificada */}
      <title>
        {[codigoVisible(nodo), '—', nombre, nodo.area && `· ${etiquetaArea(nodo.area)}`, `· ${estado}`]
          .filter(Boolean)
          .join(' ')}
      </title>

      <CaraNodo
        alto={NODO.alto}
        piel={piel}
        resaltado={resaltado}
        seleccionado={seleccionado}
        destellando={destellando}
        claveDestello={claveDestello}
        tocado={tocado}
        claveToque={claveToque}
      />

      {lineasNombre.map((linea, i) => (
        <text
          key={i}
          x={NODO.padIzq}
          y={TEXTO.arribaNombre + i * TEXTO.altoLinea}
          fontSize={TEXTO.nombre}
          fill="var(--tinta)"
          fillOpacity={piel.texto}
          className="font-bold tracking-[-0.01em]"
        >
          {linea}
        </text>
      ))}

      {/* tabular-nums porque si no, un 1111 y un 0000 miden distinto y la
          linea de abajo baila de tarjeta en tarjeta. */}
      <text
        x={NODO.padIzq}
        y={NODO.alto - 16}
        fontSize={TEXTO.meta}
        fill="var(--tinta)"
        fillOpacity={piel.dato}
        className="tabular-nums tracking-wide"
      >
        {codigoVisible(nodo)} · {uc} UC
      </text>

      {Icono && (
        <Icono
          x={NODO.ancho - NODO.padDer - 16}
          y={NODO.alto - 28}
          width={16}
          height={16}
          color="var(--tinta)"
          opacity={piel.icono}
          strokeWidth={2}
        />
      )}
    </g>
  )
}

/**
 * memo porque son hasta ciento siete de estos en pantalla y todos cuelgan de
 * un estado que vive arriba: sin el, señalar UNA materia repintaba el mapa
 * entero -medido: 413 mutaciones del DOM en 337 elementos por cada hover-.
 *
 * Todas las props son valores simples menos las tres funciones, y esas vienen
 * fijadas con useCallback desde GrafoPensum. Si alguna volviera a crearse en
 * cada render, esto dejaria de servir en silencio.
 */
export default memo(NodoAsignatura)
