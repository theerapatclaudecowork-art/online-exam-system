import { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { useApp } from '../context/AppContext';
import { apiGet, apiPost } from '../utils/api';
import Spinner from '../components/Spinner';
import ImageUploader from '../components/ImageUploader';
import Paginator from '../components/Paginator';
import GeminiQuizGenerator from '../components/GeminiQuizGenerator';

// ── FillExpPanel — Gemini เติมคำอธิบายอัตโนมัติ ──────────────
function FillExpPanel({ profile, onClose, onDone }) {
  const [status,   setStatus]   = useState(null);   // { total, missing, filled }
  const [running,  setRunning]  = useState(false);
  const [paused,   setPaused]   = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, updated: 0 });
  const [log,      setLog]      = useState([]);
  const [done,     setDone]     = useState(false);
  const stopRef = useRef(false);

  useEffect(() => {
    apiGet('getExplanationFillStatus', { userId: profile?.userId })
      .then(d => { if (d.success) setStatus(d); })
      .catch(() => {});
  }, []);

  function addLog(msg) {
    setLog(prev => [{ time: new Date().toLocaleTimeString('th-TH'), msg }, ...prev].slice(0, 30));
  }

  async function startFill() {
    if (!status?.missing) return;
    setRunning(true); setPaused(false); setDone(false);
    stopRef.current = false;
    setProgress({ done: 0, total: status.missing, updated: 0 });
    addLog('🚀 เริ่มเติมคำอธิบาย ' + status.missing + ' ข้อ...');

    let offset = 0, totalUpdated = 0;
    const BATCH = 10;

    while (offset < status.missing) {
      if (stopRef.current) { addLog('⏸ หยุดชั่วคราว'); setPaused(true); setRunning(false); break; }
      try {
        const d = await apiPost({
          action: 'fillExplanationsWithGemini',
          callerUserId: profile?.userId,
          batchSize: BATCH,
          offset,
        });
        if (!d.success) { addLog('❌ ' + (d.message || 'เกิดข้อผิดพลาด')); break; }
        totalUpdated += d.updated || 0;
        offset += d.processed || BATCH;
        setProgress({ done: offset, total: status.missing, updated: totalUpdated });
        addLog(`✅ ประมวลผลแล้ว ${offset}/${status.missing} ข้อ (อัปเดต ${totalUpdated} ข้อ)`);
        if (d.remaining === 0) {
          addLog('🎉 เติมคำอธิบายครบทุกข้อแล้ว!');
          setDone(true); setRunning(false);
          // refresh status
          apiGet('getExplanationFillStatus', { userId: profile?.userId }).then(s => { if (s.success) setStatus(s); });
          onDone?.();
          break;
        }
        await new Promise(r => setTimeout(r, 800)); // throttle
      } catch(e) { addLog('❌ ' + e.message); break; }
    }
    if (!stopRef.current && !done) setRunning(false);
  }

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="quiz-card no-hover rounded-2xl p-5 animate-fade">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>📖 เติมคำอธิบายด้วย Gemini AI</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Gemini จะสร้างคำอธิบายเฉลยให้ทุกข้อที่ยังว่างอยู่</p>
        </div>
        <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5" onClick={onClose}>✕ ปิด</button>
      </div>

      {/* Status Card */}
      {status && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { icon: '📝', label: 'ทั้งหมด',      val: status.total,   color: '#7c3aed' },
            { icon: '✅', label: 'มีคำอธิบายแล้ว', val: status.filled,  color: '#16a34a' },
            { icon: '⚠️', label: 'ยังไม่มี',       val: status.missing, color: '#f59e0b' },
          ].map(k => (
            <div key={k.label} style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 22 }}>{k.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: k.color }}>{k.val}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Progress */}
      {(running || done || paused) && progress.total > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            <span>ความคืบหน้า</span>
            <span>{progress.done}/{progress.total} ข้อ ({pct}%)</span>
          </div>
          <div style={{ height: 8, background: 'var(--card-border)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: pct + '%', background: 'linear-gradient(90deg,#7c3aed,#a855f7)', borderRadius: 99, transition: 'width .4s' }} />
          </div>
          {progress.updated > 0 && (
            <div className="text-xs mt-1" style={{ color: '#7c3aed' }}>อัปเดตแล้ว {progress.updated} ข้อ</div>
          )}
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-2 mb-4">
        {!running && !done && (
          <button
            className="btn rounded-xl py-2 px-4 text-sm font-semibold flex-1"
            style={{ background: status?.missing ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : '#94a3b8', color: '#fff' }}
            disabled={!status?.missing || running}
            onClick={paused ? startFill : startFill}>
            {paused ? '▶️ ดำเนินต่อ' : '▶️ เริ่มเติมคำอธิบาย'}
            {status?.missing ? ` (${status.missing} ข้อ)` : ' — ครบแล้ว'}
          </button>
        )}
        {running && (
          <button
            className="btn rounded-xl py-2 px-4 text-sm font-semibold flex-1"
            style={{ background: '#f59e0b', color: '#fff' }}
            onClick={() => { stopRef.current = true; }}>
            ⏸ หยุดชั่วคราว
          </button>
        )}
        {done && (
          <div className="flex-1 rounded-xl py-2 px-4 text-sm font-semibold text-center"
            style={{ background: '#dcfce7', color: '#15803d' }}>
            🎉 เสร็จสมบูรณ์!
          </div>
        )}
        <button className="btn btn-gray rounded-xl py-2 px-3 text-sm"
          onClick={() => {
            apiGet('getExplanationFillStatus', { userId: profile?.userId }).then(d => { if (d.success) setStatus(d); });
          }}>🔄</button>
      </div>

      {/* Info box */}
      <div style={{ background: '#ede9fe', borderRadius: 10, padding: '10px 12px', marginBottom: 12, fontSize: 12, color: '#5b21b6' }}>
        💡 <b>วิธีทำงาน:</b> ส่งข้อสอบ 10 ข้อ/ครั้งให้ Gemini สร้างคำอธิบาย → บันทึกลง Sheet อัตโนมัติ
        สามารถหยุดได้ตลอดเวลาและดำเนินต่อภายหลัง
      </div>

      {/* Log */}
      {log.length > 0 && (
        <div style={{ background: '#0f172a', borderRadius: 10, padding: '10px 12px', maxHeight: 150, overflowY: 'auto' }}>
          {log.map((l, i) => (
            <div key={i} style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2, fontFamily: 'monospace' }}>
              <span style={{ color: '#475569' }}>[{l.time}]</span> {l.msg}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── AutoGenPanel — Gemini Auto-Generate every 5 min ─────────
function AutoGenPanel({ profile, subjects, onClose }) {
  const [status,  setStatus]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [form,    setForm]    = useState({ subject: '', topic: '', interval: 10, maxDaily: 50, notifyEvery: 5 });
  const [logs,    setLogs]    = useState([]);
  const [logPage, setLogPage] = useState(1);
  const [logMore, setLogMore] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => { loadStatus(); }, []);

  async function loadStatus() {
    setLoading(true);
    try {
      const d = await apiGet('getAutoGenStatus', { userId: profile.userId });
      if (d.success) {
        setStatus(d);
        if (d.subject) setForm({
          subject: d.subject, topic: d.topic,
          interval: d.interval || 10, maxDaily: d.maxDaily || 50, notifyEvery: d.notifyEvery || 5,
        });
      }
    } catch (_) {}
    setLoading(false);
  }

  async function loadLogs(p = 1, reset = false) {
    setLogLoading(true);
    try {
      const d = await apiGet('getAutoGenLogs', { userId: profile.userId, page: p, size: 30 });
      if (d.success) {
        setLogs(prev => reset ? d.logs : [...prev, ...d.logs]);
        setLogMore(!!d.hasMore);
        setLogPage(p);
      }
    } catch (_) {}
    setLogLoading(false);
  }

  function toggleLogs() {
    if (!showLogs && logs.length === 0) loadLogs(1, true);
    setShowLogs(v => !v);
  }

  async function start() {
    if (!form.subject.trim()) return alert('กรุณาระบุวิชา');
    if (!form.topic.trim())   return alert('กรุณาระบุหัวข้อ');
    setSaving(true);
    const d = await apiPost({
      action: 'setupAutoGenTrigger', callerUserId: profile.userId,
      subject: form.subject, topic: form.topic,
      interval: form.interval, maxDaily: form.maxDaily, notifyEvery: form.notifyEvery,
    });
    setSaving(false);
    if (d.success) { await loadStatus(); }
    else alert(d.message);
  }

  async function stop() {
    if (!confirm('หยุด Auto-Gen?')) return;
    setSaving(true);
    const d = await apiPost({ action: 'removeAutoGenTrigger', callerUserId: profile.userId });
    setSaving(false);
    if (d.success) { await loadStatus(); }
  }

  const isActive = status?.active;

  return (
    <div className="quiz-card rounded-2xl p-5 animate-fade">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>⏰ Auto-Gen ข้อสอบอัตโนมัติ</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Gemini สร้างข้อสอบใหม่ 20 ข้อ โดยไม่ซ้ำของเดิม (มี quota protection)</p>
        </div>
        <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5" onClick={onClose}>✕ ปิด</button>
      </div>

      {/* Status Card */}
      {!loading && status && (
        <div className="rounded-xl p-4 mb-4"
          style={{ background: isActive ? '#f0fdf4' : '#f8fafc', border: `2px solid ${isActive ? '#86efac' : 'var(--input-border)'}` }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{isActive ? '🟢' : '⚫'}</span>
            <span className="font-bold text-sm" style={{ color: isActive ? '#15803d' : 'var(--text-muted)' }}>
              {isActive ? 'กำลังทำงาน' : 'หยุดอยู่'}
            </span>
            {isActive && (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: '#dcfce7', color: '#15803d' }}>
                ทุก {status.interval || 5} นาที
              </span>
            )}
          </div>
          {(status.subject || status.topic) && (
            <div className="text-xs space-y-0.5 mb-2" style={{ color: 'var(--text-muted)' }}>
              {status.subject && <div>📚 วิชา: <b style={{ color: 'var(--text)' }}>{status.subject}</b></div>}
              {status.topic   && <div>🏷 หัวข้อ: <b style={{ color: 'var(--text)' }}>{status.topic}</b></div>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 mt-2">
            {[
              { label: 'รอบทั้งหมด', val: status.round || 0, color: '#6366f1' },
              { label: 'ข้อสอบที่เพิ่ม', val: status.total || 0, color: '#f59e0b' },
              { label: 'วันนี้', val: `${status.todayRounds || 0}/${status.maxDaily || 50} รอบ`, color: (status.todayRounds || 0) >= (status.maxDaily || 50) ? '#dc2626' : '#0ea5e9', small: true },
              { label: 'รันล่าสุด', val: status.lastRun || '—', color: '#0ea5e9', small: true },
            ].map(item => (
              <div key={item.label} className="rounded-lg p-2 text-center"
                style={{ background: 'var(--card)', border: '1px solid var(--input-border)' }}>
                <div className="font-bold" style={{ color: item.color, fontSize: item.small ? 9 : 16 }}>{item.val}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)', fontSize: 10 }}>{item.label}</div>
              </div>
            ))}
          </div>
          {status.lastLog && (
            <div className="mt-2 text-xs rounded-lg px-3 py-2"
              style={{ background: 'var(--input-bg)', color: 'var(--text-muted)', wordBreak: 'break-word' }}>
              📋 {status.lastLog}
            </div>
          )}
        </div>
      )}

      {/* Config Form */}
      <div className="space-y-3 mb-4">
        <div>
          <label className="section-label">📚 วิชา / หมวดหมู่</label>
          <input list="ag-subject-list" className="themed-input"
            placeholder="เช่น Network, PC, Security..."
            value={form.subject}
            onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} />
          <datalist id="ag-subject-list">
            {(subjects || []).map(s => <option key={s} value={s} />)}
          </datalist>
        </div>
        <div>
          <label className="section-label">🏷 หัวข้อ (Gemini จะต่อยอดจากหัวข้อนี้ทุกรอบ)</label>
          <input className="themed-input"
            placeholder="เช่น Network Protocols, IP Addressing, OSI Model..."
            value={form.topic}
            onChange={e => setForm(p => ({ ...p, topic: e.target.value }))} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="section-label">⏱ ทุกกี่นาที</label>
            <select className="themed-input" value={form.interval}
              onChange={e => setForm(p => ({ ...p, interval: +e.target.value }))}>
              {[5, 10, 15, 30].map(v => <option key={v} value={v}>{v} นาที</option>)}
            </select>
          </div>
          <div>
            <label className="section-label">📊 สูงสุด/วัน</label>
            <input type="number" className="themed-input" min={1} max={200}
              value={form.maxDaily}
              onChange={e => setForm(p => ({ ...p, maxDaily: +e.target.value }))} />
          </div>
          <div>
            <label className="section-label">📢 แจ้งทุกกี่รอบ</label>
            <input type="number" className="themed-input" min={1} max={50}
              value={form.notifyEvery}
              onChange={e => setForm(p => ({ ...p, notifyEvery: +e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="rounded-xl p-3 mb-4 text-xs" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
        <b>📌 วิธีทำงาน:</b><br/>
        • Gemini สร้างข้อสอบใหม่ 20 ข้อต่อรอบ ไม่ซ้ำของเดิม<br/>
        • จำกัดรอบต่อวัน ป้องกัน GAS UrlFetch quota เต็ม<br/>
        • ถ้า quota เต็มหรือครบ max/วัน จะหยุดอัตโนมัติ + แจ้ง Telegram<br/>
        • แจ้ง Telegram ทุก N รอบ (ประหยัด quota)
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mb-3">
        {!isActive ? (
          <button
            className="btn w-full rounded-xl py-2.5 text-sm font-bold"
            style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', color: 'white' }}
            onClick={start} disabled={saving || loading}>
            {saving ? '⏳ กำลังเริ่ม...' : '▶ เริ่ม Auto-Gen'}
          </button>
        ) : (
          <>
            <button
              className="btn rounded-xl py-2.5 text-sm font-bold flex-1"
              style={{ background: '#fee2e2', color: '#b91c1c' }}
              onClick={stop} disabled={saving}>
              {saving ? '⏳...' : '⏹ หยุด'}
            </button>
            <button
              className="btn btn-gray rounded-xl py-2.5 text-sm flex-1"
              onClick={start} disabled={saving}>
              🔄 เปลี่ยนวิชา/หัวข้อ
            </button>
          </>
        )}
        <button className="btn btn-gray rounded-xl py-2.5 text-sm px-3" onClick={loadStatus} disabled={loading}>
          {loading ? '⏳' : '↻'}
        </button>
      </div>

      {/* Log History Toggle */}
      <button
        className="btn btn-gray w-full rounded-xl py-2 text-sm"
        onClick={toggleLogs}>
        {showLogs ? '▲ ซ่อน Log' : '📋 ดู Log ย้อนหลัง'}
      </button>

      {/* Log History Table */}
      {showLogs && (
        <div className="mt-3 rounded-xl overflow-hidden" style={{ border: '1px solid var(--input-border)' }}>
          <div className="flex items-center justify-between px-3 py-2" style={{ background: 'var(--input-bg)' }}>
            <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>📋 ประวัติ Auto-Gen</span>
            <button className="text-xs px-2 py-0.5 rounded-lg"
              style={{ background: 'var(--card)', border: '1px solid var(--input-border)', color: 'var(--text-muted)' }}
              onClick={() => loadLogs(1, true)} disabled={logLoading}>
              {logLoading ? '⏳' : '🔄 รีเฟรช'}
            </button>
          </div>
          <div style={{ maxHeight: 350, overflowY: 'auto' }}>
            {logs.length === 0 && !logLoading && (
              <div className="p-4 text-center text-xs" style={{ color: 'var(--text-muted)' }}>ยังไม่มี log</div>
            )}
            {logs.map((l, i) => {
              const isErr = l.status !== 'success';
              return (
                <div key={i} className="px-3 py-2 text-xs" style={{
                  borderTop: '1px solid var(--input-border)',
                  background: isErr ? '#fef2f2' : 'var(--card)',
                }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold" style={{ color: isErr ? '#dc2626' : '#15803d' }}>
                      {isErr ? '❌' : '✅'} รอบ {l.round} — {l.status}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{l.timestamp}</span>
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>
                    📚 {l.subject} / {l.topic}
                    {l.status === 'success' && <> • +{l.questionsAdded} ข้อ (รวม {l.totalQuestions})</>}
                    {' '}• ⏱ {l.durationSec}s
                  </div>
                  {isErr && l.errorMessage && (
                    <div className="mt-1 rounded-lg px-2 py-1"
                      style={{ background: '#fee2e2', color: '#b91c1c', wordBreak: 'break-word', fontSize: 11 }}>
                      {l.errorMessage}
                    </div>
                  )}
                </div>
              );
            })}
            {logMore && (
              <button className="w-full py-2 text-xs font-semibold"
                style={{ background: 'var(--input-bg)', color: 'var(--accent)', borderTop: '1px solid var(--input-border)' }}
                onClick={() => loadLogs(logPage + 1)} disabled={logLoading}>
                {logLoading ? '⏳ กำลังโหลด...' : 'โหลดเพิ่มเติม'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const EMPTY_FORM = { id: '', question: '', a: '', b: '', c: '', d: '', answer: '', explanation: '', subject: '', imageUrl: '', difficulty: 'medium', tags: '', questionType: 'mc' };
const QTYPE_OPTS = [
  { val: 'mc',   label: '📋 หลายตัวเลือก', desc: 'ก ข ค ง' },
  { val: 'tf',   label: '✅ ถูก/ผิด',      desc: 'True/False' },
  { val: 'fill', label: '✏️ เติมคำ',       desc: 'พิมพ์คำตอบ' },
];
const ANSWER_OPTS = ['ก', 'ข', 'ค', 'ง'];
const DIFF_OPTS = [
  { val: 'easy',   label: '🟢 ง่าย',   color: '#16a34a' },
  { val: 'medium', label: '🟡 กลาง',   color: '#d97706' },
  { val: 'hard',   label: '🔴 ยาก',    color: '#dc2626' },
];

export default function QuestionManagerScreen() {
  const { navigate, profile, isAdmin } = useApp();
  const [questions, setQuestions] = useState([]);
  const [viewRole, setViewRole]   = useState('admin'); // 'admin' | 'teacher'
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [isEdit, setIsEdit]       = useState(false);
  const [filterSubject, setFilterSubject] = useState('');
  const [search, setSearch]               = useState('');
  const [searchDebounced, setSearchDebounced] = useState(''); // #10 debounce
  const [filterDiff, setFilterDiff]       = useState('');
  const [qPage, setQPage]                 = useState(0); // pagination
  const Q_PAGE_SIZE = 20;
  const [showImport, setShowImport]   = useState(false);
  const [importRows, setImportRows]   = useState([]);
  const [importing, setImporting]     = useState(false);
  const [importError, setImportError] = useState('');
  const [showAI,      setShowAI]      = useState(false);
  const [showAutoGen, setShowAutoGen] = useState(false);
  const [showFillExp, setShowFillExp] = useState(false);

  useEffect(() => { loadAll(); }, []);

  // #10 debounce search 250ms
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  // reset page เมื่อ filter เปลี่ยน
  useEffect(() => { setQPage(0); }, [filterSubject, searchDebounced, filterDiff]);

  function parseCSV(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return [];
    // detect header
    const firstLow = lines[0].toLowerCase();
    const hasHeader = firstLow.includes('question') || firstLow.includes('คำถาม') || firstLow.includes('subject');
    const dataLines = hasHeader ? lines.slice(1) : lines;
    return dataLines.map(line => {
      // split by comma but respect quoted fields
      const cols = [];
      let cur = '', inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQ = !inQ; }
        else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
        else cur += ch;
      }
      cols.push(cur.trim());
      return {
        question:    cols[0] || '',
        a:           cols[1] || '',
        b:           cols[2] || '',
        c:           cols[3] || '',
        d:           cols[4] || '',
        answer:      cols[5] || '',
        explanation: cols[6] || '',
        subject:     cols[7] || '',
        difficulty:  cols[8] || 'medium',
        tags:        cols[9] || '',
      };
    }).filter(r => r.question && r.a && r.answer && r.subject);
  }

  function handleCSVFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = parseCSV(ev.target.result);
      if (!rows.length) { setImportError('ไม่พบข้อมูล หรือรูปแบบไม่ถูกต้อง'); return; }
      setImportRows(rows);
      setShowImport(true);
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  }

  async function handleImport() {
    setImporting(true);
    try {
      const data = await apiPost({
        action: 'bulkAddQuestions',
        callerUserId: profile.userId,
        questions: importRows,
      });
      if (!data.success) throw new Error(data.message);
      await Swal.fire({ icon: 'success', title: `นำเข้าสำเร็จ ${data.inserted} ข้อ`, timer: 2000, showConfirmButton: false });
      setShowImport(false);
      setImportRows([]);
      loadAll();
    } catch (e) {
      Swal.fire('เกิดข้อผิดพลาด', e.message, 'error');
    } finally {
      setImporting(false);
    }
  }

  async function loadAll() {
    setLoading(true);
    try {
      const data = await apiGet('getAllQuestions', { userId: profile.userId });
      if (!data.success) throw new Error(data.message);
      setQuestions(data.questions || []);
      if (data.role) setViewRole(data.role);
    } catch (e) {
      Swal.fire('เกิดข้อผิดพลาด', e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setForm(EMPTY_FORM);
    setIsEdit(false);
    setShowForm(true);
  }

  function openEdit(q) {
    setForm({ ...EMPTY_FORM, ...q, questionType: q.questionType || 'mc' });
    setIsEdit(true);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.question.trim()) return Swal.fire('แจ้งเตือน', 'กรุณากรอกคำถาม', 'warning');
    if (form.questionType === 'mc' && !form.a.trim()) return Swal.fire('แจ้งเตือน', 'กรุณากรอกตัวเลือก ก', 'warning');
    if (!form.answer.trim()) return Swal.fire('แจ้งเตือน', 'กรุณาระบุคำตอบที่ถูกต้อง', 'warning');
    if (!form.subject.trim()) return Swal.fire('แจ้งเตือน', 'กรุณากรอกวิชา', 'warning');

    setSaving(true);
    try {
      const body = {
        callerUserId: profile.userId,
        ...form,
        action: isEdit ? 'updateQuestion' : 'addQuestion',
      };
      const data = await apiPost(body);
      if (!data.success) throw new Error(data.message);
      await Swal.fire({ icon: 'success', title: isEdit ? 'แก้ไขสำเร็จ' : 'เพิ่มสำเร็จ', timer: 1500, showConfirmButton: false });
      setShowForm(false);
      loadAll();
    } catch (e) {
      Swal.fire('เกิดข้อผิดพลาด', e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(q) {
    const r = await Swal.fire({
      title: 'ลบข้อสอบ?',
      html: `<b>${q.question.substring(0, 60)}...</b>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบเลย',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
    });
    if (!r.isConfirmed) return;
    try {
      const data = await apiPost({ action: 'deleteQuestion', callerUserId: profile.userId, id: q.id });
      if (!data.success) throw new Error(data.message);
      setQuestions(prev => prev.filter(x => x.id !== q.id));
      Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', timer: 1200, showConfirmButton: false });
    } catch (e) {
      Swal.fire('เกิดข้อผิดพลาด', e.message, 'error');
    }
  }

  const subjects = [...new Set(questions.map(q => q.subject).filter(Boolean))];
  const filtered = questions.filter(q => {
    if (filterSubject && q.subject !== filterSubject) return false;
    if (searchDebounced && !(q.question + (q.explanation||'') + (q.subject||'')).toLowerCase().includes(searchDebounced.toLowerCase())) return false;
    if (filterDiff && q.difficulty !== filterDiff) return false;
    return true;
  });
  const pagedQuestions = filtered.slice(qPage * Q_PAGE_SIZE, (qPage + 1) * Q_PAGE_SIZE);

  if (loading) return <Spinner label="กำลังโหลดข้อสอบ..." />;

  // ── AI Generator ──────────────────────────────────────────
  if (showAI) {
    return (
      <GeminiQuizGenerator
        profile={profile}
        subjects={subjects}
        onClose={() => setShowAI(false)}
        onSaved={() => { setShowAI(false); loadAll(); }}
      />
    );
  }

  // ── Auto-Gen Panel ─────────────────────────────────────────
  if (showAutoGen) {
    return (
      <AutoGenPanel
        profile={profile}
        subjects={subjects}
        onClose={() => setShowAutoGen(false)}
      />
    );
  }

  // ── Fill Explanations Panel ────────────────────────────────
  if (showFillExp) {
    return (
      <FillExpPanel
        profile={profile}
        onClose={() => setShowFillExp(false)}
        onDone={() => loadAll()}
      />
    );
  }

  // Import Preview Modal
  if (showImport) {
    const DIFF_COLOR = { easy:'#16a34a', medium:'#d97706', hard:'#dc2626' };
    return (
      <div className="quiz-card rounded-2xl p-4 sm:p-6 animate-fade">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>📥 Preview ข้อสอบที่จะนำเข้า</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{importRows.length} ข้อ — ตรวจสอบก่อนนำเข้า</p>
          </div>
          <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5" onClick={() => setShowImport(false)}>✕ ยกเลิก</button>
        </div>

        {/* CSV Format hint */}
        <div className="rounded-xl p-3 mb-4 text-xs" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
          <b>รูปแบบ CSV:</b> question, ก, ข, ค, ง, answer, explanation, subject, difficulty, tags<br />
          <b>difficulty:</b> easy / medium / hard &nbsp;|&nbsp; <b>answer</b> = ข้อความของตัวเลือกที่ถูกต้อง
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
          {importRows.map((q, i) => (
            <div key={i} className="rounded-xl p-3" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>
              <div className="flex gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--card)', color: 'var(--accent)' }}>{q.subject}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: DIFF_COLOR[q.difficulty]+'22', color: DIFF_COLOR[q.difficulty] }}>
                  {q.difficulty==='easy'?'ง่าย':q.difficulty==='hard'?'ยาก':'กลาง'}
                </span>
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>{i+1}. {q.question.substring(0,80)}{q.question.length>80?'...':''}</p>
              <div className="flex flex-wrap gap-1">
                {[q.a,q.b,q.c,q.d].filter(Boolean).map((opt,j)=>(
                  <span key={j} className="text-xs px-2 py-0.5 rounded"
                    style={{ background: opt===q.answer?'#dcfce7':'var(--card)', color: opt===q.answer?'#15803d':'var(--text-muted)', border: `1px solid ${opt===q.answer?'#86efac':'var(--input-border)'}` }}>
                    {['ก','ข','ค','ง'][j]}. {opt.substring(0,20)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button className="btn btn-gray flex-1 rounded-xl py-2.5 text-sm" onClick={() => setShowImport(false)}>ยกเลิก</button>
          <button className="btn btn-primary flex-1 rounded-xl py-2.5 text-sm" onClick={handleImport} disabled={importing}>
            {importing ? '⏳ กำลังนำเข้า...' : `✅ นำเข้า ${importRows.length} ข้อ`}
          </button>
        </div>
      </div>
    );
  }

  // ── Form Modal ─────────────────────────────────
  if (showForm) {
    return (
      <div className="quiz-card rounded-2xl p-4 sm:p-7 animate-fade">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
            {isEdit ? '✏️ แก้ไขข้อสอบ' : '➕ เพิ่มข้อสอบใหม่'}
          </h2>
          <button className="btn btn-gray text-sm rounded-lg px-3 py-1.5" onClick={() => setShowForm(false)}>✕ ปิด</button>
        </div>

        <div className="space-y-4">
          {/* วิชา */}
          <div>
            <label className="section-label">วิชา / หมวดหมู่ <span className="text-red-500">*</span></label>
            <input list="subject-list" className="themed-input" placeholder="ชื่อวิชา" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} />
            <datalist id="subject-list">
              {subjects.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>

          {/* ประเภทคำถาม */}
          <div>
            <label className="section-label">📋 ประเภทคำถาม</label>
            <div className="grid grid-cols-3 gap-2">
              {QTYPE_OPTS.map(t => (
                <button key={t.val} type="button"
                  className="rounded-xl py-2 px-2 text-xs font-semibold text-center transition-all"
                  style={{
                    background: form.questionType === t.val ? 'var(--accent)' : 'var(--input-bg)',
                    color: form.questionType === t.val ? 'white' : 'var(--text-muted)',
                    border: `1.5px solid ${form.questionType === t.val ? 'var(--accent)' : 'var(--input-border)'}`,
                  }}
                  onClick={() => {
                    const qt = t.val;
                    setForm(p => ({
                      ...p,
                      questionType: qt,
                      a: qt === 'tf' ? 'ถูก' : (qt === 'fill' ? '' : p.a),
                      b: qt === 'tf' ? 'ผิด' : (qt === 'fill' ? '' : p.b),
                      c: (qt === 'mc') ? p.c : '',
                      d: (qt === 'mc') ? p.d : '',
                      answer: qt === 'tf' ? '' : (qt === 'fill' ? '' : p.answer),
                    }));
                  }}>
                  <div>{t.label}</div>
                  <div style={{ fontSize: 10, opacity: .7 }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* คำถาม */}
          <div>
            <label className="section-label">คำถาม <span className="text-red-500">*</span></label>
            <textarea className="themed-input" rows={3} placeholder="พิมพ์คำถาม..." value={form.question} onChange={e => setForm(p => ({ ...p, question: e.target.value }))} />
          </div>

          {/* URL รูปภาพ */}
          <div>
            <label className="section-label">🖼 รูปภาพประกอบ (ไม่บังคับ)</label>
            <ImageUploader
              value={form.imageUrl}
              onChange={url => setForm(p => ({ ...p, imageUrl: url }))}
              callerUserId={profile.userId}
            />
          </div>

          {/* ตัวเลือก — แสดงตาม questionType */}
          {form.questionType === 'mc' && (
            <>
              {['ก', 'ข', 'ค', 'ง'].map((label, i) => {
                const key = ['a','b','c','d'][i];
                return (
                  <div key={label}>
                    <label className="section-label">ตัวเลือก {label} {i === 0 && <span className="text-red-500">*</span>}</label>
                    <input className="themed-input" placeholder={`ตัวเลือก ${label}`} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
                  </div>
                );
              })}
            </>
          )}
          {form.questionType === 'tf' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl p-3 text-center text-sm font-bold" style={{ background:'#f0fdf4', border:'2px solid #86efac', color:'#15803d' }}>✅ ถูก</div>
              <div className="rounded-xl p-3 text-center text-sm font-bold" style={{ background:'#fef2f2', border:'2px solid #fca5a5', color:'#b91c1c' }}>❌ ผิด</div>
            </div>
          )}
          {form.questionType === 'fill' && (
            <div className="rounded-xl p-3 text-xs" style={{ background:'var(--input-bg)', border:'1px dashed var(--input-border)', color:'var(--text-muted)' }}>
              ✏️ ผู้เข้าสอบจะพิมพ์คำตอบลงในช่องข้อความ
            </div>
          )}

          {/* คำตอบที่ถูกต้อง */}
          <div>
            <label className="section-label">คำตอบที่ถูกต้อง <span className="text-red-500">*</span></label>
            {form.questionType === 'mc' ? (
              <>
                <div className="flex gap-2 flex-wrap">
                  {ANSWER_OPTS.map(opt => {
                    const val = { 'ก': form.a, 'ข': form.b, 'ค': form.c, 'ง': form.d }[opt] || '';
                    const selected = form.answer === val && val;
                    return (
                      <button key={opt} type="button" disabled={!val}
                        onClick={() => setForm(p => ({ ...p, answer: val }))}
                        className="btn rounded-xl px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm"
                        style={{
                          background: selected ? 'var(--accent)' : 'var(--input-bg)',
                          color: selected ? 'white' : 'var(--text)',
                          border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--input-border)'}`,
                          opacity: val ? 1 : 0.4,
                        }}>
                        {opt} {val ? `— ${val.substring(0, 20)}${val.length > 20 ? '...' : ''}` : '(ว่าง)'}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : form.questionType === 'tf' ? (
              <div className="flex gap-2">
                {['ถูก', 'ผิด'].map(opt => (
                  <button key={opt} type="button"
                    className="flex-1 btn rounded-xl py-2 text-sm font-bold"
                    onClick={() => setForm(p => ({ ...p, answer: opt }))}
                    style={{
                      background: form.answer === opt ? (opt === 'ถูก' ? '#16a34a' : '#dc2626') : 'var(--input-bg)',
                      color: form.answer === opt ? 'white' : 'var(--text-muted)',
                      border: `1.5px solid ${form.answer === opt ? (opt === 'ถูก' ? '#16a34a' : '#dc2626') : 'var(--input-border)'}`,
                    }}>
                    {opt === 'ถูก' ? '✅ ถูก' : '❌ ผิด'}
                  </button>
                ))}
              </div>
            ) : (
              <input className="themed-input" placeholder="พิมพ์คำตอบที่ถูกต้อง (ตรวจแบบ case-insensitive)"
                value={form.answer} onChange={e => setForm(p => ({ ...p, answer: e.target.value }))} />
            )}
            {form.answer && <p className="text-xs mt-1" style={{ color: 'var(--accent)' }}>✓ คำตอบ: {form.answer.substring(0, 40)}</p>}
          </div>

          {/* คำอธิบาย */}
          <div>
            <label className="section-label">คำอธิบาย / เฉลย</label>
            <textarea className="themed-input" rows={2} placeholder="อธิบายเพิ่มเติม..." value={form.explanation} onChange={e => setForm(p => ({ ...p, explanation: e.target.value }))} />
          </div>

          {/* ระดับความยาก */}
          <div>
            <label className="section-label">🎯 ระดับความยาก</label>
            <div className="flex gap-2">
              {DIFF_OPTS.map(d => (
                <button key={d.val} type="button"
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: form.difficulty === d.val ? d.color : 'var(--input-bg)',
                    color: form.difficulty === d.val ? 'white' : 'var(--text-muted)',
                    border: `1.5px solid ${form.difficulty === d.val ? d.color : 'var(--input-border)'}`,
                  }}
                  onClick={() => setForm(p => ({ ...p, difficulty: d.val }))}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          {/* Tags */}
          <div>
            <label className="section-label">🏷 Tags (คั่นด้วยเครื่องหมายจุลภาค)</label>
            <input className="themed-input" placeholder="เช่น คณิต,เลข,ตรรกะ"
              value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} />
          </div>

          <div className="flex gap-3 pt-2">
            <button className="btn btn-gray flex-1 rounded-xl py-2.5 text-sm" onClick={() => setShowForm(false)}>ยกเลิก</button>
            <button className="btn btn-primary flex-1 rounded-xl py-2.5 text-sm" onClick={handleSave} disabled={saving}>
              {saving ? 'กำลังบันทึก...' : (isEdit ? '💾 บันทึกการแก้ไข' : '✅ เพิ่มข้อสอบ')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── List ────────────────────────────────────────
  return (
    <div className="animate-fade">
      {/* Header */}
      <div className="quiz-card no-hover rounded-2xl p-3 sm:p-4 mb-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold" style={{ color: 'var(--text)' }}>
              📚 จัดการข้อสอบ
              {viewRole === 'teacher' && (
                <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full"
                  style={{ background: '#ede9fe', color: '#7c3aed' }}>
                  เฉพาะข้อสอบของฉัน
                </span>
              )}
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {filtered.length !== questions.length
                ? `${filtered.length} / ${questions.length} ข้อ`
                : `${questions.length} ข้อ`}
              {filtered.length > Q_PAGE_SIZE && (
                <span className="ml-1">· หน้า {qPage + 1}/{Math.ceil(filtered.length / Q_PAGE_SIZE)}</span>
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5" onClick={loadAll}>🔄</button>
            <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5"
              onClick={() => navigate(isAdmin ? 'admin' : 'setup')}>← กลับ</button>
          </div>
        </div>

        {/* Filter & Search */}
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <select className="themed-input w-full" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
            <option value="">ทุกวิชา</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="relative w-full">
            <input className="themed-input w-full pr-8" placeholder="🔍 ค้นหาคำถาม / คำอธิบาย / วิชา..."
              value={search} onChange={e => setSearch(e.target.value)} />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs rounded-full w-4 h-4 flex items-center justify-center"
                style={{ background: 'var(--text-muted)', color: 'white', lineHeight: 1 }}>✕</button>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap mb-3">
          <button className="btn text-xs rounded-lg px-2.5 py-1"
            style={{ background: !filterDiff ? 'var(--accent)' : 'var(--input-bg)', color: !filterDiff ? 'white' : 'var(--text-muted)' }}
            onClick={() => setFilterDiff('')}>ทั้งหมด</button>
          {DIFF_OPTS.map(d => (
            <button key={d.val} className="btn text-xs rounded-lg px-2.5 py-1"
              style={{ background: filterDiff === d.val ? d.color : 'var(--input-bg)', color: filterDiff === d.val ? 'white' : 'var(--text-muted)' }}
              onClick={() => setFilterDiff(d.val)}>{d.label}</button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          {[
            { icon: '➕', label: 'เพิ่ม', bg: 'var(--accent)', onClick: openAdd },
            { icon: '🤖', label: 'AI', bg: 'linear-gradient(135deg,#7c3aed,#4f46e5)', onClick: () => setShowAI(true) },
            { icon: '⏰', label: 'Auto', bg: 'linear-gradient(135deg,#0ea5e9,#0369a1)', onClick: () => setShowAutoGen(true) },
            { icon: '📝', label: 'อธิบาย', bg: 'linear-gradient(135deg,#16a34a,#15803d)', onClick: () => setShowFillExp(true) },
            { icon: '📥', label: 'CSV', bg: 'var(--input-bg)', color: 'var(--text)', isFile: true },
          ].map(b => b.isFile ? (
            <label key={b.label} className="flex-shrink-0 cursor-pointer flex flex-col items-center justify-center rounded-2xl"
              style={{ width: 60, height: 60, background: b.bg, color: b.color || 'white', border: '1.5px solid var(--input-border)', transition: 'transform .15s' }}>
              <span style={{ fontSize: 22, lineHeight: 1 }}>{b.icon}</span>
              <span style={{ fontSize: 9, fontWeight: 700, marginTop: 2 }}>{b.label}</span>
              <input type="file" accept=".csv,.txt" className="hidden" onChange={handleCSVFile} />
            </label>
          ) : (
            <button key={b.label} className="flex-shrink-0 flex flex-col items-center justify-center rounded-2xl"
              style={{ width: 60, height: 60, background: b.bg, color: b.color || 'white', border: 'none', cursor: 'pointer', transition: 'transform .15s' }}
              onClick={b.onClick}>
              <span style={{ fontSize: 22, lineHeight: 1 }}>{b.icon}</span>
              <span style={{ fontSize: 9, fontWeight: 700, marginTop: 2 }}>{b.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Question Cards */}
      {filtered.length === 0 ? (
        <div className="quiz-card no-hover rounded-2xl p-8 text-center" style={{ color: 'var(--text-muted)' }}>ไม่พบข้อสอบ</div>
      ) : (
        <div className="space-y-3 mb-2">
          {pagedQuestions.map((q, i) => (
            <div key={q.id} className="quiz-card rounded-xl p-3 sm:p-4" style={{ cursor: 'default' }}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <span className="text-xs px-2 py-0.5 rounded-full mr-2" style={{ background: 'var(--opt-hover)', color: 'var(--accent)' }}>{q.subject}</span>
                  {q.difficulty && (
                    <span className="text-xs px-2 py-0.5 rounded-full mr-2"
                      style={{
                        background: q.difficulty==='easy'?'#dcfce7':q.difficulty==='hard'?'#fee2e2':'#fef9c3',
                        color: q.difficulty==='easy'?'#15803d':q.difficulty==='hard'?'#b91c1c':'#854d0e',
                      }}>
                      {q.difficulty==='easy'?'ง่าย':q.difficulty==='hard'?'ยาก':'กลาง'}
                    </span>
                  )}
                  {q.imageUrl && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>🖼</span>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button className="btn btn-gray text-xs rounded-lg px-2 py-1" onClick={() => openEdit(q)}>✏️</button>
                  <button className="btn text-xs rounded-lg px-2 py-1" style={{ background: '#fee2e2', color: '#b91c1c' }} onClick={() => handleDelete(q)}>🗑</button>
                </div>
              </div>
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>{q.question.substring(0, 100)}{q.question.length > 100 ? '...' : ''}</p>
              <div className="flex flex-wrap gap-1">
                {[q.a, q.b, q.c, q.d].filter(Boolean).map((opt, j) => (
                  <span key={j} className="text-xs px-2 py-0.5 rounded-lg"
                    style={{
                      background: opt === q.answer ? '#dcfce7' : 'var(--input-bg)',
                      color: opt === q.answer ? '#15803d' : 'var(--text-muted)',
                      border: `1px solid ${opt === q.answer ? '#86efac' : 'var(--input-border)'}`,
                    }}>
                    {['ก','ข','ค','ง'][j]}. {opt.substring(0, 25)}{opt.length > 25 ? '...' : ''}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Paginator
        page={qPage}
        totalItems={filtered.length}
        pageSize={Q_PAGE_SIZE}
        onPage={p => { setQPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
      />

      <button className="btn btn-gray w-full rounded-xl py-3 mt-2" onClick={() => navigate('admin')}>← กลับหน้าแอดมิน</button>
    </div>
  );
}
