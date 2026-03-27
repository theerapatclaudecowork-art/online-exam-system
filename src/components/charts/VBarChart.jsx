// ─────────────────────────────────────────────────────────────
//  VBarChart — Vertical Bar Chart / Histogram (SVG)
//  items: [{ label, value, color? }]
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';

export default function VBarChart({
  items = [],
  height = 160,
  colorFn,
  showValues = true,
  showXLabels = true,
  highlightFn,    // (item) => bool — หากเป็น true จะเน้นสี
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 100); return () => clearTimeout(t); }, []);

  if (!items.length) return null;

  const max = Math.max(...items.map(d => d.value || 0), 1);
  const W   = 100 / items.length;  // percent width per bar

  return (
    <div style={{ width: '100%', paddingBottom: showXLabels ? 28 : 4, position: 'relative' }}>
      {/* Y grid lines */}
      <div style={{ position: 'relative', height, display: 'flex', alignItems: 'flex-end', gap: 2, padding: '0 2px' }}>
        {[0.25, 0.5, 0.75, 1].map(f => (
          <div key={f} style={{
            position: 'absolute', left: 0, right: 0,
            bottom: `${f * 100}%`,
            borderTop: '1px dashed var(--input-border)',
            pointerEvents: 'none',
          }} />
        ))}

        {items.map((item, i) => {
          const pct      = max > 0 ? (item.value / max) : 0;
          const barH     = ready ? pct * (height - 24) : 0;
          const color    = colorFn ? colorFn(item, i)
                         : (highlightFn && highlightFn(item)) ? '#16a34a'
                         : (item.color || '#4f46e5');
          const isHigh   = highlightFn ? highlightFn(item) : false;

          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', position: 'relative' }}>
              {/* value on top */}
              {showValues && item.value > 0 && (
                <div style={{
                  fontSize: 9, color: 'var(--text-muted)', fontWeight: 600,
                  marginBottom: 2,
                  opacity: ready ? 1 : 0, transition: 'opacity .3s .5s',
                }}>
                  {item.value}
                </div>
              )}
              {/* bar */}
              <div style={{
                width: '80%',
                height: barH,
                minHeight: item.value > 0 ? 3 : 0,
                background: color,
                borderRadius: '4px 4px 0 0',
                transition: 'height .7s cubic-bezier(.4,0,.2,1)',
                boxShadow: isHigh ? `0 -2px 8px ${color}66` : 'none',
                cursor: 'default',
              }} title={`${item.label}: ${item.value}`} />
              {/* x label */}
              {showXLabels && (
                <div style={{
                  position: 'absolute', bottom: -24, left: '50%', transform: 'translateX(-50%)',
                  fontSize: 9, color: 'var(--text-muted)', whiteSpace: 'nowrap',
                  maxWidth: `${W * 2}vw`,
                }}>
                  {item.label}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
