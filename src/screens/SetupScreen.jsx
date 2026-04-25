import { useState, useEffect, useRef, useCallback } from 'react';
import Swal from 'sweetalert2';
import { useApp } from '../context/AppContext';
import { apiGet, apiGetCached } from '../utils/api';
import { APP_LOGO, FALLBACK_AVATAR } from '../config';

// ตัวเลือก preset ถูกย้ายไป ExamSettingsSheet แล้ว ยังคงไว้ถ้ามีการใช้ที่อื่น
const THEMES = [
  { id: 'sw-white',  cls: '',         bg: '#f8fafc', border: '#cbd5e1', label: 'ขาว' },
  { id: 'sw-dark',   cls: 't-dark',   bg: '#1e293b', border: '',        label: 'ดำ' },
  { id: 'sw-blue',   cls: 't-blue',   bg: '#2563eb', border: '',        label: 'น้ำเงิน' },
  { id: 'sw-green',  cls: 't-green',  bg: '#16a34a', border: '',        label: 'เขียว' },
  { id: 'sw-purple', cls: 't-purple', bg: '#9333ea', border: '',        label: 'ม่วง' },
  { id: 'sw-orange', cls: 't-orange', bg: '#ea580c', border: '',        label: 'ส้ม' },
];

const DEFAULT_BANNERS = [
  {
    gradient: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
    emoji: '🎯', title: 'พร้อมทดสอบแล้วหรือยัง?',
    sub: 'เพิ่มพูนความรู้ ก้าวหน้าทุกวัน', cta: 'เริ่มเลย', ctaScreen: 'examSets',
  },
  {
    gradient: 'linear-gradient(135deg,#06b6d4 0%,#3b82f6 100%)',
    emoji: '📊', title: 'ติดตามความก้าวหน้าของคุณ',
    sub: 'วิเคราะห์จุดอ่อน พัฒนาตัวเองทุกวัน', cta: 'ดูสถิติ', ctaScreen: 'myStats',
  },
  {
    gradient: 'linear-gradient(135deg,#f59e0b 0%,#ef4444 100%)',
    emoji: '🏆', title: 'แข่งกับเพื่อนๆ บน Leaderboard',
    sub: 'พิสูจน์ความสามารถ ก้าวขึ้นสู่อันดับ 1', cta: 'ดูอันดับ', ctaScreen: 'leaderboard',
  },
];

// ── Banner Carousel ───────────────────────────────────────────
function BannerCarousel({ slides, onNavigate }) {
  const [idx, setIdx]   = useState(0);
  const timerRef        = useRef(null);
  const touchStartX     = useRef(0);

  const resetTimer = useCallback((nextFn) => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(nextFn, 4500);
  }, []);

  useEffect(() => {
    const next = () => setIdx(i => (i + 1) % slides.length);
    timerRef.current = setInterval(next, 4500);
    return () => clearInterval(timerRef.current);
  }, [slides.length]);

  const goTo = (i) => {
    setIdx(i);
    const next = () => setIdx(j => (j + 1) % slides.length);
    resetTimer(next);
  };

  const s = slides[idx];

  return (
    <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}
      onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={e => {
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) goTo(diff > 0 ? (idx + 1) % slides.length : (idx - 1 + slides.length) % slides.length);
      }}>

      {/* Slides */}
      {slides.map((sl, i) => (
        <div key={i} style={{
          position: i === 0 ? 'relative' : 'absolute',
          inset: 0, zIndex: i === idx ? 1 : 0,
          background: sl.gradient,
          opacity: i === idx ? 1 : 0,
          transition: 'opacity .55s ease',
          padding: '20px 18px 36px',
          minHeight: 160,
        }}>
          {/* Decorative circles */}
          <div style={{ position:'absolute', top:-30, right:-30, width:130, height:130, borderRadius:'50%', background:'rgba(255,255,255,.08)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:-20, left:'30%', width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,.06)', pointerEvents:'none' }} />

          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div style={{ fontSize: 36, lineHeight:1, marginBottom: 8 }}>{sl.emoji}</div>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'white', textShadow: '0 1px 6px rgba(0,0,0,.25)', lineHeight: 1.3 }}>
                {sl.title}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.82)', marginTop: 4, lineHeight: 1.4 }}>
                {sl.sub}
              </div>
            </div>
            {sl.cta && (
              <button
                style={{
                  background: 'rgba(255,255,255,.22)', backdropFilter: 'blur(10px)',
                  border: '1.5px solid rgba(255,255,255,.45)', color: 'white',
                  borderRadius: 50, padding: '7px 16px', fontSize: 12,
                  fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
                }}
                onClick={() => onNavigate(sl.ctaScreen)}>
                {sl.cta} →
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Dots */}
      <div style={{
        position:'absolute', bottom: 10, left:'50%', transform:'translateX(-50%)',
        display:'flex', gap: 5, zIndex: 10,
      }}>
        {slides.map((_, i) => (
          <div key={i}
            onClick={() => goTo(i)}
            style={{
              width: i === idx ? 22 : 6, height: 6, borderRadius: 3,
              background: `rgba(255,255,255,${i === idx ? 1 : 0.4})`,
              transition: 'all .3s ease', cursor: 'pointer',
            }} />
        ))}
      </div>
    </div>
  );
}

// ── Stat Mini Card ────────────────────────────────────────────
function StatCard({ icon, value, label, color, delay = 0 }) {
  return (
    <div className="anim-slide-up flex-1 text-center"
      style={{
        animationDelay: `${delay}s`,
        background: 'var(--card)', border: '1px solid var(--card-border)',
        borderRadius: 18, padding: '14px 8px',
        boxShadow: '0 2px 12px rgba(0,0,0,.04)',
      }}>
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

// ── Quick Access Grid ─────────────────────────────────────────
function QuickGrid({ items, navigate }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
      {items.map((item, i) => (
        <button key={item.screen} className="quick-btn anim-slide-up"
          style={{ animationDelay: `${0.05 * i}s` }}
          onClick={() => navigate(item.screen)}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: `${item.color}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
          }}>{item.icon}</div>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function SetupScreen() {
  const { navigate, profile, theme, setTheme, settings, setSettings, setExam, isAdmin, isTeacher, questionBank, userCourse } = useApp();
  const qbOpen = !questionBank || questionBank.open || isAdmin; // admin always has access

  const [showSettings, setShowSettings] = useState(false);

  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed,     setInstalled]     = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [pendingSets,   setPendingSets]   = useState(0);
  const [totalSets,     setTotalSets]     = useState(0);
  const [doneSets,      setDoneSets]      = useState(0);
  const [myStats,       setMyStats]       = useState(null);
  const [assignedSets,  setAssignedSets]  = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [savedQuiz, setSavedQuiz] = useState(null);
  const [loadError, setLoadError]   = useState(false);   // API ล้มเหลว
  const [retrying,  setRetrying]    = useState(false);   // กำลัง retry

  const loadData = useCallback(async (isRetry = false) => {
    if (isRetry) setRetrying(true);
    setLoadError(false);
    let anyError = false;

    await Promise.allSettled([
      apiGetCached('getAnnouncements', {}, 5 * 60_000)
        .then(d => { if (d.success) setAnnouncements(d.announcements || []); }),

      apiGet('getExamSets', { userId: profile?.userId })
        .then(d => {
          if (d.success) {
            const sets = d.sets || [];
            setPendingSets(sets.filter(s => s.myAttempts === 0).length);
            setTotalSets(sets.length);
            setDoneSets(sets.filter(s => s.myAttempts > 0).length);
            setAssignedSets(sets.filter(s => s.isAssigned && !s.myPassed));
          } else { anyError = true; }
        }).catch(() => { anyError = true; }),

      apiGet('getMyStats', { userId: profile?.userId })
        .then(d => { if (d.success) setMyStats(d); }),

      apiGet('getHistory', { userId: profile?.userId })
        .then(d => { if (d.success) setRecentActivity((d.history || []).slice(0, 5)); }),
    ]);

    if (anyError) setLoadError(true);
    if (isRetry) setRetrying(false);
  }, [profile?.userId]);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); setInstallPrompt(e); });
    window.addEventListener('appinstalled', () => { setInstallPrompt(null); setInstalled(true); });

    loadData();

    // ตรวจหา saved quiz ใน localStorage
    try {
      const prefix = `quiz_autosave_${profile?.userId || 'guest'}_`;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const saved = JSON.parse(localStorage.getItem(key));
          if (saved && saved.questions && saved.answers && saved.savedAt) {
            // ตรวจว่าไม่เก่าเกิน 24 ชั่วโมง
            if (Date.now() - saved.savedAt < 24 * 60 * 60 * 1000) {
              const answeredCount = saved.answers.filter(a => a && (typeof a !== 'string' || a.trim())).length;
              setSavedQuiz({
                key,
                lesson: saved.questions[0]?.lesson || key.replace(prefix, ''),
                answeredCount,
                totalCount: saved.questions.length,
                savedAt: saved.savedAt,
                data: saved,
              });
            } else {
              // เก่าเกิน 24 ชม. → ลบทิ้ง
              localStorage.removeItem(key);
            }
            break; // แสดงแค่อันเดียว (ล่าสุด)
          }
        }
      }
    } catch (_) {}
  }, []);

  function goToSubject() {
    if (!qbOpen) {
      const reason = questionBank?.reason || 'คลังข้อสอบปิดอยู่';
      const extra = questionBank?.opensAt
        ? `\nเปิดเวลา: ${new Date(questionBank.opensAt).toLocaleString('th-TH')}`
        : questionBank?.closedAt
          ? `\nหมดเวลาเมื่อ: ${new Date(questionBank.closedAt).toLocaleString('th-TH')}`
          : '';
      Swal.fire({ icon: 'warning', title: '🔒 คลังข้อสอบปิดอยู่', text: reason + extra });
      return;
    }
    // ถ้า questionBank กำหนดจำนวนข้อไว้ ให้ใช้ค่านั้น (ค่าตั้งค่าการสอบอื่นๆ จัดการใน SubjectScreen)
    if (questionBank?.numQ && questionBank.numQ > 0 && questionBank.numQ < 9999) {
      setSettings(prev => ({ ...prev, numQ: questionBank.numQ }));
    }
    navigate('subject');
  }

  // Build banner slides: announcements → default
  const bannerSlides = announcements.length > 0
    ? announcements.slice(0, 4).map(a => ({
        gradient: a.type === 'success'
          ? 'linear-gradient(135deg,#16a34a,#15803d)'
          : a.type === 'warning'
            ? 'linear-gradient(135deg,#f59e0b,#d97706)'
            : 'linear-gradient(135deg,#3b82f6,#2563eb)',
        emoji: a.type === 'success' ? '✅' : a.type === 'warning' ? '⚠️' : 'ℹ️',
        title: a.title || 'ประกาศ',
        sub:   a.body  || '',
        cta: null,
      }))
    : DEFAULT_BANNERS;

  const QUICK_ITEMS = [
    { icon: '📊', label: 'ประวัติ',    screen: 'history',     color: '#f59e0b' },
    { icon: '📈', label: 'สถิติฉัน',  screen: 'myStats',     color: '#3b82f6' },
    { icon: '🏆', label: 'อันดับ',    screen: 'leaderboard', color: '#d97706' },
    { icon: '👤', label: 'โปรไฟล์',  screen: 'profile',     color: '#8b5cf6' },
    { icon: '🔖', label: 'บุ๊กมาร์ก', screen: 'bookmark',        color: '#06b6d4' },
    { icon: '🎓', label: 'ใบประกาศ', screen: 'certificate',      color: '#16a34a' },
    { icon: '💬', label: 'ข้อความ',  screen: 'myConversation',   color: '#ec4899' },
  ];
  if (isAdmin)   QUICK_ITEMS.push({ icon: '⚙️', label: 'Admin',  screen: 'admin',   color: '#ef4444' });
  if (isTeacher) QUICK_ITEMS.push(
    { icon: '🎓', label: 'ครูผู้สอน', screen: 'teacher', color: '#7c3aed' },
    { icon: '📝', label: 'จัดการข้อสอบ', screen: 'questionManager', color: '#0ea5e9' },
  );

  const today = new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' });
  const hour  = new Date().getHours();
  const greet = hour < 12 ? 'อรุณสวัสดิ์' : hour < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น';

  return (
    <div className="animate-fade" style={{ paddingBottom: 8, background: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── API Error Banner ──────────────────────────────────── */}
      {loadError && (
        <div className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 mb-3 text-sm"
          style={{ background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e' }}>
          <span>⚠️ โหลดข้อมูลไม่สำเร็จ — ตรวจสอบการเชื่อมต่อ</span>
          <button
            onClick={() => loadData(true)}
            disabled={retrying}
            className="font-bold text-xs px-3 py-1.5 rounded-xl flex-shrink-0"
            style={{ background: '#f59e0b', color: 'white', border: 'none', cursor: retrying ? 'not-allowed' : 'pointer', opacity: retrying ? .6 : 1 }}>
            {retrying
              ? <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : '🔄 ลองใหม่'}
          </button>
        </div>
      )}

      {/* ══ Hero Header — Banking Style ══════════════════════════ */}
      <div style={{
        background: 'linear-gradient(180deg, var(--accent) 0%, var(--accent-d) 100%)',
        borderRadius: '0 0 32px 32px', padding: '24px 20px 28px', marginBottom: 0,
        position: 'relative', overflow: 'hidden',
        marginLeft: -16, marginRight: -16, marginTop: -16, paddingLeft: 24, paddingRight: 24,
      }}>
        {/* Decorative BG circles */}
        <div style={{ position:'absolute', top:-50, right:-40, width:180, height:180, borderRadius:'50%', background:'rgba(255,255,255,.07)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-40, left:'20%', width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,.05)', pointerEvents:'none' }} />

        {/* Top bar: avatar + name + buttons */}
        {/* Logo น้องพัสดุ */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <img src={APP_LOGO} alt="logo" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,.4)', boxShadow: '0 4px 16px rgba(0,0,0,.2)' }} />
        </div>

        <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
          <div style={{ position:'relative', flexShrink:0 }}>
            <img
              src={profile?.pictureUrl || FALLBACK_AVATAR}
              alt="avatar"
              style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,.5)', boxShadow: '0 4px 14px rgba(0,0,0,.2)' }}
            />
            <div style={{ position:'absolute', bottom:1, right:1, width:14, height:14, borderRadius:'50%', background:'#22c55e', border:'2.5px solid white' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>{greet}</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'white', lineHeight: 1.2 }} className="truncate">
              {profile?.displayName}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              style={{ width: 38, height: 38, borderRadius: '50%', background:'rgba(255,255,255,.18)', border:'none', color:'white', fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
              onClick={() => setTheme(theme === 't-dark' ? '' : 't-dark')}>
              {theme === 't-dark' ? '☀️' : '🌙'}
            </button>
            {installPrompt && !installed && (
              <button
                style={{ width: 38, height: 38, borderRadius: '50%', background:'rgba(255,255,255,.18)', border:'none', color:'white', fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
                onClick={() => { installPrompt.prompt(); installPrompt.userChoice.then(() => setInstallPrompt(null)); }}>
                📱
              </button>
            )}
          </div>
        </div>

        {/* Account-like card inside hero */}
        <div style={{
          background: 'rgba(255,255,255,.15)', backdropFilter: 'blur(10px)',
          borderRadius: 20, padding: '16px 18px',
        }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.75)', marginBottom: 4 }}>{today}</div>
          {totalSets > 0 ? (
            <>
              <div className="flex items-end justify-between mb-2">
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>ความก้าวหน้า</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: 'white', lineHeight: 1 }}>
                    {doneSets}<span style={{ fontSize: 14, fontWeight: 600, opacity: .7 }}>/{totalSets} ชุด</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: 'white' }}>{Math.round((doneSets/totalSets)*100)}%</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)' }}>{doneSets === totalSets ? 'ครบแล้ว!' : `เหลือ ${pendingSets} ชุด`}</div>
                </div>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,.2)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${Math.round((doneSets / totalSets) * 100)}%`, height: '100%', background: 'white', borderRadius: 99, transition: 'width .6s ease' }} />
              </div>
            </>
          ) : (
            <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>พร้อมเริ่มสอบแล้วหรือยัง?</div>
          )}
        </div>
      </div>

      {/* ══ Section: บทเรียน ══════════════════════════════════════ */}
      <div style={{
        background: 'var(--card)', borderRadius: 24, padding: '18px 16px 14px',
        marginTop: -16, position: 'relative', zIndex: 2,
        boxShadow: '0 2px 20px rgba(0,0,0,.06)', border: '1px solid var(--card-border)',
      }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <div className="flex items-center gap-2">
            <div style={{ width: 6, height: 20, borderRadius: 3, background: '#3b82f6' }} />
            <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>📖 บทเรียน</span>
          </div>
          <button onClick={() => navigate('lessons')}
            style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
            ดูทั้งหมด ›
          </button>
        </div>
        <button
          onClick={() => navigate('lessons')}
          style={{
            width: '100%', borderRadius: 16, padding: '16px 18px', border: '1.5px solid #bfdbfe',
            background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 14, transition: 'transform .12s',
          }}
          onTouchStart={e => e.currentTarget.style.transform = 'scale(.98)'}
          onTouchEnd={e => e.currentTarget.style.transform = ''}>
          <div style={{
            width: 50, height: 50, borderRadius: 14, background: '#3b82f6',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0,
          }}>📖</div>
          <div style={{ textAlign: 'left', flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#1e40af' }}>เข้าสู่บทเรียน</div>
            <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 2 }}>
              {userCourse ? `หลักสูตร: ${userCourse}` : 'ดูบทเรียนทั้งหมด'}
            </div>
          </div>
          <span style={{ fontSize: 20, color: '#3b82f6' }}>›</span>
        </button>
      </div>

      {/* ══ Section: ข้อสอบ ══════════════════════════════════════ */}
      <div style={{
        background: 'var(--card)', borderRadius: 24, padding: '18px 16px 14px',
        marginTop: 12,
        boxShadow: '0 2px 20px rgba(0,0,0,.06)', border: '1px solid var(--card-border)',
      }}>
        <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
          <div style={{ width: 6, height: 20, borderRadius: 3, background: '#6366f1' }} />
          <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>📝 ข้อสอบ</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px 8px' }}>
          {[
            { icon: '📦', label: 'ชุดข้อสอบ', screen: 'examSets', color: '#6366f1', badge: pendingSets > 0 ? pendingSets : 0 },
            { icon: qbOpen ? '📚' : '🔒', label: 'เลือกวิชา', screen: 'subject', color: qbOpen ? '#3b82f6' : '#94a3b8', action: goToSubject, locked: !qbOpen },
            { icon: '💪', label: 'ฝึกซ้อม', screen: 'drill', color: '#16a34a' },
            { icon: qbOpen ? '📖' : '🔒', label: 'ทบทวน', screen: 'subject', color: qbOpen ? '#06b6d4' : '#94a3b8', locked: !qbOpen, action: qbOpen ? undefined : goToSubject },
          ].map(item => (
            <button key={item.label}
              style={{ background: 'transparent', border: 'none', cursor: item.locked ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 0, transition: 'transform .12s', opacity: item.locked ? .5 : 1 }}
              onTouchStart={e => { if (!item.locked) e.currentTarget.style.transform = 'scale(.9)'; }}
              onTouchEnd={e => e.currentTarget.style.transform = ''}
              onClick={item.action || (() => { if (!item.locked) navigate(item.screen); else goToSubject(); })}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: `${item.color}14`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, position: 'relative',
                boxShadow: `0 2px 8px ${item.color}15`,
                transition: 'all .15s',
              }}>
                {item.icon}
                {item.badge > 0 && (
                  <div style={{
                    position:'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 99,
                    background: '#ef4444', color: 'white', fontSize: 10, fontWeight: 800,
                    display:'flex', alignItems:'center', justifyContent:'center', padding: '0 4px',
                    border: '2px solid var(--card)',
                  }}>{item.badge}</div>
                )}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2, textAlign: 'center' }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ══ Question Bank Closed Notice ════════════════════════════ */}
      {!qbOpen && questionBank && (
        <div style={{
          background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 16,
          padding: '12px 16px', marginTop: 10, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ fontSize: 28 }}>🔒</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#b91c1c' }}>คลังข้อสอบปิดอยู่</div>
            <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>
              {questionBank.reason || 'ปิดโดยผู้ดูแลระบบ'}
              {questionBank.opensAt && (
                <span> — เปิดเวลา {new Date(questionBank.opensAt).toLocaleString('th-TH')}</span>
              )}
              {questionBank.closedAt && (
                <span> — หมดเวลาเมื่อ {new Date(questionBank.closedAt).toLocaleString('th-TH')}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ Resume Saved Quiz ════════════════════════════════════ */}
      {savedQuiz && (
        <div style={{
          background: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '1.5px solid #f59e0b',
          borderRadius: 16, padding: '14px 16px', marginTop: 12,
          display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 2px 12px rgba(245,158,11,.15)',
        }}>
          <div style={{ fontSize: 32 }}>📝</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#92400e' }}>มีข้อสอบค้างอยู่</div>
            <div style={{ fontSize: 11, color: '#a16207', marginTop: 2 }} className="truncate">
              {savedQuiz.lesson} — ตอบแล้ว {savedQuiz.answeredCount}/{savedQuiz.totalCount} ข้อ
            </div>
            <div style={{ fontSize: 10, color: '#b45309', marginTop: 1 }}>
              บันทึกเมื่อ {new Date(savedQuiz.savedAt).toLocaleString('th-TH')}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
            <button
              onClick={() => {
                // Resume: set exam context แล้ว navigate ไป quiz
                const sq = savedQuiz.data;
                setSettings(prev => ({
                  ...prev,
                  numQ: sq.questions.length,
                  useTimer: sq.timeLeft > 0,
                  timerMin: Math.ceil((sq.timeLeft + sq.timeUsed) / 60) || 30,
                }));
                setExam(prev => ({
                  ...prev,
                  lesson: savedQuiz.lesson,
                  allQ: sq.questions, // ใช้ questions เดิมเพื่อให้ SAVE_KEY match
                  setId: savedQuiz.key.replace(`quiz_autosave_${profile?.userId || 'guest'}_`, ''),
                  shuffleQ: false, // ไม่สลับใหม่ เพราะจะ restore จาก saved
                  shuffleOpt: false,
                }));
                navigate('quiz');
              }}
              style={{
                padding: '7px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: '#f59e0b', color: 'white', fontWeight: 800, fontSize: 12,
                boxShadow: '0 2px 8px rgba(245,158,11,.3)',
              }}>
              ทำต่อ
            </button>
            <button
              onClick={() => {
                try { localStorage.removeItem(savedQuiz.key); } catch (_) {}
                setSavedQuiz(null);
              }}
              style={{
                padding: '5px 12px', borderRadius: 8, border: '1px solid #d97706', cursor: 'pointer',
                background: 'transparent', color: '#92400e', fontWeight: 600, fontSize: 10,
              }}>
              ลบทิ้ง
            </button>
          </div>
        </div>
      )}

      {/* ══ Banner Carousel ═══════════════════════════════════════ */}
      <div style={{ marginTop: 14 }}>
        <BannerCarousel slides={bannerSlides} onNavigate={navigate} />
      </div>

      {/* ══ Activity / Notification Feed (banking-style) ════════ */}
      {(recentActivity.length > 0 || announcements.length > 0) && (
        <div style={{
          background: 'var(--card)', borderRadius: 20, overflow: 'hidden',
          boxShadow: '0 2px 16px rgba(0,0,0,.05)', marginBottom: 14,
          border: '1px solid var(--card-border)',
        }}>
          {/* Header */}
          <div className="flex items-center justify-between"
            style={{ padding: '12px 16px', borderBottom: '1px solid var(--card-border)' }}>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 16 }}>🔔</span>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>รายการแจ้งเตือน</span>
            </div>
            <div style={{
              minWidth: 28, height: 22, borderRadius: 99,
              background: '#ef4444', color: 'white', fontWeight: 800, fontSize: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px',
            }}>{recentActivity.length + announcements.length}</div>
          </div>

          {/* Announcements */}
          {announcements.slice(0, 3).map((a, i) => {
            const typeIcon = a.type === 'success' ? '✅' : a.type === 'warning' ? '⚠️' : 'ℹ️';
            const typeBg = a.type === 'success' ? '#f0fdf4' : a.type === 'warning' ? '#fffbeb' : '#eff6ff';
            const typeColor = a.type === 'success' ? '#15803d' : a.type === 'warning' ? '#92400e' : '#1d4ed8';
            return (
              <div key={'ann-' + i} style={{
                display: 'flex', gap: 12, padding: '12px 16px',
                borderBottom: '1px solid var(--card-border)',
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, background: typeBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}>{typeIcon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: typeColor, fontWeight: 700, marginBottom: 2 }}>
                    {a.type === 'success' ? 'แจ้งเตือน' : a.type === 'warning' ? 'สำคัญ' : 'ประกาศ'}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>
                    {a.title || 'ประกาศ'}
                  </div>
                  {a.body && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.3 }} className="truncate-2">
                      {a.body}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Recent Activity */}
          {recentActivity.map((h, i) => {
            const d = h.date ? new Date(h.date) : null;
            const dateStr = d ? d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '';
            const isPassed = h.pass === 'ผ่าน' || h.pass === true;
            return (
              <div key={'act-' + i} style={{
                display: 'flex', gap: 12, padding: '12px 16px',
                borderBottom: i < recentActivity.length - 1 ? '1px solid var(--card-border)' : 'none',
                cursor: 'pointer',
              }}
              onClick={() => navigate('history')}>
                {/* Date badge */}
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: isPassed ? '#f0fdf4' : '#fef2f2',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: isPassed ? '#16a34a' : '#dc2626', lineHeight: 1 }}>
                    {d ? d.getDate() : '—'}
                  </div>
                  <div style={{ fontSize: 8, fontWeight: 600, color: isPassed ? '#16a34a' : '#dc2626', textTransform: 'uppercase' }}>
                    {d ? d.toLocaleDateString('th-TH', { month: 'short' }) : ''}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {h.lesson || 'ข้อสอบ'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    คะแนน {h.score}/{h.total} ({h.pct}%) — {isPassed ? '✅ ผ่าน' : '❌ ไม่ผ่าน'}
                  </div>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: 14, alignSelf: 'center' }}>›</span>
              </div>
            );
          })}

          {/* View all */}
          {recentActivity.length > 0 && (
            <button
              style={{
                width: '100%', padding: '10px', background: 'var(--input-bg)',
                border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                color: 'var(--accent)', textAlign: 'center',
              }}
              onClick={() => navigate('history')}>
              ดูประวัติทั้งหมด →
            </button>
          )}
        </div>
      )}

      {/* ══ Assigned Sets — Notification Style ═══════════════════ */}
      {assignedSets.length > 0 && (
        <div style={{
          background: 'var(--card)', borderRadius: 20, overflow: 'hidden',
          boxShadow: '0 2px 16px rgba(0,0,0,.05)', marginBottom: 14,
          border: '1px solid var(--card-border)',
        }}>
          {/* Header */}
          <div className="flex items-center justify-between"
            style={{ padding: '12px 16px', borderBottom: '1px solid var(--card-border)' }}>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 16 }}>📋</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>งานที่ได้รับมอบหมาย</span>
            </div>
            <div style={{
              minWidth: 24, height: 24, borderRadius: 99,
              background: '#ef4444', color: 'white', fontWeight: 800, fontSize: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px',
            }}>{assignedSets.length}</div>
          </div>
          {/* Items */}
          {assignedSets.slice(0, 4).map((s, i) => (
            <div key={s.setId}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                borderBottom: i < Math.min(assignedSets.length, 4) - 1 ? '1px solid var(--card-border)' : 'none',
                cursor: 'pointer', transition: 'background .12s',
              }}
              onClick={() => navigate('examSets')}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: s.myAttempts > 0 ? '#fef3c7' : '#fee2e2',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, flexShrink: 0,
              }}>
                {s.myAttempts > 0 ? '🔄' : '📝'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {s.myAttempts > 0 ? `สอบแล้ว ${s.myAttempts} ครั้ง • ยังไม่ผ่าน` : 'ยังไม่ได้สอบ'}
                </div>
              </div>
              {s.myAttempts > 0 && (
                <span style={{ fontSize: 13, fontWeight: 800, color: '#d97706' }}>{s.myBestScore}%</span>
              )}
              <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>›</span>
            </div>
          ))}
        </div>
      )}

      {/* ══ Stats Row ════════════════════════════════════════════ */}
      <div className="flex gap-3 mb-4">
        <StatCard icon="📝" value={myStats?.totalAttempts ?? '—'} label="ครั้งที่สอบ" color="var(--accent)" delay={0} />
        <StatCard icon="🎯" value={myStats?.totalAttempts > 0 ? `${Math.round((myStats.totalPass / myStats.totalAttempts) * 100)}%` : '—'} label="อัตราผ่าน" color="#16a34a" delay={0.05} />
        <StatCard icon="⭐" value={myStats?.avgScore ? `${myStats.avgScore}%` : '—'} label="คะแนนเฉลี่ย" color="#d97706" delay={0.1} />
      </div>

      {/* ══ More Menu — Quick Grid ═══════════════════════════════ */}
      <div style={{
        background: 'var(--card)', borderRadius: 20, padding: '16px',
        boxShadow: '0 2px 16px rgba(0,0,0,.05)', marginBottom: 14,
        border: '1px solid var(--card-border)',
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
          เมนูเพิ่มเติม
        </div>
        <QuickGrid items={QUICK_ITEMS} navigate={navigate} />
      </div>

      {/* ══ Bottom Action Pills (like banking app) ═══════════════ */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
        {[
          { icon: '📖', label: 'ทบทวน', screen: 'subject', gradient: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', shadow: 'rgba(59,130,246,.3)' },
          { icon: '💪', label: 'ฝึกซ้อม', screen: 'drill', gradient: 'linear-gradient(135deg,#16a34a,#15803d)', shadow: 'rgba(22,163,74,.3)' },
          { icon: '🎓', label: 'ใบประกาศ', screen: 'certificate', gradient: 'linear-gradient(135deg,#d97706,#b45309)', shadow: 'rgba(217,119,6,.3)' },
          ...(isAdmin ? [{ icon: '⚙️', label: 'Admin', screen: 'admin', gradient: 'linear-gradient(135deg,#ef4444,#dc2626)', shadow: 'rgba(239,68,68,.3)' }] : []),
          ...(isTeacher ? [
            { icon: '🎓', label: 'ครูผู้สอน', screen: 'teacher', gradient: 'linear-gradient(135deg,#7c3aed,#6d28d9)', shadow: 'rgba(124,58,237,.3)' },
            { icon: '📝', label: 'จัดการข้อสอบ', screen: 'questionManager', gradient: 'linear-gradient(135deg,#0ea5e9,#0284c7)', shadow: 'rgba(14,165,233,.3)' },
          ] : []),
        ].map(item => (
          <button key={item.label}
            style={{
              flex: '0 0 auto', borderRadius: 99, padding: '10px 18px',
              background: item.gradient, color: 'white', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap',
              boxShadow: `0 4px 14px ${item.shadow}`, transition: 'transform .12s',
            }}
            onTouchStart={e => e.currentTarget.style.transform = 'scale(.95)'}
            onTouchEnd={e => e.currentTarget.style.transform = ''}
            onClick={() => navigate(item.screen)}>
            <span>{item.icon}</span> {item.label}
          </button>
        ))}
      </div>

      {/* ══ Settings Accordion (ธีมสีเท่านั้น) ══════════════════ */}
      <div style={{
        background: 'var(--card)', borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 2px 16px rgba(0,0,0,.05)', marginBottom: 8,
        border: '1px solid var(--card-border)',
      }}>
        <button
          className="w-full flex items-center justify-between px-4 py-3"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          onClick={() => setShowSettings(v => !v)}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 18 }}>🎨</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>ธีมและรูปแบบ</span>
          </div>
          <span style={{ fontSize: 18, color: 'var(--text-muted)', transform: showSettings ? 'rotate(180deg)' : 'none', transition: 'transform .25s' }}>
            ▼
          </span>
        </button>

        {showSettings && (
          <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--card-border)' }}
            className="anim-slide-up">

            {/* Theme */}
            <div style={{ marginTop: 14 }}>
              <div className="section-label">🎨 ธีมสี</div>
              <div className="flex flex-wrap gap-3 items-end mt-2">
                {THEMES.map(t => (
                  <div key={t.id} className="flex flex-col items-center gap-1">
                    <div
                      className={`swatch ${theme === t.cls ? 'active' : ''}`}
                      style={{ background: t.bg, borderColor: t.border || 'transparent' }}
                      onClick={() => setTheme(t.cls)}
                    />
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{t.label}</span>
                  </div>
                ))}
              </div>
              <div style={{
                marginTop: 12, padding: '8px 12px', borderRadius: 10,
                background: '#eff6ff', border: '1px solid #bfdbfe',
                fontSize: 11, color: '#2563eb',
              }}>
                💡 ตั้งค่าเวลา / จำนวนข้อสอบ จะปรากฎเมื่อเลือกวิชาหรือชุดข้อสอบ
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
