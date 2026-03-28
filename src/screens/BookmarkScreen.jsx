import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { apiGet, apiPost } from '../utils/api';
import Spinner from '../components/Spinner';


export default function BookmarkScreen() {
  const { navigate, profile, bookmarks, setBookmarks } = useApp();
  const [loading, setLoading]   = useState(bookmarks === null);
  const [removing, setRemoving] = useState(null); // questionText ที่กำลัง remove
  const [filter, setFilter]     = useState('');   // filter by lesson

  useEffect(() => {
    if (bookmarks !== null) return; // use cache
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await apiGet('getBookmarks', { userId: profile.userId });
      if (!data.success) throw new Error(data.message || 'โหลด bookmark ไม่สำเร็จ');
      setBookmarks(data.bookmarks || []);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(questionText) {
    setRemoving(questionText);
    try {
      await apiPost({ action: 'removeBookmark', userId: profile.userId, questionText });
      setBookmarks(prev => (prev || []).filter(b => b.questionText !== questionText));
    } catch (e) {
      alert('ลบ bookmark ไม่สำเร็จ');
    } finally {
      setRemoving(null);
    }
  }

  if (loading) return <Spinner label="กำลังโหลด bookmark..." />;

  const list = bookmarks || [];
  const lessons = [...new Set(list.map(b => b.lesson).filter(Boolean))];
  const filtered = filter ? list.filter(b => b.lesson === filter) : list;

  return (
    <div className="animate-fade">
      {/* Header */}
      <div className="quiz-card no-hover rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base sm:text-lg" style={{ color: 'var(--text)' }}>
              🔖 ข้อสอบที่บันทึกไว้
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {list.length} ข้อ
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5" onClick={load}>🔄</button>
            <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5" onClick={() => navigate('setup')}>← กลับ</button>
          </div>
        </div>
      </div>

      {/* Filter */}
      {lessons.length > 1 && (
        <div className="quiz-card no-hover rounded-2xl px-4 py-3 mb-4">
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>วิชา</span>
            <select className="themed-input flex-1" value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="">ทุกวิชา</option>
              {lessons.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="quiz-card no-hover rounded-2xl p-10 text-center">
          <div className="text-4xl mb-3">🔖</div>
          <div className="font-semibold mb-1" style={{ color: 'var(--text)' }}>ยังไม่มีข้อสอบที่บันทึกไว้</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>กดปุ่ม 🔖 ในหน้าเฉลยเพื่อบันทึกข้อสอบที่ต้องการทบทวน</div>
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          {filtered.map((b, i) => (
            <div key={i} className="quiz-card no-hover rounded-2xl p-4">
              {/* Lesson badge + date */}
              <div className="flex items-center justify-between mb-2">
                {b.lesson && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'var(--input-bg)', color: 'var(--text-muted)', border: '1px solid var(--input-border)' }}>
                    {b.lesson}
                  </span>
                )}
                <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>{b.savedAt}</span>
              </div>

              {/* Question */}
              <p className="font-semibold text-sm mb-3" style={{ color: 'var(--text)', lineHeight: 1.7 }}>
                {i + 1}. {b.questionText}
              </p>

              {/* Options */}
              {b.options.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {b.options.map((opt, j) => {
                    const isCorrect = opt === b.correctAnswer;
                    return (
                      <div key={j} className="flex items-start gap-2 rounded-lg px-3 py-2 text-sm"
                        style={{
                          background: isCorrect ? '#f0fdf4' : 'var(--input-bg)',
                          border: `1px solid ${isCorrect ? '#86efac' : 'var(--input-border)'}`,
                          color: isCorrect ? '#15803d' : 'var(--text)',
                          fontWeight: isCorrect ? 600 : 400,
                        }}>
                        {isCorrect && <span className="flex-shrink-0">✅</span>}
                        <span>{opt}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Explanation */}
              {b.explanation && (
                <div className="rounded-lg px-3 py-2 mb-3 text-xs"
                  style={{ background: 'var(--input-bg)', color: 'var(--text-muted)', borderLeft: '3px solid var(--accent)' }}>
                  <span style={{ fontWeight: 700 }}>คำอธิบาย: </span>{b.explanation}
                </div>
              )}

              {/* Remove button */}
              <button
                className="btn btn-gray w-full text-xs rounded-lg py-1.5"
                disabled={removing === b.questionText}
                onClick={() => handleRemove(b.questionText)}
                style={{ opacity: removing === b.questionText ? 0.5 : 1 }}>
                {removing === b.questionText ? '⏳ กำลังลบ...' : '🗑 ลบออกจาก Bookmark'}
              </button>
            </div>
          ))}
        </div>
      )}

      <button className="btn btn-gray w-full rounded-xl py-3" onClick={() => navigate('setup')}>
        ← กลับหน้าหลัก
      </button>
    </div>
  );
}
