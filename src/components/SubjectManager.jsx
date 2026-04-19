import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { apiGet, apiPost } from '../utils/api';

// ── Course Assignment Panel (inline expandable) ───────────────────
function CourseAssignPanel({ subject, courses, onSave, onCancel, saving }) {
  const [selected, setSelected] = useState(new Set(subject.courses || []));

  const toggle = (courseName) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(courseName) ? s.delete(courseName) : s.add(courseName);
      return s;
    });
  };

  return (
    <div style={{ borderTop: '1px solid var(--input-border)', padding: '10px 14px 12px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
        กำหนดหลักสูตรที่ใช้วิชานี้
        <span style={{ fontWeight: 400, marginLeft: 4, color: '#9ca3af' }}>
          (ถ้าไม่เลือก = แสดงทุกหลักสูตร)
        </span>
      </div>

      {courses.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 0 8px' }}>
          ยังไม่มีหลักสูตร — กรุณาเพิ่มหลักสูตรในแท็บ <b>หลักสูตร</b> ก่อน
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {courses.map(c => {
            const sel = selected.has(c.name);
            return (
              <label key={c.courseId}
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                onClick={() => toggle(c.name)}>
                <div style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: sel ? 'var(--accent)' : 'transparent',
                  border: sel ? 'none' : '2px solid var(--input-border)',
                  transition: 'all .15s',
                }}>
                  {sel && <span style={{ color: 'white', fontSize: 9, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                </div>
                <span style={{ fontSize: 13, color: 'var(--text)' }}>{c.name}</span>
                {!c.isOpen && (
                  <span style={{ fontSize: 10, color: '#9ca3af' }}>(ปิดรับสมัคร)</span>
                )}
              </label>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => onSave([...selected])}
          disabled={saving}
          style={{
            flex: 1, padding: '7px 0', borderRadius: 10, border: 'none',
            background: 'var(--accent)', color: '#fff',
            fontWeight: 700, fontSize: 12, cursor: saving ? 'wait' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}>
          {saving ? '...' : '💾 บันทึก'}
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: '7px 14px', borderRadius: 10,
            border: '1.5px solid var(--input-border)',
            background: 'transparent', color: 'var(--text-muted)',
            fontWeight: 600, fontSize: 12, cursor: 'pointer',
          }}>
          ยกเลิก
        </button>
      </div>
    </div>
  );
}

// ── SubjectManager ────────────────────────────────────────────────
export default function SubjectManager({ callerUserId }) {
  const [subjects, setSubjects] = useState([]);
  const [courses,  setCourses]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(null); // '<name>_toggle' | '<name>_courses'
  const [expanded, setExpanded] = useState(null); // subject name

  async function load() {
    setLoading(true);
    try {
      const [subRes, crsRes] = await Promise.all([
        apiGet('getSubjectsAdmin', { userId: callerUserId }),
        apiGet('getCourses',       { userId: callerUserId }),
      ]);
      if (subRes.success) setSubjects(subRes.subjects || []);
      if (crsRes.success) setCourses(crsRes.courses   || []);
    } catch (_) {}
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  // Toggle enable/disable
  async function handleToggle(sub) {
    const key = sub.name + '_toggle';
    setSaving(key);
    const newEnabled = sub.isEnabled === false ? true : false;
    try {
      const d = await apiPost({
        action:      'updateSubjectSettings',
        callerUserId,
        subjectName: sub.name,
        isEnabled:   newEnabled,
        courses:     sub.courses || [],
      });
      if (!d.success) throw new Error(d.message);
      setSubjects(prev => prev.map(s =>
        s.name === sub.name ? { ...s, isEnabled: newEnabled } : s
      ));
    } catch (e) {
      Swal.fire('เกิดข้อผิดพลาด', e.message, 'error');
    } finally { setSaving(null); }
  }

  // Save course assignment
  async function handleSaveCourses(sub, newCourses) {
    const key = sub.name + '_courses';
    setSaving(key);
    try {
      const d = await apiPost({
        action:      'updateSubjectSettings',
        callerUserId,
        subjectName: sub.name,
        isEnabled:   sub.isEnabled !== false,
        courses:     newCourses,
      });
      if (!d.success) throw new Error(d.message);
      setSubjects(prev => prev.map(s =>
        s.name === sub.name ? { ...s, courses: newCourses } : s
      ));
      setExpanded(null);
      Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ!', timer: 1200, showConfirmButton: false });
    } catch (e) {
      Swal.fire('เกิดข้อผิดพลาด', e.message, 'error');
    } finally { setSaving(null); }
  }

  const enabledCount  = subjects.filter(s => s.isEnabled !== false).length;
  const disabledCount = subjects.length - enabledCount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="quiz-card no-hover rounded-2xl p-4">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>📖 จัดการรายวิชา</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              เปิด/ปิดวิชา · กำหนดวิชาประจำหลักสูตร
            </div>
          </div>
          <button
            onClick={load}
            style={{
              padding: '6px 12px', borderRadius: 10, border: '1.5px solid var(--input-border)',
              background: 'transparent', color: 'var(--text-muted)',
              fontWeight: 600, fontSize: 12, cursor: 'pointer',
            }}>
            🔄
          </button>
        </div>

        {/* Summary badges */}
        {!loading && subjects.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 99, fontWeight: 700,
              background: '#dcfce7', color: '#15803d',
            }}>🟢 เปิด {enabledCount} วิชา</span>
            {disabledCount > 0 && (
              <span style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 99, fontWeight: 700,
                background: '#fee2e2', color: '#b91c1c',
              }}>🔴 ปิด {disabledCount} วิชา</span>
            )}
          </div>
        )}

        {/* Hint */}
        {!loading && courses.length > 0 && (
          <div style={{
            fontSize: 11, padding: '8px 12px', borderRadius: 10,
            background: '#eff6ff', border: '1px solid #bfdbfe',
            color: '#1d4ed8', marginBottom: 14, lineHeight: 1.5,
          }}>
            💡 <b>กดปุ่ม 📚</b> เพื่อกำหนดว่าวิชานี้อยู่ในหลักสูตรใดบ้าง
            ถ้าไม่กำหนด = แสดงให้ทุกหลักสูตร
          </div>
        )}

        {/* List */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
            <div className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : subjects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
            ไม่พบรายวิชา
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {subjects.map((sub, idx) => {
              const isEnabled   = sub.isEnabled !== false;
              const assignedCourses = sub.courses || [];
              const isExpanded  = expanded === sub.name;
              const isSavingToggle  = saving === sub.name + '_toggle';
              const isSavingCourses = saving === sub.name + '_courses';

              return (
                <div key={sub.name}
                  className="animate-slide-left"
                  style={{
                    borderRadius: 12, overflow: 'hidden',
                    border: `1.5px solid ${isEnabled ? 'var(--input-border)' : '#fca5a5'}`,
                    background: isEnabled ? 'var(--input-bg)' : '#fff5f5',
                    animationDelay: `${idx * 0.04}s`,
                    opacity: isEnabled ? 1 : 0.75,
                    transition: 'opacity .2s',
                  }}>

                  {/* Main row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
                    {/* Status dot */}
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: isEnabled ? '#22c55e' : '#9ca3af',
                    }} />

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 700, color: 'var(--text)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {sub.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {(sub.questionCount || 0).toLocaleString()} ข้อ
                        {' · '}
                        {assignedCourses.length > 0
                          ? <span style={{ color: '#2563eb' }}>
                              {assignedCourses.length === 1
                                ? assignedCourses[0]
                                : `${assignedCourses.length} หลักสูตร`}
                            </span>
                          : <span style={{ color: '#9ca3af' }}>ทุกหลักสูตร</span>}
                      </div>
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => setExpanded(isExpanded ? null : sub.name)}
                        title="กำหนดหลักสูตร"
                        style={{
                          padding: '5px 10px', borderRadius: 8, border: '1.5px solid var(--input-border)',
                          background: isExpanded ? '#eff6ff' : 'transparent',
                          borderColor: isExpanded ? '#93c5fd' : 'var(--input-border)',
                          color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, cursor: 'pointer',
                        }}>
                        📚
                      </button>
                      <button
                        onClick={() => handleToggle(sub)}
                        disabled={isSavingToggle}
                        title={isEnabled ? 'ปิดวิชา' : 'เปิดวิชา'}
                        style={{
                          padding: '5px 10px', borderRadius: 8, border: 'none',
                          background: isEnabled ? '#fef9c3' : '#dcfce7',
                          color: isEnabled ? '#854d0e' : '#15803d',
                          fontWeight: 700, fontSize: 11,
                          cursor: isSavingToggle ? 'wait' : 'pointer',
                          opacity: isSavingToggle ? 0.6 : 1,
                        }}>
                        {isSavingToggle ? '...' : isEnabled ? '🔴 ปิด' : '🟢 เปิด'}
                      </button>
                    </div>
                  </div>

                  {/* Expanded: course assignment */}
                  {isExpanded && (
                    <CourseAssignPanel
                      subject={sub}
                      courses={courses}
                      onSave={(names) => handleSaveCourses(sub, names)}
                      onCancel={() => setExpanded(null)}
                      saving={isSavingCourses}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
