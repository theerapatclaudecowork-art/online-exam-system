// ============================================================
//  CONFIG — แก้ไขค่าเหล่านี้ก่อน deploy
// ============================================================
export const LIFF_ID = 'YOUR_LIFF_ID_HERE';     // จาก LINE Developer Console
export const GAS_URL = 'YOUR_GAS_EXEC_URL_HERE'; // จาก Google Apps Script > Deploy

export const PASS_THRESHOLD = 60;   // เกณฑ์ผ่าน (%)
export const AUTO_APPROVE   = true; // true = อนุมัติสมาชิกทันที | false = รออนุมัติจากแอดมิน

// ── Dev Preview Mode ──────────────────────────────────────
// ตั้ง DEV_PREVIEW = true เพื่อ bypass LINE LIFF ระหว่าง dev
// ห้ามเปิดตอน deploy จริง
export const DEV_PREVIEW = true;
export const DEV_PROFILE = {
  userId:      'U_preview_dev',
  displayName: 'ผู้ใช้ทดสอบ',
  pictureUrl:  'https://i.pravatar.cc/150?img=32',
};
