import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // ── Navigation ──
  const [screen, setScreen] = useState('auth');

  // ── User ──
  const [profile, setProfile]   = useState(null); // LINE profile
  const [lineEmail, setLineEmail] = useState(null);
  const [isAdmin, setIsAdmin]   = useState(false);

  // ── Theme ──
  const [theme, setThemeState] = useState(() => localStorage.getItem('quiz-theme') || '');

  useEffect(() => {
    document.body.className = theme || '';
  }, [theme]);

  const setTheme = useCallback((cls) => {
    setThemeState(cls);
    localStorage.setItem('quiz-theme', cls);
  }, []);

  // ── Exam Settings ──
  const [settings, setSettings] = useState({
    useTimer: true,
    timerMin: 30,
    numQ: 20,
  });

  // ── Exam State ──
  const [exam, setExam] = useState({
    lesson: '',
    allQ: [],
    questions: [],
    answers: [],
    idx: 0,
    score: 0,
    timeUsed: 0,
    detail: [],  // [{question,userAnswer,correctAnswer,isRight,explanation}]
  });

  // ── History ──
  const [historyList, setHistoryList]     = useState([]);
  const [historyDetail, setHistoryDetail] = useState(null); // { exam, detail }

  const navigate = useCallback((scr) => setScreen(scr), []);

  return (
    <AppContext.Provider value={{
      screen, navigate,
      profile, setProfile,
      lineEmail, setLineEmail,
      isAdmin, setIsAdmin,
      theme, setTheme,
      settings, setSettings,
      exam, setExam,
      historyList, setHistoryList,
      historyDetail, setHistoryDetail,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
