// ─────────────────────────────────────────────────────────────────
//  ExamSettingsSheet
//  Bottom-sheet ตั้งค่าการสอบ — ใช้ร่วมกัน SubjectScreen + ExamSetScreen
// ─────────────────────────────────────────────────────────────────
import { useState } from 'react';

const TIMER_PRESETS = [10, 15, 30, 60, 90];
const Q_PRESETS     = [10, 20, 30, 50];

/**
 * Props:
 *  title       — ชื่อวิชา / ชุดข้อสอบ
 *  subtitle    — ข้อมูลเพิ่มเติม (จำนวนข้อ, etc.)
 *  icon        — emoji icon (optional)
 *
 *  showTimer   — แสดงส่วนตั้งค่าเวลา (default true)
 *  timerFixed  — ถ้า set มีเวลาตายตัว ส่ง > 0 → ไม่ให้แก้ไข
 *  showNumQ    — แสดงส่วนตั้งค่าจำนวนข้อ (default true)
 *
 *  initUseTimer — ค่าเริ่มต้น toggle
 *  initTimerMin — ค่าเริ่มต้นนาที
 *  initNumQ     — ค่าเริ่มต้นจำนวนข้อ
 *
 *  onConfirm(cfg) — callback เมื่อยืนยัน → { useTimer, timerMin, numQ }
 *  onCancel()     — callback เมื่อยกเลิก
 *
 *  confirmLabel — ข้อความปุ่มยืนยัน (default "🚀 เริ่มสอบเลย")
 */
export default function ExamSettingsSheet({
  title,
  subtitle,
  icon = '📝',
  showTimer   = true,
  timerFixed  = 0,     // > 0 = ล็อกค่า ไม่ให้แก้
  showNumQ    = true,
  initUseTimer = true,
  initTimerMin = 30,
  initNumQ     = 20,
  onConfirm,
  onCancel,
  confirmLabel = '🚀 เริ่มสอบเลย',
}) {
  const [useTimer, setUseTimer] = useState(initUseTimer);
  const [timerMin, setTimerMin] = useState(initTimerMin);
  const [numQ,     setNumQ]     = useState(initNumQ);

  function handleConfirm() {
    onConfirm({
      useTimer: timerFixed > 0 ? true : useTimer,
      timerMin: timerFixed > 0 ? timerFixed : Math.max(1, timerMin),
      numQ:     Math.max(1, numQ),
    });
  }

  return (
    <>
      {/* ── Backdrop ───────────────────────────────────────── */}
      <div
        onClick={onCancel}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,.45)',
          backdropFilter: 'blur(2px)',
          animation: 'fadeIn .2s ease',
        }}
      />

      {/* ── Centered Modal ──────────────────────────────────── */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1001,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}>
        <div style={{
          width: '100%', maxWidth: 420,
          background: 'var(--card)',
          borderRadius: 24,
          boxShadow: '0 20px 60px rgba(0,0,0,.25)',
          maxHeight: '85vh',
          overflowY: 'auto',
          animation: 'scaleIn .25s cubic-bezier(.4,0,.2,1)',
        }}>

        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--input-border)' }} />
        </div>

        <div style={{ padding: '14px 20px 20px' }}>

          {/* ── Title ───────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: 'var(--accent)', opacity: 0.9,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24,
            }}>{icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontWeight: 800, fontSize: 16, color: 'var(--text)',
                lineHeight: 1.3, marginBottom: 3,
              }}>{title}</div>
              {subtitle && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{subtitle}</div>
              )}
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--card-border)', marginBottom: 18 }} />

          {/* ── Timer (fixed) ────────────────────────────── */}
          {showTimer && timerFixed > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .5 }}>
                ⏱ เวลา
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 12,
                background: '#eff6ff', border: '1.5px solid #bfdbfe',
              }}>
                <span style={{ fontSize: 22 }}>⏱</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1e40af' }}>
                    {timerFixed} นาที
                  </div>
                  <div style={{ fontSize: 11, color: '#3b82f6' }}>กำหนดโดยชุดข้อสอบ</div>
                </div>
              </div>
            </div>
          )}

          {/* ── Timer (user-configurable) ────────────────── */}
          {showTimer && timerFixed === 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .5 }}>
                ⏱ การจับเวลา
              </div>

              {/* Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <label className="toggle" style={{ flexShrink: 0 }}>
                  <input type="checkbox" checked={useTimer} onChange={e => setUseTimer(e.target.checked)} />
                  <span className="toggle-slider" />
                </label>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                  {useTimer ? 'เปิดจับเวลา' : 'ปิดจับเวลา'}
                </span>
              </div>

              {/* Slider + input */}
              <div style={{ opacity: useTimer ? 1 : .35, pointerEvents: useTimer ? 'auto' : 'none', transition: 'opacity .2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <input type="range" min="5" max="120" value={Math.min(timerMin, 120)}
                    className="flex-1"
                    style={{ flex: 1 }}
                    onChange={e => setTimerMin(Number(e.target.value))} />
                  <input
                    type="number" min="1" max="999" value={timerMin}
                    className="themed-input text-center"
                    style={{ width: 60, textAlign: 'center' }}
                    onChange={e => setTimerMin(Math.max(1, parseInt(e.target.value) || 1))} />
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>นาที</span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {TIMER_PRESETS.map(v => (
                    <button key={v}
                      onClick={() => setTimerMin(v)}
                      style={{
                        padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
                        background: timerMin === v ? 'var(--accent)' : 'var(--input-bg)',
                        color:      timerMin === v ? 'white' : 'var(--text-muted)',
                        fontWeight: 700, fontSize: 12,
                        border: `1.5px solid ${timerMin === v ? 'var(--accent)' : 'var(--input-border)'}`,
                        transition: 'all .15s',
                      }}>
                      {v} น.
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Number of Questions ──────────────────────── */}
          {showNumQ && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .5 }}>
                📝 จำนวนข้อสอบ
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <input type="range" min="1" max="100" value={Math.min(numQ, 100)}
                  style={{ flex: 1 }}
                  onChange={e => setNumQ(Number(e.target.value))} />
                <input
                  type="number" min="1" max="9999" value={numQ}
                  className="themed-input text-center"
                  style={{ width: 60, textAlign: 'center' }}
                  onChange={e => setNumQ(Math.max(1, parseInt(e.target.value) || 1))} />
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>ข้อ</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Q_PRESETS.map(v => (
                  <button key={v}
                    onClick={() => setNumQ(v)}
                    style={{
                      padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
                      background: numQ === v ? 'var(--accent)' : 'var(--input-bg)',
                      color:      numQ === v ? 'white' : 'var(--text-muted)',
                      fontWeight: 700, fontSize: 12,
                      border: `1.5px solid ${numQ === v ? 'var(--accent)' : 'var(--input-border)'}`,
                      transition: 'all .15s',
                    }}>
                    {v} ข้อ
                  </button>
                ))}
                <button
                  onClick={() => setNumQ(9999)}
                  style={{
                    padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
                    background: numQ === 9999 ? 'var(--accent)' : 'var(--input-bg)',
                    color:      numQ === 9999 ? 'white' : 'var(--text-muted)',
                    fontWeight: 700, fontSize: 12,
                    border: `1.5px solid ${numQ === 9999 ? 'var(--accent)' : 'var(--input-border)'}`,
                    transition: 'all .15s',
                  }}>
                  ทั้งหมด
                </button>
              </div>
            </div>
          )}

          {/* ── Buttons ─────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onCancel}
              style={{
                flex: '0 0 auto', padding: '13px 18px', borderRadius: 14,
                border: '1.5px solid var(--input-border)',
                background: 'transparent', color: 'var(--text-muted)',
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}>
              ยกเลิก
            </button>
            <button
              onClick={handleConfirm}
              style={{
                flex: 1, padding: '13px 0', borderRadius: 14, border: 'none',
                background: 'var(--accent)', color: 'white',
                fontWeight: 800, fontSize: 15, cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(99,102,241,.35)',
                transition: 'transform .12s, box-shadow .12s',
              }}
              onTouchStart={e => { e.currentTarget.style.transform = 'scale(.97)'; }}
              onTouchEnd={e => { e.currentTarget.style.transform = ''; }}>
              {confirmLabel}
            </button>
          </div>

        </div>
        </div>
      </div>

      <style>{`
        @keyframes scaleIn {
          from { transform: scale(.9); opacity: 0; }
          to   { transform: scale(1);  opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
}
