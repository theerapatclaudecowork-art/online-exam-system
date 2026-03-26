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
  const [loading, setLoading] = useState(false);
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
      <div className="quiz-card no-hover rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>⚙️ จัดการระบบ</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Admin Panel</p>
          </div>
          <div className="flex gap-2">
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
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
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
                    <div className="text-2xl font-black" style={{ color: s.color }}>{s.val}</div>
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
          <div className="quiz-card no-hover rounded-2xl p-3 mb-3 flex gap-2 flex-wrap">
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

          {loading ? <Spinner label="กำลังโหลด..." /> : (
            <div className="space-y-3 mb-4">
              {filteredMembers.length === 0 ? (
                <div className="quiz-card no-hover rounded-2xl p-8 text-center" style={{ color: 'var(--text-muted)' }}>ไม่มีสมาชิก</div>
              ) : filteredMembers.map(m => {
                const st = STATUS_LABEL[m.status] || STATUS_LABEL.inactive;
                return (
                  <div key={m.lineUserId} className="quiz-card rounded-xl p-4" style={{ cursor: 'default' }}>
                    <div className="flex items-center gap-3 mb-3">
                      {m.pictureUrl
                        ? <img src={m.pictureUrl} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                        : <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-lg" style={{ background: 'var(--input-bg)' }}>👤</div>
                      }
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate" style={{ color: 'var(--text)' }}>{m.fullName || m.displayName}</div>
                        <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{m.studentId && `#${m.studentId} • `}{m.email || m.displayName}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>สมัคร {m.joinDate}</div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-semibold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                    </div>
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
                    {m.role === 'admin' && <div className="text-xs text-center py-1" style={{ color: 'var(--accent)', fontWeight: 600 }}>👑 แอดมิน</div>}
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
          <div className="quiz-card no-hover rounded-2xl p-3 mb-3 flex gap-2">
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
                    <div key={r.examId} className="quiz-card no-hover rounded-xl p-3" style={{ cursor: 'default' }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{r.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: pass ? '#dcfce7' : '#fee2e2', color: pass ? '#15803d' : '#b91c1c' }}>
                          {pass ? '✅ ผ่าน' : '❌ ไม่ผ่าน'}
                        </span>
                      </div>
                      <div className="text-xs mb-1" style={{ color: 'var(--accent)' }}>{r.lesson}</div>
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-black" style={{ color: pass ? '#16a34a' : '#ef4444' }}>{pct}%</span>
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
