/* eslint-disable react/prop-types */

/**
 * Horizontal bar chart (rankings). Pure CSS bars.
 * data: [{ label, value, color? }]
 */
export default function HBarChart({ data = [], valueFmt = (v) => v, defaultColor = '#10b981' }) {
  if (!data.length) return <div className="text-xs text-slate-600 py-8 text-center">Sem dados</div>;
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        const color = d.color || defaultColor;
        return (
          <div key={d.label}>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-slate-500 font-mono w-4">{i + 1}</span>
                <span className="text-white font-medium truncate">{d.label}</span>
              </div>
              <span className="text-slate-400 font-mono font-bold shrink-0">{valueFmt(d.value)}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
