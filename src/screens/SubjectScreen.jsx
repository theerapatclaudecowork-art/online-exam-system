import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { useApp } from '../context/AppContext';
import { apiGet } from '../utils/api';
import Spinner from '../components/Spinner';

export default function SubjectScreen() {
  const { navigate, settings, exam, setExam } = useApp();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiGet('getSubjects');
        if (!data.success || !data.subjects?.length) {
          await Swal.fire('ไม่พบรายวิชา', 'กรุณาเพิ่มข้อมูลใน Google Sheet', 'warning');
          navigate('setup');
          return;
        }
        setSubjects(data.subjects);
      } catch {
        await Swal.fire('เกิดข้อผิดพลาด', 'โหลดรายวิชาไม่สำเร็จ', 'error');
        navigate('setup');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function pickSubject(name) {
    navigate('loading-quiz');
    try {
      const data = await apiGet('getQuestions', { lesson: name });
      if (!Array.isArray(data) || !data.length) throw new Error('ไม่พบข้อสอบในวิชานี้');
      setExam(prev => ({ ...prev, lesson: name, allQ: data }));
      navigate('quiz');
    } catch (e) {
      await Swal.fire('เกิดข้อผิดพลาด', e.message || 'โหลดข้อสอบไม่สำเร็จ', 'error');
      navigate('subject');
    }
  }

  if (loading) return <Spinner label="กำลังโหลดรายวิชา..." />;

  return (
    <div className="quiz-card rounded-2xl p-6 sm:p-8 text-center animate-fade">
      <h2 className="text-xl font-bold mb-5" style={{ color: 'var(--text)' }}>เลือกวิชาที่ต้องการ</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {subjects.map(s => (
          <div
            key={s.name}
            className="rounded-xl p-4 text-left"
            style={{
              background: 'var(--input-bg)',
              border: '1.5px solid var(--input-border)',
              cursor: 'pointer',
              transition: 'all .2s',
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--input-border)'; e.currentTarget.style.transform = ''; }}
          >
            <div className="font-semibold mb-2" style={{ color: 'var(--text)' }}>{s.name}</div>
            <button
              className="btn btn-primary text-sm rounded-lg px-4 py-2 w-full"
              onClick={() => pickSubject(s.name)}
            >
              ทำข้อสอบ
            </button>
          </div>
        ))}
      </div>

      <button className="btn btn-gray w-full rounded-xl py-3" onClick={() => navigate('setup')}>
        ← กลับตั้งค่า
      </button>
    </div>
  );
}
