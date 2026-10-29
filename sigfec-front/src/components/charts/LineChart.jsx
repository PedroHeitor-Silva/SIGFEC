/* eslint-disable react/prop-types */
import { useState } from 'react';

/**
 * Line chart com área. Linha/área em SVG (escala uniforme, sem distorção),
 * pontos e tooltip em HTML overlay — texto nunca achata.
 * data: [{ label, value }]
 */
export default function LineChart({ data = [], height = 200, color = '#10b981', valueFmt = (v) => v, area = true }) {
  const [hover, setHover] = useState(null);
  if (!data || data.length < 2) {
    return <div className="flex items-center justify-center text-xs text-slate-600" style={{ height }}>Sem dados</div>;
  }

  const chartH = height - 28;
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;

  // posições em % (responsivo, sem viewBox distorcido)
  const pts = data.map((d, i) => ({
    xPct: (i / (data.length - 1)) * 100,
    yPct: 100 - ((d.value - min) / range) * 100,
    d,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.xPct} ${p.yPct}`).join(' ');
  const areaPath = `${linePath} L 100 100 L 0 100 Z`;

  return (
    <div className="w-full select-none" style={{ height }}>
      <div className="relative" style={{ height: chartH }}>
        {/* gridlines */}
        {[0.25, 0.5, 0.75, 1].map((p) => (
          <div key={p} className="absolute left-0 right-0 border-t border-slate-800/60" style={{ top: `${p * 100}%` }} />
        ))}

        {/* SVG só com linha/área — preserveAspectRatio none ok, são formas */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible">
          {area && <path d={areaPath} fill={color} opacity="0.1" />}
          <path d={linePath} fill="none" stroke={color} strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"
            vectorEffect="non-scaling-stroke" style={{ strokeWidth: 2 }} />
        </svg>

        {/* Pontos + hover — HTML, posição absoluta por % */}
        {pts.map((p, i) => (
          <div
            key={i}
            className="absolute"
            style={{ left: `${p.xPct}%`, top: `${p.yPct}%`, transform: 'translate(-50%, -50%)' }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            {/* hit area */}
            <div className="absolute -inset-3" />
            {/* ponto */}
            <div
              className="rounded-full border-2 transition-all"
              style={{
                width: hover === i ? 11 : 7,
                height: hover === i ? 11 : 7,
                backgroundColor: color,
                borderColor: '#020617',
              }}
            />
            {/* tooltip */}
            {hover === i && (
              <div className="absolute left-1/2 -top-2 -translate-x-1/2 -translate-y-full z-10 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] font-bold text-white whitespace-nowrap shadow-lg">
                {valueFmt(p.d.value)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-2 px-1">
        {data.map((d, i) => (
          <span key={i} className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
