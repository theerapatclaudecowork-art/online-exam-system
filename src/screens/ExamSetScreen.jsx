// ─────────────────────────────────────────────────────────────
//  ExamSetScreen — User: เลือกชุดข้อสอบและเริ่มสอบ
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useApp } from '../context/AppContext';
import { apiGet } from '../utils/api';
import Spinner from '../components/Spinner';
import ExamSettingsSheet from '../components/ExamSettingsSheet';

// ── Color palette per card index ──────────────────────────────
const CARD_COLORS = [
  { bg: '#fff8e1', accent: '#f59e0b', light: '#fef3c7' },
  { bg: '#e8f5e9', accent: '#16a34a', light: '#dcfce7' },
  { bg: '#e3f2fd', accent: '#2563eb', light: '#dbeafe' },
  { bg: '#f3e5f5', accent: '#9333ea', light: '#f5f3ff' },
  { bg: '#fff3e0', accent: '#ea580c', light: '#fed7aa' },
  { bg: '#e0f7fa', accent: '#0891b2', light: '#cffafe' },
];

function SetCard({ set, index, onStart, onLeaderboard, loading }) {
  const totalQ      = set.subjects.reduce((s, sub) => s + Number(sub.numQ || 0), 0);
  const hasTimer    = set.timerMin > 0;
  const hasLimit    = set.maxAttempts > 0;
  const limitReached = hasLimit && (set.myAttempts || 0) >= set.maxAttempts;
  const palette     = CARD_COLORS[index % CARD_COLORS.length];
  const disabled    = loading || set.scheduleStatus === 'upcoming' || set.scheduleStatus === 'expired' || limitReached;

  return (
    <div style={{
      background: palette.bg, borderRadius: 20, padding: '20px 18px',
      border: `2px solid ${palette.accent}22`,
      boxShadow: `0 2px 12px ${palette.accent}11`,
    }}>
      {/* Assigned badge */}
      {set.isAssigned && !set.myPassed && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 10px', borderRadius: 99, marginBottom: 8,
          background: '#fef3c7', border: '1.5px solid #f59e0b',
          fontSize: 11, fontWeight: 700, color: '#92400e',
        }}>
          📋 มอบหมาย{set.myAttempts > 0 ? ' — ยังไม่ผ่าน' : ''}
        </div>
      )}

      {/* Title */}
      <div style={{
        fontWeight: 800, fontSize: 18, color: '#1e293b',
        lineHeight: 1.3, marginBottom: 6,
      }}>{set.setName}</div>

      {set.description && (
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10, lineHeight: 1.4 }}>
          {set.description}
        </div>
      )}

      {/* Stats badges */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{
          fontSize: 13, fontWeight: 700, color: palette.accent,
          background: 'rgba(255,255,255,.7)', borderRadius: 10, padding: '5px 12px',
          border: `1.5px solid ${palette.accent}33`,
        }}>
          จำนวน {totalQ === 0 ? '∞' : totalQ} ข้อ
        </span>
        {hasTimer && (
          <span style={{
            fontSize: 13, fontWeight: 700, color: '#64748b',
            background: 'rgba(255,255,255,.7)', borderRadius: 10, padding: '5px 12px',
            border: '1.5px solid #e2e8f0',
          }}>
            ⏱ {set.timerMin} นาที
          </span>
        )}
        <span style={{
          fontSize: 13, fontWeight: 700, color: '#64748b',
          background: 'rgba(255,255,255,.7)', borderRadius: 10, padding: '5px 12px',
          border: '1.5px solid #e2e8f0',
        }}>
          🎯 ผ่าน {set.passThreshold}%
        </span>
      </div>

      {/* Subject chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {set.subjects.map((s, i) => (
          <span key={i} style={{
            fontSize: 11, fontWeight: 600, color: '#475569',
            background: 'white', borderRadius: 8, padding: '3px 10px',
            border: '1px solid #e2e8f0',
          }}>
            {s.name} {s.numQ > 0 ? `(${s.numQ})` : ''}
          </span>
        ))}
      </div>

      {/* Extra info row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14, fontSize: 11 }}>
        {hasLimit && (
          <span style={{
            fontWeight: 700, borderRadius: 8, padding: '3px 10px',
            background: limitReached ? '#fee2e2' : palette.light,
            color: limitReached ? '#b91c1c' : palette.accent,
          }}>
            🔁 {set.myAttempts || 0}/{set.maxAttempts} ครั้ง
          </span>
        )}
        {set.hasPin && (
          <span style={{ fontWeight: 600, borderRadius: 8, padding: '3px 10px', background: '#f5f3ff', color: '#7c3aed' }}>
            🔑 ต้องใส่ PIN
          </span>
        )}
        {set.myAttempts > 0 && set.myBestScore > 0 && (
          <span style={{ fontWeight: 700, borderRadius: 8, padding: '3px 10px', background: '#dcfce7', color: '#15803d' }}>
            สูงสุด {set.myBestScore}%
          </span>
        )}
      </div>

      {/* Schedule banner */}
      {set.scheduleStatus && set.scheduleStatus !== 'always' && (() => {
        const cfgMap = {
          upcoming: { bg: '#dbeafe', color: '#1d4ed8', text: `🕐 เปิดสอบ ${set.startDate}` },
          expired:  { bg: '#fee2e2', color: '#b91c1c', text: '⛔ หมดเวลาสอบแล้ว' },
          active:   set.endDate ? { bg: '#dcfce7', color: '#15803d', text: `✅ สอบได้ถึง ${set.endDate}` } : null,
        };
        const cfg = cfgMap[set.scheduleStatus];
        if (!cfg) return null;
        return (
          <div style={{
            fontSize: 12, fontWeight: 700, borderRadius: 12,
            padding: '8px 14px', marginBottom: 12,
            background: cfg.bg, color: cfg.color,
          }}>{cfg.text}</div>
        );
      })()}

      {limitReached && (
        <div style={{
          fontSize: 12, fontWeight: 700, borderRadius: 12,
          padding: '8px 14px', marginBottom: 12, textAlign: 'center',
          background: '#fee2e2', color: '#b91c1c',
        }}>
          🚫 ทำครบ {set.maxAttempts} ครั้งแล้ว
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => onStart(set)}
          disabled={disabled}
          style={{
            flex: 1, borderRadius: 14, padding: '13px 16px',
            background: disabled ? '#cbd5e1' : palette.accent,
            color: 'white', border: 'none', cursor: disabled ? 'default' : 'pointer',
            fontWeight: 800, fontSize: 15,
            boxShadow: disabled ? 'none' : `0 4px 14px ${palette.accent}44`,
            transition: 'transform .15s',
            opacity: disabled ? .6 : 1,
          }}
          onTouchStart={e => { if (!disabled) e.currentTarget.style.transform = 'scale(.97)'; }}
          onTouchEnd={e => e.currentTarget.style.transform = ''}>
          {loading ? '⏳ กำลังโหลด...' : 'เริ่มทำข้อสอบ'}
        </button>
        <button
          onClick={() => onLeaderboard(set)}
          style={{
            borderRadius: 14, padding: '13px 14px',
            background: 'rgba(255,255,255,.7)', color: '#64748b',
            border: '1.5px solid #e2e8f0', cursor: 'pointer',
            fontSize: 18, transition: 'transform .15s',
          }}
          onTouchStart={e => e.currentTarget.style.transform = 'scale(.95)'}
          onTouchEnd={e => e.currentTarget.style.transform = ''}>
          🏆
        </button>
      </div>
    </div>
  );
}

export default function ExamSetScreen() {
  const { navigate, profile, settings, setSettings, exam, setExam } = useApp();
  const [sets, setSets]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [startingId, setStartingId] = useState(null);

  // ── Settings sheet state ──────────────────────────────────
  const [sheetSet, setSheetSet] = useState(null); // set ที่รอ confirm

  useEffect(() => { loadSets(); }, []);

  async function loadSets() {
    setLoading(true);
    try {
      const data = await apiGet('getExamSets', { userId: profile?.userId });
      if (!data.success) throw new Error(data.message);
      setSets(data.sets || []);
    } catch (e) {
      Swal.fire('เกิดข้อผิดพลาด', e.message || 'โหลดชุดข้อสอบไม่สำเร็จ', 'error');
      navigate('setup');
    } finally { setLoading(false); }
  }

  // กดปุ่ม "เริ่มทำข้อสอบ" → เปิด sheet ตั้งค่าก่อน
  function handleCardStart(set) {
    setSheetSet(set);
  }

  // เรียกจาก sheet เมื่อกด confirm
  async function handleStart(set, userTimerMin) {
    let pinValue = '';
    if (set.hasPin) {
      const { value, isConfirmed } = await Swal.fire({
        title: '🔑 ใส่รหัส PIN',
        html: `<div style="font-size:13px;color:#6b7280;margin-bottom:8px">ชุดข้อสอบ "${set.setName}" ต้องใช้รหัส PIN</div>`,
        input: 'password',
        inputPlaceholder: 'รหัส PIN...',
        inputAttributes: { autocomplete: 'off', maxlength: '20' },
        showCancelButton: true,
        confirmButtonText: 'ยืนยัน',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#4f46e5',
        preConfirm: (v) => { if (!v) Swal.showValidationMessage('กรุณาใส่รหัส PIN'); return v; },
      });
      if (!isConfirmed) return;
      pinValue = value;
    }

    setStartingId(set.setId);
    try {
      navigate('loading-quiz');
      const data = await apiGet('getExamSetQuestions', {
        setId: set.setId, userId: profile?.userId,
        ...(pinValue ? { pin: pinValue } : {}),
      });
      if (!data.success) {
        if (data.needPin) throw new Error('รหัส PIN ไม่ถูกต้อง');
        if (data.pinLocked) throw new Error(data.message);
        if (data.limitReached) throw new Error(data.message);
        throw new Error(data.message);
      }
      if (!data.questions?.length) throw new Error('ไม่มีข้อสอบในชุดนี้');

      // ใช้เวลาจาก set (ถ้ากำหนด) หรือจาก user (ถ้า set ไม่กำหนด)
      const useTimer = set.timerMin > 0 || (userTimerMin != null && userTimerMin > 0);
      const timerMin = set.timerMin > 0 ? set.timerMin : (userTimerMin ?? settings.timerMin);
      setSettings(prev => ({ ...prev, useTimer, timerMin }));

      setExam(prev => ({
        ...prev,
        lesson:        set.setName,
        setId:         set.setId,
        allQ:          data.questions,
        passThreshold: set.passThreshold,
        shuffleQ:      data.shuffleQ    !== false,
        shuffleOpt:    data.shuffleOpt  === true,
        allowReview:   data.allowReview !== false,
      }));
      navigate('quiz');
    } catch (e) {
      Swal.fire('เกิดข้อผิดพลาด', e.message || 'โหลดข้อสอบไม่สำเร็จ', 'error');
      navigate('examSets');
    } finally { setStartingId(null); }
  }

  // sheet confirm → ปิด sheet แล้วเรียก handleStart
  function handleSheetConfirm(cfg) {
    const set = sheetSet;
    setSheetSet(null);
    // ส่ง userTimerMin เฉพาะกรณีที่ set ไม่มีเวลากำหนด
    const userTimerMin = set.timerMin > 0
      ? undefined
      : (cfg.useTimer ? cfg.timerMin : 0);
    handleStart(set, userTimerMin);
  }

  async function handleLeaderboard(set) {
    setExam(prev => ({ ...prev, setId: set.setId, lesson: set.setName }));
    navigate('examSetLeaderboard');
  }

  if (loading) return <Spinner label="กำลังโหลดชุดข้อสอบ..." />;

  return (
    <div className="animate-fade">

      {/* ── Settings Sheet ────────────────────────── */}
      {sheetSet && (
        <ExamSettingsSheet
          title={sheetSet.setName}
          subtitle={(() => {
            const totalQ = sheetSet.subjects.reduce((s, sub) => s + Number(sub.numQ || 0), 0);
            return `${totalQ > 0 ? `${totalQ} ข้อ` : 'จำนวนข้อแบบสุ่ม'} · ผ่าน ${sheetSet.passThreshold}%`;
          })()}
          icon="📦"
          showTimer={true}
          timerFixed={sheetSet.timerMin > 0 ? sheetSet.timerMin : 0}
          showNumQ={false}
          initUseTimer={settings.useTimer}
          initTimerMin={sheetSet.timerMin > 0 ? sheetSet.timerMin : settings.timerMin}
          initNumQ={settings.numQ}
          confirmLabel="🚀 เริ่มสอบเลย"
          onConfirm={handleSheetConfirm}
          onCancel={() => setSheetSet(null)}
        />
      )}

      {/* ── Header ─────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 4px', marginBottom: 8,
      }}>
        <button onClick={() => navigate('setup')}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text)', padding: 4 }}>
          ‹
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)' }}>จำลองการสอบ</div>
        </div>
        <div style={{ width: 30 }} />
      </div>

      {sets.length === 0 ? (
        <div style={{
          background: 'var(--card)', borderRadius: 20, padding: 40,
          textAlign: 'center', border: '1px solid var(--card-border)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>ยังไม่มีชุดข้อสอบ</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>กรุณาติดต่อผู้ดูแลระบบ</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sets.map((set, i) => (
            <SetCard key={set.setId} set={set} index={i}
              loading={startingId === set.setId}
              onStart={handleCardStart}
              onLeaderboard={handleLeaderboard} />
          ))}
        </div>
      )}
    </div>
  );
}
