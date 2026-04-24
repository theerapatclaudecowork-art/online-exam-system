// ============================================================
//  CONFIG — แก้ไขค่าเหล่านี้ก่อน deploy
// ============================================================
export const LIFF_ID = '2006455439-ctBQV5VL';     // จาก LINE Developer Console
export const GAS_URL = 'https://script.google.com/macros/s/AKfycbw-_us-E_49h1cEPkjEGAi5-BMwYNYma4hflex-mP9hwCNvwPOs9qtXdm_W4gToz9bvyw/exec'; // @108 — dept-analytics + LINE-push-approval + admin-error-banners

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
