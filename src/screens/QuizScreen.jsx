import { useEffect, useRef, useCallback, useState } from 'react';
import Swal from 'sweetalert2';
import { useApp } from '../context/AppContext';
import { apiPost } from '../utils/api';
import { formatTime, shuffle } from '../utils/helpers';
import { APP_LOGO } from '../config';
import { PASS_THRESHOLD } from '../config';

// hook ตรวจ online/offline
function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

const LABELS = ['ก', 'ข', 'ค', 'ง'];

// ── Question Map (กระโดดข้อ) ─────────────────────────────
function QuestionMap({ questions, answers, idx, onJump, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 480, maxHeight: '70vh', overflowY: 'auto',
        background: 'var(--card)', borderRadius: '20px 20px 0 0',
        padding: '20px 16px 24px', boxShadow: '0 -4px 24px rgba(0,0,0,.15)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>📋 เลือกข้อ</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 12, fontSize: 11, color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: '#22c55e', display: 'inline-block' }} /> ตอบแล้ว
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 12 }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: '#e2e8f0', display: 'inline-block', border: '1px solid #cbd5e1' }} /> ยังไม่ตอบ
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 12 }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: 'var(--accent)', display: 'inline-block' }} /> ข้อปัจจุบัน
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))', gap: 6 }}>
          {questions.map((_, i) => {
            const answered = !!answers[i] && (typeof answers[i] !== 'string' || answers[i].trim());
            const isCur = i === idx;
            return (
              <button key={i} onClick={() => onJump(i)}
                style={{
                  width: '100%', aspectRatio: '1', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: 14, transition: 'transform .1s',
                  background: isCur ? 'var(--accent)' : answered ? '#22c55e' : '#f1f5f9',
                  color: isCur || answered ? 'white' : '#64748b',
                  boxShadow: isCur ? '0 2px 8px rgba(0,0,0,.2)' : 'none',
                }}>
                {i + 1}
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 14, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
          ตอบแล้ว {answers.filter(a => a && (typeof a !== 'string' || a.trim())).length}/{questions.length} ข้อ
        </div>
      </div>
    </div>
  );
}

// ── Answer Summary (สรุปก่อนส่ง) ─────────────────────────
function AnswerSummary({ questions, answers, onJump, onSubmit, onClose }) {
  const answered   = answers.filter(a => a && (typeof a !== 'string' || a.trim())).length;
  const unanswered = questions.length - answered;

  return (
    <div className="animate-fade" style={{ padding: '0 2px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 4px', marginBottom: 8,
      }}>
        <button onClick={onClose}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text)', padding: 4 }}>
          ‹
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)' }}>📝 สรุปคำตอบ</div>
        </div>
        <div style={{ width: 30 }} />
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={{
          flex: 1, background: '#dcfce7', borderRadius: 14,
          padding: '12px 14px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>{answered}</div>
          <div style={{ fontSize: 11, color: '#15803d', fontWeight: 600 }}>ตอบแล้ว</div>
        </div>
        <div style={{
          flex: 1, borderRadius: 14, padding: '12px 14px', textAlign: 'center',
          background: unanswered > 0 ? '#fee2e2' : '#f1f5f9',
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: unanswered > 0 ? '#dc2626' : '#94a3b8' }}>{unanswered}</div>
          <div style={{ fontSize: 11, color: unanswered > 0 ? '#b91c1c' : '#64748b', fontWeight: 600 }}>ยังไม่ตอบ</div>
        </div>
      </div>

      {/* Question list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {questions.map((q, i) => {
          const ans = answers[i];
          const hasAns = !!ans && (typeof ans !== 'string' || ans.trim());
          return (
            <div key={i} onClick={() => onJump(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'var(--card)', borderRadius: 14, padding: '12px 14px',
                border: `1.5px solid ${hasAns ? '#bbf7d0' : '#fecaca'}`,
                cursor: 'pointer', transition: 'transform .1s',
              }}>
              {/* Number badge */}
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 14,
                background: hasAns ? '#22c55e' : '#fee2e2',
                color: hasAns ? 'white' : '#dc2626',
              }}>
                {hasAns ? '✓' : i + 1}
              </div>
              {/* Question text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600, color: 'var(--text)',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  lineHeight: 1.4,
                }}>
                  {i + 1}. {q.question}
                </div>
                {hasAns ? (
                  <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, marginTop: 3 }}>
                    ✅ {typeof ans === 'string' && ans.length > 40 ? ans.slice(0, 40) + '…' : ans}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 3 }}>
                    ⚠️ ยังไม่ได้ตอบ
                  </div>
                )}
              </div>
              {/* Arrow */}
              <span style={{ color: 'var(--text-muted)', fontSize: 16, flexShrink: 0 }}>›</span>
            </div>
          );
        })}
      </div>

      {/* Submit */}
      <button onClick={onSubmit}
        disabled={unanswered > 0}
        style={{
          width: '100%', borderRadius: 14, padding: '15px 16px',
          background: unanswered > 0 ? '#9ca3af' : '#22c55e',
          color: 'white', border: 'none',
          cursor: unanswered > 0 ? 'not-allowed' : 'pointer',
          fontWeight: 800, fontSize: 16,
          boxShadow: unanswered > 0 ? 'none' : '0 4px 14px #22c55e44',
          marginBottom: 10,
          opacity: unanswered > 0 ? 0.6 : 1,
        }}>
        {unanswered > 0 ? `ยังเหลือ ${unanswered} ข้อที่ยังไม่ได้ตอบ` : '✅ ยืนยันส่งคำตอบ'}
      </button>
      <button onClick={onClose}
        style={{
          width: '100%', borderRadius: 14, padding: '13px 16px',
          background: 'var(--input-bg)', color: 'var(--text-muted)',
          border: '1.5px solid var(--input-border)', cursor: 'pointer',
          fontWeight: 700, fontSize: 14,
        }}>
        ← กลับไปทำข้อสอบต่อ
      </button>
    </div>
  );
}

export default function QuizScreen() {
  const { navigate, profile, settings, exam, setExam } = useApp();
  const isOnline      = useOnline();
  const sessionIdRef  = useRef(null);
  const heartbeatRef  = useRef(null);

  // ── init once ──────────────────────────────────────────
  const SAVE_KEY = `quiz_autosave_${profile?.userId || 'guest'}_${exam.setId || exam.lesson}`;

  const [state, setState] = useState(() => {
    const count = Math.min(settings.numQ, exam.allQ.length);
    const rawQ = exam.shuffleQ !== false ? shuffle([...exam.allQ]) : [...exam.allQ];
    const selected = rawQ.slice(0, count);
    const questions = exam.shuffleOpt
      ? selected.map(q => {
          if (q.questionType !== 'mc' && q.questionType !== 'tf') return q;
          if (q.questionType === 'tf') return q;
          const shuffledOpts = shuffle([...q.options]);
          return { ...q, options: shuffledOpts };
        })
      : selected;

    // ── ลองโหลด auto-save ──
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      const AGE_LIMIT = 12 * 3600 * 1000; // 12 ชั่วโมง
      if (saved && saved.questions?.length === questions.length
          && (Date.now() - (saved.savedAt || 0)) < AGE_LIMIT) {
        return {
          questions:   saved.questions,
          answers:     saved.answers  || new Array(questions.length).fill(null),
          qTime:       saved.qTime    || new Array(questions.length).fill(0),
          idx:         saved.idx      || 0,
          timeLeft:    saved.timeLeft !== undefined ? saved.timeLeft : (settings.useTimer ? settings.timerMin * 60 : 0),
          timeUsed:    saved.timeUsed || 0,
          totalSec:    settings.timerMin * 60,
          _restored:   true,
        };
      }
    } catch (_) {}

    return {
      questions,
      answers:     new Array(questions.length).fill(null),
      qTime:       new Array(questions.length).fill(0), // #7 เวลาต่อข้อ (วินาที)
      idx:         0,
      timeLeft:    settings.useTimer ? settings.timerMin * 60 : 0,
      timeUsed:    0,
      totalSec:    settings.timerMin * 60,
    };
  });

  const [showMap, setShowMap]         = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [paused, setPaused]           = useState(false);
  const [pauseCount, setPauseCount]   = useState(0);
  const MAX_PAUSE = 3;
  const tickRef = useRef(null);
  const saveToastRef = useRef(null);

  // ── auto-save effect ───────────────────────────────────
  const saveKeyRef = useRef(SAVE_KEY);
  saveKeyRef.current = SAVE_KEY;

  useEffect(() => {
    if (state._restored) {
      // แจ้งว่ากำลัง resume จาก auto-save
      Swal.fire({
        toast: true, position: 'top', timer: 3000, showConfirmButton: false,
        icon: 'info', title: '🔄 กำลัง resume จากที่ค้างไว้',
        timerProgressBar: true,
      });
    }
  }, []); // run once on mount

  useEffect(() => {
    // บันทึก state ทุกครั้งที่ตอบ
    try {
      const { questions, answers, qTime, idx, timeLeft, timeUsed } = state;
      localStorage.setItem(saveKeyRef.current, JSON.stringify({
        questions, answers, qTime, idx, timeLeft, timeUsed, savedAt: Date.now(),
      }));
      // #7 auto-save toast (debounce 2s)
      clearTimeout(saveToastRef.current);
      saveToastRef.current = setTimeout(() => {
        Swal.fire({
          toast: true, position: 'bottom-end', timer: 1200, showConfirmButton: false,
          icon: 'success', title: '💾 บันทึกแล้ว',
          customClass: { popup: 'swal-save-toast' },
        });
      }, 800);
    } catch (_) {}
  }, [state.answers, state.idx]);

  // ── session tracking (real-time monitoring) ────────────
  useEffect(() => {
    if (!profile?.userId) return;
    // เริ่ม session
    apiPost({
      action:      'startSession',
      userId:      profile.userId,
      displayName: profile.displayName || '',
      pictureUrl:  profile.pictureUrl  || '',
      lesson:      exam.lesson         || '',
      setId:       exam.setId          || '',
    }).then(d => {
      if (d?.sessionId) {
        sessionIdRef.current = d.sessionId;
        // heartbeat ทุก 60 วินาที
        heartbeatRef.current = setInterval(() => {
          apiPost({ action: 'heartbeatSession', sessionId: d.sessionId }).catch(() => {});
        }, 60_000);
      }
    }).catch(() => {});

    return () => {
      clearInterval(heartbeatRef.current);
      // end session เมื่อออกจากหน้า (กดกลับ / navigate ออก)
      if (sessionIdRef.current) {
        apiPost({ action: 'endSession', sessionId: sessionIdRef.current }).catch(() => {});
      }
    };
  }, []);

  // ── timer ──────────────────────────────────────────────
  const warnedRef  = useRef(false);
  const pausedRef  = useRef(false);

  useEffect(() => {
    tickRef.current = setInterval(() => {
      if (pausedRef.current) return; // ⏸ หยุดชั่วคราว
      setState(prev => {
        const newUsed  = prev.timeUsed + 1;
        const newLeft  = settings.useTimer ? Math.max(0, prev.timeLeft - 1) : 0;
        // #7 track per-question time
        const newQTime = [...prev.qTime];
        newQTime[prev.idx] = (newQTime[prev.idx] || 0) + 1;

        if (settings.useTimer && newLeft === 0) {
          clearInterval(tickRef.current);
          setTimeout(() => handleAutoSubmit(prev.questions, prev.answers, newUsed), 100);
        }

        if (settings.useTimer && newLeft === 300 && !warnedRef.current) {
          warnedRef.current = true;
          try { navigator.vibrate?.([200, 100, 200]); } catch (_) {}
          Swal.fire({
            toast: true, position: 'top-end', timer: 4000,
            showConfirmButton: false, timerProgressBar: true,
            icon: 'warning', title: '⏰ เหลือเวลาอีก 5 นาที!',
          });
        }

        return { ...prev, timeUsed: newUsed, timeLeft: newLeft, qTime: newQTime };
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, []);

  function togglePause() {
    if (paused) {
      // Resume
      pausedRef.current = false;
      setPaused(false);
    } else {
      if (pauseCount >= MAX_PAUSE) {
        Swal.fire({ toast: true, position: 'top', timer: 2500, showConfirmButton: false, icon: 'warning', title: `⏸ ใช้สิทธิ์หยุดพักครบ ${MAX_PAUSE} ครั้งแล้ว` });
        return;
      }
      pausedRef.current = true;
      setPaused(true);
      setPauseCount(c => c + 1);
      Swal.fire({ toast: true, position: 'top', timer: 2000, showConfirmButton: false, icon: 'info', title: `⏸ หยุดพัก (${pauseCount + 1}/${MAX_PAUSE})` });
    }
  }

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

  function setFillAnswer(text) {
    setState(prev => {
      const answers = [...prev.answers];
      answers[prev.idx] = text;
      return { ...prev, answers };
    });
  }

  function prevQ() { setState(p => ({ ...p, idx: Math.max(0, p.idx - 1) })); }
  function nextQ() { setState(p => ({ ...p, idx: Math.min(p.questions.length - 1, p.idx + 1) })); }
  function jumpTo(i) { setState(p => ({ ...p, idx: i })); setShowMap(false); setShowSummary(false); }

  function openSummary() { setShowSummary(true); }

  function confirmSubmit() {
    const unanswered = state.answers.filter(a => !a || (typeof a === 'string' && !a.trim())).length;

    // บังคับตอบทุกข้อ
    if (unanswered > 0) {
      // หาข้อแรกที่ยังไม่ได้ตอบ
      const firstUnanswered = state.answers.findIndex(a => !a || (typeof a === 'string' && !a.trim()));
      Swal.fire({
        title: 'ยังตอบไม่ครบ',
        html: `<div style="font-size:14px">คุณยังไม่ได้ตอบ <b>${unanswered} ข้อ</b><br>กรุณาตอบให้ครบทุกข้อก่อนส่งคำตอบ</div>`,
        icon: 'warning',
        confirmButtonText: 'ไปตอบข้อที่ยังไม่ได้ตอบ',
        confirmButtonColor: '#f59e0b',
      }).then(() => {
        if (firstUnanswered >= 0) {
          setState(p => ({ ...p, idx: firstUnanswered }));
          setShowSummary(false);
        }
      });
      return;
    }

    Swal.fire({
      title: 'ยืนยันการส่งคำตอบ',
      text: 'ตอบครบทุกข้อแล้ว ยืนยันส่งคำตอบ?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ส่งคำตอบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#d33',
    }).then(r => { if (r.isConfirmed) doSubmit(state.questions, state.answers, state.timeUsed, state.qTime); });
  }

  function handleAutoSubmit(questions, answers, timeUsed) {
    Swal.fire({ title: '⏰ หมดเวลา!', text: 'ระบบกำลังส่งคำตอบอัตโนมัติ', icon: 'warning', timer: 2000, showConfirmButton: false });
    setState(prev => {
      setTimeout(() => doSubmit(prev.questions, prev.answers, timeUsed, prev.qTime), 2100);
      return prev;
    });
  }

  function doSubmit(questions, answers, timeUsed, qTime) {
    clearInterval(tickRef.current);
    clearInterval(heartbeatRef.current);
    // ลบ auto-save เมื่อส่งคำตอบแล้ว
    try { localStorage.removeItem(saveKeyRef.current); } catch (_) {}
    // end session ทันทีที่ส่ง (ไม่รอ cleanup)
    if (sessionIdRef.current) {
      apiPost({ action: 'endSession', sessionId: sessionIdRef.current }).catch(() => {});
      sessionIdRef.current = null;
    }

    // ⛔ ไม่คำนวณคะแนนที่ frontend — ส่งแค่ questionIds + userAnswers ไป server
    const questionIds = questions.map(q => q.id);
    const userAnswers = questions.map((q, i) => (answers[i] || '').trim());

    setExam(prev => ({
      ...prev,
      questions,
      answers,
      questionIds,
      userAnswers,
      timeUsed,
      qTime: qTime || [],
      // score, detail จะมาจาก server response ใน ScoreScreen
      score: null,
      detail: null,
    }));
    navigate('score');
  }

  // ── #8 flag question ───────────────────────────────────
  async function flagCurrentQuestion() {
    const q = state.questions[state.idx];
    const { value: reason, isConfirmed } = await Swal.fire({
      title:  '🚩 รายงานข้อสอบนี้',
      html:   `<div style="font-size:13px;color:#6b7280;text-align:left;margin-bottom:8px">📝 "${(q.question||'').slice(0,80)}${q.question?.length>80?'…':''}"</div>`,
      input:  'select',
      inputOptions: {
        wrong_answer: 'คำตอบไม่ถูกต้อง',
        unclear:      'คำถามไม่ชัดเจน',
        typo:         'พิมพ์ผิด / ตัวสะกดผิด',
        other:        'อื่นๆ',
      },
      inputPlaceholder:  '— เลือกสาเหตุ —',
      showCancelButton:  true,
      confirmButtonText: '🚩 รายงาน',
      cancelButtonText:  'ยกเลิก',
      confirmButtonColor: '#dc2626',
    });
    if (!isConfirmed || !reason) return;
    try {
      await apiPost({
        action:       'flagQuestion',
        userId:       profile?.userId       || '',
        displayName:  profile?.displayName  || '',
        questionId:   q.id                  || '',
        questionText: q.question            || '',
        reason,
      });
      Swal.fire({ toast: true, position: 'top', timer: 2000, showConfirmButton: false, icon: 'success', title: '🚩 รายงานแล้ว ขอบคุณ!' });
    } catch (_) {
      Swal.fire({ toast: true, position: 'top', timer: 2000, showConfirmButton: false, icon: 'error', title: 'ไม่สำเร็จ ลองใหม่' });
    }
  }

  // ── render ─────────────────────────────────────────────
  const { questions, answers, idx, timeLeft } = state;
  if (!questions.length) return null;

  const q   = questions[idx];
  const tot = questions.length;
  const num = idx + 1;
  const answeredCount = answers.filter(a => a && (typeof a !== 'string' || a.trim())).length;

  // ── Summary view ──
  if (showSummary) {
    return (
      <AnswerSummary
        questions={questions}
        answers={answers}
        onJump={jumpTo}
        onSubmit={confirmSubmit}
        onClose={() => setShowSummary(false)}
      />
    );
  }

  return (
    <div className="animate-fade">
      {/* Offline indicator */}
      {!isOnline && (
        <div style={{
          background: '#dc2626', color: 'white', textAlign: 'center',
          fontSize: 11, fontWeight: 700, padding: '5px 8px',
          borderRadius: '12px 12px 0 0',
        }}>
          📵 ไม่มีอินเทอร์เน็ต — ข้อสอบบันทึกในเครื่องอัตโนมัติ ส่งผลได้เมื่อออนไลน์
        </div>
      )}
      {/* Sticky Header */}
      <div className="exam-header rounded-t-2xl px-3 sm:px-5 py-2 sm:py-3" style={!isOnline ? { borderRadius: '0 0 0 0' } : {}}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1 min-w-0 mr-2">
            <div className="font-bold text-sm sm:text-base truncate" style={{ color: 'var(--header-text)' }}>{exam.lesson}</div>
            <div style={{ fontSize: 10, opacity: .75, color: 'var(--header-text)' }}>{profile?.displayName}</div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Back to menu */}
            <button onClick={() => {
              Swal.fire({
                title: 'ออกจากการสอบ?',
                html: '<div style="font-size:14px">คำตอบจะถูกบันทึกไว้<br>คุณสามารถกลับมาทำต่อได้</div>',
                icon: 'info',
                showCancelButton: true,
                confirmButtonText: 'ออกไปหน้าเมนู',
                cancelButtonText: 'ทำต่อ',
                confirmButtonColor: '#f59e0b',
                cancelButtonColor: '#6b7280',
              }).then(r => {
                if (r.isConfirmed) {
                  // บันทึก state ล่าสุดก่อนออก
                  try {
                    const { questions, answers, qTime, idx, timeLeft, timeUsed } = state;
                    localStorage.setItem(saveKeyRef.current, JSON.stringify({
                      questions, answers, qTime, idx, timeLeft, timeUsed, savedAt: Date.now(),
                    }));
                  } catch (_) {}
                  navigate('setup');
                }
              });
            }}
              style={{
                background: 'rgba(255,255,255,.2)', border: '1.5px solid rgba(255,255,255,.3)',
                borderRadius: 10, padding: '4px 8px', cursor: 'pointer',
                fontSize: 13, color: 'var(--header-text)',
                display: 'flex', alignItems: 'center',
              }}>
              ✕
            </button>
            {/* Question map button */}
            <button onClick={() => setShowMap(true)}
              style={{
                background: 'rgba(255,255,255,.2)', border: '1.5px solid rgba(255,255,255,.3)',
                borderRadius: 10, padding: '4px 10px', cursor: 'pointer',
                fontSize: 11, fontWeight: 700, color: 'var(--header-text)',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
              <span style={{ fontSize: 14 }}>☰</span>
              <span>{answeredCount}/{tot}</span>
            </button>
            <img src={APP_LOGO} alt="logo" className="w-8 h-8 rounded-full object-cover border-2 border-white border-opacity-40" />
            {settings.useTimer && (
              <>
                <div className={`timer-pill ${timerCls}`} style={paused ? { opacity: .5 } : {}}>
                  {paused ? '⏸' : '⏱'} {formatTime(timeLeft)}
                </div>
                <button onClick={togglePause}
                  style={{
                    background: paused ? '#22c55e' : 'rgba(255,255,255,.2)',
                    border: `1.5px solid ${paused ? '#16a34a' : 'rgba(255,255,255,.3)'}`,
                    borderRadius: 8, padding: '3px 8px', cursor: 'pointer',
                    fontSize: 13, color: paused ? 'white' : 'var(--header-text)',
                  }}>
                  {paused ? '▶' : '⏸'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Paused overlay */}
        {paused && (
          <div style={{
            textAlign: 'center', padding: '6px 0', fontSize: 12, fontWeight: 700,
            color: '#fbbf24', background: 'rgba(0,0,0,.15)', borderRadius: 8, marginBottom: 4,
          }}>
            ⏸ หยุดพักชั่วคราว — กด ▶ เพื่อทำต่อ ({pauseCount}/{MAX_PAUSE})
          </div>
        )}

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
        <div className="flex items-start gap-2 mb-4">
          <h2 className="flex-1 text-base sm:text-lg font-semibold" style={{ color: 'var(--text)', lineHeight: 1.7 }}>
            {num}. {q.question}
          </h2>
          <button
            onClick={flagCurrentQuestion}
            title="รายงานข้อสอบนี้"
            className="flex-shrink-0 mt-0.5 rounded-lg px-2 py-1 text-xs transition-all"
            style={{ background: 'var(--input-bg)', color: 'var(--text-muted)', border: '1px solid var(--input-border)' }}>
            🚩
          </button>
        </div>
        {q.imageUrl && (
          <img
            src={q.imageUrl}
            alt="รูปประกอบคำถาม"
            className="rounded-xl mb-4 w-full object-contain"
            style={{ maxHeight: 256, border: '1px solid var(--input-border)' }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        )}

        {/* Options — แยกตาม questionType */}
        <div className="mb-6">
          {q.questionType === 'fill' ? (
            /* ── Fill in blank ── */
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--text-muted)' }}>
                ✏️ พิมพ์คำตอบของคุณ
              </label>
              <input
                type="text"
                className="themed-input w-full text-base py-3"
                placeholder="พิมพ์คำตอบที่นี่..."
                value={answers[idx] || ''}
                onChange={e => setFillAnswer(e.target.value)}
                autoFocus
              />
            </div>
          ) : q.questionType === 'tf' ? (
            /* ── True / False ── */
            <div className="grid grid-cols-2 gap-3">
              {['ถูก', 'ผิด'].map((opt, i) => {
                const sel = answers[idx] === opt;
                return (
                  <div key={i}
                    className={`option-card rounded-2xl p-5 text-center cursor-pointer ${sel ? 'selected' : ''}`}
                    style={{ fontSize: 18, fontWeight: 700 }}
                    onClick={() => selectOpt(i)}>
                    <div style={{ fontSize: 32, marginBottom: 4 }}>{opt === 'ถูก' ? '✅' : '❌'}</div>
                    <div>{opt}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── Multiple Choice (default) ── */
            <div className="space-y-3">
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
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          {idx > 0 && (
            <button className="btn btn-gray rounded-xl py-2.5 sm:py-3 text-sm" onClick={prevQ}
              style={{ minWidth: 44 }}>
              ←
            </button>
          )}
          {idx < tot - 1 ? (
            <button className="btn btn-primary flex-1 rounded-xl py-2.5 sm:py-3 text-sm" onClick={nextQ}>
              ถัดไป →
            </button>
          ) : (
            <button className="btn btn-primary flex-1 rounded-xl py-2.5 sm:py-3 text-sm" onClick={nextQ} style={{ display: 'none' }} />
          )}
          <button className="btn btn-green flex-1 rounded-xl py-2.5 sm:py-3 text-sm" onClick={openSummary}
            style={{ flex: idx >= tot - 1 ? 1 : 'none', minWidth: idx >= tot - 1 ? undefined : 44, padding: idx >= tot - 1 ? undefined : '10px 12px' }}>
            {idx >= tot - 1 ? '📝 สรุป & ส่งคำตอบ' : '📝'}
          </button>
        </div>
      </div>

      {/* Question Map Modal */}
      {showMap && (
        <QuestionMap
          questions={questions}
          answers={answers}
          idx={idx}
          onJump={jumpTo}
          onClose={() => setShowMap(false)}
        />
      )}
    </div>
  );
}
