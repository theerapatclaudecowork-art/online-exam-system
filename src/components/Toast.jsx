import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

/**
 * Toast — แจ้งเตือน background action แบบไม่รบกวน (ไม่ blocking)
 *
 * ใช้งาน:
 *   1) wrap App ด้วย <ToastProvider>
 *   2) const { toast } = useToast();
 *      toast.success('บันทึกแล้ว');
 *      toast.error('บันทึกไม่สำเร็จ');
 *      toast.info('ข้อความ', { duration: 5000 });
 *      toast.loading('กำลังส่ง...', { id: 'upload' });
 *      toast.dismiss('upload');
 *
 * เหมาะสำหรับ:
 *   - background save (bookmark, auto-reply, heartbeat)
 *   - network reconnect
 *   - toggle dark mode
 *   - copy to clipboard
 */

const ToastContext = createContext(null);

const TYPE_CONFIG = {
  success: { bg: '#16a34a', icon: '✅' },
  error:   { bg: '#dc2626', icon: '❌' },
  warning: { bg: '#d97706', icon: '⚠️' },
  info:    { bg: '#2563eb', icon: 'ℹ️' },
  loading: { bg: '#4f46e5', icon: '⏳' },
};

let _seq = 0;

export function ToastProvider({ children, position = 'top', max = 4 }) {
  const [items, setItems] = useState([]);

  const dismiss = useCallback((id) => {
    setItems(list => list.filter(t => t.id !== id));
  }, []);

  const push = useCallback((type, message, options = {}) => {
    const id = options.id ?? (++_seq);
    const duration = options.duration ?? (type === 'loading' ? 0 : type === 'error' ? 4500 : 2800);

    setItems(list => {
      // แทนที่ถ้ามี id ซ้ำ
      const withoutDup = list.filter(t => t.id !== id);
      const next = [...withoutDup, { id, type, message, duration, action: options.action }];
      // จำกัดจำนวนสูงสุด
      return next.length > max ? next.slice(-max) : next;
    });

    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss, max]);

  const api = {
    success:  (msg, opt) => push('success', msg, opt),
    error:    (msg, opt) => push('error', msg, opt),
    warning:  (msg, opt) => push('warning', msg, opt),
    info:     (msg, opt) => push('info', msg, opt),
    loading:  (msg, opt) => push('loading', msg, opt),
    dismiss,
    show:     (msg, opt) => push(opt?.type || 'info', msg, opt),
  };

  return (
    <ToastContext.Provider value={{ toast: api }}>
      {children}
      <ToastContainer items={items} position={position} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // fallback ไม่ให้ crash ถ้าลืม wrap Provider
    return {
      toast: {
        success: () => {}, error: () => {}, warning: () => {},
        info: () => {}, loading: () => {}, dismiss: () => {}, show: () => {},
      }
    };
  }
  return ctx;
}

function ToastContainer({ items, position, onDismiss }) {
  if (items.length === 0) return null;

  const posStyle = position === 'bottom'
    ? { bottom: 90, left: 0, right: 0, flexDirection: 'column-reverse' }
    : { top: 16, left: 0, right: 0, flexDirection: 'column' };

  return (
    <div style={{
      position: 'fixed',
      zIndex: 99998,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      pointerEvents: 'none',
      padding: '0 12px',
      ...posStyle,
    }}>
      {items.map(t => <ToastItem key={t.id} {...t} onDismiss={() => onDismiss(t.id)} />)}
    </div>
  );
}

function ToastItem({ id, type, message, action, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.info;

  useEffect(() => {
    // แอนิเมชันเข้า
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      role="status"
      onClick={onDismiss}
      style={{
        pointerEvents: 'auto',
        background: cfg.bg,
        color: '#fff',
        borderRadius: 14,
        padding: '10px 14px',
        boxShadow: '0 8px 24px rgba(0,0,0,.18)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minWidth: 220,
        maxWidth: 440,
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(.96)',
        opacity: visible ? 1 : 0,
        transition: 'transform .24s cubic-bezier(.4,0,.2,1), opacity .24s',
      }}>
      <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>
        {type === 'loading'
          ? <span className="toast-spinner" />
          : cfg.icon}
      </span>
      <span style={{ flex: 1, lineHeight: 1.4, wordBreak: 'break-word' }}>{message}</span>
      {action && (
        <button
          onClick={e => { e.stopPropagation(); action.onClick?.(); onDismiss(); }}
          style={{
            background: 'rgba(255,255,255,.25)',
            color: '#fff',
            border: 'none',
            padding: '4px 10px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            flexShrink: 0,
          }}>
          {action.label}
        </button>
      )}
      <style>{`
        .toast-spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: toastSpin .7s linear infinite;
        }
        @keyframes toastSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default ToastProvider;
