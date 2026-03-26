import { useEffect, useRef, useCallback, useState } from 'react';
import Swal from 'sweetalert2';
import { useApp } from '../context/AppContext';
import { formatTime, shuffle } from '../utils/helpers';
import { PASS_THRESHOLD } from '../config';

const LABELS = ['ก', 'ข', 'ค', 'ง'];

export default function QuizScreen() {
  const { navigate, profile, settings, exam, setExam } = useApp();

  // ── init once ──────────────────────────────────────────
  const [state, setState] = useState(() => {
    const count = Math.min(settings.numQ, exam.allQ.length);
    const questions = shuffle([...exam.allQ]).slice(0, count);
    return {
      questions,
      answers:   new Array(questions.length).fill(null),
      idx:       0,
      timeLeft:  settings.useTimer ? settings.timerMin * 60 : 0,
      timeUsed:  0,
      totalSec:  settings.timerMin * 60,
    };
  });

  const tickRef = useRef(null);

  // ── timer ──────────────────────────────────────────────
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setState(prev => {
        const newUsed  = prev.timeUsed + 1;
        const newLeft  = settings.useTimer ? Math.max(0, prev.timeLeft - 1) : 0;

        if (settings.useTimer && newLeft === 0) {
          clearInterval(tickRef.current);
          // ส่งอัตโนมัติ
          setTimeout(() => handleAutoSubmit(prev.questions, prev.answers, newUsed), 100);
        }
        return { ...prev, timeUsed: newUsed, timeLeft: newLeft };
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, []);

  // ── timer color ────────────────────────────────────────
  const timerPct = state.totalSec > 0 ? (state.timeLeft / state.totalSec) * 100 : 0;
  const timerCls = timerPct > 50 ? '' : timerPct > 20 ? 'warn' : 'danger';

  // ── helpers ────────────────────────────────────────────
  function selectOpt(i) {
    setState(prev => {
      const answers = [...prev.answers];
      answers[prev.idx] = prev.questions[prev.idx].options[i];
      return { ...prev, answers };
    });
  }

  function prevQ() { setState(p => ({ ...p, idx: Math.max(0, p.idx - 1) })); }

  function nextQ() {
    if (!state.answers[state.idx]) {
      Swal.fire('คำเตือน', 'กรุณาเลือกคำตอบก่อนไปข้อถัดไป', 'warning');
      return;
    }
    setState(p => ({ ...p, idx: p.idx + 1 }));
  }

  function confirmSubmit() {
    if (!state.answers[state.idx]) {
      Swal.fire('คำเตือน', 'กรุณาเลือกคำตอบก่อนส่ง', 'warning');
      return;
    }
    const unanswered = state.answers.filter(a => !a).length;
    Swal.fire({
      title: 'ยืนยันการส่งคำตอบ',
      text: unanswered > 0
        ? `ยังมี ${unanswered} ข้อที่ยังไม่ได้ตอบ ต้องการส่งเลยหรือไม่?`
        : 'ยืนยันการส่งคำตอบ?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ส่งคำตอบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#d33',
    }).then(r => { if (r.isConfirmed) doSubmit(state.questions, state.answers, state.timeUsed); });
  }

  function handleAutoSubmit(questions, answers, timeUsed) {
    Swal.fire({ title: '⏰ หมดเวลา!', text: 'ระบบกำลังส่งคำตอบอัตโนมัติ', icon: 'warning', timer: 2000, showConfirmButton: false });
    setTimeout(() => doSubmit(questions, answers, timeUsed), 2100);
  }

  function doSubmit(questions, answers, timeUsed) {
    clearInterval(tickRef.current);
    let score = 0;
    const detail = questions.map((q, i) => {
      const user    = (answers[i] || '').trim();
      const correct = (Array.isArray(q.answer) ? q.answer[0] : q.answer || '').trim();
      const isRight = user === correct;
      if (isRight) score++;
      return { question: q.question, userAnswer: user || 'ไม่ได้ตอบ', correctAnswer: correct, isRight, explanation: q.explanation || '' };
    });

    setExam(prev => ({
      ...prev,
      questions,
      answers,
      score,
      timeUsed,
      detail,
    }));
    navigate('score');
  }

  // ── render ─────────────────────────────────────────────
  const { questions, answers, idx, timeLeft } = state;
  if (!questions.length) return null;

  const q   = questions[idx];
  const tot = questions.length;
  const num = idx + 1;

  return (
    <div className="animate-fade">
      {/* Sticky Header */}
      <div className="exam-header rounded-t-2xl px-3 sm:px-5 py-2 sm:py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1 min-w-0 mr-2">
            <div className="font-bold text-sm sm:text-base truncate" style={{ color: 'var(--header-text)' }}>{exam.lesson}</div>
            <div style={{ fontSize: 10, opacity: .75, color: 'var(--header-text)' }}>{profile?.displayName}</div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <img src={profile?.pictureUrl} alt="" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border-2 border-white border-opacity-40" />
            {settings.useTimer && (
              <div className={`timer-pill ${timerCls}`}>⏱ {formatTime(timeLeft)}</div>
            )}
          </div>
        </div>

        {/* Question Progress Bar */}
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1 rounded-full h-2" style={{ background: 'rgba(255,255,255,.25)' }}>
            <div className="q-progress-fill rounded-full h-2" style={{ width: `${(num / tot) * 100}%` }} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--header-text)', opacity: .85, fontWeight: 600 }}>{num}/{tot}</span>
        </div>

        {/* Timer Progress Bar */}
        {settings.useTimer && (
          <div className="rounded-full h-1" style={{ background: 'rgba(255,255,255,.2)' }}>
            <div className={`t-progress-fill ${timerCls} rounded-full h-1`} style={{ width: `${timerPct}%` }} />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="quiz-card rounded-b-2xl p-4 sm:p-5 lg:p-7 animate-fade" style={{ borderTop: 'none', borderRadius: '0 0 1rem 1rem' }}>
        {/* Question */}
        <h2 className="text-base sm:text-lg font-semibold mb-4" style={{ color: 'var(--text)', lineHeight: 1.7 }}>
          {num}. {q.question}
        </h2>
        {q.imageUrl && (
          <img
            src={q.imageUrl}
            alt="รูปประกอบคำถาม"
            className="rounded-xl mb-4 w-full object-contain"
            style={{ maxHeight: 256, border: '1px solid var(--input-border)' }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        )}

        {/* Options */}
        <div className="space-y-3 mb-6">
          {q.options.map((opt, i) => {
            const sel = answers[idx] === opt;
            return (
              <div
                key={i}
                className={`option-card p-3 sm:p-4 rounded-xl ${sel ? 'selected' : ''}`}
                onClick={() => selectOpt(i)}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5"
                    style={{ borderColor: sel ? 'rgba(255,255,255,.6)' : 'var(--input-border)' }}
                  >
                    {sel ? '✓' : (LABELS[i] ?? i + 1)}
                  </span>
                  <span>{opt}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          {idx > 0 && (
            <button className="btn btn-gray flex-1 rounded-xl py-2.5 sm:py-3 text-sm" onClick={prevQ}>
              ← ย้อนกลับ
            </button>
          )}
          {idx < tot - 1 ? (
            <button className="btn btn-primary flex-1 rounded-xl py-2.5 sm:py-3 text-sm" onClick={nextQ}>
              ถัดไป →
            </button>
          ) : (
            <button className="btn btn-green flex-1 rounded-xl py-2.5 sm:py-3 text-sm" onClick={confirmSubmit}>
              ✓ ส่งคำตอบ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
