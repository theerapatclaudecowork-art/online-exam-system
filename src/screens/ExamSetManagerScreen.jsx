// ─────────────────────────────────────────────────────────────
//  ExamSetManagerScreen — Admin: จัดการชุดข้อสอบ
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useApp } from '../context/AppContext';
import { apiGet, apiPost, apiGetCached } from '../utils/api';
import Spinner from '../components/Spinner';

const STATUS_CFG = {
  active:   { label: 'เปิดใช้',  bg: '#dcfce7', color: '#15803d' },
  draft:    { label: 'ร่าง',     bg: '#f1f5f9', color: '#475569' },
  inactive: { label: 'ปิดใช้',  bg: '#fee2e2', color: '#b91c1c' },
};
const VIS_CFG = {
  public:  { label: '🌐 สาธารณะ', color: '#3b82f6' },
  private: { label: '🔒 เฉพาะสมาชิก', color: '#8b5cf6' },
};

// ─── Subject row ใน form ─────────────────────────────────────
function SubjectRow({ sub, subjectOptions, onUpdate, onRemove }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-xl"
      style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>
      <select className="themed-input flex-1 text-sm"
        value={sub.name}
        onChange={e => onUpdate({ ...sub, name: e.target.value })}>
        <option value="">-- เลือกวิชา --</option>
        {subjectOptions.map(s => (
          <option key={s.name} value={s.name}>{s.name}</option>
        ))}
      </select>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <label className="text-xs" style={{ color: 'var(--text-muted)' }}>ข้อ</label>
        <input type="number" min="0" max="999"
          className="themed-input text-center text-sm"
          style={{ width: 60 }}
          value={sub.numQ}
          onChange={e => onUpdate({ ...sub, numQ: Math.max(0, parseInt(e.target.value) || 0) })}
          placeholder="0=ทั้งหมด"
        />
      </div>
      <button className="btn btn-gray rounded-lg px-2 py-1.5 text-xs flex-shrink-0"
        style={{ color: '#ef4444' }}
        onClick={onRemove}>✕</button>
    </div>
  );
}

// ─── Modal แก้ไข / สร้าง ─────────────────────────────────────
function ExamSetFormModal({ set, subjectOptions, members, callerUserId, onClose, onSaved }) {
  const isNew = !set?.setId;

  const [form, setForm] = useState({
    setName:       set?.setName       || '',
    description:   set?.description   || '',
    subjects:      set?.subjects      || [],
    status:        set?.status        || 'draft',
    visibility:    set?.visibility    || 'public',
    allowedUsers:  set?.allowedUsers  || [],
    maxAttempts:   set?.maxAttempts   ?? 0,
    timerMin:      set?.timerMin      ?? 0,
    passThreshold: set?.passThreshold ?? 60,
    setOrder:      set?.setOrder      ?? 99,
    startDate:     set?.startDate     || '',
    endDate:       set?.endDate       || '',
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  function addSubject() {
    setForm(p => ({ ...p, subjects: [...p.subjects, { name: '', numQ: 10 }] }));
  }
  function updateSubject(i, val) {
    const subs = [...form.subjects];
    subs[i] = val;
    setForm(p => ({ ...p, subjects: subs }));
  }
  function removeSubject(i) {
    setForm(p => ({ ...p, subjects: p.subjects.filter((_, j) => j !== i) }));
  }
  function toggleUser(uid) {
    setForm(p => ({
      ...p,
      allowedUsers: p.allowedUsers.includes(uid)
        ? p.allowedUsers.filter(u => u !== uid)
        : [...p.allowedUsers, uid],
    }));
  }

  const totalQ = form.subjects.reduce((s, sub) => s + Number(sub.numQ || 0), 0);

  async function handleSave() {
    if (!form.setName.trim()) return Swal.fire('กรุณาระบุชื่อชุดข้อสอบ', '', 'warning');
    if (!form.subjects.length) return Swal.fire('กรุณาเพิ่มวิชาอย่างน้อย 1 วิชา', '', 'warning');
    if (form.subjects.some(s => !s.name)) return Swal.fire('กรุณาเลือกวิชาให้ครบทุกรายการ', '', 'warning');
    setSaving(true);
    try {
      const action = isNew ? 'createExamSet' : 'updateExamSet';
      const body   = { action, callerUserId, ...form };
      if (!isNew) body.setId = set.setId;
      const data   = await apiPost(body);
      if (!data.success) throw new Error(data.message);
      onSaved();
      onClose();
      Swal.fire({ icon: 'success', title: isNew ? 'สร้างชุดข้อสอบแล้ว!' : 'บันทึกสำเร็จ!', timer: 1500, showConfirmButton: false });
    } catch (e) {
      Swal.fire('เกิดข้อผิดพลาด', e.message, 'error');
    } finally { setSaving(false); }
  }

  const TABS = [
    { key: 'basic',    label: '📋 ข้อมูลทั่วไป' },
    { key: 'subjects', label: `📚 วิชา (${form.subjects.length})` },
    { key: 'settings', label: '⚙️ ตั้งค่า' },
    { key: 'access',   label: '🔐 สิทธิ์' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(2px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl"
        style={{ background: 'var(--card)', boxShadow: '0 -4px 32px rgba(0,0,0,.25)' }}>

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 rounded-t-3xl sm:rounded-t-2xl"
          style={{ background: 'var(--card)', borderBottom: '1px solid var(--input-border)' }}>
          <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>
            {isNew ? '➕ สร้างชุดข้อสอบใหม่' : '✏️ แก้ไขชุดข้อสอบ'}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn btn-gray text-xs rounded-lg px-2.5 py-1.5">ยกเลิก</button>
            <button onClick={handleSave} disabled={saving}
              className="btn text-xs rounded-lg px-3 py-1.5"
              style={{ background: '#16a34a', color: 'white', opacity: saving ? .6 : 1 }}>
              {saving ? '⏳...' : '💾 บันทึก'}
            </button>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b px-4 pt-2 gap-0"
          style={{ borderColor: 'var(--input-border)' }}>
          {TABS.map(t => (
            <button key={t.key}
              onClick={() => setActiveTab(t.key)}
              className="px-3 py-2 text-xs font-semibold transition-all border-b-2 -mb-px"
              style={{
                borderColor:  activeTab === t.key ? 'var(--accent)' : 'transparent',
                color:        activeTab === t.key ? 'var(--accent)' : 'var(--text-muted)',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-3">

          {/* ── Tab: Basic ─────────────────────── */}
          {activeTab === 'basic' && (
            <div className="space-y-3 animate-fade">
              <label className="block">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>ชื่อชุดข้อสอบ *</span>
                <input className="themed-input w-full mt-1" placeholder="เช่น ชุดข้อสอบก่อนเข้างาน"
                  value={form.setName} onChange={e => setForm(p => ({ ...p, setName: e.target.value }))} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>คำอธิบาย</span>
                <textarea className="themed-input w-full mt-1 resize-none" rows={3}
                  placeholder="อธิบายเนื้อหาหรือเงื่อนไขของชุดข้อสอบ..."
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>สถานะ</span>
                  <select className="themed-input w-full mt-1"
                    value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    <option value="draft">🗒 ร่าง</option>
                    <option value="active">✅ เปิดใช้</option>
                    <option value="inactive">❌ ปิดใช้</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>ลำดับแสดง</span>
                  <input type="number" min="1" max="999" className="themed-input w-full mt-1"
                    value={form.setOrder}
                    onChange={e => setForm(p => ({ ...p, setOrder: parseInt(e.target.value) || 99 }))} />
                </label>
              </div>
            </div>
          )}

          {/* ── Tab: Subjects ──────────────────── */}
          {activeTab === 'subjects' && (
            <div className="space-y-2 animate-fade">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-bold" style={{ color: 'var(--text)' }}>รายวิชาในชุดข้อสอบ</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {form.subjects.length} วิชา • รวม {totalQ === 0 ? 'ทั้งหมด' : totalQ} ข้อ
                    {' '}
                    <span className="text-xs">({totalQ === 0 ? 'สุ่มทั้งหมดที่มี' : 'สุ่มตามจำนวนที่กำหนด'})</span>
                  </div>
                </div>
                <button className="btn btn-primary text-xs rounded-lg px-3 py-1.5" onClick={addSubject}>
                  + เพิ่มวิชา
                </button>
              </div>

              {form.subjects.length === 0 ? (
                <div className="text-center py-8 rounded-2xl"
                  style={{ background: 'var(--input-bg)', border: '2px dashed var(--input-border)', color: 'var(--text-muted)' }}>
                  <div className="text-3xl mb-2">📚</div>
                  <div className="text-sm">กดปุ่ม "+ เพิ่มวิชา" เพื่อเริ่มต้น</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {form.subjects.map((sub, i) => (
                    <SubjectRow key={i} sub={sub} subjectOptions={subjectOptions}
                      onUpdate={val => updateSubject(i, val)}
                      onRemove={() => removeSubject(i)} />
                  ))}
                </div>
              )}

              <div className="text-xs p-3 rounded-xl mt-2"
                style={{ background: 'var(--input-bg)', color: 'var(--text-muted)' }}>
                💡 ใส่ <b>0</b> ที่จำนวนข้อ = สุ่มทุกข้อที่มีในวิชานั้น
              </div>
            </div>
          )}

          {/* ── Tab: Settings ─────────────────── */}
          {activeTab === 'settings' && (
            <div className="space-y-3 animate-fade">
              <label className="block">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>⏱ เวลาสอบ (นาที) — 0 = ไม่จับเวลา</span>
                <div className="flex items-center gap-3 mt-1">
                  <input type="range" min="0" max="180" className="flex-1"
                    value={form.timerMin}
                    onChange={e => setForm(p => ({ ...p, timerMin: Number(e.target.value) }))} />
                  <input type="number" min="0" max="999"
                    className="themed-input text-center" style={{ width: 72 }}
                    value={form.timerMin}
                    onChange={e => setForm(p => ({ ...p, timerMin: Math.max(0, parseInt(e.target.value)||0) }))} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>นาที</span>
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>🎯 เกณฑ์ผ่าน (%)</span>
                <div className="flex items-center gap-3 mt-1">
                  <input type="range" min="0" max="100" className="flex-1"
                    value={form.passThreshold}
                    onChange={e => setForm(p => ({ ...p, passThreshold: Number(e.target.value) }))} />
                  <input type="number" min="0" max="100"
                    className="themed-input text-center" style={{ width: 72 }}
                    value={form.passThreshold}
                    onChange={e => setForm(p => ({ ...p, passThreshold: Math.min(100, Math.max(0, parseInt(e.target.value)||0)) }))} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>%</span>
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>🔁 จำกัดจำนวนครั้ง — 0 = ไม่จำกัด</span>
                <div className="flex gap-3 mt-1">
                  {[0, 1, 2, 3, 5].map(v => (
                    <button key={v}
                      className="btn text-xs rounded-lg px-3 py-1.5"
                      style={{
                        background: form.maxAttempts === v ? 'var(--accent)' : 'var(--input-bg)',
                        color: form.maxAttempts === v ? 'white' : 'var(--text-muted)',
                      }}
                      onClick={() => setForm(p => ({ ...p, maxAttempts: v }))}>
                      {v === 0 ? '∞' : v + ' ครั้ง'}
                    </button>
                  ))}
                  <input type="number" min="0" max="99"
                    className="themed-input text-center" style={{ width: 64 }}
                    value={form.maxAttempts}
                    onChange={e => setForm(p => ({ ...p, maxAttempts: Math.max(0, parseInt(e.target.value)||0) }))} />
                </div>
              </label>
              {/* ── วันเปิด/ปิด ─── */}
              <div className="rounded-xl p-3" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>
                <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>📅 กำหนดช่วงเวลาสอบ (ไม่บังคับ)</div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>วันเริ่ม</span>
                    <input type="date" className="themed-input w-full mt-1 text-sm"
                      value={form.startDate}
                      onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
                  </label>
                  <label className="block">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>วันสิ้นสุด</span>
                    <input type="date" className="themed-input w-full mt-1 text-sm"
                      value={form.endDate}
                      onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} />
                  </label>
                </div>
                {(form.startDate || form.endDate) && (
                  <button className="btn btn-gray text-xs rounded-lg px-2 py-1 mt-2"
                    onClick={() => setForm(p => ({ ...p, startDate: '', endDate: '' }))}>
                    ✕ ล้างวันที่
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Tab: Access ────────────────────── */}
          {activeTab === 'access' && (
            <div className="space-y-3 animate-fade">
              <label className="block">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>การมองเห็น</span>
                <div className="flex gap-2 mt-2">
                  {[
                    { val: 'public',  label: '🌐 สาธารณะ',       sub: 'ทุกคนเห็น' },
                    { val: 'private', label: '🔒 เฉพาะสมาชิก',   sub: 'เลือกได้ด้านล่าง' },
                  ].map(opt => (
                    <button key={opt.val}
                      className="flex-1 rounded-xl p-3 text-left border-2 transition-all"
                      style={{
                        borderColor: form.visibility === opt.val ? 'var(--accent)' : 'var(--input-border)',
                        background:  form.visibility === opt.val ? 'var(--input-bg)' : 'transparent',
                      }}
                      onClick={() => setForm(p => ({ ...p, visibility: opt.val }))}>
                      <div className="font-semibold text-xs" style={{ color: 'var(--text)' }}>{opt.label}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </label>

              {form.visibility === 'private' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                      สมาชิกที่เข้าถึงได้ ({form.allowedUsers.length} คน)
                    </span>
                    <div className="flex gap-1.5">
                      <button className="btn btn-gray text-xs rounded-lg px-2 py-1"
                        onClick={() => setForm(p => ({ ...p, allowedUsers: members.filter(m => m.status === 'active').map(m => m.lineUserId) }))}>
                        เลือกทั้งหมด
                      </button>
                      <button className="btn btn-gray text-xs rounded-lg px-2 py-1"
                        onClick={() => setForm(p => ({ ...p, allowedUsers: [] }))}>
                        ล้าง
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {members.filter(m => m.status === 'active').map(m => {
                      const checked = form.allowedUsers.includes(m.lineUserId);
                      return (
                        <div key={m.lineUserId}
                          className="flex items-center gap-2 p-2 rounded-xl cursor-pointer"
                          style={{ background: checked ? 'var(--input-bg)' : 'transparent', border: `1.5px solid ${checked ? 'var(--accent)' : 'var(--input-border)'}` }}
                          onClick={() => toggleUser(m.lineUserId)}>
                          <input type="checkbox" checked={checked} onChange={() => {}} className="w-4 h-4 flex-shrink-0" />
                          {m.pictureUrl
                            ? <img src={m.pictureUrl} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                            : <div className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0" style={{ background: 'var(--card)' }}>👤</div>
                          }
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>{m.fullName || m.displayName}</div>
                            {m.studentId && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>#{m.studentId}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Set Card ────────────────────────────────────────────────
function ExamSetCard({ set, onEdit, onDelete, onView }) {
  const st  = STATUS_CFG[set.status]  || STATUS_CFG.draft;
  const vis = VIS_CFG[set.visibility] || VIS_CFG.public;
  return (
    <div className="quiz-card rounded-xl p-4 cursor-pointer hover:shadow-md transition-all active:scale-[.99]"
      onClick={onView}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>{set.setName}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
              style={{ background: st.bg, color: st.color }}>{st.label}</span>
            {/* Schedule badge */}
            {(() => {
              const ss = set.scheduleStatus;
              if (!ss || ss === 'always') return null;
              const cfg = {
                upcoming: { bg: '#eff6ff', color: '#1d4ed8', label: `🕐 เปิด ${set.startDate}` },
                expired:  { bg: '#fef2f2', color: '#b91c1c', label: '⛔ หมดเวลาแล้ว' },
                active:   set.endDate ? { bg: '#f0fdf4', color: '#15803d', label: `✅ ถึง ${set.endDate}` } : null,
              }[ss];
              if (!cfg) return null;
              return (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                  style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
              );
            })()}
          </div>
          {set.description && (
            <div className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{set.description}</div>
          )}
          <div className="flex flex-wrap gap-2 mt-2 text-xs">
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>📚 {set.subjectCount} วิชา</span>
            <span style={{ color: 'var(--text-muted)' }}>• {set.totalQ === 0 ? 'ข้อสอบทั้งหมด' : set.totalQ + ' ข้อ'}</span>
            {set.timerMin > 0 && <span style={{ color: 'var(--text-muted)' }}>• ⏱ {set.timerMin} น.</span>}
            <span style={{ color: vis.color }}>{vis.label}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <div className="text-right">
            <div className="text-base font-black" style={{ color: set.passRate >= 60 ? '#16a34a' : '#ef4444' }}>
              {set.attemptCount > 0 ? set.passRate + '%' : '—'}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{set.attemptCount || 0} ครั้ง</div>
          </div>
        </div>
      </div>

      {/* Subject chips */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {set.subjects.slice(0, 5).map((s, i) => (
          <span key={i} className="text-xs px-2 py-0.5 rounded-lg"
            style={{ background: 'var(--input-bg)', color: 'var(--text-muted)', border: '1px solid var(--input-border)' }}>
            {s.name}{s.numQ > 0 ? ` (${s.numQ})` : ''}
          </span>
        ))}
        {set.subjects.length > 5 && (
          <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: 'var(--input-bg)', color: 'var(--text-muted)' }}>
            +{set.subjects.length - 5} อื่นๆ
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-3 border-t pt-3" style={{ borderColor: 'var(--input-border)' }}
        onClick={e => e.stopPropagation()}>
        <button className="btn flex-1 text-xs rounded-lg py-1.5"
          style={{ background: 'var(--accent)', color: 'white' }}
          onClick={onEdit}>✏️ แก้ไข</button>
        <button className="btn btn-gray flex-1 text-xs rounded-lg py-1.5"
          onClick={onView}>📊 รายละเอียด</button>
        <button className="btn text-xs rounded-lg py-1.5 px-3"
          style={{ background: '#fee2e2', color: '#b91c1c' }}
          onClick={onDelete}>🗑</button>
      </div>
    </div>
  );
}

// ─── Detail Modal ────────────────────────────────────────────
function ExamSetDetailModal({ set, callerUserId, onClose, onEdit }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiPost({ action: 'getExamSetDetail', callerUserId, setId: set.setId })
      .then(d => { if (d.success) setDetail(d.set); })
      .finally(() => setLoading(false));
  }, []);

  const d = detail || set;
  const st  = STATUS_CFG[d.status]  || STATUS_CFG.draft;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(2px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl"
        style={{ background: 'var(--card)', boxShadow: '0 -4px 32px rgba(0,0,0,.25)' }}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 rounded-t-3xl sm:rounded-t-2xl"
          style={{ background: 'var(--card)', borderBottom: '1px solid var(--input-border)' }}>
          <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>📊 รายละเอียดชุดข้อสอบ</span>
          <div className="flex gap-2">
            <button onClick={onEdit} className="btn text-xs rounded-lg px-3 py-1.5"
              style={{ background: 'var(--accent)', color: 'white' }}>✏️ แก้ไข</button>
            <button onClick={onClose} className="btn btn-gray text-xs rounded-lg px-2.5 py-1.5">✕</button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {loading ? <Spinner label="กำลังโหลด..." /> : (
            <>
              {/* Hero */}
              <div className="rounded-2xl p-4" style={{ background: 'var(--input-bg)' }}>
                <div className="flex items-start gap-3">
                  <div className="text-3xl">📦</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-base" style={{ color: 'var(--text)' }}>{d.setName}</div>
                    {d.description && <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{d.description}</div>}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--card)', color: 'var(--text-muted)' }}>
                        {d.visibility === 'public' ? '🌐 สาธารณะ' : '🔒 เฉพาะสมาชิก'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-4 text-center">
                  {[
                    { v: d.subjectCount,  l: 'วิชา',    c: 'var(--accent)' },
                    { v: d.totalQ || '∞', l: 'ข้อรวม',  c: '#3b82f6' },
                    { v: d.attemptCount || 0, l: 'ครั้งสอบ', c: '#f59e0b' },
                    { v: (d.passRate || 0) + '%', l: 'อัตราผ่าน', c: d.passRate >= 60 ? '#16a34a' : '#ef4444' },
                  ].map(({ v, l, c }, i) => (
                    <div key={i}>
                      <div className="text-lg font-black" style={{ color: c }}>{v}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Settings */}
              <div className="rounded-2xl p-4" style={{ background: 'var(--input-bg)' }}>
                <div className="text-xs font-bold mb-2" style={{ color: 'var(--text-muted)' }}>⚙️ การตั้งค่า</div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>{d.timerMin > 0 ? d.timerMin + ' น.' : 'ไม่จำกัด'}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>เวลาสอบ</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>{d.passThreshold}%</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>เกณฑ์ผ่าน</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>{d.maxAttempts > 0 ? d.maxAttempts + ' ครั้ง' : 'ไม่จำกัด'}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>จำกัดครั้ง</div>
                  </div>
                </div>
              </div>

              {/* Subjects list */}
              <div className="rounded-2xl p-4" style={{ background: 'var(--input-bg)' }}>
                <div className="text-xs font-bold mb-2" style={{ color: 'var(--text-muted)' }}>📚 รายวิชาในชุด</div>
                <div className="space-y-2">
                  {d.subjects.map((s, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-xl"
                      style={{ background: 'var(--card)' }}>
                      <span className="text-sm" style={{ color: 'var(--text)' }}>{s.name}</span>
                      <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                        {s.numQ > 0 ? s.numQ + ' ข้อ' : 'ทั้งหมด'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assigned members (private) */}
              {d.visibility === 'private' && d.assignedMembers?.length > 0 && (
                <div className="rounded-2xl p-4" style={{ background: 'var(--input-bg)' }}>
                  <div className="text-xs font-bold mb-2" style={{ color: 'var(--text-muted)' }}>👥 สมาชิกที่เข้าถึงได้ ({d.assignedMembers.length} คน)</div>
                  <div className="flex flex-wrap gap-2">
                    {d.assignedMembers.map(m => (
                      <div key={m.lineUserId} className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
                        style={{ background: 'var(--card)', border: '1px solid var(--input-border)' }}>
                        {m.pictureUrl
                          ? <img src={m.pictureUrl} className="w-5 h-5 rounded-full object-cover" />
                          : <span className="text-sm">👤</span>}
                        <span className="text-xs" style={{ color: 'var(--text)' }}>{m.fullName || m.displayName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent attempts */}
              {d.recentAttempts?.length > 0 && (
                <div className="rounded-2xl p-4" style={{ background: 'var(--input-bg)' }}>
                  <div className="text-xs font-bold mb-2" style={{ color: 'var(--text-muted)' }}>📋 ผลสอบล่าสุด</div>
                  <div className="space-y-1.5">
                    {d.recentAttempts.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 py-1 px-2 rounded-lg"
                        style={{ background: 'var(--card)' }}>
                        <span className="text-xs flex-1 truncate" style={{ color: 'var(--text)' }}>{r.name}</span>
                        <span className="text-xs font-bold" style={{ color: r.pass === 'ผ่าน' ? '#16a34a' : '#ef4444' }}>{r.pct}</span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
export default function ExamSetManagerScreen() {
  const { navigate, profile } = useApp();
  const [sets, setSets]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [members, setMembers]   = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editSet, setEditSet]   = useState(null);   // null = new, obj = edit
  const [viewSet, setViewSet]   = useState(null);   // detail modal
  const [search, setSearch]     = useState('');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [setsData, membersData, subjectsData] = await Promise.all([
        apiGet('getAdminExamSets', { userId: profile.userId }),
        apiGet('getMembersWithProfiles', { userId: profile.userId }),
        apiGetCached('getSubjects', {}, 5 * 60_000),
      ]);
      if (setsData.success)    setSets(setsData.sets || []);
      if (membersData.success) setMembers(membersData.members || []);
      if (subjectsData.success) setSubjects(subjectsData.subjects || []);
    } catch (_) {}
    finally { setLoading(false); }
  }

  async function handleDelete(set) {
    const r = await Swal.fire({
      title: `ลบชุดข้อสอบ "${set.setName}"?`,
      html: `<small style="color:#888">ผลสอบที่บันทึกไว้จะยังคงอยู่</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบเลย',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
    });
    if (!r.isConfirmed) return;
    const data = await apiPost({ action: 'deleteExamSet', callerUserId: profile.userId, setId: set.setId });
    if (!data.success) return Swal.fire('เกิดข้อผิดพลาด', data.message, 'error');
    Swal.fire({ icon: 'success', title: 'ลบแล้ว', timer: 1200, showConfirmButton: false });
    loadAll();
  }

  const filtered = sets.filter(s =>
    !search || s.setName.toLowerCase().includes(search.toLowerCase()) ||
    s.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade">
      {/* Form Modal */}
      {showForm && (
        <ExamSetFormModal
          set={editSet}
          subjectOptions={subjects}
          members={members}
          callerUserId={profile.userId}
          onClose={() => { setShowForm(false); setEditSet(null); }}
          onSaved={loadAll}
        />
      )}
      {/* Detail Modal */}
      {viewSet && (
        <ExamSetDetailModal
          set={viewSet}
          callerUserId={profile.userId}
          onClose={() => setViewSet(null)}
          onEdit={() => { setEditSet(viewSet); setShowForm(true); setViewSet(null); }}
        />
      )}

      {/* Header */}
      <div className="quiz-card no-hover rounded-2xl p-3 sm:p-4 mb-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-base sm:text-lg font-bold" style={{ color: 'var(--text)' }}>📦 จัดการชุดข้อสอบ</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{sets.length} ชุด</p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary text-xs rounded-lg px-3 py-1.5"
              onClick={() => { setEditSet(null); setShowForm(true); }}>
              + สร้างชุดใหม่
            </button>
            <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5"
              onClick={() => navigate('admin')}>← กลับ</button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-3">
        <input className="themed-input w-full" placeholder="🔍 ค้นหาชุดข้อสอบ..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Sets */}
      {loading ? <Spinner label="กำลังโหลด..." /> : (
        filtered.length === 0 ? (
          <div className="quiz-card no-hover rounded-2xl p-10 text-center">
            <div className="text-4xl mb-3">📦</div>
            <div style={{ color: 'var(--text-muted)' }}>
              {search ? 'ไม่พบชุดข้อสอบที่ค้นหา' : 'ยังไม่มีชุดข้อสอบ — กดปุ่ม "สร้างชุดใหม่" ด้านบน'}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(set => (
              <ExamSetCard key={set.setId} set={set}
                onEdit={() => { setEditSet(set); setShowForm(true); }}
                onDelete={() => handleDelete(set)}
                onView={() => setViewSet(set)}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}
