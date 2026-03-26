import { useEffect, useRef } from 'react';

const CIRCUMFERENCE = 251.2; // 2π × r=40

export default function Donut({ pct = 0, pass = false, size = 144 }) {
  const arcRef = useRef(null);

  useEffect(() => {
    const offset = CIRCUMFERENCE * (1 - pct / 100);
    const timer = setTimeout(() => {
      if (arcRef.current) arcRef.current.style.strokeDashoffset = offset;
    }, 80);
    return () => clearTimeout(timer);
  }, [pct]);

  const color = pass ? '#22c55e' : '#ef4444';

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--progress-trk)" strokeWidth="10" />
        <circle
          ref={arcRef} cx="50" cy="50" r="40" fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE}
          transform="rotate(-90 50 50)" className="donut-ring"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-extrabold" style={{ color }}>{pct}%</div>
        <slot />
      </div>
    </div>
  );
}
