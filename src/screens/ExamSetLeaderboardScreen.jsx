import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiGet } from '../utils/api';
import Spinner from '../components/Spinner';
import { FALLBACK_AVATAR } from '../config';

const MEDAL_BG    = ['#fef9c3', '#f1f5f9', '#fef3c7'];
const MEDAL_COLOR = ['#b45309', '#475569', '#92400e'];
const MEDAL_EMOJI = ['🥇', '🥈', '🥉'];

function RankCard({ entry, isMe }) {
  const isMedal = entry.rank <= 3;
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all`}
      style={{
        background: isMe ? 'rgba(var(--accent-rgb),.08)' : isMedal ? MEDAL_BG[entry.rank - 1] + '44' : 'var(--input-bg)',
        border: isMe ? '2px solid var(--accent)' : '1px solid var(--input-border)',
      }}>
      <div className="w-8 flex-shrink-0 text-center font-black text-sm"
        style={{ color: isMedal ? MEDAL_COLOR[entry.rank - 1] : 'var(--text-muted)' }}>
        {isMedal ? MEDAL_EMOJI[entry.rank - 1] : entry.rank}
      </div>
      <img
        src={entry.pictureUrl || FALLBACK_AVATAR}
        alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0"
        style={{ border: isMe ? '2px solid var(--accent)' : '2px solid var(--input-border)' }} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
          {entry.displayName || 'ไม่ระบุชื่อ'}
          {isMe && <span className="ml-1.5 text-xs px-1.5 py-0 rounded-full" style={{ background: 'var(--accent)', color: 'white' }}>คุณ</span>}
        </div>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {entry.score}/{entry.total} ข้อ • {entry.pass ? '✅ ผ่าน' : '❌ ไม่ผ่าน'}
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <div className="text-base font-black" style={{ color: entry.pct >= 60 ? '#16a34a' : '#ef4444' }}>
          {entry.pct}%
        </div>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>คะแนนสูงสุด</div>
      </div>
    </div>
  );
}

export default function ExamSetLeaderboardScreen() {
  const { navigate, profile, exam } = useApp();
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!exam.setId) { navigate('examSets'); return; }
    (async () => {
      try {
        const res = await apiGet('getExamSetLeaderboard', { setId: exam.setId, userId: profile?.userId });
        if (res.success) setData(res);
      } catch (_) {}
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <Spinner label="กำลังโหลดอันดับ..." />;

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
            <h1 className="font-bold text-base sm:text-lg" style={{ color: 'var(--text)' }}>🏆 อันดับ</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {exam.lesson || 'ชุดข้อสอบ'} • ทั้งหมด {total} คน
            </p>
          </div>
          <button className="btn btn-gray text-xs rounded-lg px-3 py-1.5"
            onClick={() => navigate('examSets')}>← กลับ</button>
        </div>

        {myRank && (
          <div className="mt-3 flex items-center gap-3 rounded-xl px-3 py-2"
            style={{ background: 'rgba(var(--accent-rgb),.08)', border: '1.5px solid var(--accent)' }}>
            <span className="text-2xl">{myRank <= 3 ? MEDAL_EMOJI[myRank - 1] : '🎯'}</span>
            <div>
              <div className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
                คุณอยู่อันดับที่ {myRank} จาก {total} คน
              </div>
              {myEntry && (
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  คะแนนสูงสุด {myEntry.pct}% • {myEntry.score}/{myEntry.total} ข้อ
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      {board.length === 0 ? (
        <div className="quiz-card no-hover rounded-2xl p-10 text-center" style={{ color: 'var(--text-muted)' }}>
          <div className="text-4xl mb-2">🏆</div>
          <div>ยังไม่มีข้อมูล — เริ่มสอบเพื่อขึ้นอันดับ!</div>
        </div>
      ) : (
        <div className="quiz-card no-hover rounded-2xl p-4">
          <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
            Top {board.length} คะแนนสูงสุด
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

      <button className="btn btn-gray w-full rounded-xl py-3"
        onClick={() => navigate('examSets')}>← กลับเลือกชุดข้อสอบ</button>
    </div>
  );
}
