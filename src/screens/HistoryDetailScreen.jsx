import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { parsePercent } from '../utils/helpers';
import { apiGet } from '../utils/api';
import { PASS_THRESHOLD } from '../config';

const CIRCUMFERENCE = 251.2;

function DetailRow({ d, isRight, num }) {
  return (
    <div className={isRight ? 'row-correct' : 'row-wrong'}>
      <div className="flex items-start gap-2 mb-1">
        <span style={{ flexShrink: 0, fontWeight: 700 }}>{num}.</span>
        <p className="font-semibold text-sm" style={{ color: 'inherit' }}>{d.question}</p>
      </div>
      <div style={{ fontSize: 13, marginLeft: 20 }}>
        <div>
          คำตอบของคุณ: <b>{d.userAnswer || 'ไม่ได้ตอบ'}</b>{' '}
          {isRight
            ? <span style={{ color: '#16a34a', fontWeight: 700 }}> ✔ ถูก</span>
            : <span style={{ color: '#dc2626', fontWeight: 700 }}> ✖ ผิด</span>}
        </div>
        {!isRight && <div>เฉลย: <b style={{ color: '#16a34a' }}>{d.correctAnswer}</b></div>}
        {d.explanation && (
          <div style={{ borderTop: '1px solid currentColor', marginTop: 6, paddingTop: 6, opacity: .8 }}>
            <span style={{ fontSize: 11, fontWeight: 700 }}>คำอธิบาย: </span>{d.explanation}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HistoryDetailScreen() {
  const { navigate, historyDetail, setExam, settings, setSettings } = useApp();
  const [allOpen, setAllOpen] = useState(false);
  const arcRef = useRef(null);

  const { exam, detail } = historyDetail || { exam: {}, detail: [] };
  const pct  = parsePercent(exam.pct);
  const pass = exam.pass === 'ผ่าน';
  const min  = Math.floor((exam.timeUsed || 0) / 60);
  const sec  = String((exam.timeUsed || 0) % 60).padStart(2, '0');
  const color = pass ? '#22c55e' : '#ef4444';

  useEffect(() => {
    const t = setTimeout(() => {
      if (arcRef.current)
        arcRef.current.style.strokeDashoffset = CIRCUMFERENCE * (1 - pct / 100);
    }, 80);
    return () => clearTimeout(t);
  }, [pct]);

  const wrongItems   = detail.filter(d => !d.isRight);
  const correctItems = detail.filter(d => d.isRight);

  return (
    <div className="animate-fade">

      {/* Header Card */}
      <div className="quiz-card no-hover rounded-2xl p-5 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>{exam.lesson || 'ไม่ระบุวิชา'}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{exam.date}</div>
          </div>
          <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5" style={{ flexShrink: 0 }} onClick={() => navigate('history')}>
            ← กลับ
          </button>
        </div>

        <div className="flex items-center gap-5">
          {/* Donut */}
          <div className="relative flex-shrink-0" style={{ width: 96, height: 96 }}>
            <svg viewBox="0 0 100 100" width="96" height="96">
              <circle cx="50" cy="50" r="40" fill="none" stroke="var(--progress-trk)" strokeWidth="12" />
              <circle
                ref={arcRef} cx="50" cy="50" r="40" fill="none"
                stroke={color} strokeWidth="12"
                strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE}
                transform="rotate(-90 50 50)" className="donut-ring"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div style={{ fontSize: 16, fontWeight: 900, color }}>{pct}%</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{exam.score}/{exam.total}</div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="flex-1 grid grid-cols-2 gap-2">
            <div className="stat-box"><div className="text-xl font-black" style={{ color: 'var(--accent)' }}>{exam.score}</div><div className="text-xs" style={{ color: 'var(--text-muted)' }}>ถูก</div></div>
            <div className="stat-box"><div className="text-xl font-black text-red-500">{(exam.total || 0) - (exam.score || 0)}</div><div className="text-xs" style={{ color: 'var(--text-muted)' }}>ผิด</div></div>
            <div className="stat-box"><div className="text-lg font-black text-yellow-500">{min}:{sec}</div><div className="text-xs" style={{ color: 'var(--text-muted)' }}>เวลา</div></div>
            <div className="stat-box">
              <span className={pass ? 'badge-pass' : 'badge-fail'} style={{ fontSize: 12 }}>{pass ? '✅ ผ่าน' : '❌ ไม่ผ่าน'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Wrong Answers */}
      {wrongItems.length > 0 && (
        <div className="quiz-card no-hover rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span style={{ fontSize: 18 }}>❌</span>
            <span className="font-bold" style={{ color: 'var(--text)' }}>ข้อที่ตอบผิด</span>
            <span className="badge-fail">{wrongItems.length} ข้อ</span>
          </div>
          <div className="space-y-3">
            {wrongItems.map((d, i) => <DetailRow key={i} d={d} isRight={false} num={i + 1} />)}
          </div>
        </div>
      )}

      {/* Correct Answers */}
      {correctItems.length > 0 && (
        <div className="quiz-card no-hover rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span style={{ fontSize: 18 }}>✅</span>
            <span className="font-bold" style={{ color: 'var(--text)' }}>ข้อที่ตอบถูก</span>
            <span className="badge-pass">{correctItems.length} ข้อ</span>
          </div>
          <div className="space-y-3">
            {correctItems.map((d, i) => <DetailRow key={i} d={d} isRight={true} num={i + 1} />)}
          </div>
        </div>
      )}

      {/* All Questions Toggle */}
      {detail.length > 0 && (
        <div className="quiz-card no-hover rounded-2xl p-5 mb-4">
          <button
            className="flex items-center justify-between w-full"
            style={{ color: 'var(--text)' }}
            onClick={() => setAllOpen(v => !v)}
          >
            <span className="font-bold">📋 รายละเอียดทุกข้อ</span>
            <span style={{ fontSize: 20 }}>{allOpen ? '▲' : '▼'}</span>
          </button>
          {allOpen && (
            <div className="mt-4 space-y-3">
              {detail.map((d, i) => <DetailRow key={i} d={d} isRight={d.isRight} num={i + 1} />)}
            </div>
          )}
        </div>
      )}

      {!detail.length && (
        <div className="quiz-card no-hover rounded-2xl p-5 mb-4">
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>ไม่มีข้อมูลรายละเอียดข้อสอบ (บันทึกก่อนระบบอัพเดท)</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button className="btn btn-gray rounded-xl py-3 text-sm" onClick={() => navigate('history')}>
          ← กลับ
        </button>
        <button className="btn rounded-xl py-3 text-sm font-semibold"
          style={{ background: pass?'#3b82f6':'#ef4444', color:'white' }}
          onClick={async () => {
            const lesson = exam.lesson;
            if (!lesson) return;
            navigate('loading-quiz');
            try {
              const data = await apiGet('getQuestions', { lesson });
              if (!data.success || !data.questions?.length) throw new Error('ไม่พบข้อสอบ');
              const shuffled = [...data.questions].sort(() => Math.random()-0.5).slice(0, settings.numQ||20);
              setExam(p => ({ ...p, lesson, setId:'', allQ:shuffled, passThreshold:PASS_THRESHOLD }));
              navigate('quiz');
            } catch(e) {
              alert(e.message);
              navigate('history');
            }
          }}>
          {pass ? '🔄 สอบอีกครั้ง' : '🎯 ลองใหม่'}
        </button>
      </div>
      {pass && (
        <button className="btn w-full rounded-xl py-2.5 mt-1 text-sm font-semibold"
          style={{ background:'#d97706', color:'white' }}
          onClick={() => navigate('certificate')}>
          🎓 ดูใบประกาศ
        </button>
      )}
    </div>
  );
}
