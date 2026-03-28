import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { useApp } from '../context/AppContext';
import { apiGet, apiGetCached } from '../utils/api';
import Spinner from '../components/Spinner';

const Q_CACHE_TTL = 3 * 60 * 1000; // 3 นาที

export default function SubjectScreen() {
  const { navigate, settings, exam, setExam, subjects: ctxSubjects, setSubjects } = useApp();
  const [subjects, setLocal]  = useState(ctxSubjects || []);
  const [loading, setLoading] = useState(!ctxSubjects?.length);

  useEffect(() => {
    // ถ้ามี subjects ใน Context อยู่แล้ว → ไม่ต้อง fetch ซ้ำ
    if (ctxSubjects?.length) {
      setLocal(ctxSubjects);
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const data = await apiGetCached('getSubjects', {}, 5 * 60_000);
        if (!data.success || !data.subjects?.length) {
          await Swal.fire('ไม่พบรายวิชา', 'กรุณาเพิ่มข้อมูลใน Google Sheet', 'warning');
          navigate('setup');
          return;
        }
        setLocal(data.subjects);
        setSubjects(data.subjects); // เก็บเข้า Context ด้วย
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
      // ใช้ cache 3 นาที สำหรับ questions ของแต่ละวิชา
      const data = await apiGetCached('getQuestions', { lesson: name }, Q_CACHE_TTL);
      if (!Array.isArray(data) || !data.length) throw new Error('ไม่พบข้อสอบในวิชานี้');
      setExam(prev => ({ ...prev, lesson: name, allQ: data }));
      navigate('quiz');
    } catch (e) {
      await Swal.fire('เกิดข้อผิดพลาด', e.message || 'โหลดข้อสอบไม่สำเร็จ', 'error');
      navigate('subject');
    }
  }

  async function studySubject(name) {
    navigate('loading-quiz');
    try {
      const data = await apiGetCached('getQuestions', { lesson: name }, Q_CACHE_TTL);
      if (!Array.isArray(data) || !data.length) throw new Error('ไม่พบข้อสอบในวิชานี้');
      setExam(prev => ({ ...prev, lesson: name, allQ: data }));
      navigate('study');
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
              background:  'var(--input-bg)',
              border:      '1.5px solid var(--input-border)',
              cursor:      'pointer',
              transition:  'all .2s',
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--input-border)'; e.currentTarget.style.transform = ''; }}
          >
            <div className="font-semibold mb-3 text-sm" style={{ color: 'var(--text)' }}>{s.name}</div>
            <div className="flex gap-2">
              <button
                className="btn btn-primary text-sm rounded-lg px-3 py-2 flex-1"
                onClick={() => pickSubject(s.name)}
              >
                ✏️ สอบ
              </button>
              <button
                className="btn btn-gray text-sm rounded-lg px-3 py-2 flex-1"
                onClick={() => studySubject(s.name)}
              >
                📖 ทบทวน
              </button>
            </div>
          </div>
        ))}
      </div>

      <button className="btn btn-gray w-full rounded-xl py-3" onClick={() => navigate('setup')}>
        ← กลับตั้งค่า
      </button>
    </div>
  );
}
