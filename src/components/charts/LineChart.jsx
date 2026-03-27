// ─────────────────────────────────────────────────────────────
//  LineChart — SVG Line/Area chart
//  series: [{ label, color, data: [number] }]
//  labels: [string]  — X axis
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';
import { smoothPath, Legend } from './ChartBase';

export default function LineChart({
  series   = [],   // [{ label, color, data: [number] }]
  labels   = [],   // X axis labels
  height   = 160,
  showArea = true,
  showDots = true,
  yMin     = 0,
  yMax,
}) {
  const svgRef = useRef(null);
  const [w, setW] = useState(300);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function measure() {
      if (svgRef.current) setW(svgRef.current.clientWidth || 300);
    }
    measure();
    window.addEventListener('resize', measure);
    const t = setTimeout(() => { measure(); setReady(true); }, 120);
    return () => { window.removeEventListener('resize', measure); clearTimeout(t); };
  }, []);

  if (!series.length || !labels.length) return null;

  const allVals = series.flatMap(s => s.data || []);
  const dataMax = yMax ?? (Math.max(...allVals, 1) * 1.1);
  const dataMin = yMin;
  const range   = dataMax - dataMin || 1;

  const PAD_L = 28, PAD_R = 8, PAD_T = 16, PAD_B = 24;
  const chartW = w - PAD_L - PAD_R;
  const chartH = height - PAD_T - PAD_B;
  const n      = labels.length;

  function xOf(i) { return PAD_L + (n > 1 ? (i / (n - 1)) * chartW : chartW / 2); }
  function yOf(v) { return PAD_T + chartH - ((v - dataMin) / range) * chartH; }

  // Y grid lines (4 lines)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    val:   Math.round(dataMin + f * range),
    y:     PAD_T + chartH * (1 - f),
  }));

  // X ticks (max 7 labels)
  const step    = Math.max(1, Math.ceil(n / 7));
  const xTicks  = labels.map((l, i) => ({ label: l, x: xOf(i), show: i % step === 0 || i === n - 1 }));

  return (
    <div>
      <svg ref={svgRef} width="100%" height={height}
        style={{ overflow: 'visible', display: 'block' }}>

        {/* Y grid */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD_L} y1={t.y} x2={w - PAD_R} y2={t.y}
              stroke="var(--input-border)" strokeWidth={1} strokeDasharray="3,3" />
            <text x={PAD_L - 3} y={t.y} textAnchor="end" dominantBaseline="middle"
              style={{ fontSize: 9, fill: 'var(--text-muted)' }}>{t.val}</text>
          </g>
        ))}

        {/* X ticks */}
        {xTicks.filter(t => t.show).map((t, i) => (
          <text key={i} x={t.x} y={height - 4} textAnchor="middle"
            style={{ fontSize: 9, fill: 'var(--text-muted)' }}>{t.label}</text>
        ))}

        {/* Series */}
        {series.map((s, si) => {
          const pts  = (s.data || []).map((v, i) => ({ x: xOf(i), y: yOf(v) }));
          const line = smoothPath(pts);

          // Area fill path
          const areaPath = ready && pts.length > 0
            ? line + ` L ${pts[pts.length - 1].x} ${PAD_T + chartH} L ${pts[0].x} ${PAD_T + chartH} Z`
            : '';

          return (
            <g key={si}>
              {/* Area */}
              {showArea && (
                <path d={ready ? areaPath : ''} fill={s.color} opacity={0.12} />
              )}
              {/* Line */}
              <path d={ready ? line : ''} fill="none" stroke={s.color}
                strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                style={{ transition: 'opacity .5s' }} opacity={ready ? 1 : 0} />
              {/* Dots */}
              {showDots && pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={3.5}
                  fill="var(--card)" stroke={s.color} strokeWidth={2}
                  opacity={ready ? 1 : 0}
                  style={{ transition: `opacity .5s ${i * 40}ms` }}>
                  <title>{s.label}: {s.data[i]}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>

      {series.length > 1 && (
        <Legend items={series.map(s => ({ color: s.color, label: s.label }))} />
      )}
    </div>
  );
}
