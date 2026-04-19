# Google Sheets Schema — โครงสร้างฐานข้อมูล

## Users Sheet
| Column | Index | Field | คำอธิบาย |
|--------|-------|-------|---------|
| A | 0 | lineUserId | LINE User ID (primary key) |
| B | 1 | displayName | ชื่อที่แสดง |
| C | 2 | pictureUrl | URL รูปโปรไฟล์ |
| D | 3 | role | สิทธิ์: admin / teacher / user |
| E | 4 | status | สถานะ: approved / pending |
| F | 5 | registeredAt | วันที่ลงทะเบียน |
| G | 6 | course | หลักสูตรที่ลงทะเบียน |

## Lessons Sheet
| Column | Index | Field | คำอธิบาย |
|--------|-------|-------|---------|
| A | 0 | lessonId | รหัสบทเรียน (auto-generate) |
| B | 1 | title | ชื่อบทเรียน |
| C | 2 | description | คำอธิบายสั้น |
| D | 3 | content | เนื้อหาเต็ม (รองรับ HTML) |
| E | 4 | videoUrl | URL วิดีโอ (YouTube หรืออื่นๆ) |
| F | 5 | imageUrl | URL รูปปก |
| G | 6 | course | หลักสูตร (filter ตาม user) |
| H | 7 | sortOrder | ลำดับการแสดงผล |
| I | 8 | isEnabled | เปิด/ปิดการแสดงผล (TRUE/FALSE) |

## ExamSets Sheet
| Column | Field | คำอธิบาย |
|--------|-------|---------|
| A | setId | รหัสชุดข้อสอบ |
| B | title | ชื่อชุดข้อสอบ |
| C | subject | วิชา |
| D | course | หลักสูตร |
| ... | ... | ... |

## Results Sheet
| Column | Field | คำอธิบาย |
|--------|-------|---------|
| A | resultId | รหัสผลสอบ |
| B | userId | LINE User ID |
| C | setId | ชุดข้อสอบ |
| D | score | คะแนนที่ได้ |
| E | total | คะแนนเต็ม |
| F | percentage | เปอร์เซ็นต์ |
| ... | ... | ... |

## Courses Sheet
- รายชื่อหลักสูตรทั้งหมด (ใช้ใน dropdown)

## Subjects Sheet
- รายชื่อวิชาทั้งหมด (ใช้ใน dropdown)
