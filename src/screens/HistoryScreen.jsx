import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { useApp } from '../context/AppContext';
import { apiGet } from '../utils/api';
import { parsePercent } from '../utils/helpers';
import Spinner from '../components/Spinner';
import { PASS_THRESHOLD } from '../config';

const PAGE_SIZE = 20;

export default function HistoryScreen() {
  const { navigate, profile, historyList, setHistoryList, setHistoryDetail, setExam, settings, setSettings } = useApp();

  const [loading,     setLoading]     = useState(!historyList.length);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter,      setFilter]      = useState('');
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(false);
  const [total,       setTotal]       = useState(0);
  const [summary,     setSummary]     = useState(null); // pre-aggregated from server

  useEffect(() => {
    if (historyList.length) return; // ใช้ cache จาก context
    load(1, true);
  }, []);

  async function load(p = 1, reset = false) {
    if (p === 1) setLoading(true); else setLoadingMore(true);
    try {
      const data = await apiGet('getHistory', { userId: profile.userId, page: p, size: PAGE_SIZE });
      if (!data.success) throw new Error(data.message || 'โหลดประวัติไม่สำเร็จ');

      const newList = reset
        ? (data.history || [])
        : [...historyList, ...(data.history || [])];

      setHistoryList(newList);
      setHasMore(!!data.hasMore);
      setTotal(data.total || 0);
      setPage(p);
      if (data.summary) setSummary(data.summary);
    } catch (e) {
      await Swal.fire('เกิดข้อผิดพลาด', e.message, 'error');
      if (p === 1) navigate('setup');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function handleRetry(h) {
    const lesson = h.lesson;
    navigate('loading-quiz');
    try {
      const data = await apiGet('getQuestions', { lesson });
      if (!data.success || !data.questions?.length) throw new Error('ไม่พบข้อสอบวิชานี้');
      const shuffled = [...data.questions].sort(() => Math.random() - 0.5).slice(0, settings.numQ || 20);
      setSettings(s => ({ ...s, useTimer: settings.useTimer }));
      setExam(prev => ({ ...prev, lesson, setId: '', allQ: shuffled, passThreshold: PASS_THRESHOLD }));
      navigate('quiz');
    } catch (e) {
      Swal.fire('เกิดข้อผิดพลาด', e.message, 'error');
      navigate('history');
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

  const [passFilter, setPassFilter] = useState(''); // '' | 'ผ่าน' | 'ไม่ผ่าน'

  const subjects = [...new Set(historyList.map(h => h.lesson).filter(Boolean))];
  const filtered = historyList
    .filter(h => !filter     || h.lesson === filter)
    .filter(h => !passFilter || h.pass   === passFilter);

  // ใช้ summary จาก server (_SummaryStats) — ครอบคลุมทุก record รวม archive
  // fallback คำนวณจาก loaded list เมื่อยังไม่มี summary
  const totalAttempts = summary?.totalAttempts ?? total;
  const avg     = summary?.avgScore
    ?? (filtered.length ? Math.round(filtered.map(h => parsePercent(h.pct)).reduce((a, b) => a + b, 0) / filtered.length) : 0);
  const best    = summary?.bestScore
    ?? (filtered.length ? Math.max(...filtered.map(h => parsePercent(h.pct))) : 0);
  const passRate = summary && summary.totalAttempts > 0
    ? Math.round((summary.totalPass / summary.totalAttempts) * 100)
    : (totalAttempts > 0 ? Math.round((filtered.filter(h => h.pass === 'ผ่าน').length / totalAttempts) * 100) : 0);

  return (
    <div className="animate-fade">

      {/* Summary */}
      <div className="quiz-card no-hover rounded-2xl p-4 sm:p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-bold" style={{ color: 'var(--text)' }}>
            📊 ประวัติการสอบ
            {total > 0 && (
              <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full"
                style={{ background: 'var(--input-bg)', color: 'var(--text-muted)' }}>
                {total} ครั้ง
              </span>
            )}
          </h2>
          <div className="flex gap-2">
            <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5"
              onClick={() => load(1, true)}>🔄</button>
            <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5"
              onClick={() => navigate('setup')}>← กลับ</button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { val: totalAttempts,      label: 'ครั้งที่สอบ',  color: 'var(--accent)' },
            { val: avg + '%',          label: 'เฉลี่ย',       color: '#3b82f6' },
            { val: best + '%',         label: 'สูงสุด',       color: '#16a34a' },
            { val: passRate + '%',     label: 'อัตราผ่าน',   color: '#d97706' },
          ].map(s => (
            <div key={s.label} className="stat-box animate-slide-up">
              <div className="text-xl sm:text-2xl font-black" style={{ color: s.color }}>{s.val}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Archive notice */}
        {summary && summary.totalAttempts > total && (
          <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-muted)' }}>
            * สถิติรวม {summary.totalAttempts} ครั้ง (รวม archive) แสดงผล {total} ครั้งล่าสุด
          </p>
        )}
      </div>

      {/* Filter */}
      <div className="quiz-card no-hover rounded-2xl px-4 py-3 mb-4 space-y-2">
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>วิชา</span>
          <select className="themed-input flex-1"
            value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">ทุกวิชา</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          {['','ผ่าน','ไม่ผ่าน'].map(v => (
            <button key={v}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: passFilter === v ? (v==='ผ่าน'?'#16a34a':v==='ไม่ผ่าน'?'#ef4444':'var(--accent)') : 'var(--input-bg)',
                color:      passFilter === v ? 'white' : 'var(--text-muted)',
                border:     `1px solid ${passFilter===v?'transparent':'var(--input-border)'}`,
              }}
              onClick={() => setPassFilter(v)}>
              {v===''?'ทั้งหมด':v==='ผ่าน'?'✅ ผ่าน':'❌ ไม่ผ่าน'}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3 mb-4">
        {filtered.length === 0 ? (
          <div className="quiz-card no-hover rounded-2xl p-8 text-center" style={{ color: 'var(--text-muted)' }}>
            ยังไม่มีประวัติการสอบ
          </div>
        ) : filtered.map((h, i) => {
          const p   = parsePercent(h.pct);
          const isP = h.pass === 'ผ่าน';
          const min = Math.floor((h.timeUsed || 0) / 60);
          const sec = String((h.timeUsed || 0) % 60).padStart(2, '0');
          return (
            <div key={h.examId}
              className="history-card animate-slide-left"
              style={{ animationDelay: `${Math.min(i * 0.05, 0.4)}s` }}>
              <div className="flex items-center justify-between mb-2" onClick={() => openDetail(h.examId)} style={{ cursor:'pointer' }}>
                <div style={{ fontWeight: 700, color: 'var(--text)' }}>{h.lesson || 'ไม่ระบุวิชา'}</div>
                <span className={isP ? 'badge-pass' : 'badge-fail'}>{isP ? '✅ ผ่าน' : '❌ ไม่ผ่าน'}</span>
              </div>
              <div className="flex items-center gap-3" onClick={() => openDetail(h.examId)} style={{ cursor:'pointer' }}>
                <div>
                  <div className="text-xl sm:text-2xl" style={{ fontWeight: 800, color: 'var(--accent)' }}>{p}%</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{h.score}/{h.total} ข้อ • ⏱ {min}:{sec}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ background: 'var(--progress-trk)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${p}%`, height: '100%', background: p>=60?'#22c55e':'#ef4444', borderRadius: 999, transition:'width .6s' }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{h.date}</div>
                </div>
              </div>
              {/* Retry button */}
              <div className="flex gap-2 mt-2">
                <button className="flex-1 btn btn-gray text-xs rounded-lg py-1.5"
                  onClick={e => { e.stopPropagation(); openDetail(h.examId); }}>
                  🔍 ดูเฉลย
                </button>
                <button className="flex-1 btn text-xs rounded-lg py-1.5"
                  style={{ background: isP?'#3b82f6':'#ef4444', color:'white' }}
                  onClick={e => { e.stopPropagation(); handleRetry(h); }}>
                  {isP ? '🔄 สอบอีกครั้ง' : '🎯 ลองใหม่'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More — แสดงเมื่อมีข้อมูลเพิ่มและไม่ได้กรองวิชา */}
      {hasMore && !filter && (
        <button
          className="btn btn-gray w-full rounded-xl py-3 mb-3"
          onClick={() => load(page + 1, false)}
          disabled={loadingMore}
          style={{ opacity: loadingMore ? 0.6 : 1 }}
        >
          {loadingMore ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              กำลังโหลด...
            </>
          ) : (
            `โหลดเพิ่มเติม (${historyList.length} / ${total} ครั้ง)`
          )}
        </button>
      )}

      <button className="btn btn-gray w-full rounded-xl py-3" onClick={() => navigate('setup')}>
        ← กลับหน้าหลัก
      </button>
    </div>
  );
}
