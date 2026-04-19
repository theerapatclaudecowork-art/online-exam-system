// ─────────────────────────────────────────────────────────────
//  ClusteredBarChart — Grouped / Clustered Vertical Bars
//  series:     [{ label, color, data: number[] }]
//  categories: string[]  (X-axis labels)
//  Props: height, showValues, maxValue
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { Legend } from './ChartBase';

export default function ClusteredBarChart({
  series     = [],
  categories = [],
  height     = 180,
  showValues = true,
  maxValue,
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 120);
    return () => clearTimeout(t);
  }, []);

  if (!series.length || !categories.length) return null;

  const allVals = series.flatMap(s => s.data || []);
  const max     = maxValue ?? Math.max(...allVals, 1);
  const nS      = series.length;
  const nC      = categories.length;

  // Sizing (SVG units)
  const BAR_W    = 14;           // width per single bar
  const BAR_GAP  = 3;            // gap between bars in a group
  const GRP_GAP  = 12;           // gap between groups
  const TOP_PAD  = showValues ? 18 : 6;
  const BOT_PAD  = 22;
  const LEFT_PAD = 24;           // space for Y-axis labels

  const grpW  = nS * BAR_W + (nS - 1) * BAR_GAP;
  const unitW = grpW + GRP_GAP;
  const svgW  = LEFT_PAD + nC * unitW + GRP_GAP;
  const svgH  = height + TOP_PAD + BOT_PAD;
  const yBase = svgH - BOT_PAD;  // bottom line of bars

  // Y-axis tick values
  const yTicks = [0.25, 0.5, 0.75, 1];

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <Legend
        items={series.map(s => ({ color: s.color, label: s.label }))}
      />
      <svg
        width="100%"
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ display: 'block', minWidth: Math.min(svgW, 300), marginTop: 8 }}
        aria-label="Clustered Bar Chart"
      >
        {/* Y axis grid lines + labels */}
        {yTicks.map(f => {
          const gy    = yBase - TOP_PAD - f * (height - TOP_PAD);
          const label = maxValue ? Math.round(f * maxValue) : Math.round(f * max);
          return (
            <g key={f}>
              <line
                x1={LEFT_PAD} y1={gy}
                x2={svgW}     y2={gy}
                stroke="rgba(120,120,120,0.18)"
                strokeWidth={0.7}
                strokeDasharray="3,3"
              />
              <text
                x={LEFT_PAD - 3} y={gy + 3}
                textAnchor="end"
                fontSize={8}
                fill="rgba(120,120,120,0.7)"
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* Baseline */}
        <line
          x1={LEFT_PAD} y1={yBase}
          x2={svgW}      y2={yBase}
          stroke="rgba(120,120,120,0.3)"
          strokeWidth={0.8}
        />

        {/* Bar groups */}
        {categories.map((cat, ci) => {
          const grpX = LEFT_PAD + GRP_GAP / 2 + ci * unitW;
          return (
            <g key={ci}>
              {/* Bars */}
              {series.map((s, si) => {
                const val  = (s.data || [])[ci] || 0;
                const pct  = max > 0 ? val / max : 0;
                const bH   = ready ? Math.max(pct * (height - TOP_PAD), val > 0 ? 2 : 0) : 0;
                const bX   = grpX + si * (BAR_W + BAR_GAP);
                const bY   = yBase - bH;

                return (
                  <g key={si}>
                    <rect
                      x={bX} y={bY}
                      width={BAR_W} height={bH}
                      fill={s.color}
                      rx={2}
                      style={{ transition: 'y .7s cubic-bezier(.4,0,.2,1), height .7s cubic-bezier(.4,0,.2,1)' }}
                    >
                      <title>{s.label}: {val}</title>
                    </rect>
                    {/* Value on top */}
                    {showValues && val > 0 && (
                      <text
                        x={bX + BAR_W / 2} y={bY - 2}
                        textAnchor="middle"
                        fontSize={8}
                        fontWeight="600"
                        fill="var(--text-muted)"
                        style={{ opacity: ready ? 1 : 0, transition: 'opacity .3s .6s' }}
                      >
                        {val}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* X label (center of group) */}
              <text
                x={grpX + grpW / 2}
                y={svgH - 4}
                textAnchor="middle"
                fontSize={9}
                fill="var(--text-muted)"
              >
                {String(cat).slice(0, 10)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
