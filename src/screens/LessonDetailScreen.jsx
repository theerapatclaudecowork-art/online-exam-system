import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { apiGet } from '../utils/api';
import { APP_LOGO } from '../config';

// Sanitize HTML — strip dangerous tags & attributes
function sanitizeHTML(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // Remove dangerous elements
  doc.querySelectorAll('script,iframe,object,embed,form,input,textarea,link,style,meta,base').forEach(el => el.remove());
  // Remove event handler attributes (on*)
  doc.querySelectorAll('*').forEach(el => {
    for (const attr of [...el.attributes]) {
      if (attr.name.startsWith('on') || attr.value.trim().toLowerCase().startsWith('javascript:')) {
        el.removeAttribute(attr.name);
      }
    }
  });
  return doc.body.innerHTML;
}

export default function LessonDetailScreen() {
  const { navigate, screenParams } = useApp();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = screenParams?.lessonId;
    if (!id) { navigate('lessons'); return; }

    apiGet('getLessonDetail', { lessonId: id })
      .then(d => { if (d.success) setLesson(d.lesson); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="quiz-card rounded-2xl p-8 animate-fade text-center">
        <div className="spinner" style={{ margin: '0 auto 12px' }} />
        <div style={{ fontWeight: 700, color: 'var(--text)' }}>กำลังโหลด...</div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="quiz-card rounded-2xl p-8 animate-fade text-center">
        <div style={{ fontSize: 48, marginBottom: 12 }}>😕</div>
        <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>ไม่พบบทเรียน</div>
        <button onClick={() => navigate('lessons')}
          style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: 'var(--accent)', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
          ← กลับ
        </button>
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
          <button onClick={() => navigate('lessons')}
            style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 10, padding: '6px 10px', cursor: 'pointer', color: 'white', fontSize: 16 }}>
            ←
          </button>
          <img src={APP_LOGO} alt="logo" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,.4)' }} />
          <div className="flex-1 min-w-0">
            <div style={{ fontWeight: 800, fontSize: 16, color: 'white' }} className="truncate">{lesson.title}</div>
            {lesson.course && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>หลักสูตร: {lesson.course}</div>
            )}
          </div>
        </div>
      </div>

      {/* Cover image */}
      {lesson.imageUrl && (
        <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
          <img src={lesson.imageUrl} alt="" style={{ width: '100%', maxHeight: 220, objectFit: 'cover' }} />
        </div>
      )}

      {/* Video */}
      {lesson.videoUrl && (
        <div style={{
          background: 'var(--card)', borderRadius: 16, overflow: 'hidden', marginBottom: 16,
          border: '1px solid var(--card-border)',
        }}>
          <div style={{ padding: '12px 16px', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
            🎬 วิดีโอบทเรียน
          </div>
          {lesson.videoUrl.includes('youtube.com') || lesson.videoUrl.includes('youtu.be') ? (
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
              <iframe
                src={lesson.videoUrl
                  .replace('watch?v=', 'embed/')
                  .replace('youtu.be/', 'youtube.com/embed/')
                  .replace(/&.*/, '')}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <a href={lesson.videoUrl} target="_blank" rel="noopener noreferrer"
              style={{
                display: 'block', padding: '14px 16px', fontWeight: 600, fontSize: 13,
                color: 'var(--accent)', textDecoration: 'none',
              }}>
              🔗 ดูวิดีโอ
            </a>
          )}
        </div>
      )}

      {/* Description */}
      {lesson.description && (
        <div style={{
          background: '#eef2ff', borderRadius: 14, padding: '12px 16px', marginBottom: 16,
          border: '1px solid #c7d2fe',
        }}>
          <div style={{ fontSize: 13, color: '#4338ca', lineHeight: 1.5 }}>{lesson.description}</div>
        </div>
      )}

      {/* Content */}
      {lesson.content && (
        <div style={{
          background: 'var(--card)', borderRadius: 16, padding: '18px 18px',
          border: '1px solid var(--card-border)', marginBottom: 16,
        }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 10 }}>
            📖 เนื้อหาบทเรียน
          </div>
          <div
            style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text)', wordBreak: 'break-word' }}
            dangerouslySetInnerHTML={{ __html: sanitizeHTML(lesson.content.replace(/\n/g, '<br/>')) }}
          />
        </div>
      )}

      {/* Bottom nav */}
      <div className="flex gap-3" style={{ marginTop: 16 }}>
        <button onClick={() => navigate('lessons')}
          style={{
            flex: 1, padding: '13px 0', borderRadius: 14,
            border: '1.5px solid var(--input-border)', background: 'transparent',
            color: 'var(--text-muted)', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>
          ← กลับหน้าบทเรียน
        </button>
      </div>
    </div>
  );
}
