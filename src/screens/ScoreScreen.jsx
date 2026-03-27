import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiPost } from '../utils/api';
import { PASS_THRESHOLD, LIFF_ID } from '../config';

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
  const base = liffId ? `https://liff.line.me/${liffId}` : '#';
  return {
    type: 'box', layout: 'vertical', paddingAll: '12px', spacing: 'sm',
    contents: [
      {
        type: 'box', layout: 'horizontal', spacing: 'sm',
        contents: [
          {
            type: 'button', style: 'primary', height: 'sm', flex: 1,
            color: '#4f46e5',
            action: { type: 'uri', label: '📋 ประวัติสอบ', uri: `${base}?page=history` },
          },
          {
            type: 'button', style: 'secondary', height: 'sm', flex: 1,
            action: { type: 'uri', label: '🔄 สอบอีกครั้ง', uri: `${base}?page=quiz` },
          },
        ],
      },
    ],
  };
}

// ─── Bubble 1: สรุปคะแนน ───────────────────────────────────────
function buildSummaryBubble({ lesson, displayName, score, total, pct, pass, min, sec, wrongCount, liffId }) {
  const isPass     = pass;
  const headerBg   = isPass ? '#16a34a' : '#dc2626';
  const passColor  = isPass ? '#16a34a' : '#dc2626';
  const passText   = isPass ? '✅ ผ่านการสอบ' : '❌ ไม่ผ่านการสอบ';
  const rightCount = total - wrongCount;

  return {
    type: 'bubble', size: 'kilo',
    header: {
      type: 'box', layout: 'vertical', backgroundColor: headerBg, paddingAll: '16px',
      contents: [
        { type: 'text', text: '📝 ผลการสอบ', color: '#ffffffcc', size: 'xs' },
        { type: 'text', text: trunc(lesson, 50), color: '#ffffff', weight: 'bold', size: 'lg', wrap: true },
      ],
    },
    body: {
      type: 'box', layout: 'vertical', paddingAll: '16px', spacing: 'sm',
      contents: [
        // ผู้สอบ
        {
          type: 'box', layout: 'horizontal', spacing: 'sm',
          contents: [
            { type: 'text', text: '👤 ผู้สอบ', size: 'sm', color: '#888888', flex: 2 },
            { type: 'text', text: trunc(displayName || 'ไม่ระบุ', 20), size: 'sm', color: '#333333', flex: 3, align: 'end', wrap: true },
          ],
        },
        // คะแนน
        {
          type: 'box', layout: 'horizontal', spacing: 'sm',
          contents: [
            { type: 'text', text: '📊 คะแนน', size: 'sm', color: '#888888', flex: 2 },
            { type: 'text', text: `${score}/${total}  (${pct}%)`, size: 'lg', weight: 'bold', color: passColor, flex: 3, align: 'end' },
          ],
        },
        // ถูก/ผิด
        {
          type: 'box', layout: 'horizontal', spacing: 'sm',
          contents: [
            { type: 'text', text: '✔ ถูก / ✖ ผิด', size: 'sm', color: '#888888', flex: 2 },
            { type: 'text', text: `${rightCount} / ${wrongCount} ข้อ`, size: 'sm', color: '#333333', flex: 3, align: 'end' },
          ],
        },
        // เวลา
        {
          type: 'box', layout: 'horizontal', spacing: 'sm',
          contents: [
            { type: 'text', text: '⏱ เวลาที่ใช้', size: 'sm', color: '#888888', flex: 2 },
            { type: 'text', text: `${min}:${sec}`, size: 'sm', color: '#333333', flex: 3, align: 'end' },
          ],
        },
        { type: 'separator', margin: 'md' },
        // ผลสรุป
        {
          type: 'box', layout: 'vertical', margin: 'sm',
          backgroundColor: isPass ? '#f0fdf4' : '#fef2f2',
          cornerRadius: '10px', paddingAll: '10px',
          contents: [
            { type: 'text', text: passText, weight: 'bold', size: 'md', color: passColor, align: 'center' },
            { type: 'text', text: `เกณฑ์ผ่าน 60% ขึ้นไป${wrongCount > 0 ? '  •  ปัดดูข้อผิด ›' : ''}`, size: 'xs', color: '#888888', align: 'center', margin: 'sm' },
          ],
        },
      ],
    },
    footer: buildFooter(liffId),
  };
}

// ─── Bubble 2: รายละเอียดข้อผิด ────────────────────────────────
function buildWrongBubble(wrongItems, liffId) {
  if (wrongItems.length === 0) {
    return {
      type: 'bubble', size: 'kilo',
      body: {
        type: 'box', layout: 'vertical', paddingAll: '20px', justifyContent: 'center',
        contents: [
          { type: 'text', text: '🌟', size: 'xxl', align: 'center' },
          { type: 'text', text: 'ทำถูกทุกข้อ!', weight: 'bold', size: 'xl', align: 'center', color: '#16a34a', margin: 'md' },
          { type: 'text', text: 'ยอดเยี่ยมมาก ไม่มีข้อที่ผิดเลย', size: 'sm', color: '#888888', align: 'center', margin: 'sm' },
        ],
      },
      footer: buildFooter(liffId),
    };
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
            { type: 'text', text: trunc(item.question, 55), size: 'sm', color: '#1f2937', flex: 1, wrap: true, margin: 'sm' },
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
                { type: 'text', text: trunc(item.userAnswer, 20), size: 'xs', color: '#b91c1c', weight: 'bold', wrap: true },
              ],
            },
            { type: 'text', text: '→', size: 'sm', color: '#9ca3af', align: 'center', flex: 0, margin: 'sm' },
            {
              type: 'box', layout: 'vertical', flex: 1, paddingAll: '6px',
              backgroundColor: '#f0fdf4', cornerRadius: '6px',
              contents: [
                { type: 'text', text: 'เฉลย', size: 'xxs', color: '#15803d' },
                { type: 'text', text: trunc(item.correctAnswer, 20), size: 'xs', color: '#15803d', weight: 'bold', wrap: true },
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

  return {
    type: 'bubble', size: 'kilo',
    header: {
      type: 'box', layout: 'vertical', backgroundColor: '#fef2f2', paddingAll: '14px',
      contents: [
        { type: 'text', text: `❌ ข้อที่ตอบผิด (${wrongItems.length} ข้อ)`, weight: 'bold', size: 'md', color: '#b91c1c' },
        { type: 'text', text: 'ทบทวนและปรับปรุงต่อไป', size: 'xs', color: '#9ca3af', margin: 'xs' },
      ],
    },
    body: {
      type: 'box', layout: 'vertical', paddingAll: '14px',
      contents: rows,
    },
    footer: buildFooter(liffId),
  };
}

// ─── สร้าง Flex Message หลัก (carousel) ────────────────────────
function buildFlexMsg({ lesson, displayName, score, total, pct, pass, min, sec, detail, liffId }) {
  const wrongItems = (detail || [])
    .map((d, i) => ({ ...d, no: i + 1 }))
    .filter(d => !d.isRight);

  const summaryBubble = buildSummaryBubble({ lesson, displayName, score, total, pct, pass, min, sec, wrongCount: wrongItems.length, liffId });
  const wrongBubble   = buildWrongBubble(wrongItems, liffId);
  const isPass        = pass;

  return {
    type: 'flex',
    altText: `📝 ${trunc(lesson,30)} | ${score}/${total} (${pct}%) ${isPass ? '✅ ผ่าน' : '❌ ไม่ผ่าน'} | ผิด ${wrongItems.length} ข้อ`,
    contents: {
      type: 'carousel',
      contents: [summaryBubble, wrongBubble],
    },
  };
}

export default function ScoreScreen() {
  const { navigate, profile, lineEmail, exam } = useApp();
  const arcRef   = useRef(null);
  const savedRef = useRef(false);

  // สถานะการส่ง LINE
  const [lineStatus, setLineStatus] = useState('idle'); // idle | sending | ok | err | noClient
  const [lineErrMsg, setLineErrMsg] = useState('');

  const tot  = exam.questions.length;
  const pct  = tot > 0 ? Math.round((exam.score / tot) * 100) : 0;
  const pass = pct >= PASS_THRESHOLD;
  const min  = Math.floor(exam.timeUsed / 60);
  const sec  = String(exam.timeUsed % 60).padStart(2, '0');

  // ── บันทึกผล + ส่ง Flex Message ───────────────────────
  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;

    // Animate donut
    setTimeout(() => {
      if (arcRef.current)
        arcRef.current.style.strokeDashoffset = CIRCUMFERENCE * (1 - pct / 100);
    }, 80);

    // Confetti
    if (pct >= 80 && typeof confetti === 'function') {
      confetti({ particleCount: 200, spread: 100, origin: { y: .6 } });
    }

    // 1) บันทึกผลสอบ
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
      setId:       exam.setId           || '',   // บันทึก setId ถ้าสอบจากชุด
    }).catch(e => console.error('saveResult error:', e));

    // 2) ส่ง Flex Message ทาง LIFF
    sendLineMessage();
  }, []);

  // ── ฟังก์ชันส่ง LINE (แยกออกมาเพื่อกด "ส่งใหม่" ได้) ──
  async function sendLineMessage() {
    // ตรวจสอบว่าอยู่ใน LINE App หรือเปล่า
    if (!window.liff?.isInClient?.()) {
      setLineStatus('noClient');
      return;
    }

    setLineStatus('sending');
    try {
      const msg = buildFlexMsg({
        lesson:      exam.lesson,
        displayName: profile?.displayName || '',
        score:       exam.score,
        total:       tot,
        pct,
        pass,
        min,
        sec,
        detail:      exam.detail || [],
        liffId:      LIFF_ID,
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
        <div className="grid grid-cols-3 gap-3 mb-5">
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
