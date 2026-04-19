// ─────────────────────────────────────────────────────────────
//  StatsCharts — Admin Dashboard ครบทุกมิติ
//  tabs: ภาพรวม | วิชา | หน่วยงาน | ชุดข้อสอบ | แนวโน้ม | กระจาย | แจ้งเตือน
// ─────────────────────────────────────────────────────────────
import { useState } from 'react';
import { PALETTE, AnimatedNumber, ChartCard, Legend } from './ChartBase';
import DonutChart        from './DonutChart';
import HBarChart         from './HBarChart';
import VBarChart         from './VBarChart';
import Bar3DChart        from './Bar3DChart';
import ClusteredBarChart from './ClusteredBarChart';
import LineChart         from './LineChart';
import RadarChart        from './RadarChart';
import Spinner           from '../Spinner';

const STAT_TABS = [
  { key: 'overview',  label: '📊 ภาพรวม'       },
  { key: 'course',    label: '🎓 หลักสูตร'      },
  { key: 'subject',   label: '📚 วิชา'          },
  { key: 'dept',      label: '🏢 หน่วยงาน'      },
  { key: 'examsets',  label: '📦 ชุดข้อสอบ'     },
  { key: 'trend',     label: '📈 แนวโน้ม'       },
  { key: 'dist',      label: '🎯 กระจายคะแนน'  },
  { key: 'alerts',    label: '🚨 แจ้งเตือน'     },
];

// ── KPI Card ──────────────────────────────────────────────────
function KPI({ val, label, color, icon, small }) {
  return (
    <div className="rounded-2xl p-3 sm:p-4 text-center"
      style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
      <div className={small ? 'text-lg mb-0.5' : 'text-xl sm:text-2xl mb-0.5'}>{icon}</div>
      <div className={small ? 'text-lg font-black' : 'text-xl sm:text-2xl font-black'} style={{ color }}>
        <AnimatedNumber value={val} />
      </div>
      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}

// ── Stacked pass/fail bar ─────────────────────────────────────
function PassFailBar({ name, passCount, failCount, total }) {
  const passPct = total > 0 ? Math.round((passCount / total) * 100) : 0;
  return (
    <div className="mb-2.5">
      <div className="flex justify-between text-xs mb-1">
        <span className="truncate" style={{ color: 'var(--text)', maxWidth: 160 }}>{name}</span>
        <span style={{ color: 'var(--text-muted)', flexShrink: 0, marginLeft: 4 }}>{total} ครั้ง</span>
      </div>
      <div className="flex gap-0.5 rounded-full overflow-hidden h-2.5">
        <div style={{ width: `${passPct}%`,       background: '#22c55e', transition: 'width .7s ease' }} />
        <div style={{ width: `${100 - passPct}%`, background: '#ef4444', transition: 'width .7s ease' }} />
      </div>
      <div className="flex justify-between text-xs mt-0.5">
        <span style={{ color: '#16a34a' }}>✅ {passPct}%</span>
        <span style={{ color: '#ef4444' }}>❌ {100 - passPct}%</span>
      </div>
    </div>
  );
}

// ── Top Scorer row ─────────────────────────────────────────────
function ScorerRow({ rank, name, avgScore, examCount, passCount }) {
  const pct   = examCount > 0 ? Math.round((passCount / examCount) * 100) : 0;
  const color = avgScore >= 80 ? '#16a34a' : avgScore >= 60 ? '#f59e0b' : '#ef4444';
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="flex items-center gap-3 py-2"
      style={{ borderBottom: '1px solid var(--input-border)' }}>
      <div className="text-base w-6 text-center flex-shrink-0">
        {rank <= 3 ? medals[rank - 1] : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>#{rank}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{name}</div>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{examCount} ครั้ง • ผ่าน {pct}%</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-lg font-black" style={{ color }}>{avgScore}%</div>
      </div>
    </div>
  );
}

// ── Alert Card ─────────────────────────────────────────────────
function AlertCard({ icon, title, value, sub, color, urgent }) {
  return (
    <div className="rounded-2xl p-4 flex items-center gap-3"
      style={{
        background: urgent ? `${color}12` : 'var(--card)',
        border: `1.5px solid ${urgent ? color : 'var(--card-border)'}`,
      }}>
      <div className="text-3xl">{icon}</div>
      <div className="flex-1">
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{title}</div>
        <div className="text-2xl font-black" style={{ color: urgent ? color : 'var(--text)' }}>
          {value}
        </div>
        {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Flag Row ───────────────────────────────────────────────────
function FlagRow({ questionText, displayName, reason, createdAt, status }) {
  const statusColor = status === 'pending' ? '#f59e0b' : status === 'resolved' ? '#22c55e' : '#94a3b8';
  const reasonMap = {
    wrong_answer: 'คำตอบผิด', unclear: 'ไม่ชัดเจน',
    typo: 'ผิดพิมพ์', other: 'อื่นๆ',
  };
  return (
    <div className="py-2.5" style={{ borderBottom: '1px solid var(--input-border)' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>{questionText || '—'}</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            👤 {displayName} · {reasonMap[reason] || reason}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{createdAt}</div>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: `${statusColor}22`, color: statusColor }}>
          {status === 'pending' ? '⏳ รอดำเนินการ' : status === 'resolved' ? '✅ แก้ไขแล้ว' : '🚫 ปิด'}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Main StatsCharts Component
// ─────────────────────────────────────────────────────────────
export default function StatsCharts({ stats, loading, onRefresh }) {
  const [sub, setSub] = useState('overview');

  if (loading) return <Spinner label="กำลังโหลดสถิติ..." />;
  if (!stats) return (
    <div className="text-center py-8">
      <div className="text-4xl mb-3">📊</div>
      <div style={{ color: 'var(--text-muted)' }}>ยังไม่มีข้อมูล</div>
      <button className="btn btn-primary mt-4 rounded-xl px-6 py-2" onClick={onRefresh}>โหลดสถิติ</button>
    </div>
  );

  const {
    totalMembers   = 0, activeMembers  = 0,
    pendingMembers = 0, inactiveMembers = 0,
    totalQuestions = 0, totalExams     = 0, avgPassRate = 0,
    passFail       = {},
    subjectStats   = [], questionsBySubject = [],
    scoreDistribution = [], dailyTrend = [], memberTrend = [],
    topScorers     = [],
    deptStats      = [], courseStats  = [], examSetStats = [],
    flagCount      = {}, recentFlags  = [],
  } = stats;

  // ── Chart data prep ───────────────────────────────────
  const memberDonutData = [
    { label: 'ใช้งาน',    value: activeMembers,   color: '#22c55e' },
    { label: 'รออนุมัติ', value: pendingMembers,   color: '#f59e0b' },
    { label: 'ระงับ',     value: inactiveMembers,  color: '#ef4444' },
  ].filter(d => d.value > 0);

  const passFailDonut = [
    { label: 'ผ่าน',    value: passFail.pass || 0, color: '#22c55e' },
    { label: 'ไม่ผ่าน', value: passFail.fail || 0, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const radarAxes = subjectStats.slice(0, 6).map(s => ({
    label: s.name.slice(0, 8), value: s.passRate, max: 100,
  }));

  const lineLabels     = dailyTrend.map(d => d.date);
  const lineExamSeries = [
    { label: 'จำนวนสอบ', color: '#4f46e5', data: dailyTrend.map(d => d.examCount) },
    { label: 'ผ่าน',     color: '#22c55e', data: dailyTrend.map(d => d.passCount)  },
  ];
  const lineMbrSeries  = [
    { label: 'สมาชิกใหม่', color: '#06b6d4', data: memberTrend.map(d => d.newMembers) },
  ];

  // Last 7 days for 3D bar
  const last7 = dailyTrend.slice(-7);

  // Dept clustered series (top 8 depts)
  const top8Depts = deptStats.slice(0, 8);
  const deptClusterSeries = [
    { label: 'ผ่าน',    color: '#22c55e', data: top8Depts.map(d => d.passCount) },
    { label: 'ไม่ผ่าน', color: '#ef4444', data: top8Depts.map(d => d.failCount) },
  ];
  const deptCategories = top8Depts.map(d =>
    d.name.length > 10 ? d.name.slice(0, 10) + '…' : d.name
  );

  const pendingAlert = (pendingMembers > 0) || (flagCount.pending > 0);

  return (
    <div className="animate-fade space-y-3">

      {/* ── Sub-tab bar ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {STAT_TABS.map(t => {
          const isBadge = t.key === 'alerts' && pendingAlert;
          return (
            <button key={t.key}
              onClick={() => setSub(t.key)}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all relative"
              style={{
                background: sub === t.key ? 'var(--accent)' : 'var(--card)',
                color:      sub === t.key ? 'white' : 'var(--text-muted)',
                border:     `1.5px solid ${sub === t.key ? 'var(--accent)' : 'var(--card-border)'}`,
              }}>
              {t.label}
              {isBadge && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  background: '#ef4444', color: 'white',
                  borderRadius: '50%', width: 14, height: 14,
                  fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700,
                }}>!</span>
              )}
            </button>
          );
        })}
        <button onClick={onRefresh}
          className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs btn btn-gray ml-auto">
          🔄
        </button>
      </div>

      {/* ════════════════════════════════════════════════════
          TAB: ภาพรวม
      ════════════════════════════════════════════════════ */}
      {sub === 'overview' && (
        <div className="space-y-3 animate-fade">

          {/* KPI Row 1 */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <KPI val={totalMembers}      label="สมาชิกทั้งหมด"  color="var(--accent)" icon="👥" />
            <KPI val={totalExams}        label="ครั้งสอบรวม"    color="#3b82f6"       icon="📝" />
            <KPI val={totalQuestions}    label="ข้อสอบทั้งหมด"  color="#8b5cf6"       icon="🗂" />
          </div>
          {/* KPI Row 2 */}
          <div className="grid grid-cols-4 gap-2">
            <KPI val={activeMembers}     label="ใช้งาน"    color="#16a34a" icon="✅" small />
            <KPI val={pendingMembers}    label="รออนุมัติ" color="#f59e0b" icon="⏳" small />
            <KPI val={inactiveMembers}   label="ระงับ"     color="#94a3b8" icon="🔒" small />
            <KPI val={`${avgPassRate}%`} label="อัตราผ่าน" color={avgPassRate >= 60 ? '#16a34a' : '#ef4444'} icon="🎯" small />
          </div>

          {/* 3D Bar: 7 วันล่าสุด */}
          {last7.some(d => d.examCount > 0) && (
            <ChartCard title="📊 7 วันล่าสุด (3D)" subtitle="จำนวนครั้งสอบรายวัน">
              <Bar3DChart
                items={last7.map(d => ({ label: d.date, value: d.examCount }))}
                height={140}
                colorFn={(item, i) => PALETTE[i % PALETTE.length]}
              />
            </ChartCard>
          )}

          {/* Donut row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ChartCard title="👥 สถานะสมาชิก" subtitle={`${totalMembers} คนทั้งหมด`}>
              <DonutChart data={memberDonutData} size={170}
                centerLabel={String(totalMembers)} centerSub="สมาชิก" />
            </ChartCard>
            <ChartCard title="🎯 ผ่าน / ไม่ผ่าน" subtitle={`${totalExams} ครั้งทั้งหมด`}>
              <DonutChart data={passFailDonut} size={170}
                centerLabel={`${avgPassRate}%`} centerSub="อัตราผ่าน" />
            </ChartCard>
          </div>

          {/* Radar: pass rate per subject */}
          {radarAxes.length >= 3 && (
            <ChartCard title="🕸 อัตราผ่านตามวิชา" subtitle="เปอร์เซ็นต์ผ่านต่อวิชา">
              <RadarChart axes={radarAxes} max={100} color="var(--accent)" size={220} />
              <Legend items={radarAxes.map((a, i) => ({
                color: PALETTE[i % PALETTE.length], label: a.label, value: `${a.value}%`,
              }))} />
            </ChartCard>
          )}

          {/* Top Scorers */}
          {topScorers.length > 0 && (
            <ChartCard title="🏆 Top 10 คะแนนสูงสุด" subtitle="เฉลี่ยจากทุกครั้งที่สอบ">
              {topScorers.map((s, i) => <ScorerRow key={i} rank={i + 1} {...s} />)}
            </ChartCard>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          TAB: วิชา
      ════════════════════════════════════════════════════ */}
      {sub === 'subject' && (
        <div className="space-y-3 animate-fade">
          <ChartCard title="📊 จำนวนครั้งสอบต่อวิชา" subtitle="เรียงจากมากไปน้อย">
            {subjectStats.length
              ? <HBarChart items={subjectStats.map(s => ({ label: s.name, value: s.count }))}
                  colorFn={(_, i) => PALETTE[i % PALETTE.length]} valueSuffix=" ครั้ง" />
              : <Empty />}
          </ChartCard>

          <ChartCard title="✅ ผ่าน vs ❌ ไม่ผ่าน ตามวิชา" subtitle="สัดส่วนในแต่ละวิชา">
            {subjectStats.length ? (
              <>
                <Legend items={[{ color: '#22c55e', label: 'ผ่าน' }, { color: '#ef4444', label: 'ไม่ผ่าน' }]} />
                <div className="mt-3 space-y-1">
                  {subjectStats.map((s, i) =>
                    <PassFailBar key={i} name={s.name} passCount={s.passCount} failCount={s.failCount} total={s.count} />
                  )}
                </div>
              </>
            ) : <Empty />}
          </ChartCard>

          <ChartCard title="🎯 คะแนนเฉลี่ยต่อวิชา (%)" subtitle="เฉลี่ยทุกครั้งที่สอบ">
            {subjectStats.length
              ? <HBarChart items={subjectStats.map(s => ({ label: s.name, value: s.avgScore }))}
                  maxValue={100}
                  colorFn={item => item.value >= 80 ? '#16a34a' : item.value >= 60 ? '#f59e0b' : '#ef4444'}
                  valueSuffix="%" />
              : <Empty />}
          </ChartCard>

          <ChartCard title="📚 จำนวนข้อสอบต่อวิชา" subtitle="ข้อสอบในระบบ">
            {questionsBySubject.length
              ? <HBarChart items={questionsBySubject.map(s => ({ label: s.name, value: s.count }))}
                  colorFn={(_, i) => PALETTE[(i + 2) % PALETTE.length]} valueSuffix=" ข้อ" />
              : <Empty />}
          </ChartCard>

          {subjectStats.some(s => s.avgTimeSec > 0) && (
            <ChartCard title="⏱ เวลาเฉลี่ยต่อวิชา" subtitle="นาที">
              <HBarChart
                items={subjectStats.map(s => ({
                  label: s.name,
                  value: Math.round(s.avgTimeSec / 60 * 10) / 10,
                }))}
                colorFn={(_, i) => PALETTE[(i + 4) % PALETTE.length]}
                valueSuffix=" น."
              />
            </ChartCard>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          TAB: หลักสูตร
      ════════════════════════════════════════════════════ */}
      {sub === 'course' && (
        <div className="space-y-3 animate-fade">
          {courseStats.length === 0 ? (
            <ChartCard title="🎓 ผลสอบรายหลักสูตร" subtitle="ยังไม่มีข้อมูลการสอบ">
              <Empty />
            </ChartCard>
          ) : (
            <>
              {/* KPI mini row */}
              <div className="grid grid-cols-3 gap-2">
                <KPI val={courseStats.length}
                  label="หลักสูตรทั้งหมด" color="var(--accent)" icon="🎓" small />
                <KPI val={`${Math.max(...courseStats.map(c => c.passRate))}%`}
                  label="ผ่านสูงสุด" color="#16a34a" icon="🏅" small />
                <KPI val={`${Math.round(courseStats.reduce((s, c) => s + c.passRate, 0) / courseStats.length)}%`}
                  label="ผ่านเฉลี่ย" color={
                    Math.round(courseStats.reduce((s,c)=>s+c.passRate,0)/courseStats.length) >= 60
                      ? '#16a34a' : '#ef4444'
                  } icon="🎯" small />
              </div>

              {/* Course Summary Cards */}
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                {courseStats.map((c, i) => {
                  const passColor = c.passRate >= 75 ? '#16a34a' : c.passRate >= 50 ? '#f59e0b' : '#ef4444';
                  const bg        = c.passRate >= 75 ? '#f0fdf4' : c.passRate >= 50 ? '#fffbeb' : '#fef2f2';
                  const border    = c.passRate >= 75 ? '#86efac' : c.passRate >= 50 ? '#fcd34d' : '#fca5a5';
                  return (
                    <div key={i} className="rounded-2xl p-3 text-center"
                      style={{ background: bg, border: `2px solid ${border}` }}>
                      <div className="text-lg mb-1">🎓</div>
                      <div className="font-bold text-sm truncate mb-1" style={{ color: 'var(--text)' }}>{c.name}</div>
                      <div className="text-2xl font-black" style={{ color: passColor }}>{c.passRate}%</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>อัตราผ่าน</div>
                      <div className="mt-2 pt-2 grid grid-cols-2 gap-1" style={{ borderTop: '1px solid var(--input-border)' }}>
                        <div>
                          <div className="text-xs font-bold" style={{ color: '#3b82f6' }}>{c.attempts}</div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)', fontSize: 9 }}>ครั้งสอบ</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold" style={{ color: '#8b5cf6' }}>{c.memberCount}</div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)', fontSize: 9 }}>สมาชิก</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Clustered: ผ่าน/ไม่ผ่าน per course */}
              <ChartCard title="📊 ผ่าน / ไม่ผ่าน แยกหลักสูตร (Clustered)"
                subtitle="เปรียบเทียบจำนวนผ่าน-ไม่ผ่านต่อหลักสูตร">
                <ClusteredBarChart
                  series={[
                    { label: 'ผ่าน',    color: '#22c55e', data: courseStats.map(c => c.passCount) },
                    { label: 'ไม่ผ่าน', color: '#ef4444', data: courseStats.map(c => c.failCount) },
                  ]}
                  categories={courseStats.map(c => c.name.length > 10 ? c.name.slice(0, 10) + '…' : c.name)}
                  height={160}
                />
              </ChartCard>

              {/* Donut: สัดส่วนครั้งสอบต่อหลักสูตร */}
              <ChartCard title="🍩 สัดส่วนการสอบต่อหลักสูตร"
                subtitle={`รวม ${courseStats.reduce((s,c)=>s+c.attempts,0)} ครั้ง`}>
                <DonutChart
                  data={courseStats.map((c, i) => ({ label: c.name, value: c.attempts, color: PALETTE[i % PALETTE.length] }))}
                  size={180}
                  centerLabel={String(courseStats.reduce((s,c)=>s+c.attempts,0))}
                  centerSub="ครั้งรวม"
                />
                <Legend items={courseStats.map((c, i) => ({ color: PALETTE[i % PALETTE.length], label: c.name, value: `${c.attempts} ครั้ง` }))} />
              </ChartCard>

              {/* อัตราผ่านต่อหลักสูตร */}
              <ChartCard title="🎯 อัตราผ่านต่อหลักสูตร (%)" subtitle="เปอร์เซ็นต์ผ่านในแต่ละหลักสูตร">
                <HBarChart
                  items={courseStats.map(c => ({ label: c.name, value: c.passRate }))}
                  maxValue={100}
                  colorFn={item => item.value >= 75 ? '#16a34a' : item.value >= 50 ? '#f59e0b' : '#ef4444'}
                  valueSuffix="%"
                />
              </ChartCard>

              {/* คะแนนเฉลี่ยต่อหลักสูตร */}
              <ChartCard title="📉 คะแนนเฉลี่ยต่อหลักสูตร (%)" subtitle="ค่าเฉลี่ยคะแนนทุกครั้งสอบ">
                <HBarChart
                  items={courseStats.map(c => ({ label: c.name, value: c.avgScore }))}
                  maxValue={100}
                  colorFn={item => item.value >= 80 ? '#16a34a' : item.value >= 60 ? '#f59e0b' : '#ef4444'}
                  valueSuffix="%"
                />
              </ChartCard>

              {/* Stacked pass/fail per course */}
              <ChartCard title="✅ ผ่าน/ไม่ผ่าน Stacked ต่อหลักสูตร">
                <Legend items={[{ color: '#22c55e', label: 'ผ่าน' }, { color: '#ef4444', label: 'ไม่ผ่าน' }]} />
                <div className="mt-3 space-y-1">
                  {courseStats.map((c, i) =>
                    <PassFailBar key={i} name={c.name} passCount={c.passCount} failCount={c.failCount} total={c.attempts} />
                  )}
                </div>
              </ChartCard>

              {/* จำนวนสมาชิกต่อหลักสูตร */}
              <ChartCard title="👥 จำนวนสมาชิกต่อหลักสูตร" subtitle="ผู้ใช้ที่ลงทะเบียนในแต่ละหลักสูตร">
                <HBarChart
                  items={[...courseStats].sort((a,b)=>b.memberCount-a.memberCount)
                    .map(c => ({ label: c.name, value: c.memberCount }))}
                  colorFn={(_, i) => PALETTE[(i + 2) % PALETTE.length]}
                  valueSuffix=" คน"
                />
              </ChartCard>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          TAB: หน่วยงาน
      ════════════════════════════════════════════════════ */}
      {sub === 'dept' && (
        <div className="space-y-3 animate-fade">
          {deptStats.length === 0 ? (
            <ChartCard title="🏢 ผลสอบรายหน่วยงาน" subtitle="ยังไม่มีข้อมูล">
              <Empty />
            </ChartCard>
          ) : (
            <>
              {/* KPI mini row */}
              <div className="grid grid-cols-3 gap-2">
                <KPI val={deptStats.length}              label="หน่วยงานทั้งหมด" color="var(--accent)" icon="🏢" small />
                <KPI val={Math.max(...deptStats.map(d => d.attempts))} label="สูงสุด (ครั้ง)" color="#3b82f6" icon="🏅" small />
                <KPI val={`${Math.round(deptStats.reduce((s,d) => s + d.passRate, 0) / deptStats.length)}%`}
                  label="ผ่านเฉลี่ย" color="#16a34a" icon="🎯" small />
              </div>

              {/* Clustered: ผ่าน/ไม่ผ่าน per dept */}
              <ChartCard title="📊 ผ่าน / ไม่ผ่าน แยกหน่วยงาน (Clustered)"
                subtitle="เปรียบเทียบจำนวนผ่าน-ไม่ผ่านต่อหน่วยงาน">
                <ClusteredBarChart
                  series={deptClusterSeries}
                  categories={deptCategories}
                  height={160}
                />
              </ChartCard>

              {/* Attempts per dept */}
              <ChartCard title="📈 จำนวนครั้งสอบต่อหน่วยงาน" subtitle="เรียงจากมากไปน้อย">
                <HBarChart
                  items={deptStats.map(d => ({ label: d.name, value: d.attempts }))}
                  colorFn={(_, i) => PALETTE[i % PALETTE.length]}
                  valueSuffix=" ครั้ง"
                />
              </ChartCard>

              {/* Pass rate per dept */}
              <ChartCard title="🎯 อัตราผ่านต่อหน่วยงาน (%)" subtitle="สัดส่วนผู้ผ่านต่อหน่วยงาน">
                <HBarChart
                  items={deptStats.map(d => ({ label: d.name, value: d.passRate }))}
                  maxValue={100}
                  colorFn={item => item.value >= 75 ? '#16a34a' : item.value >= 50 ? '#f59e0b' : '#ef4444'}
                  valueSuffix="%"
                />
              </ChartCard>

              {/* Avg score per dept */}
              <ChartCard title="📉 คะแนนเฉลี่ยต่อหน่วยงาน (%)" subtitle="ค่าเฉลี่ยคะแนนทุกครั้งสอบ">
                <HBarChart
                  items={deptStats.map(d => ({ label: d.name, value: d.avgScore }))}
                  maxValue={100}
                  colorFn={item => item.value >= 80 ? '#16a34a' : item.value >= 60 ? '#f59e0b' : '#ef4444'}
                  valueSuffix="%"
                />
              </ChartCard>

              {/* Pass/Fail stacked per dept */}
              <ChartCard title="✅ ผ่าน/ไม่ผ่าน Stacked ต่อหน่วยงาน">
                <Legend items={[{ color: '#22c55e', label: 'ผ่าน' }, { color: '#ef4444', label: 'ไม่ผ่าน' }]} />
                <div className="mt-3 space-y-1">
                  {deptStats.map((d, i) =>
                    <PassFailBar key={i} name={d.name} passCount={d.passCount} failCount={d.failCount} total={d.attempts} />
                  )}
                </div>
              </ChartCard>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          TAB: ชุดข้อสอบ
      ════════════════════════════════════════════════════ */}
      {sub === 'examsets' && (
        <div className="space-y-3 animate-fade">
          {examSetStats.length === 0 ? (
            <ChartCard title="📦 สถิติชุดข้อสอบ" subtitle="ยังไม่มีข้อมูลการสอบผ่านชุดข้อสอบ">
              <Empty />
            </ChartCard>
          ) : (
            <>
              {/* 3D Bar: attempts per examset */}
              <ChartCard title="📦 จำนวนครั้งสอบต่อชุดข้อสอบ (3D)" subtitle="เรียงจากมากไปน้อย">
                <Bar3DChart
                  items={examSetStats.map(e => ({ label: e.name, value: e.attempts }))}
                  height={160}
                  colorFn={(_, i) => PALETTE[(i + 3) % PALETTE.length]}
                />
              </ChartCard>

              {/* Pass rate per examset */}
              <ChartCard title="🎯 อัตราผ่านต่อชุดข้อสอบ (%)" subtitle="เปอร์เซ็นต์ผ่านในแต่ละชุด">
                <HBarChart
                  items={examSetStats.map(e => ({ label: e.name, value: e.passRate }))}
                  maxValue={100}
                  colorFn={item => item.value >= 75 ? '#16a34a' : item.value >= 50 ? '#f59e0b' : '#ef4444'}
                  valueSuffix="%"
                />
              </ChartCard>

              {/* Avg score per examset */}
              <ChartCard title="📉 คะแนนเฉลี่ยต่อชุดข้อสอบ (%)" subtitle="เฉลี่ยคะแนนทุกครั้ง">
                <HBarChart
                  items={examSetStats.map(e => ({ label: e.name, value: e.avgScore }))}
                  maxValue={100}
                  colorFn={item => item.value >= 80 ? '#16a34a' : item.value >= 60 ? '#f59e0b' : '#ef4444'}
                  valueSuffix="%"
                />
              </ChartCard>

              {/* Clustered: pass/fail per examset */}
              <ChartCard title="📊 ผ่าน/ไม่ผ่าน Clustered ต่อชุดข้อสอบ">
                <ClusteredBarChart
                  series={[
                    { label: 'ผ่าน',    color: '#22c55e', data: examSetStats.map(e => e.passCount) },
                    { label: 'ไม่ผ่าน', color: '#ef4444', data: examSetStats.map(e => e.failCount) },
                  ]}
                  categories={examSetStats.map(e => e.name.slice(0, 12))}
                  height={160}
                />
              </ChartCard>

              {/* Stacked bars */}
              <ChartCard title="✅ Stacked ผ่าน/ไม่ผ่าน">
                <Legend items={[{ color: '#22c55e', label: 'ผ่าน' }, { color: '#ef4444', label: 'ไม่ผ่าน' }]} />
                <div className="mt-3 space-y-1">
                  {examSetStats.map((e, i) =>
                    <PassFailBar key={i} name={e.name} passCount={e.passCount} failCount={e.failCount} total={e.attempts} />
                  )}
                </div>
              </ChartCard>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          TAB: แนวโน้ม
      ════════════════════════════════════════════════════ */}
      {sub === 'trend' && (
        <div className="space-y-3 animate-fade">
          <ChartCard title="📈 จำนวนสอบต่อวัน (14 วัน)" subtitle="ครั้งสอบและผ่านต่อวัน">
            {lineLabels.length
              ? <LineChart series={lineExamSeries} labels={lineLabels} height={170} showArea />
              : <Empty />}
          </ChartCard>

          <ChartCard title="📊 3D Bar — การสอบต่อวัน (7 วัน)" subtitle="จำนวนครั้ง">
            {last7.some(d => d.examCount > 0)
              ? <Bar3DChart
                  items={last7.map(d => ({ label: d.date, value: d.examCount }))}
                  height={140}
                  colorFn={(_, i) => PALETTE[i % PALETTE.length]}
                />
              : <Empty text="ยังไม่มีข้อมูล 7 วันล่าสุด" />}
          </ChartCard>

          <ChartCard title="📊 Bar — การสอบต่อวัน (14 วัน)" subtitle="จำนวนครั้ง">
            {dailyTrend.some(d => d.examCount > 0)
              ? <VBarChart items={dailyTrend.map(d => ({ label: d.date, value: d.examCount }))}
                  height={130} colorFn={() => 'var(--accent)'} />
              : <Empty />}
          </ChartCard>

          <ChartCard title="👥 สมาชิกใหม่ต่อวัน (14 วัน)" subtitle="การสมัครสมาชิกรายวัน">
            {lineLabels.length
              ? <LineChart series={lineMbrSeries} labels={memberTrend.map(d => d.date)}
                  height={140} showArea showDots />
              : <Empty />}
          </ChartCard>

          {dailyTrend.some(d => d.examCount > 0) && (() => {
            const cumSeries = [{
              label: 'อัตราผ่านรายวัน (%)', color: '#16a34a',
              data: dailyTrend.map(d =>
                d.examCount > 0 ? Math.round((d.passCount / d.examCount) * 100) : 0
              ),
            }];
            return (
              <ChartCard title="🎯 อัตราผ่านรายวัน (%)" subtitle="เปอร์เซ็นต์ผ่านแต่ละวัน">
                <LineChart series={cumSeries} labels={lineLabels} height={140} yMax={100} showArea />
              </ChartCard>
            );
          })()}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          TAB: กระจายคะแนน
      ════════════════════════════════════════════════════ */}
      {sub === 'dist' && (
        <div className="space-y-3 animate-fade">
          <ChartCard title="🎯 การกระจายคะแนน" subtitle={`คะแนน ${totalExams} ครั้ง (ช่วง 10%)`}>
            {scoreDistribution.some(b => b.count > 0) ? (
              <>
                <VBarChart
                  items={scoreDistribution.map(b => ({
                    label: b.label + '%', value: b.count,
                    color: b.pass ? '#22c55e' : '#ef4444',
                  }))}
                  height={170} showValues
                  highlightFn={item => item.color === '#22c55e'}
                />
                <div className="flex gap-4 mt-3 justify-center">
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <div className="w-3 h-3 rounded-sm" style={{ background: '#22c55e' }} /> ผ่าน (≥60%)
                  </div>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <div className="w-3 h-3 rounded-sm" style={{ background: '#ef4444' }} /> ไม่ผ่าน
                  </div>
                </div>
              </>
            ) : <Empty text="ยังไม่มีข้อมูลผลสอบ" />}
          </ChartCard>

          {scoreDistribution.some(b => b.count > 0) && (
            <ChartCard title="📊 ตารางกระจายคะแนน (3D)" subtitle="จำนวนผู้สอบแต่ละช่วงคะแนน">
              <Bar3DChart
                items={scoreDistribution.map(b => ({
                  label: b.label + '%', value: b.count,
                  color: b.pass ? '#22c55e' : '#ef4444',
                }))}
                height={160}
                colorFn={item => item.color}
              />
            </ChartCard>
          )}

          {passFailDonut.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ChartCard title="🍩 Pass/Fail Donut">
                <DonutChart data={passFailDonut} size={160}
                  centerLabel={`${avgPassRate}%`} centerSub="ผ่าน" />
              </ChartCard>
              <ChartCard title="📊 ช่วงคะแนน 4 ระดับ">
                <DonutChart
                  data={(() => {
                    const bands = [
                      { label: '0–39%',   value: 0, color: '#ef4444' },
                      { label: '40–59%',  value: 0, color: '#f59e0b' },
                      { label: '60–79%',  value: 0, color: '#3b82f6' },
                      { label: '80–100%', value: 0, color: '#22c55e' },
                    ];
                    scoreDistribution.forEach((b, i) => {
                      const idx = i < 4 ? 0 : i < 6 ? 1 : i < 8 ? 2 : 3;
                      bands[idx].value += b.count;
                    });
                    return bands.filter(b => b.value > 0);
                  })()}
                  size={160} centerLabel={String(totalExams)} centerSub="ครั้ง"
                />
              </ChartCard>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          TAB: แจ้งเตือน
      ════════════════════════════════════════════════════ */}
      {sub === 'alerts' && (
        <div className="space-y-3 animate-fade">

          {/* Alert cards row */}
          <div className="grid grid-cols-2 gap-3">
            <AlertCard
              icon="⏳"
              title="สมาชิกรออนุมัติ"
              value={pendingMembers}
              sub={pendingMembers > 0 ? 'กรุณาอนุมัติในแท็บ สมาชิก' : 'ไม่มีรายการรอ'}
              color="#f59e0b"
              urgent={pendingMembers > 0}
            />
            <AlertCard
              icon="🚩"
              title="รายงานข้อสอบค้าง"
              value={flagCount.pending || 0}
              sub={flagCount.pending > 0 ? `รวม ${flagCount.total} รายการ` : 'ไม่มีรายการค้าง'}
              color="#ef4444"
              urgent={(flagCount.pending || 0) > 0}
            />
          </div>

          {/* Flag summary */}
          <div className="grid grid-cols-3 gap-2">
            <KPI val={flagCount.total || 0}     label="รายงานทั้งหมด" color="var(--text)"    icon="📋" small />
            <KPI val={flagCount.resolved || 0}  label="แก้ไขแล้ว"    color="#22c55e"         icon="✅" small />
            <KPI val={flagCount.dismissed || 0} label="ปิดแล้ว"       color="#94a3b8"         icon="🚫" small />
          </div>

          {/* Flag donut */}
          {(flagCount.total || 0) > 0 && (
            <ChartCard title="🚩 สถานะรายงานข้อสอบ" subtitle={`${flagCount.total} รายการทั้งหมด`}>
              <DonutChart
                data={[
                  { label: 'รอดำเนินการ', value: flagCount.pending   || 0, color: '#f59e0b' },
                  { label: 'แก้ไขแล้ว',  value: flagCount.resolved  || 0, color: '#22c55e' },
                  { label: 'ปิดแล้ว',    value: flagCount.dismissed || 0, color: '#94a3b8' },
                ].filter(d => d.value > 0)}
                size={160}
                centerLabel={String(flagCount.total)}
                centerSub="รายการ"
              />
            </ChartCard>
          )}

          {/* Recent flags */}
          {recentFlags.length > 0 && (
            <ChartCard title="🕐 รายงานล่าสุด" subtitle="5 รายการล่าสุด">
              {recentFlags.map((f, i) => <FlagRow key={i} {...f} />)}
              <div className="text-xs mt-3 text-center" style={{ color: 'var(--text-muted)' }}>
                จัดการรายงานทั้งหมดได้ที่แท็บ 🚩 Flags
              </div>
            </ChartCard>
          )}

          {/* All clear */}
          {!pendingAlert && (flagCount.total || 0) === 0 && (
            <div className="text-center py-8 rounded-2xl"
              style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
              <div className="text-5xl mb-3">✅</div>
              <div className="font-bold" style={{ color: '#16a34a' }}>ทุกอย่างเรียบร้อย!</div>
              <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                ไม่มีรายการที่ต้องดำเนินการ
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helper: Empty state ────────────────────────────────────────
function Empty({ text = 'ยังไม่มีข้อมูล' }) {
  return (
    <div className="text-center py-4 text-xs" style={{ color: 'var(--text-muted)' }}>
      {text}
    </div>
  );
}
