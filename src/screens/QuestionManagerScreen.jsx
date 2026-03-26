import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useApp } from '../context/AppContext';
import { apiGet, apiPost } from '../utils/api';
import Spinner from '../components/Spinner';

const EMPTY_FORM = { id: '', question: '', a: '', b: '', c: '', d: '', answer: '', explanation: '', subject: '', imageUrl: '' };
const ANSWER_OPTS = ['ก', 'ข', 'ค', 'ง'];

export default function QuestionManagerScreen() {
  const { navigate, profile } = useApp();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [isEdit, setIsEdit]       = useState(false);
  const [filterSubject, setFilterSubject] = useState('');
  const [search, setSearch]       = useState('');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const data = await apiGet('getAllQuestions', { userId: profile.userId });
      if (!data.success) throw new Error(data.message);
      setQuestions(data.questions || []);
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
    setForm({ ...q });
    setIsEdit(true);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.question.trim()) return Swal.fire('แจ้งเตือน', 'กรุณากรอกคำถาม', 'warning');
    if (!form.a.trim()) return Swal.fire('แจ้งเตือน', 'กรุณากรอกตัวเลือก ก', 'warning');
    if (!form.answer.trim()) return Swal.fire('แจ้งเตือน', 'กรุณาเลือกคำตอบที่ถูกต้อง', 'warning');
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
    if (search && !q.question.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <Spinner label="กำลังโหลดข้อสอบ..." />;

  // ── Form Modal ─────────────────────────────────
  if (showForm) {
    return (
      <div className="quiz-card rounded-2xl p-5 sm:p-7 animate-fade">
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

          {/* คำถาม */}
          <div>
            <label className="section-label">คำถาม <span className="text-red-500">*</span></label>
            <textarea className="themed-input" rows={3} placeholder="พิมพ์คำถาม..." value={form.question} onChange={e => setForm(p => ({ ...p, question: e.target.value }))} />
          </div>

          {/* URL รูปภาพ */}
          <div>
            <label className="section-label">🖼 URL รูปภาพ (ไม่บังคับ)</label>
            <input className="themed-input" placeholder="https://..." value={form.imageUrl} onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))} />
            {form.imageUrl && (
              <img src={form.imageUrl} alt="preview" className="mt-2 rounded-lg w-full object-contain" style={{ maxHeight: 160, border: '1px solid var(--input-border)' }} onError={e => e.target.style.display='none'} />
            )}
          </div>

          {/* ตัวเลือก */}
          {['ก', 'ข', 'ค', 'ง'].map((label, i) => {
            const key = ['a','b','c','d'][i];
            return (
              <div key={label}>
                <label className="section-label">ตัวเลือก {label} {i === 0 && <span className="text-red-500">*</span>}</label>
                <input className="themed-input" placeholder={`ตัวเลือก ${label}`} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
              </div>
            );
          })}

          {/* คำตอบที่ถูกต้อง */}
          <div>
            <label className="section-label">คำตอบที่ถูกต้อง <span className="text-red-500">*</span></label>
            <div className="flex gap-2 flex-wrap">
              {ANSWER_OPTS.map(opt => {
                const val = { 'ก': form.a, 'ข': form.b, 'ค': form.c, 'ง': form.d }[opt] || '';
                const selected = form.answer === val && val;
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={!val}
                    onClick={() => setForm(p => ({ ...p, answer: val }))}
                    className="btn rounded-xl px-4 py-2 text-sm"
                    style={{
                      background: selected ? 'var(--accent)' : 'var(--input-bg)',
                      color: selected ? 'white' : 'var(--text)',
                      border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--input-border)'}`,
                      opacity: val ? 1 : 0.4,
                    }}
                  >
                    {opt} {val ? `— ${val.substring(0, 20)}${val.length > 20 ? '...' : ''}` : '(ว่าง)'}
                  </button>
                );
              })}
            </div>
            {form.answer && <p className="text-xs mt-1" style={{ color: 'var(--accent)' }}>✓ คำตอบ: {form.answer.substring(0, 40)}</p>}
          </div>

          {/* คำอธิบาย */}
          <div>
            <label className="section-label">คำอธิบาย / เฉลย</label>
            <textarea className="themed-input" rows={2} placeholder="อธิบายเพิ่มเติม..." value={form.explanation} onChange={e => setForm(p => ({ ...p, explanation: e.target.value }))} />
          </div>

          <div className="flex gap-3 pt-2">
            <button className="btn btn-gray flex-1 rounded-xl py-3" onClick={() => setShowForm(false)}>ยกเลิก</button>
            <button className="btn btn-primary flex-1 rounded-xl py-3" onClick={handleSave} disabled={saving}>
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
      <div className="quiz-card no-hover rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>📚 จัดการข้อสอบ</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{filtered.length} / {questions.length} ข้อ</p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5" onClick={loadAll}>🔄</button>
            <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5" onClick={() => navigate('admin')}>← กลับ</button>
          </div>
        </div>

        {/* Filter & Search */}
        <div className="flex gap-2 flex-wrap mb-3">
          <select className="themed-input flex-1" style={{ minWidth: 120 }} value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
            <option value="">ทุกวิชา</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input className="themed-input flex-1" style={{ minWidth: 150 }} placeholder="🔍 ค้นหาคำถาม..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <button className="btn btn-primary w-full rounded-xl py-2.5 text-sm" onClick={openAdd}>
          ➕ เพิ่มข้อสอบใหม่
        </button>
      </div>

      {/* Question Cards */}
      {filtered.length === 0 ? (
        <div className="quiz-card no-hover rounded-2xl p-8 text-center" style={{ color: 'var(--text-muted)' }}>ไม่พบข้อสอบ</div>
      ) : (
        <div className="space-y-3 mb-4">
          {filtered.map((q, i) => (
            <div key={q.id} className="quiz-card rounded-xl p-4" style={{ cursor: 'default' }}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <span className="text-xs px-2 py-0.5 rounded-full mr-2" style={{ background: 'var(--opt-hover)', color: 'var(--accent)' }}>{q.subject}</span>
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

      <button className="btn btn-gray w-full rounded-xl py-3" onClick={() => navigate('admin')}>← กลับหน้าแอดมิน</button>
    </div>
  );
}
