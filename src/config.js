// ============================================================
//  CONFIG — แก้ไขค่าเหล่านี้ก่อน deploy
// ============================================================
export const LIFF_ID = '2006455439-ctBQV5VL';     // จาก LINE Developer Console
export const GAS_URL = 'https://script.google.com/macros/s/AKfycbxkcWqzwcU0QtIbGpYlKJz8CikjCo86U3uS_Smb_q4VU0MaPP-Y9R_QjhWhvDeA8y2-SQ/exec'; // @109 — submitUserMessage + user error handling

export const PASS_THRESHOLD = 60;   // เกณฑ์ผ่าน (%)
export const AUTO_APPROVE   = false; // true = อนุมัติสมาชิกทันที | false = รออนุมัติจากแอดมิน

// ── Logo น้องพัสดุ ──
export const APP_LOGO = 'https://lh3.googleusercontent.com/d/1AjbXyjJjdczeorJHCiwVLaEB7sVwMS10';
export const FALLBACK_AVATAR = APP_LOGO;

// ── Dev Preview Mode ──────────────────────────────────────
// ตั้ง DEV_PREVIEW = true เพื่อ bypass LINE LIFF ระหว่าง dev
// ห้ามเปิดตอน deploy จริง
export const DEV_PREVIEW = false;
export const DEV_PROFILE = {
  userId:      'U_preview_dev',
  displayName: 'ผู้ใช้ทดสอบ',
  pictureUrl:  'https://i.pravatar.cc/150?img=32',
};
