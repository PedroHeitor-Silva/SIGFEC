/* eslint-disable react/prop-types */
import { useState } from 'react';

/**
 * Vertical bar chart. Barras em SVG (podem esticar sem problema),
 * rótulos e tooltip em HTML — texto nunca distorce.
 * data: [{ label, value }]
 */
export default function BarChart({ data = [], height = 200, color = '#10b981', valueFmt = (v) => v }) {
  const [hover, setHover] = useState(null);
  if (!data.length) {
    return <div className="flex items-center justify-center text-xs text-slate-600" style={{ height }}>Sem dados</div>;
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const chartH = height - 28; // espaço pros labels embaixo

  return (
    <div className="w-full select-none" style={{ height }}>
      {/* Área das barras */}
      <div className="relative flex items-end gap-2" style={{ height: chartH }}>
        {/* gridlines */}
        {[0.25, 0.5, 0.75, 1].map((p) => (
          <div key={p} className="absolute left-0 right-0 border-t border-slate-800/60"
            style={{ bottom: `${p * 100}%` }} />
        ))}

        {data.map((d, i) => {
          const h = (d.value / max) * 100;
          const isHover = hover === i;
          return (
            <div
              key={i}
              className="relative flex-1 flex flex-col items-center justify-end h-full"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              {/* tooltip valor */}
              {isHover && (
                <div className="absolute -top-1 z-10 -translate-y-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] font-bold text-white whitespace-nowrap shadow-lg">
                  {valueFmt(d.value)}
                </div>
              )}
              {/* barra */}
              <div
                className="w-full rounded-t transition-all duration-200"
                style={{
                  height: `${Math.max(h, 1)}%`,
                  backgroundColor: color,
                  opacity: hover === null || isHover ? 0.85 : 0.4,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Labels */}
      <div className="flex gap-2 mt-2">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
