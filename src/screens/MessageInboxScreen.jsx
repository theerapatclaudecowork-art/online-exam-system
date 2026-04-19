// ─────────────────────────────────────────────────────────────
//  MessageInboxScreen — จัดการข้อความ User พร้อมกันจำนวนมาก
//  + Gemini AI Auto-Reply + Admin Manual Reply + Stats
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { apiGet, apiPost } from '../utils/api';
import { useVisibleInterval } from '../utils/useVisibleInterval';
import Spinner from '../components/Spinner';

const CAT_LABEL = {
  exam:    { label: '📚 ข้อสอบ',  color: '#6366f1', bg: '#eef2ff' },
  system:  { label: '⚙️ ระบบ',    color: '#f59e0b', bg: '#fffbeb' },
  general: { label: '💬 ทั่วไป',  color: '#0ea5e9', bg: '#f0f9ff' },
  other:   { label: '❓ อื่นๆ',   color: '#94a3b8', bg: '#f8fafc' },
};

const STATUS_TABS = [
  { key: 'pending',  label: '⏳ รอตอบ',       color: '#f59e0b' },
  { key: 'auto',     label: '🤖 AI ตอบ',      color: '#8b5cf6' },
  { key: 'replied',  label: '✅ ตอบแล้ว',     color: '#22c55e' },
  { key: 'closed',   label: '🔒 ปิดแล้ว',     color: '#94a3b8' },
  { key: 'all',      label: '📋 ทั้งหมด',     color: '#3b82f6' },
];

const TEMPLATES = [
  { label: 'ทักทาย',   text: 'สวัสดีครับ/ค่ะ ยินดีให้บริการ มีอะไรให้ช่วยเหลือเพิ่มเติมไหมครับ/ค่ะ?' },
  { label: 'รับทราบ',  text: 'รับทราบครับ/ค่ะ จะดำเนินการให้โดยเร็ว กรุณารอสักครู่นะครับ/ค่ะ' },
  { label: 'ติดต่อกลับ', text: 'ขอบคุณที่ติดต่อมาครับ/ค่ะ ทีมงานจะติดต่อกลับภายใน 24 ชั่วโมง' },
  { label: 'แก้ไขแล้ว', text: 'ดำเนินการแก้ไขเรียบร้อยแล้วครับ/ค่ะ กรุณาลองใหม่อีกครั้ง หากยังมีปัญหาแจ้งได้เลยครับ/ค่ะ' },
];

function formatSec(sec) {
  if (!sec || sec <= 0) return '—';
  if (sec < 60) return sec + ' วิ';
  if (sec < 3600) return Math.round(sec / 60) + ' น.';
  return Math.round(sec / 3600) + ' ชม.';
}

function CategoryBadge({ cat }) {
  const c = CAT_LABEL[cat] || CAT_LABEL.other;
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
      style={{ background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: { label: '⏳ รอตอบ',   color: '#f59e0b', bg: '#fffbeb' },
    auto:    { label: '🤖 AI',       color: '#8b5cf6', bg: '#f5f3ff' },
    replied: { label: '✅ ตอบแล้ว', color: '#16a34a', bg: '#f0fdf4' },
    closed:  { label: '🔒 ปิด',     color: '#94a3b8', bg: '#f8fafc' },
  };
  const s = map[status] || map.pending;
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
      style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

// ── Message Card (list item) ───────────────────────────────────
function MsgCard({ msg, selected, onClick }) {
  const isUnread = msg.status === 'pending';
  return (
    <div onClick={() => onClick(msg)}
      className="rounded-xl p-3 cursor-pointer transition-all"
      style={{
        background: selected ? 'var(--accent)' : isUnread ? '#fffbeb' : 'var(--card)',
        border: `1.5px solid ${selected ? 'var(--accent)' : isUnread ? '#fcd34d' : 'var(--card-border)'}`,
        opacity: msg.status === 'closed' ? 0.6 : 1,
      }}>
      <div className="flex items-start gap-2">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold"
          style={{ background: selected ? 'rgba(255,255,255,0.25)' : '#e0e7ff', color: selected ? 'white' : '#4f46e5' }}>
          {(msg.displayName || '?').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="font-semibold text-sm truncate" style={{ color: selected ? 'white' : 'var(--text)' }}>
              {msg.displayName}
            </span>
            {isUnread && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#f59e0b' }} />}
          </div>
          <p className="text-xs truncate" style={{ color: selected ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>
            {msg.message}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <CategoryBadge cat={msg.category} />
            <span className="text-xs" style={{ color: selected ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)' }}>
              {msg.createdAt}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reply Token Countdown ──────────────────────────────────────
function ReplyTokenCountdown({ webhookAt }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!webhookAt) { setRemaining(0); return; }
    const calc = () => {
      const elapsed = (Date.now() - new Date(webhookAt).getTime()) / 1000;
      setRemaining(Math.max(0, Math.round(30 - elapsed)));
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [webhookAt]);

  if (!webhookAt) return null;

  const isActive = remaining > 0;
  const pct = (remaining / 30) * 100;
  const color = remaining > 15 ? '#16a34a' : remaining > 5 ? '#f59e0b' : '#ef4444';

  return (
    <div className="rounded-xl px-3 py-2 mb-3 text-xs"
      style={{
        background: isActive ? '#f0fdf4' : '#fef2f2',
        border: `1.5px solid ${isActive ? '#86efac' : '#fca5a5'}`,
        color: isActive ? '#15803d' : '#b91c1c',
      }}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold">
          {isActive ? '⚡ Reply Token ใช้ได้ (ฟรี)' : '⏰ Reply Token หมดอายุ — จะใช้ Push API'}
        </span>
        {isActive && (
          <span className="font-black text-sm" style={{ color }}>{remaining}s</span>
        )}
      </div>
      {isActive && (
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#e2e8f0' }}>
          <div style={{ width: pct + '%', height: '100%', background: color, borderRadius: 99, transition: 'width 1s linear' }} />
        </div>
      )}
    </div>
  );
}

// ── Reply Panel ────────────────────────────────────────────────
function ReplyPanel({ msg, profile, onReplied, onClose: onCloseFn }) {
  const [reply,    setReply]    = useState('');
  const [drafting, setDrafting] = useState(false);
  const [sending,  setSending]  = useState(false);
  const [closing,  setClosing]  = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    setReply('');
    if (textareaRef.current) textareaRef.current.focus();
  }, [msg?.msgId]);

  async function getDraft() {
    setDrafting(true);
    const d = await apiPost({ action: 'getDraftReply', callerUserId: profile.userId, message: msg.message });
    setDrafting(false);
    if (d.success && d.draft) setReply(d.draft);
    else alert('ไม่สามารถร่างคำตอบได้: ' + (d.message || ''));
  }

  async function send() {
    if (!reply.trim()) return alert('กรุณาพิมพ์คำตอบ');
    setSending(true);
    const d = await apiPost({ action: 'adminReply', callerUserId: profile.userId, msgId: msg.msgId, reply: reply.trim() });
    setSending(false);
    if (d.success) { setReply(''); onReplied(); }
    else alert(d.message || 'ส่งไม่สำเร็จ');
  }

  async function doClose() {
    setClosing(true);
    await apiPost({ action: 'closeMessage', callerUserId: profile.userId, msgId: msg.msgId });
    setClosing(false);
    onCloseFn();
  }

  if (!msg) return null;

  const canReply = msg.status === 'pending' || msg.status === 'auto';

  return (
    <div className="quiz-card no-hover rounded-2xl p-4 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
              style={{ background: '#e0e7ff', color: '#4f46e5' }}>
              {(msg.displayName || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-sm" style={{ color: 'var(--text)' }}>{msg.displayName}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{msg.createdAt}</div>
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <CategoryBadge cat={msg.category} />
            <StatusBadge status={msg.status} />
            {msg.responseTimeSec > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--input-bg)', color: 'var(--text-muted)' }}>
                ⏱ {formatSec(msg.responseTimeSec)}
              </span>
            )}
          </div>
        </div>
        {msg.status !== 'closed' && (
          <button onClick={doClose} disabled={closing}
            className="btn btn-gray text-xs rounded-lg px-2.5 py-1.5 flex-shrink-0">
            {closing ? '⏳' : '🔒 ปิด'}
          </button>
        )}
      </div>

      {/* User message */}
      <div className="rounded-xl p-3 mb-3"
        style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd' }}>
        <div className="text-xs font-semibold mb-1" style={{ color: '#0369a1' }}>💬 ข้อความจาก User</div>
        <p className="text-sm" style={{ color: 'var(--text)', lineHeight: 1.6 }}>{msg.message}</p>
      </div>

      {/* AI Reply (if auto) */}
      {msg.aiReply && (
        <div className="rounded-xl p-3 mb-3"
          style={{ background: '#f5f3ff', border: '1.5px solid #c4b5fd' }}>
          <div className="text-xs font-semibold mb-1" style={{ color: '#7c3aed' }}>🤖 AI ตอบอัตโนมัติ</div>
          <p className="text-sm" style={{ color: 'var(--text)', lineHeight: 1.6 }}>{msg.aiReply}</p>
        </div>
      )}

      {/* Previous admin reply */}
      {msg.adminReply && (
        <div className="rounded-xl p-3 mb-3"
          style={{ background: '#f0fdf4', border: '1.5px solid #86efac' }}>
          <div className="text-xs font-semibold mb-1" style={{ color: '#15803d' }}>✅ Admin ตอบแล้ว</div>
          <p className="text-sm" style={{ color: 'var(--text)', lineHeight: 1.6 }}>{msg.adminReply}</p>
        </div>
      )}

      {/* Reply area */}
      {canReply && (
        <div className="mt-auto">
          {/* Reply Token Countdown */}
          <ReplyTokenCountdown webhookAt={msg.webhookAt} />
          {/* Templates */}
          <div className="flex gap-1.5 flex-wrap mb-2">
            {TEMPLATES.map((t, i) => (
              <button key={i} className="btn text-xs rounded-lg px-2.5 py-1.5"
                style={{ background: 'var(--input-bg)', color: 'var(--text-muted)', border: '1px solid var(--input-border)' }}
                onClick={() => setReply(t.text)}>
                {t.label}
              </button>
            ))}
          </div>
          {/* Textarea */}
          <textarea ref={textareaRef}
            className="themed-input w-full mb-2 text-sm"
            rows={3}
            placeholder="พิมพ์คำตอบ..."
            value={reply}
            onChange={e => setReply(e.target.value)}
          />
          {/* Action buttons */}
          <div className="flex gap-2">
            <button className="btn rounded-xl py-2.5 text-sm flex-shrink-0 px-3"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: 'white' }}
              onClick={getDraft} disabled={drafting || sending}>
              {drafting ? '⏳ กำลังร่าง...' : '🤖 AI ร่าง'}
            </button>
            <button className="btn btn-primary w-full rounded-xl py-2.5 text-sm font-bold"
              onClick={send} disabled={sending || drafting || !reply.trim()}>
              {sending ? '⏳ กำลังส่ง...' : '📤 ส่งตอบ'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stats Panel ────────────────────────────────────────────────
function StatsPanel({ stats }) {
  if (!stats) return null;
  const { counts, avgResponseSec, aiRate, categoryDist, hourlyDist } = stats;
  const peak = hourlyDist ? Math.max(...hourlyDist.map(h => h.count), 1) : 1;

  return (
    <div className="space-y-3">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { icon: '⏳', label: 'รอตอบ',    val: counts.pending, color: '#f59e0b' },
          { icon: '🤖', label: 'AI ตอบ',    val: counts.auto,    color: '#8b5cf6' },
          { icon: '✅', label: 'ตอบแล้ว',   val: counts.replied, color: '#22c55e' },
          { icon: '🎯', label: 'AI Rate',    val: aiRate + '%',   color: '#0ea5e9' },
        ].map((k, i) => (
          <div key={i} className="quiz-card no-hover rounded-xl p-3 text-center">
            <div className="text-xl mb-0.5">{k.icon}</div>
            <div className="text-xl font-black" style={{ color: k.color }}>{k.val}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Avg response time */}
        <div className="quiz-card no-hover rounded-xl p-4">
          <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>⏱ เวลาตอบเฉลี่ย</div>
          <div className="text-3xl font-black" style={{ color: avgResponseSec < 300 ? '#16a34a' : avgResponseSec < 1800 ? '#f59e0b' : '#ef4444' }}>
            {formatSec(avgResponseSec)}
          </div>
        </div>

        {/* Category distribution */}
        <div className="quiz-card no-hover rounded-xl p-4">
          <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>📊 หมวดหมู่คำถาม</div>
          <div className="space-y-1.5">
            {(categoryDist || []).map((c, i) => {
              const total = counts.total || 1;
              const pct   = Math.round((c.count / total) * 100);
              const info  = CAT_LABEL[c.category] || CAT_LABEL.other;
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span style={{ color: 'var(--text)' }}>{info.label}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{c.count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--input-bg)' }}>
                    <div style={{ width: pct + '%', background: info.color, height: '100%', transition: 'width .6s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hourly heatmap */}
      <div className="quiz-card no-hover rounded-xl p-4">
        <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>🕐 ข้อความรายชั่วโมง (24 ชม.)</div>
        <div className="flex items-end gap-0.5" style={{ height: 60 }}>
          {(hourlyDist || []).map((h, i) => {
            const pct = peak > 0 ? (h.count / peak) * 100 : 0;
            const isActive = new Date().getHours() === h.hour;
            return (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div className="w-full rounded-t-sm transition-all"
                  style={{
                    height: Math.max(2, pct * 0.54) + 'px',
                    background: isActive ? '#f59e0b' : pct > 50 ? 'var(--accent)' : '#cbd5e1',
                  }}
                  title={`${h.hour}:00 — ${h.count} ข้อความ`}
                />
                {(i % 6 === 0) && (
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontSize: 9 }}>{h.hour}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function MessageInboxScreen() {
  const { profile } = useApp();

  const [activeTab,  setActiveTab]  = useState('pending');
  const [view,       setView]       = useState('inbox'); // inbox | stats
  const [messages,   setMessages]   = useState([]);
  const [counts,     setCounts]     = useState({ pending: 0, auto: 0, replied: 0, closed: 0, total: 0 });
  const [selected,   setSelected]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [searchD,    setSearchD]    = useState('');
  const [page,       setPage]       = useState(1);
  const [hasMore,    setHasMore]    = useState(false);
  const [stats,      setStats]      = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh]  = useState(true);
  const timerRef = useRef(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchD(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { loadInbox(1); }, [activeTab, searchD]);

  // Auto-refresh every 30s — หยุดอัตโนมัติเมื่อ tab ไม่ active
  useVisibleInterval(autoRefresh ? () => loadInbox(page, true) : null, autoRefresh ? 30_000 : null);

  async function loadInbox(p = 1, silent = false) {
    if (!silent) setLoading(true);
    const d = await apiGet('getInbox', {
      userId: profile.userId,
      status: activeTab,
      page: p,
      size: 20,
      search: searchD,
    });
    if (!silent) setLoading(false);
    if (d.success) {
      setMessages(p === 1 ? d.messages : prev => [...prev, ...d.messages]);
      setCounts(d.counts || counts);
      setHasMore(d.hasMore);
      setPage(p);
    }
  }

  async function loadStats() {
    setStatsLoading(true);
    const d = await apiGet('getMessageStats', { userId: profile.userId });
    setStatsLoading(false);
    if (d.success) setStats(d);
  }

  useEffect(() => {
    if (view === 'stats' && !stats) loadStats();
  }, [view]);

  function handleTabChange(key) {
    setActiveTab(key);
    setSelected(null);
    setPage(1);
  }

  function handleReplied() {
    loadInbox(1);
    setSelected(null);
  }

  function handleClose() {
    loadInbox(1);
    setSelected(null);
  }

  return (
    <div className="animate-fade">
      {/* ── Header ── */}
      <div className="rounded-2xl mb-4 p-4"
        style={{ background: 'linear-gradient(135deg,#1e40af,#1e293b)', boxShadow: '0 4px 24px rgba(30,64,175,.3)' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-white font-black text-lg">💬 จัดการข้อความ</h1>
            <p className="text-blue-200 text-xs mt-0.5">Inbox · AI Auto-Reply · Gemini Draft</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAutoRefresh(p => !p)}
              className="text-xs px-3 py-1.5 rounded-xl font-semibold"
              style={{ background: autoRefresh ? '#22c55e22' : '#ffffff22', color: autoRefresh ? '#86efac' : '#94a3b8', border: `1px solid ${autoRefresh ? '#86efac44' : '#ffffff22'}` }}>
              {autoRefresh ? '🟢 Live' : '⚫ Paused'}
            </button>
            <button onClick={() => loadInbox(1)}
              className="text-xs px-3 py-1.5 rounded-xl font-semibold"
              style={{ background: '#ffffff22', color: 'white' }}>
              🔄
            </button>
          </div>
        </div>
        {/* Quick KPIs */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: '⏳ รอ',     val: counts.pending, color: '#fbbf24' },
            { label: '🤖 AI',     val: counts.auto,    color: '#c084fc' },
            { label: '✅ ตอบ',    val: counts.replied, color: '#86efac' },
            { label: '📋 ทั้งหมด', val: counts.total,   color: '#93c5fd' },
          ].map((k, i) => (
            <div key={i} className="rounded-xl p-2 text-center"
              style={{ background: 'rgba(255,255,255,0.10)' }}>
              <div className="text-lg font-black" style={{ color: k.color }}>{k.val}</div>
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── View toggle ── */}
      <div className="flex gap-2 mb-3">
        {[{ key: 'inbox', label: '📥 Inbox' }, { key: 'stats', label: '📊 สถิติ' }].map(v => (
          <button key={v.key}
            className="flex-1 py-2 rounded-xl text-sm font-semibold"
            style={{
              background: view === v.key ? 'var(--accent)' : 'var(--card)',
              color: view === v.key ? 'white' : 'var(--text-muted)',
              border: `1.5px solid ${view === v.key ? 'var(--accent)' : 'var(--card-border)'}`,
            }}
            onClick={() => setView(v.key)}>{v.label}</button>
        ))}
      </div>

      {/* ── Stats View ── */}
      {view === 'stats' && (
        statsLoading
          ? <Spinner label="กำลังโหลดสถิติ..." />
          : <StatsPanel stats={stats} />
      )}

      {/* ── Inbox View ── */}
      {view === 'inbox' && (
        <>
          {/* Status filter tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3" style={{ scrollbarWidth: 'none' }}>
            {STATUS_TABS.map(t => (
              <button key={t.key}
                className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold relative"
                style={{
                  background: activeTab === t.key ? t.color : 'var(--card)',
                  color: activeTab === t.key ? 'white' : 'var(--text-muted)',
                  border: `1.5px solid ${activeTab === t.key ? t.color : 'var(--card-border)'}`,
                }}
                onClick={() => handleTabChange(t.key)}>
                {t.label}
                {t.key === 'pending' && counts.pending > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    background: '#ef4444', color: 'white', borderRadius: '50%',
                    width: 16, height: 16, fontSize: 9, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{counts.pending > 99 ? '99+' : counts.pending}</span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <input className="themed-input w-full pr-8" placeholder="🔍 ค้นหา ชื่อ / ข้อความ..."
              value={search} onChange={e => setSearch(e.target.value)} />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: 'var(--text-muted)', color: 'white' }}>✕</button>
            )}
          </div>

          {loading ? <Spinner label="กำลังโหลด inbox..." /> : (
            <div className={selected ? 'flex gap-3' : ''} style={{ alignItems: 'flex-start' }}>
              {/* Message List */}
              <div className={selected ? 'w-2/5 flex-shrink-0' : 'w-full'}>
                {messages.length === 0 ? (
                  <div className="quiz-card no-hover rounded-2xl p-8 text-center">
                    <div className="text-4xl mb-3">
                      {activeTab === 'pending' ? '🎉' : '📭'}
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      {activeTab === 'pending' ? 'ไม่มีข้อความรอตอบ' : 'ไม่มีข้อความ'}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {messages.map(msg => (
                      <MsgCard key={msg.msgId} msg={msg}
                        selected={selected?.msgId === msg.msgId}
                        onClick={m => setSelected(selected?.msgId === m.msgId ? null : m)}
                      />
                    ))}
                    {hasMore && (
                      <button className="btn btn-gray w-full rounded-xl py-2.5 text-sm"
                        onClick={() => loadInbox(page + 1)}>
                        โหลดเพิ่มเติม...
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Reply Panel — sticky */}
              {selected && (
                <div className="flex-1 min-w-0 sticky top-4">
                  <ReplyPanel
                    msg={selected}
                    profile={profile}
                    onReplied={handleReplied}
                    onClose={handleClose}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
