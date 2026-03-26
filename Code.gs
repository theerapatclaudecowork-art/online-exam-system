// ============================================================
//  ระบบข้อสอบออนไลน์ - Google Apps Script (Pure API)
//  Deploy > New deployment > Web app
//  Execute as: Me  |  Who has access: Anyone
// ============================================================

const SPREADSHEET_ID  = '1mGAK8fLXEfMAQbqKXD35c5JIOzKQGKtCguM-SmrcutA';

const SHEET_USERS     = 'Users';
// Users  → A:lineUserId | B:lineDisplayName | C:status(active/inactive/pending)
//          D:fullName   | E:email           | F:phone | G:studentId | H:pictureUrl | I:วันที่สมัคร

const SHEET_QUESTIONS = 'Questions';
// Questions → A:id | B:คำถาม | C:ก | D:ข | E:ค | F:ง | G:คำตอบ(ข้อความ) | H:คำอธิบาย | I:หมวดหมู่

const SHEET_RESULTS   = 'Results';
// Results → A:วันที่เวลา | B:lineUserId | C:ชื่อ | D:email | E:วิชา
//           F:คะแนน | G:รวม | H:เปอร์เซ็นต์ | I:ผ่าน | J:เวลา(วิ) | K:examId | L:details(JSON)

const AUTO_APPROVE = true; // true = อนุมัติสมาชิกทันที | false = รออนุมัติจากแอดมิน

// ─────────────────────────────────────────
//  Entry Points
// ─────────────────────────────────────────
function doGet(e) {
  const p = e.parameter;
  return route(p.action || '', p, null);
}

function doPost(e) {
  let body = {};
  try {
    const ct = (e.postData.type || '').toLowerCase();
    body = (ct.includes('json') || ct.includes('text/plain'))
      ? JSON.parse(e.postData.contents)
      : e.parameter;
  } catch (_) { body = e.parameter || {}; }

  const action = body.action || e.parameter.action || '';
  return route(action, e.parameter, body);
}

function route(action, params, body) {
  try {
    switch (action) {
      case 'checkUser':        return json(checkUser(params.userId));
      case 'registerUser':     return json(registerUser(body || params));
      case 'getSubjects':      return json(getSubjects());
      case 'getQuestions':     return json(getQuestions(params.lesson));
      case 'saveResult':       return json(saveResult(body || params));
      case 'getHistory':       return json(getHistory(params.userId));
      case 'getHistoryDetail': return json(getHistoryDetail(params.examId));
      default:                 return json({ success: false, message: 'Unknown action: ' + action });
    }
  } catch (err) {
    return json({ success: false, message: err.toString() });
  }
}

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─────────────────────────────────────────
//  1. ตรวจสอบ LINE userId
// ─────────────────────────────────────────
function checkUser(lineUserId) {
  if (!lineUserId) return { success: false, status: 'error', message: 'ไม่พบข้อมูล userId' };

  const sheet = getSheet(SHEET_USERS);
  if (!sheet) return { success: false, status: 'error', message: 'ไม่พบ Sheet: ' + SHEET_USERS };

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const uid    = String(rows[i][0] || '').trim();
    const name   = String(rows[i][1] || '').trim();
    const status = String(rows[i][2] || '').toLowerCase().trim();

    if (uid !== String(lineUserId).trim()) continue;

    if (status === 'active')  return { success: true,  status: 'active',   user: { lineUserId: uid, name } };
    if (status === 'pending') return { success: false, status: 'pending',  message: 'รอการอนุมัติจากผู้ดูแลระบบ' };
    return { success: false, status: 'inactive', message: 'บัญชีนี้ถูกระงับ กรุณาติดต่อแอดมิน' };
  }

  return { success: false, status: 'notfound', message: 'ยังไม่ได้สมัครสมาชิก' };
}

// ─────────────────────────────────────────
//  2. สมัครสมาชิกใหม่
// ─────────────────────────────────────────
function registerUser(data) {
  const { userId, lineDisplayName, pictureUrl, fullName, email, phone, studentId } = data || {};

  if (!userId)   return { success: false, message: 'ไม่พบ userId' };
  if (!fullName) return { success: false, message: 'กรุณากรอกชื่อ-นามสกุล' };

  const sheet = getSheet(SHEET_USERS);
  if (!sheet) return { success: false, message: 'ไม่พบ Sheet: ' + SHEET_USERS };

  // ตรวจสอบว่าสมัครแล้วหรือยัง
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(userId).trim()) {
      const status = String(rows[i][2]).toLowerCase();
      if (status === 'active')  return { success: true,  status: 'active',  message: 'สมัครสมาชิกแล้ว' };
      if (status === 'pending') return { success: true,  status: 'pending', message: 'รอการอนุมัติ' };
      return { success: false, status: 'inactive', message: 'บัญชีถูกระงับ' };
    }
  }

  // เพิ่มสมาชิกใหม่
  const status = AUTO_APPROVE ? 'active' : 'pending';
  sheet.appendRow([
    String(userId).trim(),
    String(lineDisplayName || '').substring(0, 100),
    status,
    String(fullName).trim().substring(0, 100),
    String(email      || '').substring(0, 200),
    String(phone      || '').substring(0, 20),
    String(studentId  || '').substring(0, 50),
    String(pictureUrl || '').substring(0, 500),
    new Date(),
  ]);

  return { success: true, status };
}

// ─────────────────────────────────────────
//  3. ดึงรายวิชา (unique จากคอลัมน์ I ของ Questions)
// ─────────────────────────────────────────
function getSubjects() {
  const sheet = getSheet(SHEET_QUESTIONS);
  if (!sheet) return { success: false, subjects: [] };

  const rows     = sheet.getDataRange().getValues();
  const seen     = new Set();
  const subjects = [];

  for (let i = 1; i < rows.length; i++) {
    const cat = String(rows[i][8] || '').trim();  // col I
    if (cat && !seen.has(cat)) { seen.add(cat); subjects.push({ name: cat }); }
  }
  return { success: true, subjects };
}

// ─────────────────────────────────────────
//  4. ดึงข้อสอบตามวิชา → คืน array ตรง
// ─────────────────────────────────────────
function getQuestions(lesson) {
  const sheet = getSheet(SHEET_QUESTIONS);
  if (!sheet) return [];

  const rows      = sheet.getDataRange().getValues();
  const questions = [];

  for (let i = 1; i < rows.length; i++) {
    const [id, question, a, b, c, d, answer, explanation, subject] = rows[i];
    if (!question) continue;
    if (lesson && String(subject || '').trim() !== String(lesson).trim()) continue;

    const options = [a, b, c, d]
      .map(x => String(x || '').trim())
      .filter(x => x.length > 0);

    questions.push({
      id:          String(id || i),
      question:    String(question),
      options,
      answer:      String(answer || '').trim(),
      explanation: String(explanation || 'ไม่มีคำอธิบาย'),
    });
  }
  return questions;
}

// ─────────────────────────────────────────
//  5. บันทึกผลสอบ (พร้อม examId + detail ทุกข้อ)
// ─────────────────────────────────────────
function saveResult(data) {
  const { userId, displayName, email, lesson, score, total, timeUsed, detail } = data || {};

  // ── Validate required fields ──
  if (!userId)  return { success: false, message: 'ไม่พบ userId' };
  if (!lesson)  return { success: false, message: 'ไม่พบ lesson (วิชา)' };
  const sc  = Number(score);
  const tot = Number(total);
  if (isNaN(sc) || sc < 0)   return { success: false, message: 'score ไม่ถูกต้อง' };
  if (isNaN(tot) || tot <= 0) return { success: false, message: 'total ต้องมากกว่า 0' };
  if (sc > tot)               return { success: false, message: 'score ต้องไม่มากกว่า total' };

  // สร้าง / ตรวจสอบ Sheet
  let sheet = getSheet(SHEET_RESULTS);
  if (!sheet) {
    sheet = SpreadsheetApp.openById(SPREADSHEET_ID).insertSheet(SHEET_RESULTS);
    sheet.appendRow([
      'วันที่เวลา','lineUserId','ชื่อ','email','วิชา',
      'คะแนน','รวม','เปอร์เซ็นต์','ผ่าน','เวลา(วิ)','examId','details',
    ]);
    const hdr = sheet.getRange(1, 1, 1, 12);
    hdr.setFontWeight('bold');
    hdr.setBackground('#4a5568');
    hdr.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }

  const pct  = Math.round((sc / tot) * 100);
  const pass = pct >= 60 ? 'ผ่าน' : 'ไม่ผ่าน';

  const examId = Date.now() + '_' + String(userId).slice(-6);

  let detailStr = '[]';
  try {
    detailStr = typeof detail === 'string' ? detail : JSON.stringify(detail || []);
  } catch (_) {}

  const timeUsedNum = Math.max(0, Math.round(Number(timeUsed) || 0));

  sheet.appendRow([
    new Date(),
    String(userId).trim(),
    String(displayName || '').substring(0, 100),
    String(email       || '').substring(0, 200),
    String(lesson).trim().substring(0, 100),
    sc, tot, pct + '%', pass, timeUsedNum, examId, detailStr,
  ]);

  return { success: true, examId };
}

// ─────────────────────────────────────────
//  6. ดึงประวัติการสอบของ user (ไม่รวม details เพื่อประหยัด)
// ─────────────────────────────────────────
function getHistory(userId) {
  if (!userId) return { success: false, message: 'ไม่พบ userId' };

  const sheet = getSheet(SHEET_RESULTS);
  if (!sheet) return { success: true, history: [] };

  const rows    = sheet.getDataRange().getValues();
  const history = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (String(row[1]).trim() !== String(userId).trim()) continue;

    const examId = String(row[10] || '').trim() || ('legacy_' + i);
    history.push({
      date:     formatDate(row[0]),
      lesson:   String(row[4]  || ''),
      score:    Number(row[5]  || 0),
      total:    Number(row[6]  || 0),
      pct:      String(row[7]  || '0%'),
      pass:     String(row[8]  || ''),
      timeUsed: Number(row[9]  || 0),
      examId,
    });
  }

  history.reverse(); // ใหม่ก่อน
  return { success: true, history };
}

// ─────────────────────────────────────────
//  7. ดึงรายละเอียดการสอบ 1 ครั้ง (รวม detail ทุกข้อ)
// ─────────────────────────────────────────
function getHistoryDetail(examId) {
  if (!examId) return { success: false, message: 'ไม่พบ examId' };

  const sheet = getSheet(SHEET_RESULTS);
  if (!sheet) return { success: false, message: 'ไม่พบข้อมูล' };

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const eid = String(rows[i][10] || '').trim();
    if (eid !== String(examId).trim()) continue;

    let detail = [];
    try { detail = JSON.parse(rows[i][11] || '[]'); } catch (_) {}

    return {
      success: true,
      exam: {
        date:     formatDate(rows[i][0]),
        name:     String(rows[i][2] || ''),
        lesson:   String(rows[i][4] || ''),
        score:    Number(rows[i][5] || 0),
        total:    Number(rows[i][6] || 0),
        pct:      String(rows[i][7] || '0%'),
        pass:     String(rows[i][8] || ''),
        timeUsed: Number(rows[i][9] || 0),
      },
      detail,
    };
  }

  return { success: false, message: 'ไม่พบการสอบ examId: ' + examId };
}

// ─────────────────────────────────────────
//  Utility
// ─────────────────────────────────────────
function getSheet(name) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
}

function formatDate(d) {
  try {
    const dt = new Date(d);
    if (isNaN(dt)) return String(d);
    return Utilities.formatDate(dt, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
  } catch (_) { return String(d); }
}
