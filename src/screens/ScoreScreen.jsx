import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiPost } from '../utils/api';
import { formatTime } from '../utils/helpers';
import { PASS_THRESHOLD } from '../config';

const CIRCUMFERENCE = 251.2;

export default function ScoreScreen() {
  const { navigate, profile, lineEmail, exam } = useApp();
  const arcRef    = useRef(null);
  const savedRef  = useRef(false);
  const [lineNotified, setLineNotified] = useState(false);

  const tot  = exam.questions.length;
  const pct  = tot > 0 ? Math.round((exam.score / tot) * 100) : 0;
  const pass = pct >= PASS_THRESHOLD;

  // ── animate donut & save result once ───────────────────
  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;

    // Animate donut
    const t = setTimeout(() => {
      if (arcRef.current)
        arcRef.current.style.strokeDashoffset = CIRCUMFERENCE * (1 - pct / 100);
    }, 80);

    // Confetti
    if (pct >= 80 && typeof confetti === 'function') {
      confetti({ particleCount: 200, spread: 100, origin: { y: .6 } });
    }

    // Save + Push Flex Message ไป LINE (backend ส่งให้เลย)
    apiPost({
      action:      'saveResult',
      userId:      profile?.userId      || '',
      displayName: profile?.displayName || '',
      email:       lineEmail            || '',
      lesson:      exam.lesson,
      score:       exam.score,
      total:       tot,
      timeUsed:    exam.timeUsed,
      detail:      exam.detail,
    })
      .then(res => {
        if (res?.success) setLineNotified(true);
      })
      .catch(e => console.error('saveResult error:', e));

    return () => clearTimeout(t);
  }, []);

  const color = pass ? '#22c55e' : '#ef4444';
  const min   = Math.floor(exam.timeUsed / 60);
  const sec   = String(exam.timeUsed % 60).padStart(2, '0');

  return (
    <div className="quiz-card rounded-2xl p-4 sm:p-7 animate-fade">
      <div className="text-center">

        {/* Donut */}
        <div className="relative w-28 h-28 sm:w-36 sm:h-36 mx-auto mb-4">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--progress-trk)" strokeWidth="10" />
            <circle
              ref={arcRef} cx="50" cy="50" r="40" fill="none"
              stroke={color} strokeWidth="10"
              strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE}
              transform="rotate(-90 50 50)" className="donut-ring"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-xl sm:text-2xl font-extrabold" style={{ color }}>{pct}%</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{exam.score}/{tot}</div>
          </div>
        </div>

        <div className="text-base sm:text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>
          {pass ? '🎉 ยินดีด้วย!' : '😢 เสียใจด้วย'}
        </div>
        <div className="inline-block px-5 py-1 rounded-full text-sm font-semibold mb-1"
          style={{ background: pass ? '#dcfce7' : '#fee2e2', color: pass ? '#15803d' : '#b91c1c' }}>
          {pass ? '✅ ผ่านการสอบ' : '❌ ไม่ผ่านการสอบ'}
        </div>
        <div className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
          เกณฑ์ผ่าน {PASS_THRESHOLD}% ขึ้นไป
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="stat-box">
            <div className="text-xl sm:text-2xl font-black" style={{ color: 'var(--accent)' }}>{exam.score}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>ถูก</div>
          </div>
          <div className="stat-box">
            <div className="text-xl sm:text-2xl font-black text-red-500">{tot - exam.score}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>ผิด</div>
          </div>
          <div className="stat-box">
            <div className="text-xl sm:text-2xl font-black text-yellow-500">{min}:{sec}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>เวลาที่ใช้</div>
          </div>
        </div>

        {/* LINE Notification badge */}
        {lineNotified && (
          <div className="flex items-center justify-center gap-2 text-xs py-2 px-4 rounded-full mx-auto mb-4 w-fit animate-fade"
            style={{ background: '#e8f5e9', color: '#15803d', border: '1px solid #86efac' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#06C755">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
            </svg>
            <span>ส่งผลสอบเข้า LINE ของคุณแล้ว</span>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button className="btn btn-blue w-full rounded-xl py-2.5 text-sm"    onClick={() => navigate('review')}>
            🔍 ดูเฉลยทุกข้อ
          </button>
          <button className="btn btn-primary w-full rounded-xl py-2.5 text-sm" onClick={() => navigate('quiz')}>
            🔄 สอบใหม่วิชาเดิม
          </button>
          <button className="btn btn-gray w-full rounded-xl py-2.5 text-sm"    onClick={() => navigate('setup')}>
            📚 เลือกวิชาใหม่
          </button>
        </div>
      </div>
    </div>
  );
}
