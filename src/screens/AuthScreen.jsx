import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { LIFF_ID, GAS_URL, DEV_PREVIEW, DEV_PROFILE, APP_LOGO } from '../config';
import { useApp } from '../context/AppContext';
import { apiGet, lsGet, lsSet, lsDel } from '../utils/api';

const USER_CACHE_KEY = 'exam_init';
const USER_CACHE_TTL = 5 * 60 * 1000; // 5 นาที

export default function AuthScreen() {
  const { navigate, setProfile, setLineEmail, setIsAdmin, setIsTeacher, setSubjects, setQuestionBank, setUserCourse } = useApp();
  const [msg, setMsg] = useState('กำลังเชื่อมต่อ LINE...');

  useEffect(() => {
    // ── Dev Preview Mode ────────────────────────────────────
    if (DEV_PREVIEW) {
      setMsg('โหมดทดสอบ (DEV)...');
      setProfile(DEV_PROFILE);
      setLineEmail('dev@preview.local');
      setTimeout(() => navigate('register'), 800);
      return;
    }

    if (LIFF_ID === 'YOUR_LIFF_ID_HERE' || GAS_URL === 'YOUR_GAS_EXEC_URL_HERE') {
      setMsg('⚠️ ยังไม่ได้ตั้งค่าระบบ');
      Swal.fire({ icon: 'warning', title: 'ยังไม่ได้ตั้งค่าระบบ', html: 'กรุณาแก้ไข <b>LIFF_ID</b> และ <b>GAS_URL</b><br>ในไฟล์ <code>src/config.js</code>', allowOutsideClick: false });
      return;
    }

    async function init() {
      try {
        setMsg('กำลังเชื่อมต่อ LINE...');
        await liff.init({ liffId: LIFF_ID });

        if (!liff.isLoggedIn()) { liff.login(); return; }

        setMsg('กำลังโหลดข้อมูลผู้ใช้...');
        const profile = await liff.getProfile();
        let email = null;
        try { email = liff.getDecodedIDToken()?.email || null; } catch (_) {}

        setProfile(profile);
        setLineEmail(email);

        // ── ตรวจ localStorage cache ก่อน (ถ้ายังไม่หมดอายุ skip GAS call) ──
        const cached = lsGet(USER_CACHE_KEY + '_' + profile.userId, USER_CACHE_TTL);
        if (cached) {
          // ใช้ข้อมูล cache ได้เลย
          if (cached.subjects?.length) setSubjects(cached.subjects);
          if (cached.role === 'admin') setIsAdmin(true);
          if (cached.role === 'teacher') setIsTeacher(true);
          if (cached.questionBank) setQuestionBank(cached.questionBank);
          if (cached.course) setUserCourse(cached.course);
          _navigate(cached, navigate);
          return;
        }

        // ── เรียก GAS ครั้งเดียว: ได้ทั้ง user status + subjects ──
        setMsg('กำลังตรวจสอบสิทธิ์...');
        const data = await apiGet('initApp', { userId: profile.userId });

        if (data.status === 'notfound') {
          navigate('register');
          return;
        }
        if (data.status === 'pending') {
          navigate('pending');
          return;
        }
        if (!data.success) {
          setMsg('ไม่มีสิทธิ์เข้าใช้งาน');
          Swal.fire({ icon: 'error', title: 'ไม่มีสิทธิ์เข้าใช้งาน', text: data.message || 'ติดต่อผู้ดูแลระบบ', allowOutsideClick: false });
          return;
        }

        // บันทึก subjects เข้า Context ทันที (SubjectScreen ไม่ต้อง fetch อีก)
        if (data.subjects?.length) setSubjects(data.subjects);
        if (data.role === 'admin') setIsAdmin(true);
        if (data.role === 'teacher') setIsTeacher(true);
        if (data.questionBank) setQuestionBank(data.questionBank);
        if (data.course) setUserCourse(data.course);

        // cache ผลไว้ 5 นาที
        lsSet(USER_CACHE_KEY + '_' + profile.userId, data);

        _navigate(data, navigate);
      } catch (e) {
        console.error(e);
        const errMsg = e?.message || '';
        if (errMsg.includes('not in LIFF') || errMsg.includes('endpoint') || errMsg.includes('liffId')) {
          setMsg('⚠️ LIFF URL ไม่ถูกต้อง');
          Swal.fire({ icon: 'warning', title: 'ตั้งค่า LIFF URL ไม่ถูกต้อง', html: `กรุณาไปที่ LINE Developer Console<br>แล้วตั้งค่า <b>Endpoint URL</b> ของ LIFF เป็น<br><code style="font-size:11px">${location.origin}${location.pathname}</code>`, allowOutsideClick: false });
        } else {
          setMsg('เกิดข้อผิดพลาด — กรุณารีเฟรชหน้าเว็บ');
          Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: errMsg || 'ไม่สามารถเชื่อมต่อ LINE LIFF ได้', footer: '<small>กรุณาเปิดผ่าน LINE App หรือตรวจสอบ LIFF Endpoint URL</small>', allowOutsideClick: false });
        }
      }
    }

    init();
  }, []);

  return (
    <div className="quiz-card no-hover rounded-2xl p-10 text-center animate-fade">
      <img src={APP_LOGO} alt="logo" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 16px', display: 'block', boxShadow: '0 4px 16px rgba(0,0,0,.12)' }} />
      <div className="spinner" />
      <p style={{ color: 'var(--text-muted)' }}>{msg}</p>
    </div>
  );
}

// แยก navigate logic ออกมาเพื่อใช้ร่วมกันทั้ง cache path และ fresh path
function _navigate(data, navigate) {
  const urlParams = new URLSearchParams(window.location.search);
  const goPage    = urlParams.get('page');
  if (data.role === 'admin') {
    navigate('admin');
  } else if (data.role === 'teacher') {
    navigate('teacher');
  } else if (goPage === 'history') {
    navigate('history');
  } else {
    navigate('setup');
  }
}
