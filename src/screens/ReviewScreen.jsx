import { useApp } from '../context/AppContext';

export default function ReviewScreen() {
  const { navigate, exam } = useApp();

  return (
    <div className="quiz-card rounded-2xl p-4 sm:p-6 lg:p-8 animate-fade">
      <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-center" style={{ color: 'var(--text)' }}>📋 เฉลยข้อสอบ</h2>

      <div className="space-y-3 sm:space-y-4">
        {exam.questions.map((q, i) => {
          const user    = exam.answers[i] || 'ไม่ได้ตอบ';
          const correct = Array.isArray(q.answer) ? q.answer[0] : q.answer || '';
          const ok      = user.trim() === correct.trim();

          return (
            <div key={i} className={ok ? 'row-correct' : 'row-wrong'}>
              <p className="font-semibold mb-1 text-sm sm:text-base" style={{ color: 'inherit', wordBreak: 'break-word' }}>{i + 1}. {q.question}</p>
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
