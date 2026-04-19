import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { apiGet, apiPost } from '../utils/api';
import { useToast } from '../components/Toast';

export default function ReviewScreen() {
  const { navigate, exam, profile, bookmarks, setBookmarks } = useApp();
  const { toast } = useToast();

  const [bkSet, setBkSet] = useState(new Set());
  const [bkLoading, setBkLoading] = useState(new Set());
  const [filter, setFilter] = useState('all'); // 'all' | 'wrong' | 'correct'

  useEffect(() => {
    if (bookmarks !== null) {
      setBkSet(new Set((bookmarks || []).map(b => b.questionText)));
    }
  }, [bookmarks]);

  async function toggleBookmark(q) {
    const text = q.question;
    if (bkLoading.has(text)) return;
    setBkLoading(prev => new Set([...prev, text]));
    try {
      if (bkSet.has(text)) {
        await apiPost({ action: 'removeBookmark', userId: profile?.userId, questionText: text });
        setBkSet(prev => { const s = new Set(prev); s.delete(text); return s; });
        if (bookmarks !== null) setBookmarks(prev => (prev || []).filter(b => b.questionText !== text));
        toast.info('ยกเลิก bookmark แล้ว', { duration: 1800 });
      } else {
        const correct = Array.isArray(q.answer) ? q.answer[0] : q.answer || '';
        await apiPost({
          action: 'addBookmark', userId: profile?.userId, questionText: text,
          lesson: exam.lesson || '', correctAnswer: correct,
          explanation: q.explanation || '', options: q.options || [],
        });
        setBkSet(prev => new Set([...prev, text]));
        if (bookmarks !== null) {
          setBookmarks(prev => [...(prev || []), {
            questionText: text, lesson: exam.lesson || '', correctAnswer: correct,
            explanation: q.explanation || '', options: q.options || [], savedAt: '',
          }]);
        }
        toast.success('🔖 บันทึกข้อนี้แล้ว', { duration: 1800 });
      }
    } catch (e) { toast.error('บันทึก Bookmark ไม่สำเร็จ'); }
    finally { setBkLoading(prev => { const s = new Set(prev); s.delete(text); return s; }); }
  }

  // Pre-compute all questions with result info
  const allQ = (exam?.questions || []).map((q, i) => {
    const user = exam.answers[i] || 'ไม่ได้ตอบ';
    const correct = Array.isArray(q.answer) ? q.answer[0] : q.answer || '';
    return { ...q, _i: i, _user: user, _correct: correct, _ok: user.trim() === correct.trim() };
  });
  const wrongCount = allQ.filter(q => !q._ok).length;
  const correctCount = allQ.length - wrongCount;
  const filteredQ = filter === 'wrong' ? allQ.filter(q => !q._ok) : filter === 'correct' ? allQ.filter(q => q._ok) : allQ;

  return (
    <div className="quiz-card rounded-2xl p-4 sm:p-6 lg:p-8 animate-fade">
      <h2 className="text-lg sm:text-xl font-bold mb-3 text-center" style={{ color: 'var(--text)' }}>📋 เฉลยข้อสอบ</h2>

      {/* Filter Bar */}
      <div className="flex gap-2 mb-4 justify-center flex-wrap">
        {[
          { key: 'all', label: `ทั้งหมด (${allQ.length})` },
          { key: 'wrong', label: `❌ ผิด (${wrongCount})` },
          { key: 'correct', label: `✅ ถูก (${correctCount})` },
        ].map(f => (
          <button key={f.key}
            className="text-xs px-3 py-1.5 rounded-xl font-semibold"
            style={{
              background: filter === f.key
                ? (f.key === 'wrong' ? '#b91c1c' : f.key === 'correct' ? '#15803d' : 'var(--accent)')
                : 'var(--input-bg)',
              color: filter === f.key ? 'white' : 'var(--text-muted)',
              border: 'none', cursor: 'pointer', transition: 'all .15s',
            }}
            onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {filteredQ.length === 0 ? (
        <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
          {filter === 'wrong' ? '🎉 ไม่มีข้อผิดเลย!' : '📭 ไม่มีข้อที่ตรงเงื่อนไข'}
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {filteredQ.map(q => {
            const i = q._i;
            const ok = q._ok;
            const text = q.question;
            const isBookmarked = bkSet.has(text);
            const isLoading = bkLoading.has(text);
            const qSec = exam.qTime?.[i] || 0;
            const qMin = Math.floor(qSec / 60);
            const qSecStr = String(qSec % 60).padStart(2, '0');

            return (
              <div key={i} className={ok ? 'row-correct' : 'row-wrong'}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-semibold text-sm sm:text-base flex-1" style={{ color: 'inherit', wordBreak: 'break-word' }}>
                    {i + 1}. {q.question}
                  </p>
                  <button onClick={() => toggleBookmark(q)} disabled={isLoading}
                    title={isBookmarked ? 'ยกเลิก bookmark' : 'บันทึกข้อนี้'}
                    style={{
                      background: 'none', border: 'none', cursor: isLoading ? 'wait' : 'pointer',
                      fontSize: 18, flexShrink: 0, opacity: isLoading ? 0.4 : 1,
                      filter: isBookmarked ? 'none' : 'grayscale(1)', transition: 'all .2s',
                    }}>🔖</button>
                </div>

                {q.imageUrl && (
                  <img src={q.imageUrl} alt="รูปประกอบคำถาม" loading="lazy" decoding="async"
                    className="rounded-xl mb-2 w-full object-contain"
                    style={{ maxHeight: 200, border: '1px solid var(--input-border)' }}
                    onError={e => { e.target.style.display = 'none'; }} />
                )}
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <p className="text-xs sm:text-sm" style={{ wordBreak: 'break-word', margin: 0 }}>
                    คำตอบของคุณ: <b>{q._user}</b>{' '}
                    {ok ? <span style={{ color: '#16a34a' }}>✔ ถูก</span> : <span style={{ color: '#dc2626' }}>✖ ผิด</span>}
                  </p>
                  {qSec > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                      background: qSec > 120 ? '#fef3c7' : '#f0f9ff',
                      color: qSec > 120 ? '#92400e' : '#0369a1', whiteSpace: 'nowrap',
                    }}>
                      ⏱ {qMin > 0 ? `${qMin}:${qSecStr}` : `${qSec}s`}{qSec > 120 && ' ⚠️'}
                    </span>
                  )}
                </div>
                {!ok && <p className="text-xs sm:text-sm mb-0.5" style={{ wordBreak: 'break-word' }}>เฉลย: <b style={{ color: '#16a34a' }}>{q._correct}</b></p>}
                <div style={{ borderTop: '1px solid currentColor', opacity: .2, marginTop: 8 }} />
                <div style={{ marginTop: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, opacity: .7 }}>คำอธิบาย</p>
                  <p className="text-xs sm:text-sm" style={{ wordBreak: 'break-word' }}>{q.explanation || 'ไม่มีคำอธิบาย'}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button className="btn btn-gray w-full rounded-xl py-2.5 text-sm mt-5 sm:mt-7" onClick={() => navigate('score')}>
        ← กลับผลคะแนน
      </button>
    </div>
  );
}
