import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiGet } from '../utils/api';
import Spinner from '../components/Spinner';

function formatThaiDate(dateStr) {
  try {
    const d = dateStr ? new Date(dateStr) : new Date();
    return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return dateStr || new Date().toLocaleDateString('th-TH'); }
}

export default function CertificateScreen() {
  const { navigate, profile } = useApp();
  const [stats,   setStats]   = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selExam, setSelExam] = useState(null); // ชุดสอบที่เลือกแสดงใบ
  const certRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, h] = await Promise.all([
          apiGet('getMyStats',  { userId: profile?.userId }),
          apiGet('getHistory',  { userId: profile?.userId, page: 1, size: 50 }),
        ]);
        if (s.success) setStats(s.summary);
        if (h.success) {
          const passed = (h.history || []).filter(x => x.pass === 'ผ่าน');
          setHistory(passed);
          if (passed.length > 0) setSelExam(passed[0]);
        }
      } catch (_) {}
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <Spinner label="กำลังโหลด..." />;

  if (history.length === 0) {
    return (
      <div className="animate-fade">
        <div className="quiz-card no-hover rounded-2xl p-10 text-center">
          <div className="text-5xl mb-4">🎓</div>
          <div className="font-bold text-base mb-2" style={{ color: 'var(--text)' }}>ยังไม่มีใบประกาศ</div>
          <div className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>ผ่านการสอบอย่างน้อย 1 ครั้งเพื่อรับใบประกาศ</div>
          <button className="btn btn-primary rounded-xl px-6 py-2.5" onClick={() => navigate('setup')}>
            🎯 ไปสอบเลย
          </button>
        </div>
        <button className="btn btn-gray w-full rounded-xl py-3 mt-3" onClick={() => navigate('myStats')}>← กลับ</button>
      </div>
    );
  }

  const exam = selExam || history[0];
  const pct  = parseInt(String(exam?.pct || '0').replace('%','')) || 0;
  const today = formatThaiDate(exam?.date);

  return (
    <div className="animate-fade space-y-4">

      {/* Header */}
      <div className="quiz-card no-hover rounded-2xl p-3 flex items-center justify-between">
        <h1 className="font-bold text-sm" style={{ color: 'var(--text)' }}>🎓 ใบประกาศผลสอบ</h1>
        <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5"
          onClick={() => navigate('myStats')}>← กลับ</button>
      </div>

      {/* เลือกชุดสอบ */}
      {history.length > 1 && (
        <div className="quiz-card no-hover rounded-2xl p-3">
          <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>เลือกผลสอบที่ต้องการ</div>
          <select className="themed-input w-full text-sm"
            value={selExam?.examId || ''}
            onChange={e => setSelExam(history.find(h => h.examId === e.target.value))}>
            {history.map(h => (
              <option key={h.examId} value={h.examId}>
                {h.lesson} — {parseInt(String(h.pct||'0').replace('%',''))}% • {h.date}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ใบประกาศ */}
      <div ref={certRef} className="quiz-card no-hover rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#fff9f0 0%,#fff 60%,#f0f7ff 100%)' }}>

        {/* Top bar */}
        <div style={{ background: 'linear-gradient(90deg,#4f46e5,#7c3aed)', padding: '16px 24px' }}>
          <div className="text-white font-bold text-center text-base tracking-wide">
            ใบรับรองผลการสอบ
          </div>
          <div className="text-center" style={{ color: '#c4b5fd', fontSize: 11 }}>Certificate of Achievement</div>
        </div>

        {/* Body */}
        <div className="p-6 text-center space-y-4">
          <div style={{ color: '#6b7280', fontSize: 13 }}>ขอมอบใบประกาศนี้ให้แก่</div>

          {/* Avatar + Name */}
          <div className="flex flex-col items-center gap-2">
            <img src={profile?.pictureUrl || 'https://i.pinimg.com/originals/be/04/0f/be040f35f073adc3a48c1fba489d2bc4.gif'}
              alt="" className="w-16 h-16 rounded-full object-cover"
              style={{ border: '3px solid #4f46e5', boxShadow: '0 0 0 3px #e0e7ff' }}/>
            <div className="text-xl font-black" style={{ color: '#1e1b4b' }}>{profile?.displayName}</div>
          </div>

          <div style={{ color: '#6b7280', fontSize: 12 }}>ได้ผ่านการทดสอบวิชา</div>

          {/* Subject */}
          <div className="rounded-xl px-4 py-3 mx-4"
            style={{ background: 'linear-gradient(135deg,#ede9fe,#dbeafe)', border: '1px solid #c4b5fd' }}>
            <div className="font-bold text-base" style={{ color: '#4f46e5' }}>{exam?.lesson}</div>
          </div>

          {/* Score */}
          <div className="grid grid-cols-3 gap-3 mx-2">
            {[
              { val: pct+'%',    label: 'คะแนน',      color: '#4f46e5' },
              { val: exam?.score+'/'+exam?.total, label: 'ถูก/ทั้งหมด', color: '#16a34a' },
              { val: stats?.totalPass||1, label: 'ครั้งที่ผ่าน', color: '#d97706' },
            ].map(s => (
              <div key={s.label} className="rounded-xl py-3"
                style={{ background: 'rgba(79,70,229,.06)', border: '1px solid #e0e7ff' }}>
                <div className="text-lg font-black" style={{ color: s.color }}>{s.val}</div>
                <div className="text-xs" style={{ color: '#6b7280' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Seal */}
          <div className="flex flex-col items-center gap-1 py-2">
            <div className="text-4xl animate-bounce-in">✅</div>
            <div className="font-black text-lg" style={{ color: '#16a34a' }}>ผ่านการสอบ</div>
            <div className="text-xs" style={{ color: '#9ca3af' }}>{today}</div>
          </div>

          {/* Decorative line */}
          <div className="mx-4" style={{ borderTop: '2px dashed #e0e7ff' }}/>

          <div className="text-xs" style={{ color: '#9ca3af' }}>
            ระบบข้อสอบออนไลน์ — ออกโดยผู้ดูแลระบบ
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ background: 'linear-gradient(90deg,#4f46e5,#7c3aed)', height: 8 }}/>
      </div>

      {/* Share to LINE */}
      <button
        className="btn w-full rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2"
        style={{ background: '#06C755', color: 'white' }}
        onClick={async () => {
          if (window.liff?.isInClient?.()) {
            try {
              await window.liff.sendMessages([{
                type: 'text',
                text: `🎓 ฉันผ่านการสอบวิชา "${exam?.lesson}" ด้วยคะแนน ${pct}% ✅`,
              }]);
            } catch (_) {}
          } else {
            alert('กรุณาเปิดผ่านแอป LINE เพื่อแชร์');
          }
        }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
        </svg>
        แชร์เข้า LINE Chat
      </button>

      <button className="btn btn-gray w-full rounded-xl py-2.5" onClick={() => navigate('myStats')}>
        ← กลับ
      </button>
    </div>
  );
}
