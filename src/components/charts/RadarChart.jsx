// ─────────────────────────────────────────────────────────────
//  RadarChart — Spider / Radar chart (SVG)
//  axes: [{ label, value, max? }]
//  max: global max (default 100)
// ─────────────────────────────────────────────────────────────
import { pxy } from './ChartBase';

export default function RadarChart({
  axes  = [],    // [{ label, value }]
  max   = 100,
  color = '#4f46e5',
  size  = 200,
}) {
  if (axes.length < 3) return null;

  const cx = size / 2, cy = size / 2;
  const r  = size * 0.38;
  const n  = axes.length;
  const levels = [0.25, 0.5, 0.75, 1];

  // polygon point for axis i at level f
  function pt(i, f) {
    const deg = (i / n) * 360 - 90;
    return pxy(cx, cy, r * f, deg);
  }

  // grid polygon at level f
  function gridPoly(f) {
    return Array.from({ length: n }, (_, i) => {
      const p = pt(i, f);
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    }).join(' ');
  }

  // data polygon
  const dataPoints = axes.map((a, i) => {
    const axisMax = a.max || max;
    const f = Math.min(1, Math.max(0, (a.value || 0) / axisMax));
    return pt(i, f);
  });
  const dataPoly = dataPoints.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');

  return (
    <div className="flex justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>

        {/* Grid polygons */}
        {levels.map((f, li) => (
          <polygon key={li} points={gridPoly(f)}
            fill="none" stroke="var(--input-border)" strokeWidth={1} />
        ))}

        {/* Axis lines */}
        {Array.from({ length: n }, (_, i) => {
          const end = pt(i, 1);
          return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y}
            stroke="var(--input-border)" strokeWidth={1} />;
        })}

        {/* Data polygon */}
        <polygon points={dataPoly}
          fill={color} fillOpacity={0.2}
          stroke={color} strokeWidth={2} strokeLinejoin="round" />

        {/* Data dots */}
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4}
            fill={color} stroke="var(--card)" strokeWidth={2}>
            <title>{axes[i].label}: {axes[i].value}</title>
          </circle>
        ))}

        {/* Axis labels */}
        {axes.map((a, i) => {
          const lp  = pt(i, 1.22);
          const deg = (i / n) * 360 - 90;
          const anchor = deg > 90 && deg < 270 ? 'end' : deg === 90 || deg === 270 ? 'middle' : 'start';
          return (
            <text key={i} x={lp.x} y={lp.y} textAnchor={anchor} dominantBaseline="middle"
              style={{ fontSize: size * 0.068, fill: 'var(--text-muted)', fontWeight: 500 }}>
              {a.label}
            </text>
          );
        })}

        {/* Level labels (25%, 50%, 75%, 100%) */}
        {levels.map((f, li) => {
          const lp = pt(0, f);
          return (
            <text key={li} x={lp.x + 3} y={lp.y}
              style={{ fontSize: size * 0.058, fill: 'var(--text-muted)' }}>
              {Math.round(f * max)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
