import { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { useApp } from '../context/AppContext';
import { apiPost, apiPostQueued, syncOfflineQueue, getOfflineQueueCount, genClientToken } from '../utils/api';
import { PASS_THRESHOLD, LIFF_ID, APP_LOGO } from '../config';

const CIRCUMFERENCE = 251.2;

const LINE_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
  </svg>
);

// ตัดข้อความยาว
function trunc(str, n = 60) {
  const s = String(str || '');
  return s.length > n ? s.slice(0, n) + '…' : s;
}

// ─── Footer ปุ่มร่วม ────────────────────────────────────────────
function buildFooter(liffId) {
  if (!liffId) return undefined; // ไม่มี LIFF ID → ไม่แสดง footer
  const base = `https://liff.line.me/${liffId}`;
  return {
    type: 'box', layout: 'vertical', paddingAll: '12px', spacing: 'sm',
    contents: [
      {
        type: 'box', layout: 'horizontal', spacing: 'sm',
        contents: [
          {
            type: 'button', style: 'primary', height: 'sm', flex: 1,
            color: '#4f46e5',
            action: { type: 'uri', label: 'ประวัติสอบ', uri: `${base}?page=history` },
          },
          {
            type: 'button', style: 'secondary', height: 'sm', flex: 1,
            action: { type: 'uri', label: 'สอบอีกครั้ง', uri: `${base}?page=quiz` },
          },
        ],
      },
    ],
  };
}

// ─── Bubble 1: สรุปคะแนน ───────────────────────────────────────
function buildSummaryBubble({ lesson, displayName, score, total, pct, pass, min, sec, wrongCount, liffId, attemptCount }) {
  const isPass     = pass;
  const headerBg   = isPass ? '#16a34a' : '#dc2626';
  const passColor  = isPass ? '#16a34a' : '#dc2626';
  const passText   = isPass ? '✅ ผ่านการสอบ' : '❌ ไม่ผ่านการสอบ';
  const rightCount = total - wrongCount;

  const footer = buildFooter(liffId);
  const bubble = {
    type: 'bubble', size: 'kilo',
    header: {
      type: 'box', layout: 'vertical', backgroundColor: headerBg, paddingAll: '16px',
      contents: [
        { type: 'text', text: 'ผลการสอบ', color: '#ffffffcc', size: 'xs' },
        { type: 'text', text: trunc(lesson, 50) || 'ไม่ระบุวิชา', color: '#ffffff', weight: 'bold', size: 'lg', wrap: true },
      ],
    },
    body: {
      type: 'box', layout: 'vertical', paddingAll: '16px', spacing: 'sm',
      contents: [
        {
          type: 'box', layout: 'horizontal', spacing: 'sm',
          contents: [
            { type: 'text', text: 'ผู้สอบ', size: 'sm', color: '#888888', flex: 2 },
            { type: 'text', text: trunc(displayName || 'ไม่ระบุ', 20), size: 'sm', color: '#333333', flex: 3, align: 'end', wrap: true },
          ],
        },
        {
          type: 'box', layout: 'horizontal', spacing: 'sm',
          contents: [
            { type: 'text', text: 'คะแนน', size: 'sm', color: '#888888', flex: 2 },
            { type: 'text', text: `${score}/${total} (${pct}%)`, size: 'lg', weight: 'bold', color: passColor, flex: 3, align: 'end' },
          ],
        },
        {
          type: 'box', layout: 'horizontal', spacing: 'sm',
          contents: [
            { type: 'text', text: 'ถูก / ผิด', size: 'sm', color: '#888888', flex: 2 },
            { type: 'text', text: `${rightCount} / ${wrongCount} ข้อ`, size: 'sm', color: '#333333', flex: 3, align: 'end' },
          ],
        },
        {
          type: 'box', layout: 'horizontal', spacing: 'sm',
          contents: [
            { type: 'text', text: 'เวลาที่ใช้', size: 'sm', color: '#888888', flex: 2 },
            { type: 'text', text: `${min}:${sec}`, size: 'sm', color: '#333333', flex: 3, align: 'end' },
          ],
        },
        ...(attemptCount ? [{
          type: 'box', layout: 'horizontal', spacing: 'sm',
          contents: [
            { type: 'text', text: 'สอบครั้งที่', size: 'sm', color: '#888888', flex: 2 },
            { type: 'text', text: String(attemptCount), size: 'sm', color: '#333333', flex: 3, align: 'end' },
          ],
        }] : []),
        { type: 'separator', margin: 'md' },
        {
          type: 'box', layout: 'vertical', margin: 'sm',
          backgroundColor: isPass ? '#f0fdf4' : '#fef2f2',
          cornerRadius: '10px', paddingAll: '10px',
          contents: [
            { type: 'text', text: passText, weight: 'bold', size: 'md', color: passColor, align: 'center' },
            { type: 'text', text: wrongCount > 0 ? 'เกณฑ์ผ่าน 60% - ปัดดูข้อผิด' : 'เกณฑ์ผ่าน 60% ขึ้นไป', size: 'xs', color: '#888888', align: 'center', margin: 'sm' },
          ],
        },
      ],
    },
  };
  if (footer) bubble.footer = footer;
  return bubble;
}

// ─── Bubble 2: รายละเอียดข้อผิด ────────────────────────────────
function buildWrongBubble(wrongItems, liffId) {
  if (wrongItems.length === 0) {
    const fb0 = {
      type: 'bubble', size: 'kilo',
      body: {
        type: 'box', layout: 'vertical', paddingAll: '20px', justifyContent: 'center',
        contents: [
          { type: 'text', text: 'ทำถูกทุกข้อ!', weight: 'bold', size: 'xl', align: 'center', color: '#16a34a', margin: 'md' },
          { type: 'text', text: 'ยอดเยี่ยมมาก ไม่มีข้อที่ผิดเลย', size: 'sm', color: '#888888', align: 'center', margin: 'sm' },
        ],
      },
    };
    const ft0 = buildFooter(liffId);
    if (ft0) fb0.footer = ft0;
    return fb0;
  }

  // แสดงสูงสุด 10 ข้อ เพื่อไม่ให้ bubble ใหญ่เกิน
  const showItems = wrongItems.slice(0, 10);
  const moreCount = wrongItems.length - showItems.length;

  const rows = [];
  showItems.forEach((item, i) => {
    if (i > 0) rows.push({ type: 'separator', margin: 'md' });
    rows.push({
      type: 'box', layout: 'vertical', margin: i === 0 ? 'none' : 'md', spacing: 'xs',
      contents: [
        // เลขข้อ
        {
          type: 'box', layout: 'horizontal',
          contents: [
            {
              type: 'box', layout: 'vertical', width: '28px', height: '28px',
              backgroundColor: '#fee2e2', cornerRadius: '14px',
              justifyContent: 'center', alignItems: 'center',
              contents: [{ type: 'text', text: String(item.no), size: 'xs', color: '#b91c1c', weight: 'bold', align: 'center' }],
            },
            { type: 'text', text: trunc(item.question, 55) || '-', size: 'sm', color: '#1f2937', flex: 1, wrap: true, margin: 'sm' },
          ],
        },
        // คำตอบ
        {
          type: 'box', layout: 'horizontal', margin: 'xs', spacing: 'sm',
          contents: [
            {
              type: 'box', layout: 'vertical', flex: 1, paddingAll: '6px',
              backgroundColor: '#fef2f2', cornerRadius: '6px',
              contents: [
                { type: 'text', text: 'คุณตอบ', size: 'xxs', color: '#b91c1c' },
                { type: 'text', text: trunc(item.userAnswer, 20) || '-', size: 'xs', color: '#b91c1c', weight: 'bold', wrap: true },
              ],
            },
            { type: 'text', text: '→', size: 'sm', color: '#9ca3af', align: 'center', flex: 0, margin: 'sm' },
            {
              type: 'box', layout: 'vertical', flex: 1, paddingAll: '6px',
              backgroundColor: '#f0fdf4', cornerRadius: '6px',
              contents: [
                { type: 'text', text: 'เฉลย', size: 'xxs', color: '#15803d' },
                { type: 'text', text: trunc(item.correctAnswer, 20) || '-', size: 'xs', color: '#15803d', weight: 'bold', wrap: true },
              ],
            },
          ],
        },
        // คำอธิบาย
        ...(item.explanation && item.explanation !== 'ไม่มีคำอธิบาย' ? [{
          type: 'box', layout: 'vertical', margin: 'xs',
          backgroundColor: '#f8fafc', cornerRadius: '6px', paddingAll: '8px',
          contents: [
            { type: 'text', text: '💡 ' + trunc(item.explanation, 80), size: 'xxs', color: '#475569', wrap: true },
          ],
        }] : []),
      ],
    });
  });

  if (moreCount > 0) {
    rows.push({ type: 'separator', margin: 'md' });
    rows.push({ type: 'text', text: `…และอีก ${moreCount} ข้อ (ดูเฉลยในแอป)`, size: 'xs', color: '#9ca3af', align: 'center', margin: 'md' });
  }

  const fb1 = {
    type: 'bubble', size: 'kilo',
    header: {
      type: 'box', layout: 'vertical', backgroundColor: '#fef2f2', paddingAll: '14px',
      contents: [
        { type: 'text', text: 'ข้อที่ตอบผิด (' + wrongItems.length + ' ข้อ)', weight: 'bold', size: 'md', color: '#b91c1c' },
        { type: 'text', text: 'ทบทวนและปรับปรุงต่อไป', size: 'xs', color: '#9ca3af', margin: 'xs' },
      ],
    },
    body: {
      type: 'box', layout: 'vertical', paddingAll: '14px',
      contents: rows,
    },
  };
  const ft1 = buildFooter(liffId);
  if (ft1) fb1.footer = ft1;
  return fb1;
}

// ─── สร้าง Flex Message หลัก (carousel) ────────────────────────
function buildFlexMsg({ lesson, displayName, score, total, pct, pass, min, sec, detail, liffId, attemptCount }) {
  const wrongItems = (detail || [])
    .map((d, i) => ({ ...d, no: i + 1 }))
    .filter(d => !d.isRight);

  const summaryBubble = buildSummaryBubble({ lesson, displayName, score, total, pct, pass, min, sec, wrongCount: wrongItems.length, liffId, attemptCount });
  const wrongBubble   = buildWrongBubble(wrongItems, liffId);
  const isPass        = pass;

  return {
    type: 'flex',
    altText: `ผลสอบ ${trunc(lesson,25)} ${score}/${total} (${pct}%) ${isPass ? 'ผ่าน' : 'ไม่ผ่าน'}`.slice(0, 400),
    contents: {
      type: 'carousel',
      contents: [summaryBubble, wrongBubble],
    },
  };
}

export default function ScoreScreen() {
  const { navigate, profile, lineEmail, exam, setExam } = useApp();
  const arcRef   = useRef(null);
  const savedRef = useRef(false);

  // Server verification states
  const [verifying, setVerifying] = useState(true);
  const [verifyError, setVerifyError] = useState('');
  const [serverResult, setServerResult] = useState(null); // { score, total, pct, pass, detail, examId }

  // สถานะการส่ง LINE
  const [lineStatus, setLineStatus] = useState('idle');
  const [lineErrMsg, setLineErrMsg] = useState('');
  const [saveQueued, setSaveQueued] = useState(false);
  const [syncCount, setSyncCount]   = useState(0);

  useEffect(() => {
    function handleOnline() {
      // sync queued results
      syncOfflineQueue().then(n => {
        if (n > 0) { setSyncCount(n); setSaveQueued(false); }
      }).catch(() => {});
      // auto-retry LINE message หากส่งไม่ได้ตอน offline
      setLineStatus(prev => {
        if (prev === 'err') {
          setTimeout(() => sendLineMessage(null), 1000);
          return 'sending';
        }
        return prev;
      });
    }
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // ── ส่งคำตอบไป server เพื่อตรวจคะแนน ───────────────────
  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;

    // Idempotency token — กันกรณี React StrictMode / auto-retry / กด submit 2 ครั้ง
    // ใช้ token เดียวกันระหว่าง online save + offline queue → server dedupe
    const clientToken = genClientToken();

    (async () => {
      try {
        const data = await apiPost({
          action:      'saveResult',
          clientToken: clientToken,
          userId:      profile?.userId      || '',
          displayName: profile?.displayName || '',
          email:       lineEmail            || '',
          lesson:      exam.lesson,
          questionIds: exam.questionIds     || exam.questions.map(q => q.id),
          userAnswers: exam.userAnswers     || exam.answers,
          timeUsed:    exam.timeUsed,
          setId:       exam.setId           || '',
        });

        if (!data.success) {
          setVerifyError(data.message || 'บันทึกผลสอบไม่สำเร็จ');
          setVerifying(false);
          return;
        }

        const result = {
          score:  data.score,
          total:  data.total,
          pct:    data.pct,
          pass:   data.pass === 'ผ่าน',
          detail: data.detail || [],
          examId: data.examId,
          suspicious: data.suspicious,
          attemptCount: data.attemptCount || 0,
        };
        setServerResult(result);

        // อัปเดต exam context ด้วยผลจาก server
        setExam(prev => ({
          ...prev,
          score:  result.score,
          detail: result.detail,
        }));

        setVerifying(false);

        // Animate donut + confetti
        setTimeout(() => {
          if (arcRef.current)
            arcRef.current.style.strokeDashoffset = CIRCUMFERENCE * (1 - result.pct / 100);
        }, 80);
        if (result.pct >= 80 && typeof confetti === 'function') {
          confetti({ particleCount: 200, spread: 100, origin: { y: .6 } });
        }

        // Achievement celebration popup
        if (result.pass) {
          const badge = result.pct === 100 ? '💎 Perfect Score!' : result.pct >= 90 ? '🏅 เกรด A+' : result.pct >= 80 ? '🌟 ยอดเยี่ยม!' : '✅ ผ่านการสอบ!';
          setTimeout(() => {
            Swal.fire({
              title: badge,
              html: result.pct >= 90
                ? `<div style="font-size:14px">คะแนน <b>${result.pct}%</b> — คุณทำได้ดีมาก!</div>`
                : `<div style="font-size:14px">คะแนน <b>${result.pct}%</b> — ดีใจด้วย!</div>`,
              icon: result.pct >= 90 ? 'success' : 'info',
              timer: 3000, timerProgressBar: true, showConfirmButton: false,
              backdrop: 'rgba(0,0,0,.4)',
            });
          }, 500);
        }

        // ส่ง LINE message
        sendLineMessage(result);
      } catch (e) {
        // Offline fallback
        setSaveQueued(true);
        setVerifying(false);
        setVerifyError('ไม่สามารถเชื่อมต่อ server ได้ — ผลสอบจะส่งเมื่อออนไลน์');

        // queue for later — ใช้ clientToken เดียวกันเพื่อ dedupe กับรอบแรก
        apiPostQueued({
          action:      'saveResult',
          clientToken: clientToken,
          userId:      profile?.userId      || '',
          displayName: profile?.displayName || '',
          email:       lineEmail            || '',
          lesson:      exam.lesson,
          questionIds: exam.questionIds     || exam.questions.map(q => q.id),
          userAnswers: exam.userAnswers     || exam.answers,
          timeUsed:    exam.timeUsed,
          setId:       exam.setId           || '',
        }).catch(() => {});
      }

      // sync old queued items
      try {
        const prevQueued = getOfflineQueueCount();
        if (prevQueued > 0) {
          const n = await syncOfflineQueue();
          if (n > 0) setSyncCount(n);
        }
      } catch (_) {}
    })();
  }, []);

  // Computed values from server result
  const tot  = serverResult?.total ?? exam.questions.length;
  const sc   = serverResult?.score ?? 0;
  const pct  = serverResult?.pct   ?? 0;
  const pass = serverResult?.pass  ?? false;
  const min  = Math.floor(exam.timeUsed / 60);
  const sec  = String(exam.timeUsed % 60).padStart(2, '0');

  // ── ฟังก์ชันส่ง LINE (แยกออกมาเพื่อกด "ส่งใหม่" ได้) ──
  async function sendLineMessage(result) {
    const r = result || serverResult;
    if (!r) return;
    if (!window.liff?.isInClient?.()) {
      setLineStatus('noClient');
      return;
    }

    setLineStatus('sending');
    try {
      const msg = buildFlexMsg({
        lesson:       exam.lesson,
        displayName:  profile?.displayName || '',
        score:        r.score,
        total:        r.total,
        pct:          r.pct,
        pass:         r.pass,
        min,
        sec,
        detail:       r.detail || [],
        liffId:       LIFF_ID,
        attemptCount: r.attemptCount || 0,
      });

      await liff.sendMessages([msg]);
      setLineStatus('ok');
    } catch (e) {
      console.error('liff.sendMessages error:', e);
      const errTxt = String(e?.message || e || '');

      // ตรวจสอบชนิด error
      if (errTxt.toLowerCase().includes('forbidden') || errTxt.includes('403')) {
        setLineErrMsg('ไม่มีสิทธิ์ส่งข้อความ — กรุณาเปิด scope chat_message.write ใน LINE Developer Console');
      } else if (errTxt.includes('not in LIFF')) {
        setLineErrMsg('ต้องเปิดผ่าน LINE App เท่านั้น');
      } else {
        setLineErrMsg(errTxt || 'ไม่ทราบสาเหตุ');
      }
      setLineStatus('err');
    }
  }

  const color = pass ? '#22c55e' : '#ef4444';

  // ── Loading state: กำลังตรวจคะแนน ──
  if (verifying) {
    return (
      <div className="quiz-card rounded-2xl p-8 sm:p-10 animate-fade">
        <div className="text-center">
          <img src={APP_LOGO} alt="logo" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 16px', display: 'block' }} />
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>
            กำลังประมวลผล...
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Loading.... กรุณารอสักครู่
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (verifyError && !serverResult) {
    return (
      <div className="quiz-card rounded-2xl p-8 sm:p-10 animate-fade">
        <div className="text-center">
          <div style={{ fontSize: 48, marginBottom: 16 }}>{saveQueued ? '📶' : '⚠️'}</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: saveQueued ? '#92400e' : '#ef4444', marginBottom: 8 }}>
            {saveQueued ? 'ไม่มีสัญญาณอินเทอร์เน็ต' : verifyError}
          </div>
          {saveQueued && (
            <div className="rounded-xl px-4 py-3 mb-4 text-sm text-left" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}>
              ผลสอบถูกบันทึกไว้ในเครื่องแล้ว และจะส่งไปยัง server อัตโนมัติเมื่อมีสัญญาณอินเทอร์เน็ตกลับมา
            </div>
          )}
          <button className="btn btn-primary rounded-xl py-2.5 px-6 text-sm" onClick={() => navigate('setup')}>
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-card rounded-2xl p-4 sm:p-7 animate-bounce-in">
      <div className="text-center">

        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <img src={APP_LOGO} alt="logo" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 3px 12px rgba(0,0,0,.1)' }} />
        </div>

        {/* Donut */}
        <div className="relative w-28 h-28 sm:w-36 sm:h-36 mx-auto mb-4">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--progress-trk)" strokeWidth="10" />
            <circle
              ref={arcRef} cx="50" cy="50" r="40" fill="none"
              stroke={color} strokeWidth="10"
              strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE}
              transform="rotate(-90 50 50)" className="donut-ring score-glow"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-xl sm:text-2xl font-extrabold" style={{ color }}>{pct}%</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{sc}/{tot}</div>
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

        {/* Offline queued notice */}
        {saveQueued && (
          <div className="rounded-xl px-3 py-2 mb-3 text-xs text-left" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}>
            📶 ไม่มีสัญญาณอินเทอร์เน็ต — ผลสอบถูกบันทึกไว้ในเครื่องและจะส่งอัตโนมัติเมื่อออนไลน์กลับมา
          </div>
        )}
        {syncCount > 0 && (
          <div className="rounded-xl px-3 py-2 mb-3 text-xs text-left" style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
            ✅ ซิงก์ผลสอบที่ค้างไว้ {syncCount} รายการ สำเร็จแล้ว
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="stat-box animate-slide-up" style={{ animationDelay: '.1s' }}>
            <div className="text-xl sm:text-2xl font-black" style={{ color: 'var(--accent)' }}>{sc}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>ถูก</div>
          </div>
          <div className="stat-box animate-slide-up" style={{ animationDelay: '.22s' }}>
            <div className="text-xl sm:text-2xl font-black text-red-500">{tot - sc}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>ผิด</div>
          </div>
          <div className="stat-box animate-slide-up" style={{ animationDelay: '.34s' }}>
            <div className="text-xl sm:text-2xl font-black text-yellow-500">{min}:{sec}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>เวลาที่ใช้</div>
          </div>
        </div>

        {/* Subject Breakdown */}
        {(() => {
          const detail = serverResult?.detail || [];
          if (detail.length === 0) return null;
          const bySubj = {};
          detail.forEach(d => {
            const key = d.lesson || d.subject || exam.lesson || 'ทั่วไป';
            if (!bySubj[key]) bySubj[key] = { right: 0, total: 0 };
            bySubj[key].total++;
            if (d.isRight) bySubj[key].right++;
          });
          const subjects = Object.entries(bySubj);
          if (subjects.length <= 1) return null;
          return (
            <div className="mb-5 text-left animate-slide-up" style={{ animationDelay: '.4s' }}>
              <div className="text-xs font-bold mb-2" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                📊 คะแนนแยกตามหมวด
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {subjects.map(([name, s]) => {
                  const p = Math.round((s.right / s.total) * 100);
                  const barColor = p >= 80 ? '#16a34a' : p >= 60 ? '#3b82f6' : '#ef4444';
                  return (
                    <div key={name} style={{ background: 'var(--input-bg)', borderRadius: 12, padding: '8px 12px', border: '1px solid var(--input-border)' }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold truncate" style={{ color: 'var(--text)', maxWidth: '60%' }}>{name}</span>
                        <span className="text-xs font-bold" style={{ color: barColor }}>{s.right}/{s.total} ({p}%)</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 99, background: 'var(--progress-trk)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 99, background: barColor, width: `${p}%`, transition: 'width .5s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* LINE Status ─────────────────────────── */}
        {lineStatus === 'sending' && (
          <div className="flex items-center justify-center gap-2 text-xs py-2 px-4 rounded-full mb-4 w-fit mx-auto animate-fade"
            style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac' }}>
            <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>กำลังส่งผลสอบเข้า LINE...</span>
          </div>
        )}

        {lineStatus === 'ok' && (
          <div className="flex items-center justify-center gap-2 text-xs py-2 px-4 rounded-full mb-4 w-fit mx-auto animate-fade"
            style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac' }}>
            {LINE_ICON}
            <span>ส่งผลสอบเข้าห้องแชทแล้ว ✅</span>
          </div>
        )}

        {lineStatus === 'noClient' && (
          <div className="text-xs py-2 px-4 rounded-xl mb-4 text-left animate-fade"
            style={{ background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' }}>
            ⚠️ เปิดผ่าน Browser — ไม่สามารถส่งข้อความไปยัง LINE Chat ได้
            <br />
            <span style={{ color: '#6b7280' }}>กรุณาเปิดผ่านแอป LINE เพื่อรับผลสอบในห้องแชท</span>
          </div>
        )}

        {lineStatus === 'err' && (
          <div className="rounded-xl mb-4 overflow-hidden animate-fade"
            style={{ border: '1px solid #fca5a5' }}>
            <div className="text-xs py-2 px-4"
              style={{ background: '#fef2f2', color: '#b91c1c' }}>
              <div className="font-semibold mb-1">❌ ส่งเข้า LINE ไม่สำเร็จ</div>
              <div style={{ color: '#ef4444', wordBreak: 'break-word' }}>{lineErrMsg}</div>
              {lineErrMsg.includes('chat_message.write') && (
                <div className="mt-2 p-2 rounded-lg text-left"
                  style={{ background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' }}>
                  <b>วิธีแก้ไข:</b>
                  <ol className="list-decimal list-inside mt-1 space-y-0.5">
                    <li>ไปที่ LINE Developer Console</li>
                    <li>เลือก LIFF App ของคุณ</li>
                    <li>เปิด <b>Scopes → chat_message.write</b></li>
                    <li>บันทึก และล็อกอินใหม่</li>
                  </ol>
                </div>
              )}
            </div>
            <button className="btn w-full text-xs py-2"
              style={{ background: '#fee2e2', color: '#b91c1c' }}
              onClick={sendLineMessage}>
              🔄 ลองส่งใหม่
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {exam.allowReview !== false && (
            <button className="btn btn-blue w-full rounded-xl py-2.5 text-sm" onClick={() => navigate('review')}>
              🔍 ดูเฉลยทุกข้อ
            </button>
          )}
          {exam.setId && (
            <button className="btn w-full rounded-xl py-2.5 text-sm font-semibold"
              style={{ background: '#d97706', color: 'white' }}
              onClick={() => navigate('examSetLeaderboard')}>
              🏆 ดูอันดับชุดข้อสอบนี้
            </button>
          )}
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
