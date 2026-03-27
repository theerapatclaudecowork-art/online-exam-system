// ─────────────────────────────────────────────────────────────
//  HBarChart — Horizontal Bar Chart
//  items: [{ label, value, value2?, color?, pct? }]
//  maxValue: number (auto if omitted)
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef } from 'react';

function AnimBar({ pct, color, delay = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.width = '0%';
    const t = setTimeout(() => { el.style.width = pct + '%'; }, delay + 80);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div style={{ background: 'var(--progress-trk)', borderRadius: 999, height: 10, overflow: 'hidden', flex: 1 }}>
      <div ref={ref} style={{
        height: '100%', borderRadius: 999,
        background: color,
        transition: 'width .7s cubic-bezier(.4,0,.2,1)',
        width: '0%',
      }} />
    </div>
  );
}

export default function HBarChart({
  items = [],
  maxValue,
  colorFn,           // (item, i) => color string
  showValue = true,
  valueSuffix = '',
  barHeight = 10,
  showSecondBar = false,  // dual bar (pass/fail)
  secondColor = '#ef4444',
}) {
  const max = maxValue ?? Math.max(...items.map(d => d.value || 0), 1);

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const pct   = max > 0 ? Math.min(100, (item.value / max) * 100) : 0;
        const pct2  = showSecondBar && item.value2 ? Math.min(100, (item.value2 / max) * 100) : 0;
        const color = colorFn ? colorFn(item, i) : (item.color || '#4f46e5');

        return (
          <div key={i}>
            <div className="flex items-center justify-between mb-1 gap-2">
              <span className="text-xs truncate flex-1" style={{ color: 'var(--text)', maxWidth: 160 }}
                title={item.label}>{item.label}</span>
              {showValue && (
                <span className="text-xs font-semibold flex-shrink-0" style={{ color }}>
                  {item.value}{valueSuffix}
                  {item.extra && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> {item.extra}</span>}
                </span>
              )}
            </div>
            <AnimBar pct={pct} color={color} delay={i * 60} />
            {showSecondBar && item.value2 !== undefined && (
              <div className="mt-0.5">
                <AnimBar pct={pct2} color={secondColor} delay={i * 60 + 30} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
