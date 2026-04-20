import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { apiGet, lsDel } from '../utils/api';
import { useVisibleInterval } from '../utils/useVisibleInterval';
import { FALLBACK_AVATAR } from '../config';

export default function PendingScreen() {
  const { navigate, profile } = useApp();
  const [status, setStatus]       = useState('pending'); // pending | active | inactive
  const [polling, setPolling]     = useState(true);
  const [dots, setDots]           = useState('');
  const [errCount, setErrCount]   = useState(0);  // จำนวนครั้งที่ poll ล้มเหลว
  const intervalRef = useRef(null);
  const dotsRef     = useRef(null);

  // ── Animated dots ────────────────────────────────────────
  useEffect(() => {
    dotsRef.current = setInterval(() => {
      setDots(p => p.length >= 3 ? '' : p + '.');
    }, 500);
    return () => clearInterval(dotsRef.current);
  }, []);

  // ── Poll status (หยุดอัตโนมัติเมื่อ tab ไม่ active) ────
  const check = async () => {
    if (!profile?.userId || !polling) return;
    try {
      const d = await apiGet('checkUserStatus', { userId: profile.userId });
      if (d.success && d.status === 'active') {
        setStatus('active');
        setPolling(false);
        setErrCount(0);
        lsDel('exam_init_' + profile.userId);
        setTimeout(() => navigate('auth'), 2000);
      } else if (d.success && d.status === 'inactive') {
        setStatus('inactive');
        setPolling(false);
      } else {
        setErrCount(0); // response สำเร็จ reset error
      }
    } catch (_) {
      setErrCount(c => c + 1);
    }
  };
  useEffect(() => { check(); /* eslint-disable-next-line */ }, [profile?.userId]);
  useVisibleInterval(polling ? check : null, polling ? 15_000 : null);

  // ── Status configs ───────────────────────────────────────
  const configs = {
    pending: {
      icon: '⏳',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      title: 'รอการอนุมัติ',
      sub: 'ระบบได้รับข้อมูลของคุณแล้ว',
      color: '#92400e',
      bg: '#fffbeb',
      border: '#fcd34d',
    },
    active: {
      icon: '✅',
      gradient: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
      title: 'อนุมัติแล้ว!',
      sub: 'กำลังเข้าสู่ระบบ...',
      color: '#15803d',
      bg: '#f0fdf4',
      border: '#86efac',
    },
    inactive: {
      icon: '❌',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      title: 'การสมัครถูกปฏิเสธ',
      sub: 'กรุณาติดต่อผู้ดูแลระบบ',
      color: '#991b1b',
      bg: '#fef2f2',
      border: '#fca5a5',
    },
  };

  const c = configs[status];

  return (
    <div className="quiz-card no-hover rounded-2xl overflow-hidden animate-fade"
      style={{ border: `2px solid ${c.border}` }}>

      {/* Gradient header */}
      <div style={{
        background: c.gradient,
        padding: '32px 20px', textAlign: 'center', color: '#fff',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,.1)' }} />
        <div style={{ position: 'absolute', bottom: -30, left: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />

        {/* Animated icon */}
        <div style={{
          fontSize: 64, lineHeight: 1, marginBottom: 12,
          animation: status === 'pending' ? 'pulse 2s infinite' : 'none',
        }}>
          {c.icon}
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{c.title}</h1>
        <p style={{ fontSize: 14, opacity: .85, marginTop: 6 }}>{c.sub}</p>
      </div>

      {/* Body */}
      <div style={{ padding: '24px 20px', background: c.bg }}>

        {/* Profile card */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: 16, borderRadius: 16,
          background: 'white', border: '1px solid var(--card-border)',
          boxShadow: '0 2px 8px rgba(0,0,0,.04)',
          marginBottom: 20,
        }}>
          <img
            src={profile?.pictureUrl || FALLBACK_AVATAR}
            alt="profile"
            style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>
              {profile?.displayName || 'ผู้สมัคร'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              LINE Account เชื่อมต่อแล้ว
            </div>
          </div>
          <div style={{
            marginLeft: 'auto', padding: '4px 10px', borderRadius: 99,
            fontSize: 11, fontWeight: 700,
            background: status === 'active' ? '#dcfce7' : status === 'inactive' ? '#fee2e2' : '#fef3c7',
            color: status === 'active' ? '#15803d' : status === 'inactive' ? '#dc2626' : '#92400e',
          }}>
            {status === 'active' ? 'อนุมัติแล้ว' : status === 'inactive' ? 'ปฏิเสธ' : 'รออนุมัติ'}
          </div>
        </div>

        {/* Pending info */}
        {status === 'pending' && (
          <>
            {/* Polling indicator / error */}
            {errCount >= 3 ? (
              <div style={{
                padding: 14, borderRadius: 12, marginBottom: 16,
                background: '#fef2f2', border: '1px solid #fca5a5', textAlign: 'center',
              }}>
                <div style={{ fontSize: 13, color: '#b91c1c', fontWeight: 700, marginBottom: 8 }}>
                  ❌ ไม่สามารถเชื่อมต่อได้ ({errCount} ครั้ง)
                </div>
                <div style={{ fontSize: 12, color: '#991b1b', marginBottom: 12 }}>
                  ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต แล้วลองใหม่
                </div>
                <button
                  onClick={() => { setErrCount(0); check(); }}
                  style={{
                    padding: '8px 20px', borderRadius: 10, border: 'none',
                    background: '#ef4444', color: '#fff', fontWeight: 700,
                    fontSize: 13, cursor: 'pointer',
                  }}>
                  🔄 ลองใหม่
                </button>
              </div>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: 14, borderRadius: 12,
                background: '#fff', border: '1px dashed #fbbf24',
                marginBottom: 16,
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: '#f59e0b',
                  animation: 'pulse 1.5s infinite',
                }} />
                <span style={{ fontSize: 13, color: '#92400e', fontWeight: 600 }}>
                  กำลังตรวจสอบสถานะ{dots}
                </span>
              </div>
            )}

            {/* Steps */}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 12,
              padding: 16, borderRadius: 14,
              background: '#fff', border: '1px solid #fde68a',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>
                ขั้นตอนถัดไป
              </div>
              {[
                { icon: '✅', text: 'ส่งข้อมูลสมัครสมาชิกแล้ว', done: true },
                { icon: '📩', text: 'แจ้งผู้ดูแลระบบแล้ว (Telegram)', done: true },
                { icon: '⏳', text: 'รอผู้ดูแลระบบตรวจสอบและอนุมัติ', done: false },
                { icon: '🎉', text: 'เข้าใช้งานระบบได้ทันที', done: false },
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14,
                    background: step.done ? '#dcfce7' : '#f1f5f9',
                    border: `1.5px solid ${step.done ? '#86efac' : '#e2e8f0'}`,
                  }}>
                    {step.icon}
                  </div>
                  <span style={{
                    fontSize: 13,
                    color: step.done ? '#15803d' : '#64748b',
                    fontWeight: step.done ? 600 : 400,
                    textDecoration: step.done ? 'none' : 'none',
                  }}>
                    {step.text}
                  </span>
                </div>
              ))}
            </div>

            {/* Note */}
            <div style={{
              marginTop: 16, padding: 12, borderRadius: 10,
              background: '#fef3c7', fontSize: 12, color: '#92400e',
              textAlign: 'center', lineHeight: 1.6,
            }}>
              💡 หน้านี้จะอัปเดตอัตโนมัติทุก 10 วินาที<br/>
              เมื่อได้รับอนุมัติ จะเข้าสู่ระบบทันที
            </div>
          </>
        )}

        {/* Approved celebration */}
        {status === 'active' && (
          <div style={{
            textAlign: 'center', padding: 20, borderRadius: 14,
            background: '#fff', border: '1px solid #86efac',
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#15803d', marginBottom: 4 }}>
              ยินดีต้อนรับเข้าสู่ระบบ!
            </div>
            <div style={{ fontSize: 13, color: '#16a34a' }}>
              กำลังนำทางไปหน้าหลัก...
            </div>
            <div className="spinner" style={{ margin: '12px auto 0', borderColor: '#86efac', borderTopColor: '#16a34a' }} />
          </div>
        )}

        {/* Rejected */}
        {status === 'inactive' && (
          <div style={{
            textAlign: 'center', padding: 20, borderRadius: 14,
            background: '#fff', border: '1px solid #fca5a5',
          }}>
            <div style={{ fontSize: 14, color: '#991b1b', lineHeight: 1.7 }}>
              ผู้ดูแลระบบปฏิเสธการสมัครสมาชิก<br/>
              กรุณาติดต่อผู้ดูแลระบบเพื่อสอบถามเพิ่มเติม
            </div>
            <button
              onClick={() => navigate('auth')}
              style={{
                marginTop: 16, padding: '10px 24px', borderRadius: 10,
                background: '#ef4444', color: '#fff', border: 'none',
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}
            >
              กลับหน้าแรก
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
