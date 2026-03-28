import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useApp } from '../context/AppContext';
import { apiGet } from '../utils/api';
import Spinner from '../components/Spinner';
import { PASS_THRESHOLD } from '../config';

export default function DrillScreen() {
  const { navigate, profile, exam, setExam, settings, setSettings } = useApp();
  const [loading, setLoading] = useState(true);
  const [total, setTotal]     = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet('getDrillQuestions', {
          userId: profile.userId,
          lesson: exam.lesson || '',
        });
        if (!res.success) throw new Error(res.message || 'โหลดข้อมูลไม่สำเร็จ');
        if (!res.questions?.length) {
          await Swal.fire({
            icon: 'info',
            title: '🎉 เยี่ยมมาก!',
            text: 'ยังไม่มีข้อที่เคยตอบผิด หรือยังไม่มีประวัติการสอบ',
            confirmButtonText: 'กลับ',
          });
          navigate('myStats');
          return;
        }
        setTotal(res.total);
        // ส่งไปสอบเหมือนปกติ แต่ใช้ข้อที่ตอบผิด
        const shuffled = [...res.questions].sort(() => Math.random() - 0.5).slice(0, Math.min(settings.numQ || 20, res.questions.length));
        setSettings(s => ({ ...s, useTimer: false })); // drill = ไม่จับเวลา
        setExam(prev => ({
          ...prev,
          lesson: (exam.lesson || 'Drill Mode') + ' (ข้อที่เคยผิด)',
          setId: '',
          allQ: shuffled,
          passThreshold: PASS_THRESHOLD,
        }));
        navigate('quiz');
      } catch (e) {
        Swal.fire('เกิดข้อผิดพลาด', e.message, 'error');
        navigate('myStats');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return <Spinner label="กำลังโหลดข้อที่เคยตอบผิด..." />;
}
