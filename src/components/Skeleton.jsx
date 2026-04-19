import React from 'react';

/**
 * Skeleton — ตัวโหลดแบบ shimmer แทน spinner
 *
 * การใช้งาน:
 *   <Skeleton width={200} height={20} />
 *   <Skeleton variant="circle" width={40} height={40} />
 *   <SkeletonText lines={3} />
 *   <SkeletonCard />
 *   <SkeletonList count={5} />
 */

const baseStyle = {
  display: 'inline-block',
  background: 'linear-gradient(90deg, var(--skeleton-a, #e5e7eb) 25%, var(--skeleton-b, #f3f4f6) 50%, var(--skeleton-a, #e5e7eb) 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeletonShimmer 1.4s ease-in-out infinite',
};

export function Skeleton({ width = '100%', height = 16, variant = 'rect', style = {}, className = '' }) {
  const borderRadius =
    variant === 'circle' ? '50%' :
    variant === 'text'   ? 6     :
    12;

  return (
    <span
      className={`skeleton-el ${className}`}
      style={{
        ...baseStyle,
        width:  typeof width  === 'number' ? `${width}px`  : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius,
        ...style,
      }}
    />
  );
}

export function SkeletonText({ lines = 3, lastWidth = '60%', gap = 8, style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i}
          variant="text"
          height={12}
          width={i === lines - 1 ? lastWidth : '100%'} />
      ))}
    </div>
  );
}

export function SkeletonCard({ showImage = false, showAvatar = true, lines = 2 }) {
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--card-border)',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 2px 10px rgba(0,0,0,.04)',
    }}>
      {showImage && <Skeleton variant="rect" width="100%" height={140} style={{ borderRadius: 0 }} />}
      <div style={{ padding: 14, display: 'flex', gap: 12 }}>
        {showAvatar && <Skeleton variant="circle" width={40} height={40} style={{ flexShrink: 0 }} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Skeleton variant="text" height={14} width="70%" style={{ marginBottom: 8 }} />
          <SkeletonText lines={lines} lastWidth="50%" gap={6} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonList({ count = 4, ...cardProps }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} {...cardProps} />)}
    </div>
  );
}

export function SkeletonQuestion() {
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--card-border)',
      borderRadius: 20,
      padding: 20,
    }}>
      <Skeleton variant="text" height={18} width="90%" style={{ marginBottom: 8 }} />
      <Skeleton variant="text" height={18} width="70%" style={{ marginBottom: 20 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rect" height={44} width="100%" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{
          flex: '1 1 140px',
          background: 'var(--card)',
          border: '1px solid var(--card-border)',
          borderRadius: 16,
          padding: 14,
          textAlign: 'center',
        }}>
          <Skeleton variant="circle" width={36} height={36} style={{ marginBottom: 10 }} />
          <Skeleton variant="text" height={20} width="50%" style={{ margin: '0 auto 6px' }} />
          <Skeleton variant="text" height={11} width="70%" style={{ margin: '0 auto' }} />
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
