/* eslint-disable react/prop-types */
export function Skeleton({ className = '', width, height }) {
  return (
    <div
      className={`rounded bg-slate-800 animate-pulse ${className}`}
      style={{ width, height }}
    />
  );
}

export function TableSkeleton({ rows = 5, cols = 6, widths = [] }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-slate-800/60">
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="px-5 py-4">
              <Skeleton height={12} width={widths[j] ?? `${40 + (j * 7) % 50}%`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <Skeleton width="40%" height={10} />
        <Skeleton width={40} height={40} className="rounded-lg" />
      </div>
      <Skeleton width="60%" height={28} />
      <Skeleton width="100%" height={28} />
    </div>
  );
}
