import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { apiPost } from '../utils/api';
import { formatTime } from '../utils/helpers';
import { PASS_THRESHOLD } from '../config';

const CIRCUMFERENCE = 251.2;

export default function ScoreScreen() {
  const { navigate, profile, lineEmail, exam } = useApp();
  const arcRef = useRef(null);

  const tot  = exam.questions.length;
  const pct  = tot > 0 ? Math.round((exam.score / tot) * 100) : 0;
  const pass = pct >= PASS_THRESHOLD;

  // ── animate donut & save result once ───────────────────
  useEffect(() => {
    // Animate donut
    const t = setTimeout(() => {
      if (arcRef.current)
        arcRef.current.style.strokeDashoffset = CIRCUMFERENCE * (1 - pct / 100);
    }, 80);

    // Confetti
    if (pct >= 80 && typeof confetti === 'function') {
      confetti({ particleCount: 200, spread: 100, origin: { y: .6 } });
    }

    // Save to backend (fire-and-forget)
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
    }).catch(e => console.error('saveResult error:', e));

    // Share to LINE
    if (profile && liff?.isInClient?.()) {
      liff.sendMessages([{
        type: 'flex',
        altText: `ผลสอบ ${exam.score}/${tot} (${pct}%)`,
        contents: {
          type: 'bubble',
          body: {
            type: 'box', layout: 'vertical', paddingAll: '20px',
            contents: [
              { type: 'text', text: `📝 ${exam.lesson}`, weight: 'bold', size: 'md' },
              { type: 'text', text: `${profile.displayName}`, size: 'sm', color: '#888', margin: 'sm' },
              { type: 'text', text: `คะแนน: ${exam.score}/${tot} (${pct}%)`, weight: 'bold', size: 'lg', margin: 'md', color: pass ? '#16a34a' : '#dc2626' },
              { type: 'text', text: pass ? '✅ ผ่านการสอบ' : '❌ ไม่ผ่านการสอบ', size: 'sm', margin: 'sm' },
            ],
          },
        },
      }]).catch(() => {});
    }

    return () => clearTimeout(t);
  }, []);

  const color = pass ? '#22c55e' : '#ef4444';
  const min   = Math.floor(exam.timeUsed / 60);
  const sec   = String(exam.timeUsed % 60).padStart(2, '0');

  return (
    <div className="quiz-card rounded-2xl p-7 animate-fade">
      <div className="text-center">

        {/* Donut */}
        <div className="relative w-36 h-36 mx-auto mb-4">
          <svg viewBox="0 0 100 100" width="144" height="144">
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--progress-trk)" strokeWidth="10" />
            <circle
              ref={arcRef} cx="50" cy="50" r="40" fill="none"
              stroke={color} strokeWidth="10"
              strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE}
              transform="rotate(-90 50 50)" className="donut-ring"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-extrabold" style={{ color }}>{pct}%</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{exam.score}/{tot}</div>
          </div>
        </div>

        <div className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>
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
            <div className="text-2xl font-black" style={{ color: 'var(--accent)' }}>{exam.score}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>ถูก</div>
          </div>
          <div className="stat-box">
            <div className="text-2xl font-black text-red-500">{tot - exam.score}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>ผิด</div>
          </div>
          <div className="stat-box">
            <div className="text-2xl font-black text-yellow-500">{min}:{sec}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>เวลาที่ใช้</div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button className="btn btn-blue w-full rounded-xl py-3"    onClick={() => navigate('review')}>
            🔍 ดูเฉลยทุกข้อ
          </button>
          <button className="btn btn-primary w-full rounded-xl py-3" onClick={() => navigate('quiz')}>
            🔄 สอบใหม่วิชาเดิม
          </button>
          <button className="btn btn-gray w-full rounded-xl py-3"    onClick={() => navigate('setup')}>
            📚 เลือกวิชาใหม่
          </button>
        </div>
      </div>
    </div>
  );
}
