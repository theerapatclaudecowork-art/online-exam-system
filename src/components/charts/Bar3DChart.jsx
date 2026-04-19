// ─────────────────────────────────────────────────────────────
//  Bar3DChart — 3D Isometric Bar Chart (SVG)
//  items: [{ label, value, color? }]
//  Props: height, colorFn, showValues
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { PALETTE } from './ChartBase';

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}
function lighten(hex, f = 0.3) {
  if (!hex || !hex.startsWith('#')) return hex || '#888';
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.min(255, Math.round(r + (255 - r) * f))},${Math.min(255, Math.round(g + (255 - g) * f))},${Math.min(255, Math.round(b + (255 - b) * f))})`;
}
function darken(hex, f = 0.28) {
  if (!hex || !hex.startsWith('#')) return hex || '#888';
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.round(r * (1 - f))},${Math.round(g * (1 - f))},${Math.round(b * (1 - f))})`;
}

export default function Bar3DChart({
  items    = [],
  height   = 180,
  colorFn,
  showValues = true,
  showXLabels = true,
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 120);
    return () => clearTimeout(t);
  }, []);

  if (!items.length) return null;

  const max    = Math.max(...items.map(d => d.value || 0), 1);
  const DEPTH  = 10;   // isometric depth (px in SVG units)
  const BAR_W  = 30;   // bar front-face width
  const GAP    = 10;   // gap between bars
  const TOP_PAD = showValues ? 20 : 8;
  const BOT_PAD = showXLabels ? 22 : 4;

  const unitW  = BAR_W + DEPTH + GAP;
  const svgW   = items.length * unitW + DEPTH + 4;
  const svgH   = height + DEPTH + TOP_PAD + BOT_PAD;
  const yBase  = svgH - BOT_PAD - DEPTH;  // bottom of front face

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg
        width="100%"
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ display: 'block', minWidth: Math.min(svgW, 280) }}
        aria-label="3D Bar Chart"
      >
        {/* Horizontal guide lines */}
        {[0.25, 0.5, 0.75, 1].map(f => {
          const gy = yBase - f * height;
          return (
            <line key={f}
              x1={0} y1={gy} x2={svgW} y2={gy}
              stroke="rgba(120,120,120,0.18)"
              strokeWidth={0.7}
              strokeDasharray="3,3"
            />
          );
        })}

        {items.map((item, i) => {
          const pct    = max > 0 ? (item.value / max) : 0;
          const bH     = ready ? Math.max(pct * height, item.value > 0 ? 3 : 0) : 0;
          const color  = colorFn
            ? colorFn(item, i)
            : (item.color || PALETTE[i % PALETTE.length]);

          const x     = i * unitW + 2;
          const yFTop = yBase - bH;   // top of front face

          // Face polygon points
          // Front: rectangle x,yFTop → x+BAR_W,yFTop → x+BAR_W,yBase → x,yBase
          // Top:   parallelogram x,yFTop → x+DEPTH,yFTop-DEPTH → x+BAR_W+DEPTH,yFTop-DEPTH → x+BAR_W,yFTop
          // Right: parallelogram x+BAR_W,yFTop → x+BAR_W+DEPTH,yFTop-DEPTH → x+BAR_W+DEPTH,yBase-DEPTH → x+BAR_W,yBase
          const topPts = [
            `${x},${yFTop}`,
            `${x + DEPTH},${yFTop - DEPTH}`,
            `${x + BAR_W + DEPTH},${yFTop - DEPTH}`,
            `${x + BAR_W},${yFTop}`,
          ].join(' ');

          const rightPts = [
            `${x + BAR_W},${yFTop}`,
            `${x + BAR_W + DEPTH},${yFTop - DEPTH}`,
            `${x + BAR_W + DEPTH},${yBase - DEPTH}`,
            `${x + BAR_W},${yBase}`,
          ].join(' ');

          const topColor   = lighten(color, 0.32);
          const rightColor = darken(color, 0.28);

          return (
            <g key={i}>
              {/* Front face */}
              <rect
                x={x} y={yFTop}
                width={BAR_W} height={bH}
                fill={color}
                rx={2} ry={0}
                style={{ transition: 'y .75s cubic-bezier(.4,0,.2,1), height .75s cubic-bezier(.4,0,.2,1)' }}
              />

              {/* Top face (visible only when bar has height) */}
              {bH > 3 && (
                <polygon points={topPts} fill={topColor} />
              )}

              {/* Right face */}
              {bH > 3 && (
                <polygon points={rightPts} fill={rightColor} />
              )}

              {/* Value label */}
              {showValues && item.value > 0 && (
                <text
                  x={x + (BAR_W + DEPTH) / 2}
                  y={yFTop - DEPTH - 3}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight="700"
                  fill="var(--text-muted)"
                  style={{ opacity: ready ? 1 : 0, transition: 'opacity .3s .6s' }}
                >
                  {item.value}
                </text>
              )}

              {/* X Label */}
              {showXLabels && (
                <text
                  x={x + (BAR_W + DEPTH) / 2}
                  y={svgH - 3}
                  textAnchor="middle"
                  fontSize={9}
                  fill="var(--text-muted)"
                >
                  {String(item.label || '').slice(0, 9)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
