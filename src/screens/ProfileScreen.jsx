import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiGet } from '../utils/api';

const STATUS_LABEL = {
  active:   { label: 'ใช้งาน',    bg: '#dcfce7', color: '#15803d' },
  pending:  { label: 'รออนุมัติ', bg: '#fef9c3', color: '#854d0e' },
  inactive: { label: 'ระงับ',     bg: '#fee2e2', color: '#b91c1c' },
};

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 py-2.5" style={{ borderBottom: '1px solid var(--input-border)' }}>
      <span className="text-sm w-36 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-sm font-medium break-all" style={{ color: 'var(--text)' }}>{value}</span>
    </div>
  );
}

function PhoneRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid var(--input-border)' }}>
      <span className="text-sm w-36 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <a href={`tel:${value}`}
        className="text-sm font-semibold flex items-center gap-1.5 rounded-full px-3 py-0.5 transition-all active:scale-95"
        style={{ color: '#fff', background: '#16a34a', textDecoration: 'none' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
        </svg>
        {value}
      </a>
    </div>
  );
}

export default function ProfileScreen() {
  const { navigate, profile } = useApp();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet('getMyProfile', { userId: profile?.userId });
        if (res.success) setData(res);
        else setError(res.message || 'โหลดข้อมูลไม่สำเร็จ');
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile]);

  const st = data ? STATUS_LABEL[data.status] : null;

  return (
    <div className="quiz-card no-hover rounded-2xl p-4 sm:p-6 animate-fade">

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('setup')} className="btn btn-gray rounded-xl px-3 py-2 text-sm">← กลับ</button>
        <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>ข้อมูลของฉัน</h1>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <span className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      )}

      {error && <p className="text-center text-red-500 py-8">{error}</p>}

      {data && (
        <>
          {/* Avatar + ชื่อ LINE */}
          <div className="flex flex-col items-center gap-2 mb-6">
            <img
              src={data.pictureUrl || profile?.pictureUrl || 'https://i.pinimg.com/originals/be/04/0f/be040f35f073adc3a48c1fba489d2bc4.gif'}
              alt="avatar"
              className="w-20 h-20 rounded-full object-cover shadow-md"
            />
            <div className="text-base font-bold" style={{ color: 'var(--text)' }}>{data.displayName}</div>
            {st && (
              <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: st.bg, color: st.color }}>
                {st.label}
              </span>
            )}
          </div>

          {/* ข้อมูล */}
          <div className="rounded-xl px-2" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>
            <Row label="ชื่อ-นามสกุล"         value={data.fullName} />
            <Row label="รหัสสมาชิก"           value={data.studentId} />
            <Row label="หน่วยงาน"              value={data.department} />
            <Row label="อีเมล"                 value={data.email} />
            <PhoneRow label="เบอร์โทรศัพท์"     value={data.phone} />
            <Row label="LINE ID"               value={data.lineUserId} />
            <Row label="วันที่สมัคร"           value={data.joinDate} />
            {data.role && <Row label="สิทธิ์"  value={data.role} />}
          </div>

          <p className="text-xs text-center mt-4" style={{ color: 'var(--text-muted)' }}>
            หากต้องการแก้ไขข้อมูล กรุณาติดต่อผู้ดูแลระบบ
          </p>
        </>
      )}
    </div>
  );
}
