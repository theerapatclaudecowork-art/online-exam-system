# Repo Tree — โครงสร้างโปรเจกต์

```
ระบบข้อสอบ/
├── .agents/                    # Context สำหรับ AI agents
│   ├── AGENTS.md               # กฎและนโยบาย
│   ├── active.md               # สถานะงานปัจจุบัน
│   ├── repo-tree.md            # ไฟล์นี้
│   ├── sessions/               # จุดตรวจสอบงาน
│   ├── topics/                 # บันทึกย่อระยะยาว
│   └── private/                # บันทึกส่วนตัว
│
├── gas/                        # Google Apps Script (Backend)
│   ├── Code.gs                 # API routes ทั้งหมด (doGet, doPost)
│   └── appsscript.json         # GAS config
│
├── src/                        # React Frontend
│   ├── main.jsx                # Entry point
│   ├── App.jsx                 # Router — screen mapping + bottom nav
│   ├── config.js               # LIFF_ID, GAS_URL, APP_LOGO, DEV_PREVIEW
│   ├── index.css               # Global styles + CSS Variables
│   │
│   ├── context/
│   │   └── AppContext.jsx      # Global state: auth, profile, navigate, screenParams
│   │
│   ├── utils/
│   │   ├── api.js              # apiGet(), apiPost() wrapper สำหรับ GAS
│   │   └── helpers.js          # Utility functions
│   │
│   ├── screens/                # หน้าจอทั้งหมด
│   │   ├── AuthScreen.jsx      # หน้า Login (LIFF auth)
│   │   ├── RegisterScreen.jsx  # หน้าลงทะเบียน
│   │   ├── PendingScreen.jsx   # รออนุมัติสมาชิก
│   │   ├── SetupScreen.jsx     # หน้าหลัก — เมนูบทเรียน + ข้อสอบ
│   │   ├── LessonScreen.jsx    # รายการบทเรียน (ตาม course)
│   │   ├── LessonDetailScreen.jsx # รายละเอียดบทเรียน (วิดีโอ, เนื้อหา)
│   │   ├── ExamSetScreen.jsx   # เลือกชุดข้อสอบ
│   │   ├── QuizScreen.jsx      # ห้องสอบ (ทำข้อสอบ)
│   │   ├── ScoreScreen.jsx     # แสดงคะแนน + ส่ง Flex Message
│   │   ├── ReviewScreen.jsx    # เฉลยข้อสอบ
│   │   ├── HistoryScreen.jsx   # ประวัติการสอบ
│   │   ├── HistoryDetailScreen.jsx # รายละเอียดผลสอบ
│   │   ├── ProfileScreen.jsx   # ข้อมูลสมาชิก
│   │   ├── LeaderboardScreen.jsx   # อันดับคะแนน
│   │   ├── ExamSetLeaderboardScreen.jsx # อันดับแยกชุดข้อสอบ
│   │   ├── MyStatsScreen.jsx   # สถิติส่วนตัว
│   │   ├── BookmarkScreen.jsx  # บุ๊คมาร์ค
│   │   ├── CertificateScreen.jsx   # ใบประกาศ
│   │   ├── ReportCardScreen.jsx    # ใบรายงานผล
│   │   ├── StudyScreen.jsx     # โหมดอ่านทบทวน
│   │   ├── DrillScreen.jsx     # โหมดฝึกซ้อม
│   │   ├── SubjectScreen.jsx   # เลือกวิชา
│   │   ├── MessageInboxScreen.jsx  # กล่องข้อความ
│   │   ├── AdminScreen.jsx     # แผงควบคุมแอดมิน (CRUD ทั้งหมด)
│   │   ├── TeacherScreen.jsx   # แผงควบคุมครู
│   │   ├── ExamSetManagerScreen.jsx    # จัดการชุดข้อสอบ
│   │   └── QuestionManagerScreen.jsx   # จัดการคำถาม
│   │
│   └── components/             # Components ที่ใช้ร่วม
│       ├── Donut.jsx           # วงกลมแสดงเปอร์เซ็นต์
│       ├── ExamSettingsSheet.jsx # Modal ตั้งค่าสอบ (centered)
│       ├── GeminiQuizGenerator.jsx # สร้างข้อสอบด้วย Gemini AI
│       ├── ImageUploader.jsx   # อัพโหลดรูป
│       ├── LessonManager.jsx   # CRUD บทเรียน (admin/teacher)
│       ├── Paginator.jsx       # Pagination
│       ├── Spinner.jsx         # Loading spinner
│       ├── SubjectManager.jsx  # จัดการวิชา
│       └── charts/             # กราฟสถิติ
│           ├── ChartBase.jsx
│           ├── Bar3DChart.jsx
│           ├── ClusteredBarChart.jsx
│           ├── DonutChart.jsx
│           ├── HBarChart.jsx
│           ├── LineChart.jsx
│           ├── RadarChart.jsx
│           ├── StatsCharts.jsx
│           └── VBarChart.jsx
│
├── public/                     # Static files
├── dist/                       # Build output → deploy to GitHub Pages
├── index.html                  # HTML template
├── package.json                # Dependencies + scripts
├── vite.config.js              # Vite config (base: /online-exam-system/)
├── tailwind.config.js          # Tailwind config
├── postcss.config.js           # PostCSS config
└── .clasp.json                 # Google Apps Script clasp config
```

## Google Sheets (Database)

| Sheet | คำอธิบาย |
|-------|---------|
| Users | สมาชิกทั้งหมด — col G = course/หลักสูตร |
| Questions | คลังข้อสอบ |
| ExamSets | ชุดข้อสอบ |
| Results | ผลการสอบ |
| Courses | รายชื่อหลักสูตร |
| Subjects | รายชื่อวิชา |
| Lessons | บทเรียน — lessonId, title, description, content, videoUrl, imageUrl, course, sortOrder, isEnabled |
| Bookmarks | บุ๊คมาร์คข้อสอบ |
| Messages | ข้อความ/ประกาศ |

## API Routes (GAS doGet)

| action | คำอธิบาย |
|--------|---------|
| checkUser | ตรวจสอบ/ดึงข้อมูลผู้ใช้ |
| register | ลงทะเบียนสมาชิกใหม่ |
| getExamSets | รายชื่อชุดข้อสอบ |
| getQuestions | ดึงคำถามตามชุดข้อสอบ |
| saveResult | บันทึกผลสอบ + คืน attemptCount |
| getResults | ประวัติผลสอบ |
| getLessons | รายการบทเรียน (filter by course) |
| getLessonDetail | รายละเอียดบทเรียน |
| addLesson | เพิ่มบทเรียน (admin/teacher) |
| updateLesson | แก้ไขบทเรียน (admin/teacher) |
| deleteLesson | ลบบทเรียน (admin/teacher) |
| getMembers | รายชื่อสมาชิก (admin) |
| ... | และ routes อื่นๆ |
