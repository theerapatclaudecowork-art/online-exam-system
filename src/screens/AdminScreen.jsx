import { useState, useEffect, useRef, Component } from 'react';
import MessageInboxScreen from './MessageInboxScreen';
import GeminiQuizGenerator from '../components/GeminiQuizGenerator';
import SubjectManager from '../components/SubjectManager';
import LessonManager from '../components/LessonManager';
import Swal from 'sweetalert2';
import { useApp } from '../context/AppContext';
import { apiGet, apiPost, apiGetCached, lsInvalidate } from '../utils/api';
import { useVisibleInterval } from '../utils/useVisibleInterval';
import Spinner from '../components/Spinner';
import StatsCharts from '../components/charts/StatsCharts';
import { FALLBACK_AVATAR } from '../config';
import Paginator from '../components/Paginator';

class AdminErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 16 }}>
          <div style={{ color: '#b91c1c', fontWeight: 700, marginBottom: 8 }}>❌ เกิดข้อผิดพลาด</div>
          <pre style={{ fontSize: 11, color: '#7f1d1d', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {String(this.state.error)}
          </pre>
          <button onClick={() => this.setState({ error: null })}
            style={{ marginTop: 12, padding: '6px 16px', background: '#ef4444', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
            ลองใหม่
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── RichMenuPicker: dropdown เลือก Rich Menu ──
function RichMenuPicker({ menus, value, onChange, placeholder = '— เลือก Rich Menu —' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = menus.find(m => m.richMenuId === value);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* trigger */}
      <button type="button"
        className="themed-input w-full text-sm text-left flex items-center gap-2"
        style={{ cursor: 'pointer' }}
        onClick={() => setOpen(o => !o)}>
        {selected
          ? <><span className="flex-1 truncate">{selected.name} · {selected.chatBarText}</span><span className="text-xs opacity-50">▾</span></>
          : <><span className="flex-1 opacity-50">{placeholder}</span><span className="text-xs opacity-50">▾</span></>}
      </button>

      {/* dropdown */}
      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl overflow-hidden"
          style={{ background: '#ffffff', border: '1.5px solid #d1d5db', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', maxHeight: '400px', overflowY: 'auto' }}>

          {/* ตัวเลือก "ไม่กำหนด" */}
          <div className="px-3 py-2.5 text-sm cursor-pointer"
            style={{ color: '#6b7280', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={e => e.currentTarget.style.background = '#f9fafb'}
            onClick={() => { onChange(''); setOpen(false); }}>
            — ไม่กำหนด / ใช้ Default —
          </div>

          {menus.map(m => (
            <div key={m.richMenuId}
              className="px-3 py-2.5 cursor-pointer"
              style={{ background: value === m.richMenuId ? '#eff6ff' : '#ffffff', borderBottom: '1px solid #e5e7eb', transition: 'background .15s' }}
              onMouseEnter={e => { if (value !== m.richMenuId) e.currentTarget.style.background = '#f9fafb'; }}
              onMouseLeave={e => { if (value !== m.richMenuId) e.currentTarget.style.background = '#ffffff'; }}
              onClick={() => { onChange(m.richMenuId); setOpen(false); }}>
              <div className="text-sm font-semibold truncate" style={{ color: '#111827' }}>
                {value === m.richMenuId && <span style={{ color: '#16a34a', marginRight: 4 }}>✓</span>}
                {m.name}
              </div>
              <div className="flex gap-3 mt-0.5">
                <span className="text-xs" style={{ color: '#6b7280' }}>💬 {m.chatBarText}</span>
                <span className="text-xs" style={{ color: '#6b7280' }}>🔲 {m.areaCount} ปุ่ม</span>
                {m.size && <span className="text-xs" style={{ color: '#9ca3af' }}>{m.size.width}×{m.size.height}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════
//  CourseManager — จัดการหลักสูตร
// ════════════════════════════════════════════════
function CourseManager({ callerUserId }) {
  const [courses, setCourses]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [newName, setNewName]   = useState('');
  const [adding,  setAdding]    = useState(false);
  const [editId,  setEditId]    = useState(null);
  const [editName, setEditName] = useState('');
  const [saving,  setSaving]    = useState(false);

  async function load() {
    setLoading(true);
    try {
      const d = await apiGet('getCourses', { userId: callerUserId });
      if (d.success) setCourses(d.courses || []);
    } catch (_) {}
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const d = await apiPost({ action: 'addCourse', callerUserId, name: newName.trim() });
      if (!d.success) throw new Error(d.message);
      setNewName('');
      await load();
    } catch (e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error'); }
    finally { setAdding(false); }
  }

  async function handleSaveEdit(courseId) {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const d = await apiPost({ action: 'updateCourse', callerUserId, courseId, name: editName.trim() });
      if (!d.success) throw new Error(d.message);
      setEditId(null);
      await load();
    } catch (e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error'); }
    finally { setSaving(false); }
  }

  async function handleToggle(courseId) {
    try {
      const d = await apiPost({ action: 'toggleCourse', callerUserId, courseId });
      if (!d.success) throw new Error(d.message);
      await load();
    } catch (e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error'); }
  }

  async function handleDelete(courseId, name) {
    const r = await Swal.fire({
      title: 'ลบหลักสูตร?',
      html: `<b>${name}</b><br><small style="color:#888">ข้อมูลสมาชิกที่ลงทะเบียนหลักสูตรนี้จะยังคงอยู่</small>`,
      icon: 'warning', showCancelButton: true,
      confirmButtonText: 'ลบ', confirmButtonColor: '#ef4444',
      cancelButtonText: 'ยกเลิก',
    });
    if (!r.isConfirmed) return;
    try {
      const d = await apiPost({ action: 'deleteCourse', callerUserId, courseId });
      if (!d.success) throw new Error(d.message);
      await load();
    } catch (e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error'); }
  }

  return (
    <div className="animate-fade space-y-4">
      <div className="quiz-card no-hover rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-base" style={{ color: 'var(--text)' }}>📚 จัดการหลักสูตร</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>หลักสูตรจะแสดงในหน้าสมัครสมาชิก</p>
          </div>
          <button onClick={load} className="btn btn-gray text-xs rounded-xl px-3 py-1.5">🔄</button>
        </div>

        {/* Add new */}
        <div className="flex gap-2 mb-4">
          <input
            className="themed-input flex-1"
            placeholder="ชื่อหลักสูตรใหม่..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            maxLength={100}
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            className="btn btn-primary rounded-xl px-4 text-sm flex-shrink-0"
            style={{ opacity: adding || !newName.trim() ? .5 : 1 }}>
            {adding ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '+ เพิ่ม'}
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-8"><div className="spinner" style={{ width: 32, height: 32 }} /></div>
        ) : courses.length === 0 ? (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>ยังไม่มีหลักสูตร</div>
        ) : (
          <div className="space-y-2">
            {courses.map((c, idx) => (
              <div key={c.courseId}
                className="flex items-center gap-3 p-3 rounded-xl animate-slide-left"
                style={{ background: 'var(--input-bg)', border: '1.5px solid var(--input-border)', animationDelay: `${idx * 0.04}s` }}>

                {/* สถานะเปิด/ปิด dot */}
                <span className={`status-dot flex-shrink-0 ${c.isOpen ? 'green' : 'gray'}`} />

                {/* ชื่อ / edit */}
                {editId === c.courseId ? (
                  <input
                    className="themed-input flex-1 text-sm py-1"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(c.courseId); if (e.key === 'Escape') setEditId(null); }}
                    autoFocus
                    maxLength={100}
                  />
                ) : (
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{c.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {c.isOpen ? '🟢 เปิดรับสมัคร' : '🔴 ปิดรับสมัคร'}
                    </div>
                  </div>
                )}

                {/* actions */}
                <div className="flex gap-1.5 flex-shrink-0">
                  {editId === c.courseId ? (
                    <>
                      <button onClick={() => handleSaveEdit(c.courseId)} disabled={saving}
                        className="btn btn-green text-xs rounded-lg px-2 py-1">
                        {saving ? '...' : '✓'}
                      </button>
                      <button onClick={() => setEditId(null)}
                        className="btn btn-gray text-xs rounded-lg px-2 py-1">✕</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditId(c.courseId); setEditName(c.name); }}
                        className="btn btn-gray text-xs rounded-lg px-2 py-1" title="แก้ไขชื่อ">✏️</button>
                      <button onClick={() => handleToggle(c.courseId)}
                        className={`btn text-xs rounded-lg px-2 py-1 ${c.isOpen ? 'btn-yellow' : 'btn-green'}`}
                        title={c.isOpen ? 'ปิดรับสมัคร' : 'เปิดรับสมัคร'}>
                        {c.isOpen ? '🔴 ปิด' : '🟢 เปิด'}
                      </button>
                      <button onClick={() => handleDelete(c.courseId, c.name)}
                        className="btn btn-red text-xs rounded-lg px-2 py-1" title="ลบ">🗑</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// แปลง ISO / date string → วันเวลาภาษาไทย
function toThaiDateTime(val) {
  if (!val) return '';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val; // ถ้าแปลงไม่ได้ คืนค่าเดิม
    return d.toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      year:   'numeric',
      month:  'long',
      day:    'numeric',
      hour:   '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch (_) { return val; }
}

const STATUS_LABEL = {
  active:   { label: 'ใช้งาน',    bg: '#dcfce7', color: '#15803d' },
  pending:  { label: 'รออนุมัติ', bg: '#fef9c3', color: '#854d0e' },
  inactive: { label: 'ระงับ',     bg: '#fee2e2', color: '#b91c1c' },
};

const LINE_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#06C755" className="flex-shrink-0">
    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
  </svg>
);

// ─────────────────────────────────────────────────────────────
//  MemberDetailModal
// ─────────────────────────────────────────────────────────────
function MemberDetailModal({ member, callerUserId, lastSyncTime, onClose, onUpdated, onDeleted }) {
  const [detail, setDetail]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [editMode, setEditMode]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [richMenu, setRichMenu]     = useState(null);
  const [rmLoading, setRmLoading]   = useState(false);
  const [richMenuList, setRichMenuList] = useState([]);
  const [rmAssigning, setRmAssigning]   = useState(false);
  const [form, setForm]       = useState({
    fullName:   member.fullName   || '',
    email:      member.email      || '',
    phone:      member.phone      || '',
    studentId:  member.studentId  || '',
    department: member.department || '',
    status:     member.status     || 'pending',
    role:       member.role       || '',
  });

  const isSelf = callerUserId === member.lineUserId;

  useEffect(() => {
    loadDetail();
    loadRichMenu();
    // eslint-disable-next-line
  }, []);

  async function loadRichMenu() {
    setRmLoading(true);
    try {
      const [rmData, listData] = await Promise.all([
        apiGet('getUserRichMenu', { userId: member.lineUserId, callerUserId }),
        apiGetCached('getRichMenuList', { userId: callerUserId }, 5 * 60_000),
      ]);
      if (rmData.success)   setRichMenu(rmData);
      if (listData.success) setRichMenuList(listData.richMenus || []);
    } catch (_) {}
    finally { setRmLoading(false); }
  }

  async function handleLinkRichMenu(richMenuId) {
    setRmAssigning(true);
    try {
      const data = await apiPost({ action: 'linkRichMenu', callerUserId, targetUserId: member.lineUserId, richMenuId });
      if (!data.success) throw new Error(data.message);
      await loadRichMenu();
      Swal.fire({ icon: 'success', title: 'กำหนด Rich Menu แล้ว', timer: 1500, showConfirmButton: false });
    } catch (e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error'); }
    finally { setRmAssigning(false); }
  }

  async function handleUnlinkRichMenu() {
    const r = await Swal.fire({ title: 'ยกเลิก Rich Menu?', text: 'user จะกลับไปใช้ Default Rich Menu', icon: 'warning', showCancelButton: true, confirmButtonText: 'ยกเลิก Rich Menu', confirmButtonColor: '#ef4444', cancelButtonText: 'ไม่' });
    if (!r.isConfirmed) return;
    setRmAssigning(true);
    try {
      const data = await apiPost({ action: 'unlinkRichMenu', callerUserId, targetUserId: member.lineUserId });
      if (!data.success) throw new Error(data.message);
      await loadRichMenu();
      Swal.fire({ icon: 'success', title: 'ยกเลิก Rich Menu แล้ว', timer: 1500, showConfirmButton: false });
    } catch (e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error'); }
    finally { setRmAssigning(false); }
  }

  async function loadDetail() {
    setLoading(true);
    try {
      const data = await apiPost({ action: 'getMemberDetail', callerUserId, targetUserId: member.lineUserId });
      if (data.success) {
        setDetail(data);
        setForm({
          fullName:   data.member.fullName   || '',
          email:      data.member.email      || '',
          phone:      data.member.phone      || '',
          studentId:  data.member.studentId  || '',
          department: data.member.department || '',
          status:     data.member.status     || 'pending',
          role:       data.member.role       || '',
        });
      }
    } catch (_) {}
    finally { setLoading(false); }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const data = await apiPost({
        action: 'updateMember',
        callerUserId,
        targetUserId: member.lineUserId,
        ...form,
      });
      if (!data.success) throw new Error(data.message);
      setEditMode(false);
      onUpdated({ ...member, ...form });
      Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ!', timer: 1500, showConfirmButton: false });
    } catch (e) {
      Swal.fire('เกิดข้อผิดพลาด', e.message, 'error');
    } finally { setSaving(false); }
  }

  async function handleQuickStatus(newStatus) {
    const labels = { active: 'อนุมัติ', inactive: 'ระงับ', pending: 'ตั้งเป็นรออนุมัติ' };
    const r = await Swal.fire({ title: `${labels[newStatus]}ผู้ใช้นี้?`, icon: 'question', showCancelButton: true, confirmButtonText: 'ยืนยัน', cancelButtonText: 'ยกเลิก' });
    if (!r.isConfirmed) return;
    try {
      const data = await apiPost({ action: 'updateMember', callerUserId, targetUserId: member.lineUserId, newStatus });
      if (!data.success) throw new Error(data.message);
      setForm(p => ({ ...p, status: newStatus }));
      onUpdated({ ...member, ...form, status: newStatus });
      Swal.fire({ icon: 'success', title: 'อัปเดตสำเร็จ!', timer: 1500, showConfirmButton: false });
    } catch (e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error'); }
  }

  async function handleDelete() {
    const r = await Swal.fire({
      title: 'ลบสมาชิก?',
      html: `<b>${member.fullName || member.displayName}</b><br><small style="color:#888">ประวัติและผลสอบทั้งหมดจะยังคงอยู่</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบเลย',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
    });
    if (!r.isConfirmed) return;
    try {
      const data = await apiPost({ action: 'deleteMember', callerUserId, targetUserId: member.lineUserId });
      if (!data.success) throw new Error(data.message);
      onDeleted(member.lineUserId);
      onClose();
    } catch (e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error'); }
  }

  const m      = detail?.member || member;
  const pic    = m.pictureUrl || '';
  const st     = STATUS_LABEL[form.status] || STATUS_LABEL.inactive;
  const exams  = detail?.exams || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl"
        style={{ background: 'var(--card)', boxShadow: '0 -4px 32px rgba(0,0,0,.25)' }}
      >
        {/* ── Modal Header ─────────────────────── */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 rounded-t-3xl sm:rounded-t-2xl"
          style={{ background: 'var(--card)', borderBottom: '1px solid var(--input-border)' }}>
          <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>👤 ข้อมูลสมาชิก</span>
          <div className="flex items-center gap-2">
            {!editMode
              ? <button onClick={() => setEditMode(true)}
                  className="btn text-xs rounded-lg px-3 py-1.5"
                  style={{ background: 'var(--accent)', color: 'white' }}>✏️ แก้ไข</button>
              : <>
                  <button onClick={() => { setEditMode(false); setForm({ fullName: m.fullName||'', email: m.email||'', phone: m.phone||'', studentId: m.studentId||'', status: m.status||'pending', role: m.role||'' }); }}
                    className="btn btn-gray text-xs rounded-lg px-3 py-1.5">ยกเลิก</button>
                  <button onClick={handleSave} disabled={saving}
                    className="btn text-xs rounded-lg px-3 py-1.5"
                    style={{ background: '#16a34a', color: 'white', opacity: saving ? .6 : 1 }}>
                    {saving ? '⏳ บันทึก...' : '💾 บันทึก'}
                  </button>
                </>
            }
            <button onClick={onClose} className="btn btn-gray text-xs rounded-lg px-2.5 py-1.5">✕</button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {loading
            ? <Spinner label="กำลังโหลดข้อมูล..." />
            : <>

              {/* ── Profile Hero ─────────────────── */}
              <div className="flex flex-col items-center gap-3 py-4 rounded-2xl"
                style={{ background: 'var(--input-bg)' }}>
                {/* รูปโปรไฟล์ */}
                <div className="relative">
                  {pic
                    ? <img src={pic} alt="avatar" className="w-24 h-24 rounded-full object-cover shadow-lg"
                        onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                    : null}
                  <div className="w-24 h-24 rounded-full items-center justify-center text-4xl shadow-lg"
                    style={{ background: 'var(--card)', display: pic ? 'none' : 'flex' }}>👤</div>
                  {/* LINE dot */}
                  <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center"
                    style={{ background: m.lineFound ? '#06C755' : '#94a3b8' }}
                    title={m.lineFound ? 'มีข้อมูล LINE' : 'ไม่พบ LINE'}>
                    {m.lineFound && <span style={{ color: 'white', fontSize: 9, fontWeight: 700 }}>L</span>}
                  </span>
                </div>

                {/* ชื่อ + status */}
                <div className="text-center">
                  <div className="font-bold text-base" style={{ color: 'var(--text)' }}>
                    {m.fullName || m.displayName}
                  </div>
                  {m.lineDisplayName && m.lineDisplayName !== m.fullName && (
                    <div className="flex items-center justify-center gap-1 text-xs mt-0.5">
                      {LINE_ICON}
                      <span style={{ color: '#06C755', fontWeight: 600 }}>{m.lineDisplayName}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                    <span className="text-xs px-3 py-1 rounded-full font-semibold"
                      style={{ background: st.bg, color: st.color }}>{st.label}</span>
                    {form.role === 'admin' && (
                      <span className="text-xs px-3 py-1 rounded-full font-semibold"
                        style={{ background: '#fef9c3', color: '#854d0e' }}>👑 Admin</span>
                    )}
                    {form.role === 'teacher' && (
                      <span className="text-xs px-3 py-1 rounded-full font-semibold"
                        style={{ background: '#ede9fe', color: '#7c3aed' }}>🎓 ครูผู้สอน</span>
                    )}
                  </div>
                </div>

                {/* Exam summary */}
                {detail && (
                  <div className="flex gap-4 text-center">
                    <div><div className="font-black text-lg" style={{ color: 'var(--accent)' }}>{detail.totalExams}</div><div className="text-xs" style={{ color: 'var(--text-muted)' }}>ครั้งที่สอบ</div></div>
                    <div><div className="font-black text-lg" style={{ color: '#16a34a' }}>{detail.passCount}</div><div className="text-xs" style={{ color: 'var(--text-muted)' }}>ครั้งที่ผ่าน</div></div>
                    <div><div className="font-black text-lg" style={{ color: detail.passRate >= 60 ? '#16a34a' : '#ef4444' }}>{detail.passRate}%</div><div className="text-xs" style={{ color: 'var(--text-muted)' }}>อัตราผ่าน</div></div>
                  </div>
                )}
              </div>

              {/* ── Quick Actions (ถ้าไม่ใช่ตัวเอง + ไม่ใช่ admin) ── */}
              {!isSelf && form.role !== 'admin' && !editMode && (
                <div className="flex gap-2 flex-wrap">
                  {form.status !== 'active' && (
                    <button className="btn flex-1 text-sm rounded-xl py-2.5"
                      style={{ background: '#dcfce7', color: '#15803d' }}
                      onClick={() => handleQuickStatus('active')}>✅ อนุมัติสมาชิก</button>
                  )}
                  {form.status === 'active' && (
                    <button className="btn flex-1 text-sm rounded-xl py-2.5"
                      style={{ background: '#fee2e2', color: '#b91c1c' }}
                      onClick={() => handleQuickStatus('inactive')}>🚫 ระงับการใช้งาน</button>
                  )}
                  {form.status === 'inactive' && (
                    <button className="btn flex-1 text-sm rounded-xl py-2.5"
                      style={{ background: '#fef9c3', color: '#854d0e' }}
                      onClick={() => handleQuickStatus('pending')}>⏳ ตั้งเป็นรออนุมัติ</button>
                  )}
                </div>
              )}

              {/* ── Edit Form ─────────────────────── */}
              {editMode && (
                <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--input-bg)', border: '1.5px solid var(--accent)' }}>
                  <div className="text-xs font-bold mb-1" style={{ color: 'var(--accent)' }}>✏️ แก้ไขข้อมูล</div>

                  <label className="block">
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>ชื่อ-นามสกุล</span>
                    <input className="themed-input w-full mt-1" value={form.fullName}
                      onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} placeholder="ชื่อ-นามสกุล" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>อีเมล</span>
                    <input className="themed-input w-full mt-1" type="email" value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="อีเมล" />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>เบอร์โทร</span>
                      <input className="themed-input w-full mt-1" value={form.phone}
                        onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="เบอร์โทร" />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>รหัสสมาชิก/พนักงาน</span>
                      <input className="themed-input w-full mt-1" value={form.studentId}
                        onChange={e => setForm(p => ({ ...p, studentId: e.target.value }))} placeholder="รหัส" />
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>หน่วยงาน</span>
                    <input className="themed-input w-full mt-1" value={form.department}
                      onChange={e => setForm(p => ({ ...p, department: e.target.value }))} placeholder="หน่วยงาน" maxLength={100} />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>สถานะ</span>
                      <select className="themed-input w-full mt-1"
                        value={form.status}
                        onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                        <option value="active">ใช้งาน</option>
                        <option value="pending">รออนุมัติ</option>
                        <option value="inactive">ระงับ</option>
                      </select>
                    </label>
                    {!isSelf && (
                      <label className="block">
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>สิทธิ์ (Role)</span>
                        <select className="themed-input w-full mt-1"
                          value={form.role}
                          onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                          <option value="">สมาชิกทั่วไป</option>
                          <option value="teacher">🎓 ครูผู้สอน</option>
                          <option value="admin">👑 Admin</option>
                        </select>
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* ── ข้อมูลการลงทะเบียน (view mode) ─── */}
              {!editMode && (
                <div className="rounded-2xl p-4" style={{ background: 'var(--input-bg)' }}>
                  <div className="text-xs font-bold mb-3" style={{ color: 'var(--text-muted)' }}>📋 ข้อมูลการลงทะเบียน</div>
                  <div className="space-y-2">
                    {[
                      { label: 'ชื่อ-นามสกุล', val: m.fullName || '—' },
                      { label: 'อีเมล',         val: m.email    || '—' },
                      { label: 'รหัสสมาชิก',   val: m.studentId  || '—' },
                      { label: 'หน่วยงาน',      val: m.department || '—' },
                      { label: 'วันที่สมัคร',    val: m.joinDate   || '—' },
                    ].map(({ label, val }) => (
                      <div key={label} className="flex justify-between gap-2">
                        <span className="text-xs" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
                        <span className="text-xs font-medium text-right truncate" style={{ color: 'var(--text)' }}>{val}</span>
                      </div>
                    ))}
                    {/* เบอร์โทร — กดโทรออกได้ */}
                    <div className="flex justify-between gap-2 items-center">
                      <span className="text-xs" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>เบอร์โทร</span>
                      {m.phone
                        ? <a href={`tel:${m.phone}`}
                            className="text-xs font-semibold flex items-center gap-1 rounded-full px-2.5 py-0.5 transition-all active:scale-95"
                            style={{ color: '#fff', background: '#16a34a', textDecoration: 'none' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>
                            {m.phone}
                          </a>
                        : <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>—</span>
                      }
                    </div>
                  </div>
                </div>
              )}

              {/* ── Rich Menu ────────────────────── */}
              <div className="rounded-2xl p-4" style={{ background: 'var(--input-bg)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>🎛 Rich Menu</span>
                  {rmLoading && <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin ml-1" style={{ color: 'var(--text-muted)' }} />}
                  {richMenu && (
                    richMenu.linked
                      ? <span className="text-xs px-2 py-0.5 rounded-full ml-auto" style={{ background: '#e0f2fe', color: '#0369a1' }}>✅ กำหนดเฉพาะ user</span>
                      : <span className="text-xs px-2 py-0.5 rounded-full ml-auto" style={{ background: '#f3f4f6', color: '#6b7280' }}>ใช้ Default / ไม่มี</span>
                  )}
                </div>
                {richMenu?.linked && (
                  <div className="space-y-2">
                    <div className="flex justify-between gap-2">
                      <span className="text-xs" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>Rich Menu ID</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-muted)', wordBreak: 'break-all', textAlign: 'right' }}>{richMenu.richMenuId}</span>
                    </div>
                    {richMenu.name && (
                      <div className="flex justify-between gap-2">
                        <span className="text-xs" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>ชื่อ</span>
                        <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{richMenu.name}</span>
                      </div>
                    )}
                    {richMenu.chatBarText && (
                      <div className="flex justify-between gap-2">
                        <span className="text-xs" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>Chat Bar</span>
                        <span className="text-xs" style={{ color: 'var(--text)' }}>{richMenu.chatBarText}</span>
                      </div>
                    )}
                    {richMenu.selected !== null && (
                      <div className="flex justify-between gap-2">
                        <span className="text-xs" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>แสดงอัตโนมัติ</span>
                        <span className="text-xs" style={{ color: 'var(--text)' }}>{richMenu.selected ? 'ใช่' : 'ไม่'}</span>
                      </div>
                    )}
                    {richMenu.size && (
                      <div className="flex justify-between gap-2">
                        <span className="text-xs" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>ขนาด</span>
                        <span className="text-xs" style={{ color: 'var(--text)' }}>{richMenu.size.width} × {richMenu.size.height}</span>
                      </div>
                    )}
                    {richMenu.areas?.length > 0 && (
                      <div>
                        <div className="text-xs mb-1.5 mt-2" style={{ color: 'var(--text-muted)' }}>ปุ่ม ({richMenu.areas.length} รายการ)</div>
                        <div className="flex flex-wrap gap-1.5">
                          {richMenu.areas.map((a, i) => (
                            <span key={i} className="text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--input-border)' }}>
                              {a.label || a.type}
                              {a.type && <span className="ml-1 opacity-50">({a.type})</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {richMenu && !richMenu.linked && (
                  <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{richMenu.message}</p>
                )}
                {/* เลือก / เปลี่ยน Rich Menu */}
                {richMenuList.length > 0 && (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--input-border)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>กำหนด Rich Menu ให้ user นี้</span>
                      {richMenu?.linked && (
                        <button className="btn btn-gray text-xs rounded-lg px-2 py-1" onClick={handleUnlinkRichMenu} disabled={rmAssigning}>🗑 ยกเลิก</button>
                      )}
                    </div>
                    <RichMenuPicker
                      menus={richMenuList}
                      value={richMenu?.linked ? richMenu.richMenuId : ''}
                      onChange={id => id && handleLinkRichMenu(id)}
                    />
                  </div>
                )}
              </div>

              {/* ── ประวัติสอบล่าสุด ──────────────── */}
              {exams.length > 0 && (
                <div className="rounded-2xl p-4" style={{ background: 'var(--input-bg)' }}>
                  <div className="text-xs font-bold mb-3" style={{ color: 'var(--text-muted)' }}>📊 ประวัติสอบล่าสุด ({exams.length} รายการ)</div>
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {exams.map((e, i) => {
                      const pct  = parseInt(e.pct);
                      const pass = e.pass === 'ผ่าน';
                      return (
                        <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded-xl"
                          style={{ background: 'var(--card)' }}>
                          <span className="text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0"
                            style={{ background: pass ? '#dcfce7' : '#fee2e2', color: pass ? '#15803d' : '#b91c1c' }}>
                            {pass ? '✅' : '❌'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>{e.lesson}</div>
                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{e.date}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-black" style={{ color: pass ? '#16a34a' : '#ef4444' }}>{pct}%</div>
                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{e.score}/{e.total}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Danger Zone ─────────────────────── */}
              {!isSelf && form.role !== 'admin' && (
                <div className="rounded-2xl p-4" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                  <div className="text-xs font-bold mb-2" style={{ color: '#b91c1c' }}>⚠️ Danger Zone</div>
                  <button className="btn w-full text-sm rounded-xl py-2.5"
                    style={{ background: '#ef4444', color: 'white' }}
                    onClick={handleDelete}>🗑 ลบสมาชิกออกจากระบบ</button>
                </div>
              )}

            </>
          }
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  AnnouncementsSection — แยก component เพื่อไม่ละเมิด Rules of Hooks
// ─────────────────────────────────────────────────────────────
function AnnouncementsSection({ callerUserId }) {
  const [anns,       setAnns]       = useState([]);
  const [annForm,    setAnnForm]    = useState({ title: '', body: '', type: 'info', pinned: false });
  const [annLoading, setAnnLoading] = useState(false);

  const reload = () => apiGet('getAnnouncements', {}).then(d => { if (d.success) setAnns(d.announcements || []); });

  useEffect(() => { reload(); }, []);

  const add = async () => {
    if (!annForm.title && !annForm.body) return;
    setAnnLoading(true);
    try {
      const d = await apiPost({ action: 'addAnnouncement', callerUserId, ...annForm });
      if (!d.success) throw new Error(d.message);
      setAnnForm({ title: '', body: '', type: 'info', pinned: false });
      reload();
    } catch (e) { Swal.fire('ข้อผิดพลาด', e.message, 'error'); }
    finally { setAnnLoading(false); }
  };

  const del = async (id) => {
    const r = await Swal.fire({ title: 'ลบประกาศ?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'ลบ' });
    if (!r.isConfirmed) return;
    const d = await apiPost({ action: 'deleteAnnouncement', callerUserId, id });
    if (d.success) reload();
  };

  const TYPE_LABEL = { info: 'ℹ️ ข้อมูล', warning: '⚠️ เตือน', success: '✅ ข่าวดี' };
  const TYPE_BG    = { info: '#eff6ff', warning: '#fffbeb', success: '#f0fdf4' };
  const TYPE_COLOR = { info: '#1d4ed8', warning: '#92400e', success: '#15803d' };

  return (
    <div className="quiz-card no-hover rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">📢</span>
        <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>ประกาศ / ข่าวสาร</span>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full"
          style={{ background: 'var(--input-bg)', color: 'var(--text-muted)' }}>{anns.length} รายการ</span>
      </div>
      {/* Form เพิ่มประกาศ */}
      <div className="space-y-2 mb-3 p-3 rounded-xl" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>
        <input className="themed-input w-full text-sm" placeholder="หัวข้อ (ไม่บังคับ)"
          value={annForm.title} onChange={e => setAnnForm(p => ({ ...p, title: e.target.value }))} />
        <textarea className="themed-input w-full text-sm" rows={2} placeholder="ข้อความประกาศ..."
          value={annForm.body} onChange={e => setAnnForm(p => ({ ...p, body: e.target.value }))}
          style={{ resize: 'none' }} />
        <div className="flex gap-2">
          <select className="themed-input flex-1 text-sm" value={annForm.type}
            onChange={e => setAnnForm(p => ({ ...p, type: e.target.value }))}>
            {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--text)' }}>
            <input type="checkbox" checked={annForm.pinned}
              onChange={e => setAnnForm(p => ({ ...p, pinned: e.target.checked }))} />
            📌 ปักหมุด
          </label>
          <button className="btn text-xs rounded-lg px-3 py-1.5"
            style={{ background: (!annForm.title && !annForm.body) || annLoading ? 'var(--input-bg)' : 'var(--accent)', color: (!annForm.title && !annForm.body) || annLoading ? 'var(--text-muted)' : 'white' }}
            disabled={(!annForm.title && !annForm.body) || annLoading}
            onClick={add}>
            {annLoading ? '⏳' : '➕ เพิ่ม'}
          </button>
        </div>
      </div>
      {/* รายการประกาศ */}
      {anns.length === 0 ? (
        <div className="text-center py-4 text-sm" style={{ color: 'var(--text-muted)' }}>ยังไม่มีประกาศ</div>
      ) : (
        <div className="space-y-2">
          {anns.map(a => (
            <div key={a.id} className="flex items-start gap-2 rounded-xl px-3 py-2.5"
              style={{ background: TYPE_BG[a.type] || '#eff6ff', border: '1px solid var(--input-border)' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {a.pinned && <span className="text-xs">📌</span>}
                  <span className="text-xs font-semibold truncate" style={{ color: TYPE_COLOR[a.type] || '#1d4ed8' }}>
                    {TYPE_LABEL[a.type]} {a.title && `— ${a.title}`}
                  </span>
                </div>
                {a.body && <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{a.body}</div>}
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', opacity: .6 }}>{a.createdAt}</div>
              </div>
              <button className="btn-gray btn text-xs rounded-lg px-2 py-1 flex-shrink-0"
                onClick={() => del(a.id)}>🗑</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ExamReminderSection — แยก component เพื่อไม่ละเมิด Rules of Hooks
// ─────────────────────────────────────────────────────────────
function ExamReminderSection({ callerUserId }) {
  const [remStatus, setRemStatus] = useState(null);
  const [remLoad,   setRemLoad]   = useState(false);

  useEffect(() => {
    apiGet('getReminderStatus', { userId: callerUserId })
      .then(d => { if (d.success) setRemStatus(d); })
      .catch(() => {});
  }, []);

  async function toggleReminder() {
    setRemLoad(true);
    try {
      const action = remStatus?.active ? 'removeReminderTrigger' : 'setupReminderTrigger';
      const d = await apiGet(action, { userId: callerUserId });
      if (d.success) setRemStatus(prev => ({ ...prev, active: !prev?.active, message: d.message }));
    } catch (e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error'); }
    finally { setRemLoad(false); }
  }

  return (
    <div className="quiz-card no-hover rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-bold text-sm" style={{ color: 'var(--text)' }}>⏰ แจ้งเตือนใกล้หมดเวลาสอบ</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>ส่ง LINE แจ้งเตือน 24 ชั่วโมงก่อน ExamSet ปิด</div>
        </div>
        <button
          className="btn text-xs rounded-lg px-3 py-1.5 font-semibold"
          style={{ background: remStatus?.active ? '#ef4444' : '#16a34a', color: 'white', opacity: remLoad ? .6 : 1 }}
          disabled={remLoad}
          onClick={toggleReminder}>
          {remLoad ? '...' : remStatus?.active ? '🔕 ปิด' : '🔔 เปิด'}
        </button>
      </div>
      <div className="text-xs px-3 py-2 rounded-xl mb-3"
        style={{ background: remStatus?.active ? '#f0fdf4' : '#fef2f2', color: remStatus?.active ? '#15803d' : '#b91c1c', border: `1px solid ${remStatus?.active ? '#bbf7d0' : '#fecaca'}` }}>
        {remStatus?.active ? '✅ เปิดใช้งาน — ตรวจทุก 6 ชั่วโมง' : '❌ ปิดอยู่'}
        {remStatus?.message && <span className="ml-2 opacity-75">({remStatus.message})</span>}
      </div>
      {remStatus?.logs?.length > 0 && (
        <div>
          <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>ประวัติการแจ้งเตือนล่าสุด</div>
          <div className="space-y-1">
            {remStatus.logs.map((l, i) => (
              <div key={i} className="text-xs flex gap-2" style={{ color: 'var(--text-muted)' }}>
                <span className="flex-shrink-0">{l.sentAt}</span>
                <span className="flex-1 truncate">{l.setName}</span>
                <span>{l.recipients}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  QStatsTab — ข้อสอบที่ตอบผิดบ่อย
// ─────────────────────────────────────────────────────────────
function QStatsTab({ callerUserId }) {
  const [stats,   setStats]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('all'); // all | hard | easy

  useEffect(() => {
    apiGet('getQuestionStats', { userId: callerUserId })
      .then(d => { if (d.success) setStats(d.stats || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="กำลังวิเคราะห์ข้อสอบ..." />;

  const filtered = stats
    .filter(s => !search || s.question.toLowerCase().includes(search.toLowerCase()) || s.subject.toLowerCase().includes(search.toLowerCase()))
    .filter(s => filter === 'all' ? true : filter === 'hard' ? s.passRate < 50 : s.passRate >= 80);

  const hard  = stats.filter(s => s.passRate < 50).length;
  const easy  = stats.filter(s => s.passRate >= 80).length;
  const total = stats.length;

  return (
    <div className="animate-fade space-y-4">
      {/* Summary */}
      <div className="quiz-card no-hover rounded-2xl p-4">
        <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--text)' }}>📉 สถิติข้อสอบ</h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { val: total, label: 'ข้อที่มีข้อมูล', color: 'var(--accent)' },
            { val: hard,  label: 'ข้อยาก (<50%)', color: '#ef4444' },
            { val: easy,  label: 'ข้อง่าย (≥80%)', color: '#16a34a' },
          ].map(s => (
            <div key={s.label} className="text-center rounded-xl py-3" style={{ background: 'var(--input-bg)' }}>
              <div className="text-xl font-black" style={{ color: s.color }}>{s.val}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter + Search */}
      <div className="quiz-card no-hover rounded-2xl p-3 space-y-2">
        <input className="themed-input w-full text-sm" placeholder="🔍 ค้นหาคำถาม / วิชา..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex gap-2">
          {[
            { val: 'all',  label: 'ทั้งหมด',       color: 'var(--accent)' },
            { val: 'hard', label: '🔴 ยาก (<50%)',  color: '#ef4444' },
            { val: 'easy', label: '🟢 ง่าย (≥80%)', color: '#16a34a' },
          ].map(opt => (
            <button key={opt.val}
              className="flex-1 text-xs rounded-lg py-1.5 font-semibold transition-all"
              style={{
                background: filter === opt.val ? opt.color : 'var(--input-bg)',
                color:      filter === opt.val ? 'white'    : 'var(--text-muted)',
                border:     `1px solid ${filter === opt.val ? 'transparent' : 'var(--input-border)'}`,
              }}
              onClick={() => setFilter(opt.val)}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="quiz-card no-hover rounded-2xl p-8 text-center" style={{ color: 'var(--text-muted)' }}>
            {stats.length === 0 ? 'ยังไม่มีข้อมูลผลสอบ' : 'ไม่พบข้อที่ตรงกัน'}
          </div>
        ) : filtered.map((s, i) => (
          <div key={i} className="quiz-card no-hover rounded-2xl p-3">
            <div className="flex items-start gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-bold"
                style={{
                  background: s.passRate < 50 ? '#fee2e2' : s.passRate >= 80 ? '#dcfce7' : '#fef9c3',
                  color:      s.passRate < 50 ? '#b91c1c' : s.passRate >= 80 ? '#15803d' : '#854d0e',
                }}>
                {s.passRate}%
              </span>
              <p className="text-xs flex-1" style={{ color: 'var(--text)', lineHeight: 1.6 }}>{s.question}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-full h-2 overflow-hidden" style={{ background: 'var(--progress-trk)' }}>
                <div style={{ width: `${s.passRate}%`, height: '100%', borderRadius: 999,
                  background: s.passRate < 50 ? '#ef4444' : s.passRate >= 80 ? '#22c55e' : '#f59e0b',
                  transition: 'width .5s' }} />
              </div>
              <div className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                ถูก {s.correct}/{s.total} • {s.subject || 'ไม่ระบุ'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  DeptTab — แยก component เพื่อไม่ละเมิด Rules of Hooks
// ─────────────────────────────────────────────────────────────
function DeptTab({ callerUserId }) {
  const [deptData, setDeptData] = useState(null);
  const [deptLoad, setDeptLoad] = useState(true);
  const [editId,   setEditId]   = useState(null);
  const [editDept, setEditDept] = useState('');
  const [saving,   setSaving]   = useState(false);
  const [openDept, setOpenDept] = useState(null); // accordion: ชื่อ dept ที่เปิดอยู่
  const [search,   setSearch]   = useState('');

  useEffect(() => {
    apiGet('getDepartments', { userId: callerUserId })
      .then(d => { if (d.success) setDeptData(d); })
      .catch(() => {})
      .finally(() => setDeptLoad(false));
  }, []);

  async function saveDept(lineUserId) {
    setSaving(lineUserId);
    try {
      const res = await apiPost({ action: 'updateUserDept', callerUserId, lineUserId, department: editDept });
      if (!res.success) throw new Error(res.message);
      setDeptData(prev => {
        const newMembers = prev.members.map(m => m.lineUserId === lineUserId ? { ...m, department: editDept } : m);
        const map = {};
        newMembers.forEach(m => { if (m.department) map[m.department] = (map[m.department] || 0) + 1; });
        return {
          ...prev,
          members: newMembers,
          departments: Object.keys(map).map(n => ({ name: n, count: map[n] })).sort((a, b) => b.count - a.count),
        };
      });
      setEditId(null);
    } catch (e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error'); }
    finally { setSaving(false); }
  }

  if (deptLoad) return <Spinner label="กำลังโหลด..." />;

  const allMembers = deptData?.members || [];
  // เรียง dept มากไปน้อย
  const depts = (deptData?.departments || []).slice().sort((a, b) => b.count - a.count);
  const noDept = allMembers.filter(m => !m.department);

  // search กรอง
  const searchLow = search.trim().toLowerCase();
  function matchSearch(m) {
    if (!searchLow) return true;
    return (m.fullName + m.displayName + (m.department || '') + (m.studentId || '')).toLowerCase().includes(searchLow);
  }

  // สร้าง grouped list: [ { name, count, members[] }, ... ]  + กลุ่มไม่ระบุ
  const grouped = depts.map(d => ({
    name:    d.name,
    count:   d.count,
    members: allMembers.filter(m => m.department === d.name && matchSearch(m)),
  })).filter(g => !searchLow || g.members.length > 0);

  if (!searchLow && noDept.length > 0) {
    grouped.push({ name: '— ไม่ระบุหน่วยงาน —', count: noDept.length, members: noDept });
  } else if (searchLow) {
    const noMatch = noDept.filter(matchSearch);
    if (noMatch.length > 0) grouped.push({ name: '— ไม่ระบุหน่วยงาน —', count: noMatch.length, members: noMatch });
  }

  const totalMembers = allMembers.length;

  return (
    <div className="animate-fade space-y-3">

      {/* Header summary */}
      <div className="quiz-card no-hover rounded-2xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="font-bold text-base" style={{ color: 'var(--text)' }}>🏢 หน่วยงาน</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {depts.length} หน่วยงาน • {totalMembers} สมาชิก
            </div>
          </div>
          <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5"
            onClick={() => {
              setDeptLoad(true);
              apiGet('getDepartments', { userId: callerUserId })
                .then(d => { if (d.success) setDeptData(d); })
                .catch(() => {}).finally(() => setDeptLoad(false));
            }}>🔄 รีเฟรช</button>
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <input className="themed-input w-full pr-8" placeholder="🔍 ค้นหาชื่อ / หน่วยงาน..."
            value={search} onChange={e => { setSearch(e.target.value); setOpenDept(null); }} />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-50 hover:opacity-100">✕</button>
          )}
        </div>

        {/* Top-3 summary chips */}
        {!searchLow && depts.length > 0 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {depts.slice(0, 5).map((d, i) => {
              const colors = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444'];
              return (
                <button key={d.name}
                  className="flex-shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-all"
                  style={{
                    background: openDept === d.name ? colors[i % colors.length] : 'var(--input-bg)',
                    border: `1.5px solid ${openDept === d.name ? colors[i % colors.length] : 'var(--input-border)'}`,
                    color: openDept === d.name ? 'white' : 'var(--text)',
                  }}
                  onClick={() => setOpenDept(prev => prev === d.name ? null : d.name)}>
                  <span className="text-sm font-black">{d.count}</span>
                  <span className="text-xs max-w-[80px] truncate">{d.name}</span>
                </button>
              );
            })}
            {depts.length > 5 && (
              <span className="flex-shrink-0 flex items-center text-xs px-3 py-1.5 rounded-xl"
                style={{ background: 'var(--input-bg)', color: 'var(--text-muted)' }}>
                +{depts.length - 5} อื่นๆ
              </span>
            )}
          </div>
        )}
      </div>

      {/* Accordion list */}
      {grouped.length === 0 ? (
        <div className="quiz-card no-hover rounded-2xl p-10 text-center" style={{ color: 'var(--text-muted)' }}>
          {searchLow ? 'ไม่พบสมาชิกที่ค้นหา' : 'ไม่มีข้อมูลหน่วยงาน'}
        </div>
      ) : (
        <div className="space-y-2">
          {grouped.map((g, gi) => {
            const isOpen = openDept === g.name || !!searchLow;
            const colors = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];
            const accent = g.name === '— ไม่ระบุหน่วยงาน —' ? '#94a3b8' : colors[gi % colors.length];
            return (
              <div key={g.name} className="quiz-card no-hover rounded-2xl overflow-hidden">

                {/* Dropdown header — กดเพื่อเปิด/ปิด */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 transition-all text-left"
                  style={{ background: isOpen ? 'var(--input-bg)' : 'transparent', borderBottom: isOpen ? '1px solid var(--input-border)' : 'none' }}
                  onClick={() => !searchLow && setOpenDept(prev => prev === g.name ? null : g.name)}>

                  {/* Count bubble */}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-black text-sm"
                    style={{ background: accent + '22', color: accent }}>
                    {g.count}
                  </div>

                  {/* Name + bar */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>{g.name}</div>
                    <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--card-border)' }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${Math.round((g.count / Math.max(grouped[0].count, 1)) * 100)}%`, background: accent }} />
                    </div>
                  </div>

                  {/* Percent + chevron */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-bold" style={{ color: accent }}>
                      {Math.round((g.count / totalMembers) * 100)}%
                    </span>
                    {!searchLow && (
                      <span className="text-base transition-transform" style={{
                        color: 'var(--text-muted)',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        display: 'inline-block',
                      }}>▾</span>
                    )}
                  </div>
                </button>

                {/* Member list (expanded) */}
                {isOpen && (
                  <div className="divide-y" style={{ borderColor: 'var(--input-border)' }}>
                    {g.members.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                        ไม่พบสมาชิก
                      </div>
                    ) : g.members.map(m => (
                      <div key={m.lineUserId} className="px-4 py-2.5 flex items-center gap-3">
                        {/* Avatar */}
                        {m.pictureUrl
                          ? <img src={m.pictureUrl} loading="lazy" decoding="async" className="w-9 h-9 rounded-full object-cover flex-shrink-0" alt=""
                              onError={e => { e.target.style.display='none'; }} />
                          : <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-lg"
                              style={{ background: 'var(--input-bg)' }}>👤</div>}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                            {m.fullName || m.displayName}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {m.studentId && `#${m.studentId} • `}{m.email || ''}
                          </div>
                        </div>

                        {/* Edit dept */}
                        {editId === m.lineUserId ? (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <input list="dept-list-acc" className="themed-input text-xs" style={{ width: 120 }}
                              placeholder="ชื่อหน่วยงาน..."
                              value={editDept} onChange={e => setEditDept(e.target.value)} />
                            <datalist id="dept-list-acc">
                              {depts.map(d => <option key={d.name} value={d.name} />)}
                            </datalist>
                            <button className="btn btn-primary text-xs rounded-lg px-2 py-1"
                              disabled={saving === m.lineUserId} onClick={() => saveDept(m.lineUserId)}>
                              {saving === m.lineUserId ? '⏳' : '💾'}
                            </button>
                            <button className="btn btn-gray text-xs rounded-lg px-2 py-1"
                              onClick={() => setEditId(null)}>✕</button>
                          </div>
                        ) : (
                          <button className="btn btn-gray text-xs rounded-lg px-2 py-1 flex-shrink-0"
                            onClick={() => { setEditId(m.lineUserId); setEditDept(m.department || ''); }}>
                            ✏️
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  #7 DeptResultsTab — ผลสอบรายหน่วยงาน
// ════════════════════════════════════════════════════════════
function DeptResultsTab({ callerUserId }) {
  const [depts, setDepts]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy]   = useState('attempts'); // attempts | passRate | avgScore

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await apiGet('getResultsByDept', { userId: callerUserId });
        if (data.success) setDepts(data.depts || []);
      } catch (_) {}
      finally { setLoading(false); }
    })();
  }, [callerUserId]);

  if (loading) return <Spinner label="กำลังโหลดข้อมูลหน่วยงาน..." />;

  const sorted = [...depts].sort((a, b) => {
    if (sortBy === 'passRate') return b.passRate - a.passRate;
    if (sortBy === 'avgScore') return b.avgScore - a.avgScore;
    return b.attempts - a.attempts;
  });

  return (
    <div className="animate-fade space-y-3">
      <div className="quiz-card no-hover rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏢</span>
            <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>
              ผลสอบรายหน่วยงาน ({depts.length} หน่วยงาน)
            </span>
          </div>
          <button className="btn btn-gray text-xs rounded-lg px-2 py-1" onClick={() => {
            setLoading(true);
            apiGet('getResultsByDept', { userId: callerUserId })
              .then(d => { if (d.success) setDepts(d.depts || []); })
              .catch(() => {})
              .finally(() => setLoading(false));
          }}>🔄</button>
        </div>

        {/* Sort buttons */}
        <div className="flex gap-1 mb-3">
          {[
            { val: 'attempts', label: 'ครั้งสอบมาก' },
            { val: 'passRate', label: '% ผ่านสูง' },
            { val: 'avgScore', label: 'คะแนนเฉลี่ย' },
          ].map(o => (
            <button key={o.val} onClick={() => setSortBy(o.val)}
              className="btn text-xs rounded-lg px-2.5 py-1"
              style={{ background: sortBy === o.val ? 'var(--accent)' : 'var(--input-bg)', color: sortBy === o.val ? 'white' : 'var(--text-muted)' }}>
              {o.label}
            </button>
          ))}
        </div>

        {sorted.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>ยังไม่มีข้อมูลผลสอบ</div>
        ) : (
          <div className="space-y-2">
            {sorted.map((d, i) => (
              <div key={d.dept} className="rounded-xl p-3"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                    <span className="mr-1 font-bold" style={{ color: 'var(--text-muted)' }}>{i + 1}.</span>
                    {d.dept}
                  </span>
                  <div className="flex gap-2 text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                    <span>👥 {d.memberCount} คน</span>
                    <span>📝 {d.attempts} ครั้ง</span>
                  </div>
                </div>
                {/* pass rate bar */}
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 rounded-full h-2" style={{ background: 'var(--card-border)' }}>
                    <div className="h-2 rounded-full transition-all"
                      style={{ width: `${d.passRate}%`, background: d.passRate >= 60 ? '#16a34a' : '#ef4444' }} />
                  </div>
                  <span className="text-xs font-bold flex-shrink-0"
                    style={{ color: d.passRate >= 60 ? '#16a34a' : '#ef4444', minWidth: 36, textAlign: 'right' }}>
                    {d.passRate}%
                  </span>
                </div>
                <div className="flex gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>✅ ผ่าน {d.pass}</span>
                  <span>❌ ไม่ผ่าน {d.fail}</span>
                  <span>📊 เฉลี่ย {d.avgScore}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  #8 FlagsTab — รายงานข้อสอบผิดพลาด
// ════════════════════════════════════════════════════════════
function FlagsTab({ callerUserId }) {
  const [flags, setFlags]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [resolving, setResolving] = useState(null);
  const [filterStatus, setFilter] = useState('pending');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await apiGet('getFlags', { userId: callerUserId });
        if (data.success) setFlags(data.flags || []);
      } catch (_) {}
      finally { setLoading(false); }
    })();
  }, [callerUserId]);

  async function handleResolve(flag, status) {
    setResolving(flag.flagId);
    try {
      const data = await apiPost({ action: 'resolveFlag', callerUserId, flagId: flag.flagId, status });
      if (data.success) {
        setFlags(prev => prev.map(f => f.flagId === flag.flagId ? { ...f, status } : f));
        Swal.fire({ toast: true, position: 'top', timer: 2000, showConfirmButton: false, icon: 'success',
          title: status === 'resolved' ? '✅ แก้ไขแล้ว' : '🗑 ยกเลิกแล้ว' });
      }
    } catch (_) {}
    finally { setResolving(null); }
  }

  const REASON_LABELS = {
    wrong_answer: 'คำตอบไม่ถูกต้อง',
    unclear:      'ไม่ชัดเจน',
    typo:         'พิมพ์ผิด',
    other:        'อื่นๆ',
  };
  const STATUS_FILTERS = [
    { val: 'pending',   label: '⏳ รอดำเนินการ' },
    { val: 'resolved',  label: '✅ แก้ไขแล้ว' },
    { val: 'dismissed', label: '🗑 ยกเลิก' },
    { val: 'all',       label: '📋 ทั้งหมด' },
  ];

  const filtered = flags.filter(f => filterStatus === 'all' || f.status === filterStatus);
  const pendingCount = flags.filter(f => f.status === 'pending').length;

  if (loading) return <Spinner label="กำลังโหลด..." />;

  return (
    <div className="animate-fade space-y-3">
      <div className="quiz-card no-hover rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚩</span>
            <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>
              รายงานข้อสอบ
              {pendingCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs font-bold"
                  style={{ background: '#fef3c7', color: '#b45309' }}>
                  {pendingCount} รายการใหม่
                </span>
              )}
            </span>
          </div>
          <button className="btn btn-gray text-xs rounded-lg px-2 py-1" onClick={() => {
            setLoading(true);
            apiGet('getFlags', { userId: callerUserId })
              .then(d => { if (d.success) setFlags(d.flags || []); })
              .catch(() => {}).finally(() => setLoading(false));
          }}>🔄</button>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-1 mb-3 flex-wrap">
          {STATUS_FILTERS.map(s => (
            <button key={s.val} onClick={() => setFilter(s.val)}
              className="btn text-xs rounded-lg px-2.5 py-1"
              style={{ background: filterStatus === s.val ? 'var(--accent)' : 'var(--input-bg)', color: filterStatus === s.val ? 'white' : 'var(--text-muted)' }}>
              {s.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
            {filterStatus === 'pending' ? '🎉 ไม่มีรายการรอดำเนินการ' : 'ไม่มีรายการ'}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(f => (
              <div key={f.flagId} className="rounded-xl p-3"
                style={{
                  background: 'var(--input-bg)',
                  border: `1.5px solid ${f.status === 'pending' ? '#fbbf24' : 'var(--input-border)'}`,
                }}>
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                        {f.displayName || f.userId}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>· {f.createdAt}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                        style={{
                          background: f.status === 'pending' ? '#fef3c7' : f.status === 'resolved' ? '#dcfce7' : '#fee2e2',
                          color:      f.status === 'pending' ? '#92400e' : f.status === 'resolved' ? '#15803d' : '#b91c1c',
                        }}>
                        {f.status}
                      </span>
                    </div>
                    <div className="text-sm line-clamp-2 mb-1" style={{ color: 'var(--text)' }}>
                      📝 {f.questionText}
                    </div>
                    <div className="text-xs font-semibold" style={{ color: '#d97706' }}>
                      🚩 สาเหตุ: {REASON_LABELS[f.reason] || f.reason}
                    </div>
                  </div>
                  {f.status === 'pending' && (
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button
                        className="btn text-xs rounded-lg px-2 py-1 font-semibold"
                        style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}
                        disabled={resolving === f.flagId}
                        onClick={() => handleResolve(f, 'resolved')}>
                        ✅ แก้แล้ว
                      </button>
                      <button
                        className="btn text-xs rounded-lg px-2 py-1"
                        style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}
                        disabled={resolving === f.flagId}
                        onClick={() => handleResolve(f, 'dismissed')}>
                        🗑 ยกเลิก
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  LiveMonitor — Real-time exam session monitoring
// ─────────────────────────────────────────────────────────────
function LiveMonitor({ callerUserId }) {
  const [sessions,    setSessions]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [liveCount,   setLiveCount]   = useState(0);
  const intervalRef = useRef(null);

  function fmt(secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = String(secs % 60).padStart(2, '0');
    return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${s}` : `${m}:${s}`;
  }

  async function load() {
    try {
      const data = await apiGet('getActiveSessions', { userId: callerUserId });
      if (data.success) {
        setSessions(data.sessions || []);
        setLiveCount(data.count || 0);
        setLastUpdated(new Date());
      }
    } catch (_) {}
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  // หยุด poll เมื่อ tab ไม่ active → ประหยัด API call + battery
  useVisibleInterval(load, 30_000);

  return (
    <div className="animate-fade space-y-4">
      {/* Header */}
      <div className="quiz-card no-hover rounded-2xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base" style={{ color: 'var(--text)' }}>👁 Real-time Monitoring</h2>
              {liveCount > 0 && (
                <span className="flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-bold animate-pulse"
                  style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                  LIVE
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {liveCount > 0 ? `${liveCount} คนกำลังสอบอยู่` : 'ไม่มีใครสอบอยู่ขณะนี้'}
              {lastUpdated && ` • อัปเดต ${lastUpdated.toLocaleTimeString('th-TH')}`}
            </p>
          </div>
          <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5"
            onClick={load} disabled={loading}>
            🔄 Refresh
          </button>
        </div>
        <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          🔄 อัปเดตอัตโนมัติทุก 30 วินาที
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="quiz-card no-hover rounded-2xl p-8 flex justify-center">
          <span className="inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"
            style={{ color: 'var(--accent)' }} />
        </div>
      ) : sessions.length === 0 ? (
        <div className="quiz-card no-hover rounded-2xl p-10 text-center">
          <div className="text-5xl mb-3">💤</div>
          <div className="font-semibold" style={{ color: 'var(--text)' }}>ไม่มีใครสอบอยู่ขณะนี้</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            หน้านี้จะอัปเดตอัตโนมัติทุก 30 วินาที
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => {
            const stale = s.lastSeen > 120; // ไม่ได้ heartbeat > 2 นาที
            return (
              <div key={s.sessionId} className="quiz-card no-hover rounded-2xl p-4"
                style={{ borderLeft: `4px solid ${stale ? '#f59e0b' : '#22c55e'}` }}>
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <img
                    src={s.pictureUrl || FALLBACK_AVATAR}
                    alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    style={{ border: `2px solid ${stale ? '#f59e0b' : '#22c55e'}` }}
                    onError={e => { e.target.src = FALLBACK_AVATAR; }}
                  />
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate" style={{ color: 'var(--text)' }}>
                      {s.displayName || s.userId}
                    </div>
                    <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      📝 {s.lesson || 'ไม่ระบุวิชา'}
                    </div>
                  </div>
                  {/* Timer */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-base font-black" style={{ color: stale ? '#f59e0b' : '#16a34a' }}>
                      ⏱ {fmt(s.elapsed)}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {stale
                        ? `⚠️ ไม่มีสัญญาณ ${Math.floor(s.lastSeen / 60)} นาที`
                        : `✅ active ${s.lastSeen < 10 ? 'เมื่อสักครู่' : `${s.lastSeen} วิที่แล้ว`}`}
                    </div>
                  </div>
                </div>
                {/* Started at */}
                <div className="mt-2 pt-2 text-xs" style={{ borderTop: '1px solid var(--input-border)', color: 'var(--text-muted)' }}>
                  🕐 เริ่มสอบ {s.startTime}
                  {s.setId && <span className="ml-2">📦 ชุดข้อสอบ</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  AdminScreen (Main)
// ─────────────────────────────────────────────────────────────
function AdminScreenInner() {
  const { navigate, profile } = useApp();
  const [tab, setTab]         = useState('stats');
  const [pendingMsgCount, setPendingMsgCount] = useState(0);
  const [stats, setStats]     = useState(null);
  const [members, setMembers] = useState([]);
  const [results, setResults] = useState([]);
  const [resultTotal, setResultTotal] = useState(0);
  const [resultPage, setResultPage]   = useState(0);
  const [loading, setLoading]         = useState(false);
  const [syncing, setSyncing]         = useState(false);
  // Telegram config
  const [tgConfig, setTgConfig]       = useState(null);
  const [tgForm, setTgForm]           = useState({ botToken: '', chatId: '' });
  const [tgSaving, setTgSaving]       = useState(false);
  const [tgTesting, setTgTesting]     = useState(false);
  const [tgFinding, setTgFinding]     = useState(false);
  const [tgChats, setTgChats]         = useState([]);
  const [memberFilter, setMemberFilter]       = useState('');
  const [memberSearch, setMemberSearch]       = useState('');
  const [memberSearchDebounced, setMemberSearchDebounced] = useState(''); // #10 debounced
  const [memberPage, setMemberPage]           = useState(0); // pagination
  const [richMenuFilter, setRichMenuFilter]   = useState('');
  const [resultSearch, setResultSearch]       = useState('');
  const MEMBER_PAGE_SIZE = 25;
  const [triggerStatus, setTriggerStatus] = useState(null);
  const [lastSyncTime, setLastSyncTime]   = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [courses, setCourses]               = useState([]);          // ← เพิ่ม: หลักสูตรทั้งหมด
  // Bulk Rich Menu
  const [allRichMenus, setAllRichMenus]     = useState([]);
  const [rmLoading,    setRmLoading]        = useState(true);   // โหลด rich menu
  const [bulkRmId, setBulkRmId]             = useState('');
  const [rmSyncStatus, setRmSyncStatus]     = useState(null);
  const [bulkStatus, setBulkStatus]         = useState('active');   // all | active | inactive | pending
  const [bulkDept, setBulkDept]             = useState('');          // dropdown จาก members
  const [bulkCourse, setBulkCourse]         = useState('');          // dropdown จาก courses
  const [bulkHasMenu, setBulkHasMenu]       = useState('');          // '' | 'has' | 'none' | richMenuId
  const [bulkAssigning, setBulkAssigning]   = useState(false);
  const [bulkSearch,   setBulkSearch]       = useState('');         // ค้นหาชื่อ/LINE ID
  const [archiving, setArchiving]           = useState(false);
  const [exporting, setExporting]           = useState(false);      // export CSV
  // Batch member actions
  const [batchSelecting, setBatchSelecting]     = useState(false);
  const [batchSelected, setBatchSelected]       = useState(new Set());
  const [batchProcessing, setBatchProcessing]   = useState(false);
  // System Health
  const [healthData, setHealthData]             = useState(null);
  const [healthLoading, setHealthLoading]       = useState(false);
  // AI Generator
  const [showAiGen, setShowAiGen]           = useState(false);
  const [subjects, setSubjects]             = useState([]);
  // LINE Token
  const [lineTokenStatus, setLineTokenStatus] = useState(null);
  const [lineTokenInput, setLineTokenInput]   = useState('');

  // Question Bank Schedule
  const [qbSettings, setQbSettings] = useState(null);
  const [qbEnabled, setQbEnabled]   = useState(false);
  const [qbStart, setQbStart]       = useState('');
  const [qbEnd, setQbEnd]           = useState('');
  const [qbNumQ, setQbNumQ]         = useState(20);
  const [qbSaving, setQbSaving]     = useState(false);

  // Individual Analytics
  const [analyticsMembers, setAnalyticsMembers] = useState(null);
  const [analyticsTarget, setAnalyticsTarget]   = useState(null);
  const [analyticsData, setAnalyticsData]       = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsSearch, setAnalyticsSearch]   = useState('');
  const [researchExporting, setResearchExporting] = useState(false);
  const [lineTokenSaving, setLineTokenSaving] = useState(false);
  // Assignment Tracking
  const [assignOverview, setAssignOverview]   = useState(null);
  const [assignLoading, setAssignLoading]     = useState(false);
  const [assignDetail, setAssignDetail]       = useState(null);
  const [assignDetailLoading, setAssignDetailLoading] = useState(false);

  // ── mount: 2 parallel calls แทน 6 ──────────────────────────
  useEffect(() => {
    Promise.all([loadInitAdmin(), loadMembers(), loadAllRichMenus(), loadCourses()]);
    // eslint-disable-next-line
  }, []);

  // ── #10 debounce memberSearch 300ms ──────────────────────
  useEffect(() => {
    const t = setTimeout(() => setMemberSearchDebounced(memberSearch), 300);
    return () => clearTimeout(t);
  }, [memberSearch]);

  // ── reset member page เมื่อ filter/search เปลี่ยน ────────
  useEffect(() => { setMemberPage(0); }, [memberFilter, memberSearchDebounced, richMenuFilter]);

  // batch: stats + trigger + rmSync + tg  (1 GAS call)
  async function loadInitAdmin() {
    try {
      const data = await apiGet('initAdmin', { userId: profile.userId });
      if (!data.success) return;
      if (data.stats)   setStats(data.stats);
      if (data.trigger) {
        setTriggerStatus(data.trigger);
        if (data.trigger.lastSyncTime && data.trigger.lastSyncTime !== '(ยังไม่เคย sync)')
          setLastSyncTime(data.trigger.lastSyncTime);
      }
      if (data.rmSync)  setRmSyncStatus(data.rmSync);
      if (data.tg)      setTgConfig(data.tg);
    } catch (_) {}
  }

  async function loadStats() {
    try {
      const data = await apiGet('getAdminStats', { userId: profile.userId });
      if (data.success) setStats(data);
    } catch (_) {}
  }

  // poll pending messages count ทุก 30 วินาที (หยุดเมื่อ tab ไม่ active)
  const checkInbox = async () => {
    try {
      const d = await apiGet('getInbox', { userId: profile.userId, status: 'pending', page: 1, size: 1 });
      if (d.success) setPendingMsgCount(d.counts?.pending || 0);
    } catch(_) {}
  };
  useEffect(() => { checkInbox(); /* eslint-disable-next-line */ }, []);
  useVisibleInterval(checkInbox, 30_000);

  async function loadMembers() {
    setLoading(true);
    try {
      const data = await apiGet('getMembersWithProfiles', { userId: profile.userId });
      if (!data.success) return;
      setMembers(data.members || []);
      if (data.lastSyncTime) setLastSyncTime(toThaiDateTime(data.lastSyncTime));
    } catch (_) {}
    finally { setLoading(false); }
  }

  async function loadTriggerStatus() {
    try {
      const data = await apiGet('getTriggerStatus', { userId: profile.userId });
      if (data.success) {
        setTriggerStatus(data);
        if (data.lastSyncTime && data.lastSyncTime !== '(ยังไม่เคย sync)') setLastSyncTime(toThaiDateTime(data.lastSyncTime));
      }
    } catch (_) {}
  }

  async function loadResults(page = 0) {
    setLoading(true);
    try {
      const data = await apiGet('getAllResults', { userId: profile.userId, page });
      if (data.success) { setResults(data.results || []); setResultTotal(data.total || 0); setResultPage(page); }
    } catch (_) {}
    finally { setLoading(false); }
  }

  async function syncAllProfiles() {
    const r = await Swal.fire({
      title: '🔄 Sync LINE Profiles',
      html: `ดึงข้อมูล <b>ชื่อ-รูปโปรไฟล์</b> ล่าสุดจาก LINE<br>อาจใช้เวลาสักครู่`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '✅ Sync เลย',
      cancelButtonText: 'ยกเลิก',
    });
    if (!r.isConfirmed) return;
    setSyncing(true);
    try {
      const data = await apiGet('syncAllLineProfiles', { userId: profile.userId });
      if (!data.success) throw new Error(data.message);
      await Promise.all([loadMembers(), loadInitAdmin()]);
      Swal.fire({
        icon: 'success', title: 'Sync สำเร็จ!',
        html: `✅ อัปเดต <b>${data.updatedCount}</b> คน${data.failedCount > 0 ? `<br>⚠️ ไม่พบใน LINE <b>${data.failedCount}</b> คน` : ''}`,
        timer: 3000, showConfirmButton: false,
      });
    } catch (e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error');
    } finally { setSyncing(false); }
  }

  async function syncPicOnly() {
    setSyncing(true);
    try {
      const data = await apiGet('syncPictureUrls', { userId: profile.userId });
      if (!data.success) throw new Error(data.message);
      lsInvalidate('getMembersWithProfiles');
      await loadMembers();
      Swal.fire({
        icon: 'success', title: 'Sync รูปสำเร็จ!',
        html: `✅ อัปเดต <b>${data.updatedCount}</b> คน${data.failedCount > 0 ? `<br>⚠️ ไม่พบรูป <b>${data.failedCount}</b> คน` : ''}`,
        timer: 3000, showConfirmButton: false,
      });
    } catch (e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error');
    } finally { setSyncing(false); }
  }

  async function loadAllRichMenus() {
    setRmLoading(true);
    try {
      const data = await apiGetCached('getRichMenuList', { userId: profile.userId }, 5 * 60_000);
      if (data.success) setAllRichMenus(data.richMenus || []);
      else setAllRichMenus([]);
    } catch (_) { setAllRichMenus([]); }
    finally { setRmLoading(false); }
  }

  async function loadCourses() {
    try {
      const data = await apiGetCached('getCourses', { userId: profile.userId }, 5 * 60_000);
      if (data.success) setCourses(data.courses || []);
    } catch (_) {}
  }

  // ── Batch Member Operations ─────────────────────────
  async function handleBatchStatus(newStatus) {
    const ids = [...batchSelected];
    if (!ids.length) return;
    const labels = { active: 'อนุมัติ', inactive: 'ระงับ', pending: 'ตั้งเป็นรออนุมัติ' };
    const r = await Swal.fire({
      title: `${labels[newStatus]} ${ids.length} คน?`,
      icon: 'question', showCancelButton: true, confirmButtonText: 'ยืนยัน', cancelButtonText: 'ยกเลิก',
      confirmButtonColor: newStatus === 'active' ? '#16a34a' : newStatus === 'inactive' ? '#ef4444' : '#d97706',
    });
    if (!r.isConfirmed) return;
    setBatchProcessing(true);
    try {
      const data = await apiPost({ action: 'bulkUpdateMembers', callerUserId: profile.userId, userIds: ids, newStatus });
      if (!data.success) throw new Error(data.message);
      lsInvalidate('getMembersWithProfiles');
      await loadMembers();
      setBatchSelected(new Set());
      setBatchSelecting(false);
      Swal.fire({ icon: 'success', title: `${labels[newStatus]}สำเร็จ ${data.updated} คน`, timer: 1800, showConfirmButton: false });
    } catch (e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error'); }
    finally { setBatchProcessing(false); }
  }

  async function handleBatchRole(newRole) {
    const ids = [...batchSelected];
    if (!ids.length) return;
    const label = newRole === 'teacher' ? '🎓 ครูผู้สอน' : newRole === 'admin' ? '👑 Admin' : '👤 สมาชิกทั่วไป';
    const r = await Swal.fire({ title: `เปลี่ยน Role เป็น "${label}" — ${ids.length} คน?`, icon: 'question', showCancelButton: true, confirmButtonText: 'ยืนยัน', cancelButtonText: 'ยกเลิก' });
    if (!r.isConfirmed) return;
    setBatchProcessing(true);
    try {
      const data = await apiPost({ action: 'bulkUpdateMembers', callerUserId: profile.userId, userIds: ids, newRole });
      if (!data.success) throw new Error(data.message);
      lsInvalidate('getMembersWithProfiles');
      await loadMembers();
      setBatchSelected(new Set());
      setBatchSelecting(false);
      Swal.fire({ icon: 'success', title: `เปลี่ยน Role สำเร็จ ${data.updated} คน`, timer: 1800, showConfirmButton: false });
    } catch (e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error'); }
    finally { setBatchProcessing(false); }
  }

  // ── System Health ─────────────────────────────────
  async function loadHealth() {
    setHealthLoading(true);
    try {
      const data = await apiGet('getSystemHealth', { userId: profile.userId });
      if (data.success) setHealthData(data);
    } catch (_) {}
    finally { setHealthLoading(false); }
  }

  // ── Subjects (for AI Generator) ────────────────────────
  async function loadSubjects() {
    try {
      const data = await apiGetCached('getSubjects', {}, 10 * 60_000);
      if (data.success) setSubjects(data.subjects || []);
    } catch (_) {}
  }

  // ── LINE Token Management ─────────────────────────────
  async function loadLineTokenStatus() {
    try {
      const data = await apiGet('getLineTokenStatus', { userId: profile.userId });
      if (data.success) setLineTokenStatus(data);
    } catch (_) {}
  }

  async function saveLineToken() {
    if (!lineTokenInput.trim()) return;
    setLineTokenSaving(true);
    try {
      const data = await apiPost({ action: 'setLineToken', callerUserId: profile.userId, token: lineTokenInput.trim() });
      if (!data.success) throw new Error(data.message);
      setLineTokenInput('');
      await loadLineTokenStatus();
      Swal.fire({ icon: 'success', title: 'บันทึก LINE Token สำเร็จ!', timer: 1500, showConfirmButton: false });
    } catch (e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error'); }
    finally { setLineTokenSaving(false); }
  }

  // ── Question Bank Schedule ────────────────────────────
  async function loadQBankSettings() {
    try {
      const data = await apiGet('getQuestionBankSettings', { userId: profile.userId });
      if (data.success) {
        setQbSettings(data);
        setQbEnabled(!!data.enabled);
        setQbStart(data.start || '');
        setQbEnd(data.end || '');
        setQbNumQ(data.numQ || 20);
      }
    } catch (_) {}
  }

  async function saveQBankSettings() {
    setQbSaving(true);
    try {
      const data = await apiPost({
        action: 'setQuestionBankSettings',
        callerUserId: profile.userId,
        enabled: qbEnabled,
        start: qbStart,
        end: qbEnd,
        numQ: qbNumQ,
      });
      if (!data.success) throw new Error(data.message);
      setQbSettings(data);
      Swal.fire({ icon: 'success', title: 'บันทึกตั้งค่าคลังข้อสอบสำเร็จ!', timer: 1500, showConfirmButton: false });
    } catch (e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error'); }
    finally { setQbSaving(false); }
  }

  // ── Individual Analytics ──────────────────────────────
  async function loadAnalyticsMembers() {
    try {
      const data = await apiGet('getMembers', { userId: profile.userId });
      if (data.success) setAnalyticsMembers(data.members || []);
    } catch (_) {}
  }

  async function loadIndividualAnalytics(targetUserId) {
    setAnalyticsLoading(true);
    setAnalyticsData(null);
    setAnalyticsTarget(targetUserId);
    try {
      const data = await apiGet('getIndividualAnalytics', { callerUserId: profile.userId, targetUserId });
      if (data.success) setAnalyticsData(data);
      else Swal.fire('Error', data.message, 'error');
    } catch (e) { Swal.fire('Error', e.message, 'error'); }
    finally { setAnalyticsLoading(false); }
  }

  async function exportResearchData() {
    setResearchExporting(true);
    try {
      const data = await apiGet('getResearchExport', { callerUserId: profile.userId });
      if (!data.success) throw new Error(data.message);
      // Download as JSON
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `research_export_${new Date().toISOString().slice(0,10)}.json`;
      a.click(); URL.revokeObjectURL(url);
      Swal.fire({ icon: 'success', title: 'Export สำเร็จ!', text: `${data.totalUsers} users, ${data.totalAttempts} attempts`, timer: 2000, showConfirmButton: false });
    } catch (e) { Swal.fire('Error', e.message, 'error'); }
    finally { setResearchExporting(false); }
  }

  async function exportResearchCSV() {
    setResearchExporting(true);
    try {
      const data = await apiGet('getResearchExport', { callerUserId: profile.userId });
      if (!data.success) throw new Error(data.message);
      // Convert results to CSV
      const headers = ['anonymousId','date','subject','score','total','pct','pass','timeUsedSec','setId'];
      const rows = [headers.join(',')];
      (data.results||[]).forEach(r => {
        rows.push(headers.map(h => JSON.stringify(r[h]??'')).join(','));
      });
      const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `research_results_${new Date().toISOString().slice(0,10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
      Swal.fire({ icon: 'success', title: 'Export CSV สำเร็จ!', timer: 1500, showConfirmButton: false });
    } catch (e) { Swal.fire('Error', e.message, 'error'); }
    finally { setResearchExporting(false); }
  }

  // ── Assignment Overview ───────────────────────────────
  async function loadAssignOverview() {
    setAssignLoading(true);
    try {
      const data = await apiGet('getAdminAssignmentOverview', { userId: profile.userId });
      if (data.success) setAssignOverview(data);
    } catch (_) {}
    finally { setAssignLoading(false); }
  }

  async function loadAssignDetail(setId) {
    setAssignDetailLoading(true);
    setAssignDetail(null);
    try {
      const data = await apiGet('getAssignmentTracking', { userId: profile.userId, setId });
      if (data.success) setAssignDetail(data);
    } catch (_) {}
    finally { setAssignDetailLoading(false); }
  }

  async function loadRmSyncStatus() {
    try {
      const data = await apiGet('getRichMenuSyncStatus', { userId: profile.userId });
      if (data.success) setRmSyncStatus(data);
    } catch (_) {}
  }

  async function handleSetupRmTrigger() {
    const r = await Swal.fire({
      title: '⚡ ติดตั้ง Rich Menu Sync Trigger',
      html: 'ระบบจะ sync richMenuId ของทุก user<br><b>ทีละ 100 คน ทุก 10 นาที วนไม่รู้จบ</b>',
      icon: 'question', showCancelButton: true,
      confirmButtonText: '✅ ติดตั้งเลย', cancelButtonText: 'ยกเลิก',
    });
    if (!r.isConfirmed) return;
    try {
      const data = await apiGet('setupRichMenuTrigger', { userId: profile.userId });
      if (!data.success) throw new Error(data.message);
      await Promise.all([loadInitAdmin(), loadMembers()]);
      Swal.fire({ icon: 'success', title: 'ติดตั้งสำเร็จ!', text: data.message, timer: 2000, showConfirmButton: false });
    } catch (e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error'); }
  }

  async function handleRemoveRmTrigger() {
    const r = await Swal.fire({ title: '🗑 ลบ Rich Menu Sync Trigger?', icon: 'warning', showCancelButton: true, confirmButtonText: 'ลบ', confirmButtonColor: '#ef4444', cancelButtonText: 'ยกเลิก' });
    if (!r.isConfirmed) return;
    try {
      const data = await apiGet('removeRichMenuTrigger', { userId: profile.userId });
      if (!data.success) throw new Error(data.message);
      loadInitAdmin();
      Swal.fire({ icon: 'success', title: 'ลบแล้ว', timer: 1500, showConfirmButton: false });
    } catch (e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error'); }
  }

  function getBulkTargetUsers() {
    let list = members;
    if (bulkStatus !== 'all') list = list.filter(m => m.status === bulkStatus);
    if (bulkDept)   list = list.filter(m => m.department === bulkDept);
    if (bulkCourse) list = list.filter(m => m.studentId === bulkCourse);
    if (bulkHasMenu === 'has')       list = list.filter(m => !!m.richMenuId);
    else if (bulkHasMenu === 'none') list = list.filter(m => !m.richMenuId);
    else if (bulkHasMenu)            list = list.filter(m => m.richMenuId === bulkHasMenu);
    if (bulkSearch.trim()) {
      const q = bulkSearch.trim().toLowerCase();
      list = list.filter(m =>
        m.fullName.toLowerCase().includes(q) ||
        m.displayName.toLowerCase().includes(q) ||
        m.lineUserId.toLowerCase().includes(q)
      );
    }
    return list;
  }

  async function handleBulkAssign() {
    const targets = getBulkTargetUsers();
    if (!bulkRmId)       return Swal.fire('แจ้งเตือน', 'กรุณาเลือก Rich Menu', 'warning');
    if (!targets.length) return Swal.fire('แจ้งเตือน', 'ไม่มีสมาชิกในกลุ่มที่เลือก', 'warning');
    const menu = allRichMenus.find(m => m.richMenuId === bulkRmId);

    // สร้างสรุปตัวกรอง
    const filterLines = [];
    if (bulkStatus !== 'all') filterLines.push(`สถานะ: <b>${bulkStatus}</b>`);
    if (bulkDept)    filterLines.push(`หน่วยงาน: <b>${bulkDept}</b>`);
    if (bulkCourse)  filterLines.push(`หลักสูตร: <b>${courses.find(c => c.courseId === bulkCourse)?.name || bulkCourse}</b>`);
    if (bulkHasMenu) filterLines.push(`RM ปัจจุบัน: <b>${bulkHasMenu === 'none' ? 'ยังไม่มี' : bulkHasMenu === 'has' ? 'มีแล้ว' : bulkHasMenu.slice(-8)}</b>`);

    const r = await Swal.fire({
      title: '🎛 กำหนด Rich Menu แบบกลุ่ม',
      html: [
        `Rich Menu: <b>${menu?.name || menu?.chatBarText || bulkRmId.slice(-8)}</b>`,
        filterLines.length ? `ตัวกรอง: ${filterLines.join(', ')}` : 'ทั้งหมด',
        `จำนวน: <b>${targets.length} คน</b>`,
      ].join('<br>'),
      icon: 'question', showCancelButton: true,
      confirmButtonText: '✅ กำหนดเลย', cancelButtonText: 'ยกเลิก',
    });
    if (!r.isConfirmed) return;
    setBulkAssigning(true);
    try {
      const userIds = targets.map(m => m.lineUserId);
      const data = await apiPost({ action: 'bulkLinkRichMenu', callerUserId: profile.userId, userIds, richMenuId: bulkRmId });
      if (!data.success) throw new Error(data.message);
      lsInvalidate('getMembersWithProfiles');
      await loadMembers();
      Swal.fire({
        icon: 'success', title: 'กำหนด Rich Menu สำเร็จ!',
        html: `✅ สำเร็จ <b>${data.successCount}</b> คน${data.failCount > 0 ? `<br>❌ ไม่สำเร็จ <b>${data.failCount}</b> คน` : ''}`,
        timer: 3000, showConfirmButton: false,
      });
    } catch (e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error');
    } finally { setBulkAssigning(false); }
  }

  // ── Export ผลสอบทั้งหมดเป็น CSV ──────────────────────────────
  async function handleExportCSV() {
    setExporting(true);
    try {
      const data = await apiGet('exportAllResults', { userId: profile.userId });
      if (!data.success) throw new Error(data.message || 'Export ไม่สำเร็จ');
      const headers = ['วันที่เวลา', 'ชื่อ', 'อีเมล', 'หน่วยงาน', 'วิชา/ชุดสอบ', 'คะแนน', 'รวม', 'เปอร์เซ็นต์', 'ผ่าน/ไม่ผ่าน', 'เวลา(วิ)', 'UserId', 'ExamId', 'SetId'];
      const rows = (data.rows || []).map(r => [
        r.date, r.name, r.email, r.department, r.lesson,
        r.score, r.total, r.pct, r.pass, r.timeUsed,
        r.userId, r.examId, r.setId,
      ]);
      const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\r\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `results_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      Swal.fire('สำเร็จ', `Export ${data.total} รายการเรียบร้อยแล้ว`, 'success');
    } catch (e) {
      Swal.fire('เกิดข้อผิดพลาด', e.message, 'error');
    } finally {
      setExporting(false);
    }
  }

  async function handleSetupTrigger() {
    const r = await Swal.fire({
      title: '⚡ ติดตั้ง Auto Sync Trigger',
      html: 'ระบบจะ sync ชื่อ-รูปโปรไฟล์ LINE อัตโนมัติ<br><b>ทุก 10 นาที</b> สูงสุด 200 แถวต่อรอบ<br><br>ต้องการดำเนินการ?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '✅ ติดตั้งเลย',
      cancelButtonText: 'ยกเลิก',
    });
    if (!r.isConfirmed) return;
    try {
      const data = await apiGet('setupSyncTrigger', { userId: profile.userId });
      if (!data.success) throw new Error(data.message);
      await Promise.all([loadInitAdmin(), loadMembers()]);
      Swal.fire({ icon: 'success', title: 'ติดตั้งสำเร็จ!', text: data.message, timer: 2500, showConfirmButton: false });
    } catch (e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error'); }
  }

  async function handleRemoveTrigger() {
    const r = await Swal.fire({
      title: '🗑 ลบ Auto Sync Trigger?',
      text: 'ระบบจะหยุด sync อัตโนมัติ สามารถติดตั้งใหม่ได้ภายหลัง',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'ยกเลิก',
    });
    if (!r.isConfirmed) return;
    try {
      const data = await apiGet('removeSyncTrigger', { userId: profile.userId });
      if (!data.success) throw new Error(data.message);
      loadInitAdmin();
      Swal.fire({ icon: 'success', title: 'ลบ trigger แล้ว', timer: 1500, showConfirmButton: false });
    } catch (e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error'); }
  }

  async function loadTgConfig() {
    try {
      const data = await apiGet('getTelegramConfig', { userId: profile.userId });
      if (data.success) setTgConfig(data);
    } catch (_) {}
  }

  async function saveTgConfig() {
    if (!tgForm.botToken && !tgForm.chatId) return;
    setTgSaving(true);
    try {
      const data = await apiPost({ action: 'setTelegramConfig', callerUserId: profile.userId, ...tgForm });
      if (!data.success) throw new Error(data.message);
      setTgForm({ botToken: '', chatId: '' });
      loadInitAdmin();
      Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ!', timer: 1500, showConfirmButton: false });
    } catch (e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error');
    } finally { setTgSaving(false); }
  }

  async function findTelegramChats() {
    setTgFinding(true);
    setTgChats([]);
    try {
      const data = await apiGet('getTelegramUpdates', { userId: profile.userId });
      if (!data.success) {
        Swal.fire({
          icon: 'warning',
          title: 'ไม่พบข้อความ',
          html: `${data.message || ''}<br><br><b>วิธีแก้:</b><br>1. เปิด Telegram<br>2. ค้นหา bot ของคุณ<br>3. ส่งข้อความอะไรก็ได้<br>4. กลับมากด "หา Chat ID" ใหม่`,
        });
        return;
      }
      setTgChats(data.chats || []);
    } catch (e) {
      Swal.fire('เกิดข้อผิดพลาด', e.message, 'error');
    } finally { setTgFinding(false); }
  }

  async function testTelegram() {
    setTgTesting(true);
    try {
      const data = await apiGet('testTelegramNotify', { userId: profile.userId });
      if (data.success) {
        Swal.fire({ icon: 'success', title: '✅ ส่งสำเร็จ!', text: data.message, timer: 2500, showConfirmButton: false });
      } else {
        Swal.fire({ icon: 'error', title: 'ส่งไม่สำเร็จ', text: data.message });
      }
    } catch (e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error');
    } finally { setTgTesting(false); }
  }

  async function setupTgWebhook() {
    const conf = await Swal.fire({
      title: 'เปิดใช้ Telegram Reply?',
      html:
        'หลังเปิดแล้ว Admin จะสามารถ <b>ตอบข้อความ user ผ่าน Telegram</b> ได้<br><br>'
        + '<b>วิธีตอบ:</b><br>'
        + '1. กด <b>Reply</b> ข้อความที่ bot ส่งมา (มี #MSGxxx)<br>'
        + '2. พิมพ์คำตอบ → กดส่ง<br>'
        + '3. ระบบจะ forward ไปให้ user ทันที',
      icon: 'question', showCancelButton: true,
      confirmButtonText: 'เปิดใช้', cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#0088cc',
    });
    if (!conf.isConfirmed) return;

    try {
      const data = await apiPost({ action: 'setupTelegramWebhook', callerUserId: profile.userId });
      if (!data.success) throw new Error(data.message);
      await Swal.fire({
        icon: 'success',
        title: '✅ เปิดใช้สำเร็จ!',
        html:
          'Webhook URL ตั้งเรียบร้อย<br><br>'
          + '<b>ทดสอบ:</b> ส่งข้อความใน LINE → bot จะแจ้งใน Telegram → reply ข้อความนั้นเพื่อตอบกลับ',
      });
    } catch (e) {
      Swal.fire('เกิดข้อผิดพลาด', e.message, 'error');
    }
  }

  // เมื่อแก้ไขข้อมูลจาก Modal → อัปเดต local state
  function handleMemberUpdated(updated) {
    setMembers(prev => prev.map(m => m.lineUserId === updated.lineUserId ? { ...m, ...updated } : m));
    // อัปเดต selectedMember ด้วย
    setSelectedMember(prev => prev ? { ...prev, ...updated } : null);
  }
  function handleMemberDeleted(userId) {
    setMembers(prev => prev.filter(m => m.lineUserId !== userId));
    loadStats();
  }

  const TABS = [
    { key: 'live',        label: '👁 Live' },
    { key: 'inbox',       label: '💬 ข้อความ' },
    { key: 'stats',       label: '📊 สถิติ' },
    { key: 'members',     label: '👥 สมาชิก' },
    { key: 'dept',        label: '🏢 หน่วยงาน' },
    { key: 'deptResults', label: '📈 ผลหน่วยงาน' },
    { key: 'qstats',      label: '📉 ข้อยาก' },
    { key: 'flags',       label: `🚩 Flags` },
    { key: 'ai',          label: '🤖 AI สร้างข้อสอบ' },
    { key: 'assignments', label: '📋 มอบหมาย' },
    { key: 'richmenu',    label: '🎛 Rich Menu' },
    { key: 'results',     label: '📋 ผลสอบ' },
    { key: 'courses',     label: '📚 หลักสูตร' },
    { key: 'lessons',     label: '📖 บทเรียน' },
    { key: 'subjects',    label: '📖 รายวิชา' },
    { key: 'analytics',   label: '🔬 วิเคราะห์' },
    { key: 'health',      label: '🩺 ระบบ' },
    { key: 'settings',    label: '⚙️ ตั้งค่า' },
  ];

  // filter + search
  const filteredMembers = members
    .filter(m => memberFilter ? m.status === memberFilter : true)
    .filter(m => richMenuFilter === '__none__'
      ? !m.richMenuId
      : richMenuFilter
        ? m.richMenuId === richMenuFilter
        : true)
    .filter(m => memberSearchDebounced
      ? (m.fullName + m.displayName + m.email + m.studentId + m.lineUserId + (m.department||''))
          .toLowerCase().includes(memberSearchDebounced.toLowerCase())
      : true);

  // pagination สมาชิก
  const pagedMembers = filteredMembers.slice(memberPage * MEMBER_PAGE_SIZE, (memberPage + 1) * MEMBER_PAGE_SIZE);

  const filteredResults = resultSearch
    ? results.filter(r =>
        r.name.toLowerCase().includes(resultSearch.toLowerCase()) ||
        r.lesson.toLowerCase().includes(resultSearch.toLowerCase()))
    : results;

  return (
    <div className="animate-fade">

      {/* Member Detail Modal */}
      {selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          callerUserId={profile.userId}
          lastSyncTime={lastSyncTime}
          onClose={() => setSelectedMember(null)}
          onUpdated={handleMemberUpdated}
          onDeleted={handleMemberDeleted}
        />
      )}

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="rounded-2xl mb-4 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #1e293b 100%)',
          boxShadow: '0 4px 24px rgba(30,64,175,0.30)',
        }}>
        <div className="p-4 sm:p-5">

          {/* Title row */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: '#f8fafc' }}>
                ⚙️ Admin Panel
              </h1>
              <p className="text-xs mt-0.5" style={{ color: '#93c5fd' }}>
                จัดการระบบ · สมาชิก · ข้อสอบ
              </p>
            </div>
            <button
              className="text-xs rounded-xl px-3 py-2 font-semibold"
              style={{
                background: 'rgba(255,255,255,0.12)',
                color: '#f8fafc',
                border: '1px solid rgba(255,255,255,0.22)',
              }}
              onClick={() => navigate('setup')}>
              ← กลับ
            </button>
          </div>

          {/* Quick-action cards */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all active:scale-95"
              style={{
                background: '#f59e0b',
                color: 'white',
                boxShadow: '0 2px 10px rgba(245,158,11,0.45)',
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={() => navigate('examSetManager')}>
              <span style={{ fontSize: 28, lineHeight: 1 }}>📦</span>
              <div>
                <div className="text-sm font-bold">ชุดข้อสอบ</div>
                <div className="text-xs" style={{ opacity: 0.85 }}>สร้าง / จัดการชุดสอบ</div>
              </div>
            </button>
            <button
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all active:scale-95"
              style={{
                background: '#7c3aed',
                color: 'white',
                boxShadow: '0 2px 10px rgba(124,58,237,0.45)',
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={() => navigate('questionManager')}>
              <span style={{ fontSize: 28, lineHeight: 1 }}>📚</span>
              <div>
                <div className="text-sm font-bold">ข้อสอบ</div>
                <div className="text-xs" style={{ opacity: 0.85 }}>เพิ่ม / แก้ไขข้อสอบ</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ── Tab Bar (scrollable) ──────────────────────────────── */}
      <div className="mb-4"
        style={{ overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        <style>{`.admin-tabs::-webkit-scrollbar{display:none}`}</style>
        <div className="admin-tabs flex gap-2" style={{ minWidth: 'max-content', paddingBottom: 2 }}>
          {TABS.map(t => (
            <button
              key={t.key}
              className="flex-shrink-0 rounded-xl font-semibold transition-all whitespace-nowrap"
              style={{
                padding: '9px 18px',
                fontSize: 13,
                background: tab === t.key ? 'var(--accent)' : 'var(--card)',
                color:      tab === t.key ? 'white' : 'var(--text-muted)',
                border:     `1.5px solid ${tab === t.key ? 'var(--accent)' : 'var(--card-border)'}`,
                boxShadow:  tab === t.key ? '0 2px 10px rgba(99,102,241,0.30)' : 'none',
                transform:  tab === t.key ? 'translateY(-1px)' : 'none',
                cursor: 'pointer',
              }}
              onClick={() => {
                setTab(t.key);
                if (t.key === 'results' && results.length === 0) loadResults(0);
                if (t.key === 'ai' && subjects.length === 0) loadSubjects();
                if (t.key === 'assignments' && !assignOverview) loadAssignOverview();
                if (t.key === 'settings' && !lineTokenStatus) loadLineTokenStatus();
                if (t.key === 'settings' && !qbSettings) loadQBankSettings();
                if (t.key === 'analytics' && !analyticsMembers) loadAnalyticsMembers();
                if (t.key === 'health' && !healthData) loadHealth();
              }}
            >
              {t.label}
              {t.key === 'inbox' && pendingMsgCount > 0 && (
                <span style={{
                  marginLeft: 4, background: '#ef4444', color: 'white',
                  borderRadius: 99, padding: '0 5px', fontSize: 9, fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle',
                }}>{pendingMsgCount > 99 ? '99+' : pendingMsgCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Live Tab ──────────────────────────────── */}
      {tab === 'live' && <LiveMonitor callerUserId={profile.userId} />}

      {/* ── Stats Tab ─────────────────────────────── */}
      {tab === 'stats' && (
        <StatsCharts stats={stats} loading={!stats && loading} onRefresh={loadStats} />
      )}

      {/* ── AI Generator Tab ─────────────────────────── */}
      {tab === 'ai' && (
        <div className="animate-fade">
          {showAiGen ? (
            <GeminiQuizGenerator
              profile={profile}
              subjects={subjects}
              onClose={() => setShowAiGen(false)}
              onSaved={() => { setShowAiGen(false); Swal.fire({ icon: 'success', title: 'บันทึกข้อสอบ AI สำเร็จ!', timer: 1800, showConfirmButton: false }); }}
            />
          ) : (
            <div className="space-y-4">
              {/* Hero card */}
              <div className="quiz-card no-hover rounded-2xl overflow-hidden">
                <div className="p-5" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}>
                  <div className="text-center mb-4">
                    <div style={{ fontSize: 48 }}>🤖</div>
                    <h2 className="text-xl font-black mt-2" style={{ color: 'white' }}>AI สร้างข้อสอบ</h2>
                    <p className="text-xs mt-1" style={{ color: '#c4b5fd' }}>ใช้ Google Gemini AI สร้างข้อสอบอัตโนมัติ ปรับแก้ได้ก่อนบันทึก</p>
                  </div>
                  <button
                    className="btn w-full rounded-xl py-3.5 text-sm font-bold"
                    style={{ background: 'white', color: '#4f46e5', border: 'none', cursor: 'pointer' }}
                    onClick={() => setShowAiGen(true)}>
                    ✨ เริ่มสร้างข้อสอบด้วย AI
                  </button>
                </div>
              </div>

              {/* How it works */}
              <div className="quiz-card no-hover rounded-2xl p-4">
                <div className="font-bold text-sm mb-3" style={{ color: 'var(--text)' }}>📖 วิธีใช้งาน</div>
                <div className="space-y-2.5">
                  {[
                    { icon: '🔑', title: 'ตั้งค่า API Key', desc: 'ขอ Gemini API Key ฟรีจาก aistudio.google.com' },
                    { icon: '📝', title: 'กำหนดหัวข้อ', desc: 'เลือกวิชา ระบุเนื้อหา จำนวนข้อ ระดับความยาก' },
                    { icon: '🤖', title: 'AI สร้างร่าง', desc: 'Gemini สร้างข้อสอบ 4 ตัวเลือก พร้อมเฉลยและอธิบาย' },
                    { icon: '✏️', title: 'ตรวจสอบ & แก้ไข', desc: 'อ่านทบทวน แก้ไข เลือกเฉพาะข้อที่ต้องการ' },
                    { icon: '💾', title: 'บันทึกเข้าระบบ', desc: 'ข้อสอบจะเข้า Questions sheet พร้อมใช้งานทันที' },
                  ].map(({ icon, title, desc }) => (
                    <div key={title} className="flex items-start gap-3 p-2.5 rounded-xl"
                      style={{ background: 'var(--input-bg)' }}>
                      <span className="text-xl flex-shrink-0">{icon}</span>
                      <div>
                        <div className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{title}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Assignments Tab ───────────────────────────── */}
      {tab === 'assignments' && (
        <div className="animate-fade">
          {assignDetail ? (
            /* ── Detail View ── */
            <div>
              <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5 mb-3"
                onClick={() => setAssignDetail(null)}>← กลับ</button>
              <div className="quiz-card no-hover rounded-2xl p-4 mb-3">
                <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text)' }}>
                  📋 {assignDetail.setName}
                </h3>
                <div className="flex gap-3 flex-wrap">
                  {[
                    { label: 'มอบหมาย', val: assignDetail.totalAssigned, bg: '#dbeafe', c: '#1d4ed8' },
                    { label: 'ทำแล้ว', val: assignDetail.completed, bg: '#fef3c7', c: '#92400e' },
                    { label: 'ผ่าน', val: assignDetail.passed, bg: '#dcfce7', c: '#15803d' },
                    { label: 'รอ', val: assignDetail.totalAssigned - assignDetail.completed, bg: '#fee2e2', c: '#b91c1c' },
                  ].map(s => (
                    <div key={s.label} className="text-center px-3 py-2 rounded-xl" style={{ background: s.bg }}>
                      <div className="text-lg font-black" style={{ color: s.c }}>{s.val}</div>
                      <div className="text-xs font-semibold" style={{ color: s.c }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              {assignDetailLoading ? <Spinner label="กำลังโหลด..." /> : (
                <div className="space-y-2">
                  {(assignDetail.tracking || []).map(t => {
                    const statusConf = t.status === 'passed'
                      ? { label: '✅ ผ่าน', bg: '#dcfce7', c: '#15803d' }
                      : t.status === 'attempted'
                        ? { label: '❌ ยังไม่ผ่าน', bg: '#fee2e2', c: '#b91c1c' }
                        : { label: '⏳ ยังไม่สอบ', bg: '#f3f4f6', c: '#6b7280' };
                    return (
                      <div key={t.userId} className="quiz-card no-hover rounded-xl p-3 flex items-center gap-3">
                        {t.pictureUrl
                          ? <img src={t.pictureUrl} loading="lazy" decoding="async" className="w-9 h-9 rounded-full" style={{ objectFit: 'cover' }} />
                          : <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm"
                              style={{ background: 'var(--input-bg)', color: 'var(--text-muted)' }}>👤</div>}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>{t.displayName}</div>
                          {t.department && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.department}</div>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{ background: statusConf.bg, color: statusConf.c }}>{statusConf.label}</span>
                          {t.attempts > 0 && (
                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {t.attempts} ครั้ง · {t.bestPct}%
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ── Overview ── */
            <div>
              {assignLoading ? <Spinner label="กำลังโหลด..." /> : !assignOverview ? (
                <div className="quiz-card no-hover rounded-2xl p-8 text-center" style={{ color: 'var(--text-muted)' }}>ไม่พบข้อมูล</div>
              ) : (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                    {[
                      { icon: '📋', label: 'ชุดที่มอบหมาย', val: assignOverview.summary.totalSets, bg: '#eff6ff', c: '#1d4ed8' },
                      { icon: '👥', label: 'คนที่ถูกมอบหมาย', val: assignOverview.summary.totalAssigned, bg: '#f0fdf4', c: '#15803d' },
                      { icon: '✅', label: 'ผ่านแล้ว', val: assignOverview.summary.totalPassed, bg: '#dcfce7', c: '#16a34a' },
                      { icon: '⏳', label: 'ยังไม่ทำ', val: assignOverview.summary.totalPending, bg: '#fef3c7', c: '#92400e' },
                    ].map(s => (
                      <div key={s.label} className="quiz-card no-hover rounded-xl p-3 text-center" style={{ background: s.bg }}>
                        <div className="text-xl mb-1">{s.icon}</div>
                        <div className="text-xl font-black" style={{ color: s.c }}>{s.val}</div>
                        <div className="text-xs font-semibold" style={{ color: s.c }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>ชุดข้อสอบที่มอบหมาย</span>
                    <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5" onClick={loadAssignOverview}>🔄</button>
                  </div>

                  {assignOverview.sets.length === 0 ? (
                    <div className="quiz-card no-hover rounded-2xl p-8 text-center" style={{ color: 'var(--text-muted)' }}>
                      <div className="text-3xl mb-2">📭</div>
                      ยังไม่มีชุดข้อสอบที่มอบหมาย
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {assignOverview.sets.map(s => {
                        const pctDone = s.assigned > 0 ? Math.round((s.passed / s.assigned) * 100) : 0;
                        return (
                          <div key={s.setId}
                            className="quiz-card no-hover rounded-xl p-3 cursor-pointer transition-all active:scale-[0.98]"
                            onClick={() => loadAssignDetail(s.setId)}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-bold truncate" style={{ color: 'var(--text)', flex: 1 }}>{s.setName}</span>
                              <span className="text-xs font-semibold ml-2 flex-shrink-0" style={{ color: 'var(--accent)' }}>
                                ดูรายละเอียด →
                              </span>
                            </div>
                            <div className="flex gap-3 mb-2 text-xs">
                              <span style={{ color: '#1d4ed8' }}>👥 {s.assigned} คน</span>
                              <span style={{ color: '#16a34a' }}>✅ ผ่าน {s.passed}</span>
                              <span style={{ color: '#d97706' }}>📝 ทำแล้ว {s.completed}</span>
                              <span style={{ color: '#b91c1c' }}>⏳ รอ {s.pending}</span>
                            </div>
                            <div style={{ background: 'var(--progress-trk)', borderRadius: 999, height: 6, overflow: 'hidden' }}>
                              <div style={{ width: `${pctDone}%`, height: '100%', borderRadius: 999,
                                background: pctDone >= 80 ? '#22c55e' : pctDone >= 50 ? '#f59e0b' : '#ef4444',
                                transition: 'width .3s',
                              }} />
                            </div>
                            <div className="text-right text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                              อัตราผ่าน {s.passRate}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Members Tab ───────────────────────────── */}
      {tab === 'members' && (
        <div className="animate-fade">

          {/* Filter / Search / Sync bar */}
          <div className="quiz-card no-hover rounded-2xl p-3 mb-3 space-y-2">

            {/* ช่องค้นหา #10 */}
            <div className="relative">
              <input className="themed-input w-full pr-20" placeholder="🔍 ค้นหา ชื่อ / อีเมล / รหัส / หน่วยงาน..."
                value={memberSearch} onChange={e => setMemberSearch(e.target.value)} />
              {memberSearch && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {filteredMembers.length} คน
                  </span>
                  <button onClick={() => setMemberSearch('')}
                    className="text-xs rounded-full w-4 h-4 flex items-center justify-center"
                    style={{ background: 'var(--text-muted)', color: 'white' }}>✕</button>
                </div>
              )}
            </div>

            {/* Status filter */}
            <div className="flex gap-2 flex-wrap">
              {[
                { val: '',         label: 'ทั้งหมด' },
                { val: 'active',   label: '✅ ใช้งาน' },
                { val: 'pending',  label: '⏳ รออนุมัติ' },
                { val: 'inactive', label: '🚫 ระงับ' },
              ].map(({ val, label }) => (
                <button key={val} onClick={() => setMemberFilter(val)}
                  className="btn text-xs rounded-lg px-3 py-1.5"
                  style={{ background: memberFilter === val ? 'var(--accent)' : 'var(--input-bg)', color: memberFilter === val ? 'white' : 'var(--text-muted)' }}>
                  {label}
                  <span className="ml-1 font-bold">
                    {val === '' ? members.length : members.filter(m => m.status === val).length}
                  </span>
                </button>
              ))}
              <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5 ml-auto" onClick={loadMembers} title="รีเฟรช">🔄</button>
            </div>



            {/* Rich Menu filter */}
            {(() => {
              const usedMenus = allRichMenus.filter(m => members.some(mb => mb.richMenuId === m.richMenuId));
              if (!usedMenus.length) return null;
              return (
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>🎛 กรองตาม Rich Menu</label>
                  <select
                    className="themed-input text-sm"
                    value={richMenuFilter}
                    onChange={e => setRichMenuFilter(e.target.value)}
                  >
                    <option value="">— ทุก Rich Menu —</option>
                    <option value="__none__">ไม่มี Rich Menu ({members.filter(m => !m.richMenuId).length})</option>
                    {usedMenus.map(m => (
                      <option key={m.richMenuId} value={m.richMenuId}>
                        {m.name} ({members.filter(mb => mb.richMenuId === m.richMenuId).length})
                      </option>
                    ))}
                  </select>
                </div>
              );
            })()}

            {/* Profile Sync Trigger status */}
            <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>
              <span className={`status-dot flex-shrink-0 ${triggerStatus?.hasSyncTrigger ? 'green' : 'gray'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {triggerStatus?.hasSyncTrigger ? '⏱ Profile Sync ทุก 10 นาที (ทีละ 100 คน)' : '⚠️ ยังไม่ได้ติดตั้ง Profile Sync Trigger'}
                </div>
                {triggerStatus?.hasSyncTrigger && (
                  <div className="text-xs mt-0.5 space-y-0.5" style={{ color: 'var(--text-muted)' }}>
                    <div>📍 แถวถัดไป: {(triggerStatus.cursor || 0) + 1} / {triggerStatus.total || 0} | batch ล่าสุด: {triggerStatus.lastBatch || 0} | รอบ: {triggerStatus.cyclesDone || 0}</div>
                    <div>🕐 {triggerStatus.lastTime || '-'} | ✅ {triggerStatus.updated || 0} ❌ {triggerStatus.failed || 0}</div>
                  </div>
                )}
              </div>
              {triggerStatus?.hasSyncTrigger
                ? <button className="btn btn-gray text-xs rounded-lg px-2.5 py-1.5 flex-shrink-0" onClick={handleRemoveTrigger}>🗑 ลบ</button>
                : <button className="btn text-xs rounded-lg px-2.5 py-1.5 flex-shrink-0" style={{ background: 'var(--accent)', color: 'white' }} onClick={handleSetupTrigger}>⚡ ติดตั้ง</button>}
            </div>

            {/* Sync button */}
            <button
              className="btn w-full rounded-xl py-2.5 text-sm font-semibold"
              style={{ background: syncing ? 'var(--input-bg)' : '#06C755', color: syncing ? 'var(--text-muted)' : 'white' }}
              onClick={syncAllProfiles} disabled={syncing}>
              {syncing
                ? <span className="flex items-center justify-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    กำลัง Sync LINE Profiles...
                  </span>
                : '📲 Sync ชื่อ+รูป จาก LINE ทันที (200 แถว)'}
            </button>

            <button
              className="btn w-full rounded-xl py-2.5 text-sm font-semibold"
              style={{ background: syncing ? 'var(--input-bg)' : 'var(--accent)', color: syncing ? 'var(--text-muted)' : 'white' }}
              onClick={syncPicOnly} disabled={syncing}>
              {syncing
                ? <span className="flex items-center justify-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    กำลัง Sync รูปโปรไฟล์...
                  </span>
                : '🖼 Sync เฉพาะรูปโปรไฟล์ → คอลัมน์ H (200 แถว)'}
            </button>
          </div>

          {/* ── Bulk Rich Menu ย้ายไป tab 🎛 Rich Menu ──── */}
          {/* ── (ดูโค้ดที่ tab === 'richmenu') ──────────── */}
          {false && (() => {
            const depts     = [...new Set(members.map(m => m.department).filter(Boolean))].sort();
            const usedRmIds = [...new Set(members.map(m => m.richMenuId).filter(Boolean))];
            const usedMenus = allRichMenus.filter(r => usedRmIds.includes(r.richMenuId));
            const targets   = getBulkTargetUsers();
            const bulkCount = targets.length;

            const statusStyle = { active: { bg: '#dcfce7', color: '#15803d', label: 'Active' }, pending: { bg: '#fef9c3', color: '#854d0e', label: 'Pending' }, inactive: { bg: '#fee2e2', color: '#b91c1c', label: 'Inactive' } };

            return (
            <div className="quiz-card no-hover rounded-2xl p-4 space-y-4 animate-slide-up">
              <div className="flex items-center gap-2">
                <span className="text-base">🎛</span>
                <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>กำหนด Rich Menu แบบกลุ่ม</span>
              </div>

              {/* เลือก Rich Menu */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Rich Menu ที่ต้องการกำหนด</div>
                  {rmLoading && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>⏳ กำลังโหลด...</span>}
                  {!rmLoading && allRichMenus.length === 0 && (
                    <button className="text-xs underline" style={{ color: 'var(--accent)' }}
                      onClick={loadAllRichMenus}>🔄 โหลดใหม่</button>
                  )}
                </div>
                {rmLoading ? (
                  <div className="themed-input flex items-center gap-2 opacity-60">
                    <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">กำลังโหลด Rich Menu...</span>
                  </div>
                ) : allRichMenus.length === 0 ? (
                  <div className="themed-input text-sm opacity-60">ไม่พบ Rich Menu — ตรวจสอบ LINE Official Account</div>
                ) : (
                  <RichMenuPicker menus={allRichMenus} value={bulkRmId} onChange={setBulkRmId} />
                )}
              </div>

              {/* ── ตัวกรอง 4 ช่อง ──────────────────────────────── */}
              <div>
                <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>ตัวกรองกลุ่มเป้าหมาย</div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>สถานะ</div>
                    <select className="themed-input w-full text-sm" value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}>
                      <option value="all">ทั้งหมด</option>
                      <option value="active">✅ Active</option>
                      <option value="pending">⏳ Pending</option>
                      <option value="inactive">🚫 Inactive</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>หน่วยงาน</div>
                    <select className="themed-input w-full text-sm" value={bulkDept} onChange={e => setBulkDept(e.target.value)}>
                      <option value="">ทั้งหมด</option>
                      {depts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>หลักสูตร</div>
                    <select className="themed-input w-full text-sm" value={bulkCourse} onChange={e => setBulkCourse(e.target.value)}>
                      <option value="">ทั้งหมด</option>
                      {courses.map(c => <option key={c.courseId} value={c.courseId}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Rich Menu ปัจจุบัน</div>
                    <select className="themed-input w-full text-sm" value={bulkHasMenu} onChange={e => setBulkHasMenu(e.target.value)}>
                      <option value="">ทั้งหมด</option>
                      <option value="none">ยังไม่มี</option>
                      <option value="has">มีแล้ว</option>
                      {usedMenus.map(r => (
                        <option key={r.richMenuId} value={r.richMenuId}>
                          {r.name || r.chatBarText || r.richMenuId.slice(-8)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ค้นหาชื่อ */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>🔍</span>
                  <input
                    className="themed-input w-full text-sm pl-8"
                    placeholder="ค้นหาชื่อ / LINE Display Name / User ID..."
                    value={bulkSearch}
                    onChange={e => setBulkSearch(e.target.value)}
                  />
                  {bulkSearch && (
                    <button className="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-50 hover:opacity-100"
                      onClick={() => setBulkSearch('')}>✕</button>
                  )}
                </div>
              </div>

              {/* แท็กตัวกรองที่เลือก */}
              {(bulkStatus !== 'all' || bulkDept || bulkCourse || bulkHasMenu || bulkSearch) && (
                <div className="flex flex-wrap gap-1.5">
                  {bulkStatus !== 'all' && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(var(--accent-rgb),.12)', color: 'var(--accent)' }}>
                      สถานะ: {bulkStatus}
                      <button onClick={() => setBulkStatus('all')} className="ml-0.5 opacity-60 hover:opacity-100">✕</button>
                    </span>
                  )}
                  {bulkDept && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(var(--accent-rgb),.12)', color: 'var(--accent)' }}>
                      หน่วยงาน: {bulkDept}
                      <button onClick={() => setBulkDept('')} className="ml-0.5 opacity-60 hover:opacity-100">✕</button>
                    </span>
                  )}
                  {bulkCourse && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(var(--accent-rgb),.12)', color: 'var(--accent)' }}>
                      หลักสูตร: {courses.find(c => c.courseId === bulkCourse)?.name || bulkCourse}
                      <button onClick={() => setBulkCourse('')} className="ml-0.5 opacity-60 hover:opacity-100">✕</button>
                    </span>
                  )}
                  {bulkHasMenu && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(var(--accent-rgb),.12)', color: 'var(--accent)' }}>
                      RM: {bulkHasMenu === 'none' ? 'ยังไม่มี' : bulkHasMenu === 'has' ? 'มีแล้ว' : (allRichMenus.find(r => r.richMenuId === bulkHasMenu)?.name || bulkHasMenu.slice(-8))}
                      <button onClick={() => setBulkHasMenu('')} className="ml-0.5 opacity-60 hover:opacity-100">✕</button>
                    </span>
                  )}
                  {bulkSearch && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(var(--accent-rgb),.12)', color: 'var(--accent)' }}>
                      ค้นหา: "{bulkSearch}"
                      <button onClick={() => setBulkSearch('')} className="ml-0.5 opacity-60 hover:opacity-100">✕</button>
                    </span>
                  )}
                </div>
              )}

              {/* ── รายชื่อ user ที่ตรงกับเงื่อนไข (Preview) ─────── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>กลุ่มเป้าหมาย</span>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full"
                    style={{ background: bulkCount > 0 ? 'rgba(var(--accent-rgb),.15)' : 'var(--input-bg)', color: bulkCount > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
                    {bulkCount} คน
                  </span>
                </div>

                {bulkCount === 0 ? (
                  <div className="text-center text-sm py-6 rounded-xl" style={{ background: 'var(--input-bg)', color: 'var(--text-muted)' }}>
                    ไม่พบสมาชิกที่ตรงกับเงื่อนไข
                  </div>
                ) : (
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--input-border)' }}>
                    {/* header row */}
                    <div className="grid text-xs font-semibold px-3 py-2"
                      style={{ gridTemplateColumns: '32px 1fr auto', background: 'var(--input-bg)', color: 'var(--text-muted)', borderBottom: '1px solid var(--input-border)' }}>
                      <span />
                      <span>ชื่อ</span>
                      <span>RM ปัจจุบัน</span>
                    </div>

                    {/* scrollable list */}
                    <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                      {targets.map((m, i) => {
                        const st  = statusStyle[m.status] || { bg: 'var(--input-bg)', color: 'var(--text-muted)', label: m.status };
                        const rmName = m.richMenuId
                          ? (allRichMenus.find(r => r.richMenuId === m.richMenuId)?.name || m.richMenuId.slice(-8))
                          : null;
                        return (
                          <div key={m.lineUserId}
                            className="grid items-center gap-2 px-3 py-2 text-xs"
                            style={{
                              gridTemplateColumns: '32px 1fr auto',
                              borderBottom: i < targets.length - 1 ? '1px solid var(--input-border)' : 'none',
                              background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,.02)',
                            }}>
                            {/* avatar */}
                            <img src={m.pictureUrl || FALLBACK_AVATAR}
                              alt="" loading="lazy" decoding="async"
                              className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                            {/* name block */}
                            <div className="min-w-0">
                              <div className="font-semibold truncate" style={{ color: 'var(--text)' }}>
                                {m.fullName || m.displayName}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="px-1.5 py-0 rounded-full font-medium"
                                  style={{ background: st.bg, color: st.color, fontSize: 10 }}>{st.label}</span>
                                {m.department && <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>🏢 {m.department}</span>}
                                {m.studentId  && <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>📚 {m.studentId}</span>}
                              </div>
                            </div>
                            {/* current RM */}
                            <div className="text-right flex-shrink-0">
                              {rmName
                                ? <span className="px-1.5 py-0.5 rounded-full font-medium"
                                    style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: 10 }}>{rmName}</span>
                                : <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>—</span>
                              }
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <button
                className="btn w-full rounded-xl py-2.5 text-sm font-semibold"
                style={{ background: (bulkAssigning || !bulkRmId || bulkCount === 0) ? 'var(--input-bg)' : 'var(--accent)',
                         color: (bulkAssigning || !bulkRmId || bulkCount === 0) ? 'var(--text-muted)' : 'white' }}
                onClick={handleBulkAssign}
                disabled={bulkAssigning || !bulkRmId || bulkCount === 0}>
                {bulkAssigning
                  ? <span className="flex items-center justify-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      กำลังกำหนด Rich Menu...
                    </span>
                  : `🎛 กำหนดให้ ${bulkCount} คน`}
              </button>
            </div>
            );
          })()}

          {/* ── Batch Action Bar ────────── */}
          {(() => {
            const pendingCount = members.filter(m => m.status === 'pending').length;
            return (
              <div className="quiz-card no-hover rounded-2xl p-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Toggle batch mode */}
                  <button className="btn text-xs rounded-lg px-3 py-1.5"
                    style={{ background: batchSelecting ? 'var(--accent)' : 'var(--input-bg)', color: batchSelecting ? 'white' : 'var(--text-muted)' }}
                    onClick={() => { setBatchSelecting(!batchSelecting); setBatchSelected(new Set()); }}>
                    {batchSelecting ? '✕ ยกเลิก' : '☑ เลือกหลายคน'}
                  </button>

                  {/* Quick: Approve all pending */}
                  {!batchSelecting && pendingCount > 0 && (
                    <button className="btn text-xs rounded-lg px-3 py-1.5"
                      style={{ background: '#dcfce7', color: '#15803d' }}
                      onClick={async () => {
                        const ids = members.filter(m => m.status === 'pending').map(m => m.lineUserId);
                        setBatchSelected(new Set(ids));
                        const r = await Swal.fire({ title: `อนุมัติสมาชิกรอดำเนินการ ${ids.length} คน?`, icon: 'question', showCancelButton: true, confirmButtonText: 'อนุมัติทั้งหมด', cancelButtonText: 'ยกเลิก', confirmButtonColor: '#16a34a' });
                        if (!r.isConfirmed) { setBatchSelected(new Set()); return; }
                        setBatchProcessing(true);
                        try {
                          const data = await apiPost({ action: 'bulkUpdateMembers', callerUserId: profile.userId, userIds: ids, newStatus: 'active' });
                          if (!data.success) throw new Error(data.message);
                          lsInvalidate('getMembersWithProfiles');
                          await loadMembers();
                          setBatchSelected(new Set());
                          Swal.fire({ icon: 'success', title: `อนุมัติสำเร็จ ${data.updated} คน`, timer: 1800, showConfirmButton: false });
                        } catch (e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error'); }
                        finally { setBatchProcessing(false); }
                      }}
                      disabled={batchProcessing}>
                      ✅ อนุมัติทั้งหมด ({pendingCount})
                    </button>
                  )}

                  {/* Batch actions when selecting */}
                  {batchSelecting && batchSelected.size > 0 && (
                    <>
                      <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>เลือก {batchSelected.size} คน</span>
                      <button className="btn text-xs rounded-lg px-2.5 py-1.5"
                        style={{ background: '#dcfce7', color: '#15803d' }}
                        onClick={() => handleBatchStatus('active')} disabled={batchProcessing}>✅ อนุมัติ</button>
                      <button className="btn text-xs rounded-lg px-2.5 py-1.5"
                        style={{ background: '#fee2e2', color: '#b91c1c' }}
                        onClick={() => handleBatchStatus('inactive')} disabled={batchProcessing}>🚫 ระงับ</button>
                      <button className="btn text-xs rounded-lg px-2.5 py-1.5"
                        style={{ background: '#ede9fe', color: '#7c3aed' }}
                        onClick={() => handleBatchRole('teacher')} disabled={batchProcessing}>🎓 ตั้งเป็นครู</button>
                      <button className="btn text-xs rounded-lg px-2.5 py-1.5"
                        style={{ background: '#fef3c7', color: '#92400e' }}
                        onClick={() => handleBatchRole('')} disabled={batchProcessing}>👤 ตั้งเป็นสมาชิก</button>
                    </>
                  )}

                  {/* Select all visible */}
                  {batchSelecting && (
                    <button className="btn btn-gray text-xs rounded-lg px-2.5 py-1.5 ml-auto"
                      onClick={() => {
                        if (batchSelected.size === pagedMembers.length) setBatchSelected(new Set());
                        else setBatchSelected(new Set(pagedMembers.map(m => m.lineUserId)));
                      }}>
                      {batchSelected.size === pagedMembers.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหน้า'}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Member Cards */}
          {loading ? <Spinner label="กำลังโหลด..." /> : (
            <div className="space-y-2 mb-2">
              {filteredMembers.length === 0 ? (
                <div className="quiz-card no-hover rounded-2xl p-8 text-center" style={{ color: 'var(--text-muted)' }}>
                  {memberSearch ? 'ไม่พบสมาชิกที่ค้นหา' : 'ไม่มีสมาชิก'}
                </div>
              ) : pagedMembers.map(m => {
                const st  = STATUS_LABEL[m.status] || STATUS_LABEL.inactive;
                const pic = m.pictureUrl || '';
                const isChecked = batchSelected.has(m.lineUserId);

                return (
                  <div key={m.lineUserId}
                    className="quiz-card rounded-xl p-3 sm:p-4 flex items-center gap-3 cursor-pointer transition-all hover:shadow-md active:scale-[.98]"
                    style={isChecked ? { border: '2px solid var(--accent)', background: 'var(--input-bg)' } : {}}
                    onClick={() => {
                      if (batchSelecting) {
                        setBatchSelected(prev => { const s = new Set(prev); s.has(m.lineUserId) ? s.delete(m.lineUserId) : s.add(m.lineUserId); return s; });
                      } else {
                        setSelectedMember(m);
                      }
                    }}>

                    {/* Checkbox in batch mode */}
                    {batchSelecting && (
                      <input type="checkbox" checked={isChecked} readOnly
                        style={{ width: 18, height: 18, accentColor: 'var(--accent)', flexShrink: 0 }} />
                    )}

                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      {pic
                        ? <img src={pic} alt="avatar" className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover shadow"
                            onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                        : null}
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full items-center justify-center text-2xl shadow"
                        style={{ background: 'var(--input-bg)', display: pic ? 'none' : 'flex' }}>👤</div>
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white"
                        style={{ background: m.lineFound ? '#06C755' : '#94a3b8' }} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm truncate" style={{ color: 'var(--text)' }}>
                          {m.fullName || m.displayName}
                        </span>
                        {m.role === 'admin' && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
                            style={{ background: '#fef9c3', color: '#854d0e' }}>👑</span>
                        )}
                        {m.role === 'teacher' && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
                            style={{ background: '#ede9fe', color: '#7c3aed' }}>🎓</span>
                        )}
                      </div>
                      {m.lineDisplayName && m.lineDisplayName !== m.fullName && (
                        <div className="flex items-center gap-1 text-xs">
                          {LINE_ICON}
                          <span style={{ color: '#06C755' }}>{m.lineDisplayName}</span>
                        </div>
                      )}
                      <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                        {m.studentId ? `#${m.studentId} • ` : ''}{m.email || m.phone || 'ไม่ระบุ'}
                      </div>
                    </div>

                    {/* Status + quick action */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: st.bg, color: st.color }}>{st.label}</span>
                      {!batchSelecting && m.status === 'pending' && (
                        <button className="text-xs px-2 py-0.5 rounded-lg font-semibold"
                          style={{ background: '#dcfce7', color: '#15803d', border: 'none', cursor: 'pointer' }}
                          onClick={e => { e.stopPropagation(); (async () => {
                            try {
                              const data = await apiPost({ action: 'updateMember', callerUserId: profile.userId, targetUserId: m.lineUserId, newStatus: 'active' });
                              if (!data.success) throw new Error(data.message);
                              lsInvalidate('getMembersWithProfiles');
                              loadMembers();
                              Swal.fire({ icon: 'success', title: 'อนุมัติแล้ว!', timer: 1200, showConfirmButton: false });
                            } catch (err) { Swal.fire('เกิดข้อผิดพลาด', err.message, 'error'); }
                          })(); }}>
                          ✅ อนุมัติ
                        </button>
                      )}
                      {!batchSelecting && m.status !== 'pending' && (
                        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>›</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Paginator สมาชิก */}
          {!loading && filteredMembers.length > MEMBER_PAGE_SIZE && (
            <Paginator
              page={memberPage}
              totalItems={filteredMembers.length}
              pageSize={MEMBER_PAGE_SIZE}
              onPage={p => { setMemberPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            />
          )}
        </div>
      )}

      {/* ══ Rich Menu Tab ══════════════════════════ */}
      {tab === 'richmenu' && (
        <div className="animate-fade space-y-4">

          {/* ── รายชื่อ Rich Menu ทั้งหมด ─────────────── */}
          <div className="quiz-card no-hover rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📋</span>
                <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>Rich Menu ทั้งหมด ({allRichMenus.length})</span>
              </div>
              <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5"
                onClick={loadAllRichMenus} disabled={rmLoading}>
                {rmLoading
                  ? <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"/>โหลด...</span>
                  : '🔄 รีเฟรช'}
              </button>
            </div>
            {rmLoading ? (
              <div className="flex items-center gap-2 py-4 justify-center opacity-50">
                <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/>
                <span className="text-sm">กำลังโหลด...</span>
              </div>
            ) : allRichMenus.length === 0 ? (
              <div className="text-center py-6 text-sm rounded-xl" style={{ background: 'var(--input-bg)', color: 'var(--text-muted)' }}>
                ไม่พบ Rich Menu — ตรวจสอบ LINE Official Account
              </div>
            ) : (
              <div className="space-y-2">
                {allRichMenus.map(rm => {
                  const userCount = members.filter(m => m.richMenuId === rm.richMenuId).length;
                  return (
                    <div key={rm.richMenuId}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>
                      <span className="text-lg flex-shrink-0">🎛</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>
                          {rm.name || rm.chatBarText || '(ไม่มีชื่อ)'}
                        </div>
                        <div className="text-xs font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                          {rm.richMenuId}
                        </div>
                      </div>
                      <span className="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ background: userCount > 0 ? 'rgba(var(--accent-rgb),.12)' : 'var(--input-bg)', color: userCount > 0 ? 'var(--accent)' : 'var(--text-muted)', border: '1px solid var(--input-border)' }}>
                        {userCount} คน
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Auto Sync Trigger ────────────────────── */}
          <div className="quiz-card no-hover rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">⏱</span>
              <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>Auto Sync Rich Menu</span>
            </div>
            <div className="rounded-xl p-3 flex items-center gap-3 mb-3" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>
              <span className={`status-dot flex-shrink-0 ${rmSyncStatus?.hasRmTrigger ? 'blue' : 'gray'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {rmSyncStatus?.hasRmTrigger ? '🎛 Rich Menu Sync ทุก 10 นาที (ทีละ 100 คน)' : '⚠️ ยังไม่ได้ติดตั้ง Rich Menu Sync'}
                </div>
                {rmSyncStatus?.hasRmTrigger && (
                  <div className="text-xs mt-0.5 space-y-0.5" style={{ color: 'var(--text-muted)' }}>
                    <div>📍 แถวถัดไป: {rmSyncStatus.cursor + 1} / {rmSyncStatus.total} | batch ล่าสุด: {rmSyncStatus.lastBatch} | รอบ: {rmSyncStatus.cyclesDone}</div>
                    <div>🕐 {rmSyncStatus.lastTime} | ✅ {rmSyncStatus.updated} 🚫 {rmSyncStatus.noMenu} ❌ {rmSyncStatus.failed}</div>
                  </div>
                )}
              </div>
              <div className="flex-shrink-0">
                {rmSyncStatus?.hasRmTrigger
                  ? <button className="btn btn-gray text-xs rounded-lg px-2.5 py-1.5" onClick={handleRemoveRmTrigger}>🗑 ลบ</button>
                  : <button className="btn text-xs rounded-lg px-2.5 py-1.5" style={{ background: '#3b82f6', color: 'white' }} onClick={handleSetupRmTrigger}>⚡ ติดตั้ง</button>}
              </div>
            </div>
          </div>

          {/* ── กำหนด Rich Menu แบบกลุ่ม ─────────────── */}
          {(() => {
            const depts     = [...new Set(members.map(m => m.department).filter(Boolean))].sort();
            const usedRmIds = [...new Set(members.map(m => m.richMenuId).filter(Boolean))];
            const usedMenus = allRichMenus.filter(r => usedRmIds.includes(r.richMenuId));
            const targets   = getBulkTargetUsers();
            const bulkCount = targets.length;
            const statusStyle = { active: { bg: '#dcfce7', color: '#15803d', label: 'Active' }, pending: { bg: '#fef9c3', color: '#854d0e', label: 'Pending' }, inactive: { bg: '#fee2e2', color: '#b91c1c', label: 'Inactive' } };
            return (
            <div className="quiz-card no-hover rounded-2xl p-4 space-y-4 animate-slide-up">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎯</span>
                <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>กำหนด Rich Menu แบบกลุ่ม</span>
              </div>

              {/* เลือก Rich Menu */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Rich Menu ที่ต้องการกำหนด</div>
                  {rmLoading && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>⏳ กำลังโหลด...</span>}
                  {!rmLoading && allRichMenus.length === 0 && (
                    <button className="text-xs underline" style={{ color: 'var(--accent)' }} onClick={loadAllRichMenus}>🔄 โหลดใหม่</button>
                  )}
                </div>
                {rmLoading ? (
                  <div className="themed-input flex items-center gap-2 opacity-60">
                    <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">กำลังโหลด Rich Menu...</span>
                  </div>
                ) : allRichMenus.length === 0 ? (
                  <div className="themed-input text-sm opacity-60">ไม่พบ Rich Menu — ตรวจสอบ LINE Official Account</div>
                ) : (
                  <RichMenuPicker menus={allRichMenus} value={bulkRmId} onChange={setBulkRmId} />
                )}
              </div>

              {/* ── ตัวกรอง ─────────────────────────────── */}
              <div>
                <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>ตัวกรองกลุ่มเป้าหมาย</div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>สถานะ</div>
                    <select className="themed-input w-full text-sm" value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}>
                      <option value="all">ทั้งหมด</option>
                      <option value="active">✅ Active</option>
                      <option value="pending">⏳ Pending</option>
                      <option value="inactive">🚫 Inactive</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>หน่วยงาน</div>
                    <select className="themed-input w-full text-sm" value={bulkDept} onChange={e => setBulkDept(e.target.value)}>
                      <option value="">ทั้งหมด</option>
                      {depts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>หลักสูตร</div>
                    <select className="themed-input w-full text-sm" value={bulkCourse} onChange={e => setBulkCourse(e.target.value)}>
                      <option value="">ทั้งหมด</option>
                      {courses.map(c => <option key={c.courseId} value={c.courseId}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Rich Menu ปัจจุบัน</div>
                    <select className="themed-input w-full text-sm" value={bulkHasMenu} onChange={e => setBulkHasMenu(e.target.value)}>
                      <option value="">ทั้งหมด</option>
                      <option value="none">ยังไม่มี</option>
                      <option value="has">มีแล้ว</option>
                      {usedMenus.map(r => (
                        <option key={r.richMenuId} value={r.richMenuId}>
                          {r.name || r.chatBarText || r.richMenuId.slice(-8)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ค้นหาชื่อ */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>🔍</span>
                  <input className="themed-input w-full text-sm pl-8"
                    placeholder="ค้นหาชื่อ / LINE Display Name / User ID..."
                    value={bulkSearch} onChange={e => setBulkSearch(e.target.value)} />
                  {bulkSearch && (
                    <button className="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-50 hover:opacity-100"
                      onClick={() => setBulkSearch('')}>✕</button>
                  )}
                </div>
              </div>

              {/* แท็กตัวกรองที่เลือก */}
              {(bulkStatus !== 'all' || bulkDept || bulkCourse || bulkHasMenu || bulkSearch) && (
                <div className="flex flex-wrap gap-1.5">
                  {bulkStatus !== 'all' && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(var(--accent-rgb),.12)', color: 'var(--accent)' }}>
                      สถานะ: {bulkStatus}
                      <button onClick={() => setBulkStatus('all')} className="ml-0.5 opacity-60 hover:opacity-100">✕</button>
                    </span>
                  )}
                  {bulkDept && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(var(--accent-rgb),.12)', color: 'var(--accent)' }}>
                      หน่วยงาน: {bulkDept}
                      <button onClick={() => setBulkDept('')} className="ml-0.5 opacity-60 hover:opacity-100">✕</button>
                    </span>
                  )}
                  {bulkCourse && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(var(--accent-rgb),.12)', color: 'var(--accent)' }}>
                      หลักสูตร: {courses.find(c => c.courseId === bulkCourse)?.name || bulkCourse}
                      <button onClick={() => setBulkCourse('')} className="ml-0.5 opacity-60 hover:opacity-100">✕</button>
                    </span>
                  )}
                  {bulkHasMenu && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(var(--accent-rgb),.12)', color: 'var(--accent)' }}>
                      RM: {bulkHasMenu === 'none' ? 'ยังไม่มี' : bulkHasMenu === 'has' ? 'มีแล้ว' : (allRichMenus.find(r => r.richMenuId === bulkHasMenu)?.name || bulkHasMenu.slice(-8))}
                      <button onClick={() => setBulkHasMenu('')} className="ml-0.5 opacity-60 hover:opacity-100">✕</button>
                    </span>
                  )}
                  {bulkSearch && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(var(--accent-rgb),.12)', color: 'var(--accent)' }}>
                      ค้นหา: "{bulkSearch}"
                      <button onClick={() => setBulkSearch('')} className="ml-0.5 opacity-60 hover:opacity-100">✕</button>
                    </span>
                  )}
                </div>
              )}

              {/* ── รายชื่อ user ที่ตรงกับเงื่อนไข ──────── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>กลุ่มเป้าหมาย</span>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full"
                    style={{ background: bulkCount > 0 ? 'rgba(var(--accent-rgb),.15)' : 'var(--input-bg)', color: bulkCount > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
                    {bulkCount} คน
                  </span>
                </div>

                {bulkCount === 0 ? (
                  <div className="text-center text-sm py-6 rounded-xl" style={{ background: 'var(--input-bg)', color: 'var(--text-muted)' }}>
                    ไม่พบสมาชิกที่ตรงกับเงื่อนไข
                  </div>
                ) : (
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--input-border)' }}>
                    <div className="grid text-xs font-semibold px-3 py-2"
                      style={{ gridTemplateColumns: '32px 1fr auto', background: 'var(--input-bg)', color: 'var(--text-muted)', borderBottom: '1px solid var(--input-border)' }}>
                      <span />
                      <span>ชื่อ</span>
                      <span>RM ปัจจุบัน</span>
                    </div>
                    <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                      {targets.map((m, i) => {
                        const st = statusStyle[m.status] || { bg: 'var(--input-bg)', color: 'var(--text-muted)', label: m.status };
                        const rmName = m.richMenuId
                          ? (allRichMenus.find(r => r.richMenuId === m.richMenuId)?.name || m.richMenuId.slice(-8))
                          : null;
                        return (
                          <div key={m.lineUserId}
                            className="grid items-center gap-2 px-3 py-2 text-xs"
                            style={{ gridTemplateColumns: '32px 1fr auto', borderBottom: i < targets.length - 1 ? '1px solid var(--input-border)' : 'none', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,.02)' }}>
                            <img src={m.pictureUrl || FALLBACK_AVATAR}
                              alt="" loading="lazy" decoding="async"
                              className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="font-semibold truncate" style={{ color: 'var(--text)' }}>{m.fullName || m.displayName}</div>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="px-1.5 py-0 rounded-full font-medium"
                                  style={{ background: st.bg, color: st.color, fontSize: 10 }}>{st.label}</span>
                                {m.department && <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>🏢 {m.department}</span>}
                                {m.studentId  && <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>📚 {m.studentId}</span>}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              {rmName
                                ? <span className="px-1.5 py-0.5 rounded-full font-medium"
                                    style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: 10 }}>{rmName}</span>
                                : <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>—</span>
                              }
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* ปุ่มกำหนด */}
              <button
                className="btn w-full rounded-xl py-2.5 text-sm font-semibold"
                style={{ background: (bulkAssigning || !bulkRmId || bulkCount === 0) ? 'var(--input-bg)' : 'var(--accent)',
                         color: (bulkAssigning || !bulkRmId || bulkCount === 0) ? 'var(--text-muted)' : 'white' }}
                onClick={handleBulkAssign}
                disabled={bulkAssigning || !bulkRmId || bulkCount === 0}>
                {bulkAssigning
                  ? <span className="flex items-center justify-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      กำลังกำหนด Rich Menu...
                    </span>
                  : `🎛 กำหนดให้ ${bulkCount} คน`}
              </button>
            </div>
            );
          })()}

        </div>
      )}

      {/* ── Results Tab ───────────────────────────── */}
      {tab === 'results' && (
        <div className="animate-fade">
          <div className="quiz-card no-hover rounded-2xl p-2 sm:p-3 mb-3 flex gap-2">
            <div className="relative flex-1">
              <input className="themed-input w-full pr-16" placeholder="🔍 ค้นหาชื่อ / วิชา / หน่วยงาน..."
                value={resultSearch} onChange={e => setResultSearch(e.target.value)} />
              {resultSearch && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {filteredResults.length} รายการ
                </span>
              )}
            </div>
            <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5" onClick={() => loadResults(0)}>🔄</button>
            <button
              className="btn text-xs rounded-lg px-3 py-1.5 flex items-center gap-1.5"
              style={{ background: exporting ? 'var(--input-bg)' : '#16a34a', color: exporting ? 'var(--text-muted)' : 'white' }}
              onClick={handleExportCSV} disabled={exporting}>
              {exporting
                ? <><span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"/>รอ...</>
                : <>📥 Export CSV</>}
            </button>
          </div>
          <div className="text-xs mb-2 text-right" style={{ color: 'var(--text-muted)' }}>ทั้งหมด {resultTotal} รายการ</div>

          {loading ? <Spinner label="กำลังโหลด..." /> : (
            <>
              <div className="space-y-2 mb-4">
                {filteredResults.length === 0 ? (
                  <div className="quiz-card no-hover rounded-2xl p-8 text-center" style={{ color: 'var(--text-muted)' }}>ไม่มีข้อมูล</div>
                ) : filteredResults.map(r => {
                  const pct  = parseInt(r.pct);
                  const pass = r.pass === 'ผ่าน';
                  return (
                    <div key={r.examId} className="quiz-card no-hover rounded-xl p-2 sm:p-3" style={{ cursor: 'default' }}>
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <span className="font-semibold text-xs sm:text-sm truncate" style={{ color: 'var(--text)' }}>{r.name}</span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{ background: pass ? '#dcfce7' : '#fee2e2', color: pass ? '#15803d' : '#b91c1c' }}>
                            {pass ? '✅ ผ่าน' : '❌ ไม่ผ่าน'}
                          </span>
                          {r.suspicious && r.suspicious.includes('suspicious') && (
                            <span className="text-xs px-1.5 py-0.5 rounded font-bold"
                              style={{ background:'#fef3c7', color:'#92400e' }}>⚠️</span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs mb-1" style={{ color: 'var(--accent)' }}>{r.lesson}</div>
                      <div className="flex items-center gap-3">
                        <span className="text-base sm:text-xl font-black flex-shrink-0"
                          style={{ color: pass ? '#16a34a' : '#ef4444' }}>{pct}%</span>
                        <div className="flex-1">
                          <div style={{ background: 'var(--progress-trk)', borderRadius: 999, height: 5, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: pass ? '#22c55e' : '#ef4444', borderRadius: 999 }} />
                          </div>
                        </div>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.score}/{r.total} • {r.date}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {resultTotal > 50 && (
                <div className="flex gap-2 justify-center mb-4">
                  <button className="btn btn-gray text-xs rounded-lg px-4 py-2"
                    disabled={resultPage === 0} onClick={() => loadResults(resultPage - 1)}>← ก่อนหน้า</button>
                  <span className="text-sm py-2" style={{ color: 'var(--text-muted)' }}>หน้า {resultPage + 1}</span>
                  <button className="btn btn-gray text-xs rounded-lg px-4 py-2"
                    disabled={(resultPage + 1) * 50 >= resultTotal} onClick={() => loadResults(resultPage + 1)}>ถัดไป →</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Message Inbox Tab ─────────────────────────────── */}
      {tab === 'inbox' && <MessageInboxScreen />}

      {/* ── Courses Tab ───────────────────────────────────── */}
      {tab === 'courses' && (
        <CourseManager callerUserId={profile.userId} />
      )}

      {/* ── Lessons Tab ──────────────────────────────────── */}
      {tab === 'lessons' && (
        <LessonManager callerUserId={profile.userId} />
      )}

      {/* ── Subjects Tab ──────────────────────────────────── */}
      {tab === 'subjects' && (
        <SubjectManager callerUserId={profile.userId} />
      )}

      {/* ── Analytics Tab ────────────────────────────────── */}
      {tab === 'analytics' && (
        <div className="animate-fade space-y-4">
          {/* Header */}
          <div className="quiz-card no-hover rounded-2xl p-4">
            <h2 className="font-bold text-base mb-1" style={{ color: 'var(--text)' }}>🔬 วิเคราะห์รายบุคคล (Individual Analytics)</h2>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>ข้อมูลเชิงลึกระดับงานวิจัย — Descriptive Statistics, Trend, Regression, Z-Score, Percentile</p>

            {/* Export buttons */}
            <div className="flex gap-2 mb-4">
              <button className="btn btn-primary rounded-xl py-2 px-4 text-xs flex-1"
                disabled={researchExporting} onClick={exportResearchData}>
                {researchExporting ? '⏳...' : '📊 Export JSON (วิจัย)'}
              </button>
              <button className="btn btn-green rounded-xl py-2 px-4 text-xs flex-1"
                disabled={researchExporting} onClick={exportResearchCSV}>
                {researchExporting ? '⏳...' : '📄 Export CSV (SPSS)'}
              </button>
            </div>

            {/* Search member */}
            <input className="themed-input w-full text-sm" placeholder="🔍 ค้นหาชื่อสมาชิก..."
              value={analyticsSearch} onChange={e => setAnalyticsSearch(e.target.value)} />
          </div>

          {/* Member list */}
          {!analyticsData && analyticsMembers && (
            <div className="quiz-card no-hover rounded-2xl p-4">
              <div className="text-xs font-bold mb-3" style={{ color: 'var(--text-muted)' }}>เลือกสมาชิกเพื่อดูวิเคราะห์</div>
              <div className="space-y-2" style={{ maxHeight: 400, overflowY: 'auto' }}>
                {analyticsMembers
                  .filter(m => !analyticsSearch.trim() || (m.displayName||'').includes(analyticsSearch) || (m.fullName||'').includes(analyticsSearch))
                  .slice(0, 50)
                  .map(m => (
                    <div key={m.lineUserId} className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer"
                      style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', transition: 'all .12s' }}
                      onClick={() => loadIndividualAnalytics(m.lineUserId)}>
                      <img src={m.pictureUrl || FALLBACK_AVATAR}
                        alt="" loading="lazy" decoding="async"
                        className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{m.fullName || m.displayName}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.department || ''} {m.course || ''}</div>
                      </div>
                      <span style={{ color: 'var(--accent)', fontSize: 16 }}>›</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Loading */}
          {analyticsLoading && (
            <div className="quiz-card no-hover rounded-2xl p-8 text-center">
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>กำลังวิเคราะห์ข้อมูล...</div>
            </div>
          )}

          {/* Analytics Result */}
          {analyticsData && !analyticsLoading && (() => {
            const d = analyticsData;
            const s = d.stats;
            const c = d.comparison;
            const p = d.profile;
            if (!s || s.totalAttempts === 0) return (
              <div className="quiz-card no-hover rounded-2xl p-6 text-center">
                <div className="text-3xl mb-2">📭</div>
                <div className="font-bold" style={{ color: 'var(--text)' }}>{p.fullName || p.displayName}</div>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>ยังไม่มีข้อมูลการสอบ</div>
                <button className="btn btn-gray rounded-xl py-2 px-6 text-xs mt-3" onClick={() => setAnalyticsData(null)}>← กลับ</button>
              </div>
            );
            return (
              <>
                {/* Profile Card */}
                <div className="quiz-card no-hover rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <img src={p.pictureUrl || FALLBACK_AVATAR}
                      alt="" className="w-14 h-14 rounded-full object-cover" style={{ border: '3px solid var(--accent)' }} />
                    <div className="flex-1">
                      <div className="font-bold text-base" style={{ color: 'var(--text)' }}>{p.fullName || p.displayName}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.department} • {p.course} • {p.email}</div>
                    </div>
                    <button className="btn btn-gray rounded-lg py-1.5 px-3 text-xs" onClick={() => setAnalyticsData(null)}>← กลับ</button>
                  </div>
                </div>

                {/* ── Descriptive Statistics ── */}
                <div className="quiz-card no-hover rounded-2xl p-4">
                  <div className="font-bold text-sm mb-3" style={{ color: 'var(--text)' }}>📊 สถิติเชิงพรรณนา (Descriptive Statistics)</div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { label: 'N (จำนวนครั้ง)', value: s.totalAttempts, color: 'var(--accent)' },
                      { label: 'Mean (ค่าเฉลี่ย)', value: s.avgScore + '%', color: '#3b82f6' },
                      { label: 'Median (มัธยฐาน)', value: s.median + '%', color: '#8b5cf6' },
                      { label: 'S.D. (ส่วนเบี่ยงเบน)', value: s.stdDev, color: '#f59e0b' },
                      { label: 'Max (สูงสุด)', value: s.bestScore + '%', color: '#16a34a' },
                      { label: 'Min (ต่ำสุด)', value: s.worstScore + '%', color: '#ef4444' },
                      { label: 'Q1', value: s.q1, color: '#06b6d4' },
                      { label: 'Q3', value: s.q3, color: '#06b6d4' },
                      { label: 'IQR', value: s.iqr, color: '#d97706' },
                    ].map((item, i) => (
                      <div key={i} className="rounded-xl p-2.5 text-center" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>
                        <div className="text-lg font-black" style={{ color: item.color }}>{item.value}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)', fontSize: 9 }}>{item.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl p-2.5" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                      <div className="text-xs font-bold" style={{ color: '#1d4ed8' }}>Pass Rate</div>
                      <div className="text-xl font-black" style={{ color: '#1d4ed8' }}>{s.passRate}%</div>
                      <div className="text-xs" style={{ color: '#3b82f6' }}>ผ่าน {s.passes} / ไม่ผ่าน {s.fails}</div>
                    </div>
                    <div className="rounded-xl p-2.5" style={{ background: s.trend === 'improving' ? '#f0fdf4' : s.trend === 'declining' ? '#fef2f2' : '#f8fafc', border: `1px solid ${s.trend === 'improving' ? '#bbf7d0' : s.trend === 'declining' ? '#fca5a5' : '#e2e8f0'}` }}>
                      <div className="text-xs font-bold" style={{ color: s.trend === 'improving' ? '#16a34a' : s.trend === 'declining' ? '#dc2626' : '#64748b' }}>Trend</div>
                      <div className="text-xl font-black" style={{ color: s.trend === 'improving' ? '#16a34a' : s.trend === 'declining' ? '#dc2626' : '#64748b' }}>
                        {s.trend === 'improving' ? '📈 ดีขึ้น' : s.trend === 'declining' ? '📉 ลดลง' : '➡️ คงที่'}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>slope: {s.trendSlope}/ครั้ง</div>
                    </div>
                  </div>
                </div>

                {/* ── Comparison with Population ── */}
                <div className="quiz-card no-hover rounded-2xl p-4">
                  <div className="font-bold text-sm mb-3" style={{ color: 'var(--text)' }}>📐 เปรียบเทียบกับประชากร (Population Comparison)</div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="rounded-xl p-3 text-center" style={{ background: '#faf5ff', border: '1px solid #e9d5ff' }}>
                      <div className="text-xs font-bold" style={{ color: '#7c3aed' }}>Z-Score</div>
                      <div className="text-2xl font-black" style={{ color: c.zScore >= 0 ? '#16a34a' : '#ef4444' }}>{c.zScore > 0 ? '+' : ''}{c.zScore}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.zScore > 1 ? 'สูงกว่าค่าเฉลี่ยมาก' : c.zScore > 0 ? 'สูงกว่าค่าเฉลี่ย' : c.zScore > -1 ? 'ต่ำกว่าค่าเฉลี่ย' : 'ต่ำกว่าค่าเฉลี่ยมาก'}</div>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ background: '#fefce8', border: '1px solid #fde68a' }}>
                      <div className="text-xs font-bold" style={{ color: '#a16207' }}>Percentile</div>
                      <div className="text-2xl font-black" style={{ color: '#a16207' }}>P{c.percentile}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>ดีกว่า {c.percentile}% ของทั้งหมด</div>
                    </div>
                  </div>
                  <div className="rounded-xl p-2.5 text-xs" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-muted)' }}>
                    ค่าเฉลี่ยประชากร: <b>{c.populationAvg}%</b> • S.D.: <b>{c.populationStdDev}</b> • N: <b>{c.totalPopulation}</b>
                  </div>
                </div>

                {/* ── Time Analysis ── */}
                <div className="quiz-card no-hover rounded-2xl p-4">
                  <div className="font-bold text-sm mb-3" style={{ color: 'var(--text)' }}>⏱ การใช้เวลา (Time Analysis)</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'เฉลี่ย', value: `${Math.floor(s.avgTime/60)}:${String(s.avgTime%60).padStart(2,'0')}`, color: '#3b82f6' },
                      { label: 'เร็วสุด', value: `${Math.floor(s.fastestTime/60)}:${String(s.fastestTime%60).padStart(2,'0')}`, color: '#16a34a' },
                      { label: 'ช้าสุด', value: `${Math.floor(s.slowestTime/60)}:${String(s.slowestTime%60).padStart(2,'0')}`, color: '#ef4444' },
                    ].map((item, i) => (
                      <div key={i} className="rounded-xl p-2.5 text-center" style={{ background: 'var(--input-bg)' }}>
                        <div className="text-base font-black" style={{ color: item.color }}>{item.value}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Consistency & Streak ── */}
                <div className="quiz-card no-hover rounded-2xl p-4">
                  <div className="font-bold text-sm mb-3" style={{ color: 'var(--text)' }}>🔥 ความสม่ำเสมอ (Consistency)</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Streak สูงสุด', value: `${s.maxStreak} วัน`, color: '#f59e0b' },
                      { label: 'วันที่เข้าสอบ', value: `${s.totalActiveDays} วัน`, color: '#3b82f6' },
                      { label: 'Activity Rate', value: `${s.activityRate}%`, color: '#16a34a' },
                      { label: 'ช่วงเวลา', value: `${s.firstDate.slice(5)} — ${s.lastDate.slice(5)}`, color: '#8b5cf6' },
                    ].map((item, i) => (
                      <div key={i} className="rounded-xl p-2.5" style={{ background: 'var(--input-bg)' }}>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.label}</div>
                        <div className="text-base font-bold" style={{ color: item.color }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Score Distribution ── */}
                <div className="quiz-card no-hover rounded-2xl p-4">
                  <div className="font-bold text-sm mb-3" style={{ color: 'var(--text)' }}>📊 การกระจายคะแนน (Score Distribution)</div>
                  {d.scoreDistribution.map((bin, i) => {
                    const maxC = Math.max(...d.scoreDistribution.map(b => b.count), 1);
                    const colors = ['#ef4444','#f59e0b','#eab308','#3b82f6','#16a34a'];
                    return (
                      <div key={i} className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs w-14 text-right font-mono" style={{ color: 'var(--text-muted)' }}>{bin.range}%</span>
                        <div className="flex-1" style={{ height: 18, background: 'var(--input-bg)', borderRadius: 6, overflow: 'hidden' }}>
                          <div style={{ width: `${(bin.count/maxC)*100}%`, height: '100%', background: colors[i], borderRadius: 6, transition: 'width .5s' }} />
                        </div>
                        <span className="text-xs w-6 font-bold" style={{ color: colors[i] }}>{bin.count}</span>
                      </div>
                    );
                  })}
                </div>

                {/* ── Per-Subject Performance ── */}
                <div className="quiz-card no-hover rounded-2xl p-4">
                  <div className="font-bold text-sm mb-3" style={{ color: 'var(--text)' }}>📚 วิเคราะห์รายวิชา (Subject Analysis)</div>
                  <div className="space-y-2">
                    {d.subjectStats.map((sub, i) => (
                      <div key={i} className="rounded-xl p-3" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold truncate" style={{ color: 'var(--text)', maxWidth: '55%' }}>{sub.subject}</span>
                          <span className="text-xs font-bold" style={{ color: sub.passRate >= 60 ? '#16a34a' : '#ef4444' }}>{sub.avgScore}% avg</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 99, background: 'var(--progress-trk)', overflow: 'hidden', marginBottom: 6 }}>
                          <div style={{ width: `${sub.passRate}%`, height: '100%', borderRadius: 99, background: sub.passRate >= 60 ? '#22c55e' : '#ef4444' }} />
                        </div>
                        <div className="flex gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span>N={sub.attempts}</span>
                          <span>ผ่าน {sub.passRate}%</span>
                          <span>SD={sub.stdDev}</span>
                          <span>Best={sub.bestScore}%</span>
                          <span>Worst={sub.worstScore}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Monthly Progress ── */}
                <div className="quiz-card no-hover rounded-2xl p-4">
                  <div className="font-bold text-sm mb-3" style={{ color: 'var(--text)' }}>📈 ความก้าวหน้ารายเดือน (Monthly Progress)</div>
                  {d.monthlyProgress.length === 0 ? <div className="text-xs" style={{color:'var(--text-muted)'}}>ไม่มีข้อมูล</div> :
                  <div className="space-y-1.5">
                    {d.monthlyProgress.map((m, i) => {
                      const maxA = Math.max(...d.monthlyProgress.map(x=>x.attempts), 1);
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs w-16 font-mono" style={{ color: 'var(--text-muted)' }}>{m.month}</span>
                          <div className="flex-1" style={{ height: 20, background: 'var(--input-bg)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                            <div style={{ width: `${(m.attempts/maxA)*100}%`, height: '100%', background: `linear-gradient(90deg, ${m.passRate>=60?'#22c55e':'#ef4444'}, ${m.passRate>=60?'#16a34a':'#dc2626'})`, borderRadius: 6 }} />
                            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color: m.attempts/maxA > 0.3 ? 'white' : 'var(--text)' }}>
                              {m.attempts}x • {m.avgScore}% • Pass {m.passRate}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>}
                </div>

                {/* ── Activity Pattern ── */}
                <div className="quiz-card no-hover rounded-2xl p-4">
                  <div className="font-bold text-sm mb-3" style={{ color: 'var(--text)' }}>📅 รูปแบบการเข้าสอบ (Activity Pattern)</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs font-bold mb-2" style={{ color: 'var(--text-muted)' }}>ตามวัน (Day of Week)</div>
                      {d.dailyPattern.map((dp, i) => {
                        const maxD = Math.max(...d.dailyPattern.map(x=>x.count), 1);
                        return (
                          <div key={i} className="flex items-center gap-1 mb-1">
                            <span className="text-xs w-10" style={{ color: 'var(--text-muted)', fontSize: 9 }}>{dp.day}</span>
                            <div className="flex-1" style={{ height: 10, background: 'var(--input-bg)', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ width: `${(dp.count/maxD)*100}%`, height: '100%', background: '#3b82f6', borderRadius: 4 }} />
                            </div>
                            <span className="text-xs w-4" style={{ color: 'var(--text-muted)', fontSize: 9 }}>{dp.count}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div>
                      <div className="text-xs font-bold mb-2" style={{ color: 'var(--text-muted)' }}>ตามชั่วโมง (Hour)</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 2 }}>
                        {d.hourlyPattern.map((hp, i) => {
                          const maxH = Math.max(...d.hourlyPattern.map(x=>x.count), 1);
                          const intensity = hp.count / maxH;
                          return (
                            <div key={i} title={`${hp.hour}:00 = ${hp.count}`}
                              style={{ width: '100%', aspectRatio: '1', borderRadius: 4, background: hp.count > 0 ? `rgba(59,130,246,${0.15 + intensity*0.85})` : 'var(--input-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: 7, color: intensity > 0.5 ? 'white' : 'var(--text-muted)', fontWeight: 700 }}>{hp.hour}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Weak Topics ── */}
                {d.weakTopics.length > 0 && (
                  <div className="quiz-card no-hover rounded-2xl p-4">
                    <div className="font-bold text-sm mb-3" style={{ color: 'var(--text)' }}>❌ จุดอ่อน — ข้อที่ตอบผิดบ่อย (Weakness Analysis)</div>
                    <div className="space-y-1.5" style={{ maxHeight: 300, overflowY: 'auto' }}>
                      {d.weakTopics.slice(0, 15).map((w, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black" style={{ background: '#fee2e2', color: '#dc2626' }}>{w.wrongCount}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold truncate" style={{ color: '#b91c1c' }}>{w.topic}</div>
                            <div className="text-xs truncate" style={{ color: '#dc2626', opacity: .7 }}>{w.question}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Recent Attempts ── */}
                <div className="quiz-card no-hover rounded-2xl p-4">
                  <div className="font-bold text-sm mb-3" style={{ color: 'var(--text)' }}>🕐 ประวัติล่าสุด (Recent Attempts)</div>
                  <div className="space-y-1.5" style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {d.recentAttempts.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--input-bg)' }}>
                        <div className="w-7 text-center flex-shrink-0">
                          <div className="text-xs font-black" style={{ color: a.pass ? '#16a34a' : '#ef4444' }}>{a.pct}%</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>{a.lesson}</div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)', fontSize: 9 }}>
                            {new Date(a.date).toLocaleString('th-TH')} • {a.score}/{a.total} • {Math.floor(a.timeUsed/60)}:{String(a.timeUsed%60).padStart(2,'0')}
                          </div>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: a.pass ? '#dcfce7' : '#fee2e2', color: a.pass ? '#15803d' : '#b91c1c' }}>
                          {a.pass ? 'ผ่าน' : 'ไม่ผ่าน'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ── System Health Tab ─────────────────────────────── */}
      {tab === 'health' && (
        <div className="animate-fade">
          {healthLoading ? <Spinner label="กำลังตรวจสอบระบบ..." /> : !healthData ? (
            <div className="quiz-card no-hover rounded-2xl p-8 text-center" style={{ color: 'var(--text-muted)' }}>ไม่พบข้อมูล</div>
          ) : (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold" style={{ color: 'var(--text)' }}>🩺 System Health Dashboard</h3>
                <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5" onClick={loadHealth}>🔄 Refresh</button>
              </div>

              {/* ── API Keys & Tokens ─── */}
              <div className="quiz-card no-hover rounded-2xl p-4">
                <div className="font-bold text-sm mb-3" style={{ color: 'var(--text)' }}>🔑 API Keys & Tokens</div>
                <div className="space-y-2">
                  {Object.entries(healthData.keyStatus).map(([key, val]) => {
                    const ok = val.startsWith('✅');
                    return (
                      <div key={key} className="flex items-center justify-between py-2 px-3 rounded-xl"
                        style={{ background: ok ? '#f0fdf4' : '#fef2f2' }}>
                        <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text)' }}>{key}</span>
                        <span className="text-xs font-semibold" style={{ color: ok ? '#15803d' : '#b91c1c' }}>{val}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Triggers ─── */}
              <div className="quiz-card no-hover rounded-2xl p-4">
                <div className="font-bold text-sm mb-3" style={{ color: 'var(--text)' }}>
                  ⚡ Triggers ({healthData.triggers.length})
                </div>
                {healthData.triggers.length === 0 ? (
                  <div className="text-xs py-3 text-center" style={{ color: 'var(--text-muted)' }}>ไม่มี Trigger ที่ทำงานอยู่</div>
                ) : (
                  <div className="space-y-1.5">
                    {healthData.triggers.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 py-2 px-3 rounded-xl"
                        style={{ background: 'var(--input-bg)' }}>
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#22c55e' }} />
                        <span className="text-xs font-mono font-semibold flex-1" style={{ color: 'var(--text)' }}>
                          {t.funcName}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Sync Stats ─── */}
              <div className="quiz-card no-hover rounded-2xl p-4">
                <div className="font-bold text-sm mb-3" style={{ color: 'var(--text)' }}>🔄 Sync Status</div>
                <div className="grid grid-cols-2 gap-3">
                  {/* Profile Sync */}
                  <div className="rounded-xl p-3" style={{ background: 'var(--input-bg)' }}>
                    <div className="text-xs font-bold mb-2" style={{ color: 'var(--text)' }}>Profile Sync</div>
                    {[
                      { l: 'Cursor', v: `${healthData.syncStats.profileSync.cursor}/${healthData.syncStats.profileSync.total}` },
                      { l: 'Updated', v: healthData.syncStats.profileSync.updated },
                      { l: 'Failed', v: healthData.syncStats.profileSync.failed },
                      { l: 'Cycles', v: healthData.syncStats.profileSync.cyclesDone },
                      { l: 'Last', v: healthData.syncStatsFormatted.profileLastTime },
                    ].map(r => (
                      <div key={r.l} className="flex justify-between text-xs py-0.5">
                        <span style={{ color: 'var(--text-muted)' }}>{r.l}</span>
                        <span className="font-mono font-semibold" style={{ color: 'var(--text)' }}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                  {/* RM Sync */}
                  <div className="rounded-xl p-3" style={{ background: 'var(--input-bg)' }}>
                    <div className="text-xs font-bold mb-2" style={{ color: 'var(--text)' }}>Rich Menu Sync</div>
                    {[
                      { l: 'Cursor', v: `${healthData.syncStats.rmSync.cursor}/${healthData.syncStats.rmSync.total}` },
                      { l: 'Updated', v: healthData.syncStats.rmSync.updated },
                      { l: 'Failed', v: healthData.syncStats.rmSync.failed },
                      { l: 'Cycles', v: healthData.syncStats.rmSync.cyclesDone },
                      { l: 'Last', v: healthData.syncStatsFormatted.rmLastTime },
                    ].map(r => (
                      <div key={r.l} className="flex justify-between text-xs py-0.5">
                        <span style={{ color: 'var(--text-muted)' }}>{r.l}</span>
                        <span className="font-mono font-semibold" style={{ color: 'var(--text)' }}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Sheet Sizes ─── */}
              <div className="quiz-card no-hover rounded-2xl p-4">
                <div className="font-bold text-sm mb-3" style={{ color: 'var(--text)' }}>📊 Sheet Row Counts</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(healthData.sheetSizes).map(([name, count]) => {
                    const warn = count > 5000;
                    return (
                      <div key={name} className="rounded-xl p-2.5 text-center"
                        style={{ background: warn ? '#fef3c7' : 'var(--input-bg)' }}>
                        <div className="text-lg font-black" style={{ color: warn ? '#92400e' : 'var(--accent)' }}>
                          {count.toLocaleString()}
                        </div>
                        <div className="text-xs font-semibold truncate" style={{ color: 'var(--text-muted)' }}>
                          {name} {warn && '⚠️'}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  Cache: <span className="font-mono font-semibold" style={{ color: healthData.cacheStatus === 'OK' ? '#16a34a' : '#ef4444' }}>
                    {healthData.cacheStatus}
                  </span>
                </div>
              </div>

              {/* ── Audit Logs ─── */}
              <div className="quiz-card no-hover rounded-2xl p-4">
                <div className="font-bold text-sm mb-3" style={{ color: 'var(--text)' }}>📝 Audit Log (ล่าสุด 20 รายการ)</div>
                {healthData.auditLogs.length === 0 ? (
                  <div className="text-xs py-3 text-center" style={{ color: 'var(--text-muted)' }}>ยังไม่มีข้อมูล</div>
                ) : (
                  <div className="space-y-1" style={{ maxHeight: 320, overflowY: 'auto' }}>
                    {healthData.auditLogs.map((log, i) => (
                      <div key={i} className="flex gap-2 py-1.5 px-2 rounded-lg text-xs"
                        style={{ background: i % 2 === 0 ? 'var(--input-bg)' : 'transparent' }}>
                        <span className="flex-shrink-0 font-mono" style={{ color: 'var(--text-muted)', minWidth: 110 }}>{log.time}</span>
                        <span className="font-semibold flex-shrink-0 px-1.5 rounded"
                          style={{
                            background: log.action.includes('delete') ? '#fee2e2' : log.action.includes('Role') ? '#ede9fe' : '#dbeafe',
                            color: log.action.includes('delete') ? '#b91c1c' : log.action.includes('Role') ? '#7c3aed' : '#1d4ed8',
                          }}>{log.action}</span>
                        <span className="truncate" style={{ color: 'var(--text)' }}>{log.detail || '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Settings Tab ────────────────────��─────────────── */}
      {/* ════════════════════════ TAB: หน่วยงาน ════════════════════════ */}
      {tab === 'dept' && <DeptTab callerUserId={profile.userId} />}

      {/* ════════════════════════ TAB: ผลสอบรายหน่วยงาน ════════════════════════ */}
      {tab === 'deptResults' && <DeptResultsTab callerUserId={profile.userId} />}

      {/* ════════════════════════ TAB: ข้อยาก ════════════════════════ */}
      {tab === 'qstats' && <QStatsTab callerUserId={profile.userId} />}

      {/* ════════════════════════ TAB: Flags ════════════════════════ */}
      {tab === 'flags' && <FlagsTab callerUserId={profile.userId} />}

      {tab === 'settings' && (
        <div className="animate-fade space-y-4">

          {/* ── Announcements ────────────────── */}
          <AnnouncementsSection callerUserId={profile.userId} />

          {/* ── Question Bank Schedule ────────── */}
          <div className="quiz-card no-hover rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📚</span>
              <div>
                <div className="font-bold text-sm" style={{ color: 'var(--text)' }}>คลังข้อสอบ (เลือกวิชา)</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>กำหนดวันเวลาเปิด-ปิด และจำนวนข้อ</div>
              </div>
              {qbSettings && (
                <span className="ml-auto text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={qbSettings.open
                    ? { background: '#dcfce7', color: '#15803d' }
                    : { background: '#fee2e2', color: '#b91c1c' }}>
                  {qbSettings.open ? '🟢 เปิดอยู่' : '🔴 ปิดอยู่'}
                </span>
              )}
            </div>

            {/* Toggle enable */}
            <div className="flex items-center gap-3 mb-4 rounded-xl p-3"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>
              <label className="toggle">
                <input type="checkbox" checked={qbEnabled} onChange={e => setQbEnabled(e.target.checked)} />
                <span className="toggle-slider" />
              </label>
              <div>
                <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>
                  {qbEnabled ? '✅ เปิดใช้งานคลังข้อสอบ' : '🔒 ปิดคลังข้อสอบ'}
                </span>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {qbEnabled ? 'ผู้ใช้สามารถเลือกวิชาสอบได้ (ตามกำหนดเวลา)' : 'ผู้ใช้ไม่สามารถเข้าถึงคลังข้อสอบ'}
                </div>
              </div>
            </div>

            {/* Schedule */}
            {qbEnabled && (
              <div className="space-y-3 mb-4">
                <div className="rounded-xl p-3" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                  <div className="text-xs font-bold mb-2" style={{ color: '#1d4ed8' }}>⏰ กำหนดเวลาเปิด-ปิด</div>
                  <div className="text-xs mb-2" style={{ color: '#3b82f6' }}>เว้นว่างไว้ = ไม่จำกัดเวลา (เปิดตลอด)</div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>เริ่ม</span>
                      <input type="datetime-local" className="themed-input w-full mt-1 text-xs"
                        value={qbStart ? qbStart.slice(0, 16) : ''}
                        onChange={e => setQbStart(e.target.value ? new Date(e.target.value).toISOString() : '')} />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>สิ้นสุด</span>
                      <input type="datetime-local" className="themed-input w-full mt-1 text-xs"
                        value={qbEnd ? qbEnd.slice(0, 16) : ''}
                        onChange={e => setQbEnd(e.target.value ? new Date(e.target.value).toISOString() : '')} />
                    </label>
                  </div>
                </div>

                {/* Num Questions */}
                <div className="rounded-xl p-3" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <div className="text-xs font-bold mb-2" style={{ color: '#15803d' }}>📝 จำนวนข้อสอบ</div>
                  <div className="flex items-center gap-3">
                    <input type="range" min="5" max="100" value={Math.min(qbNumQ, 100)} className="flex-1"
                      onChange={e => setQbNumQ(Number(e.target.value))} />
                    <input type="number" min="1" max="9999" value={qbNumQ}
                      className="themed-input text-center text-sm" style={{ width: 70 }}
                      onChange={e => setQbNumQ(Math.max(1, parseInt(e.target.value) || 1))} />
                    <span className="text-xs" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>ข้อ</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {[10, 20, 30, 50].map(n => (
                      <button key={n} className="btn btn-gray text-xs rounded-lg px-3 py-1" onClick={() => setQbNumQ(n)}>{n}</button>
                    ))}
                    <button className="btn btn-primary text-xs rounded-lg px-3 py-1" onClick={() => setQbNumQ(9999)}>ไม่จำกัด</button>
                  </div>
                </div>
              </div>
            )}

            {/* Save */}
            <button className="btn w-full rounded-xl py-2.5 text-sm font-bold"
              style={{ background: 'var(--accent)', color: 'white', opacity: qbSaving ? .5 : 1 }}
              disabled={qbSaving}
              onClick={saveQBankSettings}>
              {qbSaving ? '⏳ บันทึก...' : '💾 บันทึกตั้งค่าคลังข้อสอบ'}
            </button>

            {/* Current status */}
            {qbSettings && (
              <div className="mt-3 rounded-xl p-3 text-xs" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>
                <div className="font-semibold mb-1" style={{ color: 'var(--text)' }}>สถานะปัจจุบัน</div>
                <div style={{ color: 'var(--text-muted)' }}>
                  {qbSettings.open
                    ? '🟢 เปิดอยู่ — ผู้ใช้เข้าได้'
                    : `🔴 ปิดอยู่ — ${qbSettings.reason || ''}`}
                  {qbSettings.start && <div>เริ่ม: {new Date(qbSettings.start).toLocaleString('th-TH')}</div>}
                  {qbSettings.end && <div>สิ้นสุด: {new Date(qbSettings.end).toLocaleString('th-TH')}</div>}
                  {qbSettings.numQ > 0 && qbSettings.numQ < 9999 && <div>จำนวนข้อ: {qbSettings.numQ}</div>}
                </div>
              </div>
            )}
          </div>

          {/* ── LINE Token Section ────────────── */}
          <div className="quiz-card no-hover rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🟢</span>
              <div>
                <div className="font-bold text-sm" style={{ color: 'var(--text)' }}>LINE Channel Token</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Token สำหรับเรียก LINE Messaging API (Rich Menu, Profile, Push)</div>
              </div>
              {lineTokenStatus && (
                <span className="ml-auto text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={lineTokenStatus.hasToken
                    ? { background: '#dcfce7', color: '#15803d' }
                    : { background: '#fee2e2', color: '#b91c1c' }}>
                  {lineTokenStatus.hasToken ? '✅ ตั้งค่าแล้ว' : '⚠️ ยังไม่ได้ตั้งค่า'}
                </span>
              )}
            </div>

            {lineTokenStatus?.hasToken && (
              <div className="rounded-xl p-3 mb-4"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'var(--text-muted)' }}>Token</span>
                  <span className="font-mono" style={{ color: 'var(--text)' }}>{lineTokenStatus.preview}</span>
                </div>
              </div>
            )}

            <div className="space-y-3 mb-4">
              <label className="block">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Channel Access Token <span style={{ color: '#94a3b8' }}>(จาก LINE Developers Console)</span>
                </span>
                <input className="themed-input w-full mt-1 font-mono text-xs"
                  type="password"
                  placeholder={lineTokenStatus?.hasToken ? '••••••• (ใส่ใหม่เพื่อเปลี่ยน)' : 'Channel Access Token (long-lived)'}
                  value={lineTokenInput}
                  onChange={e => setLineTokenInput(e.target.value)} />
              </label>
            </div>

            <button className="btn w-full rounded-xl py-2.5 text-sm"
              style={{ background: 'var(--accent)', color: 'white', opacity: lineTokenSaving || !lineTokenInput.trim() ? .5 : 1 }}
              disabled={lineTokenSaving || !lineTokenInput.trim()}
              onClick={saveLineToken}>
              {lineTokenSaving ? '⏳ บันทึก...' : '💾 บันทึก LINE Token'}
            </button>

            <div className="mt-4 rounded-xl p-3 text-xs space-y-1"
              style={{ background: 'var(--input-bg)', color: 'var(--text-muted)', border: '1px solid var(--input-border)' }}>
              <div className="font-semibold mb-2" style={{ color: 'var(--text)' }}>📖 วิธีรับ LINE Channel Token</div>
              <div>1. ไปที่ <b>developers.line.biz</b> → เลือก Provider → Channel</div>
              <div>2. ไปที่ tab <b>Messaging API</b></div>
              <div>3. เลื่อนลงหา <b>Channel access token (long-lived)</b></div>
              <div>4. กด <b>Issue</b> → คัดลอก token ทั้งหมดมาวาง</div>
            </div>
          </div>

          {/* ── Telegram Section ─────────────── */}
          <div className="quiz-card no-hover rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">✈️</span>
              <div>
                <div className="font-bold text-sm" style={{ color: 'var(--text)' }}>Telegram Notification</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>แจ้งเตือน Admin เมื่อมีสมาชิกใหม่ / เปลี่ยนสถานะ</div>
              </div>
              {tgConfig && (
                <span className="ml-auto text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={tgConfig.configured
                    ? { background: '#dcfce7', color: '#15803d' }
                    : { background: '#fee2e2', color: '#b91c1c' }}>
                  {tgConfig.configured ? '✅ เชื่อมต่อแล้ว' : '⚠️ ยังไม่ได้ตั้งค่า'}
                </span>
              )}
            </div>

            {/* สถานะปัจจุบัน */}
            {tgConfig?.configured && (
              <div className="rounded-xl p-3 mb-4 space-y-1.5"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'var(--text-muted)' }}>Bot Token</span>
                  <span className="font-mono" style={{ color: 'var(--text)' }}>{tgConfig.maskedToken}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'var(--text-muted)' }}>Chat ID</span>
                  <span className="font-mono" style={{ color: 'var(--text)' }}>{tgConfig.chatId}</span>
                </div>
              </div>
            )}

            {/* Form ตั้งค่า */}
            <div className="space-y-3 mb-4">
              <label className="block">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Bot Token <span style={{ color: '#94a3b8' }}>(จาก @BotFather)</span>
                </span>
                <input className="themed-input w-full mt-1 font-mono text-xs"
                  type="password"
                  placeholder={tgConfig?.hasToken ? '••••••• (ใส่ใหม่เพื่อเปลี่ยน)' : '1234567890:ABCDEF...'}
                  value={tgForm.botToken}
                  onChange={e => setTgForm(p => ({ ...p, botToken: e.target.value }))} />
              </label>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Chat ID
                  </span>
                  <button
                    className="btn text-xs rounded-lg px-2.5 py-1"
                    style={{ background: '#0088cc', color: 'white', opacity: tgFinding ? .6 : 1 }}
                    disabled={tgFinding}
                    onClick={findTelegramChats}>
                    {tgFinding
                      ? <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />กำลังหา...</span>
                      : '🔍 หา Chat ID อัตโนมัติ'}
                  </button>
                </div>
                <input className="themed-input w-full font-mono"
                  placeholder="-1001234567890 หรือ 123456789"
                  value={tgForm.chatId}
                  onChange={e => setTgForm(p => ({ ...p, chatId: e.target.value }))} />

                {/* แสดง chats ที่พบ */}
                {tgChats.length > 0 && (
                  <div className="mt-2 rounded-xl overflow-hidden"
                    style={{ border: '1.5px solid #0088cc' }}>
                    <div className="px-3 py-2 text-xs font-semibold"
                      style={{ background: '#0088cc', color: 'white' }}>
                      ✅ พบ {tgChats.length} chat — กดเลือกเพื่อใช้
                    </div>
                    {tgChats.map(c => (
                      <button key={c.id}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:opacity-80 transition-opacity"
                        style={{ background: 'var(--input-bg)', borderTop: '1px solid var(--input-border)' }}
                        onClick={() => { setTgForm(p => ({ ...p, chatId: c.id })); setTgChats([]); }}>
                        <span className="text-lg flex-shrink-0">
                          {c.type === 'private' ? '👤' : c.type === 'group' ? '👥' : '📢'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>
                            {c.name || 'ไม่มีชื่อ'}
                            {c.username && <span style={{ color: 'var(--text-muted)' }}> @{c.username}</span>}
                          </div>
                          <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{c.type} • ID: {c.id}</div>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: '#dcfce7', color: '#15803d' }}>เลือก</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button className="btn flex-1 rounded-xl py-2.5 text-sm"
                style={{ background: 'var(--accent)', color: 'white', opacity: tgSaving ? .6 : 1 }}
                disabled={tgSaving || (!tgForm.botToken && !tgForm.chatId)}
                onClick={saveTgConfig}>
                {tgSaving ? '⏳ บันทึก...' : '💾 บันทึก'}
              </button>
              {tgConfig?.configured && (
                <button className="btn rounded-xl py-2.5 px-4 text-sm"
                  style={{ background: '#0088cc', color: 'white', opacity: tgTesting ? .6 : 1 }}
                  disabled={tgTesting}
                  onClick={testTelegram}>
                  {tgTesting ? '⏳...' : '🧪 ทดสอบ'}
                </button>
              )}
              {tgConfig?.configured && (
                <button className="btn btn-gray rounded-xl py-2.5 px-3 text-sm"
                  onClick={async () => {
                    const r = await Swal.fire({ title: 'ลบการตั้งค่า Telegram?', icon: 'warning', showCancelButton: true, confirmButtonText: 'ลบ', confirmButtonColor: '#ef4444' });
                    if (!r.isConfirmed) return;
                    await apiPost({ action: 'setTelegramConfig', callerUserId: profile.userId, botToken: '', chatId: '' });
                    loadInitAdmin();
                  }}>🗑</button>
              )}
            </div>

            {/* Reply via Telegram setup */}
            {tgConfig?.configured && (
              <div className="mt-3 rounded-xl p-3"
                style={{ background: 'linear-gradient(135deg, #e0f2fe, #ddd6fe)', border: '1.5px solid #0088cc' }}>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <div className="font-bold text-xs" style={{ color: '#0c4a6e' }}>↩️ ตอบข้อความผ่าน Telegram</div>
                    <div className="text-xs mt-0.5" style={{ color: '#0369a1' }}>
                      Reply ข้อความที่ bot ส่งมา → ระบบจะตอบกลับ user ใน LINE ทันที
                    </div>
                  </div>
                  <button className="btn rounded-xl px-3 py-2 text-xs whitespace-nowrap"
                    style={{ background: '#0088cc', color: 'white' }}
                    onClick={setupTgWebhook}>
                    🔗 เปิดใช้
                  </button>
                </div>
                <div className="text-xs space-y-0.5" style={{ color: '#0c4a6e' }}>
                  <div>• <b>วิธี 1:</b> Reply ข้อความ bot ที่มี <code>#MSGxxx</code> → พิมพ์คำตอบ</div>
                  <div>• <b>วิธี 2:</b> <code>/reply MSGxxx ข้อความ</code></div>
                  <div>• <b>วิธี 3:</b> <code>#MSGxxx ข้อความ</code></div>
                </div>
              </div>
            )}

            {/* คำแนะนำ */}
            <div className="mt-4 rounded-xl p-3 text-xs space-y-1"
              style={{ background: 'var(--input-bg)', color: 'var(--text-muted)', border: '1px solid var(--input-border)' }}>
              <div className="font-semibold mb-2" style={{ color: 'var(--text)' }}>📖 วิธีตั้งค่า Telegram Bot</div>
              <div>1. เปิด Telegram → ค้นหา <b>@BotFather</b></div>
              <div>2. พิมพ์ <code style={{ background: 'var(--card)', padding: '1px 4px', borderRadius: 4 }}>/newbot</code> → ตั้งชื่อ → คัดลอก <b>Token</b></div>
              <div>3. ส่งข้อความให้ bot ก่อนอย่างน้อย 1 ครั้ง</div>
              <div>4. ค้นหา <b>@userinfobot</b> → พิมพ์อะไรก็ได้ → ดู <b>Id</b> = Chat ID</div>
              <div>5. ถ้าต้องการแจ้ง Group: เพิ่ม bot เข้า group → Chat ID จะขึ้นต้นด้วย <code style={{ background: 'var(--card)', padding: '1px 4px', borderRadius: 4 }}>-100</code></div>
            </div>
          </div>

          {/* ── เหตุการณ์ที่แจ้ง ─────────────── */}
          <div className="quiz-card no-hover rounded-2xl p-4">
            <div className="font-bold text-sm mb-3" style={{ color: 'var(--text)' }}>📣 เหตุการณ์ที่แจ้งเตือน</div>
            <div className="space-y-2">
              {[
                { icon: '🆕', label: 'สมาชิกใหม่สมัคร',          detail: 'ส่งทันที พร้อมชื่อ, อีเมล, เบอร์' },
                { icon: '✅', label: 'Admin อนุมัติสมาชิก',       detail: 'เมื่อเปลี่ยนสถานะเป็น "ใช้งาน"' },
                { icon: '🚫', label: 'Admin ระงับสมาชิก',          detail: 'เมื่อเปลี่ยนสถานะเป็น "ระงับ"' },
              ].map(({ icon, label, detail }) => (
                <div key={label} className="flex items-center gap-3 py-2 px-3 rounded-xl"
                  style={{ background: 'var(--input-bg)' }}>
                  <span className="text-xl flex-shrink-0">{icon}</span>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{label}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{detail}</div>
                  </div>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full"
                    style={{ background: '#dcfce7', color: '#15803d' }}>เปิดอยู่</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Archive Section ─────────────── */}
          {(() => {
            const hasArchiveTrigger = triggerStatus?.triggers?.some(t => t.funcName === 'archiveOldResultsScheduled');
            async function runArchive() {
              const conf = await Swal.fire({
                title: 'Archive ข้อมูลเก่า?',
                html: 'ย้ายผลสอบที่เก่ากว่า <b>6 เดือน</b> ไปยัง sheet <b>Results_YYYY</b><br>ข้อมูลจะไม่สูญหาย สามารถดูใน Google Sheets ได้',
                icon: 'warning', showCancelButton: true,
                confirmButtonText: 'Archive', cancelButtonText: 'ยกเลิก',
                confirmButtonColor: '#d97706',
              });
              if (!conf.isConfirmed) return;
              setArchiving(true);
              try {
                const data = await apiGet('archiveOldResults', { userId: profile.userId });
                if (!data.success) throw new Error(data.message);
                await Swal.fire('สำเร็จ', `Archive แล้ว ${data.archived} รายการ | เหลือใน active: ${data.kept} รายการ`, 'success');
              } catch (e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error'); }
              finally { setArchiving(false); }
            }
            async function toggleArchiveTrigger() {
              try {
                const action = hasArchiveTrigger ? 'removeArchiveTrigger' : 'setupArchiveTrigger';
                const data   = await apiGet(action, { userId: profile.userId });
                if (!data.success) throw new Error(data.message);
                Swal.fire('สำเร็จ', data.message || 'เสร็จแล้ว', 'success');
                loadInitAdmin();
              } catch (e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error'); }
            }
            return (
              <div className="quiz-card no-hover rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🗄</span>
                  <div>
                    <div className="font-bold text-sm" style={{ color: 'var(--text)' }}>Archive ข้อมูลเก่า</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>ย้ายผลสอบ &gt; 6 เดือน → Results_YYYY (ประหยัด RAM)</div>
                  </div>
                  <span className="ml-auto text-xs px-2.5 py-1 rounded-full font-semibold"
                    style={hasArchiveTrigger
                      ? { background: '#dcfce7', color: '#15803d' }
                      : { background: '#fef9c3', color: '#854d0e' }}>
                    {hasArchiveTrigger ? '⏱ Auto ทุกเดือน' : '⚠️ ยังไม่ได้ตั้งค่า'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3 p-3 rounded-xl"
                  style={{ background: 'var(--input-bg)' }}>
                  {[
                    { icon: '📋', label: 'Active Sheet', desc: 'เก็บ 6 เดือนล่าสุด' },
                    { icon: '📦', label: 'Archive', desc: 'Results_2024, Results_2025...' },
                    { icon: '⚡', label: 'ผลลัพธ์', desc: 'โหลดเร็วขึ้น ~10x' },
                  ].map(({ icon, label, desc }) => (
                    <div key={label}>
                      <div className="text-lg mb-0.5">{icon}</div>
                      <div className="font-semibold" style={{ color: 'var(--text)' }}>{label}</div>
                      <div style={{ color: 'var(--text-muted)' }}>{desc}</div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button className="btn btn-primary flex-1 rounded-xl py-2.5 text-sm"
                    onClick={runArchive} disabled={archiving}
                    style={{ opacity: archiving ? 0.6 : 1, background: '#d97706' }}>
                    {archiving
                      ? <><span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />กำลัง Archive...</>
                      : '🗄 Archive Now'}
                  </button>
                  <button className="btn rounded-xl py-2.5 text-sm px-3"
                    onClick={toggleArchiveTrigger}
                    style={{
                      background: hasArchiveTrigger ? '#fee2e2' : '#f0fdf4',
                      color: hasArchiveTrigger ? '#b91c1c' : '#15803d',
                    }}>
                    {hasArchiveTrigger ? '🗑 ลบ Trigger' : '⏱ Auto Monthly'}
                  </button>
                </div>
              </div>
            );
          })()}

          {/* ── Exam Reminder ─────── */}
          <ExamReminderSection callerUserId={profile.userId} />

        </div>
      )}
    </div>
  );
}

export default function AdminScreen() {
  return (
    <AdminErrorBoundary>
      <AdminScreenInner />
    </AdminErrorBoundary>
  );
}
