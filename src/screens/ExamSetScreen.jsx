// ─────────────────────────────────────────────────────────────
//  ExamSetScreen — User: เลือกชุดข้อสอบและเริ่มสอบ
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useApp } from '../context/AppContext';
import { apiGet, apiGetCached } from '../utils/api';
import Spinner from '../components/Spinner';

const VIS_ICON = { public: '🌐', private: '🔒' };

function SetCard({ set, onStart, loading }) {
  const totalQ    = set.subjects.reduce((s, sub) => s + Number(sub.numQ || 0), 0);
  const hasTimer  = set.timerMin > 0;
  const hasLimit  = set.maxAttempts > 0;

  return (
    <div className="quiz-card rounded-2xl p-4 sm:p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="text-3xl flex-shrink-0">📦</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-base" style={{ color: 'var(--text)' }}>{set.setName}</div>
          {set.description && (
            <div className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{set.description}</div>
          )}
        </div>
        <span className="text-sm flex-shrink-0">{VIS_ICON[set.visibility] || ''}</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center rounded-xl py-2" style={{ background: 'var(--input-bg)' }}>
          <div className="text-base font-black" style={{ color: 'var(--accent)' }}>{set.subjectCount}</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>วิชา</div>
        </div>
        <div className="text-center rounded-xl py-2" style={{ background: 'var(--input-bg)' }}>
          <div className="text-base font-black" style={{ color: '#3b82f6' }}>{totalQ === 0 ? '∞' : totalQ}</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>ข้อสอบ</div>
        </div>
        <div className="text-center rounded-xl py-2" style={{ background: 'var(--input-bg)' }}>
          <div className="text-base font-black" style={{ color: '#f59e0b' }}>
            {hasTimer ? set.timerMin + 'น.' : '—'}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>เวลา</div>
        </div>
      </div>

      {/* Subject chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {set.subjects.map((s, i) => (
          <span key={i} className="text-xs px-2.5 py-1 rounded-lg font-medium"
            style={{ background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--input-border)' }}>
            {s.name}
            {s.numQ > 0 && <span style={{ color: 'var(--text-muted)' }}> ({s.numQ} ข้อ)</span>}
          </span>
        ))}
      </div>

      {/* Extra badges */}
      <div className="flex flex-wrap gap-2 mb-4 text-xs">
        <span className="px-2 py-0.5 rounded-full"
          style={{ background: 'var(--input-bg)', color: 'var(--text-muted)' }}>
          🎯 ผ่าน {set.passThreshold}%
        </span>
        {hasLimit && (
          <span className="px-2 py-0.5 rounded-full"
            style={{ background: '#fef9c3', color: '#854d0e' }}>
            🔁 จำกัด {set.maxAttempts} ครั้ง
          </span>
        )}
        {set.myAttempts === 0 ? (
          <span className="px-2 py-0.5 rounded-full font-semibold animate-pulse"
            style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
            🆕 ยังไม่ได้ทำ
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full"
            style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
            ✅ ทำแล้ว {set.myAttempts} ครั้ง
            {set.myBestScore > 0 && ` • สูงสุด ${set.myBestScore}%`}
          </span>
        )}
      </div>

      {/* Schedule status */}
      {set.scheduleStatus && set.scheduleStatus !== 'always' && (() => {
        const cfgMap = {
          upcoming: { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', text: `🕐 เปิดสอบ ${set.startDate}` },
          expired:  { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c', text: '⛔ หมดเวลาสอบแล้ว' },
          active:   set.endDate ? { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', text: `✅ สอบได้ถึง ${set.endDate}` } : null,
        };
        const cfg = cfgMap[set.scheduleStatus];
        if (!cfg) return null;
        return (
          <div className="text-xs px-3 py-2 rounded-xl mb-3"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, fontWeight: 600 }}>
            {cfg.text}
          </div>
        );
      })()}

      <button
        className="btn btn-primary w-full rounded-xl py-3 text-base font-bold"
        onClick={() => onStart(set)}
        disabled={loading || set.scheduleStatus === 'upcoming' || set.scheduleStatus === 'expired'}>
        {loading ? '⏳ กำลังโหลดข้อสอบ...'
         : set.scheduleStatus === 'upcoming' ? '🔒 ยังไม่ถึงเวลาสอบ'
         : set.scheduleStatus === 'expired'  ? '🔒 หมดเวลาสอบแล้ว'
         : '▶ เริ่มทำข้อสอบชุดนี้'}
      </button>
    </div>
  );
}

export default function ExamSetScreen() {
  const { navigate, profile, settings, setSettings, exam, setExam } = useApp();
  const [sets, setSets]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [startingId, setStartingId] = useState(null);

  useEffect(() => {
    loadSets();
  }, []);

  async function loadSets() {
    setLoading(true);
    try {
      const data = await apiGet('getExamSets', { userId: profile.userId });
      if (!data.success) throw new Error(data.message);
      setSets(data.sets || []);
    } catch (e) {
      Swal.fire('เกิดข้อผิดพลาด', e.message || 'โหลดชุดข้อสอบไม่สำเร็จ', 'error');
      navigate('setup');
    } finally { setLoading(false); }
  }

  async function handleStart(set) {
    setStartingId(set.setId);
    try {
      navigate('loading-quiz');
      const data = await apiGet('getExamSetQuestions', { setId: set.setId, userId: profile.userId });
      if (!data.success) throw new Error(data.message);
      if (!data.questions?.length) throw new Error('ไม่มีข้อสอบในชุดนี้');

      // ใช้ timerMin จาก set (override settings)
      const useTimer = set.timerMin > 0;
      const timerMin = set.timerMin > 0 ? set.timerMin : settings.timerMin;
      setSettings(prev => ({ ...prev, useTimer, timerMin }));

      setExam(prev => ({
        ...prev,
        lesson:        set.setName,       // ชื่อชุดข้อสอบ
        setId:         set.setId,
        allQ:          data.questions,
        passThreshold: set.passThreshold,
      }));
      navigate('quiz');
    } catch (e) {
      Swal.fire('เกิดข้อผิดพลาด', e.message || 'โหลดข้อสอบไม่สำเร็จ', 'error');
      navigate('examSets');
    } finally { setStartingId(null); }
  }

  if (loading) return <Spinner label="กำลังโหลดชุดข้อสอบ..." />;

  return (
    <div className="animate-fade">
      {/* Header */}
      <div className="quiz-card no-hover rounded-2xl p-3 sm:p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base sm:text-lg" style={{ color: 'var(--text)' }}>📦 เลือกชุดข้อสอบ</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>มี {sets.length} ชุดสำหรับคุณ</p>
          </div>
          <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5"
            onClick={() => navigate('setup')}>← กลับ</button>
        </div>
      </div>

      {sets.length === 0 ? (
        <div className="quiz-card no-hover rounded-2xl p-10 text-center">
          <div className="text-4xl mb-3">📭</div>
          <div className="font-semibold mb-1" style={{ color: 'var(--text)' }}>ยังไม่มีชุดข้อสอบสำหรับคุณ</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>กรุณาติดต่อผู้ดูแลระบบ</div>
          <button className="btn btn-primary mt-4 rounded-xl px-6 py-2 text-sm"
            onClick={() => navigate('subject')}>📚 ทำข้อสอบแบบเลือกวิชา</button>
        </div>
      ) : (
        <div className="space-y-4">
          {sets.map(set => (
            <SetCard key={set.setId} set={set}
              loading={startingId === set.setId}
              onStart={handleStart} />
          ))}
        </div>
      )}
    </div>
  );
}
