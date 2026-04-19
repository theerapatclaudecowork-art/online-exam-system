import React, { useEffect, useState, lazy, Suspense } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { syncOfflineQueue, getOfflineQueueCount } from './utils/api';
import Spinner             from './components/Spinner';
import ErrorBoundary       from './components/ErrorBoundary';
import { ToastProvider, useToast } from './components/Toast';
import { SkeletonCard }    from './components/Skeleton';

// ── Eager (โหลดทันที — เป็น screen แรกที่ user เห็น) ──
import AuthScreen          from './screens/AuthScreen';
import SetupScreen         from './screens/SetupScreen';

// ── Lazy (โหลดเมื่อใช้งานจริง — ลดขนาด initial bundle) ──
const RegisterScreen          = lazy(() => import('./screens/RegisterScreen'));
const SubjectScreen           = lazy(() => import('./screens/SubjectScreen'));
const QuizScreen              = lazy(() => import('./screens/QuizScreen'));
const ScoreScreen             = lazy(() => import('./screens/ScoreScreen'));
const ReviewScreen            = lazy(() => import('./screens/ReviewScreen'));
const HistoryScreen           = lazy(() => import('./screens/HistoryScreen'));
const HistoryDetailScreen     = lazy(() => import('./screens/HistoryDetailScreen'));
const AdminScreen             = lazy(() => import('./screens/AdminScreen'));
const QuestionManagerScreen   = lazy(() => import('./screens/QuestionManagerScreen'));
const ExamSetManagerScreen    = lazy(() => import('./screens/ExamSetManagerScreen'));
const ExamSetScreen           = lazy(() => import('./screens/ExamSetScreen'));
const ProfileScreen           = lazy(() => import('./screens/ProfileScreen'));
const MyStatsScreen           = lazy(() => import('./screens/MyStatsScreen'));
const LeaderboardScreen       = lazy(() => import('./screens/LeaderboardScreen'));
const CertificateScreen       = lazy(() => import('./screens/CertificateScreen'));
const BookmarkScreen          = lazy(() => import('./screens/BookmarkScreen'));
const StudyScreen             = lazy(() => import('./screens/StudyScreen'));
const DrillScreen             = lazy(() => import('./screens/DrillScreen'));
const ReportCardScreen        = lazy(() => import('./screens/ReportCardScreen'));
const ExamSetLeaderboardScreen= lazy(() => import('./screens/ExamSetLeaderboardScreen'));
const TeacherScreen           = lazy(() => import('./screens/TeacherScreen'));
const PendingScreen           = lazy(() => import('./screens/PendingScreen'));
const LessonScreen            = lazy(() => import('./screens/LessonScreen'));
const LessonDetailScreen      = lazy(() => import('./screens/LessonDetailScreen'));

// Screens where we hide the floating dark-mode toggle (full-screen quiz)
const HIDE_TOGGLE_SCREENS = new Set(['auth', 'register', 'loading-quiz']);

// Screens where bottom nav is visible
const SHOW_BOTTOM_NAV = new Set([
  'setup', 'history', 'myStats', 'leaderboard', 'profile',
  'bookmark', 'certificate', 'examSets', 'subject', 'drill', 'lessons', 'lessonDetail',
  'admin', 'teacher', 'questionManager',
]);

const BOTTOM_NAV_ITEMS = [
  { key: 'setup',   icon: '🏠', label: 'หน้าแรก' },
  { key: 'examSets', icon: '📦', label: 'ชุดข้อสอบ' },
  { key: 'history', icon: '📊', label: 'ประวัติ' },
  { key: 'myStats', icon: '📈', label: 'สถิติ' },
  { key: 'profile', icon: '👤', label: 'อื่นๆ' },
];

// ── Skeleton fallback แทน Spinner เวลา lazy-load screen ──
function ScreenSkeleton() {
  return (
    <div className="animate-fade" style={{ padding: '8px 4px' }}>
      <div style={{
        background: 'linear-gradient(90deg, var(--skeleton-a) 25%, var(--skeleton-b) 50%, var(--skeleton-a) 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeletonShimmer 1.4s ease-in-out infinite',
        height: 72, borderRadius: 16, marginBottom: 16,
      }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SkeletonCard showImage={false} lines={2} />
        <SkeletonCard showImage={false} lines={2} />
        <SkeletonCard showImage={false} lines={2} />
      </div>
    </div>
  );
}

function Router() {
  const { screen } = useApp();

  const screenMap = {
    auth:          <AuthScreen />,
    register:      <RegisterScreen />,
    setup:         <SetupScreen />,
    subject:       <SubjectScreen />,
    'loading-quiz':<Spinner label="กำลังโหลดข้อสอบ..." />,
    quiz:          <QuizScreen />,
    score:         <ScoreScreen />,
    review:        <ReviewScreen />,
    history:         <HistoryScreen />,
    historyDetail:   <HistoryDetailScreen />,
    admin:           <AdminScreen />,
    questionManager: <QuestionManagerScreen />,
    examSetManager:  <ExamSetManagerScreen />,
    examSets:        <ExamSetScreen />,
    profile:         <ProfileScreen />,
    myStats:         <MyStatsScreen />,
    leaderboard:     <LeaderboardScreen />,
    certificate:     <CertificateScreen />,
    bookmark:        <BookmarkScreen />,
    study:           <StudyScreen />,
    drill:           <DrillScreen />,
    reportCard:      <ReportCardScreen />,
    examSetLeaderboard: <ExamSetLeaderboardScreen />,
    teacher:            <TeacherScreen />,
    pending:            <PendingScreen />,
    lessons:            <LessonScreen />,
    lessonDetail:       <LessonDetailScreen />,
  };

  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <ErrorBoundary>
        {screenMap[screen] ?? <AuthScreen />}
      </ErrorBoundary>
    </Suspense>
  );
}

// Global Offline/Online banner + toast
function OfflineBanner() {
  const [offline,    setOffline]    = useState(!navigator.onLine);
  const [justOnline, setJustOnline] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    const onOnline = () => {
      setOffline(false);
      const q = getOfflineQueueCount();
      if (q > 0) {
        setQueueCount(q);
        setJustOnline(true);
        toast.success(`กลับมาออนไลน์ — กำลังส่งผลสอบที่ค้างไว้ ${q} รายการ`);
        setTimeout(() => setJustOnline(false), 5000);
      } else {
        toast.success('กลับมาออนไลน์แล้ว', { duration: 1800 });
      }
    };
    const onOffline = () => {
      setOffline(true);
      setJustOnline(false);
      toast.warning('ขาดการเชื่อมต่ออินเทอร์เน็ต', { duration: 3000 });
    };
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [toast]);

  if (!offline && !justOnline) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
      background: offline ? '#dc2626' : '#16a34a',
      color: 'white', textAlign: 'center',
      fontSize: 12, fontWeight: 600, padding: '5px 8px',
      transition: 'background .3s',
    }}>
      {offline
        ? '📵 ไม่มีอินเทอร์เน็ต — ผลสอบบันทึกในเครื่อง จะส่งอัตโนมัติเมื่อออนไลน์'
        : `✅ กลับมาออนไลน์แล้ว${queueCount > 0 ? ` — กำลังส่งผลสอบที่ค้างไว้ ${queueCount} รายการ...` : ''}`}
    </div>
  );
}

// Bottom Navigation Bar
function BottomNav() {
  const { screen, navigate } = useApp();
  if (!SHOW_BOTTOM_NAV.has(screen)) return null;

  return (
    <nav className="bottom-nav">
      {BOTTOM_NAV_ITEMS.map(item => {
        const active = screen === item.key || (item.key === 'setup' && screen === 'setup');
        return (
          <button key={item.key}
            className={`bottom-nav-item ${active ? 'active' : ''}`}
            onClick={() => navigate(item.key)}>
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
            {active && <div className="bottom-nav-indicator" />}
          </button>
        );
      })}
    </nav>
  );
}

// Background sync + SW update prompt
function BackgroundSync() {
  const { toast } = useToast();

  useEffect(() => {
    async function handleOnline() {
      const count = getOfflineQueueCount();
      if (count > 0) {
        toast.loading(`กำลังส่งผลสอบที่ค้าง ${count} รายการ...`, { id: 'sync' });
        try {
          await syncOfflineQueue();
          toast.success(`ส่งผลสอบสำเร็จ ${count} รายการ`, { id: 'sync' });
        } catch (e) {
          toast.error('ส่งไม่สำเร็จ ระบบจะลองอีกครั้ง', { id: 'sync' });
        }
      }
    }
    // แจ้งเตือนเมื่อมี SW ใหม่ + ให้ user กดอัปเดตเอง
    function handleSWUpdate(e) {
      const nw = e.detail?.worker;
      toast.info('มีเวอร์ชันใหม่พร้อมใช้งาน', {
        duration: 0,
        id: 'sw-update',
        action: {
          label: 'อัปเดต',
          onClick: () => {
            try { nw?.postMessage({ type: 'SKIP_WAITING' }); } catch (_) {}
            window.location.reload();
          },
        },
      });
    }
    window.addEventListener('online', handleOnline);
    window.addEventListener('sw-update-ready', handleSWUpdate);
    handleOnline();
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('sw-update-ready', handleSWUpdate);
    };
  }, [toast]);

  return null;
}

function AppShell() {
  const { theme, screen } = useApp();

  useEffect(() => {
    document.body.className = theme || '';
  }, [theme]);

  const showNav = SHOW_BOTTOM_NAV.has(screen);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: showNav ? 72 : 0 }} className="py-3 px-3 sm:py-6 sm:px-4 lg:px-8">
      <OfflineBanner />
      <BackgroundSync />
      <div className="max-w-3xl mx-auto w-full">
        <Router />
        <footer className="text-center mt-8 text-xs" style={{ color: 'var(--text-muted)' }}>
          © 2025 ระบบข้อสอบออนไลน์
        </footer>
      </div>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider position="top" max={4}>
        <AppProvider>
          <AppShell />
        </AppProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
