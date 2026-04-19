# AGENTS.md — กฎและนโยบายสำหรับ AI Agents

## ภาพรวมโปรเจกต์
ระบบข้อสอบออนไลน์ผ่าน LINE LIFF — สร้างด้วย React 18 + Vite (Frontend) และ Google Apps Script (Backend) โดยใช้ Google Sheets เป็นฐานข้อมูล

## Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, SweetAlert2, Canvas Confetti
- **Backend**: Google Apps Script (GAS) — REST API
- **Database**: Google Sheets
- **Auth**: LINE LIFF SDK
- **Hosting**: GitHub Pages (Frontend), Google Apps Script (Backend)
- **Deploy**: `npx vite build` + `npx gh-pages -d dist` (Frontend), `clasp push --force` + `clasp deploy` (Backend)

## กฎสำคัญ (MUST FOLLOW)

### 1. LINE LIFF
- ใช้ `liff.sendMessages()` เท่านั้น สำหรับส่ง Flex Message เข้าห้องแชท
- **ห้ามใช้** Push API หรือ LINE Messaging API จากฝั่ง server
- Flex Message ห้ามมี emoji ใน text fields, ค่าว่างต้องใส่ fallback `|| '-'`
- altText จำกัด 400 ตัวอักษร
- Footer URI ต้องเป็น `https://` เท่านั้น (ห้ามใช้ `#?page=...`)

### 2. Google Apps Script
- Deploy ด้วย deploymentId: `AKfycbyAHUNi-fnGgqaFsbmUCMM0N605S8peSkTpHlbC1mfEHQFhLwZZtMow1nLDgVXCxNC-Dg`
- ทุก API route อยู่ใน `doGet()` switch-case ไฟล์ `gas/Code.gs`
- การเพิ่ม route ใหม่: เพิ่ม case ใน `doGet()` แล้ว return `_json(result)`
- ข้อมูล Users sheet: col G (index 6) = course/หลักสูตร

### 3. Frontend
- ใช้ CSS Variables สำหรับ theme: `--text`, `--card`, `--card-border`, `--accent`, `--text-muted`, `--input-border`
- Navigation ผ่าน `navigate(screenName, params)` จาก AppContext
- ส่ง params ระหว่าง screen ด้วย `screenParams`
- Logo น้องพัสดุ: import จาก `../config` → `APP_LOGO`
- Role-based access: admin / teacher / user

### 4. คำตอบข้อสอบ
- ถ้า userAns หรือ correctAns เป็นค่าว่าง → ถือว่าตอบผิดเสมอ
- บังคับตอบทุกข้อก่อนส่งคำตอบ
- Auto-save คำตอบลง localStorage ด้วย key `quiz_autosave_{userId}_{setId|lesson}`

### 5. ภาษา
- UI ทั้งหมดเป็นภาษาไทย
- Comment ในโค้ดใช้ภาษาไทยหรืออังกฤษก็ได้
- ชื่อตัวแปร/ฟังก์ชันใช้ภาษาอังกฤษ

### 6. การ Deploy
- Frontend: `npx vite build && npx gh-pages -d dist`
- Backend: `cd gas && clasp push --force && clasp deploy --deploymentId AKfycbyAHUNi-fnGgqaFsbmUCMM0N605S8peSkTpHlbC1mfEHQFhLwZZtMow1nLDgVXCxNC-Dg`
- ห้าม deploy โดยไม่ build ก่อน
- ห้ามแก้ `DEV_PREVIEW = true` ตอน deploy จริง

## สิ่งที่ห้ามทำ
- ห้ามแก้ไข `config.js` โดยไม่แจ้งผู้ใช้ (มี credentials อยู่)
- ห้ามลบ/แก้ไข deploymentId
- ห้ามใช้ Push API แทน liff.sendMessages()
- ห้ามส่ง empty string ใน Flex Message text fields
