import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useApp } from '../context/AppContext';
import { apiGet, apiPost } from '../utils/api';
import Spinner from '../components/Spinner';

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
  const [detail, setDetail]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({
    fullName:  member.fullName  || '',
    email:     member.email     || '',
    phone:     member.phone     || '',
    studentId: member.studentId || '',
    status:    member.status    || 'pending',
    role:      member.role      || '',
  });

  const isSelf = callerUserId === member.lineUserId;

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line
  }, []);

  async function loadDetail() {
    setLoading(true);
    try {
      const data = await apiPost({ action: 'getMemberDetail', callerUserId, targetUserId: member.lineUserId });
      if (data.success) {
        setDetail(data);
        setForm({
          fullName:  data.member.fullName  || '',
          email:     data.member.email     || '',
          phone:     data.member.phone     || '',
          studentId: data.member.studentId || '',
          status:    data.member.status    || 'pending',
          role:      data.member.role      || '',
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
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>รหัสนักเรียน/พนักงาน</span>
                      <input className="themed-input w-full mt-1" value={form.studentId}
                        onChange={e => setForm(p => ({ ...p, studentId: e.target.value }))} placeholder="รหัส" />
                    </label>
                  </div>

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
                      { label: 'เบอร์โทร',      val: m.phone    || '—' },
                      { label: 'รหัสนักเรียน',  val: m.studentId|| '—' },
                      { label: 'วันที่สมัคร',   val: m.joinDate  || '—' },
                    ].map(({ label, val }) => (
                      <div key={label} className="flex justify-between gap-2">
                        <span className="text-xs" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
                        <span className="text-xs font-medium text-right truncate" style={{ color: 'var(--text)' }}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── LINE Info ─────────────────────── */}
              <div className="rounded-2xl p-4" style={{ background: 'var(--input-bg)' }}>
                <div className="flex items-center gap-1 mb-3">
                  {LINE_ICON}
                  <span className="text-xs font-bold" style={{ color: '#06C755' }}>LINE Info</span>
                  {m.lineFound
                    ? <span className="text-xs px-2 py-0.5 rounded-full ml-auto" style={{ background: '#e8f5e9', color: '#15803d' }}>✅ พบข้อมูล</span>
                    : <span className="text-xs px-2 py-0.5 rounded-full ml-auto" style={{ background: '#f3f4f6', color: '#6b7280' }}>ไม่พบ</span>
                  }
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between gap-2">
                    <span className="text-xs" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>LINE ID</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-muted)', wordBreak: 'break-all', textAlign: 'right' }}>{m.lineUserId}</span>
                  </div>
                  {m.lineDisplayName && (
                    <div className="flex justify-between gap-2">
                      <span className="text-xs" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>ชื่อ LINE</span>
                      <span className="text-xs font-semibold" style={{ color: '#06C755' }}>{m.lineDisplayName}</span>
                    </div>
                  )}
                  {lastSyncTime && (
                    <div className="flex justify-between gap-2">
                      <span className="text-xs" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>Sync ล่าสุด</span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{lastSyncTime}</span>
                    </div>
                  )}
                </div>
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
export default function AdminScreen() {
  const { navigate, profile } = useApp();
  const [tab, setTab]         = useState('stats');
  const [stats, setStats]     = useState(null);
  const [members, setMembers] = useState([]);
  const [results, setResults] = useState([]);
  const [resultTotal, setResultTotal] = useState(0);
  const [resultPage, setResultPage]   = useState(0);
  const [loading, setLoading]         = useState(false);
  const [syncing, setSyncing]         = useState(false);
  const [memberFilter, setMemberFilter] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [resultSearch, setResultSearch] = useState('');
  const [triggerStatus, setTriggerStatus] = useState(null);
  const [lastSyncTime, setLastSyncTime]   = useState('');
  const [selectedMember, setSelectedMember] = useState(null);

  useEffect(() => { loadStats(); loadMembers(); loadTriggerStatus(); }, []);

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
      if (data.lastSyncTime) setLastSyncTime(data.lastSyncTime);
    } catch (_) {}
    finally { setLoading(false); }
  }

  async function loadTriggerStatus() {
    try {
      const data = await apiGet('getTriggerStatus', { userId: profile.userId });
      if (data.success) {
        setTriggerStatus(data);
        if (data.lastSyncTime && data.lastSyncTime !== '(ยังไม่เคย sync)') setLastSyncTime(data.lastSyncTime);
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
      await loadMembers();
      await loadTriggerStatus();
      Swal.fire({
        icon: 'success', title: 'Sync สำเร็จ!',
        html: `✅ อัปเดต <b>${data.updatedCount}</b> คน${data.failedCount > 0 ? `<br>⚠️ ไม่พบใน LINE <b>${data.failedCount}</b> คน` : ''}`,
        timer: 3000, showConfirmButton: false,
      });
    } catch (e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error');
    } finally { setSyncing(false); }
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
    { key: 'stats',   label: '📊 สถิติ' },
    { key: 'members', label: '👥 สมาชิก' },
    { key: 'results', label: '📋 ผลสอบ' },
  ];

  // filter + search
  const filteredMembers = members
    .filter(m => memberFilter ? m.status === memberFilter : true)
    .filter(m => memberSearch
      ? (m.fullName + m.displayName + m.email + m.studentId + m.lineUserId)
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
            <button className="btn btn-primary text-xs rounded-lg px-3 py-1.5" onClick={() => navigate('questionManager')}>📚 จัดการข้อสอบ</button>
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
        <div className="animate-fade">
          {!stats ? <Spinner label="กำลังโหลดสถิติ..." /> : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { val: stats.totalMembers,     label: 'สมาชิกทั้งหมด',   color: 'var(--accent)' },
                  { val: stats.activeMembers,    label: 'ใช้งานได้',         color: '#16a34a' },
                  { val: stats.pendingMembers,   label: 'รออนุมัติ',         color: '#d97706' },
                  { val: stats.totalQuestions,   label: 'ข้อสอบทั้งหมด',   color: '#6366f1' },
                  { val: stats.totalExams,       label: 'ครั้งสอบรวม',       color: '#3b82f6' },
                  { val: stats.avgPassRate + '%', label: 'อัตราผ่านเฉลี่ย', color: '#ec4899' },
                ].map(s => (
                  <div key={s.label} className="stat-box">
                    <div className="text-xl sm:text-2xl font-black" style={{ color: s.color }}>{s.val}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {stats.subjectStats?.length > 0 && (
                <div className="quiz-card no-hover rounded-2xl p-4 mb-4">
                  <h3 className="font-bold mb-3" style={{ color: 'var(--text)' }}>📈 สถิติตามวิชา</h3>
                  <div className="space-y-2">
                    {stats.subjectStats.map(s => (
                      <div key={s.name}>
                        <div className="flex justify-between text-xs mb-1">
                          <span style={{ color: 'var(--text)', fontWeight: 600 }}>{s.name}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{s.count} ครั้ง • ผ่าน {s.passRate}%</span>
                        </div>
                        <div style={{ background: 'var(--progress-trk)', borderRadius: 999, height: 6, overflow: 'hidden' }}>
                          <div style={{ width: `${s.passRate}%`, height: '100%', background: s.passRate >= 60 ? '#22c55e' : '#ef4444', borderRadius: 999 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button className="btn btn-gray w-full rounded-xl py-2.5 text-sm" onClick={loadStats}>🔄 รีเฟรช</button>
            </>
          )}
        </div>
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

            {/* Trigger status */}
            <div className="flex items-center gap-2 text-xs pt-1" style={{ borderTop: '1px solid var(--input-border)' }}>
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${triggerStatus?.hasHourlyTrigger ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span style={{ color: 'var(--text-muted)' }}>
                {triggerStatus?.hasHourlyTrigger ? '⏱ Auto sync ทุก 1 ชม.' : '⚠️ ยังไม่ได้ติดตั้ง trigger'}
                {lastSyncTime ? ` | 🕐 ${lastSyncTime}` : ''}
              </span>
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
                : '📲 Sync ข้อมูลจาก LINE ทันที'}
            </button>
          </div>

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

      {/* ── Results Tab ───────────────────────────── */}
      {tab === 'results' && (
        <div className="animate-fade">
          <div className="quiz-card no-hover rounded-2xl p-2 sm:p-3 mb-3 flex gap-2">
            <input className="themed-input flex-1" placeholder="🔍 ค้นหาชื่อ / วิชา..."
              value={resultSearch} onChange={e => setResultSearch(e.target.value)} />
            <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5" onClick={() => loadResults(0)}>🔄</button>
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
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                          style={{ background: pass ? '#dcfce7' : '#fee2e2', color: pass ? '#15803d' : '#b91c1c' }}>
                          {pass ? '✅ ผ่าน' : '❌ ไม่ผ่าน'}
                        </span>
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
    </div>
  );
}
