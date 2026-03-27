// ─────────────────────────────────────────────────────────────
//  StatsCharts — Dashboard สถิติแบบครบทุกรูปแบบ
// ─────────────────────────────────────────────────────────────
import { useState } from 'react';
import { PALETTE, AnimatedNumber, ChartCard, Legend } from './ChartBase';
import DonutChart from './DonutChart';
import HBarChart  from './HBarChart';
import VBarChart  from './VBarChart';
import LineChart  from './LineChart';
import RadarChart from './RadarChart';
import Spinner    from '../Spinner';

const STAT_TABS = [
  { key: 'overview',  label: '📊 ภาพรวม' },
  { key: 'subject',   label: '📚 วิชา' },
  { key: 'trend',     label: '📈 แนวโน้ม' },
  { key: 'dist',      label: '🎯 กระจายคะแนน' },
];

// ── KPI Card ──────────────────────────────────────────────────
function KPI({ val, label, color, icon }) {
  return (
    <div className="rounded-2xl p-3 sm:p-4 text-center"
      style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
      <div className="text-xl sm:text-2xl mb-0.5">{icon}</div>
      <div className="text-xl sm:text-2xl font-black" style={{ color }}>
        <AnimatedNumber value={val} />
      </div>
      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}

// ── Stacked H-bar (pass+fail ต่อ 1 row) ──────────────────────
function PassFailBar({ name, passCount, failCount, total }) {
  const passPct = total > 0 ? Math.round((passCount / total) * 100) : 0;
  const failPct = 100 - passPct;
  return (
    <div className="mb-2.5">
      <div className="flex justify-between text-xs mb-1">
        <span className="truncate" style={{ color: 'var(--text)', maxWidth: 160 }}>{name}</span>
        <span style={{ color: 'var(--text-muted)', flexShrink: 0, marginLeft: 4 }}>
          {total} ครั้ง
        </span>
      </div>
      <div className="flex gap-0.5 rounded-full overflow-hidden h-2.5">
        <div style={{ width: `${passPct}%`, background: '#22c55e', transition: 'width .7s ease' }} />
        <div style={{ width: `${failPct}%`, background: '#ef4444', transition: 'width .7s ease' }} />
      </div>
      <div className="flex justify-between text-xs mt-0.5">
        <span style={{ color: '#16a34a' }}>✅ ผ่าน {passPct}%</span>
        <span style={{ color: '#ef4444' }}>❌ {failPct}%</span>
      </div>
    </div>
  );
}

// ── Top Scorer Row ────────────────────────────────────────────
function ScorerRow({ rank, name, avgScore, examCount, passCount }) {
  const pct = examCount > 0 ? Math.round((passCount / examCount) * 100) : 0;
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

// ─────────────────────────────────────────────────────────────
//  Main StatsCharts Component
// ─────────────────────────────────────────────────────────────
export default function StatsCharts({ stats, loading, onRefresh }) {
  const [sub, setSub] = useState('overview');

  if (loading) return <Spinner label="กำลังโหลดสถิติ..." />;
  if (!stats)  return (
    <div className="text-center py-8">
      <div className="text-4xl mb-3">📊</div>
      <div style={{ color: 'var(--text-muted)' }}>ยังไม่มีข้อมูล</div>
      <button className="btn btn-primary mt-4 rounded-xl px-6 py-2" onClick={onRefresh}>โหลดสถิติ</button>
    </div>
  );

  const { totalMembers, activeMembers, pendingMembers, inactiveMembers,
          totalQuestions, totalExams, avgPassRate,
          passFail = {}, subjectStats = [], questionsBySubject = [],
          scoreDistribution = [], dailyTrend = [], memberTrend = [],
          topScorers = [] } = stats;

  // ── Prepared chart data ──────────────────────────────────
  const memberDonutData = [
    { label: 'ใช้งาน',    value: activeMembers,  color: '#22c55e' },
    { label: 'รออนุมัติ', value: pendingMembers,  color: '#f59e0b' },
    { label: 'ระงับ',     value: inactiveMembers, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const passFailDonut = [
    { label: 'ผ่าน',    value: passFail.pass || 0, color: '#22c55e' },
    { label: 'ไม่ผ่าน', value: passFail.fail || 0, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const subjectColor = (_, i) => PALETTE[i % PALETTE.length];

  // Radar axes from subjectStats (top 6)
  const radarAxes = subjectStats.slice(0, 6).map(s => ({
    label: s.name.slice(0, 8),
    value: s.passRate,
    max:   100,
  }));

  // time series for line chart
  const lineLabels    = dailyTrend.map(d => d.date);
  const lineExamSeries = [{
    label: 'จำนวนสอบ', color: '#4f46e5',
    data:  dailyTrend.map(d => d.examCount),
  }, {
    label: 'ผ่าน', color: '#22c55e',
    data:  dailyTrend.map(d => d.passCount),
  }];
  const lineMbrSeries = [{
    label: 'สมาชิกใหม่', color: '#06b6d4',
    data:  memberTrend.map(d => d.newMembers),
  }];

  return (
    <div className="animate-fade space-y-3">

      {/* Sub-tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {STAT_TABS.map(t => (
          <button key={t.key}
            onClick={() => setSub(t.key)}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: sub === t.key ? 'var(--accent)' : 'var(--card)',
              color:      sub === t.key ? 'white' : 'var(--text-muted)',
              border:     `1.5px solid ${sub === t.key ? 'var(--accent)' : 'var(--card-border)'}`,
            }}>
            {t.label}
          </button>
        ))}
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

          {/* KPI Cards */}
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-3">
            <KPI val={totalMembers}   label="สมาชิกทั้งหมด" color="var(--accent)"  icon="👥" />
            <KPI val={totalExams}     label="ครั้งสอบรวม"   color="#3b82f6"        icon="📝" />
            <KPI val={totalQuestions} label="ข้อสอบทั้งหมด" color="#8b5cf6"        icon="🗂" />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <KPI val={activeMembers}  label="ใช้งาน"   color="#16a34a" icon="✅" />
            <KPI val={pendingMembers} label="รออนุมัติ" color="#f59e0b" icon="⏳" />
            <KPI val={`${avgPassRate}%`} label="อัตราผ่าน" color={avgPassRate >= 60 ? '#16a34a' : '#ef4444'} icon="🎯" />
          </div>

          {/* Donut Charts row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ChartCard title="👥 สถานะสมาชิก" subtitle={`${totalMembers} คนทั้งหมด`}>
              <DonutChart
                data={memberDonutData}
                size={170}
                centerLabel={String(totalMembers)}
                centerSub="สมาชิก"
              />
            </ChartCard>
            <ChartCard title="🎯 ผ่าน / ไม่ผ่าน" subtitle={`${totalExams} ครั้งทั้งหมด`}>
              <DonutChart
                data={passFailDonut}
                size={170}
                centerLabel={`${avgPassRate}%`}
                centerSub="อัตราผ่าน"
              />
            </ChartCard>
          </div>

          {/* Radar Chart — อัตราผ่านตามวิชา */}
          {radarAxes.length >= 3 && (
            <ChartCard title="🕸 อัตราผ่านตามวิชา (Radar)" subtitle="เปอร์เซ็นต์ผ่านต่อวิชา">
              <RadarChart axes={radarAxes} max={100} color="var(--accent)" size={220} />
              <Legend items={radarAxes.map((a, i) => ({
                color: PALETTE[i % PALETTE.length],
                label: a.label,
                value: `${a.value}%`,
              }))} />
            </ChartCard>
          )}

          {/* Top Scorers */}
          {topScorers.length > 0 && (
            <ChartCard title="🏆 Top 10 คะแนนสูงสุด" subtitle="เฉลี่ยจากทุกครั้งที่สอบ">
              <div>
                {topScorers.map((s, i) => (
                  <ScorerRow key={i} rank={i + 1} {...s} />
                ))}
              </div>
            </ChartCard>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          TAB: วิชา
      ════════════════════════════════════════════════════ */}
      {sub === 'subject' && (
        <div className="space-y-3 animate-fade">

          {/* จำนวนครั้งสอบต่อวิชา */}
          <ChartCard title="📊 จำนวนครั้งสอบต่อวิชา" subtitle="เรียงจากมากไปน้อย">
            {subjectStats.length ? (
              <HBarChart
                items={subjectStats.map(s => ({ label: s.name, value: s.count, extra: `ครั้ง` }))}
                colorFn={subjectColor}
                valueSuffix=" ครั้ง"
              />
            ) : <div className="text-center py-4 text-xs" style={{ color: 'var(--text-muted)' }}>ยังไม่มีข้อมูล</div>}
          </ChartCard>

          {/* ผ่าน/ไม่ผ่านตามวิชา (stacked bar) */}
          <ChartCard title="✅ ผ่าน vs ❌ ไม่ผ่าน ตามวิชา" subtitle="สัดส่วนในแต่ละวิชา">
            {subjectStats.length ? (
              <div className="space-y-1">
                <Legend items={[
                  { color: '#22c55e', label: 'ผ่าน' },
                  { color: '#ef4444', label: 'ไม่ผ่าน' },
                ]} />
                <div className="mt-3 space-y-1">
                  {subjectStats.map((s, i) => (
                    <PassFailBar key={i} name={s.name} passCount={s.passCount} failCount={s.failCount} total={s.count} />
                  ))}
                </div>
              </div>
            ) : <div className="text-center py-4 text-xs" style={{ color: 'var(--text-muted)' }}>ยังไม่มีข้อมูล</div>}
          </ChartCard>

          {/* คะแนนเฉลี่ยต่อวิชา */}
          <ChartCard title="🎯 คะแนนเฉลี่ยต่อวิชา (%)" subtitle="ค่าเฉลี่ยของคะแนนทุกครั้งสอบ">
            {subjectStats.length ? (
              <HBarChart
                items={subjectStats.map(s => ({ label: s.name, value: s.avgScore }))}
                maxValue={100}
                colorFn={(item) => item.value >= 80 ? '#16a34a' : item.value >= 60 ? '#f59e0b' : '#ef4444'}
                valueSuffix="%"
              />
            ) : <div className="text-center py-4 text-xs" style={{ color: 'var(--text-muted)' }}>ยังไม่มีข้อมูล</div>}
          </ChartCard>

          {/* จำนวนข้อสอบต่อวิชา */}
          <ChartCard title="📚 จำนวนข้อสอบต่อวิชา" subtitle="ข้อสอบที่มีในระบบ">
            {questionsBySubject.length ? (
              <HBarChart
                items={questionsBySubject.map(s => ({ label: s.name, value: s.count }))}
                colorFn={(_, i) => PALETTE[(i + 2) % PALETTE.length]}
                valueSuffix=" ข้อ"
              />
            ) : <div className="text-center py-4 text-xs" style={{ color: 'var(--text-muted)' }}>ยังไม่มีข้อมูล</div>}
          </ChartCard>

          {/* เวลาเฉลี่ยต่อวิชา */}
          {subjectStats.some(s => s.avgTimeSec > 0) && (
            <ChartCard title="⏱ เวลาเฉลี่ยต่อวิชา" subtitle="นาที:วินาที">
              <HBarChart
                items={subjectStats.map(s => ({
                  label: s.name,
                  value: Math.round(s.avgTimeSec / 60 * 10) / 10,
                  extra: `นาที`,
                }))}
                colorFn={(_, i) => PALETTE[(i + 4) % PALETTE.length]}
                valueSuffix=" น."
              />
            </ChartCard>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          TAB: แนวโน้ม
      ════════════════════════════════════════════════════ */}
      {sub === 'trend' && (
        <div className="space-y-3 animate-fade">

          {/* Line: การสอบต่อวัน */}
          <ChartCard title="📈 จำนวนสอบต่อวัน (14 วันล่าสุด)" subtitle="จำนวนครั้งสอบและผ่านต่อวัน">
            {lineLabels.length ? (
              <LineChart
                series={lineExamSeries}
                labels={lineLabels}
                height={170}
                showArea={true}
              />
            ) : <div className="text-center py-4 text-xs" style={{ color: 'var(--text-muted)' }}>ยังไม่มีข้อมูล</div>}
          </ChartCard>

          {/* VBar: exam count per day */}
          <ChartCard title="📊 Bar Chart — การสอบต่อวัน" subtitle="จำนวนครั้ง">
            {dailyTrend.some(d => d.examCount > 0) ? (
              <VBarChart
                items={dailyTrend.map(d => ({ label: d.date, value: d.examCount }))}
                height={130}
                colorFn={() => 'var(--accent)'}
              />
            ) : <div className="text-center py-4 text-xs" style={{ color: 'var(--text-muted)' }}>ยังไม่มีข้อมูล 14 วันล่าสุด</div>}
          </ChartCard>

          {/* Line: สมาชิกใหม่ */}
          <ChartCard title="👥 สมาชิกใหม่ต่อวัน (14 วันล่าสุด)" subtitle="จำนวนการสมัครสมาชิกรายวัน">
            {lineLabels.length ? (
              <LineChart
                series={lineMbrSeries}
                labels={memberTrend.map(d => d.date)}
                height={140}
                showArea={true}
                showDots={true}
              />
            ) : <div className="text-center py-4 text-xs" style={{ color: 'var(--text-muted)' }}>ยังไม่มีข้อมูล</div>}
          </ChartCard>

          {/* Cumulative pass rate trend */}
          {dailyTrend.some(d => d.examCount > 0) && (() => {
            const cumSeries = [{
              label: 'อัตราผ่านรายวัน (%)',
              color: '#16a34a',
              data: dailyTrend.map(d =>
                d.examCount > 0 ? Math.round((d.passCount / d.examCount) * 100) : 0
              ),
            }];
            return (
              <ChartCard title="🎯 อัตราผ่านรายวัน (%)" subtitle="เปอร์เซ็นต์ผ่านแต่ละวัน">
                <LineChart
                  series={cumSeries}
                  labels={lineLabels}
                  height={140}
                  yMax={100}
                  showArea={true}
                />
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

          {/* Score Distribution Histogram */}
          <ChartCard
            title="🎯 การกระจายคะแนน"
            subtitle={`คะแนนของผู้สอบ ${totalExams} ครั้ง (แบ่งเป็นช่วง 10%)`}>
            {scoreDistribution.some(b => b.count > 0) ? (
              <>
                <VBarChart
                  items={scoreDistribution.map(b => ({
                    label: b.label + '%',
                    value: b.count,
                    color: b.pass ? '#22c55e' : '#ef4444',
                  }))}
                  height={170}
                  highlightFn={item => item.color === '#22c55e'}
                  showValues={true}
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
            ) : <div className="text-center py-8 text-xs" style={{ color: 'var(--text-muted)' }}>ยังไม่มีข้อมูลผลสอบ</div>}
          </ChartCard>

          {/* Distribution as horizontal bar (alternate view) */}
          {scoreDistribution.some(b => b.count > 0) && (
            <ChartCard title="📊 ตารางกระจายคะแนน" subtitle="จำนวนผู้สอบในแต่ละช่วงคะแนน">
              <HBarChart
                items={scoreDistribution.map(b => ({
                  label:  b.label + '%',
                  value:  b.count,
                  color:  b.pass ? '#22c55e' : '#ef4444',
                }))}
                colorFn={item => item.color}
                valueSuffix=" ครั้ง"
              />
            </ChartCard>
          )}

          {/* Donut by pass/fail */}
          {passFailDonut.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ChartCard title="🍩 Pass/Fail Donut" subtitle="ภาพรวมทั้งระบบ">
                <DonutChart
                  data={passFailDonut}
                  size={160}
                  centerLabel={`${avgPassRate}%`}
                  centerSub="ผ่าน"
                />
              </ChartCard>

              {/* Score band mini pie */}
              <ChartCard title="📊 ช่วงคะแนน" subtitle="แบ่ง 4 ระดับ">
                <DonutChart
                  data={(() => {
                    const bands = [
                      { label: '0-39%',   value: 0, color: '#ef4444' },
                      { label: '40-59%',  value: 0, color: '#f59e0b' },
                      { label: '60-79%',  value: 0, color: '#3b82f6' },
                      { label: '80-100%', value: 0, color: '#22c55e' },
                    ];
                    scoreDistribution.forEach((b, i) => {
                      const idx = i < 4 ? 0 : i < 6 ? 1 : i < 8 ? 2 : 3;
                      bands[idx].value += b.count;
                    });
                    return bands.filter(b => b.value > 0);
                  })()}
                  size={160}
                  centerLabel={String(totalExams)}
                  centerSub="ครั้ง"
                />
              </ChartCard>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
