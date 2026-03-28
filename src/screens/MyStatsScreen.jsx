import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiGet } from '../utils/api';
import Spinner from '../components/Spinner';

const MEDAL = ['🥇','🥈','🥉'];

function StatBox({ val, label, color, sub }) {
  return (
    <div className="stat-box animate-slide-up text-center">
      <div className="text-xl sm:text-2xl font-black" style={{ color }}>{val}</div>
      {sub && <div className="text-xs font-medium" style={{ color }}>{sub}</div>}
      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}

export default function MyStatsScreen() {
  const { navigate, profile } = useApp();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet('getMyStats', { userId: profile?.userId });
        if (res.success) setData(res);
      } catch (_) {}
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <Spinner label="กำลังโหลดสถิติ..." />;

  const s  = data?.summary || {};
  const ss = data?.subjectStats || [];
  const weak = ss.filter(x => x.passRate < 60);
  const good = ss.filter(x => x.passRate >= 80);

  return (
    <div className="animate-fade space-y-4">

      {/* Header */}
      <div className="quiz-card no-hover rounded-2xl p-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-bold text-base sm:text-lg" style={{ color: 'var(--text)' }}>📊 สถิติของฉัน</h1>
          <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5"
            onClick={() => navigate('setup')}>← กลับ</button>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <img src={profile?.pictureUrl || 'https://i.pinimg.com/originals/be/04/0f/be040f35f073adc3a48c1fba489d2bc4.gif'}
            alt="" className="w-8 h-8 rounded-full object-cover" />
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{profile?.displayName}</span>
          {s.rank && (
            <span className="ml-auto text-xs font-black px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(var(--accent-rgb),.12)', color: 'var(--accent)' }}>
              🏅 อันดับ {s.rank} / {s.totalUsers} คน
            </span>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox val={s.totalAttempts ?? 0}  label="ครั้งที่สอบ"  color="var(--accent)" />
        <StatBox val={(s.passRate ?? 0)+'%'}  label="อัตราผ่าน"   color="#16a34a" />
        <StatBox val={(s.avgScore  ?? 0)+'%'} label="คะแนนเฉลี่ย" color="#3b82f6" />
        <StatBox val={s.totalPass  ?? 0}      label="ผ่านแล้ว"    color="#16a34a" />
        <StatBox val={s.totalFail  ?? 0}      label="ไม่ผ่าน"     color="#ef4444" />
        <StatBox val={(s.bestScore ?? 0)+'%'} label="สูงสุด"      color="#d97706" />
      </div>

      {/* Pass Rate Donut */}
      {s.totalAttempts > 0 && (
        <div className="quiz-card no-hover rounded-2xl p-4 flex items-center gap-4">
          <div className="relative flex-shrink-0" style={{ width: 80, height: 80 }}>
            <svg viewBox="0 0 100 100" width="80" height="80">
              <circle cx="50" cy="50" r="38" fill="none" stroke="var(--progress-trk)" strokeWidth="14"/>
              <circle cx="50" cy="50" r="38" fill="none"
                stroke="#16a34a" strokeWidth="14"
                strokeDasharray="238.76"
                strokeDashoffset={238.76 * (1 - (s.passRate||0)/100)}
                transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dashoffset .8s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-black" style={{ color: '#16a34a' }}>{s.passRate||0}%</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm mb-1" style={{ color: 'var(--text)' }}>อัตราผ่าน</div>
            <div className="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
              <div>✅ ผ่าน <b style={{ color: '#16a34a' }}>{s.totalPass}</b> ครั้ง</div>
              <div>❌ ไม่ผ่าน <b style={{ color: '#ef4444' }}>{s.totalFail}</b> ครั้ง</div>
              {s.lastAttempt && <div>🕐 ล่าสุด {s.lastAttempt}</div>}
            </div>
          </div>
          {s.rank && s.rank <= 3 && (
            <div className="text-4xl flex-shrink-0">{MEDAL[s.rank-1]}</div>
          )}
        </div>
      )}

      {/* Streak */}
      {s.streak > 0 && (
        <div className="quiz-card no-hover rounded-2xl p-4 flex items-center gap-4">
          <div className="text-4xl flex-shrink-0">{s.streak >= 7 ? '🔥🔥' : '🔥'}</div>
          <div className="flex-1">
            <div className="font-bold text-sm" style={{ color: 'var(--text)' }}>
              Streak {s.streak} วันติดต่อกัน!
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {s.streak >= 7 ? '🏆 สุดยอด! 7 วันติดต่อกัน' : 'สอบต่อเนื่องทุกวัน ไม่ยอมหยุด'}
            </div>
          </div>
        </div>
      )}

      {/* Badges */}
      {data?.badges?.length > 0 && (
        <div className="quiz-card no-hover rounded-2xl p-4">
          <div className="font-bold text-sm mb-3" style={{ color: 'var(--text)' }}>🏅 ความสำเร็จที่ได้รับ</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {data.badges.map(b => (
              <div key={b.id} className="rounded-xl p-3 text-center"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>
                <div className="text-2xl mb-1">{b.icon}</div>
                <div className="text-xs font-bold" style={{ color: 'var(--text)' }}>{b.label}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{b.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* วิชาที่ควรทบทวน */}
      {weak.length > 0 && (
        <div className="quiz-card no-hover rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">⚠️</span>
            <span className="font-bold text-sm" style={{ color: '#b45309' }}>วิชาที่ควรทบทวน</span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#fef9c3', color: '#854d0e' }}>
              ผ่านต่ำกว่า 60%
            </span>
          </div>
          <div className="space-y-2">
            {weak.map(w => (
              <div key={w.subject} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{w.subject}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    ผ่าน {w.passCount}/{w.attempts} ครั้ง • เฉลี่ย {w.avgScore}%
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-sm font-black" style={{ color: w.passRate < 30 ? '#ef4444' : '#f59e0b' }}>
                    {w.passRate}%
                  </div>
                  <div style={{ background: 'var(--progress-trk)', borderRadius: 999, height: 4, width: 64, overflow: 'hidden', marginTop: 2 }}>
                    <div style={{ width: `${w.passRate}%`, height: '100%', background: '#f59e0b', borderRadius: 999 }}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn-gray w-full rounded-xl py-2 text-sm mt-3"
            onClick={() => navigate('subject')}>
            📚 ไปทบทวน →
          </button>
        </div>
      )}

      {/* วิชาที่เก่ง */}
      {good.length > 0 && (
        <div className="quiz-card no-hover rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🌟</span>
            <span className="font-bold text-sm" style={{ color: '#15803d' }}>วิชาที่เก่ง</span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#dcfce7', color: '#15803d' }}>
              ผ่านมากกว่า 80%
            </span>
          </div>
          <div className="space-y-2">
            {good.slice(0, 5).map(w => (
              <div key={w.subject} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{w.subject}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    ผ่าน {w.passCount}/{w.attempts} ครั้ง • เฉลี่ย {w.avgScore}%
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-sm font-black" style={{ color: '#16a34a' }}>{w.passRate}%</div>
                  <div style={{ background: 'var(--progress-trk)', borderRadius: 999, height: 4, width: 64, overflow: 'hidden', marginTop: 2 }}>
                    <div style={{ width: `${w.passRate}%`, height: '100%', background: '#22c55e', borderRadius: 999 }}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ทุกวิชา */}
      {ss.length > 0 && weak.length === 0 && good.length === 0 && (
        <div className="quiz-card no-hover rounded-2xl p-4">
          <div className="font-bold text-sm mb-3" style={{ color: 'var(--text)' }}>📋 ผลตามวิชา</div>
          <div className="space-y-2">
            {ss.map(w => (
              <div key={w.subject} className="flex items-center justify-between">
                <div className="text-sm truncate flex-1 mr-3" style={{ color: 'var(--text)' }}>{w.subject}</div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: w.passRate>=60?'#dcfce7':'#fee2e2', color: w.passRate>=60?'#15803d':'#b91c1c' }}>
                  {w.passRate}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ปุ่ม */}
      <div className="space-y-3">
        {/* Drill mode button */}
        <button className="btn w-full rounded-xl py-3 font-semibold text-sm col-span-2"
          style={{ background: '#ef4444', color: 'white' }}
          onClick={() => navigate('drill')}>
          🎯 Drill Mode — ฝึกข้อที่เคยผิด
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button className="btn rounded-xl py-3 font-semibold text-sm"
            style={{ background: 'var(--accent)', color: 'white' }}
            onClick={() => navigate('leaderboard')}>
            🏆 ดูอันดับ
          </button>
          <button className="btn btn-gray rounded-xl py-3 font-semibold text-sm"
            onClick={() => navigate('history')}>
            📋 ประวัติการสอบ
          </button>
        </div>
      </div>

      {s.totalPass > 0 && (
        <button className="btn w-full rounded-xl py-3 font-semibold text-sm"
          style={{ background: '#d97706', color: 'white' }}
          onClick={() => navigate('certificate')}>
          🎓 ดูใบประกาศ
        </button>
      )}

      <button className="btn w-full rounded-xl py-3 font-semibold text-sm"
        style={{ background:'#374151', color:'white' }}
        onClick={() => navigate('reportCard')}>
        📄 ดู/พิมพ์ Report Card
      </button>

    </div>
  );
}
