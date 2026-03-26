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
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [lineProfiles, setLineProfiles] = useState({});
  const [memberFilter, setMemberFilter] = useState('');
  const [resultSearch, setResultSearch] = useState('');

  useEffect(() => { loadStats(); loadMembers(); }, []);

  async function loadStats() {
    try {
      const data = await apiGet('getAdminStats', { userId: profile.userId });
      if (data.success) setStats(data);
    } catch (e) {}
  }

  // โหลด members จาก Sheets ก่อน (เร็ว) แล้วโหลด LINE profiles ทีหลัง (ช้ากว่า)
  async function loadMembers() {
    setLoading(true);
    try {
      const data = await apiGet('getMembers', { userId: profile.userId });
      if (data.success) setMembers(data.members || []);
    } catch (e) {}
    finally { setLoading(false); }
    // โหลด LINE profiles ใน background
    loadLineProfiles();
  }

  // เรียก getMembersWithProfiles เพื่อดึงรูป+ข้อมูล LINE ทุกคนทีเดียว
  async function loadLineProfiles() {
    setProfilesLoading(true);
    try {
      const data = await apiGet('getMembersWithProfiles', { userId: profile.userId });
      if (!data.success) return;
      const map = {};
      const updatedMembers = [];
      (data.members || []).forEach(m => {
        map[m.lineUserId] = {
          displayName:   m.lineDisplayName,
          pictureUrl:    m.linePictureUrl,
          statusMessage: m.lineStatusMessage,
          language:      m.lineLanguage,
          found:         m.lineFound,
        };
        updatedMembers.push({
          ...m,
          // ถ้า LINE มีรูปให้ใช้แทน
          pictureUrl:  m.linePictureUrl  || m.pictureUrl,
          displayName: m.lineDisplayName || m.displayName,
        });
      });
      setLineProfiles(map);
      setMembers(updatedMembers);
    } catch (e) {}
    finally { setProfilesLoading(false); }
  }

  async function loadResults(page = 0) {
    setLoading(true);
    try {
      const data = await apiGet('getAllResults', { userId: profile.userId, page });
      if (data.success) { setResults(data.results || []); setResultTotal(data.total || 0); setResultPage(page); }
    } catch (e) {}
    finally { setLoading(false); }
  }

  // ── ดึง LINE Profile ของ user คนเดียว ────────────────────
  async function fetchOneProfile(userId) {
    try {
      const data = await apiGet('getLineProfile', { userId, callerUserId: profile.userId });
      if (data.success && data.profile) {
        setLineProfiles(prev => ({ ...prev, [userId]: data.profile }));
      }
    } catch (_) {}
  }

  // ── Sync LINE Profiles ทั้งหมด ────────────────────────────
  async function syncAllProfiles() {
    const r = await Swal.fire({
      title: '🔄 Sync LINE Profiles',
      html: `ระบบจะดึงข้อมูล <b>ชื่อ-รูปโปรไฟล์</b> ล่าสุดจาก LINE<br>สำหรับสมาชิกทุกคนและอัปเดตใน Sheets<br><br><small style="color:#888">อาจใช้เวลาสักครู่ตามจำนวนสมาชิก</small>`,
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

      // อัปเดต local state
      const map = {};
      (data.profiles || []).forEach(p => { map[p.userId] = p; });
      setLineProfiles(prev => ({ ...prev, ...map }));

      // อัปเดต displayName และ pictureUrl ใน members list
      if (data.profiles?.length) {
        setMembers(prev => prev.map(m => {
          const lp = map[m.lineUserId];
          if (!lp) return m;
          return { ...m, displayName: lp.displayName || m.displayName, pictureUrl: lp.pictureUrl || m.pictureUrl };
        }));
      }

      await loadStats();
      Swal.fire({
        icon: 'success',
        title: 'Sync สำเร็จ!',
        html: `✅ อัปเดต <b>${data.updatedCount}</b> คน<br>${data.failedCount > 0 ? `⚠️ ไม่พบใน LINE <b>${data.failedCount}</b> คน` : ''}`,
        timer: 3000,
        showConfirmButton: false,
      });
    } catch (e) {
      Swal.fire('เกิดข้อผิดพลาด', e.message, 'error');
    } finally {
      setSyncing(false);
    }
  }

  async function handleUpdateMember(targetUserId, newStatus) {
    const labels = { active: 'อนุมัติ', inactive: 'ระงับ', pending: 'ตั้งเป็นรออนุมัติ' };
    const r = await Swal.fire({ title: `${labels[newStatus]}ผู้ใช้นี้?`, icon: 'question', showCancelButton: true, confirmButtonText: 'ยืนยัน', cancelButtonText: 'ยกเลิก' });
    if (!r.isConfirmed) return;
    try {
      const data = await apiPost({ action: 'updateMember', callerUserId: profile.userId, targetUserId, newStatus });
      if (!data.success) throw new Error(data.message);
      setMembers(prev => prev.map(m => m.lineUserId === targetUserId ? { ...m, status: newStatus } : m));
      loadStats();
    } catch (e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error'); }
  }

  async function handleDeleteMember(m) {
    const r = await Swal.fire({ title: 'ลบสมาชิก?', html: `<b>${m.fullName || m.displayName}</b>`, icon: 'warning', showCancelButton: true, confirmButtonText: 'ลบเลย', cancelButtonText: 'ยกเลิก', confirmButtonColor: '#ef4444' });
    if (!r.isConfirmed) return;
    try {
      const data = await apiPost({ action: 'deleteMember', callerUserId: profile.userId, targetUserId: m.lineUserId });
      if (!data.success) throw new Error(data.message);
      setMembers(prev => prev.filter(x => x.lineUserId !== m.lineUserId));
      loadStats();
    } catch (e) { Swal.fire('เกิดข้อผิดพลาด', e.message, 'error'); }
  }

  const TABS = [
    { key: 'stats',   label: '📊 สถิติ' },
    { key: 'members', label: '👥 สมาชิก' },
    { key: 'results', label: '📋 ผลสอบ' },
  ];

  const filteredMembers = memberFilter ? members.filter(m => m.status === memberFilter) : members;
  const filteredResults = resultSearch ? results.filter(r => r.name.includes(resultSearch) || r.lesson.includes(resultSearch)) : results;

  return (
    <div className="animate-fade">
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
          <button
            key={t.key}
            className="flex-1 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all"
            style={{
              background: tab === t.key ? 'var(--accent)' : 'var(--card)',
              color: tab === t.key ? 'white' : 'var(--text-muted)',
              border: `1.5px solid ${tab === t.key ? 'var(--accent)' : 'var(--card-border)'}`,
            }}
            onClick={() => {
              setTab(t.key);
              if (t.key === 'results' && results.length === 0) loadResults(0);
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* ── Stats Tab ─────────────────────────────── */}
      {tab === 'stats' && (
        <div className="animate-fade">
          {!stats ? <Spinner label="กำลังโหลดสถิติ..." /> : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { val: stats.totalMembers,        label: 'สมาชิกทั้งหมด',    color: 'var(--accent)' },
                  { val: stats.activeMembers,        label: 'ใช้งานได้',          color: '#16a34a' },
                  { val: stats.pendingMembers,       label: 'รออนุมัติ',          color: '#d97706' },
                  { val: stats.totalQuestions,       label: 'ข้อสอบทั้งหมด',    color: '#6366f1' },
                  { val: stats.totalExams,           label: 'ครั้งสอบรวม',        color: '#3b82f6' },
                  { val: stats.avgPassRate + '%',    label: 'อัตราผ่านเฉลี่ย',  color: '#ec4899' },
                ].map(s => (
                  <div key={s.label} className="stat-box">
                    <div className="text-xl sm:text-2xl font-black" style={{ color: s.color }}>{s.val}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Subject Stats */}
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

          {/* Filter bar + Sync button */}
          <div className="quiz-card no-hover rounded-2xl p-3 mb-3">
            <div className="flex gap-2 flex-wrap mb-2">
              {['', 'active', 'pending', 'inactive'].map(s => (
                <button key={s} onClick={() => setMemberFilter(s)}
                  className="btn text-xs rounded-lg px-3 py-1.5"
                  style={{ background: memberFilter === s ? 'var(--accent)' : 'var(--input-bg)', color: memberFilter === s ? 'white' : 'var(--text-muted)' }}>
                  {s === '' ? 'ทั้งหมด' : s === 'active' ? '✅ ใช้งาน' : s === 'pending' ? '⏳ รออนุมัติ' : '🚫 ระงับ'}
                  <span className="ml-1 font-bold">
                    {s === '' ? members.length : members.filter(m => m.status === s).length}
                  </span>
                </button>
              ))}
              <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5 ml-auto" onClick={loadMembers}>🔄</button>
            </div>

            {/* Sync LINE Profiles button */}
            <button
              className="btn w-full rounded-xl py-2.5 text-sm font-semibold"
              style={{ background: syncing ? 'var(--input-bg)' : '#06C755', color: syncing ? 'var(--text-muted)' : 'white' }}
              onClick={syncAllProfiles}
              disabled={syncing}
            >
              {syncing
                ? <span className="flex items-center justify-center gap-2"><span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> กำลัง Sync LINE Profiles...</span>
                : '📲 Sync ข้อมูลจาก LINE ทุกคน'}
            </button>
          </div>

          {/* แถบแสดงสถานะโหลด LINE profiles */}
          {profilesLoading && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3 text-xs"
              style={{ background: '#e8f5e9', color: '#2e7d32' }}>
              <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
              กำลังโหลดรูปโปรไฟล์จาก LINE...
            </div>
          )}

          {loading ? <Spinner label="กำลังโหลด..." /> : (
            <div className="space-y-3 mb-4">
              {filteredMembers.length === 0 ? (
                <div className="quiz-card no-hover rounded-2xl p-8 text-center" style={{ color: 'var(--text-muted)' }}>ไม่มีสมาชิก</div>
              ) : filteredMembers.map(m => {
                const st  = STATUS_LABEL[m.status] || STATUS_LABEL.inactive;
                const lp  = lineProfiles[m.lineUserId];
                const pic = m.pictureUrl || lp?.pictureUrl || '';
                const lineName = lp?.displayName || m.displayName;

                return (
                  <div key={m.lineUserId} className="quiz-card rounded-xl p-3 sm:p-4" style={{ cursor: 'default' }}>

                    {/* Profile row — รูปใหญ่ + ข้อมูล */}
                    <div className="flex items-center gap-3 mb-3">

                      {/* รูปโปรไฟล์จาก LINE */}
                      <div className="relative flex-shrink-0">
                        {pic ? (
                          <img
                            src={pic}
                            alt={lineName}
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover shadow-md"
                            onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                          />
                        ) : null}
                        <div
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full items-center justify-center text-2xl shadow-md"
                          style={{ background: 'var(--input-bg)', display: pic ? 'none' : 'flex' }}
                        >👤</div>

                        {/* สถานะ online indicator */}
                        <span
                          className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white"
                          style={{ background: lp?.found ? '#06C755' : (profilesLoading ? '#d97706' : '#94a3b8') }}
                          title={lp?.found ? 'พบใน LINE' : (profilesLoading ? 'กำลังโหลด...' : 'ไม่พบใน LINE')}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* ชื่อจริง */}
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <span className="font-bold text-sm sm:text-base truncate" style={{ color: 'var(--text)' }}>
                            {m.fullName || lineName}
                          </span>
                          {m.role === 'admin' && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-bold flex-shrink-0" style={{ background: '#fef9c3', color: '#854d0e' }}>👑 Admin</span>
                          )}
                        </div>

                        {/* ชื่อ LINE (ถ้าต่างจากชื่อที่ลงทะเบียน) */}
                        {lp?.found && lp.displayName && lp.displayName !== m.fullName && (
                          <div className="flex items-center gap-1 text-xs mb-0.5">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="#06C755"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
                            <span className="font-medium" style={{ color: '#06C755' }}>{lp.displayName}</span>
                          </div>
                        )}

                        {/* Status message */}
                        {lp?.statusMessage && (
                          <div className="text-xs truncate italic mb-0.5" style={{ color: 'var(--text-muted)' }}>
                            💬 {lp.statusMessage}
                          </div>
                        )}

                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {m.studentId && `#${m.studentId} • `}{m.email || ''}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>📅 สมัคร {m.joinDate}</div>
                      </div>

                      {/* badge สถานะ + ปุ่ม refresh รายคน */}
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                        <button
                          className="text-xs px-2 py-1 rounded-lg"
                          style={{ background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7' }}
                          onClick={() => fetchOneProfile(m.lineUserId)}
                          title="รีเฟรชข้อมูล LINE"
                        >📲</button>
                      </div>
                    </div>

                    {/* LINE ID */}
                    <div className="mb-3 px-2 py-1.5 rounded-lg flex items-center gap-2"
                      style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#06C755" className="flex-shrink-0"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
                      <span style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{m.lineUserId}</span>
                    </div>

                    {/* Action buttons */}
                    {m.role !== 'admin' && (
                      <div className="flex gap-2 flex-wrap">
                        {m.status !== 'active' && (
                          <button className="btn text-xs rounded-lg px-3 py-1.5 flex-1" style={{ background: '#dcfce7', color: '#15803d' }} onClick={() => handleUpdateMember(m.lineUserId, 'active')}>✅ อนุมัติ</button>
                        )}
                        {m.status === 'active' && (
                          <button className="btn text-xs rounded-lg px-3 py-1.5 flex-1" style={{ background: '#fee2e2', color: '#b91c1c' }} onClick={() => handleUpdateMember(m.lineUserId, 'inactive')}>🚫 ระงับ</button>
                        )}
                        <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5" onClick={() => handleDeleteMember(m)}>🗑 ลบ</button>
                      </div>
                    )}
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
            <input className="themed-input flex-1" placeholder="🔍 ค้นหาชื่อ / วิชา..." value={resultSearch} onChange={e => setResultSearch(e.target.value)} />
            <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5" onClick={() => loadResults(0)}>🔄</button>
          </div>
          <div className="text-xs mb-2 text-right" style={{ color: 'var(--text-muted)' }}>ทั้งหมด {resultTotal} รายการ</div>

          {loading ? <Spinner label="กำลังโหลด..." /> : (
            <>
              <div className="space-y-2 mb-4">
                {filteredResults.length === 0 ? (
                  <div className="quiz-card no-hover rounded-2xl p-8 text-center" style={{ color: 'var(--text-muted)' }}>ไม่มีข้อมูล</div>
                ) : filteredResults.map(r => {
                  const pct = parseInt(r.pct);
                  const pass = r.pass === 'ผ่าน';
                  return (
                    <div key={r.examId} className="quiz-card no-hover rounded-xl p-2 sm:p-3" style={{ cursor: 'default' }}>
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <span className="font-semibold text-xs sm:text-sm truncate" style={{ color: 'var(--text)' }}>{r.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: pass ? '#dcfce7' : '#fee2e2', color: pass ? '#15803d' : '#b91c1c' }}>
                          {pass ? '✅ ผ่าน' : '❌ ไม่ผ่าน'}
                        </span>
                      </div>
                      <div className="text-xs mb-1" style={{ color: 'var(--accent)' }}>{r.lesson}</div>
                      <div className="flex items-center gap-3">
                        <span className="text-base sm:text-xl font-black flex-shrink-0" style={{ color: pass ? '#16a34a' : '#ef4444' }}>{pct}%</span>
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

              {/* Pagination */}
              {resultTotal > 50 && (
                <div className="flex gap-2 justify-center mb-4">
                  <button className="btn btn-gray text-xs rounded-lg px-4 py-2" disabled={resultPage === 0} onClick={() => loadResults(resultPage - 1)}>← ก่อนหน้า</button>
                  <span className="text-sm py-2" style={{ color: 'var(--text-muted)' }}>หน้า {resultPage + 1}</span>
                  <button className="btn btn-gray text-xs rounded-lg px-4 py-2" disabled={(resultPage + 1) * 50 >= resultTotal} onClick={() => loadResults(resultPage + 1)}>ถัดไป →</button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
