// ============================================================
//  ระบบข้อสอบออนไลน์ - Google Apps Script (Pure API)
//  Deploy > New deployment > Web app
//  Execute as: Me  |  Who has access: Anyone
// ============================================================

const SPREADSHEET_ID  = '1mGAK8fLXEfMAQbqKXD35c5JIOzKQGKtCguM-SmrcutA';

const SHEET_USERS     = 'Users';
// Users  → A:lineUserId | B:lineDisplayName | C:status(active/inactive/pending)
//          D:fullName   | E:email           | F:phone | G:studentId | H:pictureUrl | I:วันที่สมัคร | J:role(admin/'')

const SHEET_QUESTIONS = 'Questions';
// Questions → A:id | B:คำถาม | C:ก | D:ข | E:ค | F:ง | G:คำตอบ(ข้อความ) | H:คำอธิบาย | I:หมวดหมู่

const SHEET_RESULTS   = 'Results';
// Results → A:วันที่เวลา | B:lineUserId | C:ชื่อ | D:email | E:วิชา
//           F:คะแนน | G:รวม | H:เปอร์เซ็นต์ | I:ผ่าน | J:เวลา(วิ) | K:examId | L:details(JSON)

const AUTO_APPROVE = true; // true = อนุมัติสมาชิกทันที | false = รออนุมัติจากแอดมิน

// LINE Messaging API — ใช้ดึงโปรไฟล์ user จาก LINE
const LINE_CHANNEL_TOKEN = '9XJFiPwZV8Rfiz+YJm1PD0qAHX9JBTSZmZ08U/ieuNwuHlEg+VuKvIoQn3MqiR308ox/ehTBuQecDTtp8gKHl+7SdOe8gwCnCgrAJKdda0K3W+PklprSr9mYHFKElTf7HVAvKKbyGfoRy51I4dXUQwdB04t89/1O/w1cDnyilFU=';

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
      case 'getAdminStats':    return json(getAdminStats(params.userId));
      case 'getMembers':       return json(getMembers(params.userId));
      case 'updateMember':     return json(updateMember(body));
      case 'deleteMember':     return json(deleteMember(body));
      case 'getAllResults':     return json(getAllResults(params.userId, params.page));
      case 'getAllQuestions':   return json(getAllQuestions(params.userId));
      case 'addQuestion':      return json(addQuestion(body));
      case 'updateQuestion':   return json(updateQuestion(body));
      case 'deleteQuestion':      return json(deleteQuestion(body));
      case 'getLineProfile':      return json(getLineProfile(params.userId, params.callerUserId));
      case 'syncAllLineProfiles': return json(syncAllLineProfiles(params.userId));
      default:                    return json({ success: false, message: 'Unknown action: ' + action });
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

    const role = String(rows[i][9] || '').toLowerCase().trim();
    if (status === 'active')  return { success: true,  status: 'active',   user: { lineUserId: uid, name }, role: role === 'admin' ? 'admin' : 'user' };
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
    const [id, question, a, b, c, d, answer, explanation, subject, imageUrl] = rows[i];
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
      imageUrl:    String(imageUrl || '').trim(),
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
//  Admin Functions
// ─────────────────────────────────────────
function isAdmin(userId) {
  if (!userId) return false;
  const sheet = getSheet(SHEET_USERS);
  if (!sheet) return false;
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(userId).trim()) {
      return String(rows[i][9] || '').toLowerCase().trim() === 'admin';
    }
  }
  return false;
}

function getAdminStats(callerUserId) {
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  const users = getSheet(SHEET_USERS);
  const questions = getSheet(SHEET_QUESTIONS);
  const results = getSheet(SHEET_RESULTS);

  const userRows = users ? users.getDataRange().getValues().slice(1) : [];
  const totalMembers = userRows.length;
  const activeMembers = userRows.filter(r => String(r[2]).toLowerCase() === 'active').length;
  const pendingMembers = userRows.filter(r => String(r[2]).toLowerCase() === 'pending').length;
  const inactiveMembers = userRows.filter(r => String(r[2]).toLowerCase() === 'inactive').length;

  const qRows = questions ? questions.getDataRange().getValues().slice(1).filter(r => r[1]) : [];
  const totalQuestions = qRows.length;
  const subjects = {};
  qRows.forEach(r => {
    const s = String(r[8] || '').trim();
    if (s) subjects[s] = (subjects[s] || 0) + 1;
  });

  const rRows = results ? results.getDataRange().getValues().slice(1) : [];
  const totalExams = rRows.length;
  const passCount = rRows.filter(r => String(r[8]) === 'ผ่าน').length;
  const avgPassRate = totalExams > 0 ? Math.round((passCount / totalExams) * 100) : 0;

  // subject stats
  const subjectMap = {};
  rRows.forEach(r => {
    const s = String(r[4] || '').trim();
    if (!s) return;
    if (!subjectMap[s]) subjectMap[s] = { count: 0, pass: 0 };
    subjectMap[s].count++;
    if (String(r[8]) === 'ผ่าน') subjectMap[s].pass++;
  });
  const subjectStats = Object.entries(subjectMap)
    .map(([name, v]) => ({ name, count: v.count, passRate: Math.round((v.pass / v.count) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { success: true, totalMembers, activeMembers, pendingMembers, inactiveMembers, totalQuestions, totalExams, avgPassRate, subjectStats };
}

function getMembers(callerUserId) {
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  const sheet = getSheet(SHEET_USERS);
  if (!sheet) return { success: true, members: [] };
  const rows = sheet.getDataRange().getValues();
  const members = [];
  for (let i = 1; i < rows.length; i++) {
    members.push({
      lineUserId:  String(rows[i][0] || ''),
      displayName: String(rows[i][1] || ''),
      status:      String(rows[i][2] || ''),
      fullName:    String(rows[i][3] || ''),
      email:       String(rows[i][4] || ''),
      phone:       String(rows[i][5] || ''),
      studentId:   String(rows[i][6] || ''),
      pictureUrl:  String(rows[i][7] || ''),
      joinDate:    formatDate(rows[i][8]),
      role:        String(rows[i][9] || ''),
      rowIndex:    i + 1,
    });
  }
  return { success: true, members };
}

function updateMember(body) {
  const { callerUserId, targetUserId, newStatus } = body || {};
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  if (!targetUserId || !newStatus) return { success: false, message: 'ข้อมูลไม่ครบ' };
  const allowed = ['active', 'inactive', 'pending'];
  if (!allowed.includes(newStatus)) return { success: false, message: 'สถานะไม่ถูกต้อง' };

  const sheet = getSheet(SHEET_USERS);
  if (!sheet) return { success: false, message: 'ไม่พบ Sheet' };
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(targetUserId).trim()) {
      sheet.getRange(i + 1, 3).setValue(newStatus);
      return { success: true };
    }
  }
  return { success: false, message: 'ไม่พบผู้ใช้' };
}

function deleteMember(body) {
  const { callerUserId, targetUserId } = body || {};
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  if (!targetUserId) return { success: false, message: 'ไม่พบ targetUserId' };
  if (callerUserId === targetUserId) return { success: false, message: 'ไม่สามารถลบตัวเองได้' };

  const sheet = getSheet(SHEET_USERS);
  if (!sheet) return { success: false, message: 'ไม่พบ Sheet' };
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(targetUserId).trim()) {
      if (String(rows[i][9]).toLowerCase().trim() === 'admin') {
        return { success: false, message: 'ไม่สามารถลบแอดมินได้' };
      }
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, message: 'ไม่พบผู้ใช้' };
}

function getAllResults(callerUserId, page) {
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  const sheet = getSheet(SHEET_RESULTS);
  if (!sheet) return { success: true, results: [], total: 0 };

  const allRows = sheet.getDataRange().getValues().slice(1).reverse();
  const total = allRows.length;
  const pageNum = Math.max(0, parseInt(page) || 0);
  const pageSize = 50;
  const rows = allRows.slice(pageNum * pageSize, (pageNum + 1) * pageSize);

  const results = rows.map(r => ({
    date:     formatDate(r[0]),
    userId:   String(r[1] || ''),
    name:     String(r[2] || ''),
    lesson:   String(r[4] || ''),
    score:    Number(r[5] || 0),
    total:    Number(r[6] || 0),
    pct:      String(r[7] || '0%'),
    pass:     String(r[8] || ''),
    timeUsed: Number(r[9] || 0),
    examId:   String(r[10] || ''),
  }));

  return { success: true, results, total, pages: Math.ceil(total / pageSize) };
}

function getAllQuestions(callerUserId) {
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  const sheet = getSheet(SHEET_QUESTIONS);
  if (!sheet) return { success: true, questions: [] };
  const rows = sheet.getDataRange().getValues().slice(1);
  const questions = rows
    .filter(r => r[1])
    .map((r, i) => ({
      rowIndex:    i + 2,
      id:          String(r[0] || ''),
      question:    String(r[1] || ''),
      a:           String(r[2] || ''),
      b:           String(r[3] || ''),
      c:           String(r[4] || ''),
      d:           String(r[5] || ''),
      answer:      String(r[6] || ''),
      explanation: String(r[7] || ''),
      subject:     String(r[8] || ''),
      imageUrl:    String(r[9] || ''),
    }));
  return { success: true, questions };
}

function addQuestion(body) {
  const { callerUserId, question, a, b, c, d, answer, explanation, subject, imageUrl } = body || {};
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  if (!question || !a || !answer || !subject) return { success: false, message: 'กรุณากรอกข้อมูลให้ครบ' };
  const sheet = getSheet(SHEET_QUESTIONS);
  if (!sheet) return { success: false, message: 'ไม่พบ Sheet' };
  const id = 'Q' + Date.now();
  sheet.appendRow([id, question, a, b||'', c||'', d||'', answer, explanation||'', subject, imageUrl||'']);
  return { success: true, id };
}

function updateQuestion(body) {
  const { callerUserId, id, question, a, b, c, d, answer, explanation, subject, imageUrl } = body || {};
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  if (!id) return { success: false, message: 'ไม่พบ id' };
  const sheet = getSheet(SHEET_QUESTIONS);
  if (!sheet) return { success: false, message: 'ไม่พบ Sheet' };
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(id).trim()) {
      sheet.getRange(i + 1, 2, 1, 9).setValues([[
        question, a, b||'', c||'', d||'', answer, explanation||'', subject, imageUrl||''
      ]]);
      return { success: true };
    }
  }
  return { success: false, message: 'ไม่พบข้อสอบ id: ' + id };
}

function deleteQuestion(body) {
  const { callerUserId, id } = body || {};
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  if (!id) return { success: false, message: 'ไม่พบ id' };
  const sheet = getSheet(SHEET_QUESTIONS);
  if (!sheet) return { success: false, message: 'ไม่พบ Sheet' };
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(id).trim()) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, message: 'ไม่พบข้อสอบ' };
}

// ─────────────────────────────────────────
//  LINE API — ดึงโปรไฟล์จาก LINE
// ─────────────────────────────────────────

// ดึงโปรไฟล์ user 1 คน จาก LINE API
function fetchLineProfile(lineUserId) {
  try {
    const res = UrlFetchApp.fetch(
      'https://api.line.me/v2/bot/profile/' + encodeURIComponent(lineUserId),
      {
        method: 'get',
        headers: { 'Authorization': 'Bearer ' + LINE_CHANNEL_TOKEN },
        muteHttpExceptions: true,
      }
    );
    const code = res.getResponseCode();
    if (code !== 200) return null;
    return JSON.parse(res.getContentText());
  } catch (_) { return null; }
}

// ดึงโปรไฟล์ user 1 คน (เรียกจาก client)
function getLineProfile(targetUserId, callerUserId) {
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  if (!targetUserId) return { success: false, message: 'ไม่พบ userId' };
  const profile = fetchLineProfile(targetUserId);
  if (!profile) return { success: false, message: 'ไม่พบข้อมูลใน LINE (อาจยังไม่ได้เพิ่มบอทเป็นเพื่อน)' };
  return { success: true, profile };
}

// Sync โปรไฟล์ทุกคนจาก LINE API แล้วอัปเดต Sheets
function syncAllLineProfiles(callerUserId) {
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };

  const sheet = getSheet(SHEET_USERS);
  if (!sheet) return { success: false, message: 'ไม่พบ Sheet' };

  const rows = sheet.getDataRange().getValues();
  const updated = [];
  const failed  = [];

  for (let i = 1; i < rows.length; i++) {
    const uid = String(rows[i][0] || '').trim();
    if (!uid) continue;

    const profile = fetchLineProfile(uid);
    if (!profile) {
      failed.push(uid);
      continue;
    }

    // อัปเดต displayName (col B) และ pictureUrl (col H) จาก LINE API
    if (profile.displayName) sheet.getRange(i + 1, 2).setValue(profile.displayName);
    if (profile.pictureUrl)  sheet.getRange(i + 1, 8).setValue(profile.pictureUrl);

    updated.push({
      userId:        uid,
      displayName:   profile.displayName   || '',
      pictureUrl:    profile.pictureUrl    || '',
      statusMessage: profile.statusMessage || '',
      language:      profile.language      || '',
      rowIndex:      i,
    });

    // หน่วงเล็กน้อยเพื่อไม่ให้ rate limit
    Utilities.sleep(100);
  }

  return {
    success: true,
    updatedCount: updated.length,
    failedCount:  failed.length,
    profiles:     updated,
    failed,
  };
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
