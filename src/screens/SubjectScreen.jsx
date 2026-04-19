import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { useApp } from '../context/AppContext';
import { apiGetCached } from '../utils/api';
import Spinner from '../components/Spinner';
import ExamSettingsSheet from '../components/ExamSettingsSheet';

const Q_CACHE_TTL = 3 * 60 * 1000;

// ── Circular Progress Ring ────────────────────────────────────
function ProgressRing({ pct = 0, size = 52, stroke = 5 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const color = pct >= 80 ? '#16a34a' : pct >= 40 ? '#3b82f6' : '#cbd5e1';
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .6s ease' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: color, lineHeight: 1 }}>{pct}%</span>
        <span style={{ fontSize: 8, color: '#9ca3af', marginTop: 1 }}>ทำแล้ว</span>
      </div>
    </div>
  );
}

export default function SubjectScreen() {
  const { navigate, settings, setSettings, setExam, subjects: ctxSubjects, setSubjects, isAdmin, isTeacher, userCourse } = useApp();
  const [subjects, setLocal]  = useState(ctxSubjects || []);
  const [loading,  setLoading] = useState(!ctxSubjects?.length);
  const [mode, setMode] = useState('quiz'); // 'quiz' | 'study'
  const [search, setSearch] = useState('');

  // ── เปิด/ปิด settings sheet ───────────────────────────────
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (ctxSubjects?.length) { setLocal(ctxSubjects); setLoading(false); return; }
    (async () => {
      try {
        const data = await apiGetCached('getSubjects', {}, 5 * 60_000);
        if (!data.success || !data.subjects?.length) {
          await Swal.fire('ไม่พบรายวิชา', 'กรุณาเพิ่มข้อมูลใน Google Sheet', 'warning');
          navigate('setup'); return;
        }
        setLocal(data.subjects);
        setSubjects(data.subjects);
      } catch {
        await Swal.fire('เกิดข้อผิดพลาด', 'โหลดรายวิชาไม่สำเร็จ', 'error');
        navigate('setup');
      } finally { setLoading(false); }
    })();
  }, []);

  // บันทึก settings จาก sheet แล้วปิด
  function handleSettingsSave(cfg) {
    setSettings({ useTimer: cfg.useTimer, timerMin: cfg.timerMin, numQ: cfg.numQ });
    setShowSettings(false);
  }

  // กดวิชา → เริ่มสอบทันที (ใช้ settings ที่ตั้งไว้แล้ว)
  async function pickSubject(name) {
    navigate('loading-quiz');
    try {
      const api = mode === 'study' ? 'getStudyQuestions' : 'getQuestions';
      const data = await apiGetCached(api, { lesson: name }, Q_CACHE_TTL);
      if (!Array.isArray(data) || !data.length) throw new Error('ไม่พบข้อสอบในวิชานี้');
      setExam(prev => ({ ...prev, lesson: name, allQ: data }));
      navigate(mode === 'study' ? 'study' : 'quiz');
    } catch (e) {
      await Swal.fire('เกิดข้อผิดพลาด', e.message || 'โหลดข้อสอบไม่สำเร็จ', 'error');
      navigate('subject');
    }
  }

  if (loading) return <Spinner label="กำลังโหลดรายวิชา..." />;

  // กรองวิชาตาม isEnabled + หลักสูตรของ user (admin/teacher เห็นทุกวิชา)
  const visibleSubjects = (isAdmin || isTeacher)
    ? subjects
    : subjects.filter(sub => {
        if (sub.isEnabled === false) return false;
        if (sub.courses?.length > 0 && userCourse) {
          return sub.courses.includes(userCourse);
        }
        return true;
      });

  const totalQ = visibleSubjects.reduce((s, sub) => s + (sub.questionCount || 0), 0);

  // สรุปค่าตั้งค่าปัจจุบัน
  const settingSummary = settings.useTimer
    ? `⏱ ${settings.timerMin} น. · 📝 ${settings.numQ === 9999 ? 'ทั้งหมด' : settings.numQ + ' ข้อ'}`
    : `⏱ ไม่จับเวลา · 📝 ${settings.numQ === 9999 ? 'ทั้งหมด' : settings.numQ + ' ข้อ'}`;

  return (
    <div className="animate-fade">

      {/* ── Settings Sheet ───────────────────────────── */}
      {showSettings && (
        <ExamSettingsSheet
          title="ตั้งค่าการสอบ"
          subtitle="ใช้กับทุกวิชาในโหมดจำลองการสอบ"
          icon="⚙️"
          showTimer={true}
          timerFixed={0}
          showNumQ={true}
          initUseTimer={settings.useTimer}
          initTimerMin={settings.timerMin}
          initNumQ={settings.numQ}
          confirmLabel="✅ บันทึกการตั้งค่า"
          onConfirm={handleSettingsSave}
          onCancel={() => setShowSettings(false)}
        />
      )}

      {/* ── Header ─────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 4px', marginBottom: 12,
      }}>
        <button onClick={() => navigate('setup')}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text)', padding: 4 }}>
          ‹
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)' }}>คลังข้อสอบ</div>
        </div>
        {/* ⚙️ ปุ่มตั้งค่าการสอบ — ใช้เฉพาะ quiz mode */}
        {mode === 'quiz' ? (
          <button
            onClick={() => setShowSettings(true)}
            title="ตั้งค่าการสอบ"
            style={{
              background: 'var(--input-bg)',
              border: '1.5px solid var(--input-border)',
              borderRadius: 10, padding: '5px 10px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              color: 'var(--text-muted)', fontSize: 13, fontWeight: 700,
              transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--input-border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
            ⚙️
          </button>
        ) : (
          <div style={{ width: 36 }} />
        )}
      </div>

      {/* ── Mode Toggle ────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 0, borderRadius: 12, overflow: 'hidden',
        border: '2px solid var(--input-border)', marginBottom: 10,
      }}>
        {[
          { key: 'quiz',  label: 'จำลองการสอบ', icon: '✏️' },
          { key: 'study', label: 'ตะลุยข้อสอบ', icon: '📖' },
        ].map(m => (
          <button key={m.key}
            onClick={() => setMode(m.key)}
            style={{
              flex: 1, padding: '10px 8px', border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 13,
              background: mode === m.key ? 'var(--accent)' : 'var(--card)',
              color: mode === m.key ? 'white' : 'var(--text-muted)',
              transition: 'all .2s',
            }}>
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* ── Settings Summary Bar (quiz mode) ────────── */}
      {mode === 'quiz' && (
        <button
          onClick={() => setShowSettings(true)}
          style={{
            width: '100%', marginBottom: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '9px 14px', borderRadius: 12, cursor: 'pointer',
            background: 'var(--input-bg)',
            border: '1.5px solid var(--input-border)',
            transition: 'border-color .15s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--input-border)'}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15 }}>⚙️</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>ตั้งค่าการสอบ</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)' }}>
              {settingSummary}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>›</span>
          </div>
        </button>
      )}

      {/* ── Search ──────────────────────────────────── */}
      <input
        className="themed-input w-full text-sm"
        placeholder="🔍 ค้นหาวิชา..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 14 }}
      />

      {/* ── Summary ────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={{
          flex: 1, background: 'var(--card)', borderRadius: 14,
          padding: '10px 14px', border: '1px solid var(--card-border)',
          boxShadow: 'var(--shadow)',
        }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>{visibleSubjects.length}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>รายวิชา</div>
        </div>
        <div style={{
          flex: 1, background: 'var(--card)', borderRadius: 14,
          padding: '10px 14px', border: '1px solid var(--card-border)',
          boxShadow: 'var(--shadow)',
        }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b' }}>{totalQ.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ข้อสอบทั้งหมด</div>
        </div>
      </div>

      {/* ── Subject Cards ──────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {visibleSubjects
          .filter(s => !search.trim() || s.name.toLowerCase().includes(search.trim().toLowerCase()))
          .map((s, i) => {
            const pct      = s.progressPct || 0;
            const setCount = s.setCount    || 0;
            return (
              <button key={s.name}
                onClick={() => pickSubject(s.name)}
                className="anim-slide-up"
                style={{
                  width: '100%', textAlign: 'left', cursor: 'pointer',
                  background: 'var(--card)', borderRadius: 16,
                  border: '1px solid var(--card-border)',
                  boxShadow: 'var(--shadow)',
                  padding: '14px 14px', display: 'flex', alignItems: 'center', gap: 12,
                  transition: 'transform .15s, box-shadow .15s',
                  animationDelay: `${i * 0.04}s`,
                }}
                onTouchStart={e => e.currentTarget.style.transform = 'scale(.98)'}
                onTouchEnd={e => e.currentTarget.style.transform = ''}>

                {/* Left: info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 700, fontSize: 15, color: 'var(--text)',
                    lineHeight: 1.3, marginBottom: 8,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>{s.name}</div>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {setCount > 0 && (
                      <span style={{
                        display: 'inline-block', fontSize: 11, fontWeight: 700,
                        background: '#fef3c7', color: '#92400e',
                        borderRadius: 8, padding: '3px 8px',
                      }}>ข้อสอบ {setCount} ชุด</span>
                    )}
                    <span style={{
                      display: 'inline-block', fontSize: 11, fontWeight: 700,
                      background: '#fed7aa', color: '#9a3412',
                      borderRadius: 8, padding: '3px 8px',
                    }}>{(s.questionCount || 0).toLocaleString()} ข้อ</span>
                  </div>
                </div>

                {/* Right: progress ring */}
                <ProgressRing pct={pct} />
              </button>
            );
          })}
      </div>
    </div>
  );
}
