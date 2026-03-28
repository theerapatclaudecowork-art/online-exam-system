import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useApp } from '../context/AppContext';
import { apiGet, apiPost } from '../utils/api';
import Spinner from '../components/Spinner';
import ImageUploader from '../components/ImageUploader';

const EMPTY_FORM = { id: '', question: '', a: '', b: '', c: '', d: '', answer: '', explanation: '', subject: '', imageUrl: '', difficulty: 'medium', tags: '' };
const ANSWER_OPTS = ['ก', 'ข', 'ค', 'ง'];
const DIFF_OPTS = [
  { val: 'easy',   label: '🟢 ง่าย',   color: '#16a34a' },
  { val: 'medium', label: '🟡 กลาง',   color: '#d97706' },
  { val: 'hard',   label: '🔴 ยาก',    color: '#dc2626' },
];

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
  const [filterDiff, setFilterDiff] = useState('');
  const [showImport, setShowImport]   = useState(false);
  const [importRows, setImportRows]   = useState([]);
  const [importing, setImporting]     = useState(false);
  const [importError, setImportError] = useState('');

  useEffect(() => { loadAll(); }, []);

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
    if (filterDiff && q.difficulty !== filterDiff) return false;
    return true;
  });

  if (loading) return <Spinner label="กำลังโหลดข้อสอบ..." />;

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
                    className="btn rounded-xl px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm"
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
            <h2 className="text-base sm:text-lg font-bold" style={{ color: 'var(--text)' }}>📚 จัดการข้อสอบ</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{filtered.length} / {questions.length} ข้อ</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5" onClick={loadAll}>🔄</button>
            <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5" onClick={() => navigate('admin')}>← กลับ</button>
          </div>
        </div>

        {/* Filter & Search */}
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <select className="themed-input w-full" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
            <option value="">ทุกวิชา</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input className="themed-input w-full" placeholder="🔍 ค้นหาคำถาม..." value={search} onChange={e => setSearch(e.target.value)} />
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

        <div className="flex gap-2">
          <button className="btn btn-primary w-full rounded-xl py-2.5 text-sm" onClick={openAdd}>
            ➕ เพิ่มข้อสอบใหม่
          </button>
          <label className="btn btn-gray rounded-xl py-2.5 text-sm cursor-pointer flex-shrink-0 px-4" style={{ whiteSpace: 'nowrap' }}>
            📥 Import CSV
            <input type="file" accept=".csv,.txt" className="hidden" onChange={handleCSVFile} />
          </label>
        </div>
      </div>

      {/* Question Cards */}
      {filtered.length === 0 ? (
        <div className="quiz-card no-hover rounded-2xl p-8 text-center" style={{ color: 'var(--text-muted)' }}>ไม่พบข้อสอบ</div>
      ) : (
        <div className="space-y-3 mb-4">
          {filtered.map((q, i) => (
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

      <button className="btn btn-gray w-full rounded-xl py-3" onClick={() => navigate('admin')}>← กลับหน้าแอดมิน</button>
    </div>
  );
}
