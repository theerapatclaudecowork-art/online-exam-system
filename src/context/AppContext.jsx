import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // ── Navigation ──
  const [screen, setScreen] = useState('auth');
  const [screenParams, setScreenParams] = useState(null);

  // ── User ──
  const [profile, setProfile]   = useState(null); // LINE profile
  const [lineEmail, setLineEmail] = useState(null);
  const [isAdmin, setIsAdmin]   = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);

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
    setId:  '',    // ถ้าสอบจากชุดข้อสอบ จะมี setId
    passThreshold: 60,
    allQ: [],
    questions: [],
    answers: [],
    idx: 0,
    score: 0,
    timeUsed: 0,
    detail: [],  // [{question,userAnswer,correctAnswer,isRight,explanation}]
  });

  // ── Prefetched subjects (เก็บจาก initApp เพื่อไม่ต้อง fetch ซ้ำ) ──
  const [subjects, setSubjects] = useState([]);

  // ── User Course (หลักสูตรที่ user ลงทะเบียน) ──
  const [userCourse, setUserCourse] = useState('');

  // ── History ──
  const [historyList, setHistoryList]     = useState([]);
  const [historyDetail, setHistoryDetail] = useState(null); // { exam, detail }

  // ── Bookmarks ──
  const [bookmarks, setBookmarks] = useState(null); // null = not loaded yet

  // ── Question Bank Schedule ──
  const [questionBank, setQuestionBank] = useState(null);

  const navigate = useCallback((scr, params) => {
    setScreenParams(params || null);
    setScreen(scr);
  }, []);

  return (
    <AppContext.Provider value={{
      screen, navigate, screenParams,
      profile, setProfile,
      lineEmail, setLineEmail,
      isAdmin, setIsAdmin,
      isTeacher, setIsTeacher,
      theme, setTheme,
      settings, setSettings,
      exam, setExam,
      subjects, setSubjects,
      userCourse, setUserCourse,
      historyList, setHistoryList,
      historyDetail, setHistoryDetail,
      bookmarks, setBookmarks,
      questionBank, setQuestionBank,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
