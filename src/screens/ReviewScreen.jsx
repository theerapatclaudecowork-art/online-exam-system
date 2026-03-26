import { useApp } from '../context/AppContext';

export default function ReviewScreen() {
  const { navigate, exam } = useApp();

  return (
    <div className="quiz-card rounded-2xl p-6 sm:p-8 animate-fade">
      <h2 className="text-xl font-bold mb-6 text-center" style={{ color: 'var(--text)' }}>📋 เฉลยข้อสอบ</h2>

      <div className="space-y-4">
        {exam.questions.map((q, i) => {
          const user    = exam.answers[i] || 'ไม่ได้ตอบ';
          const correct = Array.isArray(q.answer) ? q.answer[0] : q.answer || '';
          const ok      = user.trim() === correct.trim();

          return (
            <div key={i} className={ok ? 'row-correct' : 'row-wrong'}>
              <p className="font-semibold mb-1" style={{ color: 'inherit' }}>{i + 1}. {q.question}</p>
              <p className="text-sm mb-0.5">
                คำตอบของคุณ: <b>{user}</b>{' '}
                {ok
                  ? <span style={{ color: '#16a34a' }}>✔ ถูก</span>
                  : <span style={{ color: '#dc2626' }}>✖ ผิด</span>}
              </p>
              {!ok && <p className="text-sm mb-0.5">เฉลย: <b style={{ color: '#16a34a' }}>{correct}</b></p>}
              <div style={{ borderTop: '1px solid currentColor', opacity: .2, marginTop: 8 }} />
              <div style={{ marginTop: 8 }}>
                <p style={{ fontSize: 12, fontWeight: 700, opacity: .7 }}>คำอธิบาย</p>
                <p className="text-sm">{q.explanation || 'ไม่มีคำอธิบาย'}</p>
              </div>
            </div>
          );
        })}
      </div>

      <button className="btn btn-gray w-full rounded-xl py-3 mt-7" onClick={() => navigate('score')}>
        ← กลับผลคะแนน
      </button>
    </div>
  );
}
