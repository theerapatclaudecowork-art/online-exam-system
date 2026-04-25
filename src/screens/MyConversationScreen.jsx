import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiGet, apiPost } from '../utils/api';
import Spinner from '../components/Spinner';

const STATUS_LABEL = {
  pending:  { text: 'รอตอบ',    bg: '#fef3c7', color: '#92400e' },
  replied:  { text: 'ตอบแล้ว',  bg: '#dcfce7', color: '#15803d' },
  closed:   { text: 'ปิดแล้ว',  bg: '#f1f5f9', color: '#475569' },
};

function MessageBubble({ msg }) {
  const s = STATUS_LABEL[msg.status] || STATUS_LABEL.pending;
  return (
    <div className="rounded-2xl p-4 space-y-2"
      style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>

      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
          🕐 {msg.createdAt}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: s.bg, color: s.color }}>
          {s.text}
        </span>
      </div>

      {/* User message */}
      <div className="rounded-xl px-3 py-2.5"
        style={{ background: 'rgba(var(--accent-rgb),.08)', border: '1px solid rgba(var(--accent-rgb),.2)' }}>
        <div className="text-xs font-semibold mb-1" style={{ color: 'var(--accent)' }}>คุณ</div>
        <div className="text-sm" style={{ color: 'var(--text)', lineHeight: 1.6 }}>{msg.message}</div>
      </div>

      {/* AI reply */}
      {msg.aiReply && (
        <div className="rounded-xl px-3 py-2.5"
          style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
          <div className="text-xs font-semibold mb-1" style={{ color: '#15803d' }}>🤖 AI ตอบอัตโนมัติ</div>
          <div className="text-sm" style={{ color: '#166534', lineHeight: 1.6 }}>{msg.aiReply}</div>
        </div>
      )}

      {/* Admin reply */}
      {msg.adminReply && (
        <div className="rounded-xl px-3 py-2.5"
          style={{ background: '#eff6ff', border: '1px solid #93c5fd' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold" style={{ color: '#1d4ed8' }}>👨‍💼 แอดมินตอบ</span>
            {msg.repliedAt && (
              <span className="text-xs" style={{ color: '#93c5fd' }}>{msg.repliedAt}</span>
            )}
          </div>
          <div className="text-sm" style={{ color: '#1e3a8a', lineHeight: 1.6 }}>{msg.adminReply}</div>
        </div>
      )}
    </div>
  );
}

export default function MyConversationScreen() {
  const { navigate, profile } = useApp();
  const [messages,  setMessages]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [hasError,  setHasError]  = useState(false);
  const [text,      setText]      = useState('');
  const [sending,   setSending]   = useState(false);
  const [sendError, setSendError] = useState('');
  const [sent,      setSent]      = useState(false);
  const bottomRef = useRef(null);

  async function load() {
    setLoading(true);
    setHasError(false);
    try {
      const res = await apiGet('getMyConversation', { userId: profile?.userId });
      if (res.success) setMessages(res.messages || []);
    } catch (_) {
      setHasError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    setSendError('');
    setSent(false);
    try {
      const res = await apiPost({
        action:      'submitUserMessage',
        userId:      profile?.userId,
        displayName: profile?.displayName,
        message:     trimmed,
      });
      if (res.success) {
        setText('');
        setSent(true);
        await load();
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } else {
        setSendError(res.message || 'ส่งไม่สำเร็จ');
      }
    } catch (_) {
      setSendError('เชื่อมต่อไม่ได้ — กรุณาลองใหม่');
    } finally {
      setSending(false);
    }
  }

  if (loading) return <Spinner label="กำลังโหลดข้อความ..." />;

  return (
    <div className="animate-fade space-y-4">

      {/* Header */}
      <div className="quiz-card no-hover rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-base sm:text-lg" style={{ color: 'var(--text)' }}>
              💬 ข้อความของฉัน
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              สอบถาม แจ้งปัญหา หรือติดต่อแอดมิน
            </p>
          </div>
          <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5"
            onClick={() => navigate('setup')}>← กลับ</button>
        </div>
      </div>

      {/* Error banner */}
      {hasError && (
        <div className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm"
          style={{ background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e' }}>
          <span>⚠️ โหลดข้อมูลไม่สำเร็จ — ตรวจสอบการเชื่อมต่อ</span>
          <button onClick={load} disabled={loading}
            className="flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold"
            style={{ background: '#f59e0b', color: 'white', opacity: loading ? .6 : 1 }}>
            🔄 ลองใหม่
          </button>
        </div>
      )}

      {/* Send form */}
      <div className="quiz-card no-hover rounded-2xl p-4 space-y-3">
        <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
          ✉️ ส่งข้อความถึงแอดมิน
        </div>
        <textarea
          className="themed-input w-full rounded-xl text-sm resize-none"
          rows={3}
          maxLength={1000}
          placeholder="พิมพ์ข้อความ เช่น สอบถามผลสอบ แจ้งปัญหาระบบ..."
          value={text}
          onChange={e => { setText(e.target.value); setSendError(''); setSent(false); }}
          style={{ lineHeight: 1.6 }}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {text.length}/1000
          </span>
          <button
            onClick={handleSend}
            disabled={sending || !text.trim()}
            className="btn rounded-xl px-5 py-2 text-sm font-semibold"
            style={{
              background: 'var(--accent)', color: 'white',
              opacity: (sending || !text.trim()) ? .6 : 1,
            }}>
            {sending ? '⏳ กำลังส่ง...' : '📤 ส่ง'}
          </button>
        </div>
        {sendError && (
          <div className="text-xs rounded-xl px-3 py-2"
            style={{ background: '#fee2e2', color: '#b91c1c' }}>
            ❌ {sendError}
          </div>
        )}
        {sent && (
          <div className="text-xs rounded-xl px-3 py-2"
            style={{ background: '#dcfce7', color: '#15803d' }}>
            ✅ ส่งสำเร็จ — แอดมินจะตอบกลับในไม่ช้า
          </div>
        )}
      </div>

      {/* Message history */}
      {!hasError && (
        messages.length === 0 ? (
          <div className="quiz-card no-hover rounded-2xl p-10 text-center">
            <div className="text-4xl mb-3">💭</div>
            <div className="font-bold text-sm mb-1" style={{ color: 'var(--text)' }}>
              ยังไม่มีข้อความ
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              ส่งข้อความแรกของคุณด้านบนได้เลย
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs font-semibold px-1" style={{ color: 'var(--text-muted)' }}>
              ประวัติข้อความ ({messages.length} รายการ)
            </div>
            {messages.map(m => (
              <MessageBubble key={m.msgId} msg={m} />
            ))}
          </div>
        )
      )}

      <div ref={bottomRef} />

      <button className="btn btn-gray w-full rounded-xl py-3" onClick={() => navigate('setup')}>
        ← กลับหน้าหลัก
      </button>
    </div>
  );
}
