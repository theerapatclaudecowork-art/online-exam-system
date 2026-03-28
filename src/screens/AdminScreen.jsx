import { useState, useEffect, useRef, Component } from 'react';
import Swal from 'sweetalert2';
import { useApp } from '../context/AppContext';
import { apiGet, apiPost, apiGetCached, lsInvalidate } from '../utils/api';
import Spinner from '../components/Spinner';
import StatsCharts from '../components/charts/StatsCharts';

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
//  AdminScreen (Main)
// ─────────────────────────────────────────────────────────────
function AdminScreenInner() {
  const { navigate, profile } = useApp();
  const [tab, setTab]         = useState('stats');
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
  const [memberFilter, setMemberFilter]   = useState('');
  const [memberSearch, setMemberSearch]   = useState('');
  const [richMenuFilter, setRichMenuFilter] = useState('');
  const [resultSearch, setResultSearch] = useState('');
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

  // ── mount: 2 parallel calls แทน 6 ──────────────────────────
  useEffect(() => {
    Promise.all([loadInitAdmin(), loadMembers(), loadAllRichMenus(), loadCourses()]);
    // eslint-disable-next-line
  }, []);

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
    { key: 'stats',      label: '📊 สถิติ' },
    { key: 'members',    label: '👥 สมาชิก' },
    { key: 'dept',       label: '🏢 หน่วยงาน' },
    { key: 'richmenu',   label: '🎛 Rich Menu' },
    { key: 'results',    label: '📋 ผลสอบ' },
    { key: 'courses',    label: '📚 หลักสูตร' },
    { key: 'settings',   label: '⚙️ ตั้งค่า' },
  ];

  // filter + search
  const filteredMembers = members
    .filter(m => memberFilter ? m.status === memberFilter : true)
    .filter(m => richMenuFilter === '__none__'
      ? !m.richMenuId
      : richMenuFilter
        ? m.richMenuId === richMenuFilter
        : true)
    .filter(m => memberSearch
      ? (m.fullName + m.displayName + m.email + m.studentId + m.lineUserId + (m.department||''))
          .toLowerCase().includes(memberSearch.toLowerCase())
      : true);

  const filteredResults = resultSearch
    ? results.filter(r => r.name.includes(resultSearch) || r.lesson.includes(resultSearch))
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

      {/* Header */}
      <div className="quiz-card no-hover rounded-2xl p-3 sm:p-4 mb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-base sm:text-lg font-bold" style={{ color: 'var(--text)' }}>⚙️ จัดการระบบ</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Admin Panel</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end flex-shrink-0">
            <button className="btn text-xs rounded-lg px-3 py-1.5"
              style={{ background: '#f59e0b', color: 'white' }}
              onClick={() => navigate('examSetManager')}>📦 ชุดข้อสอบ</button>
            <button className="btn btn-primary text-xs rounded-lg px-3 py-1.5" onClick={() => navigate('questionManager')}>📚 ข้อสอบ</button>
            <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5" onClick={() => navigate('setup')}>← กลับ</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {TABS.map(t => (
          <button key={t.key} className="flex-1 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all"
            style={{
              background: tab === t.key ? 'var(--accent)' : 'var(--card)',
              color:      tab === t.key ? 'white' : 'var(--text-muted)',
              border:     `1.5px solid ${tab === t.key ? 'var(--accent)' : 'var(--card-border)'}`,
            }}
            onClick={() => { setTab(t.key); if (t.key === 'results' && results.length === 0) loadResults(0); }}
          >{t.label}</button>
        ))}
      </div>

      {/* ── Stats Tab ─────────────────────────────── */}
      {tab === 'stats' && (
        <StatsCharts stats={stats} loading={!stats && loading} onRefresh={loadStats} />
      )}

      {/* ── Members Tab ───────────────────────────── */}
      {tab === 'members' && (
        <div className="animate-fade">

          {/* Filter / Search / Sync bar */}
          <div className="quiz-card no-hover rounded-2xl p-3 mb-3 space-y-2">

            {/* ช่องค้นหา */}
            <input className="themed-input w-full" placeholder="🔍 ค้นหา ชื่อ / อีเมล / รหัส..."
              value={memberSearch} onChange={e => setMemberSearch(e.target.value)} />

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
                            <img src={m.pictureUrl || 'https://i.pinimg.com/originals/be/04/0f/be040f35f073adc3a48c1fba489d2bc4.gif'}
                              alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
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

          {/* Member Cards */}
          {loading ? <Spinner label="กำลังโหลด..." /> : (
            <div className="space-y-2 mb-4">
              {filteredMembers.length === 0 ? (
                <div className="quiz-card no-hover rounded-2xl p-8 text-center" style={{ color: 'var(--text-muted)' }}>
                  {memberSearch ? 'ไม่พบสมาชิกที่ค้นหา' : 'ไม่มีสมาชิก'}
                </div>
              ) : filteredMembers.map(m => {
                const st  = STATUS_LABEL[m.status] || STATUS_LABEL.inactive;
                const pic = m.pictureUrl || '';

                return (
                  <div key={m.lineUserId}
                    className="quiz-card rounded-xl p-3 sm:p-4 flex items-center gap-3 cursor-pointer transition-all hover:shadow-md active:scale-[.98]"
                    onClick={() => setSelectedMember(m)}>

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

                    {/* Status + chevron */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: st.bg, color: st.color }}>{st.label}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>›</span>
                    </div>
                  </div>
                );
              })}
            </div>
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
                            <img src={m.pictureUrl || 'https://i.pinimg.com/originals/be/04/0f/be040f35f073adc3a48c1fba489d2bc4.gif'}
                              alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
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
            <input className="themed-input flex-1" placeholder="🔍 ค้นหาชื่อ / วิชา..."
              value={resultSearch} onChange={e => setResultSearch(e.target.value)} />
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

      {/* ── Courses Tab ───────────────────────────────────── */}
      {tab === 'courses' && (
        <CourseManager callerUserId={profile.userId} />
      )}

      {/* ── Settings Tab ──────────────────────────────────── */}
      {/* ════════════════════════ TAB: แผนก ════════════════════════ */}
      {tab === 'dept' && (() => {
        const [deptData,  setDeptData]  = useState(null);
        const [deptLoad,  setDeptLoad]  = useState(true);
        const [editId,    setEditId]    = useState(null);  // lineUserId กำลังแก้
        const [editDept,  setEditDept]  = useState('');
        const [saving,    setSaving]    = useState(false);
        const [deptFilter,setDeptFilter]= useState('');
        const [newDeptName,setNewDeptName]= useState('');

        useEffect(() => {
          apiGet('getDepartments', { userId: profile.userId })
            .then(d => { if (d.success) setDeptData(d); })
            .catch(() => {})
            .finally(() => setDeptLoad(false));
        }, []);

        async function saveDept(lineUserId) {
          setSaving(lineUserId);
          try {
            const res = await apiPost({ action:'updateUserDept', callerUserId: profile.userId, lineUserId, department: editDept });
            if (!res.success) throw new Error(res.message);
            setDeptData(prev => ({
              ...prev,
              members: prev.members.map(m => m.lineUserId === lineUserId ? { ...m, department: editDept } : m),
              departments: (() => {
                const map = {};
                prev.members.map(m => m.lineUserId === lineUserId ? { ...m, department: editDept } : m)
                  .forEach(m => { map[m.department] = (map[m.department]||0)+1; });
                return Object.keys(map).sort().map(n => ({ name:n, count:map[n] }));
              })(),
            }));
            setEditId(null);
          } catch(e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error'); }
          finally { setSaving(false); }
        }

        if (deptLoad) return <Spinner label="กำลังโหลด..." />;
        const depts   = deptData?.departments || [];
        const members = deptData?.members || [];
        const filtered = deptFilter ? members.filter(m => m.department === deptFilter) : members;

        return (
          <div className="animate-fade space-y-4">
            {/* Department Summary */}
            <div className="quiz-card no-hover rounded-2xl p-4">
              <h3 className="font-bold text-sm mb-3" style={{ color:'var(--text)' }}>🏢 สรุปหน่วยงาน / กลุ่ม</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {depts.map(d => (
                  <button key={d.name}
                    className="rounded-xl p-3 text-center transition-all"
                    style={{
                      background: deptFilter===d.name ? 'var(--accent)' : 'var(--input-bg)',
                      border: `1.5px solid ${deptFilter===d.name ? 'var(--accent)' : 'var(--input-border)'}`,
                      color: deptFilter===d.name ? 'white' : 'var(--text)',
                    }}
                    onClick={() => setDeptFilter(prev => prev===d.name ? '' : d.name)}>
                    <div className="text-lg font-black">{d.count}</div>
                    <div className="text-xs truncate">{d.name}</div>
                  </button>
                ))}
              </div>
              {deptFilter && (
                <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5 mt-3 w-full"
                  onClick={() => setDeptFilter('')}>✕ ดูทุกหน่วยงาน</button>
              )}
            </div>

            {/* Member List */}
            <div className="quiz-card no-hover rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm" style={{ color:'var(--text)' }}>
                  👤 สมาชิก {deptFilter ? `— ${deptFilter}` : 'ทุกหน่วยงาน'}
                  <span className="ml-2 text-xs font-normal" style={{ color:'var(--text-muted)' }}>({filtered.length} คน)</span>
                </h3>
              </div>
              <div className="space-y-2">
                {filtered.map(m => (
                  <div key={m.lineUserId} className="rounded-xl p-3"
                    style={{ background:'var(--input-bg)', border:'1px solid var(--input-border)' }}>
                    <div className="flex items-center gap-2">
                      {m.pictureUrl
                        ? <img src={m.pictureUrl} className="w-9 h-9 rounded-full object-cover flex-shrink-0" alt="" />
                        : <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-lg" style={{ background:'var(--card)' }}>👤</div>}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate" style={{ color:'var(--text)' }}>{m.fullName || m.displayName}</div>
                        <div className="text-xs" style={{ color:'var(--text-muted)' }}>{m.studentId && `#${m.studentId} • `}{m.department}</div>
                      </div>
                      {editId === m.lineUserId ? (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <input list="dept-list" className="themed-input text-xs" style={{ width:130 }}
                            placeholder="ชื่อหน่วยงาน..."
                            value={editDept} onChange={e => setEditDept(e.target.value)} />
                          <datalist id="dept-list">{depts.map(d=><option key={d.name} value={d.name}/>)}</datalist>
                          <button className="btn btn-primary text-xs rounded-lg px-2 py-1"
                            disabled={saving===m.lineUserId} onClick={() => saveDept(m.lineUserId)}>
                            {saving===m.lineUserId ? '...' : '💾'}
                          </button>
                          <button className="btn btn-gray text-xs rounded-lg px-2 py-1" onClick={() => setEditId(null)}>✕</button>
                        </div>
                      ) : (
                        <button className="btn btn-gray text-xs rounded-lg px-2 py-1 flex-shrink-0"
                          onClick={() => { setEditId(m.lineUserId); setEditDept(m.department); }}>✏️</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {tab === 'settings' && (
        <div className="animate-fade space-y-4">

          {/* ── Announcements ────────────────── */}
          {(() => {
            const [anns,    setAnns]    = useState([]);
            const [annForm, setAnnForm] = useState({ title:'', body:'', type:'info', pinned:false });
            const [annLoading, setAnnLoading] = useState(false);
            useEffect(() => {
              apiGet('getAnnouncements', {}).then(d => { if(d.success) setAnns(d.announcements||[]); });
            }, []);
            const reload = () => apiGet('getAnnouncements',{}).then(d=>{ if(d.success) setAnns(d.announcements||[]); });
            const add = async() => {
              if (!annForm.title && !annForm.body) return;
              setAnnLoading(true);
              try {
                const d = await apiPost({ action:'addAnnouncement', callerUserId:profile.userId, ...annForm });
                if (!d.success) throw new Error(d.message);
                setAnnForm({ title:'', body:'', type:'info', pinned:false });
                reload();
              } catch(e) { Swal.fire('ข้อผิดพลาด', e.message, 'error'); }
              finally { setAnnLoading(false); }
            };
            const del = async(id) => {
              const r = await Swal.fire({ title:'ลบประกาศ?', icon:'warning', showCancelButton:true, confirmButtonColor:'#ef4444', confirmButtonText:'ลบ' });
              if (!r.isConfirmed) return;
              const d = await apiPost({ action:'deleteAnnouncement', callerUserId:profile.userId, id });
              if (d.success) reload();
            };
            const TYPE_LABEL = { info:'ℹ️ ข้อมูล', warning:'⚠️ เตือน', success:'✅ ข่าวดี' };
            const TYPE_BG    = { info:'#eff6ff', warning:'#fffbeb', success:'#f0fdf4' };
            const TYPE_COLOR = { info:'#1d4ed8', warning:'#92400e', success:'#15803d' };
            return (
              <div className="quiz-card no-hover rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">📢</span>
                  <span className="font-bold text-sm" style={{ color:'var(--text)' }}>ประกาศ / ข่าวสาร</span>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full"
                    style={{ background:'var(--input-bg)', color:'var(--text-muted)' }}>{anns.length} รายการ</span>
                </div>

                {/* Form เพิ่มประกาศ */}
                <div className="space-y-2 mb-3 p-3 rounded-xl" style={{ background:'var(--input-bg)', border:'1px solid var(--input-border)' }}>
                  <input className="themed-input w-full text-sm" placeholder="หัวข้อ (ไม่บังคับ)"
                    value={annForm.title} onChange={e=>setAnnForm(p=>({...p,title:e.target.value}))}/>
                  <textarea className="themed-input w-full text-sm" rows={2} placeholder="ข้อความประกาศ..."
                    value={annForm.body} onChange={e=>setAnnForm(p=>({...p,body:e.target.value}))}
                    style={{ resize:'none' }}/>
                  <div className="flex gap-2">
                    <select className="themed-input flex-1 text-sm" value={annForm.type}
                      onChange={e=>setAnnForm(p=>({...p,type:e.target.value}))}>
                      {Object.entries(TYPE_LABEL).map(([v,l])=><option key={v} value={v}>{l}</option>)}
                    </select>
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color:'var(--text)' }}>
                      <input type="checkbox" checked={annForm.pinned}
                        onChange={e=>setAnnForm(p=>({...p,pinned:e.target.checked}))}/>
                      📌 ปักหมุด
                    </label>
                    <button className="btn text-xs rounded-lg px-3 py-1.5"
                      style={{ background:(!annForm.title&&!annForm.body)||annLoading?'var(--input-bg)':'var(--accent)', color:(!annForm.title&&!annForm.body)||annLoading?'var(--text-muted)':'white' }}
                      disabled={(!annForm.title&&!annForm.body)||annLoading}
                      onClick={add}>
                      {annLoading?'⏳':'➕ เพิ่ม'}
                    </button>
                  </div>
                </div>

                {/* รายการประกาศ */}
                {anns.length===0 ? (
                  <div className="text-center py-4 text-sm" style={{ color:'var(--text-muted)' }}>ยังไม่มีประกาศ</div>
                ) : (
                  <div className="space-y-2">
                    {anns.map(a=>(
                      <div key={a.id} className="flex items-start gap-2 rounded-xl px-3 py-2.5"
                        style={{ background:TYPE_BG[a.type]||'#eff6ff', border:`1px solid var(--input-border)` }}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {a.pinned && <span className="text-xs">📌</span>}
                            <span className="text-xs font-semibold truncate" style={{ color:TYPE_COLOR[a.type]||'#1d4ed8' }}>
                              {TYPE_LABEL[a.type]} {a.title && `— ${a.title}`}
                            </span>
                          </div>
                          {a.body && <div className="text-xs mt-0.5" style={{ color:'var(--text-muted)' }}>{a.body}</div>}
                          <div className="text-xs mt-0.5" style={{ color:'var(--text-muted)', opacity:.6 }}>{a.createdAt}</div>
                        </div>
                        <button className="btn-gray btn text-xs rounded-lg px-2 py-1 flex-shrink-0"
                          onClick={()=>del(a.id)}>🗑</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}


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
          {(() => {
            const [remStatus, setRemStatus] = useState(null);
            const [remLoad, setRemLoad] = useState(false);
            useState(() => {
              apiGet('getReminderStatus', { userId: profile.userId })
                .then(d => { if (d.success) setRemStatus(d); })
                .catch(() => {});
            }, []);
            async function toggleReminder() {
              setRemLoad(true);
              try {
                const action = remStatus?.active ? 'removeReminderTrigger' : 'setupReminderTrigger';
                const d = await apiGet(action, { userId: profile.userId });
                if (d.success) setRemStatus(prev => ({ ...prev, active: !prev?.active, message: d.message }));
              } catch(e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error'); }
              finally { setRemLoad(false); }
            }
            return (
              <div className="quiz-card no-hover rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-bold text-sm" style={{ color:'var(--text)' }}>⏰ แจ้งเตือนใกล้หมดเวลาสอบ</div>
                    <div className="text-xs" style={{ color:'var(--text-muted)' }}>ส่ง LINE แจ้งเตือน 24 ชั่วโมงก่อน ExamSet ปิด</div>
                  </div>
                  <button
                    className="btn text-xs rounded-lg px-3 py-1.5 font-semibold"
                    style={{ background: remStatus?.active ? '#ef4444' : '#16a34a', color:'white', opacity: remLoad ? .6 : 1 }}
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
                    <div className="text-xs font-semibold mb-2" style={{ color:'var(--text-muted)' }}>ประวัติการแจ้งเตือนล่าสุด</div>
                    <div className="space-y-1">
                      {remStatus.logs.map((l,i) => (
                        <div key={i} className="text-xs flex gap-2" style={{ color:'var(--text-muted)' }}>
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
          })()}

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
