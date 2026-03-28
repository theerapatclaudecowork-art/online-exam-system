import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useApp } from '../context/AppContext';
import { apiGetCached } from '../utils/api';
import Spinner from '../components/Spinner';

const LABELS = ['ก', 'ข', 'ค', 'ง'];

function StudyCard({ q, num }) {
  const [revealed, setRevealed] = useState(false);
  const correct = Array.isArray(q.answer) ? q.answer[0] : q.answer || '';

  return (
    <div className="quiz-card no-hover rounded-2xl p-4 mb-3">
      {/* Question */}
      <div className="flex items-start gap-2 mb-3">
        <span className="font-black text-sm flex-shrink-0" style={{ color: 'var(--accent)' }}>{num}.</span>
        <p className="text-sm font-semibold" style={{ color: 'var(--text)', lineHeight: 1.7 }}>{q.question}</p>
      </div>
      {q.imageUrl && (
        <img src={q.imageUrl} alt="" className="rounded-xl mb-3 w-full object-contain"
          style={{ maxHeight: 200 }} onError={e => { e.target.style.display='none'; }} />
      )}

      {/* Options */}
      <div className="space-y-2 mb-3">
        {q.options.map((opt, i) => {
          const isCorrect = opt === correct;
          return (
            <div key={i} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm"
              style={{
                background: revealed && isCorrect ? '#f0fdf4' : 'var(--input-bg)',
                border: `1.5px solid ${revealed && isCorrect ? '#86efac' : 'var(--input-border)'}`,
                color: revealed && isCorrect ? '#15803d' : 'var(--text)',
                fontWeight: revealed && isCorrect ? 700 : 400,
                transition: 'all .2s',
              }}>
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 font-bold"
                style={{ background: revealed && isCorrect ? '#86efac' : 'var(--input-border)', color: revealed && isCorrect ? '#15803d' : 'var(--text-muted)' }}>
                {revealed && isCorrect ? '✓' : LABELS[i]}
              </span>
              {opt}
            </div>
          );
        })}
      </div>

      {/* Reveal / Explanation */}
      {!revealed ? (
        <button className="btn btn-gray w-full rounded-xl py-2 text-sm"
          onClick={() => setRevealed(true)}>
          👁 ดูเฉลย
        </button>
      ) : (
        <div className="rounded-xl p-3 text-xs"
          style={{ background: '#eff6ff', borderLeft: '3px solid #3b82f6', color: '#1d4ed8' }}>
          <span style={{ fontWeight: 700 }}>✅ เฉลย: </span>{correct}
          {q.explanation && <><br /><span style={{ fontWeight: 700 }}>📝 </span>{q.explanation}</>}
        </div>
      )}
    </div>
  );
}

export default function StudyScreen() {
  const { navigate, exam, setExam, settings } = useApp();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        if (exam.allQ?.length) {
          setQuestions(exam.allQ);
        } else {
          const data = await apiGetCached('getQuestions', { lesson: exam.lesson }, 3 * 60_000);
          if (!Array.isArray(data) || !data.length) throw new Error('ไม่พบข้อสอบ');
          setQuestions(data);
        }
      } catch (e) {
        await Swal.fire('เกิดข้อผิดพลาด', e.message, 'error');
        navigate('subject');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Spinner label="กำลังโหลดบทเรียน..." />;

  const filtered = search
    ? questions.filter(q => q.question.toLowerCase().includes(search.toLowerCase()))
    : questions;

  return (
    <div className="animate-fade">
      {/* Header */}
      <div className="quiz-card no-hover rounded-2xl p-4 mb-4 sticky top-0 z-10"
        style={{ background: 'var(--card)' }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="font-bold text-base" style={{ color: 'var(--text)' }}>📖 โหมดทบทวน</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{exam.lesson} • {filtered.length} ข้อ</p>
          </div>
          <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5"
            onClick={() => navigate('subject')}>← กลับ</button>
        </div>
        <input className="themed-input w-full text-sm" placeholder="🔍 ค้นหาคำถาม..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Study Cards */}
      <div className="mb-4">
        {filtered.length === 0 ? (
          <div className="quiz-card no-hover rounded-2xl p-8 text-center" style={{ color: 'var(--text-muted)' }}>
            ไม่พบข้อสอบที่ตรงกับคำค้น
          </div>
        ) : (
          filtered.map((q, i) => <StudyCard key={i} q={q} num={i + 1} />)
        )}
      </div>

      <button className="btn btn-gray w-full rounded-xl py-3" onClick={() => navigate('subject')}>
        ← กลับเลือกวิชา
      </button>
    </div>
  );
}
