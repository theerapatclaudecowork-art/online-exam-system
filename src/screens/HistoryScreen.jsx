import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { useApp } from '../context/AppContext';
import { apiGet } from '../utils/api';
import { parsePercent, formatTime } from '../utils/helpers';
import Spinner from '../components/Spinner';

export default function HistoryScreen() {
  const { navigate, profile, historyList, setHistoryList, setHistoryDetail } = useApp();
  const [loading,  setLoading]  = useState(!historyList.length);
  const [filter,   setFilter]   = useState('');

  useEffect(() => {
    if (historyList.length) return; // ใช้ cache
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await apiGet('getHistory', { userId: profile.userId });
      if (!data.success) throw new Error(data.message || 'โหลดประวัติไม่สำเร็จ');
      setHistoryList(data.history || []);
    } catch (e) {
      await Swal.fire('เกิดข้อผิดพลาด', e.message, 'error');
      navigate('setup');
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(examId) {
    try {
      const data = await apiGet('getHistoryDetail', { examId });
      if (!data.success) throw new Error(data.message || 'โหลดรายละเอียดไม่สำเร็จ');
      setHistoryDetail({ exam: data.exam, detail: data.detail || [] });
      navigate('historyDetail');
    } catch (e) {
      Swal.fire('เกิดข้อผิดพลาด', e.message, 'error');
    }
  }

  if (loading) return <Spinner label="กำลังโหลดประวัติ..." />;

  const subjects = [...new Set(historyList.map(h => h.lesson).filter(Boolean))];
  const filtered = filter ? historyList.filter(h => h.lesson === filter) : historyList;

  const total    = historyList.length;
  const pcts     = historyList.map(h => parsePercent(h.pct));
  const avg      = total ? Math.round(pcts.reduce((a, b) => a + b, 0) / total) : 0;
  const best     = total ? Math.max(...pcts) : 0;
  const passed   = historyList.filter(h => h.pass === 'ผ่าน').length;
  const passRate = total ? Math.round((passed / total) * 100) : 0;

  return (
    <div className="animate-fade">

      {/* Summary */}
      <div className="quiz-card no-hover rounded-2xl p-4 sm:p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-bold" style={{ color: 'var(--text)' }}>📊 ประวัติการสอบ</h2>
          <div className="flex gap-2">
            <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5" onClick={load}>🔄</button>
            <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5" onClick={() => navigate('setup')}>← กลับ</button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { val: total,     label: 'ครั้งที่สอบ',  color: 'var(--accent)' },
            { val: avg + '%', label: 'เฉลี่ย',       color: '#3b82f6' },
            { val: best + '%',label: 'สูงสุด',       color: '#16a34a' },
            { val: passRate + '%', label: 'อัตราผ่าน', color: '#d97706' },
          ].map(s => (
            <div key={s.label} className="stat-box">
              <div className="text-xl sm:text-2xl font-black" style={{ color: s.color }}>{s.val}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div className="quiz-card no-hover rounded-2xl px-4 py-3 mb-4">
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>กรองวิชา</span>
          <select
            className="themed-input" style={{ flex: 1 }}
            value={filter} onChange={e => setFilter(e.target.value)}
          >
            <option value="">ทุกวิชา</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3 mb-4">
        {filtered.length === 0 ? (
          <div className="quiz-card no-hover rounded-2xl p-8 text-center" style={{ color: 'var(--text-muted)' }}>
            ยังไม่มีประวัติการสอบ
          </div>
        ) : filtered.map(h => {
          const p   = parsePercent(h.pct);
          const isP = h.pass === 'ผ่าน';
          const min = Math.floor((h.timeUsed || 0) / 60);
          const sec = String((h.timeUsed || 0) % 60).padStart(2, '0');
          return (
            <div key={h.examId} className="history-card" onClick={() => openDetail(h.examId)}>
              <div className="flex items-center justify-between mb-2">
                <div style={{ fontWeight: 700, color: 'var(--text)' }}>{h.lesson || 'ไม่ระบุวิชา'}</div>
                <span className={isP ? 'badge-pass' : 'badge-fail'}>{isP ? '✅ ผ่าน' : '❌ ไม่ผ่าน'}</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl sm:text-2xl" style={{ fontWeight: 800, color: 'var(--accent)' }}>{p}%</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{h.score}/{h.total} ข้อ • ⏱ {min}:{sec}</div>
                </div>
                <div style={{ flex: 1, maxWidth: 120, marginLeft: 16 }}>
                  <div style={{ background: 'var(--progress-trk)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${p}%`, height: '100%', background: p >= 60 ? '#22c55e' : '#ef4444', borderRadius: 999, transition: 'width .6s' }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{h.date}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button className="btn btn-gray w-full rounded-xl py-3" onClick={() => navigate('setup')}>
        ← กลับหน้าหลัก
      </button>
    </div>
  );
}
