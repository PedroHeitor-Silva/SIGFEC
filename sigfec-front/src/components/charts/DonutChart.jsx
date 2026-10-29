/* eslint-disable react/prop-types */
import { useState } from 'react';

/**
 * Donut chart. SVG only.
 * data: [{ label, value, color }]
 */
export default function DonutChart({ data = [], size = 180, label = '', sublabel = '' }) {
  const [hover, setHover] = useState(null);
  if (!data.length) return <div style={{ height: size }} className="flex items-center justify-center text-xs text-slate-600">Sem dados</div>;

  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div style={{ height: size }} className="flex items-center justify-center text-xs text-slate-600">Sem dados</div>;

  const radius = 45, inner = 30, cx = 50, cy = 50;
  let cumAngle = -Math.PI / 2;
  const arcs = data.map((d) => {
    const angle = (d.value / total) * Math.PI * 2;
    const start = cumAngle;
    const end = cumAngle + angle;
    cumAngle = end;
    const x1 = cx + radius * Math.cos(start);
    const y1 = cy + radius * Math.sin(start);
    const x2 = cx + radius * Math.cos(end);
    const y2 = cy + radius * Math.sin(end);
    const x3 = cx + inner * Math.cos(end);
    const y3 = cy + inner * Math.sin(end);
    const x4 = cx + inner * Math.cos(start);
    const y4 = cy + inner * Math.sin(start);
    const largeArc = angle > Math.PI ? 1 : 0;
    const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${inner} ${inner} 0 ${largeArc} 0 ${x4} ${y4} Z`;
    return { path, d, percent: (d.value / total) * 100 };
  });

  const active = hover != null ? arcs[hover].d : null;

  return (
    <div className="flex items-center gap-6">
      <div style={{ width: size, height: size }} className="shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {arcs.map((a, i) => (
            <path
              key={i}
              d={a.path}
              fill={a.d.color}
              opacity={hover === null || hover === i ? 1 : 0.35}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ transition: 'opacity 150ms', cursor: 'pointer' }}
            />
          ))}
          <text x="50" y="48" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold">
            {active ? active.value : total}
          </text>
          <text x="50" y="57" textAnchor="middle" fill="#64748b" fontSize="4" letterSpacing="0.5">
            {active ? active.label.toUpperCase() : (label || 'TOTAL').toUpperCase()}
          </text>
        </svg>
        {sublabel && <p className="mt-2 text-center text-[11px] uppercase tracking-widest text-slate-500">{sublabel}</p>}
      </div>

      <div className="flex-1 space-y-2">
        {data.map((d, i) => {
          const pct = ((d.value / total) * 100).toFixed(1);
          return (
            <div
              key={d.label}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className="flex items-center justify-between gap-3 text-sm cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-slate-300 truncate">{d.label}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-white font-mono font-bold text-xs">{d.value}</span>
                <span className="text-slate-500 text-xs tabular-nums w-12 text-right">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
