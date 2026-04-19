# Known Issues — ปัญหาที่เคยเจอและวิธีแก้

## 1. Flex Message: invalid_message
**สาเหตุ**: `liff.sendMessages()` เข้มงวดกว่า Push API
**แก้ไข**:
- ห้ามใส่ emoji ใน text fields
- ค่าว่างต้องมี fallback: `value || '-'`
- altText จำกัด 400 ตัวอักษร: `.slice(0, 400)`
- Footer URI ต้องเป็น `https://` (ห้าม `#?page=...`)
- ถ้าไม่มี LIFF_ID → ไม่ต้องสร้าง footer

## 2. คะแนนเต็มเมื่อส่งคำตอบว่าง
**สาเหตุ**: `userAns = ''` && `correctAns = ''` → `'' === ''` = true
**แก้ไข**: เพิ่มเงื่อนไข `if (!userAns || !correctAns) { isRight = false; }` ก่อนเปรียบเทียบ

## 3. Analytics "ไม่พบผู้ใช้นี้"
**สาเหตุ**: `getMembers` คืน field `lineUserId` แต่โค้ดใช้ `m.userId` → undefined
**แก้ไข**: เปลี่ยนเป็น `m.lineUserId`

## 4. Vite chunk size warning
**สถานะ**: ยังมี warning (728 KB > 500 KB limit)
**แนวทาง**: สามารถใช้ dynamic import() หรือ manualChunks ในอนาคต — ยังไม่กระทบการใช้งาน

## 5. Quiz auto-save key mismatch
**สาเหตุ**: ถ้า resume ด้วย shuffleQ/shuffleOpt ต่างจากตอนเซฟ → key ไม่ตรง
**แก้ไข**: Resume ใช้ `shuffleQ: false, shuffleOpt: false` เสมอ
