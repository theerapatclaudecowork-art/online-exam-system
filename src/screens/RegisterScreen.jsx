import { useEffect, useState, useMemo } from 'react';
import Swal from 'sweetalert2';
import { useApp } from '../context/AppContext';
import { apiGetCached, apiPost, lsDel } from '../utils/api';
import { AUTO_APPROVE, APP_LOGO, FALLBACK_AVATAR } from '../config';

// ── Field wrapper: แสดง ✓ เมื่อผ่าน ──────────────────────────
function FieldWrap({ valid, children }) {
  return (
    <div style={{ position: 'relative' }}>
      {children}
      <span style={{
        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
        color: '#16a34a', fontSize: 17, fontWeight: 700, pointerEvents: 'none',
        opacity: valid ? 1 : 0, transition: 'opacity .25s ease',
      }}>✓</span>
    </div>
  );
}

// ── PDPA Consent Box ─────────────────────────────────────────
function PdpaBox({ checked, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const showError = !checked;

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{
        border: `2px solid ${checked ? '#86efac' : showError ? '#fca5a5' : '#fcd34d'}`,
        background: checked ? '#f0fdf4' : '#fffbeb',
      }}>

      {/* Header — คลิกเพื่อขยาย */}
      <button type="button"
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center gap-2.5 p-3 text-left">
        <span className="text-xl flex-shrink-0">🔒</span>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm" style={{ color: '#92400e' }}>
            นโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA)
          </div>
          <div className="text-xs" style={{ color: '#b45309' }}>
            กด {expanded ? 'ซ่อน' : 'อ่าน'} รายละเอียด
          </div>
        </div>
        <span style={{ color: '#b45309', transition: 'transform .3s', transform: expanded ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>▾</span>
      </button>

      {/* เนื้อหา PDPA */}
      <div style={{
        maxHeight: expanded ? 320 : 0,
        overflow: 'hidden',
        transition: 'max-height .4s cubic-bezier(.4,0,.2,1)',
      }}>
        <div className="px-4 pb-3 overflow-y-auto text-xs leading-relaxed space-y-2"
          style={{ maxHeight: 300, color: '#78350f' }}>

          <p><b>วัตถุประสงค์การเก็บข้อมูล</b><br/>
          ระบบจะเก็บรวบรวมข้อมูลส่วนบุคคลของท่าน ได้แก่ ชื่อ-นามสกุล เบอร์โทรศัพท์ อีเมล หน่วยงาน และข้อมูล LINE Account เพื่อวัตถุประสงค์ดังต่อไปนี้</p>

          <ul className="list-disc pl-4 space-y-1">
            <li>การจัดการบัญชีผู้ใช้งานในระบบทดสอบออนไลน์</li>
            <li>การบันทึกและแสดงผลการสอบ</li>
            <li>การแจ้งเตือนผ่านช่องทาง LINE</li>
            <li>การออกรายงานผลการสอบให้แก่หน่วยงาน</li>
          </ul>

          <p><b>การเปิดเผยข้อมูล</b><br/>
          ข้อมูลของท่านจะไม่ถูกเปิดเผยต่อบุคคลภายนอก ยกเว้นผู้ดูแลระบบและหน่วยงานต้นสังกัดของท่านเท่านั้น</p>

          <p><b>ระยะเวลาการเก็บข้อมูล</b><br/>
          ข้อมูลจะถูกเก็บรักษาตลอดระยะเวลาที่ท่านใช้งานระบบ และจะถูกลบออกเมื่อท่านยกเลิกการใช้งานหรือเมื่อหมดความจำเป็น</p>

          <p><b>สิทธิของเจ้าของข้อมูล</b><br/>
          ท่านมีสิทธิ์ขอเข้าถึง แก้ไข ลบ หรือคัดค้านการประมวลผลข้อมูลส่วนบุคคลของท่านได้ตลอดเวลา โดยติดต่อผู้ดูแลระบบ</p>

          <p><b>ฐานทางกฎหมาย</b><br/>
          การประมวลผลข้อมูลของท่านอาศัยฐานความยินยอม (Consent) ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562</p>

          <p className="text-xs" style={{ color: '#a16207', fontStyle: 'italic' }}>
            หากท่านต้องการทราบข้อมูลเพิ่มเติม กรุณาติดต่อผู้ดูแลระบบ
          </p>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: checked ? '#86efac' : '#fcd34d', margin: '0 12px' }} />

      {/* Checkbox ยินยอม */}
      <label className="flex items-start gap-3 p-3 cursor-pointer select-none">
        <div className="relative flex-shrink-0 mt-0.5">
          <input
            type="checkbox"
            checked={checked}
            onChange={e => onChange(e.target.checked)}
            className="sr-only"
          />
          {/* custom checkbox */}
          <div className="w-5 h-5 rounded-md flex items-center justify-center transition-all"
            style={{
              background: checked ? '#16a34a' : 'white',
              border: `2px solid ${checked ? '#16a34a' : '#fbbf24'}`,
              boxShadow: checked ? '0 0 0 3px #bbf7d0' : 'none',
            }}>
            {checked && <span style={{ color: 'white', fontSize: 12, fontWeight: 900, lineHeight: 1 }}>✓</span>}
          </div>
        </div>
        <span className="text-xs leading-relaxed" style={{ color: '#92400e' }}>
          <b>ข้าพเจ้ายินยอม</b>ให้เก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลของข้าพเจ้า
          ตามนโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA) ข้างต้น และรับทราบว่าสามารถถอนความยินยอมได้ทุกเมื่อ
          {!checked && <span className="font-bold" style={{ color: '#ef4444' }}> — กรุณายินยอมเพื่อดำเนินการต่อ</span>}
        </span>
      </label>

      {/* ✅ confirmed */}
      {checked && (
        <div className="px-3 pb-2.5 flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center"
            style={{ fontSize: 9, color: 'white', fontWeight: 900 }}>✓</span>
          <span className="text-xs font-semibold" style={{ color: '#15803d' }}>
            ยินยอมแล้ว — สามารถสมัครสมาชิกได้
          </span>
        </div>
      )}
    </div>
  );
}

export default function RegisterScreen() {
  const { navigate, profile, lineEmail } = useApp();

  const [form, setForm] = useState({
    firstName:  '',
    lastName:   '',
    email:      lineEmail || '',
    phone:      '',
    course:     '',
    department: '',
  });
  const [loading,       setLoading]       = useState(false);
  const [errors,        setErrors]        = useState({});
  const [touched,       setTouched]       = useState({});
  const [courses,       setCourses]       = useState([]);
  const [courseLoading, setCourseLoading] = useState(true);
  const [pdpaConsent,   setPdpaConsent]   = useState(false);
  const [pdpaTouched,   setPdpaTouched]   = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiGetCached('getCourses', {}, 5 * 60_000);
        if (data.success) setCourses(data.courses || []);
      } catch (_) {}
      finally { setCourseLoading(false); }
    })();
  }, []);

  // ── Validation per-field ──────────────────────────────────
  function getFieldError(field, val) {
    switch (field) {
      case 'firstName':
        return val.trim() ? '' : 'กรุณากรอกชื่อ';
      case 'lastName':
        return val.trim() ? '' : 'กรุณากรอกนามสกุล';
      case 'department':
        return val.trim() ? '' : 'กรุณากรอกหน่วยงาน';
      case 'course':
        return val ? '' : 'กรุณาเลือกหลักสูตร';
      case 'phone':
        if (!val.trim()) return 'กรุณากรอกเบอร์โทรศัพท์';
        return /^[0-9]{9,10}$/.test(val.replace(/[-\s]/g, ''))
          ? '' : 'เบอร์โทรไม่ถูกต้อง (9–10 หลัก)';
      case 'email':
        if (!val.trim()) return '';
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) ? '' : 'รูปแบบอีเมลไม่ถูกต้อง';
      default: return '';
    }
  }

  function update(field, val) {
    setForm(prev => ({ ...prev, [field]: val }));
    if (touched[field]) {
      setErrors(prev => ({ ...prev, [field]: getFieldError(field, val) }));
    }
  }

  function touch(field) {
    setTouched(prev => ({ ...prev, [field]: true }));
    setErrors(prev => ({ ...prev, [field]: getFieldError(field, form[field]) }));
  }

  // ── Real-time readiness ───────────────────────────────────
  const ok = useMemo(() => ({
    firstName:  !!form.firstName.trim(),
    lastName:   !!form.lastName.trim(),
    department: !!form.department.trim(),
    course:     !!form.course,
    phone:      /^[0-9]{9,10}$/.test(form.phone.replace(/[-\s]/g, '')),
    email:      form.email === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email),
  }), [form]);

  const REQUIRED_KEYS = ['firstName', 'lastName', 'department', 'course', 'phone'];
  const doneCount  = REQUIRED_KEYS.filter(k => ok[k]).length;
  const totalReq   = REQUIRED_KEYS.length;
  const formReady  = REQUIRED_KEYS.every(k => ok[k]) && ok.email;
  const isReady    = formReady && pdpaConsent;

  // ── Submit ────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setPdpaTouched(true);
    if (!pdpaConsent) {
      document.getElementById('pdpa-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!formReady) return;

    // touch all to show any last errors
    const allErrs = {};
    Object.keys(form).forEach(f => {
      const e = getFieldError(f, form[f]);
      if (e) allErrs[f] = e;
    });
    if (Object.keys(allErrs).length) { setErrors(allErrs); return; }

    setLoading(true);
    try {
      const data = await apiPost({
        action:          'registerUser',
        userId:          profile.userId,
        lineDisplayName: profile.displayName,
        pictureUrl:      profile.pictureUrl || '',
        fullName:        `${form.firstName.trim()} ${form.lastName.trim()}`,
        email:           form.email.trim(),
        phone:           form.phone.trim(),
        course:          form.course,
        department:      form.department.trim(),
        pdpaConsent:     true,
        pdpaConsentAt:   new Date().toISOString(),
      });

      if (!data.success) throw new Error(data.message || 'สมัครสมาชิกไม่สำเร็จ');
      lsDel('exam_init_' + (profile?.userId || ''));

      if (AUTO_APPROVE || data.status === 'active') {
        await Swal.fire({
          icon: 'success',
          title: 'สมัครสมาชิกสำเร็จ!',
          text: `ยินดีต้อนรับ ${form.firstName.trim()} ${form.lastName.trim()}`,
          timer: 2000,
          showConfirmButton: false,
        });
        navigate('setup');
      } else {
        navigate('pending');
      }
    } catch (err) {
      Swal.fire('เกิดข้อผิดพลาด', err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  // ── shared error border style ─────────────────────────────
  const errStyle = field =>
    touched[field] && errors[field]
      ? { borderColor: '#ef4444' }
      : {};

  return (
    <div className="quiz-card no-hover rounded-2xl p-4 sm:p-6 lg:p-8 animate-fade">

      {/* Header */}
      <div className="text-center mb-5">
        <img src={APP_LOGO} alt="logo" className="w-16 h-16 rounded-full object-cover shadow-md mx-auto mb-2" />
        <img
          src={profile?.pictureUrl || FALLBACK_AVATAR}
          alt="profile"
          className="w-12 h-12 rounded-full object-cover shadow-md mx-auto mb-3"
        />
        <h1 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text)' }}>สมัครสมาชิก</h1>
        <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          กรอกข้อมูลให้ครบถูกต้องเพื่อเข้าใช้งานระบบ
        </p>
      </div>

      {/* LINE badge */}
      <div className="flex items-center gap-3 mb-5 p-3 rounded-xl"
        style={{ background: 'var(--input-bg)', border: '1.5px solid var(--input-border)' }}>
        <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
        <div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>LINE Account</div>
          <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{profile?.displayName}</div>
        </div>
        <div className="ml-auto">
          <span className="badge-pass text-xs">เชื่อมต่อแล้ว</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="flex justify-between text-xs mb-1.5">
          <span style={{ color: 'var(--text-muted)' }}>ความครบถ้วนของข้อมูล</span>
          <span style={{ fontWeight: 700, color: isReady ? '#16a34a' : 'var(--accent)' }}>
            {doneCount}/{totalReq}
          </span>
        </div>
        <div className="w-full rounded-full overflow-hidden" style={{ height: 7, background: 'var(--input-border)' }}>
          <div style={{
            width:      `${(doneCount / totalReq) * 100}%`,
            height:     '100%',
            background: isReady ? '#16a34a' : 'var(--accent)',
            borderRadius: 9999,
            transition: 'width .4s cubic-bezier(.4,0,.2,1), background .3s ease',
          }} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── ชื่อ + นามสกุล ── */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="section-label">
              ชื่อ <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <FieldWrap valid={ok.firstName}>
              <input
                className="themed-input"
                style={{ paddingRight: 32, ...errStyle('firstName') }}
                placeholder="ชื่อจริง"
                value={form.firstName}
                onChange={e => update('firstName', e.target.value)}
                onBlur={() => touch('firstName')}
                maxLength={50}
              />
            </FieldWrap>
            {touched.firstName && errors.firstName && (
              <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.firstName}</p>
            )}
          </div>
          <div>
            <label className="section-label">
              นามสกุล <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <FieldWrap valid={ok.lastName}>
              <input
                className="themed-input"
                style={{ paddingRight: 32, ...errStyle('lastName') }}
                placeholder="นามสกุลจริง"
                value={form.lastName}
                onChange={e => update('lastName', e.target.value)}
                onBlur={() => touch('lastName')}
                maxLength={50}
              />
            </FieldWrap>
            {touched.lastName && errors.lastName && (
              <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.lastName}</p>
            )}
          </div>
        </div>

        {/* ── หน่วยงาน (required) ── */}
        <div>
          <label className="section-label">
            หน่วยงาน <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <FieldWrap valid={ok.department}>
            <input
              className="themed-input"
              style={{ paddingRight: 32, ...errStyle('department') }}
              placeholder="ชื่อหน่วยงาน / สังกัด"
              value={form.department}
              onChange={e => update('department', e.target.value)}
              onBlur={() => touch('department')}
              maxLength={100}
            />
          </FieldWrap>
          {touched.department && errors.department && (
            <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.department}</p>
          )}
        </div>

        {/* ── หลักสูตร (required) ── */}
        <div>
          <label className="section-label">
            หลักสูตร <span style={{ color: '#ef4444' }}>*</span>
          </label>
          {courseLoading ? (
            <div className="themed-input flex items-center gap-2" style={{ opacity: .6 }}>
              <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">กำลังโหลดหลักสูตร...</span>
            </div>
          ) : courses.length === 0 ? (
            <div className="themed-input text-sm" style={{ opacity: .6 }}>ยังไม่มีหลักสูตรที่เปิดรับ</div>
          ) : (
            <div style={{ position: 'relative' }}>
              <select
                className="themed-input"
                style={{ cursor: 'pointer', paddingRight: 36, ...errStyle('course') }}
                value={form.course}
                onChange={e => { update('course', e.target.value); touch('course'); }}
                onBlur={() => touch('course')}
              >
                <option value="">— เลือกหลักสูตร —</option>
                {courses.map(c => (
                  <option key={c.courseId} value={c.name}>{c.name}</option>
                ))}
              </select>
              {/* ✓ อยู่ซ้ายของลูกศร select */}
              <span style={{
                position: 'absolute', right: 32, top: '50%', transform: 'translateY(-50%)',
                color: '#16a34a', fontSize: 17, fontWeight: 700, pointerEvents: 'none',
                opacity: ok.course ? 1 : 0, transition: 'opacity .25s ease',
              }}>✓</span>
            </div>
          )}
          {touched.course && errors.course && (
            <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.course}</p>
          )}
        </div>

        {/* ── เบอร์โทร (required) ── */}
        <div>
          <label className="section-label">
            เบอร์โทรศัพท์ <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <FieldWrap valid={ok.phone}>
            <input
              type="tel"
              inputMode="numeric"
              className="themed-input"
              style={{ paddingRight: 32, ...errStyle('phone') }}
              placeholder="0812345678"
              value={form.phone}
              onChange={e => update('phone', e.target.value)}
              onBlur={() => touch('phone')}
              maxLength={15}
            />
          </FieldWrap>
          {touched.phone && errors.phone && (
            <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.phone}</p>
          )}
        </div>

        {/* ── อีเมล (optional) ── */}
        <div>
          <label className="section-label">
            อีเมล{' '}
            <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>(ไม่บังคับ)</span>
          </label>
          <FieldWrap valid={form.email !== '' && ok.email}>
            <input
              type="email"
              className="themed-input"
              style={{ paddingRight: 32, ...errStyle('email') }}
              placeholder="example@email.com"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              onBlur={() => touch('email')}
              maxLength={200}
            />
          </FieldWrap>
          {touched.email && errors.email && (
            <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.email}</p>
          )}
        </div>

        {/* ── PDPA Consent (แสดงเมื่อกรอกข้อมูลครบแล้ว) ── */}
        <div id="pdpa-section" style={{
          overflow: 'hidden',
          maxHeight: formReady ? 600 : 0,
          opacity:   formReady ? 1 : 0,
          transition: 'max-height .5s cubic-bezier(.4,0,.2,1), opacity .4s ease',
        }}>
          <PdpaBox
            checked={pdpaConsent}
            onChange={v => { setPdpaConsent(v); setPdpaTouched(true); }}
          />
          {/* shake hint เมื่อ submit โดยไม่ยินยอม */}
          {pdpaTouched && !pdpaConsent && (
            <p className="text-xs mt-1.5 text-center font-semibold" style={{ color: '#ef4444' }}>
              ⚠️ กรุณากดยินยอม PDPA ก่อนสมัครสมาชิก
            </p>
          )}
        </div>

        {/* ── ปุ่มยืนยัน: ปรากฎเมื่อกรอกครบ + ยินยอม PDPA ── */}
        <div style={{
          overflow: 'hidden',
          maxHeight: isReady ? 80 : 0,
          opacity:   isReady ? 1 : 0,
          transition: 'max-height .45s cubic-bezier(.4,0,.2,1), opacity .35s ease',
        }}>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full rounded-xl py-4 text-base"
            style={{ opacity: loading ? .65 : 1, marginTop: 4 }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                กำลังสมัคร...
              </span>
            ) : '✅ ยืนยันสมัครสมาชิก'}
          </button>
        </div>

        {/* ── ข้อความแนะนำเมื่อยังกรอกไม่ครบ ── */}
        {!formReady && (
          <div className="flex items-center justify-center gap-2 py-3 rounded-xl text-xs"
            style={{ background: 'var(--input-bg)', border: '1.5px dashed var(--input-border)', color: 'var(--text-muted)' }}>
            <span>📝</span>
            <span>กรอกข้อมูลที่จำเป็นให้ครบ ({doneCount}/{totalReq}) เพื่อดำเนินการต่อ</span>
          </div>
        )}
        {formReady && !pdpaConsent && (
          <div className="flex items-center justify-center gap-2 py-3 rounded-xl text-xs"
            style={{ background: '#fffbeb', border: '1.5px dashed #fbbf24', color: '#92400e' }}>
            <span>🔒</span>
            <span>กรุณายินยอม PDPA ด้านบนเพื่อแสดงปุ่มสมัครสมาชิก</span>
          </div>
        )}

      </form>

      <p className="text-xs text-center mt-4" style={{ color: 'var(--text-muted)' }}>
        🔒 ข้อมูลของคุณได้รับความคุ้มครองตาม PDPA พ.ศ. 2562
      </p>
    </div>
  );
}
