/**
 * Riel de avance: aprobado y, a continuacion, lo que cursas. Crece con
 * transicion al marcar.
 */
export default function Riel({ hechas, cursando, total }) {
  const pct = (n) => (total ? (n / total) * 100 : 0)
  return (
    <div className="relative h-[3px] overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--tinta)_9%,transparent)]">
      <span
        className="riel-tramo absolute inset-y-0 left-0 rounded-full bg-aprobada"
        style={{ width: `${pct(hechas)}%` }}
      />
      <span
        className="riel-tramo absolute inset-y-0 rounded-full bg-cursando"
        style={{ left: `${pct(hechas)}%`, width: `${pct(cursando)}%` }}
      />
    </div>
  )
}
