import { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { useApp } from '../context/AppContext';
import { apiGet, apiPost } from '../utils/api';
import QuestionManagerScreen from './QuestionManagerScreen';
import ExamSetManagerScreen  from './ExamSetManagerScreen';
import GeminiQuizGenerator   from '../components/GeminiQuizGenerator';
import SubjectManager        from '../components/SubjectManager';
import LessonManager         from '../components/LessonManager';

// ── Tab definitions ────────────────────────────────────────────
const TABS = [
  { key: 'home',        label: '🏠 หน้าหลัก' },
  { key: 'questions',   label: '📝 ข้อสอบ' },
  { key: 'examsets',    label: '📦 ชุดข้อสอบ' },
  { key: 'lessons',     label: '📖 บทเรียน' },
  { key: 'assign',      label: '📋 มอบหมาย' },
  { key: 'results',     label: '📊 ผลสอบ' },
  { key: 'subjects',    label: '📖 รายวิชา' },
  { key: 'ai',          label: '🤖 AI' },
];

// ── KPI Card ───────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, color = '#7c3aed' }) {
  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--card-border)',
      borderRadius: 16,
      padding: '16px 14px',
      display: 'flex', flexDirection: 'column', gap: 4,
      boxShadow: '0 2px 8px rgba(0,0,0,.06)',
    }}>
      <div style={{ fontSize: 26, lineHeight: 1 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value ?? '—'}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  );
}

// ── Quick Action Button ────────────────────────────────────────
function ActionBtn({ icon, label, desc, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: 'var(--card-bg)',
      border: `2px solid ${color}22`,
      borderRadius: 16,
      padding: '16px 14px',
      cursor: 'pointer',
      textAlign: 'left',
      display: 'flex', alignItems: 'center', gap: 14,
      transition: 'all .18s',
      width: '100%',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = `${color}22`; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 14, flexShrink: 0,
        background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24,
      }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
      </div>
      <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 18 }}>›</div>
    </button>
  );
}

// ── Results Tab (simple table) ─────────────────────────────────
function ResultsPanel({ profile }) {
  const [rows, setRows]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr]       = useState('');
  const [page, setPage]     = useState(0);
  const [total, setTotal]   = useState(0);
  const PAGE_SIZE = 50;

  function loadResults(p = 0) {
    setLoading(true); setErr('');
    apiGet('getAllResults', { userId: profile?.userId, page: p })
      .then(d => {
        if (d.success) {
          setRows(d.results || []);
          setTotal(d.total ?? (d.results?.length || 0));
          setPage(p);
        } else setErr(d.message || 'เกิดข้อผิดพลาด');
      })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadResults(0); }, [profile?.userId]);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
      <div className="spinner" style={{ margin: '0 auto 12px' }} />
      <div>กำลังโหลดผลสอบ...</div>
    </div>
  );

  if (err) return (
    <div style={{ textAlign: 'center', padding: 48, color: '#ef4444' }}>
      ⚠️ {err}
    </div>
  );

  if (!rows.length) return (
    <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
      <div style={{ fontSize: 48 }}>📊</div>
      <div style={{ marginTop: 8 }}>ยังไม่มีผลสอบในชุดข้อสอบของคุณ</div>
    </div>
  );

  // summary stats (from current page)
  const passed   = rows.filter(r => r.passed).length;
  const passRate = rows.length ? Math.round((passed / rows.length) * 100) : 0;
  const avgScore = rows.length ? Math.round(rows.reduce((s, r) => s + (Number(r.score) || 0), 0) / rows.length) : 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        <KpiCard icon="📋" label="ครั้งที่สอบ"   value={total}          color="#7c3aed" />
        <KpiCard icon="✅" label="ผ่าน (หน้านี้)"  value={`${passRate}%`} color="#16a34a" />
        <KpiCard icon="📈" label="คะแนนเฉลี่ย"   value={`${avgScore}%`} color="#2563eb" />
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--card-border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--card-bg)', borderBottom: '2px solid var(--card-border)' }}>
              {['ผู้สอบ', 'ชุดข้อสอบ', 'คะแนน', 'ผล', 'วันที่'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--card-border)', background: i % 2 === 0 ? 'transparent' : 'var(--card-bg)' }}>
                <td style={{ padding: '9px 12px', color: 'var(--text)' }}>{r.displayName || r.userId?.slice(0, 8)}</td>
                <td style={{ padding: '9px 12px', color: 'var(--text-muted)', fontSize: 12 }}>{r.setTitle || r.lesson || '—'}</td>
                <td style={{ padding: '9px 12px', fontWeight: 700, color: Number(r.score) >= 60 ? '#16a34a' : '#ef4444' }}>{r.score}%</td>
                <td style={{ padding: '9px 12px' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                    background: r.passed ? '#dcfce7' : '#fee2e2',
                    color: r.passed ? '#15803d' : '#dc2626',
                  }}>
                    {r.passed ? '✅ ผ่าน' : '❌ ไม่ผ่าน'}
                  </span>
                </td>
                <td style={{ padding: '9px 12px', color: 'var(--text-muted)', fontSize: 11 }}>
                  {r.timestamp ? new Date(r.timestamp).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <button
            onClick={() => loadResults(page - 1)}
            disabled={page === 0 || loading}
            style={{
              padding: '8px 18px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer',
              border: '1.5px solid var(--input-border)',
              background: page === 0 ? 'var(--input-bg)' : 'var(--card)',
              color: page === 0 ? 'var(--text-muted)' : 'var(--text)',
              opacity: page === 0 ? 0.5 : 1,
            }}>
            ‹ ก่อนหน้า
          </button>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
            หน้า {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => loadResults(page + 1)}
            disabled={page >= totalPages - 1 || loading}
            style={{
              padding: '8px 18px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer',
              border: '1.5px solid var(--input-border)',
              background: page >= totalPages - 1 ? 'var(--input-bg)' : 'var(--card)',
              color: page >= totalPages - 1 ? 'var(--text-muted)' : 'var(--text)',
              opacity: page >= totalPages - 1 ? 0.5 : 1,
            }}>
            ถัดไป ›
          </button>
        </div>
      )}
    </div>
  );
}

// ── Teacher Home Dashboard ─────────────────────────────────────
function TeacherHome({ profile, onNavigate }) {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('getAdminStats', { userId: profile?.userId })
      .then(d => { if (d.success) setStats(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profile?.userId]);

  const qTotal   = stats?.totalQuestions ?? '—';
  const setTotal = stats?.totalSets      ?? '—';
  const resTotal = stats?.totalResults   ?? '—';
  const passRate = stats?.passRate       != null ? `${Math.round(stats.passRate)}%` : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Welcome header */}
      <div style={{
        background: 'linear-gradient(135deg,#7c3aed 0%,#a855f7 100%)',
        borderRadius: 20, padding: '22px 20px', color: '#fff',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,.08)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 13, opacity: .8, marginBottom: 4 }}>ยินดีต้อนรับ</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
            {profile?.displayName || 'ครูผู้สอน'} 🎓
          </div>
          <div style={{ fontSize: 12, opacity: .75 }}>ระบบจัดการข้อสอบ — ครูผู้สอน</div>
        </div>
      </div>

      {/* KPI Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ height: 90, background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--card-border)', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
          <KpiCard icon="📝" label="ข้อสอบของฉัน"   value={qTotal}   color="#7c3aed" />
          <KpiCard icon="📦" label="ชุดข้อสอบ"       value={setTotal} color="#2563eb" />
          <KpiCard icon="📋" label="ครั้งที่สอบ"     value={resTotal} color="#16a34a" />
          <KpiCard icon="✅" label="อัตราผ่าน"       value={passRate} color="#f59e0b" />
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-muted)', marginBottom: 2 }}>เมนูด่วน</div>
        <ActionBtn
          icon="📝" label="จัดการข้อสอบ"
          desc="เพิ่ม แก้ไข ลบข้อสอบของคุณ"
          color="#7c3aed"
          onClick={() => onNavigate('questions')}
        />
        <ActionBtn
          icon="📦" label="จัดการชุดข้อสอบ"
          desc="สร้างและจัดการชุดข้อสอบ"
          color="#2563eb"
          onClick={() => onNavigate('examsets')}
        />
        <ActionBtn
          icon="📋" label="มอบหมายข้อสอบ"
          desc="สั่งให้นักเรียนทำชุดข้อสอบ + ติดตาม"
          color="#f59e0b"
          onClick={() => onNavigate('assign')}
        />
        <ActionBtn
          icon="📊" label="ดูผลสอบ"
          desc="ติดตามผลสอบของนักเรียน"
          color="#16a34a"
          onClick={() => onNavigate('results')}
        />
        <ActionBtn
          icon="🤖" label="AI สร้างข้อสอบ + เติมคำอธิบาย"
          desc="ใช้ Gemini ช่วยออกข้อสอบและเฉลย"
          color="#a855f7"
          onClick={() => onNavigate('ai')}
        />
      </div>
    </div>
  );
}

// ── Fill Explanations Panel ────────────────────────────────────
function FillExplanationsPanel({ profile }) {
  const [status, setStatus]   = useState(null);  // { total, missing, filled }
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null); // { processed, remaining, total, updated }
  const [log, setLog] = useState([]);

  const fetchStatus = () => {
    setLoading(true);
    apiGet('getExplanationFillStatus', { userId: profile?.userId })
      .then(d => { if (d.success) setStatus(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStatus(); }, [profile?.userId]);

  const runBatch = async () => {
    setRunning(true);
    setLog([]);
    let offset = 0;
    let totalUpdated = 0;
    let round = 0;

    try {
      while (true) {
        round++;
        setLog(prev => [...prev, `รอบ ${round}: กำลังสร้างคำอธิบาย (offset ${offset})...`]);

        const d = await apiPost({
          action: 'fillExplanationsWithGemini',
          callerUserId: profile?.userId,
          batchSize: 10,
          offset,
        });

        if (!d.success) {
          setLog(prev => [...prev, `❌ ${d.message}`]);
          break;
        }

        totalUpdated += (d.updated || 0);
        setProgress({ processed: offset + (d.processed || 0), remaining: d.remaining, total: d.total, updated: totalUpdated });
        setLog(prev => [...prev, `✅ รอบ ${round}: อัปเดต ${d.updated || 0} ข้อ (เหลือ ${d.remaining})`]);

        if (d.remaining <= 0 || d.processed === 0) {
          setLog(prev => [...prev, `🎉 เสร็จสิ้น! สร้างคำอธิบายทั้งหมด ${totalUpdated} ข้อ`]);
          break;
        }

        offset += d.processed || 10;
        // brief pause between batches
        await new Promise(r => setTimeout(r, 1500));
      }
    } catch (e) {
      setLog(prev => [...prev, `❌ Error: ${e.message}`]);
    }

    setRunning(false);
    fetchStatus();
  };

  const handleStart = () => {
    Swal.fire({
      title: 'เติมคำอธิบายด้วย AI',
      html: `Gemini จะสร้างคำอธิบายเฉลยให้ข้อสอบที่ยังว่าง <b>${status?.missing || 0}</b> ข้อ<br><small>ทำทีละ 10 ข้อ จนครบ</small>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'เริ่มเลย',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#7c3aed',
    }).then(r => { if (r.isConfirmed) runBatch(); });
  };

  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--card-border)',
      borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, color: '#fff',
        }}>📖</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>เติมคำอธิบายเฉลย (AI)</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Gemini สร้างคำอธิบายให้ข้อที่ยังว่างอัตโนมัติ</div>
        </div>
      </div>

      {/* Status */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 8px' }} />
          กำลังตรวจสอบ...
        </div>
      ) : status ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          <div style={{ textAlign: 'center', padding: 12, borderRadius: 12, background: '#7c3aed12' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#7c3aed' }}>{status.total}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ข้อสอบทั้งหมด</div>
          </div>
          <div style={{ textAlign: 'center', padding: 12, borderRadius: 12, background: status.missing > 0 ? '#ef444412' : '#16a34a12' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: status.missing > 0 ? '#ef4444' : '#16a34a' }}>{status.missing}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ยังไม่มีคำอธิบาย</div>
          </div>
          <div style={{ textAlign: 'center', padding: 12, borderRadius: 12, background: '#16a34a12' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a' }}>{status.filled}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>มีคำอธิบายแล้ว</div>
          </div>
        </div>
      ) : null}

      {/* Progress */}
      {progress && (
        <div style={{ padding: 12, borderRadius: 12, background: '#7c3aed08', border: '1px solid #7c3aed22' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, color: 'var(--text)' }}>
            <span>ความคืบหน้า</span>
            <span style={{ fontWeight: 700 }}>{progress.updated} / {progress.total} ข้อ</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: '#e2e8f0', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4, transition: 'width .4s',
              background: 'linear-gradient(90deg,#7c3aed,#a855f7)',
              width: progress.total ? `${Math.round(((progress.total - progress.remaining) / progress.total) * 100)}%` : '0%',
            }} />
          </div>
        </div>
      )}

      {/* Log */}
      {log.length > 0 && (
        <div style={{
          maxHeight: 160, overflowY: 'auto', fontSize: 11,
          fontFamily: 'monospace', padding: 10, borderRadius: 10,
          background: '#1e293b', color: '#94a3b8',
        }}>
          {log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}

      {/* Action Button */}
      {status && status.missing > 0 && (
        <button onClick={handleStart} disabled={running} style={{
          padding: '12px 0', borderRadius: 12, border: 'none', cursor: running ? 'wait' : 'pointer',
          background: running ? '#94a3b8' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
          color: '#fff', fontWeight: 700, fontSize: 14, transition: 'all .2s',
        }}>
          {running ? '⏳ กำลังดำเนินการ...' : `📖 เติมคำอธิบาย ${status.missing} ข้อ ด้วย Gemini AI`}
        </button>
      )}

      {status && status.missing === 0 && !running && (
        <div style={{
          textAlign: 'center', padding: 16, borderRadius: 12,
          background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: 14,
        }}>
          ✅ ข้อสอบทุกข้อมีคำอธิบายเฉลยครบแล้ว!
        </div>
      )}

      <button onClick={fetchStatus} disabled={loading || running} style={{
        padding: '8px 0', borderRadius: 10, border: '1px solid var(--card-border)',
        background: 'var(--card-bg)', color: 'var(--text-muted)',
        cursor: 'pointer', fontSize: 12, fontWeight: 600,
      }}>
        🔄 รีเฟรชสถานะ
      </button>
    </div>
  );
}

// ── AI Tab Content ────────────────────────────────────────────
function AITab({ profile }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* AI Quiz Generator */}
      <GeminiQuizGenerator profile={profile} />

      {/* Divider */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        color: 'var(--text-muted)', fontSize: 12, fontWeight: 600,
      }}>
        <div style={{ flex: 1, height: 1, background: 'var(--card-border)' }} />
        เครื่องมือ AI เพิ่มเติม
        <div style={{ flex: 1, height: 1, background: 'var(--card-border)' }} />
      </div>

      {/* Fill Explanations */}
      <FillExplanationsPanel profile={profile} />
    </div>
  );
}

// ── #6 Assignment Panel ───────────────────────────────────────
function AssignmentPanel({ profile }) {
  const [sets, setSets]       = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selSet, setSelSet]   = useState(null); // selected set for tracking
  const [tracking, setTracking] = useState(null);
  const [trkLoading, setTrkLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignSet, setAssignSet] = useState(null); // set being assigned
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [filter, setFilter] = useState('');

  useEffect(() => {
    Promise.all([
      apiGet('getAdminExamSets', { userId: profile?.userId }),
      apiGet('getMembers', { userId: profile?.userId }),
    ]).then(([esRes, memRes]) => {
      if (esRes.success) setSets(esRes.sets || []);
      if (memRes.success) setMembers(memRes.members || []);
    }).catch(() => {})
    .finally(() => setLoading(false));
  }, []);

  const loadTracking = async (setId) => {
    setTrkLoading(true);
    try {
      const d = await apiGet('getAssignmentTracking', { userId: profile?.userId, setId });
      if (d.success) { setTracking(d); setSelSet(setId); }
    } catch (_) {}
    setTrkLoading(false);
  };

  const startAssign = (set) => {
    setAssignSet(set);
    const current = String(set.allowedUsers || '').split(',').map(s => s.trim()).filter(Boolean);
    setSelectedUsers(new Set(current));
    setAssigning(true);
  };

  const toggleUser = (uid) => {
    setSelectedUsers(prev => {
      const s = new Set(prev);
      s.has(uid) ? s.delete(uid) : s.add(uid);
      return s;
    });
  };

  const saveAssignment = async () => {
    try {
      await apiPost({
        action: 'assignExamSet',
        callerUserId: profile?.userId,
        setId: assignSet.setId,
        subAction: 'setAll',
        userIds: [...selectedUsers],
      });
      // Refresh sets
      const esRes = await apiGet('getAdminExamSets', { userId: profile?.userId });
      if (esRes.success) setSets(esRes.sets || []);
      Swal.fire({ toast: true, position: 'top', timer: 2000, showConfirmButton: false, icon: 'success', title: 'บันทึกการมอบหมายแล้ว' });
      setAssigning(false);
    } catch (_) {
      Swal.fire({ toast: true, position: 'top', timer: 2000, showConfirmButton: false, icon: 'error', title: 'เกิดข้อผิดพลาด' });
    }
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
      <div className="spinner" style={{ margin: '0 auto 12px' }} />
      กำลังโหลด...
    </div>
  );

  // ── Assign Modal ──
  if (assigning && assignSet) {
    const filtered = members.filter(m =>
      m.status === 'active' && (!filter || m.displayName?.toLowerCase().includes(filter.toLowerCase()) || m.department?.toLowerCase().includes(filter.toLowerCase()))
    );
    const depts = [...new Set(filtered.map(m => m.department || 'ไม่ระบุ'))].sort();

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setAssigning(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text)' }}>←</button>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>📋 มอบหมาย: {assignSet.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>เลือกผู้สอบที่ต้องทำ ({selectedUsers.size} คน)</div>
          </div>
        </div>

        {/* Search */}
        <input type="text" placeholder="ค้นหาชื่อ/หน่วยงาน..." value={filter} onChange={e => setFilter(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: 12, border: '1.5px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13 }} />

        {/* Select all / none */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setSelectedUsers(new Set(filtered.map(m => m.lineUserId)))}
            style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: '1.5px solid var(--accent)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
            เลือกทั้งหมด ({filtered.length})
          </button>
          <button onClick={() => setSelectedUsers(new Set())}
            style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: '1.5px solid var(--input-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
            ล้างทั้งหมด
          </button>
        </div>

        {/* Member list by department */}
        <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {depts.map(dept => {
            const deptMembers = filtered.filter(m => (m.department || 'ไม่ระบุ') === dept);
            return (
              <div key={dept}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', padding: '4px 2px' }}>
                  🏢 {dept} ({deptMembers.length})
                </div>
                {deptMembers.map(m => {
                  const sel = selectedUsers.has(m.lineUserId);
                  return (
                    <div key={m.lineUserId} onClick={() => toggleUser(m.lineUserId)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10,
                        background: sel ? 'rgba(var(--accent-rgb),.08)' : 'var(--input-bg)',
                        border: sel ? '1.5px solid var(--accent)' : '1.5px solid var(--input-border)',
                        cursor: 'pointer', marginBottom: 4,
                      }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                        background: sel ? 'var(--accent)' : 'var(--input-bg)',
                        border: sel ? 'none' : '2px solid var(--input-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 700, fontSize: 14,
                      }}>
                        {sel && '✓'}
                      </div>
                      <img src={m.pictureUrl || ''} alt="" loading="lazy" decoding="async"
                        style={{ width: 28, height: 28, borderRadius: 99, objectFit: 'cover' }}
                        onError={e => { e.target.style.display = 'none'; }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.displayName || m.fullName || m.lineUserId?.slice(0, 8)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <button onClick={saveAssignment} style={{
          padding: '13px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
          background: '#7c3aed', color: '#fff', fontWeight: 800, fontSize: 15,
        }}>
          💾 บันทึกมอบหมาย ({selectedUsers.size} คน)
        </button>
      </div>
    );
  }

  // ── Tracking View ──
  if (selSet && tracking) {
    const { setName, totalAssigned, completed, passed, tracking: trk } = tracking;
    const pending   = trk.filter(t => t.status === 'pending');
    const attempted = trk.filter(t => t.status === 'attempted');
    const passedArr = trk.filter(t => t.status === 'passed');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => { setSelSet(null); setTracking(null); }}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text)' }}>←</button>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>📊 ติดตาม: {setName}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>มอบหมาย {totalAssigned} คน</div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          <div style={{ textAlign: 'center', padding: 12, borderRadius: 12, background: '#fee2e2' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626' }}>{totalAssigned - completed}</div>
            <div style={{ fontSize: 11, color: '#b91c1c' }}>ยังไม่สอบ</div>
          </div>
          <div style={{ textAlign: 'center', padding: 12, borderRadius: 12, background: '#fef3c7' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#d97706' }}>{completed - passed}</div>
            <div style={{ fontSize: 11, color: '#92400e' }}>สอบแล้วไม่ผ่าน</div>
          </div>
          <div style={{ textAlign: 'center', padding: 12, borderRadius: 12, background: '#dcfce7' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>{passed}</div>
            <div style={{ fontSize: 11, color: '#15803d' }}>ผ่านแล้ว</div>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>ความคืบหน้า</span>
            <span style={{ fontWeight: 700 }}>{completed}/{totalAssigned} ({totalAssigned > 0 ? Math.round(completed/totalAssigned*100) : 0}%)</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'var(--progress-trk)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 4, background: '#22c55e', width: totalAssigned > 0 ? `${(completed/totalAssigned)*100}%` : '0%' }} />
          </div>
        </div>

        {/* Student list */}
        {[
          { title: '⏳ ยังไม่สอบ', items: pending, color: '#dc2626', bg: '#fee2e2' },
          { title: '📝 สอบแล้ว ไม่ผ่าน', items: attempted, color: '#d97706', bg: '#fef3c7' },
          { title: '✅ ผ่านแล้ว', items: passedArr, color: '#16a34a', bg: '#dcfce7' },
        ].filter(sec => sec.items.length > 0).map(sec => (
          <div key={sec.title}>
            <div style={{ fontSize: 12, fontWeight: 700, color: sec.color, marginBottom: 6 }}>{sec.title} ({sec.items.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {sec.items.map(t => (
                <div key={t.userId} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                  borderRadius: 10, background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                }}>
                  <img src={t.pictureUrl || ''} alt="" loading="lazy" decoding="async"
                    style={{ width: 28, height: 28, borderRadius: 99, objectFit: 'cover' }}
                    onError={e => { e.target.style.display = 'none'; }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.displayName}
                    </div>
                    {t.department && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.department}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {t.status === 'pending' ? (
                      <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 700 }}>ยังไม่สอบ</span>
                    ) : (
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: t.status === 'passed' ? '#16a34a' : '#d97706' }}>{t.bestPct}%</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.attempts} ครั้ง</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Set List ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
        เลือกชุดข้อสอบที่ต้องการมอบหมายหรือติดตาม
      </div>

      {sets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48 }}>📦</div>
          <div style={{ marginTop: 8 }}>ยังไม่มีชุดข้อสอบ</div>
        </div>
      ) : (
        sets.map(s => {
          const assigned = String(s.allowedUsers || '').split(',').filter(Boolean).length;
          return (
            <div key={s.setId} style={{
              background: 'var(--card-bg)', border: '1px solid var(--card-border)',
              borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {s.subjects?.length || 0} วิชา • มอบหมาย {assigned} คน
                  </div>
                </div>
                {assigned > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#dcfce7', color: '#15803d' }}>
                    {assigned} คน
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => startAssign(s)} style={{
                  flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: '#7c3aed', color: '#fff', fontWeight: 700, fontSize: 13,
                }}>
                  📋 มอบหมาย
                </button>
                {assigned > 0 && (
                  <button onClick={() => loadTracking(s.setId)} disabled={trkLoading} style={{
                    flex: 1, padding: '9px 0', borderRadius: 10, border: '1.5px solid var(--card-border)',
                    background: 'var(--card-bg)', color: 'var(--text)', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                  }}>
                    📊 ติดตาม
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ── Main TeacherScreen ─────────────────────────────────────────
export default function TeacherScreen() {
  const { navigate: appNavigate, profile } = useApp();
  const [tab, setTab] = useState('home');

  // ถ้าอยู่แท็บ questions/examsets → render screen เต็มจอ (back btn อยู่ใน screen นั้น)
  if (tab === 'questions') return (
    <div>
      <button onClick={() => setTab('home')} style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
        background: 'none', border: 'none', cursor: 'pointer',
        color: '#7c3aed', fontWeight: 700, fontSize: 14,
      }}>
        ← กลับแดชบอร์ดครู
      </button>
      <QuestionManagerScreen />
    </div>
  );

  if (tab === 'examsets') return (
    <div>
      <button onClick={() => setTab('home')} style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
        background: 'none', border: 'none', cursor: 'pointer',
        color: '#7c3aed', fontWeight: 700, fontSize: 14,
      }}>
        ← กลับแดชบอร์ดครู
      </button>
      <ExamSetManagerScreen />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 16, padding: '0 2px',
      }}>
        <button onClick={() => appNavigate('setup')} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: 20, lineHeight: 1,
          padding: '4px 6px', borderRadius: 8,
        }} title="กลับหน้าหลัก">
          ←
        </button>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>🎓 แดชบอร์ดครูผู้สอน</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>จัดการข้อสอบและติดตามผล</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 6, overflowX: 'auto',
        borderBottom: '2px solid var(--card-border)',
        paddingBottom: 0, marginBottom: 20,
      }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 14px', borderRadius: '10px 10px 0 0',
            background: tab === t.key ? '#7c3aed' : 'var(--card-bg)',
            color: tab === t.key ? '#fff' : 'var(--text-muted)',
            border: '1px solid var(--card-border)',
            borderBottom: tab === t.key ? '2px solid #7c3aed' : 'none',
            cursor: 'pointer', fontWeight: 700, fontSize: 13,
            whiteSpace: 'nowrap', transition: 'all .18s',
            marginBottom: tab === t.key ? -2 : 0,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'home' && (
        <TeacherHome profile={profile} onNavigate={setTab} />
      )}
      {tab === 'assign' && (
        <AssignmentPanel profile={profile} />
      )}
      {tab === 'results' && (
        <ResultsPanel profile={profile} />
      )}
      {tab === 'lessons' && (
        <LessonManager callerUserId={profile?.userId} />
      )}
      {tab === 'subjects' && (
        <SubjectManager callerUserId={profile?.userId} />
      )}
      {tab === 'ai' && (
        <AITab profile={profile} />
      )}
    </div>
  );
}
