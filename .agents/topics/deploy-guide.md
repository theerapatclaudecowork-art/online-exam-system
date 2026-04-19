# Deploy Guide — คู่มือการ Deploy

## Frontend (GitHub Pages)

### Build & Deploy
```bash
cd D:\ระบบข้อสอบ
npx vite build
npx gh-pages -d dist
```

### URL
- GitHub Pages: `https://<username>.github.io/online-exam-system/`
- Base path กำหนดใน `vite.config.js` → `base: '/online-exam-system/'`

## Backend (Google Apps Script)

### Push & Deploy
```bash
cd D:\ระบบข้อสอบ\gas
clasp push --force
clasp deploy --deploymentId AKfycbyAHUNi-fnGgqaFsbmUCMM0N605S8peSkTpHlbC1mfEHQFhLwZZtMow1nLDgVXCxNC-Dg
```

### URL
- GAS URL อยู่ใน `src/config.js` → `GAS_URL`
- ใช้ deploymentId คงที่ (ไม่ต้องเปลี่ยน URL ที่ frontend)

## สิ่งที่ต้องระวัง
1. ห้ามลืม build ก่อน deploy frontend
2. ห้ามเปิด `DEV_PREVIEW = true` ตอน deploy จริง
3. หลัง clasp push → ต้อง clasp deploy ด้วย ไม่งั้น code ไม่อัพเดท
4. GAS deploy version จะเพิ่มขึ้นทุกครั้ง (ปัจจุบัน @94)

## LINE LIFF
- LIFF ID: `2006455439-ctBQV5VL`
- ตั้งค่าที่ LINE Developer Console
- Endpoint URL ชี้ไป GitHub Pages URL
