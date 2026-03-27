// ─────────────────────────────────────────────────────────────
//  DonutChart — SVG Donut / Pie Chart
//  data: [{ label, value, color }]
// ─────────────────────────────────────────────────────────────
import { useState } from 'react';
import { pxy, Legend } from './ChartBase';

function arcPath(cx, cy, outerR, innerR, startDeg, endDeg) {
  const span = endDeg - startDeg;
  if (Math.abs(span) >= 359.9) {
    // full circle → 2 half arcs
    const mid = startDeg + 180;
    const p1 = arcPath(cx, cy, outerR, innerR, startDeg, mid);
    const p2 = arcPath(cx, cy, outerR, innerR, mid, endDeg);
    return p1 + ' ' + p2;
  }
  const large = span > 180 ? 1 : 0;
  const o1 = pxy(cx, cy, outerR, startDeg);
  const o2 = pxy(cx, cy, outerR, endDeg);
  const i1 = pxy(cx, cy, innerR, endDeg);
  const i2 = pxy(cx, cy, innerR, startDeg);
  return [
    `M ${o1.x.toFixed(2)} ${o1.y.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${o2.x.toFixed(2)} ${o2.y.toFixed(2)}`,
    `L ${i1.x.toFixed(2)} ${i1.y.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${i2.x.toFixed(2)} ${i2.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

export default function DonutChart({
  data = [],
  size = 180,
  centerLabel,
  centerSub,
  showLegend = true,
  thickness = 0.38,   // 0–0.5 → ยิ่งมากยิ่งบาง
}) {
  const [hovered, setHovered] = useState(null);

  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  if (!total) return <div className="text-center text-xs py-8" style={{ color: 'var(--text-muted)' }}>ไม่มีข้อมูล</div>;

  const cx = size / 2, cy = size / 2;
  const outerR = size * 0.44;
  const innerR = outerR * (1 - thickness * 2);
  const GAP    = 2; // องศาช่องว่างระหว่าง segment

  let angle = 0;
  const segments = data.map((d, i) => {
    const span = total > 0 ? (d.value / total) * (360 - data.length * GAP) : 0;
    const seg  = { ...d, startDeg: angle + GAP / 2, endDeg: angle + GAP / 2 + span, idx: i };
    angle += span + GAP;
    return seg;
  });

  const displayLabel = hovered !== null ? data[hovered]?.label : centerLabel;
  const displaySub   = hovered !== null
    ? `${data[hovered]?.value} (${Math.round((data[hovered]?.value / total) * 100)}%)`
    : centerSub;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg, i) => (
          <path
            key={i}
            d={arcPath(cx, cy, outerR, innerR, seg.startDeg, seg.endDeg)}
            fill={seg.color}
            opacity={hovered === null ? 1 : hovered === i ? 1 : 0.4}
            style={{ transition: 'opacity .2s, transform .2s', cursor: 'pointer', transformOrigin: `${cx}px ${cy}px`,
              transform: hovered === i ? 'scale(1.04)' : 'scale(1)' }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
        {/* center text */}
        {displayLabel && (
          <>
            <text x={cx} y={cy - (displaySub ? 8 : 0)} textAnchor="middle" dominantBaseline="middle"
              style={{ fontSize: size * 0.09, fontWeight: 700, fill: 'var(--text)' }}>
              {displayLabel}
            </text>
            {displaySub && (
              <text x={cx} y={cy + size * 0.095} textAnchor="middle" dominantBaseline="middle"
                style={{ fontSize: size * 0.07, fill: 'var(--text-muted)' }}>
                {displaySub}
              </text>
            )}
          </>
        )}
      </svg>
      {showLegend && (
        <Legend items={segments.map(s => ({
          color: s.color,
          label: s.label,
          value: `${s.value} (${Math.round((s.value / total) * 100)}%)`,
        }))} />
      )}
    </div>
  );
}
