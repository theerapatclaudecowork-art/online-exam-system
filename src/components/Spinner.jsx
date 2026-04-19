export default function Spinner({ label = 'กำลังโหลด...' }) {
  return (
    <>
      {/* ── Fullscreen blur overlay ─────────────────────── */}
      <div style={{
        position:        'fixed',
        inset:           0,
        zIndex:          9000,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        background:      'rgba(0, 0, 0, 0.35)',
        backdropFilter:  'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        animation:       'spinnerFadeIn .22s ease',
      }}>
        {/* ── Floating card ─────────────────────────────── */}
        <div style={{
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          gap:            16,
          background:     'var(--card)',
          borderRadius:   24,
          padding:        '32px 44px',
          boxShadow:      '0 24px 64px rgba(0,0,0,.28)',
          border:         '1px solid var(--card-border)',
          animation:      'spinnerSlideUp .28s cubic-bezier(.4,0,.2,1)',
          minWidth:       160,
        }}>
          {/* Spinner ring */}
          <div className="spinner" style={{ margin: 0, width: 52, height: 52, borderWidth: 5 }} />

          {/* Label */}
          <p style={{
            margin:      0,
            color:       'var(--text)',
            fontWeight:  700,
            fontSize:    14,
            textAlign:   'center',
            lineHeight:  1.4,
          }}>
            {label}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spinnerFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes spinnerSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(.95); }
          to   { opacity: 1; transform: translateY(0)    scale(1);   }
        }
      `}</style>
    </>
  );
}
