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
import AdminScreen         from './screens/AdminScreen';
import QuestionManagerScreen from './screens/QuestionManagerScreen';
import Spinner             from './components/Spinner';

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
  };

  return screenMap[screen] ?? <AuthScreen />;
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
