import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { apiGet } from '../utils/api';
import { APP_LOGO } from '../config';
import { SkeletonCard } from '../components/Skeleton';

export default function LessonScreen() {
  const { navigate, profile, userCourse } = useApp();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('getLessons', { course: userCourse || '' })
      .then(d => { if (d.success) setLessons(d.lessons || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="animate-fade" style={{ padding: '8px 4px' }}>
        <div style={{
          height: 88,
          borderRadius: 24,
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          marginLeft: -16, marginRight: -16, marginTop: -16, marginBottom: 16,
          opacity: .7,
        }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} showImage={i === 0} lines={2} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade">
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        borderRadius: '0 0 24px 24px', padding: '20px 20px 24px',
        marginLeft: -16, marginRight: -16, marginTop: -16, marginBottom: 16,
      }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('setup')}
            style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 10, padding: '6px 10px', cursor: 'pointer', color: 'white', fontSize: 16 }}>
            ←
          </button>
          <img src={APP_LOGO} alt="logo" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,.4)' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: 'white' }}>บทเรียน</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>
              {userCourse ? `หลักสูตร: ${userCourse}` : 'บทเรียนทั้งหมด'} — {lessons.length} บทเรียน
            </div>
          </div>
        </div>
      </div>

      {lessons.length === 0 ? (
        <div style={{
          background: 'var(--card)', borderRadius: 20, padding: 40, textAlign: 'center',
          border: '1px solid var(--card-border)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>ยังไม่มีบทเรียน</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>กรุณาติดต่อผู้ดูแลระบบ</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {lessons.map((lesson, i) => (
            <div key={lesson.lessonId}
              onClick={() => navigate('lessonDetail', { lessonId: lesson.lessonId })}
              style={{
                background: 'var(--card)', borderRadius: 16, overflow: 'hidden',
                border: '1px solid var(--card-border)', cursor: 'pointer',
                transition: 'transform .12s, box-shadow .12s',
                boxShadow: '0 2px 10px rgba(0,0,0,.04)',
              }}
              onTouchStart={e => e.currentTarget.style.transform = 'scale(.98)'}
              onTouchEnd={e => e.currentTarget.style.transform = ''}>

              {lesson.imageUrl && (
                <div style={{ height: 140, overflow: 'hidden' }}>
                  <img src={lesson.imageUrl} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}

              <div style={{ padding: '14px 16px' }}>
                <div className="flex items-start gap-3">
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: `hsl(${(i * 47) % 360}, 70%, 95%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 800, color: `hsl(${(i * 47) % 360}, 60%, 40%)`,
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 3 }}>
                      {lesson.title}
                    </div>
                    {lesson.description && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        {lesson.description.length > 80 ? lesson.description.slice(0, 80) + '...' : lesson.description}
                      </div>
                    )}
                    <div className="flex items-center gap-3" style={{ marginTop: 6 }}>
                      {lesson.videoUrl && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#ef4444', background: '#fef2f2', padding: '2px 8px', borderRadius: 6 }}>
                          🎬 มีวิดีโอ
                        </span>
                      )}
                      {lesson.course && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: 6 }}>
                          {lesson.course}
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 18, flexShrink: 0 }}>›</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
