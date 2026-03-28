import { useEffect, useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { apiGet } from '../utils/api';
import Spinner from '../components/Spinner';

export default function ReportCardScreen() {
  const { navigate, profile } = useApp();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [statsRes, profileRes] = await Promise.all([
          apiGet('getMyStats',   { userId: profile.userId }),
          apiGet('getMyProfile', { userId: profile.userId }),
        ]);
        setData({ stats: statsRes, profile: profileRes });
      } catch (_) {}
      finally { setLoading(false); }
    })();
  }, []);

  function handlePrint() {
    window.print();
  }

  if (loading) return <Spinner label="กำลังสร้าง Report Card..." />;

  const s  = data?.stats?.summary || {};
  const ss = data?.stats?.subjectStats || [];
  const p  = data?.profile || {};
  const today = new Date().toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric' });

  return (
    <>
      {/* Print action bar — hidden when printing */}
      <div className="no-print quiz-card no-hover rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base" style={{ color:'var(--text)' }}>📄 Report Card</h2>
            <p className="text-xs" style={{ color:'var(--text-muted)' }}>กดพิมพ์หรือบันทึกเป็น PDF</p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary rounded-xl px-4 py-2 text-sm font-bold"
              onClick={handlePrint}>🖨️ พิมพ์ / บันทึก PDF</button>
            <button className="btn btn-gray rounded-xl px-3 py-2 text-sm"
              onClick={() => navigate('myStats')}>← กลับ</button>
          </div>
        </div>
      </div>

      {/* Printable Report */}
      <div ref={printRef} className="report-card" style={{ background:'white', borderRadius:16, overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,.12)' }}>

        {/* Header */}
        <div style={{ background:'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', padding:'28px 28px 20px', color:'white' }}>
          <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:16 }}>
            <img src={profile.pictureUrl || 'https://i.pinimg.com/originals/be/04/0f/be040f35f073adc3a48c1fba489d2bc4.gif'}
              style={{ width:64, height:64, borderRadius:'50%', border:'3px solid rgba(255,255,255,.5)', objectFit:'cover' }} alt="" />
            <div>
              <div style={{ fontSize:22, fontWeight:900 }}>{p.fullName || profile.displayName}</div>
              <div style={{ fontSize:13, opacity:.8 }}>
                {p.studentId && `รหัส: ${p.studentId} • `}
                {p.department && `${p.department} • `}
                {p.email}
              </div>
            </div>
            <div style={{ marginLeft:'auto', textAlign:'right' }}>
              <div style={{ fontSize:11, opacity:.7 }}>วันที่ออก Report</div>
              <div style={{ fontSize:13, fontWeight:700 }}>{today}</div>
            </div>
          </div>
          <div style={{ fontSize:18, fontWeight:700, borderTop:'1px solid rgba(255,255,255,.25)', paddingTop:12 }}>
            📊 รายงานผลการสอบ
          </div>
        </div>

        {/* KPI Summary */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:1, background:'#e5e7eb' }}>
          {[
            { label:'ครั้งที่สอบ',   val: s.totalAttempts||0,        color:'#4f46e5' },
            { label:'อัตราผ่าน',     val: (s.passRate||0)+'%',        color:'#16a34a' },
            { label:'คะแนนเฉลี่ย',  val: (s.avgScore||0)+'%',         color:'#3b82f6' },
            { label:'คะแนนสูงสุด',  val: (s.bestScore||0)+'%',        color:'#d97706' },
          ].map(k => (
            <div key={k.label} style={{ background:'white', padding:'16px 12px', textAlign:'center' }}>
              <div style={{ fontSize:26, fontWeight:900, color:k.color }}>{k.val}</div>
              <div style={{ fontSize:11, color:'#6b7280', marginTop:2 }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Pass/Fail bar */}
        {s.totalAttempts > 0 && (
          <div style={{ padding:'16px 24px', borderBottom:'1px solid #e5e7eb' }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:6, color:'#374151' }}>
              <span>ผ่าน {s.totalPass} ครั้ง</span>
              <span>ไม่ผ่าน {s.totalFail} ครั้ง</span>
            </div>
            <div style={{ display:'flex', borderRadius:999, overflow:'hidden', height:12 }}>
              <div style={{ width:`${s.passRate}%`, background:'#22c55e', transition:'width .6s' }}/>
              <div style={{ width:`${100-s.passRate}%`, background:'#ef4444' }}/>
            </div>
          </div>
        )}

        {/* Subject Table */}
        {ss.length > 0 && (
          <div style={{ padding:'20px 24px' }}>
            <div style={{ fontSize:15, fontWeight:700, color:'#111827', marginBottom:12 }}>📚 ผลรายวิชา</div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'#f9fafb' }}>
                  {['วิชา','จำนวนสอบ','ผ่าน','ไม่ผ่าน','อัตราผ่าน','คะแนนเฉลี่ย','สถานะ'].map(h => (
                    <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontWeight:600, color:'#6b7280', borderBottom:'2px solid #e5e7eb', fontSize:12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ss.map((w, i) => (
                  <tr key={i} style={{ borderBottom:'1px solid #f3f4f6', background: i%2===0 ? 'white' : '#fafafa' }}>
                    <td style={{ padding:'8px 10px', fontWeight:600, color:'#111827' }}>{w.subject}</td>
                    <td style={{ padding:'8px 10px', color:'#374151' }}>{w.attempts}</td>
                    <td style={{ padding:'8px 10px', color:'#16a34a', fontWeight:600 }}>{w.passCount}</td>
                    <td style={{ padding:'8px 10px', color:'#ef4444' }}>{w.attempts - w.passCount}</td>
                    <td style={{ padding:'8px 10px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ flex:1, height:6, background:'#e5e7eb', borderRadius:999, overflow:'hidden' }}>
                          <div style={{ width:`${w.passRate}%`, height:'100%', background: w.passRate>=60?'#22c55e':'#f59e0b' }}/>
                        </div>
                        <span style={{ fontWeight:700, color: w.passRate>=60?'#16a34a':'#d97706', minWidth:36 }}>{w.passRate}%</span>
                      </div>
                    </td>
                    <td style={{ padding:'8px 10px', color:'#374151' }}>{w.avgScore}%</td>
                    <td style={{ padding:'8px 10px' }}>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:999, fontWeight:700,
                        background: w.passRate>=60?'#dcfce7':'#fee2e2', color: w.passRate>=60?'#15803d':'#b91c1c' }}>
                        {w.passRate>=60 ? '✅ ผ่าน' : '⚠️ ต้องทบทวน'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div style={{ background:'#f9fafb', padding:'14px 24px', borderTop:'1px solid #e5e7eb',
          display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:11, color:'#9ca3af' }}>
          <span>ระบบข้อสอบออนไลน์</span>
          <span>สร้างเมื่อ {today}</span>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .report-card { box-shadow: none !important; border-radius: 0 !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </>
  );
}
