# Architecture — สถาปัตยกรรมระบบ

## ภาพรวม
```
[ผู้ใช้] → [LINE App] → [LIFF Web App (React)] → [GAS REST API] → [Google Sheets]
```

## การทำงาน

### Authentication Flow
1. ผู้ใช้เปิด LIFF URL ใน LINE
2. `liff.init()` → `liff.getProfile()` → ได้ userId, displayName, pictureUrl
3. เรียก `checkUser(userId)` ไป GAS
4. GAS ตรวจ Users sheet:
   - พบ + approved → เข้าใช้งาน (role: admin/teacher/user)
   - พบ + pending → หน้ารออนุมัติ
   - ไม่พบ → หน้าลงทะเบียน

### Navigation
- ไม่ใช้ React Router (เป็น LIFF app ใน LINE WebView)
- ใช้ `navigate(screenName, params)` จาก AppContext
- `screenParams` ส่งข้อมูลระหว่าง screen (เช่น lessonId)
- Bottom Navigation Bar แสดงเมนูหลัก

### State Management
- AppContext (React Context) เก็บ: profile, screen, role, exam settings, userCourse, screenParams
- localStorage สำหรับ auto-save คำตอบข้อสอบ

### Quiz Flow
1. เลือกชุดข้อสอบ → ตั้งค่า (จำนวนข้อ, สุ่ม, จับเวลา)
2. เข้าห้องสอบ → ทำข้อสอบ (auto-save ทุกครั้งที่ตอบ)
3. ส่งคำตอบ → GAS ตรวจ → คืนคะแนน + attemptCount
4. แสดงคะแนน → ส่ง Flex Message เข้า LINE chat ด้วย `liff.sendMessages()`
5. ดูเฉลย (ถ้าเปิด)

### Lesson Flow
1. SetupScreen → กดเมนูบทเรียน
2. LessonScreen → แสดงรายการตาม userCourse
3. LessonDetailScreen → เนื้อหา, วิดีโอ YouTube, รูปภาพ

### Role Permissions
| Feature | user | teacher | admin |
|---------|------|---------|-------|
| ทำข้อสอบ | ✅ | ✅ | ✅ |
| ดูบทเรียน | ✅ | ✅ | ✅ |
| จัดการบทเรียน | ❌ | ✅ | ✅ |
| จัดการข้อสอบ | ❌ | ✅ | ✅ |
| จัดการสมาชิก | ❌ | ❌ | ✅ |
| ดูสถิติภาพรวม | ❌ | ✅ | ✅ |
