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
const SHEET_EXAMSETS  = 'ExamSets';
// ExamSets → A:setId | B:setName | C:description | D:subjects(JSON)
//            E:status(active/draft/inactive) | F:visibility(public/private)
//            G:allowedUsers(csv userId) | H:maxAttempts(0=∞) | I:timerMin | J:passThreshold
//            K:setOrder | L:createdAt | M:createdBy
// Results → A:วันที่เวลา | B:lineUserId | C:ชื่อ | D:email | E:วิชา
//           F:คะแนน | G:รวม | H:เปอร์เซ็นต์ | I:ผ่าน | J:เวลา(วิ) | K:examId | L:details(JSON)

const AUTO_APPROVE = true; // true = อนุมัติสมาชิกทันที | false = รออนุมัติจากแอดมิน

// LINE Messaging API — ใช้ดึงโปรไฟล์ user จาก LINE
const LINE_CHANNEL_TOKEN = '9XJFiPwZV8Rfiz+YJm1PD0qAHX9JBTSZmZ08U/ieuNwuHlEg+VuKvIoQn3MqiR308ox/ehTBuQecDTtp8gKHl+7SdOe8gwCnCgrAJKdda0K3W+PklprSr9mYHFKElTf7HVAvKKbyGfoRy51I4dXUQwdB04t89/1O/w1cDnyilFU=';
const LIFF_ID            = '2006455439-ctBQV5VL'; // LIFF ID สำหรับลิงก์ใน Flex Message

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

// ─────────────────────────────────────────
//  Cache helper (GAS CacheService)
//  key: string, fetchFn: function → data, ttl: seconds (max 21600)
// ─────────────────────────────────────────
function gCache(key, fetchFn, ttl) {
  const cache = CacheService.getScriptCache();
  const hit   = cache.get(key);
  if (hit) {
    try { return JSON.parse(hit); } catch (_) {}
  }
  const data = fetchFn();
  try { cache.put(key, JSON.stringify(data), ttl || 120); } catch (_) {}
  return data;
}

function invalidateCache(key) {
  try { CacheService.getScriptCache().remove(key); } catch (_) {}
}

function route(action, params, body) {
  try {
    switch (action) {
      case 'initApp':          return json(initApp(params.userId));           // ← NEW: 1 call แทน 2
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
      case 'getMemberDetail':  return json(getMemberDetail(body));
      case 'deleteMember':     return json(deleteMember(body));
      case 'getAllResults':     return json(getAllResults(params.userId, params.page));
      case 'getAllQuestions':   return json(getAllQuestions(params.userId));
      case 'addQuestion':      return json(addQuestion(body));
      case 'updateQuestion':   return json(updateQuestion(body));
      case 'deleteQuestion':      return json(deleteQuestion(body));
      // ── ExamSets ──────────────────────────────────────────
      case 'getExamSets':          return json(getExamSets(params.userId));
      case 'getAdminExamSets':     return json(getAdminExamSets(params.userId));
      case 'getExamSetQuestions':  return json(getExamSetQuestions(params.setId, params.userId));
      case 'createExamSet':        return json(createExamSet(body));
      case 'updateExamSet':        return json(updateExamSet(body));
      case 'deleteExamSet':        return json(deleteExamSet(body));
      case 'assignExamSet':        return json(assignExamSet(body));
      case 'getExamSetDetail':     return json(getExamSetDetail(params.callerUserId, params.setId));
      // ─────────────────────────────────────────────────────
      case 'getLineProfile':         return json(getLineProfile(params.userId, params.callerUserId));
      case 'syncAllLineProfiles':    return json(syncAllLineProfiles(params.userId));
      case 'getMembersWithProfiles': return json(getMembersWithProfiles(params.userId));
      case 'getTriggerStatus':         return json(getTriggerStatus(params.userId));
      // ── Telegram ──────────────────────────────────────────
      case 'getTelegramConfig':      return json(getTelegramConfig(params.userId));
      case 'setTelegramConfig':      return json(setTelegramConfig(body));
      case 'testTelegramNotify':     return json(testTelegramNotify(params.userId));
      case 'getTelegramUpdates':     return json(getTelegramUpdates(params.userId));
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
//  0. initApp — รวม checkUser + getSubjects ใน 1 call
//     เพื่อลด round-trip และใช้ CacheService ร่วมกัน
// ─────────────────────────────────────────
function initApp(userId) {
  const userResult     = checkUser(userId);
  const subjectResult  = getSubjects();           // ใช้ cache ภายใน
  return { ...userResult, subjects: subjectResult.subjects || [] };
}

// ─────────────────────────────────────────
//  1. ตรวจสอบ LINE userId (CacheService 30s)
// ─────────────────────────────────────────
function checkUser(lineUserId) {
  if (!lineUserId) return { success: false, status: 'error', message: 'ไม่พบข้อมูล userId' };

  const sheet = getSheet(SHEET_USERS);
  if (!sheet) return { success: false, status: 'error', message: 'ไม่พบ Sheet: ' + SHEET_USERS };

  // ใช้ cache 30 วินาที (สมดุลระหว่างความเร็ว vs ข้อมูลล่าสุด)
  const rows = gCache('users_rows', () => sheet.getDataRange().getValues(), 30);
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

  invalidateCache('users_rows');

  // แจ้ง Admin ทาง Telegram
  try {
    const now      = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
    const icon     = status === 'active' ? '✅' : '⏳';
    const statusTh = status === 'active' ? 'อนุมัติอัตโนมัติแล้ว' : 'รออนุมัติจาก Admin';
    const msg =
      `🆕 <b>สมาชิกใหม่!</b>\n\n` +
      `👤 ชื่อ: <b>${fullName}</b>\n` +
      `📱 LINE: ${lineDisplayName || '—'}\n` +
      (email    ? `📧 อีเมล: ${email}\n`   : '') +
      (phone    ? `📞 โทร: ${phone}\n`     : '') +
      (studentId? `🏷 รหัส: ${studentId}\n` : '') +
      `🕐 เวลา: ${now}\n` +
      `${icon} สถานะ: ${statusTh}`;
    sendTelegramMsg(msg);
  } catch (_) {}

  return { success: true, status };
}

// ─────────────────────────────────────────
//  3. ดึงรายวิชา (cache 5 นาที)
// ─────────────────────────────────────────
function getSubjects() {
  return gCache('subjects_v1', _getSubjectsRaw, 300);
}
function _getSubjectsRaw() {
  const sheet = getSheet(SHEET_QUESTIONS);
  if (!sheet) return { success: false, subjects: [] };

  const rows     = sheet.getDataRange().getValues();
  const seen     = new Set();
  const subjects = [];

  for (let i = 1; i < rows.length; i++) {
    const cat = String(rows[i][8] || '').trim();
    if (cat && !seen.has(cat)) { seen.add(cat); subjects.push({ name: cat }); }
  }
  return { success: true, subjects };
}

// ─────────────────────────────────────────
//  4. ดึงข้อสอบตามวิชา (cache 3 นาที ต่อ lesson)
// ─────────────────────────────────────────
function getQuestions(lesson) {
  const cacheKey = 'q_' + (lesson || '_all').replace(/\s+/g, '_').slice(0, 40);
  return gCache(cacheKey, () => _getQuestionsRaw(lesson), 180);
}
function _getQuestionsRaw(lesson) {
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
  const { userId, displayName, email, lesson, score, total, timeUsed, detail, setId } = data || {};

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
      'คะแนน','รวม','เปอร์เซ็นต์','ผ่าน','เวลา(วิ)','examId','details','setId',
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
    sc, tot, pct + '%', pass, timeUsedNum, examId, detailStr, String(setId || ''),
  ]);

  return { success: true, examId };
}

// ─────────────────────────────────────────
//  Push Flex Message ผลสอบไปยัง LINE user
// ─────────────────────────────────────────
function pushFlexResult({ userId, displayName, lesson, score, total, pct, pass, timeUsed }) {
  if (!LINE_CHANNEL_TOKEN) return;

  const isPass    = pass === 'ผ่าน';
  const headerBg  = isPass ? '#16a34a' : '#dc2626';
  const scoreColor = isPass ? '#16a34a' : '#dc2626';
  const emoji     = isPass ? '🎉' : '😢';
  const passText  = isPass ? '✅ ผ่านการสอบ' : '❌ ไม่ผ่านการสอบ';
  const min       = Math.floor(timeUsed / 60);
  const sec       = String(timeUsed % 60).padStart(2, '0');

  const flex = {
    type: 'bubble',
    size: 'kilo',
    header: {
      type: 'box', layout: 'vertical',
      backgroundColor: headerBg,
      paddingAll: '16px',
      contents: [
        { type: 'text', text: '📝 ผลการสอบ', color: '#ffffff', weight: 'bold', size: 'sm' },
        { type: 'text', text: lesson, color: '#ffffff', weight: 'bold', size: 'lg', wrap: true },
      ],
    },
    body: {
      type: 'box', layout: 'vertical', paddingAll: '16px', spacing: 'md',
      contents: [
        // ชื่อผู้สอบ
        {
          type: 'box', layout: 'horizontal',
          contents: [
            { type: 'text', text: '👤 ผู้สอบ', size: 'sm', color: '#888888', flex: 2 },
            { type: 'text', text: displayName || 'ไม่ระบุ', size: 'sm', color: '#333333', flex: 3, align: 'end', wrap: true },
          ],
        },
        // คะแนน
        {
          type: 'box', layout: 'horizontal',
          contents: [
            { type: 'text', text: '📊 คะแนน', size: 'sm', color: '#888888', flex: 2 },
            { type: 'text', text: score + '/' + total + ' (' + pct + '%)', size: 'lg', weight: 'bold', color: scoreColor, flex: 3, align: 'end' },
          ],
        },
        // เวลา
        {
          type: 'box', layout: 'horizontal',
          contents: [
            { type: 'text', text: '⏱ เวลาที่ใช้', size: 'sm', color: '#888888', flex: 2 },
            { type: 'text', text: min + ':' + sec, size: 'sm', color: '#333333', flex: 3, align: 'end' },
          ],
        },
        // divider
        { type: 'separator', margin: 'md' },
        // ผลสรุป
        {
          type: 'box', layout: 'vertical', margin: 'md',
          backgroundColor: isPass ? '#f0fdf4' : '#fef2f2',
          cornerRadius: '12px', paddingAll: '12px',
          contents: [
            { type: 'text', text: emoji + ' ' + passText, weight: 'bold', size: 'md', color: scoreColor, align: 'center' },
            { type: 'text', text: 'เกณฑ์ผ่าน 60% ขึ้นไป', size: 'xs', color: '#888888', align: 'center', margin: 'sm' },
          ],
        },
      ],
    },
    footer: {
      type: 'box', layout: 'vertical', paddingAll: '12px',
      contents: [
        {
          type: 'button', style: 'primary', height: 'sm',
          color: '#4f46e5', action: { type: 'uri', label: '📚 สอบอีกครั้ง', uri: 'https://liff.line.me/' + getLiffId() },
        },
      ],
    },
  };

  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method:  'post',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + LINE_CHANNEL_TOKEN,
    },
    payload:            JSON.stringify({ to: userId, messages: [{ type: 'flex', altText: emoji + ' ผลสอบ ' + score + '/' + total + ' (' + pct + '%)', contents: flex }] }),
    muteHttpExceptions: true,
  });
}

// คืน LIFF ID (ใช้ใน Flex Message footer)
function getLiffId() {
  return LIFF_ID || '';
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
  const users     = getSheet(SHEET_USERS);
  const questions = getSheet(SHEET_QUESTIONS);
  const results   = getSheet(SHEET_RESULTS);

  // ── Users ──────────────────────────────────────────
  const userRows      = users ? users.getDataRange().getValues().slice(1) : [];
  const totalMembers  = userRows.length;
  const activeMembers  = userRows.filter(r => String(r[2]).toLowerCase() === 'active').length;
  const pendingMembers = userRows.filter(r => String(r[2]).toLowerCase() === 'pending').length;
  const inactiveMembers= userRows.filter(r => String(r[2]).toLowerCase() === 'inactive').length;

  // ── Questions ──────────────────────────────────────
  const qRows = questions ? questions.getDataRange().getValues().slice(1).filter(r => r[1]) : [];
  const totalQuestions = qRows.length;
  const qBySubject = {};
  qRows.forEach(r => {
    const s = String(r[8] || '').trim();
    if (s) qBySubject[s] = (qBySubject[s] || 0) + 1;
  });
  const questionsBySubject = Object.entries(qBySubject)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // ── Results ────────────────────────────────────────
  const rRows      = results ? results.getDataRange().getValues().slice(1) : [];
  const totalExams = rRows.length;
  const passTotal  = rRows.filter(r => String(r[8]) === 'ผ่าน').length;
  const failTotal  = totalExams - passTotal;
  const avgPassRate = totalExams > 0 ? Math.round((passTotal / totalExams) * 100) : 0;

  // ── Subject Stats (enhanced) ───────────────────────
  const subjectMap = {};
  rRows.forEach(r => {
    const s    = String(r[4] || '').trim();
    const pct  = Number(String(r[7] || '0').replace('%', '')) || 0;
    const time = Number(r[9] || 0);
    if (!s) return;
    if (!subjectMap[s]) subjectMap[s] = { count: 0, pass: 0, scoreSum: 0, timeSum: 0 };
    subjectMap[s].count++;
    if (String(r[8]) === 'ผ่าน') subjectMap[s].pass++;
    subjectMap[s].scoreSum += pct;
    subjectMap[s].timeSum  += time;
  });
  const subjectStats = Object.entries(subjectMap)
    .map(([name, v]) => ({
      name,
      count:    v.count,
      passCount: v.pass,
      failCount: v.count - v.pass,
      passRate:  Math.round((v.pass / v.count) * 100),
      avgScore:  Math.round(v.scoreSum / v.count),
      avgTimeSec: Math.round(v.timeSum / v.count),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  // ── Score Distribution (histogram 10 buckets) ─────
  const buckets = new Array(10).fill(0);
  rRows.forEach(r => {
    const pct = Number(String(r[7] || '0').replace('%', '')) || 0;
    const idx = Math.min(9, Math.floor(pct / 10));
    buckets[idx]++;
  });
  const scoreDistribution = buckets.map((count, i) => ({
    label:  i === 9 ? '90-100' : (i * 10) + '-' + (i * 10 + 9),
    count,
    pass: i >= 6,    // 60%+ ถือว่าผ่าน
  }));

  // ── Daily Trend (14 วันล่าสุด) ──────────────────────
  const today    = new Date();
  const dayMap   = {};
  const mbrMap   = {};
  for (let d = 13; d >= 0; d--) {
    const dt = new Date(today);
    dt.setDate(today.getDate() - d);
    const key = (dt.getDate()) + '/' + (dt.getMonth() + 1);
    dayMap[key] = { date: key, examCount: 0, passCount: 0 };
    mbrMap[key] = { date: key, newMembers: 0 };
  }
  rRows.forEach(r => {
    const dt = new Date(r[0]);
    if (isNaN(dt)) return;
    const diffDays = Math.floor((today - dt) / 86400000);
    if (diffDays > 13) return;
    const key = dt.getDate() + '/' + (dt.getMonth() + 1);
    if (dayMap[key]) {
      dayMap[key].examCount++;
      if (String(r[8]) === 'ผ่าน') dayMap[key].passCount++;
    }
  });
  userRows.forEach(r => {
    const dt = new Date(r[8]);
    if (isNaN(dt)) return;
    const diffDays = Math.floor((today - dt) / 86400000);
    if (diffDays > 13) return;
    const key = dt.getDate() + '/' + (dt.getMonth() + 1);
    if (mbrMap[key]) mbrMap[key].newMembers++;
  });
  const dailyTrend  = Object.values(dayMap);
  const memberTrend = Object.values(mbrMap);

  // ── Top Scorers ────────────────────────────────────
  const scorerMap = {};
  rRows.forEach(r => {
    const uid  = String(r[1] || '').trim();
    const name = String(r[2] || uid).trim();
    const pct  = Number(String(r[7] || '0').replace('%', '')) || 0;
    if (!uid) return;
    if (!scorerMap[uid]) scorerMap[uid] = { name, scoreSum: 0, count: 0, passCount: 0 };
    scorerMap[uid].scoreSum += pct;
    scorerMap[uid].count++;
    if (String(r[8]) === 'ผ่าน') scorerMap[uid].passCount++;
  });
  const topScorers = Object.values(scorerMap)
    .map(v => ({ name: v.name, avgScore: Math.round(v.scoreSum / v.count), examCount: v.count, passCount: v.passCount }))
    .filter(v => v.examCount >= 1)
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 10);

  return {
    success: true,
    // KPI
    totalMembers, activeMembers, pendingMembers, inactiveMembers,
    totalQuestions, totalExams, avgPassRate,
    passFail: { pass: passTotal, fail: failTotal },
    // Charts
    subjectStats,
    questionsBySubject,
    scoreDistribution,
    dailyTrend,
    memberTrend,
    topScorers,
  };
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
  const { callerUserId, targetUserId, newStatus, fullName, email, phone, studentId, role } = body || {};
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  if (!targetUserId) return { success: false, message: 'ไม่พบ targetUserId' };

  // ถ้าส่ง newStatus มาให้ตรวจสอบค่า
  const allowedStatus = ['active', 'inactive', 'pending'];
  if (newStatus && !allowedStatus.includes(newStatus)) return { success: false, message: 'สถานะไม่ถูกต้อง' };

  // ป้องกันเปลี่ยน role admin ของตัวเอง
  if (callerUserId === targetUserId && role !== undefined) {
    return { success: false, message: 'ไม่สามารถเปลี่ยน role ตัวเองได้' };
  }

  const sheet = getSheet(SHEET_USERS);
  if (!sheet) return { success: false, message: 'ไม่พบ Sheet' };
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() !== String(targetUserId).trim()) continue;

    const row = i + 1;
    // B=2:displayName  C=3:status  D=4:fullName  E=5:email  F=6:phone  G=7:studentId  J=10:role
    if (newStatus   !== undefined) sheet.getRange(row, 3).setValue(newStatus);
    if (fullName    !== undefined) sheet.getRange(row, 4).setValue(fullName);
    if (email       !== undefined) sheet.getRange(row, 5).setValue(email);
    if (phone       !== undefined) sheet.getRange(row, 6).setValue(phone);
    if (studentId   !== undefined) sheet.getRange(row, 7).setValue(studentId);
    if (role        !== undefined) sheet.getRange(row, 10).setValue(role);

    invalidateCache('users_rows');

    // แจ้ง Telegram เมื่อเปลี่ยน status
    if (newStatus !== undefined) {
      try {
        const memberName = String(rows[i][3] || rows[i][1] || targetUserId);
        const icons = { active: '✅ อนุมัติ', inactive: '🚫 ระงับ', pending: '⏳ รออนุมัติ' };
        sendTelegramMsg(`${icons[newStatus] || newStatus} <b>อัปเดตสมาชิก</b>\n👤 ${memberName}\nสถานะใหม่: <b>${newStatus}</b>`);
      } catch (_) {}
    }
    return { success: true };
  }
  return { success: false, message: 'ไม่พบผู้ใช้' };
}

// ดึงข้อมูลสมาชิก 1 คน พร้อมประวัติสอบ (เรียกจาก admin client)
function getMemberDetail(body) {
  const { callerUserId, targetUserId } = body || {};
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  if (!targetUserId) return { success: false, message: 'ไม่พบ targetUserId' };

  const sheetU = getSheet(SHEET_USERS);
  if (!sheetU) return { success: false, message: 'ไม่พบ Sheet' };
  const uRows = sheetU.getDataRange().getValues();
  let member = null;

  for (let i = 1; i < uRows.length; i++) {
    if (String(uRows[i][0]).trim() !== String(targetUserId).trim()) continue;
    member = {
      lineUserId:  String(uRows[i][0] || ''),
      displayName: String(uRows[i][1] || ''),
      status:      String(uRows[i][2] || ''),
      fullName:    String(uRows[i][3] || ''),
      email:       String(uRows[i][4] || ''),
      phone:       String(uRows[i][5] || ''),
      studentId:   String(uRows[i][6] || ''),
      pictureUrl:  String(uRows[i][7] || ''),
      joinDate:    formatDate(uRows[i][8]),
      role:        String(uRows[i][9] || ''),
    };
    break;
  }
  if (!member) return { success: false, message: 'ไม่พบผู้ใช้' };

  // ดึงประวัติสอบ
  const sheetR = getSheet(SHEET_RESULTS);
  let exams = [];
  if (sheetR) {
    const rRows = sheetR.getDataRange().getValues().slice(1);
    exams = rRows
      .filter(r => String(r[1] || '').trim() === targetUserId)
      .reverse()
      .slice(0, 20)
      .map(r => ({
        date:     formatDate(r[0]),
        lesson:   String(r[4] || ''),
        score:    Number(r[5] || 0),
        total:    Number(r[6] || 0),
        pct:      String(r[7] || '0%'),
        pass:     String(r[8] || ''),
        timeUsed: Number(r[9] || 0),
        examId:   String(r[10] || ''),
      }));
  }

  const totalExams = exams.length;
  const passCount  = exams.filter(e => e.pass === 'ผ่าน').length;
  const passRate   = totalExams > 0 ? Math.round((passCount / totalExams) * 100) : 0;

  return { success: true, member, exams, totalExams, passCount, passRate };
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
  _clearQuestionCache(subject);
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
      const oldSubject = String(rows[i][8] || '');
      sheet.getRange(i + 1, 2, 1, 9).setValues([[
        question, a, b||'', c||'', d||'', answer, explanation||'', subject, imageUrl||''
      ]]);
      _clearQuestionCache(subject);
      if (oldSubject && oldSubject !== subject) _clearQuestionCache(oldSubject);
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
      const subj = String(rows[i][8] || '');
      sheet.deleteRow(i + 1);
      _clearQuestionCache(subj);
      return { success: true };
    }
  }
  return { success: false, message: 'ไม่พบข้อสอบ' };
}

// ล้าง cache ข้อสอบของวิชานั้น + subjects list
function _clearQuestionCache(subject) {
  try {
    const cache = CacheService.getScriptCache();
    const keys  = ['subjects_v1'];
    if (subject) keys.push('q_' + subject.replace(/\s+/g, '_').slice(0, 40));
    cache.removeAll(keys);
  } catch (_) {}
}

// ═══════════════════════════════════════════════════════════
//  ExamSets — ชุดข้อสอบ
// ═══════════════════════════════════════════════════════════

function _getExamSetsSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_EXAMSETS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_EXAMSETS);
    sheet.getRange(1, 1, 1, 13).setValues([[
      'setId','setName','description','subjects','status',
      'visibility','allowedUsers','maxAttempts','timerMin',
      'passThreshold','setOrder','createdAt','createdBy'
    ]]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function _parseExamSetRow(r, index) {
  let subjects = [];
  try { subjects = JSON.parse(String(r[3] || '[]')); } catch(_) {}
  const totalQ = subjects.reduce((s, sub) => s + Number(sub.numQ || 0), 0);
  return {
    setId:         String(r[0] || ''),
    setName:       String(r[1] || ''),
    description:   String(r[2] || ''),
    subjects,
    totalQ,
    subjectCount:  subjects.length,
    status:        String(r[4] || 'draft').toLowerCase(),
    visibility:    String(r[5] || 'public').toLowerCase(),
    allowedUsers:  String(r[6] || '').split(',').map(s=>s.trim()).filter(Boolean),
    maxAttempts:   Number(r[7] || 0),
    timerMin:      Number(r[8] || 0),
    passThreshold: Number(r[9] || 60),
    setOrder:      Number(r[10] || 99),
    createdAt:     formatDate(r[11]),
    createdBy:     String(r[12] || ''),
    rowIndex:      index + 2,
  };
}

// ── ดึงชุดข้อสอบที่ user มีสิทธิ์ ──────────────────────────
function getExamSets(userId) {
  const sheet = _getExamSetsSheet();
  const rows  = sheet.getDataRange().getValues().slice(1);
  const sets  = rows
    .map((r, i) => _parseExamSetRow(r, i))
    .filter(s => s.status === 'active' && s.setId)
    .filter(s => {
      if (s.visibility === 'public' || !s.visibility) return true;
      return s.allowedUsers.includes(String(userId || ''));
    })
    .sort((a, b) => a.setOrder - b.setOrder);
  return { success: true, sets };
}

// ── ดึงทุกชุด (admin) ───────────────────────────────────────
function getAdminExamSets(callerUserId) {
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  const sheet  = _getExamSetsSheet();
  const rows   = sheet.getDataRange().getValues().slice(1);
  const rSheet = getSheet(SHEET_RESULTS);
  const rRows  = rSheet ? rSheet.getDataRange().getValues().slice(1) : [];

  const sets = rows
    .filter(r => r[0])
    .map((r, i) => {
      const s = _parseExamSetRow(r, i);
      // count attempts
      const attempts = rRows.filter(rr => String(rr[12]||'') === s.setId);
      s.attemptCount = attempts.length;
      s.passCount    = attempts.filter(rr => String(rr[8]) === 'ผ่าน').length;
      s.passRate     = s.attemptCount > 0 ? Math.round((s.passCount / s.attemptCount) * 100) : 0;
      return s;
    })
    .sort((a, b) => a.setOrder - b.setOrder);

  return { success: true, sets };
}

// ── รายละเอียดชุด 1 ชุด (admin) ────────────────────────────
function getExamSetDetail(callerUserId, setId) {
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  const sheet = _getExamSetsSheet();
  const rows  = sheet.getDataRange().getValues().slice(1);
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim() !== String(setId).trim()) continue;
    const s = _parseExamSetRow(rows[i], i);

    // ดึง users ที่มีสิทธิ์ (private)
    if (s.visibility === 'private' && s.allowedUsers.length) {
      const uSheet = getSheet(SHEET_USERS);
      if (uSheet) {
        const uRows = uSheet.getDataRange().getValues().slice(1);
        s.assignedMembers = uRows
          .filter(u => s.allowedUsers.includes(String(u[0]).trim()))
          .map(u => ({
            lineUserId:  String(u[0]),
            fullName:    String(u[3] || u[1] || ''),
            displayName: String(u[1] || ''),
            pictureUrl:  String(u[7] || ''),
            status:      String(u[2] || ''),
          }));
      }
    }

    // ผลสอบในชุดนี้ (รวม column M = setId)
    const rSheet = getSheet(SHEET_RESULTS);
    if (rSheet) {
      const rRows = rSheet.getDataRange().getValues().slice(1);
      const attempts = rRows.filter(r => String(r[12]||'') === setId);
      s.attemptCount = attempts.length;
      s.passCount    = attempts.filter(r => String(r[8]) === 'ผ่าน').length;
      s.passRate     = s.attemptCount > 0 ? Math.round((s.passCount / s.attemptCount) * 100) : 0;
      s.recentAttempts = attempts.reverse().slice(0, 10).map(r => ({
        date:  formatDate(r[0]),
        name:  String(r[2] || ''),
        pct:   String(r[7] || '0%'),
        pass:  String(r[8] || ''),
        examId: String(r[10] || ''),
      }));
    }

    return { success: true, set: s };
  }
  return { success: false, message: 'ไม่พบชุดข้อสอบ' };
}

// ── ดึงข้อสอบรวมจากทุกวิชาในชุด ────────────────────────────
function getExamSetQuestions(setId, userId) {
  const sheet = _getExamSetsSheet();
  const rows  = sheet.getDataRange().getValues().slice(1);
  let targetSet = null;
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(setId).trim()) {
      targetSet = _parseExamSetRow(rows[i], i);
      break;
    }
  }
  if (!targetSet) return { success: false, message: 'ไม่พบชุดข้อสอบ' };
  if (targetSet.status !== 'active') return { success: false, message: 'ชุดข้อสอบนี้ยังไม่เปิดใช้งาน' };

  // ตรวจสิทธิ์ user
  if (targetSet.visibility === 'private' && !targetSet.allowedUsers.includes(String(userId || ''))) {
    return { success: false, message: 'คุณไม่มีสิทธิ์เข้าถึงชุดข้อสอบนี้' };
  }

  const qSheet = getSheet(SHEET_QUESTIONS);
  if (!qSheet) return { success: false, message: 'ไม่พบ Sheet Questions' };
  const qRows = qSheet.getDataRange().getValues().slice(1);

  // รวมข้อสอบจากทุกวิชา
  const combined = [];
  targetSet.subjects.forEach(sub => {
    const pool = qRows.filter(r => String(r[8]||'').trim() === sub.name && r[1]);
    const numQ = Number(sub.numQ || 0);
    // สุ่ม numQ จาก pool
    const shuffled = pool.sort(() => Math.random() - 0.5);
    const selected = numQ > 0 ? shuffled.slice(0, numQ) : shuffled;
    selected.forEach(r => {
      const options = [r[2],r[3],r[4],r[5]]
        .map(x => String(x||'').trim()).filter(x => x);
      combined.push({
        id:          String(r[0] || ''),
        question:    String(r[1]),
        options,
        answer:      String(r[6]||'').trim(),
        explanation: String(r[7]||'ไม่มีคำอธิบาย'),
        imageUrl:    String(r[9]||'').trim(),
        subject:     sub.name,
      });
    });
  });

  return {
    success:  true,
    questions: combined,
    setName:  targetSet.setName,
    timerMin: targetSet.timerMin,
    passThreshold: targetSet.passThreshold,
  };
}

// ── สร้างชุดข้อสอบใหม่ ─────────────────────────────────────
function createExamSet(body) {
  const { callerUserId, setName, description, subjects, status, visibility,
          allowedUsers, maxAttempts, timerMin, passThreshold, setOrder } = body || {};
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  if (!setName) return { success: false, message: 'กรุณาระบุชื่อชุดข้อสอบ' };

  const sheet  = _getExamSetsSheet();
  const setId  = 'SET' + Date.now();
  const subsJson = JSON.stringify(subjects || []);
  const allowedCsv = Array.isArray(allowedUsers) ? allowedUsers.join(',') : (allowedUsers || '');

  sheet.appendRow([
    setId,
    String(setName).trim(),
    String(description || ''),
    subsJson,
    String(status || 'draft'),
    String(visibility || 'public'),
    allowedCsv,
    Number(maxAttempts || 0),
    Number(timerMin || 0),
    Number(passThreshold || 60),
    Number(setOrder || 99),
    new Date(),
    String(callerUserId),
  ]);

  invalidateCache('examsets_all');
  return { success: true, setId };
}

// ── แก้ไขชุดข้อสอบ ─────────────────────────────────────────
function updateExamSet(body) {
  const { callerUserId, setId, setName, description, subjects, status, visibility,
          allowedUsers, maxAttempts, timerMin, passThreshold, setOrder } = body || {};
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  if (!setId) return { success: false, message: 'ไม่พบ setId' };

  const sheet = _getExamSetsSheet();
  const rows  = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() !== String(setId).trim()) continue;
    const row = i + 1;
    const allowedCsv = Array.isArray(allowedUsers) ? allowedUsers.join(',') : (allowedUsers || '');
    sheet.getRange(row, 2, 1, 12).setValues([[
      String(setName || rows[i][1]),
      String(description !== undefined ? description : rows[i][2]),
      JSON.stringify(subjects !== undefined ? subjects : JSON.parse(String(rows[i][3] || '[]'))),
      String(status !== undefined ? status : rows[i][4]),
      String(visibility !== undefined ? visibility : rows[i][5]),
      allowedUsers !== undefined ? allowedCsv : String(rows[i][6] || ''),
      Number(maxAttempts !== undefined ? maxAttempts : rows[i][7] || 0),
      Number(timerMin !== undefined ? timerMin : rows[i][8] || 0),
      Number(passThreshold !== undefined ? passThreshold : rows[i][9] || 60),
      Number(setOrder !== undefined ? setOrder : rows[i][10] || 99),
      rows[i][11],          // createdAt ไม่เปลี่ยน
      rows[i][12],          // createdBy ไม่เปลี่ยน
    ]]);
    invalidateCache('examsets_all');
    return { success: true };
  }
  return { success: false, message: 'ไม่พบชุดข้อสอบ' };
}

// ── ลบชุดข้อสอบ ────────────────────────────────────────────
function deleteExamSet(body) {
  const { callerUserId, setId } = body || {};
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  if (!setId) return { success: false, message: 'ไม่พบ setId' };

  const sheet = _getExamSetsSheet();
  const rows  = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() !== String(setId).trim()) continue;
    sheet.deleteRow(i + 1);
    invalidateCache('examsets_all');
    return { success: true };
  }
  return { success: false, message: 'ไม่พบชุดข้อสอบ' };
}

// ── จัดการ user ที่มีสิทธิ์ (private sets) ──────────────────
function assignExamSet(body) {
  const { callerUserId, setId, action, targetUserId } = body || {};
  // action: 'add' | 'remove' | 'setAll' (replace entire list)
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  if (!setId) return { success: false, message: 'ไม่พบ setId' };

  const sheet = _getExamSetsSheet();
  const rows  = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() !== String(setId).trim()) continue;
    const current = String(rows[i][6] || '').split(',').map(s=>s.trim()).filter(Boolean);
    let updated = [...current];

    if (action === 'add' && targetUserId) {
      if (!updated.includes(targetUserId)) updated.push(targetUserId);
    } else if (action === 'remove' && targetUserId) {
      updated = updated.filter(u => u !== targetUserId);
    } else if (action === 'setAll' && Array.isArray(body.userIds)) {
      updated = body.userIds.map(u => String(u).trim()).filter(Boolean);
    }

    sheet.getRange(i + 1, 7).setValue(updated.join(','));
    invalidateCache('examsets_all');
    return { success: true, allowedUsers: updated };
  }
  return { success: false, message: 'ไม่พบชุดข้อสอบ' };
}

// ── บันทึกผลสอบ: เพิ่ม setId ใน column M ────────────────────
// (จัดการโดย saveResult ปกติ แต่รับ setId เพิ่มเติม)

// ═══════════════════════════════════════════════════════════
//  Telegram Notification
//  Token/ChatId เก็บใน Script Properties (ปลอดภัย ไม่อยู่ใน code)
// ═══════════════════════════════════════════════════════════

function sendTelegramMsg(text) {
  try {
    const props  = PropertiesService.getScriptProperties();
    const token  = props.getProperty('TG_BOT_TOKEN')  || '';
    const chatId = props.getProperty('TG_CHAT_ID')    || '';
    if (!token || !chatId) return false;

    const res = UrlFetchApp.fetch(
      'https://api.telegram.org/bot' + token + '/sendMessage',
      {
        method:      'post',
        contentType: 'application/json',
        muteHttpExceptions: true,
        payload: JSON.stringify({
          chat_id:    chatId,
          text:       text,
          parse_mode: 'HTML',
        }),
      }
    );
    const result = JSON.parse(res.getContentText());
    return result.ok === true;
  } catch (e) {
    console.log('Telegram error:', e.toString());
    return false;
  }
}

// ── ดึง config (สำหรับหน้า Admin ตรวจสอบ) ──────────────────
function getTelegramConfig(callerUserId) {
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  const props  = PropertiesService.getScriptProperties();
  const token  = props.getProperty('TG_BOT_TOKEN')  || '';
  const chatId = props.getProperty('TG_CHAT_ID')    || '';
  return {
    success:     true,
    hasToken:    !!token,
    maskedToken: token  ? token.slice(0, 6) + '...' + token.slice(-4) : '',
    chatId:      chatId,
    configured:  !!(token && chatId),
  };
}

// ── บันทึก config ──────────────────────────────────────────
function setTelegramConfig(body) {
  const { callerUserId, botToken, chatId } = body || {};
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  const props = PropertiesService.getScriptProperties();
  // ถ้าส่งค่ามา ให้อัปเดต ถ้าไม่ส่งมา ให้คงค่าเดิม
  if (botToken !== undefined && botToken !== '') props.setProperty('TG_BOT_TOKEN', botToken.trim());
  if (chatId   !== undefined && chatId !== '')   props.setProperty('TG_CHAT_ID',   chatId.trim());
  // ถ้าส่ง '' มา (ล้างค่า)
  if (botToken === '') props.deleteProperty('TG_BOT_TOKEN');
  if (chatId   === '') props.deleteProperty('TG_CHAT_ID');
  return { success: true };
}

// ── ทดสอบส่งข้อความ ─────────────────────────────────────────
function testTelegramNotify(callerUserId) {
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  const now  = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
  const sent = sendTelegramMsg(
    `✅ <b>ทดสอบการแจ้งเตือน</b>\n\n` +
    `🏫 ระบบข้อสอบออนไลน์\n` +
    `🕐 เวลา: ${now}\n\n` +
    `การแจ้งเตือนทำงานปกติ!`
  );
  return {
    success: sent,
    message: sent ? 'ส่งสำเร็จ! ตรวจสอบ Telegram ของคุณ' : 'ส่งไม่สำเร็จ — ตรวจสอบ Bot Token และ Chat ID',
  };
}

// ── ดึง Chat ID จาก getUpdates (ช่วย debug) ─────────────────
function getTelegramUpdates(callerUserId) {
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  try {
    const props = PropertiesService.getScriptProperties();
    const token = props.getProperty('TG_BOT_TOKEN') || '';
    if (!token) return { success: false, message: 'ยังไม่ได้ตั้งค่า Bot Token' };

    const res    = UrlFetchApp.fetch(
      'https://api.telegram.org/bot' + token + '/getUpdates?limit=10',
      { muteHttpExceptions: true }
    );
    const data   = JSON.parse(res.getContentText());

    if (!data.ok) return { success: false, message: 'Token ไม่ถูกต้อง: ' + (data.description || '') };

    if (!data.result || data.result.length === 0) {
      return {
        success: false,
        message: 'ไม่พบข้อความ — กรุณาส่งข้อความหา bot ก่อน แล้วลองใหม่',
        hint:    'เปิด Telegram ส่งข้อความอะไรก็ได้ให้ bot ของคุณก่อน',
      };
    }

    // รวบรวม unique chat ids จาก updates
    const chats = [];
    const seen  = new Set();
    data.result.forEach(u => {
      const chat = u.message?.chat || u.channel_post?.chat;
      if (chat && !seen.has(String(chat.id))) {
        seen.add(String(chat.id));
        chats.push({
          id:       String(chat.id),
          type:     chat.type || 'private',
          name:     chat.first_name
                      ? (chat.first_name + ' ' + (chat.last_name || '')).trim()
                      : (chat.title || chat.username || ''),
          username: chat.username || '',
        });
      }
    });

    return { success: true, chats };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
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

// ─────────────────────────────────────────
//  LINE Profile Sync (ตั้ง trigger ทุก 1 ชม.)
// ─────────────────────────────────────────

// ฟังก์ชันหลักที่ Time-driven Trigger เรียก (ไม่เช็ค admin)
function syncAllLineProfilesScheduled() {
  const sheet = getSheet(SHEET_USERS);
  if (!sheet) return;

  const rows = sheet.getDataRange().getValues();
  let updatedCount = 0;
  let failedCount  = 0;

  for (let i = 1; i < rows.length; i++) {
    const uid = String(rows[i][0] || '').trim();
    if (!uid) continue;

    const lp = fetchLineProfile(uid);
    if (!lp) { failedCount++; continue; }

    // อัปเดต displayName (col B=2) และ pictureUrl (col H=8)
    if (lp.displayName) sheet.getRange(i + 1, 2).setValue(lp.displayName);
    if (lp.pictureUrl)  sheet.getRange(i + 1, 8).setValue(lp.pictureUrl);
    updatedCount++;

    Utilities.sleep(100); // หน่วงเพื่อไม่ให้ rate limit
  }

  // บันทึกเวลา sync ล่าสุดใน PropertiesService
  PropertiesService.getScriptProperties().setProperties({
    lastSyncTime:    new Date().toISOString(),
    lastSyncUpdated: String(updatedCount),
    lastSyncFailed:  String(failedCount),
  });

  console.log('LINE profile sync done — updated:' + updatedCount + ' failed:' + failedCount);
}

// Sync โปรไฟล์ทุกคนจาก LINE API แล้วอัปเดต Sheets (เรียกจาก admin client)
function syncAllLineProfiles(callerUserId) {
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  syncAllLineProfilesScheduled();
  const props = PropertiesService.getScriptProperties().getProperties();
  return {
    success:      true,
    updatedCount: Number(props.lastSyncUpdated || 0),
    failedCount:  Number(props.lastSyncFailed  || 0),
    lastSyncTime: props.lastSyncTime || '',
  };
}

// ดึง Members จาก Sheet (ข้อมูลถูก sync โดย trigger แล้ว — ไม่เรียก LINE API ซ้ำ)
function getMembersWithProfiles(callerUserId) {
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };

  const sheet = getSheet(SHEET_USERS);
  if (!sheet) return { success: true, members: [], lastSyncTime: '' };

  const rows  = sheet.getDataRange().getValues();
  const props = PropertiesService.getScriptProperties().getProperties();
  const members = [];

  for (let i = 1; i < rows.length; i++) {
    const uid = String(rows[i][0] || '').trim();
    if (!uid) continue;

    const pictureUrl  = String(rows[i][7] || '');
    const displayName = String(rows[i][1] || '');

    members.push({
      lineUserId:        uid,
      displayName:       displayName,
      status:            String(rows[i][2] || ''),
      fullName:          String(rows[i][3] || ''),
      email:             String(rows[i][4] || ''),
      phone:             String(rows[i][5] || ''),
      studentId:         String(rows[i][6] || ''),
      pictureUrl:        pictureUrl,
      joinDate:          formatDate(rows[i][8]),
      role:              String(rows[i][9] || ''),
      // LINE data จาก Sheet (ถูก sync แล้ว)
      lineFound:         !!pictureUrl,
      linePictureUrl:    pictureUrl,
      lineDisplayName:   displayName,
      lineStatusMessage: '',
    });
  }

  return {
    success:      true,
    members,
    lastSyncTime: props.lastSyncTime || '',
  };
}

// ─────────────────────────────────────────
//  Trigger Management
// ─────────────────────────────────────────

// ติดตั้ง Time-driven Trigger ทุก 1 ชม.
// ** รันฟังก์ชันนี้ครั้งเดียวจาก Apps Script Editor **
function setupHourlyTrigger() {
  deleteAllTriggers(); // ลบเก่าก่อนป้องกัน duplicate

  ScriptApp.newTrigger('syncAllLineProfilesScheduled')
    .timeBased()
    .everyHours(1)
    .create();

  // รัน sync ทันทีหลังติดตั้ง
  syncAllLineProfilesScheduled();

  console.log('✅ Hourly trigger installed & first sync done.');
}

// ลบ trigger ทั้งหมดของ script นี้
function deleteAllTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
}

// ดูสถานะ trigger + เวลา sync ล่าสุด (เรียกจาก admin client)
function getTriggerStatus(callerUserId) {
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };

  const triggers = ScriptApp.getProjectTriggers().map(t => ({
    funcName:   t.getHandlerFunction(),
    triggerSrc: t.getTriggerSource().toString(),
    eventType:  t.getEventType().toString(),
  }));

  const props = PropertiesService.getScriptProperties().getProperties();
  const lastSyncTime = props.lastSyncTime || '';

  // แปลง ISO → เวลาไทย
  let lastSyncLocal = '(ยังไม่เคย sync)';
  if (lastSyncTime) {
    try {
      const d = new Date(lastSyncTime);
      lastSyncLocal = Utilities.formatDate(d, 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss');
    } catch (_) { lastSyncLocal = lastSyncTime; }
  }

  return {
    success:         true,
    triggers,
    hasHourlyTrigger: triggers.some(t => t.funcName === 'syncAllLineProfilesScheduled'),
    lastSyncTime:    lastSyncLocal,
    lastSyncUpdated: props.lastSyncUpdated || '0',
    lastSyncFailed:  props.lastSyncFailed  || '0',
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
