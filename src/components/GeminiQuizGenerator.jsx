// ─────────────────────────────────────────────────────────────
//  GeminiQuizGenerator — AI สร้างข้อสอบด้วย Gemini
//  Flow: ตั้งค่า API Key → กรอก config → รับ drafts → แก้ไข → บันทึก
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { apiGet, apiPost } from '../utils/api';

const DIFF_OPTS = [
  { val: 'easy',   label: '🟢 ง่าย',  color: '#16a34a' },
  { val: 'medium', label: '🟡 กลาง',  color: '#d97706' },
  { val: 'hard',   label: '🔴 ยาก',   color: '#dc2626' },
];
const DIFF_COLOR = { easy: '#16a34a', medium: '#d97706', hard: '#dc2626' };
const DIFF_LABEL = { easy: 'ง่าย', medium: 'กลาง', hard: 'ยาก' };

// ── Draft Card ────────────────────────────────────────────────
function DraftCard({ q, i, selected, onToggle, onChange, onRemove }) {
  const optKeys = ['a', 'b', 'c', 'd'];
  const optLabels = ['ก', 'ข', 'ค', 'ง'];

  return (
    <div className="rounded-2xl p-4 transition-all"
      style={{
        background: 'var(--card)',
        border: `2px solid ${selected ? 'var(--accent)' : 'var(--card-border)'}`,
        opacity: selected ? 1 : 0.5,
      }}>

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <input type="checkbox" checked={selected} onChange={onToggle}
          style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer', flexShrink: 0 }} />
        <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>ข้อ {i + 1}</span>
        <span className="text-xs px-2 py-0.5 rounded-full"
          style={{
            background: `${DIFF_COLOR[q.difficulty] || '#d97706'}22`,
            color: DIFF_COLOR[q.difficulty] || '#d97706',
          }}>
          {DIFF_LABEL[q.difficulty] || 'กลาง'}
        </span>
        <button className="ml-auto text-xs px-2 py-0.5 rounded-lg" title="ลบข้อนี้"
          style={{ background: '#fee2e2', color: '#b91c1c' }} onClick={onRemove}>
          🗑 ลบ
        </button>
      </div>

      {/* Question */}
      <div className="mb-3">
        <label className="section-label">📝 คำถาม</label>
        <textarea className="themed-input text-sm" rows={3}
          value={q.question}
          onChange={e => onChange('question', e.target.value)} />
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        {optKeys.map((k, j) => (
          <div key={k}>
            <label className="section-label" style={{ fontSize: 10 }}>ตัวเลือก {optLabels[j]}</label>
            <input className="themed-input text-sm"
              placeholder={`ตัวเลือก ${optLabels[j]}`}
              value={q[k] || ''}
              onChange={e => {
                const newVal = e.target.value;
                // ถ้าแก้ตัวเลือกที่เป็น answer อยู่ → อัปเดต answer ด้วย
                const updates = { [k]: newVal };
                if (q.answer === q[k]) updates.answer = newVal;
                Object.entries(updates).forEach(([f, v]) => onChange(f, v));
              }}
            />
          </div>
        ))}
      </div>

      {/* Answer selector */}
      <div className="mb-3">
        <label className="section-label">✅ คำตอบที่ถูกต้อง</label>
        <div className="flex gap-1.5 flex-wrap">
          {optKeys.map((k, j) => {
            const val = q[k] || '';
            const isSelected = val && q.answer === val;
            return val ? (
              <button key={k} type="button"
                className="text-xs px-3 py-1.5 rounded-xl transition-all"
                style={{
                  background: isSelected ? 'var(--accent)' : 'var(--input-bg)',
                  color: isSelected ? 'white' : 'var(--text-muted)',
                  border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--input-border)'}`,
                }}
                onClick={() => onChange('answer', val)}>
                {optLabels[j]}. {val.length > 22 ? val.slice(0, 22) + '…' : val}
              </button>
            ) : null;
          })}
        </div>
        {q.answer && (
          <p className="text-xs mt-1.5 font-semibold" style={{ color: '#16a34a' }}>
            ✓ คำตอบ: {q.answer.length > 50 ? q.answer.slice(0, 50) + '…' : q.answer}
          </p>
        )}
        {!q.answer && (
          <p className="text-xs mt-1" style={{ color: '#ef4444' }}>⚠ ยังไม่ได้เลือกคำตอบ</p>
        )}
      </div>

      {/* Explanation */}
      <div>
        <label className="section-label">💡 คำอธิบาย</label>
        <textarea className="themed-input text-sm" rows={2}
          placeholder="คำอธิบายเหตุผล (ไม่บังคับ)"
          value={q.explanation || ''}
          onChange={e => onChange('explanation', e.target.value)} />
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function GeminiQuizGenerator({ profile, subjects = [], onClose, onSaved }) {
  const [step,        setStep]        = useState('config');  // 'config' | 'drafts'
  const [hasKey,      setHasKey]      = useState(null);      // null=loading
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [keyInput,    setKeyInput]    = useState('');
  const [keyLoading,  setKeyLoading]  = useState(false);
  const [keyPreview,  setKeyPreview]  = useState('');

  const [form, setForm] = useState({
    subject:    subjects[0] || '',
    topic:      '',
    count:      10,
    difficulty: 'medium',
    lang:       'th',
  });

  const [generating, setGenerating] = useState(false);
  const [drafts,     setDrafts]     = useState([]);
  const [selected,   setSelected]   = useState(new Set());
  const [saving,     setSaving]     = useState(false);

  useEffect(() => { checkApiKey(); }, []);

  async function checkApiKey() {
    try {
      const data = await apiGet('getGeminiApiKeyStatus', { userId: profile.userId });
      setHasKey(!!data.hasKey);
      setKeyPreview(data.keyPreview || '');
    } catch (_) { setHasKey(false); }
  }

  async function saveApiKey() {
    if (!keyInput.trim()) return;
    setKeyLoading(true);
    try {
      const data = await apiPost({
        action: 'setGeminiApiKey',
        callerUserId: profile.userId,
        apiKey: keyInput.trim(),
      });
      if (!data.success) throw new Error(data.message);
      setHasKey(true);
      setShowKeyForm(false);
      setKeyInput('');
      await checkApiKey();
      Swal.fire({ icon: 'success', title: 'บันทึก API Key สำเร็จ!', timer: 1500, showConfirmButton: false });
    } catch (e) {
      Swal.fire('เกิดข้อผิดพลาด', e.message, 'error');
    } finally { setKeyLoading(false); }
  }

  async function generate() {
    if (!form.subject.trim()) return Swal.fire('แจ้งเตือน', 'กรุณาระบุวิชา', 'warning');
    if (!form.topic.trim())   return Swal.fire('แจ้งเตือน', 'กรุณาระบุหัวข้อ', 'warning');
    setGenerating(true);
    try {
      const data = await apiPost({
        action:       'generateQuestionsWithGemini',
        callerUserId: profile.userId,
        subject:      form.subject.trim(),
        topic:        form.topic.trim(),
        count:        form.count,
        difficulty:   form.difficulty,
        lang:         form.lang,
      }, 90000); // 90s timeout for AI generation
      if (!data.success) throw new Error(data.message);
      const qs = (data.questions || []).map((q, i) => ({ ...q, _uid: Date.now() + i }));
      if (!qs.length) throw new Error('Gemini ไม่สามารถสร้างข้อสอบได้ ลองปรับหัวข้อและลองใหม่');
      setDrafts(qs);
      setSelected(new Set(qs.map((_, i) => i)));
      setStep('drafts');
    } catch (e) {
      Swal.fire('ไม่สำเร็จ', e.message, 'error');
    } finally { setGenerating(false); }
  }

  async function saveDrafts() {
    const toSave = drafts.filter((_, i) => selected.has(i));
    if (!toSave.length) return Swal.fire('แจ้งเตือน', 'กรุณาเลือกอย่างน้อย 1 ข้อ', 'warning');
    const noAnswer = toSave.filter(q => !q.answer);
    if (noAnswer.length) {
      const ok = await Swal.fire({
        icon: 'warning',
        title: `มี ${noAnswer.length} ข้อที่ยังไม่มีคำตอบ`,
        text: 'ต้องการบันทึกต่อไปหรือไม่?',
        showCancelButton: true,
        confirmButtonText: 'บันทึกต่อ',
        cancelButtonText: 'กลับไปแก้ไข',
      });
      if (!ok.isConfirmed) return;
    }
    setSaving(true);
    try {
      const data = await apiPost({
        action:       'bulkAddQuestions',
        callerUserId: profile.userId,
        questions:    toSave.map(({ _uid, ...rest }) => rest),
      });
      if (!data.success) throw new Error(data.message);
      await Swal.fire({
        icon: 'success',
        title: `✅ บันทึกสำเร็จ ${data.inserted} ข้อ`,
        text: 'ข้อสอบถูกเพิ่มในระบบแล้ว',
        timer: 2000,
        showConfirmButton: false,
      });
      onSaved?.();
      onClose?.();
    } catch (e) {
      Swal.fire('เกิดข้อผิดพลาด', e.message, 'error');
    } finally { setSaving(false); }
  }

  function updateDraft(i, field, val) {
    setDrafts(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: val } : d));
  }

  function removeDraft(i) {
    setDrafts(prev => prev.filter((_, idx) => idx !== i));
    setSelected(prev => {
      const s = new Set();
      prev.forEach(idx => { if (idx !== i) s.add(idx > i ? idx - 1 : idx); });
      return s;
    });
  }

  function toggleSelect(i) {
    setSelected(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s; });
  }

  // ── Loading key status ────────────────────────────────────
  if (hasKey === null) {
    return (
      <div className="quiz-card rounded-2xl p-8 animate-fade text-center">
        <div className="text-3xl mb-3">🤖</div>
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>กำลังตรวจสอบ API Key...</div>
      </div>
    );
  }

  // ── API Key setup form ────────────────────────────────────
  if (!hasKey || showKeyForm) {
    return (
      <div className="quiz-card rounded-2xl p-5 animate-fade">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>🔑 ตั้งค่า Gemini API Key</h2>
            {hasKey && keyPreview && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Key ปัจจุบัน: <code style={{ background: 'var(--input-bg)', padding: '0 4px', borderRadius: 4 }}>{keyPreview}</code>
              </p>
            )}
          </div>
          <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5"
            onClick={hasKey ? () => setShowKeyForm(false) : onClose}>
            {hasKey ? '✕ ปิด' : '✕ ยกเลิก'}
          </button>
        </div>

        {/* Instructions */}
        <div className="rounded-xl p-3 mb-4 text-xs space-y-1.5" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af' }}>
          <div className="font-bold mb-1">📖 วิธีรับ Gemini API Key (ฟรี)</div>
          <div>1. ไปที่ <b>aistudio.google.com</b></div>
          <div>2. Sign in ด้วย Google Account</div>
          <div>3. คลิก <b>"Get API Key"</b> → <b>"Create API key"</b></div>
          <div>4. คัดลอก key และวางด้านล่าง</div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="section-label">Gemini API Key</label>
            <input
              type="password"
              className="themed-input"
              placeholder="AIzaSy..."
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveApiKey()}
            />
          </div>
          <div className="flex gap-3">
            <button className="btn btn-gray flex-1 rounded-xl py-2.5 text-sm"
              onClick={hasKey ? () => setShowKeyForm(false) : onClose}>
              ยกเลิก
            </button>
            <button className="btn btn-primary flex-1 rounded-xl py-2.5 text-sm font-semibold"
              onClick={saveApiKey}
              disabled={keyLoading || !keyInput.trim()}>
              {keyLoading ? '⏳ กำลังบันทึก...' : '💾 บันทึก API Key'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Config step ───────────────────────────────────────────
  if (step === 'config') {
    const canGenerate = form.subject.trim() && form.topic.trim() && !generating;
    return (
      <div className="quiz-card rounded-2xl p-4 sm:p-6 animate-fade">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>🤖 AI สร้างข้อสอบ</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              ใช้ Gemini AI ออกข้อสอบอัตโนมัติ
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-gray text-xs rounded-lg px-2 py-1.5"
              title="เปลี่ยน API Key"
              onClick={() => setShowKeyForm(true)}>🔑</button>
            <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5" onClick={onClose}>✕ ปิด</button>
          </div>
        </div>

        <div className="space-y-4">
          {/* วิชา */}
          <div>
            <label className="section-label">📚 วิชา / หมวดหมู่ <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              list="gemini-subject-list"
              className="themed-input"
              placeholder="ชื่อวิชา เช่น กฎหมายแรงงาน, บัญชีต้นทุน"
              value={form.subject}
              onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
            />
            <datalist id="gemini-subject-list">
              {subjects.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>

          {/* หัวข้อ */}
          <div>
            <label className="section-label">🎯 หัวข้อ / เนื้อหาที่ต้องการ <span style={{ color: '#ef4444' }}>*</span></label>
            <textarea
              className="themed-input"
              rows={4}
              placeholder={'ระบุหัวข้อให้ชัดเจน เช่น:\n"สิทธิและหน้าที่ของลูกจ้างตาม พรบ.คุ้มครองแรงงาน 2541"\n"การคำนวณต้นทุนการผลิตแบบ Job Order Costing"'}
              value={form.topic}
              onChange={e => setForm(p => ({ ...p, topic: e.target.value }))}
            />
          </div>

          {/* จำนวนข้อ */}
          <div>
            <label className="section-label">
              📊 จำนวนข้อ:{' '}
              <b style={{ color: 'var(--accent)', fontSize: 15 }}>{form.count} ข้อ</b>
            </label>
            <input
              type="range" min={5} max={20} step={5}
              value={form.count}
              onChange={e => setForm(p => ({ ...p, count: Number(e.target.value) }))}
              style={{ width: '100%', accentColor: 'var(--accent)', marginTop: 4 }}
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {[5, 10, 15, 20].map(n => (
                <span key={n} style={{ fontWeight: form.count === n ? 700 : 400, color: form.count === n ? 'var(--accent)' : undefined }}>
                  {n}
                </span>
              ))}
            </div>
          </div>

          {/* ระดับ */}
          <div>
            <label className="section-label">🎯 ระดับความยาก</label>
            <div className="flex gap-2">
              {DIFF_OPTS.map(d => (
                <button key={d.val} type="button"
                  className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: form.difficulty === d.val ? d.color : 'var(--input-bg)',
                    color:      form.difficulty === d.val ? 'white' : 'var(--text-muted)',
                    border:     `1.5px solid ${form.difficulty === d.val ? d.color : 'var(--input-border)'}`,
                  }}
                  onClick={() => setForm(p => ({ ...p, difficulty: d.val }))}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* ภาษา */}
          <div>
            <label className="section-label">🌐 ภาษาข้อสอบ</label>
            <div className="flex gap-2">
              {[{ val: 'th', label: '🇹🇭 ภาษาไทย' }, { val: 'en', label: '🇬🇧 English' }].map(l => (
                <button key={l.val} type="button"
                  className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: form.lang === l.val ? 'var(--accent)' : 'var(--input-bg)',
                    color:      form.lang === l.val ? 'white' : 'var(--text-muted)',
                    border:     `1.5px solid ${form.lang === l.val ? 'var(--accent)' : 'var(--input-border)'}`,
                  }}
                  onClick={() => setForm(p => ({ ...p, lang: l.val }))}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button className="btn btn-gray flex-1 rounded-xl py-3 text-sm" onClick={onClose}>ยกเลิก</button>
            <button
              className="btn btn-primary flex-1 rounded-xl py-3 text-sm font-bold"
              onClick={generate}
              disabled={!canGenerate}
              style={{ opacity: canGenerate ? 1 : 0.55 }}>
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  กำลังสร้าง...
                </span>
              ) : `✨ สร้าง ${form.count} ข้อ`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Drafts step ───────────────────────────────────────────
  const selCount = selected.size;

  return (
    <div className="animate-fade">

      {/* Sticky header */}
      <div className="quiz-card no-hover rounded-2xl p-4 mb-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>
              🤖 ร่างข้อสอบจาก AI
              <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full"
                style={{ background: 'var(--input-bg)', color: 'var(--accent)' }}>
                {drafts.length} ข้อ
              </span>
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              📚 {form.subject} · {form.topic.length > 40 ? form.topic.slice(0, 40) + '…' : form.topic}
            </p>
          </div>
          <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5 flex-shrink-0" onClick={onClose}>✕ ปิด</button>
        </div>

        {/* Action bar */}
        <div className="flex gap-2 flex-wrap mt-3">
          <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5" onClick={() => setStep('config')}>
            ← สร้างใหม่
          </button>
          <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5"
            onClick={() => setSelected(new Set(drafts.map((_, i) => i)))}>
            เลือกทั้งหมด ({drafts.length})
          </button>
          <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5"
            onClick={() => setSelected(new Set())}>
            ยกเลิกทั้งหมด
          </button>
          <button
            className="btn btn-primary text-xs rounded-lg px-4 py-1.5 ml-auto font-bold"
            onClick={saveDrafts}
            disabled={saving || selCount === 0}
            style={{ opacity: saving || selCount === 0 ? 0.55 : 1 }}>
            {saving ? '⏳ กำลังบันทึก...' : `💾 บันทึก ${selCount} ข้อ`}
          </button>
        </div>
      </div>

      {/* Draft cards */}
      {drafts.length === 0 ? (
        <div className="quiz-card no-hover rounded-2xl p-8 text-center mb-4">
          <div className="text-4xl mb-3">📭</div>
          <div style={{ color: 'var(--text-muted)' }}>ข้อสอบทั้งหมดถูกลบแล้ว</div>
          <button className="btn btn-primary mt-4 rounded-xl px-6 py-2 text-sm" onClick={() => setStep('config')}>
            ← สร้างใหม่
          </button>
        </div>
      ) : (
        <div className="space-y-4 mb-4">
          {drafts.map((q, i) => (
            <DraftCard
              key={q._uid || i}
              q={q} i={i}
              selected={selected.has(i)}
              onToggle={() => toggleSelect(i)}
              onChange={(field, val) => updateDraft(i, field, val)}
              onRemove={() => removeDraft(i)}
            />
          ))}
        </div>
      )}

      {/* Bottom save bar */}
      {drafts.length > 0 && (
        <>
          <button
            className="btn btn-primary w-full rounded-xl py-3.5 text-sm font-bold mb-2"
            onClick={saveDrafts}
            disabled={saving || selCount === 0}
            style={{ opacity: saving || selCount === 0 ? 0.55 : 1 }}>
            {saving
              ? '⏳ กำลังบันทึก...'
              : `💾 บันทึกข้อที่เลือก (${selCount} / ${drafts.length} ข้อ) เข้าระบบ`}
          </button>
          <button className="btn btn-gray w-full rounded-xl py-3 text-sm mb-2" onClick={() => setStep('config')}>
            🔄 สร้างข้อสอบชุดใหม่
          </button>
        </>
      )}
      <button className="btn btn-gray w-full rounded-xl py-3 text-sm" onClick={onClose}>✕ ปิดโดยไม่บันทึก</button>
    </div>
  );
}
