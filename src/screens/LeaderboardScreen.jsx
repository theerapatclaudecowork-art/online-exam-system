import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiGet } from '../utils/api';
import Spinner from '../components/Spinner';
import { FALLBACK_AVATAR } from '../config';

const MEDAL_BG = ['#fef9c3','#f1f5f9','#fef3c7'];
const MEDAL_COLOR = ['#b45309','#475569','#92400e'];
const MEDAL_EMOJI = ['🥇','🥈','🥉'];
const TAB_ITEMS = [
  { key: 'personal', label: '👤 บุคคล' },
  { key: 'group',    label: '🏢 หน่วยงาน' },
];

function RankCard({ entry, isMe }) {
  const isMedal = entry.rank <= 3;
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${isMe ? 'ring-2' : ''}`}
      style={{
        background:  isMe ? 'rgba(var(--accent-rgb),.08)' : isMedal ? MEDAL_BG[entry.rank-1]+'33' : 'var(--input-bg)',
        border:      isMe ? '2px solid var(--accent)' : '1px solid var(--input-border)',
        ringColor:   'var(--accent)',
      }}>
      {/* Rank */}
      <div className="w-8 flex-shrink-0 text-center font-black text-sm"
        style={{ color: isMedal ? MEDAL_COLOR[entry.rank-1] : 'var(--text-muted)' }}>
        {isMedal ? MEDAL_EMOJI[entry.rank-1] : entry.rank}
      </div>
      {/* Avatar */}
      <img src={entry.pictureUrl || FALLBACK_AVATAR}
        alt="" loading="lazy" decoding="async"
        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
        style={{ border: isMe ? '2px solid var(--accent)' : '2px solid var(--input-border)' }}/>
      {/* Name + Stats */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
          {entry.displayName}
          {isMe && <span className="ml-1.5 text-xs px-1.5 py-0 rounded-full" style={{ background: 'var(--accent)', color: 'white' }}>คุณ</span>}
        </div>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          สอบ {entry.totalAttempts} ครั้ง • เฉลี่ย {entry.avgScore}%
        </div>
      </div>
      {/* Pass count */}
      <div className="flex-shrink-0 text-right">
        <div className="text-base font-black" style={{ color: '#16a34a' }}>{entry.totalPass}</div>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>ผ่าน</div>
      </div>
    </div>
  );
}

// ── Group Leaderboard Component ───────────────────────────────
function GroupBoard({ profile }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('getGroupLeaderboard', { userId: profile?.userId })
      .then(d => { if (d.success) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
      <div className="spinner" style={{ margin: '0 auto 12px' }} />
      กำลังโหลดอันดับหน่วยงาน...
    </div>
  );

  const groups = data?.groups || [];
  const myGroup = data?.myGroup || '';

  if (!groups.length) return (
    <div className="quiz-card no-hover rounded-2xl p-10 text-center" style={{ color: 'var(--text-muted)' }}>
      <div className="text-4xl mb-2">🏢</div>
      <div>ยังไม่มีข้อมูลหน่วยงาน</div>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* My group badge */}
      {myGroup && (
        <div className="rounded-xl px-3 py-2.5"
          style={{ background: 'rgba(var(--accent-rgb),.08)', border: '1.5px solid var(--accent)' }}>
          <div className="text-xs font-bold" style={{ color: 'var(--accent)' }}>
            🏢 หน่วยงานของคุณ: {myGroup}
          </div>
        </div>
      )}

      {groups.map(g => {
        const isMyG = g.dept === myGroup;
        const isMedal = g.rank <= 3;
        return (
          <div key={g.dept} className="quiz-card no-hover rounded-2xl p-4"
            style={isMyG ? { border: '2px solid var(--accent)', boxShadow: '0 2px 12px rgba(var(--accent-rgb),.15)' } : {}}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 text-center font-black text-lg"
                style={{ color: isMedal ? MEDAL_COLOR[g.rank-1] : 'var(--text-muted)' }}>
                {isMedal ? MEDAL_EMOJI[g.rank-1] : g.rank}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate" style={{ color: 'var(--text)' }}>
                  {g.dept}
                  {isMyG && <span className="ml-1.5 text-xs px-1.5 py-0 rounded-full" style={{ background: 'var(--accent)', color: 'white' }}>คุณ</span>}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {g.memberCount} คน • สอบ {g.totalAttempts} ครั้ง
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-lg font-black" style={{ color: '#16a34a' }}>{g.totalPass}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>ผ่าน</div>
              </div>
            </div>

            {/* Stats bar */}
            <div className="flex gap-3 text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              <span>อัตราผ่าน <b style={{ color: '#16a34a' }}>{g.passRate}%</b></span>
              <span>เฉลี่ย <b style={{ color: '#3b82f6' }}>{g.avgScore}%</b></span>
            </div>

            {/* Progress bar */}
            <div style={{ height: 6, borderRadius: 99, background: 'var(--progress-trk)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, background: '#22c55e', width: `${g.passRate}%`, transition: 'width .5s' }} />
            </div>

            {/* Top 3 members */}
            {g.topMembers?.length > 0 && (
              <div className="flex gap-2 mt-2">
                {g.topMembers.map((m, mi) => (
                  <span key={mi} className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--input-bg)', color: 'var(--text-muted)', fontSize: 10 }}>
                    {MEDAL_EMOJI[mi] || ''} {m.name?.slice(0, 12) || 'ไม่ระบุ'} ({m.pass})
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const PERIODS = [
  { key: 'all',   label: 'ทั้งหมด' },
  { key: 'month', label: 'เดือนนี้' },
  { key: 'week',  label: 'สัปดาห์นี้' },
];

export default function LeaderboardScreen() {
  const { navigate, profile } = useApp();
  const [tab, setTab]         = useState('personal');
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState('all');

  async function loadBoard(p) {
    setLoading(true);
    try {
      const res = await apiGet('getLeaderboard', { userId: profile?.userId, period: p || period });
      if (res.success) setData(res);
    } catch (_) {}
    finally { setLoading(false); }
  }

  useEffect(() => { loadBoard('all'); }, []);

  if (loading) return <Spinner label="กำลังโหลด Leaderboard..." />;

  const board   = data?.leaderboard || [];
  const myEntry = data?.myEntry;
  const myRank  = data?.myRank;
  const total   = data?.totalUsers || 0;
  const isInTop = board.some(e => e.isMe);

  return (
    <div className="animate-fade space-y-4">

      {/* Header */}
      <div className="quiz-card no-hover rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-base sm:text-lg" style={{ color: 'var(--text)' }}>🏆 อันดับผู้สอบ</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              เรียงตามจำนวนครั้งที่ผ่าน • ทั้งหมด {total} คน
            </p>
          </div>
          <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5"
            onClick={() => navigate('myStats')}>← กลับ</button>
        </div>

        {/* My rank badge */}
        {myRank && tab === 'personal' && (
          <div className="mt-3 flex items-center gap-3 rounded-xl px-3 py-2"
            style={{ background: 'rgba(var(--accent-rgb),.08)', border: '1.5px solid var(--accent)' }}>
            <span className="text-2xl">{myRank<=3 ? MEDAL_EMOJI[myRank-1] : '🎯'}</span>
            <div>
              <div className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
                คุณอยู่อันดับที่ {myRank} จาก {total} คน
              </div>
              {myEntry && (
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  ผ่าน {myEntry.totalPass} ครั้ง • เฉลี่ย {myEntry.avgScore}% • สูงสุด {myEntry.bestScore}%
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Period Filter */}
      {tab === 'personal' && (
        <div style={{ display: 'flex', gap: 4 }}>
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => { setPeriod(p.key); loadBoard(p.key); }}
              style={{
                flex: 1, padding: '7px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: 12, transition: 'all .15s',
                background: period === p.key ? '#f59e0b' : 'var(--input-bg)',
                color: period === p.key ? 'white' : 'var(--text-muted)',
              }}>
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6 }}>
        {TAB_ITEMS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: '9px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 13, transition: 'all .15s',
            background: tab === t.key ? 'var(--accent)' : 'var(--input-bg)',
            color: tab === t.key ? 'white' : 'var(--text-muted)',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Personal Tab */}
      {tab === 'personal' && (
        <>
          {board.length === 0 ? (
            <div className="quiz-card no-hover rounded-2xl p-10 text-center" style={{ color: 'var(--text-muted)' }}>
              <div className="text-4xl mb-2">🏆</div>
              <div>ยังไม่มีข้อมูล — เริ่มสอบเพื่อขึ้นอันดับ!</div>
            </div>
          ) : (
            <div className="quiz-card no-hover rounded-2xl p-4">
              <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
                Top {board.length} ผู้สอบผ่านมากที่สุด
              </div>
              <div className="space-y-2">
                {board.map(e => (
                  <RankCard key={e.userId} entry={e} isMe={e.isMe} />
                ))}
              </div>
            </div>
          )}

          {!isInTop && myEntry && (
            <div className="quiz-card no-hover rounded-2xl p-4">
              <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>อันดับของคุณ</div>
              <RankCard entry={myEntry} isMe={true} />
            </div>
          )}
        </>
      )}

      {/* Group Tab */}
      {tab === 'group' && <GroupBoard profile={profile} />}

      <button className="btn btn-gray w-full rounded-xl py-3" onClick={() => navigate('setup')}>
        ← กลับหน้าหลัก
      </button>
    </div>
  );
}
