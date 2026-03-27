// ─────────────────────────────────────────────────────────────
//  Pure SVG / CSS Chart primitives  — รองรับ CSS Variable Themes
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef } from 'react';

export const PALETTE = [
  '#4f46e5','#06b6d4','#16a34a','#f59e0b',
  '#ef4444','#8b5cf6','#ec4899','#14b8a6',
  '#f97316','#3b82f6','#84cc16','#a855f7',
];

// SVG polar → XY
export function pxy(cx, cy, r, deg) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// Smooth SVG path through points (cardinal spline approximation)
export function smoothPath(pts) {
  if (!pts || pts.length < 2) return '';
  return pts.reduce((d, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = pts[i - 1];
    const cpX  = (prev.x + p.x) / 2;
    return d + ` C ${cpX} ${prev.y} ${cpX} ${p.y} ${p.x} ${p.y}`;
  }, '');
}

// ─────────────────────────────────────────────────────────────
//  AnimatedNumber — ตัวเลขวิ่งขึ้นเมื่อ render
// ─────────────────────────────────────────────────────────────
export function AnimatedNumber({ value, duration = 800, suffix = '' }) {
  const ref  = useRef(null);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current;
    const end   = Number(value) || 0;
    if (start === end) { if (ref.current) ref.current.textContent = end + suffix; return; }
    const startTime = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - startTime) / duration);
      const ease = 1 - Math.pow(1 - t, 3); // ease-out-cubic
      const cur  = Math.round(start + (end - start) * ease);
      if (ref.current) ref.current.textContent = cur + suffix;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    prev.current = end;
  }, [value]);
  return <span ref={ref}>{value}{suffix}</span>;
}

// ─────────────────────────────────────────────────────────────
//  ChartCard wrapper
// ─────────────────────────────────────────────────────────────
export function ChartCard({ title, subtitle, children, className = '' }) {
  return (
    <div className={`rounded-2xl p-4 ${className}`}
      style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
      {title && (
        <div className="mb-3">
          <div className="font-bold text-sm" style={{ color: 'var(--text)' }}>{title}</div>
          {subtitle && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{subtitle}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Legend
// ─────────────────────────────────────────────────────────────
export function Legend({ items }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
          <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: item.color }} />
          {item.label}
          {item.value !== undefined && (
            <span className="font-semibold" style={{ color: 'var(--text)' }}>{item.value}</span>
          )}
        </div>
      ))}
    </div>
  );
}
