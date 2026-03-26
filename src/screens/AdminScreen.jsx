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
  const [loading, setLoading]   = useState(false);
  const [syncing, setSyncing]   = useState(false);
  const [lineProfiles, setLineProfiles] = useState({}); // { userId: { displayName, pictureUrl, statusMessage } }
  const [memberFilter, setMemberFilter] = useState('');
  const [resultSearch, setResultSearch] = useState('');

  useEffect(() => { loadStats(); loadMembers(); }, []);

  async function loadStats() {
    try {
      const data = await apiGet('getAdminStats', { userId: profile.userId });
      if (data.success) setStats(data);
    } catch (e) {}
  }

  async function loadMembers() {
    setLoading(true);
    try {
      const data = await apiGet('getMembers', { userId: profile.userId });
      if (data.success) setMembers(data.members || []);
    } catch (e) {}
    finally { setLoading(false); }
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

          {loading ? <Spinner label="กำลังโหลด..." /> : (
            <div className="space-y-3 mb-4">
              {filteredMembers.length === 0 ? (
                <div className="quiz-card no-hover rounded-2xl p-8 text-center" style={{ color: 'var(--text-muted)' }}>ไม่มีสมาชิก</div>
              ) : filteredMembers.map(m => {
                const st = STATUS_LABEL[m.status] || STATUS_LABEL.inactive;
                const lp = lineProfiles[m.lineUserId]; // LINE real-time profile
                const pic = lp?.pictureUrl || m.pictureUrl;
                const name = lp?.displayName || m.displayName;

                return (
                  <div key={m.lineUserId} className="quiz-card rounded-xl p-4" style={{ cursor: 'default' }}>

                    {/* Profile row */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="relative flex-shrink-0">
                        {pic
                          ? <img src={pic} alt="" className="w-10 h-10 rounded-full object-cover" />
                          : <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: 'var(--input-bg)' }}>👤</div>
                        }
                        {lp && <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" title="ข้อมูลล่าสุดจาก LINE" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-bold text-sm truncate" style={{ color: 'var(--text)' }}>{m.fullName || name}</span>
                          {m.role === 'admin' && <span className="text-xs px-1.5 py-0.5 rounded-full font-bold flex-shrink-0" style={{ background: '#fef9c3', color: '#854d0e' }}>👑 Admin</span>}
                        </div>
                        {/* ชื่อ LINE จริง (ถ้าต่างจากชื่อเต็ม) */}
                        {lp?.displayName && lp.displayName !== m.fullName && (
                          <div className="text-xs flex items-center gap-1 mb-0.5" style={{ color: '#06C755' }}>
                            <span>LINE:</span><span className="font-medium truncate">{lp.displayName}</span>
                          </div>
                        )}
                        {/* Status message จาก LINE */}
                        {lp?.statusMessage && (
                          <div className="text-xs truncate italic" style={{ color: 'var(--text-muted)' }}>💬 {lp.statusMessage}</div>
                        )}
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {m.studentId && `#${m.studentId} • `}{m.email || ''}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>📅 สมัคร {m.joinDate}</div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                        {/* ปุ่มดึงข้อมูล LINE รายคน */}
                        <button
                          className="text-xs px-2 py-0.5 rounded-lg"
                          style={{ background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7' }}
                          onClick={() => fetchOneProfile(m.lineUserId)}
                          title="ดึงข้อมูลล่าสุดจาก LINE"
                        >📲</button>
                      </div>
                    </div>

                    {/* LINE ID */}
                    <div className="mb-3 px-1 py-1 rounded-lg" style={{ background: 'var(--input-bg)', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '10px', wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
                      LINE ID: {m.lineUserId}
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
