import React from 'react';

/**
 * Error Boundary — ดัก JS error ใน tree ฝั่ง React
 * ป้องกัน white-screen เมื่อ screen ใด screen หนึ่งพัง
 *
 * ใช้งาน:
 *   <ErrorBoundary><App /></ErrorBoundary>
 *   <ErrorBoundary fallback={<Custom />}>...</ErrorBoundary>
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    try {
      console.error('[ErrorBoundary]', error, info?.componentStack);
    } catch (_) {}

    // ── Report error to GAS backend ──
    try {
      const payload = {
        action: 'logError',
        severity: 'error',
        message: (error && error.message) ? String(error.message) : String(error || ''),
        stack:   (error && error.stack)   ? String(error.stack).slice(0, 2000) : '',
        context: (info && info.componentStack) ? String(info.componentStack).slice(0, 2000) : '',
        screen:  (typeof window !== 'undefined' && window.location) ? window.location.hash || window.location.pathname : '',
        userId:  (() => {
          try {
            const p = JSON.parse(localStorage.getItem('profile') || '{}');
            return p.userId || p.lineUserId || '';
          } catch (_) { return ''; }
        })(),
        ua: (typeof navigator !== 'undefined') ? String(navigator.userAgent).slice(0, 200) : '',
      };
      // ใช้ dynamic import เพื่อไม่ให้ ErrorBoundary ล้มเหลวถ้า api.js ล้มเหลวเอง
      import('../utils/api').then(m => {
        try { m.apiPost(payload).catch(() => {}); } catch (_) {}
      }).catch(() => {
        // fallback: sendBeacon
        try {
          const url = (window.GAS_URL || '');
          if (url && navigator.sendBeacon) {
            navigator.sendBeacon(url, new Blob([JSON.stringify(payload)], { type: 'application/json' }));
          }
        } catch (_) {}
      });
    } catch (_) {}
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, info: null });
  };

  handleReload = () => {
    try {
      // ล้าง cache ของ SW เผื่อ asset พัง
      if ('caches' in window) {
        caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
      }
    } catch (_) {}
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    const msg = this.state.error?.message || String(this.state.error || 'Unknown error');
    const stack = this.state.info?.componentStack || '';

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'var(--bg, #f8fafc)',
      }}>
        <div style={{
          maxWidth: 520,
          width: '100%',
          background: 'var(--card, #fff)',
          border: '1px solid var(--card-border, #e5e7eb)',
          borderRadius: 20,
          padding: 28,
          boxShadow: '0 10px 40px rgba(0,0,0,.08)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>💥</div>
          <h2 style={{
            margin: '0 0 6px',
            fontSize: 20,
            fontWeight: 800,
            color: 'var(--text, #111827)',
          }}>
            เกิดข้อผิดพลาด
          </h2>
          <p style={{
            margin: '0 0 16px',
            fontSize: 13,
            color: 'var(--text-muted, #6b7280)',
            lineHeight: 1.5,
          }}>
            หน้านี้โหลดไม่สำเร็จ ลองรีโหลดหรือกลับหน้าหลัก
          </p>

          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 12,
            padding: 12,
            margin: '0 0 16px',
            textAlign: 'left',
            fontSize: 12,
            color: '#991b1b',
            wordBreak: 'break-word',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            maxHeight: 140,
            overflow: 'auto',
          }}>
            <b>Error:</b> {msg}
            {stack && (
              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Stack trace</summary>
                <pre style={{ margin: '8px 0 0', fontSize: 10, whiteSpace: 'pre-wrap' }}>{stack}</pre>
              </details>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={this.handleReset}
              style={{
                background: 'var(--input-bg, #f3f4f6)',
                color: 'var(--text, #111827)',
                border: 'none',
                padding: '10px 18px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}>
              ลองใหม่
            </button>
            <button onClick={this.handleReload}
              style={{
                background: '#4f46e5',
                color: '#fff',
                border: 'none',
                padding: '10px 18px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}>
              🔄 รีโหลดหน้า
            </button>
          </div>
        </div>
      </div>
    );
  }
}
