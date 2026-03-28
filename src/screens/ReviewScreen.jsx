import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { apiGet, apiPost } from '../utils/api';

export default function ReviewScreen() {
  const { navigate, exam, profile, bookmarks, setBookmarks } = useApp();

  // local set of bookmarked questionTexts (for instant UI feedback)
  const [bkSet, setBkSet] = useState(new Set());
  const [bkLoading, setBkLoading] = useState(new Set()); // questionTexts being saved

  // init bkSet from context cache
  useEffect(() => {
    if (bookmarks !== null) {
      setBkSet(new Set((bookmarks || []).map(b => b.questionText)));
    }
  }, [bookmarks]);

  async function toggleBookmark(q, ok) {
    const text = q.question;
    if (bkLoading.has(text)) return;

    setBkLoading(prev => new Set([...prev, text]));
    try {
      if (bkSet.has(text)) {
        // remove
        await apiPost({ action: 'removeBookmark', userId: profile.userId, questionText: text });
        setBkSet(prev => { const s = new Set(prev); s.delete(text); return s; });
        if (bookmarks !== null) setBookmarks(prev => (prev || []).filter(b => b.questionText !== text));
      } else {
        // add
        const correct = Array.isArray(q.answer) ? q.answer[0] : q.answer || '';
        await apiPost({
          action:        'addBookmark',
          userId:        profile.userId,
          questionText:  text,
          lesson:        exam.lesson || '',
          correctAnswer: correct,
          explanation:   q.explanation || '',
          options:       q.options || [],
        });
        setBkSet(prev => new Set([...prev, text]));
        if (bookmarks !== null) {
          setBookmarks(prev => [...(prev || []), {
            questionText:  text,
            lesson:        exam.lesson || '',
            correctAnswer: correct,
            explanation:   q.explanation || '',
            options:       q.options || [],
            savedAt:       '',
          }]);
        }
      }
    } catch (e) {
      alert('Bookmark ไม่สำเร็จ');
    } finally {
      setBkLoading(prev => { const s = new Set(prev); s.delete(text); return s; });
    }
  }

  return (
    <div className="quiz-card rounded-2xl p-4 sm:p-6 lg:p-8 animate-fade">
      <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-center" style={{ color: 'var(--text)' }}>📋 เฉลยข้อสอบ</h2>

      <div className="space-y-3 sm:space-y-4">
        {exam.questions.map((q, i) => {
          const user    = exam.answers[i] || 'ไม่ได้ตอบ';
          const correct = Array.isArray(q.answer) ? q.answer[0] : q.answer || '';
          const ok      = user.trim() === correct.trim();
          const text    = q.question;
          const isBookmarked = bkSet.has(text);
          const isLoading    = bkLoading.has(text);

          return (
            <div key={i} className={ok ? 'row-correct' : 'row-wrong'}>
              {/* Question row with bookmark button */}
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="font-semibold text-sm sm:text-base flex-1" style={{ color: 'inherit', wordBreak: 'break-word' }}>
                  {i + 1}. {q.question}
                </p>
                <button
                  onClick={() => toggleBookmark(q, ok)}
                  disabled={isLoading}
                  title={isBookmarked ? 'ยกเลิก bookmark' : 'บันทึกข้อนี้'}
                  style={{
                    background: 'none', border: 'none', cursor: isLoading ? 'wait' : 'pointer',
                    fontSize: 18, flexShrink: 0, opacity: isLoading ? 0.4 : 1,
                    filter: isBookmarked ? 'none' : 'grayscale(1)',
                    transition: 'all .2s',
                  }}>
                  🔖
                </button>
              </div>

              {q.imageUrl && (
                <img
                  src={q.imageUrl}
                  alt="รูปประกอบคำถาม"
                  className="rounded-xl mb-2 w-full object-contain"
                  style={{ maxHeight: 200, border: '1px solid var(--input-border)' }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              )}
              <p className="text-xs sm:text-sm mb-0.5" style={{ wordBreak: 'break-word' }}>
                คำตอบของคุณ: <b>{user}</b>{' '}
                {ok
                  ? <span style={{ color: '#16a34a' }}>✔ ถูก</span>
                  : <span style={{ color: '#dc2626' }}>✖ ผิด</span>}
              </p>
              {!ok && <p className="text-xs sm:text-sm mb-0.5" style={{ wordBreak: 'break-word' }}>เฉลย: <b style={{ color: '#16a34a' }}>{correct}</b></p>}
              <div style={{ borderTop: '1px solid currentColor', opacity: .2, marginTop: 8 }} />
              <div style={{ marginTop: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 700, opacity: .7 }}>คำอธิบาย</p>
                <p className="text-xs sm:text-sm" style={{ wordBreak: 'break-word' }}>{q.explanation || 'ไม่มีคำอธิบาย'}</p>
              </div>
            </div>
          );
        })}
      </div>

      <button className="btn btn-gray w-full rounded-xl py-2.5 text-sm mt-5 sm:mt-7" onClick={() => navigate('score')}>
        ← กลับผลคะแนน
      </button>
    </div>
  );
}
