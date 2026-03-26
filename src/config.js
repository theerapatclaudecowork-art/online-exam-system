// ============================================================
//  CONFIG — แก้ไขค่าเหล่านี้ก่อน deploy
// ============================================================
export const LIFF_ID = '2006455439-ctBQV5VL';     // จาก LINE Developer Console
export const GAS_URL = 'https://script.google.com/macros/s/AKfycbyFH5DPtyh40spMMdmG-H7E6PmZWl7VPs4VRZkhIOI7LLQQpk2Tj2WPxE0-mhGz0oXzUQ/exec';

export const PASS_THRESHOLD = 60;   // เกณฑ์ผ่าน (%)
export const AUTO_APPROVE   = true; // true = อนุมัติสมาชิกทันที | false = รออนุมัติจากแอดมิน

// ── Dev Preview Mode ──────────────────────────────────────
// ตั้ง DEV_PREVIEW = true เพื่อ bypass LINE LIFF ระหว่าง dev
// ห้ามเปิดตอน deploy จริง
export const DEV_PREVIEW = false;
export const DEV_PROFILE = {
  userId:      'U_preview_dev',
  displayName: 'ผู้ใช้ทดสอบ',
  pictureUrl:  'https://i.pravatar.cc/150?img=32',
};
