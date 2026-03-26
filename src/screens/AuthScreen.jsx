import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { LIFF_ID, GAS_URL, DEV_PREVIEW, DEV_PROFILE } from '../config';
import { useApp } from '../context/AppContext';
import { apiGet } from '../utils/api';

export default function AuthScreen() {
  const { navigate, setProfile, setLineEmail, setIsAdmin } = useApp();
  const [msg, setMsg] = useState('กำลังเชื่อมต่อ LINE...');

  useEffect(() => {
    // ── Dev Preview Mode ──────────────────────────────────
    if (DEV_PREVIEW) {
      setMsg('โหมดทดสอบ (DEV)...');
      setProfile(DEV_PROFILE);
      setLineEmail('dev@preview.local');
      setTimeout(() => navigate('register'), 800);
      return;
    }

    // ตรวจสอบ config ก่อน
    if (LIFF_ID === 'YOUR_LIFF_ID_HERE' || GAS_URL === 'YOUR_GAS_EXEC_URL_HERE') {
      setMsg('⚠️ ยังไม่ได้ตั้งค่าระบบ');
      Swal.fire({
        icon: 'warning',
        title: 'ยังไม่ได้ตั้งค่าระบบ',
        html: 'กรุณาแก้ไข <b>LIFF_ID</b> และ <b>GAS_URL</b><br>ในไฟล์ <code>src/config.js</code>',
        allowOutsideClick: false,
      });
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

        setMsg('กำลังตรวจสอบสิทธิ์...');
        const data = await apiGet('checkUser', { userId: profile.userId });

        if (data.status === 'notfound') {
          navigate('register');
          return;
        }
        if (!data.success) {
          setMsg('ไม่มีสิทธิ์เข้าใช้งาน');
          Swal.fire({
            icon: 'error',
            title: 'ไม่มีสิทธิ์เข้าใช้งาน',
            text: data.message || 'ติดต่อผู้ดูแลระบบ',
            allowOutsideClick: false,
          });
          return;
        }

        if (data.role === 'admin') setIsAdmin(true);
        navigate('setup');
      } catch (e) {
        console.error(e);
        const msg = e?.message || '';
        if (msg.includes('not in LIFF') || msg.includes('endpoint') || msg.includes('liffId')) {
          setMsg('⚠️ LIFF URL ไม่ถูกต้อง');
          Swal.fire({
            icon: 'warning',
            title: 'ตั้งค่า LIFF URL ไม่ถูกต้อง',
            html: `กรุณาไปที่ LINE Developer Console<br>แล้วตั้งค่า <b>Endpoint URL</b> ของ LIFF เป็น<br><code style="font-size:11px">${location.origin}${location.pathname}</code>`,
            allowOutsideClick: false,
          });
        } else {
          setMsg('เกิดข้อผิดพลาด — กรุณารีเฟรชหน้าเว็บ');
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: msg || 'ไม่สามารถเชื่อมต่อ LINE LIFF ได้',
            footer: '<small>กรุณาเปิดผ่าน LINE App หรือตรวจสอบ LIFF Endpoint URL</small>',
            allowOutsideClick: false,
          });
        }
      }
    }

    init();
  }, []);

  return (
    <div className="quiz-card no-hover rounded-2xl p-10 text-center animate-fade">
      <div className="spinner" />
      <p style={{ color: 'var(--text-muted)' }}>{msg}</p>
    </div>
  );
}
