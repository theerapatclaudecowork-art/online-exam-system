import { useState } from 'react';
import Swal from 'sweetalert2';
import { useApp } from '../context/AppContext';
import { apiPost } from '../utils/api';
import { AUTO_APPROVE } from '../config';

export default function RegisterScreen() {
  const { navigate, profile, lineEmail } = useApp();

  const [form, setForm] = useState({
    fullName: profile?.displayName || '',
    email:    lineEmail || '',
    phone:    '',
    studentId: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});

  function update(field, val) {
    setForm(prev => ({ ...prev, [field]: val }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  }

  function validate() {
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = 'กรุณากรอกชื่อ-นามสกุล';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    if (form.phone && !/^[0-9]{9,10}$/.test(form.phone.replace(/-/g, '')))
      errs.phone = 'เบอร์โทรไม่ถูกต้อง (9-10 หลัก)';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const data = await apiPost({
        action:      'registerUser',
        userId:      profile.userId,
        lineDisplayName: profile.displayName,
        pictureUrl:  profile.pictureUrl || '',
        fullName:    form.fullName.trim(),
        email:       form.email.trim(),
        phone:       form.phone.trim(),
        studentId:   form.studentId.trim(),
      });

      if (!data.success) throw new Error(data.message || 'สมัครสมาชิกไม่สำเร็จ');

      if (AUTO_APPROVE || data.status === 'active') {
        await Swal.fire({
          icon: 'success',
          title: 'สมัครสมาชิกสำเร็จ!',
          text: `ยินดีต้อนรับ ${form.fullName}`,
          timer: 2000,
          showConfirmButton: false,
        });
        navigate('setup');
      } else {
        await Swal.fire({
          icon: 'info',
          title: 'รอการอนุมัติ',
          html: 'ระบบได้รับข้อมูลของคุณแล้ว<br>กรุณารอการอนุมัติจากผู้ดูแลระบบ',
          confirmButtonText: 'รับทราบ',
        });
        navigate('auth');
      }
    } catch (err) {
      Swal.fire('เกิดข้อผิดพลาด', err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="quiz-card no-hover rounded-2xl p-4 sm:p-6 lg:p-8 animate-fade">

      {/* Header */}
      <div className="text-center mb-6">
        <img
          src={profile?.pictureUrl || 'https://i.pinimg.com/originals/be/04/0f/be040f35f073adc3a48c1fba489d2bc4.gif'}
          alt="profile"
          className="w-16 h-16 rounded-full object-cover shadow-md mx-auto mb-3"
        />
        <h1 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text)' }}>สมัครสมาชิก</h1>
        <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          กรอกข้อมูลเพื่อเข้าใช้งานระบบข้อสอบ
        </p>
      </div>

      {/* LINE Display Name Badge */}
      <div className="flex items-center gap-3 mb-5 p-3 rounded-xl" style={{ background: 'var(--input-bg)', border: '1.5px solid var(--input-border)' }}>
        <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
        <div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>LINE Account</div>
          <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{profile?.displayName}</div>
        </div>
        <div className="ml-auto">
          <span className="badge-pass text-xs">เชื่อมต่อแล้ว</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ชื่อ-นามสกุล (required) */}
        <div>
          <label className="section-label">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
          <input
            className="themed-input"
            placeholder="ชื่อ-นามสกุลจริง"
            value={form.fullName}
            onChange={e => update('fullName', e.target.value)}
            maxLength={100}
          />
          {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
        </div>

        {/* รหัสนักเรียน/รหัสพนักงาน (optional) */}
        <div>
          <label className="section-label">รหัสนักเรียน / รหัสพนักงาน</label>
          <input
            className="themed-input"
            placeholder="ไม่บังคับ"
            value={form.studentId}
            onChange={e => update('studentId', e.target.value)}
            maxLength={50}
          />
        </div>

        {/* อีเมล (optional) */}
        <div>
          <label className="section-label">อีเมล</label>
          <input
            type="email"
            className="themed-input"
            placeholder="example@email.com (ไม่บังคับ)"
            value={form.email}
            onChange={e => update('email', e.target.value)}
            maxLength={200}
          />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </div>

        {/* เบอร์โทร (optional) */}
        <div>
          <label className="section-label">เบอร์โทรศัพท์</label>
          <input
            type="tel"
            className="themed-input"
            placeholder="0812345678 (ไม่บังคับ)"
            value={form.phone}
            onChange={e => update('phone', e.target.value)}
            maxLength={15}
          />
          {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full rounded-xl py-4 text-base mt-2"
          style={{ opacity: loading ? .6 : 1 }}
        >
          {loading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              กำลังสมัคร...
            </>
          ) : '✅ ยืนยันสมัครสมาชิก'}
        </button>

      </form>

      <p className="text-xs text-center mt-4" style={{ color: 'var(--text-muted)' }}>
        ข้อมูลของคุณจะถูกเก็บอย่างปลอดภัยและใช้ในระบบนี้เท่านั้น
      </p>
    </div>
  );
}
