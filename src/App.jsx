import { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import AuthScreen          from './screens/AuthScreen';
import RegisterScreen      from './screens/RegisterScreen';
import SetupScreen         from './screens/SetupScreen';
import SubjectScreen       from './screens/SubjectScreen';
import QuizScreen          from './screens/QuizScreen';
import ScoreScreen         from './screens/ScoreScreen';
import ReviewScreen        from './screens/ReviewScreen';
import HistoryScreen       from './screens/HistoryScreen';
import HistoryDetailScreen from './screens/HistoryDetailScreen';
import AdminScreen           from './screens/AdminScreen';
import QuestionManagerScreen from './screens/QuestionManagerScreen';
import ExamSetManagerScreen  from './screens/ExamSetManagerScreen';
import ExamSetScreen         from './screens/ExamSetScreen';
import ProfileScreen         from './screens/ProfileScreen';
import MyStatsScreen        from './screens/MyStatsScreen';
import LeaderboardScreen    from './screens/LeaderboardScreen';
import CertificateScreen    from './screens/CertificateScreen';
import BookmarkScreen       from './screens/BookmarkScreen';
import StudyScreen         from './screens/StudyScreen';
import DrillScreen         from './screens/DrillScreen';
import ReportCardScreen    from './screens/ReportCardScreen';
import Spinner             from './components/Spinner';

// Screens where we hide the floating dark-mode toggle (full-screen quiz)
const HIDE_TOGGLE_SCREENS = new Set(['auth', 'register', 'loading-quiz']);

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
  };

  return screenMap[screen] ?? <AuthScreen />;
}

// Floating Dark/Light toggle button
function ThemeToggle() {
  const { theme, setTheme, screen } = useApp();
  if (HIDE_TOGGLE_SCREENS.has(screen)) return null;

  const isDark = theme === 't-dark';

  return (
    <button
      onClick={() => setTheme(isDark ? '' : 't-dark')}
      title={isDark ? 'เปลี่ยนเป็น Light Mode' : 'เปลี่ยนเป็น Dark Mode'}
      style={{
        position:     'fixed',
        bottom:       24,
        right:        16,
        zIndex:       9999,
        width:        44,
        height:       44,
        borderRadius: '50%',
        border:       'none',
        cursor:       'pointer',
        fontSize:     20,
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        background:   isDark ? '#f8fafc' : '#1e293b',
        color:        isDark ? '#1e293b' : '#f8fafc',
        boxShadow:    '0 4px 12px rgba(0,0,0,0.25)',
        transition:   'all .25s ease',
      }}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}

function AppShell() {
  const { theme } = useApp();

  useEffect(() => {
    document.body.className = theme || '';
  }, [theme]);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }} className="py-3 px-3 sm:py-6 sm:px-4 lg:px-8">
      <div className="max-w-3xl mx-auto w-full">
        <Router />
        <footer className="text-center mt-8 text-xs" style={{ color: 'var(--text-muted)' }}>
          © 2025 ระบบข้อสอบออนไลน์
        </footer>
      </div>
      <ThemeToggle />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
