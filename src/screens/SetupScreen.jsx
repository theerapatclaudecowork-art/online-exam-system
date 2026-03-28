import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { apiGet, apiGetCached } from '../utils/api';

const THEMES = [
  { id: 'sw-white',  cls: '',         bg: '#f8fafc', border: '#cbd5e1', label: 'ขาว' },
  { id: 'sw-dark',   cls: 't-dark',   bg: '#1e293b', border: '',        label: 'ดำ' },
  { id: 'sw-blue',   cls: 't-blue',   bg: '#2563eb', border: '',        label: 'น้ำเงิน' },
  { id: 'sw-green',  cls: 't-green',  bg: '#16a34a', border: '',        label: 'เขียว' },
  { id: 'sw-purple', cls: 't-purple', bg: '#9333ea', border: '',        label: 'ม่วง' },
  { id: 'sw-orange', cls: 't-orange', bg: '#ea580c', border: '',        label: 'ส้ม' },
];

const TIMER_PRESETS = [10, 15, 30, 60, 90];
const Q_PRESETS     = [10, 20, 30, 50];

const ANN_COLORS = {
  info:    { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', icon: 'ℹ️' },
  warning: { bg: '#fffbeb', border: '#fde68a', color: '#92400e', icon: '⚠️' },
  success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', icon: '✅' },
};

export default function SetupScreen() {
  const { navigate, profile, theme, setTheme, settings, setSettings, isAdmin } = useApp();

  const [timerOn,   setTimerOn]   = useState(settings.useTimer);
  const [timerMin,  setTimerMin]  = useState(settings.timerMin);
  const [numQ,      setNumQ]      = useState(settings.numQ);

  // ── PWA Install Prompt ──────────────────────────────────────
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled]         = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    });
    window.addEventListener('appinstalled', () => {
      setInstallPrompt(null);
      setInstalled(true);
    });
  }, []);

  // ── Announcements + ExamSet badge ──────────────────────────────
  const [announcements, setAnnouncements] = useState([]);
  const [pendingSets,   setPendingSets]   = useState(0);  // ExamSet ที่ยังไม่ได้ทำ
  const [totalSets,     setTotalSets]     = useState(0);  // จำนวน ExamSet ทั้งหมด
  const [doneSets,      setDoneSets]      = useState(0);  // ทำแล้ว

  useEffect(() => {
    apiGetCached('getAnnouncements', {}, 5 * 60_000)
      .then(d => { if (d.success) setAnnouncements(d.announcements || []); })
      .catch(() => {});
    apiGet('getExamSets', { userId: profile?.userId })
      .then(d => {
        if (d.success) {
          const sets = d.sets || [];
          const pending = sets.filter(s => s.myAttempts === 0).length;
          const done    = sets.filter(s => s.myAttempts > 0).length;
          setPendingSets(pending);
          setTotalSets(sets.length);
          setDoneSets(done);
        }
      })
      .catch(() => {});
  }, []);

  function handleTimerNum(val) {
    const v = Math.max(1, parseInt(val) || 1);
    setTimerMin(v);
  }
  function handleNumQ(val) {
    const v = Math.max(1, parseInt(val) || 1);
    setNumQ(v);
  }

  function goToSubject() {
    const finalTimer = Math.max(1, timerMin);
    const finalNumQ  = Math.max(1, numQ);
    setSettings({ useTimer: timerOn, timerMin: finalTimer, numQ: finalNumQ });
    navigate('subject');
  }

  return (
    <div className="quiz-card rounded-2xl p-4 sm:p-6 lg:p-8 animate-fade">

      {/* PWA Install Banner */}
      {installPrompt && !installed && (
        <div className="mb-4 flex items-center gap-3 rounded-xl px-3 py-2.5"
          style={{ background:'#eff6ff', border:'1px solid #bfdbfe' }}>
          <span className="text-xl">📱</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold" style={{ color:'#1d4ed8' }}>ติดตั้งแอปบนมือถือ</div>
            <div className="text-xs" style={{ color:'#1d4ed8', opacity:.8 }}>เปิดใช้งานได้เร็วขึ้น ไม่ต้องเปิด Browser</div>
          </div>
          <div className="flex gap-1.5">
            <button className="btn text-xs rounded-lg px-3 py-1.5" style={{ background:'#1d4ed8', color:'white' }}
              onClick={() => { installPrompt.prompt(); installPrompt.userChoice.then(() => setInstallPrompt(null)); }}>
              ติดตั้ง
            </button>
            <button className="btn btn-gray text-xs rounded-lg px-2 py-1.5" onClick={() => setInstallPrompt(null)}>✕</button>
          </div>
        </div>
      )}

      {/* ── Announcements Banner ─────────────────────────── */}
      {announcements.length > 0 && (
        <div className="mb-4 space-y-2">
          {announcements.map(a => {
            const c = ANN_COLORS[a.type] || ANN_COLORS.info;
            return (
              <div key={a.id} className="flex items-start gap-2 rounded-xl px-3 py-2.5"
                style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                <span className="flex-shrink-0 text-base">{c.icon}</span>
                <div className="flex-1 min-w-0">
                  {a.title && <div className="text-xs font-bold truncate" style={{ color: c.color }}>{a.title}</div>}
                  {a.body  && <div className="text-xs mt-0.5" style={{ color: c.color, opacity: .85 }}>{a.body}</div>}
                </div>
                {a.pinned && <span className="text-xs flex-shrink-0" style={{ color: c.color }}>📌</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* Profile Row */}
      <div className="flex items-start gap-3 pb-5 mb-5" style={{ borderBottom: '1px solid var(--input-border)' }}>
        <img
          src={profile?.pictureUrl || 'https://i.pinimg.com/originals/be/04/0f/be040f35f073adc3a48c1fba489d2bc4.gif'}
          alt="avatar"
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover shadow-md flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-base sm:text-lg truncate" style={{ color: 'var(--text)' }}>{profile?.displayName}</div>
          <div className="text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>พร้อมทำแบบทดสอบ</div>
          <div className="flex gap-2 mt-2 flex-wrap">
            <button onClick={() => navigate('history')}
              className="btn btn-yellow rounded-xl px-3 py-1.5 text-xs sm:text-sm">
              📊 ประวัติ
            </button>
            <button onClick={() => navigate('myStats')}
              className="btn rounded-xl px-3 py-1.5 text-xs sm:text-sm"
              style={{ background: '#3b82f6', color: 'white' }}>
              📈 สถิติฉัน
            </button>
            <button onClick={() => navigate('leaderboard')}
              className="btn rounded-xl px-3 py-1.5 text-xs sm:text-sm"
              style={{ background: '#d97706', color: 'white' }}>
              🏆 อันดับ
            </button>
            <button onClick={() => navigate('profile')}
              className="btn btn-gray rounded-xl px-3 py-1.5 text-xs sm:text-sm">
              👤 ข้อมูล
            </button>
            <button onClick={() => navigate('bookmark')}
              className="btn btn-gray rounded-xl px-3 py-1.5 text-xs sm:text-sm">
              🔖 บันทึก
            </button>
            {isAdmin && (
              <button onClick={() => navigate('admin')}
                className="btn rounded-xl px-3 py-1.5 text-xs sm:text-sm"
                style={{ background: 'var(--accent)', color: 'white' }}>
                ⚙️ Admin
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Theme */}
      <div className="mb-5">
        <div className="section-label">🎨 ธีมสี</div>
        <div className="flex flex-wrap gap-3 items-end">
          {THEMES.map(t => (
            <div key={t.id} className="flex flex-col items-center gap-1">
              <div
                className={`swatch ${theme === t.cls ? 'active' : ''}`}
                style={{ background: t.bg, borderColor: t.border || 'transparent' }}
                onClick={() => setTheme(t.cls)}
              />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      <hr className="divider" />

      {/* Timer */}
      <div className="mb-5">
        <div className="section-label">⏱ การจับเวลา</div>
        <div className="flex items-center gap-3 mb-3">
          <label className="toggle">
            <input type="checkbox" checked={timerOn} onChange={e => setTimerOn(e.target.checked)} />
            <span className="toggle-slider" />
          </label>
          <span style={{ fontWeight: 500, color: 'var(--text)' }}>เปิดจับเวลา</span>
        </div>
        <div className="flex items-center gap-3 mb-2" style={{ opacity: timerOn ? 1 : .35, pointerEvents: timerOn ? 'auto' : 'none' }}>
          <input
            type="range" min="5" max="120" value={Math.min(timerMin, 120)}
            className="flex-1"
            onChange={e => setTimerMin(Number(e.target.value))}
          />
          <input
            type="number" min="1" max="999" value={timerMin}
            className="themed-input text-center" style={{ width: 70 }}
            onChange={e => handleTimerNum(e.target.value)}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: 13, whiteSpace: 'nowrap' }}>นาที</span>
        </div>
        <div className="flex gap-2 flex-wrap" style={{ pointerEvents: timerOn ? 'auto' : 'none', opacity: timerOn ? 1 : .35 }}>
          {TIMER_PRESETS.map(v => (
            <button key={v} className="btn btn-gray text-xs rounded-lg px-3 py-1" onClick={() => setTimerMin(v)}>
              {v} น.
            </button>
          ))}
        </div>
      </div>

      <hr className="divider" />

      {/* Question Count */}
      <div className="mb-6">
        <div className="section-label">📝 จำนวนข้อสอบ</div>
        <div className="flex items-center gap-3 mb-1">
          <input
            type="range" min="1" max="100" value={Math.min(numQ, 100)}
            className="flex-1"
            onChange={e => setNumQ(Number(e.target.value))}
          />
          <input
            type="number" min="1" max="9999" value={numQ}
            className="themed-input text-center" style={{ width: 70 }}
            onChange={e => handleNumQ(e.target.value)}
          />
        </div>
        <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>ข้อ</div>
        <div className="flex gap-2 flex-wrap">
          {Q_PRESETS.map(v => (
            <button key={v} className="btn btn-gray text-xs rounded-lg px-3 py-1" onClick={() => setNumQ(v)}>
              {v} ข้อ
            </button>
          ))}
          <button className="btn btn-primary text-xs rounded-lg px-3 py-1" onClick={() => setNumQ(9999)}>
            ทั้งหมด
          </button>
        </div>
      </div>

      {/* ExamSet Progress Bar */}
      {totalSets > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <div className="section-label" style={{ marginBottom: 0 }}>📊 ความก้าวหน้าชุดข้อสอบ</div>
            <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
              {doneSets}/{totalSets} ชุด
            </span>
          </div>
          <div className="rounded-full overflow-hidden" style={{ height: 10, background: 'var(--progress-trk)' }}>
            <div
              style={{
                width: `${Math.round((doneSets / totalSets) * 100)}%`,
                height: '100%',
                background: doneSets === totalSets ? '#22c55e' : 'var(--accent)',
                borderRadius: 999,
                transition: 'width .6s ease',
              }}
            />
          </div>
          <div className="flex justify-between mt-1" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            <span>ทำแล้ว {doneSets} ชุด</span>
            <span>
              {doneSets === totalSets
                ? '🎉 ครบทุกชุดแล้ว!'
                : `เหลืออีก ${pendingSets} ชุด`}
            </span>
          </div>
        </div>
      )}

      {/* ปุ่มหลัก 2 แบบ */}
      <div className="space-y-3">
        <button className="btn w-full rounded-xl py-3 sm:py-4 text-base sm:text-lg font-bold relative"
          style={{ background: 'var(--accent)', color: 'white' }}
          onClick={() => navigate('examSets')}>
          📦&nbsp; เลือกชุดข้อสอบ
          {pendingSets > 0 && (
            <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] flex items-center justify-center rounded-full text-xs font-black px-1.5"
              style={{ background: '#ef4444', color: 'white', animation: 'pulse 1.5s infinite', boxShadow: '0 0 0 3px rgba(239,68,68,.3)' }}>
              {pendingSets}
            </span>
          )}
        </button>
        <button className="btn btn-gray w-full rounded-xl py-2.5 sm:py-3 text-sm sm:text-base"
          onClick={goToSubject}>
          📚&nbsp; เลือกวิชาแยกรายวิชา
        </button>
      </div>
    </div>
  );
}
