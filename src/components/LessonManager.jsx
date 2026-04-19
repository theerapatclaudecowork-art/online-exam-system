// ─────────────────────────────────────────────────────────────
//  LessonManager — CRUD บทเรียน สำหรับ Admin / Teacher
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { apiGet, apiPost } from '../utils/api';

const EMPTY = { title: '', description: '', content: '', videoUrl: '', imageUrl: '', course: '', sortOrder: 0, isEnabled: true };

export default function LessonManager({ callerUserId }) {
  const [lessons, setLessons]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [courses, setCourses]   = useState([]);
  const [editing, setEditing]   = useState(null); // null=list, 'new'=add, {lesson}=edit
  const [form, setForm]         = useState({ ...EMPTY });
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState('');

  useEffect(() => { load(); loadCourses(); }, []);

  async function load() {
    setLoading(true);
    try {
      const d = await apiGet('getLessons', {});
      if (d.success) setLessons(d.lessons || []);
    } catch (_) {}
    finally { setLoading(false); }
  }

  async function loadCourses() {
    try {
      const d = await apiGet('getCourses', { userId: callerUserId });
      if (d.success) setCourses(d.courses || []);
    } catch (_) {}
  }

  function startAdd() {
    setForm({ ...EMPTY });
    setEditing('new');
  }

  function startEdit(lesson) {
    setForm({
      lessonId:    lesson.lessonId,
      title:       lesson.title || '',
      description: lesson.description || '',
      content:     '',  // จะโหลดแยก
      videoUrl:    lesson.videoUrl || '',
      imageUrl:    lesson.imageUrl || '',
      course:      lesson.course || '',
      sortOrder:   lesson.sortOrder || 0,
      isEnabled:   lesson.isEnabled !== false,
    });
    // โหลด content (field ใหญ่)
    apiGet('getLessonDetail', { lessonId: lesson.lessonId })
      .then(d => { if (d.success && d.lesson) setForm(prev => ({ ...prev, content: d.lesson.content || '' })); })
      .catch(() => {});
    setEditing(lesson);
  }

  async function handleSave() {
    if (!form.title.trim()) { Swal.fire('', 'กรุณากรอกชื่อบทเรียน', 'warning'); return; }
    setSaving(true);
    try {
      const action = editing === 'new' ? 'addLesson' : 'updateLesson';
      const payload = { ...form, callerUserId };
      const d = await apiPost({ action, ...payload });
      if (!d.success) throw new Error(d.message);
      Swal.fire({ toast: true, position: 'top', timer: 2000, showConfirmButton: false, icon: 'success', title: editing === 'new' ? 'เพิ่มบทเรียนแล้ว' : 'อัปเดตแล้ว' });
      setEditing(null);
      await load();
    } catch (e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error'); }
    finally { setSaving(false); }
  }

  async function handleDelete(lesson) {
    const r = await Swal.fire({
      title: 'ลบบทเรียน?',
      html: `<b>${lesson.title}</b><br>การลบจะไม่สามารถกู้คืนได้`,
      icon: 'warning', showCancelButton: true,
      confirmButtonText: 'ลบ', cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
    });
    if (!r.isConfirmed) return;
    try {
      const d = await apiPost({ action: 'deleteLesson', callerUserId, lessonId: lesson.lessonId });
      if (!d.success) throw new Error(d.message);
      Swal.fire({ toast: true, position: 'top', timer: 2000, showConfirmButton: false, icon: 'success', title: 'ลบแล้ว' });
      await load();
    } catch (e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error'); }
  }

  async function handleToggle(lesson) {
    try {
      const d = await apiPost({ action: 'updateLesson', callerUserId, lessonId: lesson.lessonId, isEnabled: !lesson.isEnabled });
      if (!d.success) throw new Error(d.message);
      await load();
    } catch (e) { Swal.fire('Error', e.message, 'error'); }
  }

  // ── Edit/Add Form ──
  if (editing !== null) {
    return (
      <div className="animate-fade">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setEditing(null)}
            style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 10, padding: '6px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: 'var(--text-muted)' }}>
            ← กลับ
          </button>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>
            {editing === 'new' ? '➕ เพิ่มบทเรียนใหม่' : '✏️ แก้ไขบทเรียน'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Title */}
          <div>
            <label style={lbl}>ชื่อบทเรียน *</label>
            <input className="themed-input" style={inp} placeholder="เช่น บทที่ 1 ความรู้เบื้องต้น"
              value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>

          {/* Description */}
          <div>
            <label style={lbl}>คำอธิบายสั้น</label>
            <input className="themed-input" style={inp} placeholder="คำอธิบาย (แสดงในรายการ)"
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>

          {/* Content */}
          <div>
            <label style={lbl}>เนื้อหาบทเรียน (รองรับ HTML)</label>
            <textarea className="themed-input" style={{ ...inp, minHeight: 160, resize: 'vertical' }}
              placeholder="เนื้อหาเต็ม... สามารถใช้ HTML ได้ เช่น <b>ตัวหนา</b> <br> ขึ้นบรรทัดใหม่"
              value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} />
          </div>

          {/* Video URL */}
          <div>
            <label style={lbl}>ลิงก์วิดีโอ (YouTube)</label>
            <input className="themed-input" style={inp} placeholder="https://youtube.com/watch?v=..."
              value={form.videoUrl} onChange={e => setForm(p => ({ ...p, videoUrl: e.target.value }))} />
          </div>

          {/* Image URL */}
          <div>
            <label style={lbl}>ลิงก์รูปปก</label>
            <input className="themed-input" style={inp} placeholder="https://..."
              value={form.imageUrl} onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))} />
            {form.imageUrl && (
              <img src={form.imageUrl} alt="" style={{ height: 80, borderRadius: 8, marginTop: 6, objectFit: 'cover' }}
                onError={e => e.target.style.display = 'none'} />
            )}
          </div>

          {/* Course */}
          <div>
            <label style={lbl}>หลักสูตร (ว่าง = แสดงทุกหลักสูตร)</label>
            <div className="flex gap-2">
              <input className="themed-input" style={{ ...inp, flex: 1 }} placeholder="เช่น ป.โท รุ่น 1"
                value={form.course} onChange={e => setForm(p => ({ ...p, course: e.target.value }))} />
              {courses.length > 0 && (
                <select className="themed-input" style={{ ...inp, width: 'auto' }}
                  value={form.course} onChange={e => setForm(p => ({ ...p, course: e.target.value }))}>
                  <option value="">-- เลือก --</option>
                  {courses.map(c => <option key={c.courseId} value={c.name}>{c.name}</option>)}
                </select>
              )}
            </div>
          </div>

          {/* Sort Order */}
          <div>
            <label style={lbl}>ลำดับการแสดงผล</label>
            <input className="themed-input" style={{ ...inp, width: 100 }} type="number"
              value={form.sortOrder} onChange={e => setForm(p => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))} />
          </div>

          {/* Enabled */}
          <div className="flex items-center gap-3">
            <label className="toggle" style={{ flexShrink: 0 }}>
              <input type="checkbox" checked={form.isEnabled} onChange={e => setForm(p => ({ ...p, isEnabled: e.target.checked }))} />
              <span className="toggle-slider" />
            </label>
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
              {form.isEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
            </span>
          </div>

          {/* Save Button */}
          <button onClick={handleSave} disabled={saving}
            style={{
              padding: '14px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: 'var(--accent)', color: 'white', fontWeight: 800, fontSize: 15,
              opacity: saving ? 0.6 : 1,
            }}>
            {saving ? '⏳ กำลังบันทึก...' : editing === 'new' ? '➕ เพิ่มบทเรียน' : '💾 บันทึกการแก้ไข'}
          </button>
        </div>
      </div>
    );
  }

  // ── List View ──
  const filtered = lessons.filter(l =>
    !search.trim() || l.title.includes(search) || l.description.includes(search) || (l.course || '').includes(search)
  );

  return (
    <div className="animate-fade">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>
          📖 จัดการบทเรียน ({lessons.length})
        </div>
        <button onClick={startAdd}
          style={{
            padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'var(--accent)', color: 'white', fontWeight: 700, fontSize: 12,
          }}>
          ➕ เพิ่มบทเรียน
        </button>
      </div>

      {/* Search */}
      <input className="themed-input mb-3" style={inp} placeholder="ค้นหาบทเรียน..."
        value={search} onChange={e => setSearch(e.target.value)} />

      {loading ? (
        <div className="text-center py-8">
          <div className="spinner" style={{ margin: '0 auto 8px' }} />
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>กำลังโหลด...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
          {search ? 'ไม่พบบทเรียนที่ค้นหา' : 'ยังไม่มีบทเรียน — กด "เพิ่มบทเรียน" เพื่อเริ่มต้น'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((l, i) => (
            <div key={l.lessonId} style={{
              background: 'var(--input-bg)', borderRadius: 14, padding: '12px 14px',
              border: '1px solid var(--input-border)', opacity: l.isEnabled !== false ? 1 : 0.5,
            }}>
              <div className="flex items-start gap-3">
                {/* Number badge */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: `hsl(${(i * 47) % 360}, 70%, 93%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800, color: `hsl(${(i * 47) % 360}, 60%, 35%)`,
                }}>
                  {l.sortOrder || i + 1}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{l.title}</div>
                  {l.description && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {l.description.length > 60 ? l.description.slice(0, 60) + '...' : l.description}
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 4 }}>
                    {l.course && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#6366f1', background: '#eef2ff', padding: '1px 6px', borderRadius: 4 }}>
                        {l.course}
                      </span>
                    )}
                    {l.videoUrl && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#ef4444', background: '#fef2f2', padding: '1px 6px', borderRadius: 4 }}>
                        Video
                      </span>
                    )}
                    <span style={{ fontSize: 10, fontWeight: 600, color: l.isEnabled !== false ? '#16a34a' : '#9ca3af', background: l.isEnabled !== false ? '#f0fdf4' : '#f3f4f6', padding: '1px 6px', borderRadius: 4 }}>
                      {l.isEnabled !== false ? 'เปิด' : 'ปิด'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => handleToggle(l)} title={l.isEnabled !== false ? 'ปิด' : 'เปิด'}
                    style={btnIcon}>{l.isEnabled !== false ? '🔴' : '🟢'}</button>
                  <button onClick={() => startEdit(l)} title="แก้ไข" style={btnIcon}>✏️</button>
                  <button onClick={() => handleDelete(l)} title="ลบ" style={btnIcon}>🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const lbl = { fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, display: 'block' };
const inp = { width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13 };
const btnIcon = { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, padding: '4px' };
