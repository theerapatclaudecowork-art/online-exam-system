import { useState } from 'react';
import { useApp } from '../context/AppContext';

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

export default function SetupScreen() {
  const { navigate, profile, theme, setTheme, settings, setSettings } = useApp();

  const [timerOn,   setTimerOn]   = useState(settings.useTimer);
  const [timerMin,  setTimerMin]  = useState(settings.timerMin);
  const [numQ,      setNumQ]      = useState(settings.numQ);

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
    <div className="quiz-card rounded-2xl p-6 sm:p-8 animate-fade">

      {/* Profile Row */}
      <div className="flex items-center gap-4 pb-5 mb-5" style={{ borderBottom: '1px solid var(--input-border)' }}>
        <img
          src={profile?.pictureUrl || 'https://i.pinimg.com/originals/be/04/0f/be040f35f073adc3a48c1fba489d2bc4.gif'}
          alt="avatar"
          className="w-16 h-16 rounded-full object-cover shadow-md flex-shrink-0"
        />
        <div className="flex-1">
          <div className="font-bold text-lg" style={{ color: 'var(--text)' }}>{profile?.displayName}</div>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>พร้อมทำแบบทดสอบ</div>
        </div>
        <button
          onClick={() => navigate('history')}
          className="btn btn-yellow rounded-xl px-4 py-2 text-sm flex-shrink-0"
        >
          📊 ประวัติการสอบ
        </button>
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

      <button className="btn btn-primary w-full rounded-xl py-4 text-lg" onClick={goToSubject}>
        ▶&nbsp; เลือกวิชาและเริ่มสอบ
      </button>
    </div>
  );
}
