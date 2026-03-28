// ============================================================
//  ระบบข้อสอบออนไลน์ - Google Apps Script (Pure API)
//  Deploy > New deployment > Web app
//  Execute as: Me  |  Who has access: Anyone
// ============================================================

const SPREADSHEET_ID  = '1mGAK8fLXEfMAQbqKXD35c5JIOzKQGKtCguM-SmrcutA';

const SHEET_USERS     = 'Users';
// Users  → A:lineUserId | B:lineDisplayName | C:status(active/inactive/pending)
//          D:fullName   | E:email           | F:phone | G:studentId | H:pictureUrl | I:วันที่สมัคร | J:role(admin/'') | K:department | L:richMenuId

const SHEET_COURSES   = 'Courses';
// Courses → A:courseId | B:name | C:isOpen(TRUE/FALSE) | D:createdAt

const SHEET_QUESTIONS = 'Questions';
// Questions → A:id | B:คำถาม | C:ก | D:ข | E:ค | F:ง | G:คำตอบ(ข้อความ) | H:คำอธิบาย | I:หมวดหมู่

const SHEET_RESULTS   = 'Results';
const SHEET_EXAMSETS  = 'ExamSets';
// ExamSets → A:setId | B:setName | C:description | D:subjects(JSON)

// ── Pre-aggregated stats sheets (Layer 1: ลด O(n) → O(1)) ──────────────────
const SHEET_SUMMARY  = '_SummaryStats';
// _SummaryStats  → A:userId | B:displayName | C:totalAttempts | D:totalPass | E:bestScore | F:lastAttempt | G:avgScore
const SHEET_DAILY    = '_DailyStats';
// _DailyStats    → A:date(yyyy-MM-dd) | B:attempts | C:pass | D:fail
const SHEET_ANNOUNCE = '_Announcements';
// _Announcements → A:id | B:title | C:body | D:type | E:pinned | F:createdAt | G:createdBy
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
      case 'initApp':          return json(initApp(params.userId));
      case 'initAdmin':        return json(initAdmin(params.userId));
      case 'checkUser':        return json(checkUser(params.userId));
      case 'getMyStats':       return json(getMyStats(params.userId));
      case 'getLeaderboard':   return json(getLeaderboard(params.userId));
      case 'getAnnouncements': return json(getAnnouncements());
      case 'addAnnouncement':  return json(addAnnouncement(body));
      case 'deleteAnnouncement': return json(deleteAnnouncement(body));
      case 'registerUser':     return json(registerUser(body || params));
      case 'getSubjects':      return json(getSubjects());
      case 'getQuestions':     return json(getQuestions(params.lesson));
      case 'saveResult':       return json(saveResult(body || params));
      case 'getHistory':       return json(getHistory(params.userId, parseInt(params.page||'1'), parseInt(params.size||'20')));
      case 'getHistoryDetail': return json(getHistoryDetail(params.examId));
      case 'getMyProfile':     return json(getMyProfile(params.userId));
      case 'getAdminStats':    return json(getAdminStats(params.userId));
      case 'getMembers':       return json(getMembers(params.userId));
      case 'updateMember':     return json(updateMember(body));
      case 'getMemberDetail':  return json(getMemberDetail(body));
      case 'deleteMember':     return json(deleteMember(body));
      case 'getAllResults':     return json(getAllResults(params.userId, params.page));
      case 'exportAllResults': return json(exportAllResults(params.userId));
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
      case 'getUserRichMenu':        return json(getUserRichMenu(params.userId, params.callerUserId));
      case 'getRichMenuList':        return json(getRichMenuList(params.userId));
      case 'getRichMenuImage':       return json(getRichMenuImage(params.richMenuId, params.userId));
      case 'linkRichMenu':           return json(linkRichMenu(body));
      case 'unlinkRichMenu':         return json(unlinkRichMenu(body));
      case 'bulkLinkRichMenu':       return json(bulkLinkRichMenu(body));
      case 'syncAllLineProfiles':    return json(syncAllLineProfiles(params.userId));
      case 'getMembersWithProfiles': return json(getMembersWithProfiles(params.userId));
      case 'getTriggerStatus':           return json(getTriggerStatus(params.userId));
      case 'getRichMenuSyncStatus':      return json(getRichMenuSyncStatus(params.userId));
      case 'setupRichMenuTrigger':       return json(setupRichMenuTriggerApi(params.userId));
      case 'removeRichMenuTrigger':      return json(removeRichMenuTriggerApi(params.userId));
      case 'syncPictureUrls':          return json(syncPictureUrlsApi(params.userId));
      case 'runSyncNow':               return json(runSyncNow(params.key));
      case 'checkLineToken':           return json(checkLineToken(params.key));
      case 'setupSyncTrigger':         return json(setupSyncTriggerApi(params.userId));
      case 'removeSyncTrigger':        return json(removeSyncTriggerApi(params.userId));
      // ── Archive ───────────────────────────────────────────
      case 'archiveOldResults':    return json(archiveOldResults(params.userId));
      case 'setupArchiveTrigger':  return json(setupArchiveTrigger(params.userId));
      case 'removeArchiveTrigger': return json(removeArchiveTrigger(params.userId));
      // ── Courses ───────────────────────────────────────────
      case 'getCourses':     return json(getCourses(params));
      case 'addCourse':      return json(addCourse(body));
      case 'updateCourse':   return json(updateCourse(body));
      case 'deleteCourse':   return json(deleteCourse(body));
      case 'toggleCourse':   return json(toggleCourse(body));
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
  const { userId, lineDisplayName, pictureUrl, fullName, email, phone, course, studentId, department } = data || {};
  const courseVal = course || studentId || ''; // remap: ใช้ course เป็นหลัก

  if (!userId)    return { success: false, message: 'ไม่พบ userId' };
  if (!fullName)  return { success: false, message: 'กรุณากรอกชื่อ-นามสกุล' };
  if (!courseVal) return { success: false, message: 'กรุณาเลือกหลักสูตร' };

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
    String(courseVal   || '').substring(0, 100),  // G: course
    String(pictureUrl  || '').substring(0, 500),
    new Date(),
    '',          // J: role (ค่าเริ่มต้นว่าง)
    String(department || '').substring(0, 100),
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
      (courseVal  ? `📚 หลักสูตร: ${courseVal}\n`  : '') +
      (department ? `🏢 หน่วยงาน: ${department}\n` : '') +
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

  // ── Layer 1: อัพเดต Pre-aggregated Stats (ไม่กระทบ save หากล้มเหลว) ──
  const isPassBool = pass === 'ผ่าน';
  try { _updateSummaryStats(String(userId).trim(), String(displayName || ''), pct, isPassBool); } catch (_) {}
  try { _updateDailyStat(isPassBool); } catch (_) {}

  // ── Layer 2: Push Flex Message ผลสอบกลับ LINE user (fire & forget) ──
  try {
    pushFlexResult({
      userId:      String(userId).trim(),
      displayName: displayName || '',
      lesson,
      score:    sc,
      total:    tot,
      pct,
      pass,
      timeUsed: timeUsedNum,
    });
  } catch (_) {}

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
//  6. ดึงประวัติการสอบของ user — Paginated + Summary
//     page: 1-indexed | size: จำนวนต่อหน้า (5-50)
//     summary มาจาก _SummaryStats (O(1)) ไม่ต้อง scan ทุก row
// ─────────────────────────────────────────
function getHistory(userId, page, size) {
  if (!userId) return { success: false, message: 'ไม่พบ userId' };
  page = Math.max(1, parseInt(page) || 1);
  size = Math.min(50, Math.max(5, parseInt(size) || 20));

  // ── Summary จาก _SummaryStats (fast O(users)) ──────────────────
  let summary = null;
  try {
    const sumSheet = getSheet(SHEET_SUMMARY);
    if (sumSheet) {
      const sRows = sumSheet.getDataRange().getValues();
      for (let i = 1; i < sRows.length; i++) {
        if (String(sRows[i][0]).trim() === String(userId).trim()) {
          summary = {
            totalAttempts: Number(sRows[i][2] || 0),
            totalPass:     Number(sRows[i][3] || 0),
            bestScore:     Number(sRows[i][4] || 0),
            avgScore:      Number(sRows[i][6] || 0),
          };
          break;
        }
      }
    }
  } catch (_) {}

  const sheet = getSheet(SHEET_RESULTS);
  if (!sheet) {
    return { success: true, history: [], total: 0, page, size, hasMore: false,
             summary: summary || { totalAttempts: 0, totalPass: 0, bestScore: 0, avgScore: 0 } };
  }

  // ── Scan Results (reverse = newest first) ──────────────────────
  const rows = sheet.getDataRange().getValues();
  const userRows = [];
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][1]).trim() === String(userId).trim()) userRows.push(rows[i]);
  }

  const histTotal = userRows.length;

  // Fallback summary ถ้ายังไม่มี _SummaryStats (backwards compat)
  if (!summary) {
    const pcts   = userRows.map(r => Number(String(r[7] || '0').replace('%', '')) || 0);
    const passes = userRows.filter(r => String(r[8]) === 'ผ่าน').length;
    summary = {
      totalAttempts: histTotal,
      totalPass:     passes,
      bestScore:     histTotal ? Math.max.apply(null, pcts) : 0,
      avgScore:      histTotal ? Math.round(pcts.reduce(function(a,b){return a+b;}, 0) / histTotal) : 0,
    };
  }

  // ── Paginate ───────────────────────────────────────────────────
  const start   = (page - 1) * size;
  const paged   = userRows.slice(start, start + size);

  const history = paged.map(function(row, idx) {
    const examId = String(row[10] || '').trim() || ('legacy_' + (start + idx));
    return {
      date:     formatDate(row[0]),
      lesson:   String(row[4]  || ''),
      score:    Number(row[5]  || 0),
      total:    Number(row[6]  || 0),
      pct:      String(row[7]  || '0%'),
      pass:     String(row[8]  || ''),
      timeUsed: Number(row[9]  || 0),
      examId,
    };
  });

  return {
    success: true,
    history,
    total:   histTotal,
    page,
    size,
    hasMore: start + size < histTotal,
    summary,
  };
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

// ══════════════════════════════════════════════════════════════
//  initAdmin — batch: stats + trigger + rmSync + tgConfig (1 call)
//  CacheService 20s เพื่อ cold-start ไม่ช้า
// ══════════════════════════════════════════════════════════════
function initAdmin(callerUserId) {
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };

  const cache    = CacheService.getScriptCache();
  const cacheKey = 'initAdmin_' + callerUserId;
  const cached   = cache.get(cacheKey);
  if (cached) { try { return JSON.parse(cached); } catch (_) {} }

  // อ่าน PropertiesService ครั้งเดียว (ใช้ร่วมกันทั้ง 3 ฟีเจอร์)
  const props    = PropertiesService.getScriptProperties().getProperties();
  // อ่าน Triggers ครั้งเดียว
  const triggers = ScriptApp.getProjectTriggers();

  // ── Trigger Status ──────────────────────────────────────────
  const hasSyncTrigger = triggers.some(t => t.getHandlerFunction() === 'syncAllLineProfilesScheduled');
  let lastSyncLocal = '(ยังไม่เคย sync)';
  if (props.lastSyncTime) {
    try { lastSyncLocal = Utilities.formatDate(new Date(props.lastSyncTime), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss'); } catch (_) {}
  }
  let profileSyncLastTimeLocal = '(ยังไม่เคย sync)';
  if (props.profileSyncLastTime) {
    try { profileSyncLastTimeLocal = Utilities.formatDate(new Date(props.profileSyncLastTime), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss'); } catch (_) {}
  }
  const triggerData = {
    success: true,
    triggers: triggers.map(t => ({ funcName: t.getHandlerFunction() })),
    hasHourlyTrigger: hasSyncTrigger, hasSyncTrigger,
    lastSyncTime: lastSyncLocal,
    lastSyncUpdated: props.lastSyncUpdated || '0',
    lastSyncFailed:  props.lastSyncFailed  || '0',
    cursor:     parseInt(props.profileSyncCursor     || '0'),
    total:      parseInt(props.profileSyncTotal      || '0'),
    lastBatch:  parseInt(props.profileSyncLastBatch  || '0'),
    cyclesDone: parseInt(props.profileSyncCyclesDone || '0'),
    updated:    parseInt(props.profileSyncUpdated    || '0'),
    failed:     parseInt(props.profileSyncFailed     || '0'),
    lastTime:   profileSyncLastTimeLocal,
  };

  // ── RM Sync Status ──────────────────────────────────────────
  const hasRmTrigger = triggers.some(t => t.getHandlerFunction() === 'syncRichMenusBatch');
  let rmLastTimeTh = '(ยังไม่เคยรัน)';
  if (props.rmSyncLastTime) {
    try { rmLastTimeTh = Utilities.formatDate(new Date(props.rmSyncLastTime), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss'); } catch (_) {}
  }
  const rmSyncData = {
    success: true, hasRmTrigger,
    total:      parseInt(props.rmSyncTotal      || '0', 10),
    cursor:     parseInt(props.rmSyncCursor     || '0', 10),
    lastBatch:  props.rmSyncLastBatch   || '—',
    lastTime:   rmLastTimeTh,
    updated:    props.rmSyncUpdated     || '0',
    noMenu:     props.rmSyncNoMenu      || '0',
    failed:     props.rmSyncFailed      || '0',
    cyclesDone: props.rmSyncCyclesDone  || '0',
  };

  // ── Telegram Config ──────────────────────────────────────────
  const tgToken  = props.TG_BOT_TOKEN || '';
  const tgChatId = props.TG_CHAT_ID   || '';
  const tgData   = {
    success: true,
    hasToken:    !!tgToken,
    maskedToken: tgToken ? tgToken.slice(0, 6) + '...' + tgToken.slice(-4) : '',
    chatId:      tgChatId,
    configured:  !!(tgToken && tgChatId),
  };

  // ── Stats (cached 60s แยกต่างหาก เพราะ heavy) ──────────────
  const statsKey    = 'adminStats_' + callerUserId;
  const statsCached = cache.get(statsKey);
  let statsData     = null;
  if (statsCached) {
    try { statsData = JSON.parse(statsCached); } catch (_) {}
  }
  if (!statsData) {
    statsData = _computeAdminStats(callerUserId);
    try { cache.put(statsKey, JSON.stringify(statsData), 60); } catch (_) {}
  }

  const result = {
    success: true,
    stats:   statsData,
    trigger: triggerData,
    rmSync:  rmSyncData,
    tg:      tgData,
  };

  try { cache.put(cacheKey, JSON.stringify(result), 20); } catch (_) {}
  return result;
}

function getAdminStats(callerUserId) {
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  const cache    = CacheService.getScriptCache();
  const cacheKey = 'adminStats_' + callerUserId;
  const cached   = cache.get(cacheKey);
  if (cached) { try { return JSON.parse(cached); } catch (_) {} }
  const result = _computeAdminStats(callerUserId);
  try { cache.put(cacheKey, JSON.stringify(result), 60); } catch (_) {}
  return result;
}

function _computeAdminStats(callerUserId) {
  const users        = getSheet(SHEET_USERS);
  const questions    = getSheet(SHEET_QUESTIONS);
  const results      = getSheet(SHEET_RESULTS);
  const summarySheet = getSheet(SHEET_SUMMARY);   // _SummaryStats (per-user)
  const dailySheet   = getSheet(SHEET_DAILY);     // _DailyStats   (per-day)

  // ── Users ──────────────────────────────────────────
  const userRows       = users ? users.getDataRange().getValues().slice(1) : [];
  const totalMembers   = userRows.length;
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

  // ── KPI Totals: ใช้ _SummaryStats แทน scan Results (O(users) vs O(results)) ──
  let totalExams = 0, passTotal = 0, failTotal = 0, avgPassRate = 0;
  let topScorers = [];
  const sRows = summarySheet ? summarySheet.getDataRange().getValues().slice(1) : [];

  if (sRows.length > 0) {
    sRows.forEach(r => {
      totalExams += Number(r[2]) || 0;
      passTotal  += Number(r[3]) || 0;
    });
    failTotal  = totalExams - passTotal;
    avgPassRate = totalExams > 0 ? Math.round((passTotal / totalExams) * 100) : 0;

    // Top Scorers จาก _SummaryStats (O(users)) — ไม่ต้อง scan Results
    topScorers = sRows
      .filter(r => (Number(r[2]) || 0) >= 1)
      .map(r => ({
        name:      String(r[1] || r[0] || ''),
        avgScore:  Number(r[6]) || 0,
        examCount: Number(r[2]) || 0,
        passCount: Number(r[3]) || 0,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 10);
  }

  // ── Scan Results (bounded by archive = max 6 เดือน) ──────────
  // ใช้สำหรับ subjectStats + scoreDistribution + fallback KPI
  const rRows = results ? results.getDataRange().getValues().slice(1) : [];

  // Fallback KPI ถ้ายังไม่มี _SummaryStats
  if (sRows.length === 0) {
    totalExams  = rRows.length;
    passTotal   = rRows.filter(r => String(r[8]) === 'ผ่าน').length;
    failTotal   = totalExams - passTotal;
    avgPassRate = totalExams > 0 ? Math.round((passTotal / totalExams) * 100) : 0;
  }

  // ── Subject Stats ─────────────────────────────────
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
      count: v.count, passCount: v.pass, failCount: v.count - v.pass,
      passRate:   Math.round((v.pass / v.count) * 100),
      avgScore:   Math.round(v.scoreSum / v.count),
      avgTimeSec: Math.round(v.timeSum / v.count),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  // ── Score Distribution (histogram 10 buckets) ─────
  const buckets = new Array(10).fill(0);
  rRows.forEach(r => {
    const pct = Number(String(r[7] || '0').replace('%', '')) || 0;
    buckets[Math.min(9, Math.floor(pct / 10))]++;
  });
  const scoreDistribution = buckets.map((count, i) => ({
    label: i === 9 ? '90-100' : (i * 10) + '-' + (i * 10 + 9),
    count, pass: i >= 6,
  }));

  // ── Daily Trend: ใช้ _DailyStats (O(14) แทน O(results)) ────────
  const today  = new Date();
  const dayMap = {};
  const mbrMap = {};
  for (let d = 13; d >= 0; d--) {
    const dt  = new Date(today);
    dt.setDate(today.getDate() - d);
    const key = dt.getDate() + '/' + (dt.getMonth() + 1);
    dayMap[key] = { date: key, examCount: 0, passCount: 0 };
    mbrMap[key] = { date: key, newMembers: 0 };
  }

  if (dailySheet && dailySheet.getLastRow() > 1) {
    // Fast path: อ่านจาก _DailyStats (O(14) rows ที่ query)
    const dRows = dailySheet.getDataRange().getValues().slice(1);
    dRows.forEach(r => {
      const dt = new Date(String(r[0]));
      if (isNaN(dt)) return;
      const diffDays = Math.floor((today - dt) / 86400000);
      if (diffDays > 13 || diffDays < 0) return;
      const key = dt.getDate() + '/' + (dt.getMonth() + 1);
      if (dayMap[key]) {
        dayMap[key].examCount += Number(r[1]) || 0;
        dayMap[key].passCount += Number(r[2]) || 0;
      }
    });
  } else {
    // Fallback: scan Results
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
  }

  // Member trend (O(users) — เร็วอยู่แล้ว)
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

  // Top Scorers fallback ถ้ายังไม่มี _SummaryStats
  if (topScorers.length === 0 && rRows.length > 0) {
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
    topScorers = Object.values(scorerMap)
      .map(v => ({ name: v.name, avgScore: Math.round(v.scoreSum / v.count), examCount: v.count, passCount: v.passCount }))
      .filter(v => v.examCount >= 1)
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 10);
  }

  return {
    success: true,
    totalMembers, activeMembers, pendingMembers, inactiveMembers,
    totalQuestions, totalExams, avgPassRate,
    passFail: { pass: passTotal, fail: failTotal },
    subjectStats, questionsBySubject, scoreDistribution,
    dailyTrend, memberTrend, topScorers,
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

function _clearMembersCache(callerUserId) {
  try {
    const c = CacheService.getScriptCache();
    c.remove('members_' + callerUserId);
    c.remove('initAdmin_' + callerUserId);
    c.remove('adminStats_' + callerUserId);
  } catch (_) {}
}

function updateMember(body) {
  const { callerUserId, targetUserId, newStatus, fullName, email, phone, studentId, department, role } = body || {};
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
    // B=2:displayName  C=3:status  D=4:fullName  E=5:email  F=6:phone  G=7:studentId  J=10:role  K=11:department
    if (newStatus   !== undefined) sheet.getRange(row, 3).setValue(newStatus);
    if (fullName    !== undefined) sheet.getRange(row, 4).setValue(fullName);
    if (email       !== undefined) sheet.getRange(row, 5).setValue(email);
    if (phone       !== undefined) sheet.getRange(row, 6).setValue(phone);
    if (studentId   !== undefined) sheet.getRange(row, 7).setValue(studentId);
    if (role        !== undefined) sheet.getRange(row, 10).setValue(role);
    if (department  !== undefined) sheet.getRange(row, 11).setValue(department);

    invalidateCache('users_rows');
    _clearMembersCache(callerUserId);

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
      studentId:   String(uRows[i][6]  || ''),
      pictureUrl:  String(uRows[i][7]  || ''),
      joinDate:    formatDate(uRows[i][8]),
      role:        String(uRows[i][9]  || ''),
      department:  String(uRows[i][10] || ''),
      richMenuId:  String(uRows[i][11] || ''),
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

// ─────────────────────────────────────────
//  Export ผลสอบทั้งหมดเป็น CSV (Admin only)
//  คืน rows ทั้งหมด พร้อม email, เวลา, หน่วยงาน
// ─────────────────────────────────────────
function exportAllResults(callerUserId) {
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  const sheet = getSheet(SHEET_RESULTS);
  if (!sheet) return { success: true, rows: [], total: 0 };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: true, rows: [], total: 0 };

  // อ่าน Users sheet เพื่อ join ข้อมูล department
  const deptMap = {};
  try {
    const uSheet = getSheet('Users');
    if (uSheet) {
      uSheet.getDataRange().getValues().slice(1).forEach(function(r) {
        if (r[0]) deptMap[String(r[0])] = String(r[10] || ''); // K = department
      });
    }
  } catch (_) {}

  const rows = data.slice(1).reverse().map(function(r) {
    const uid = String(r[1] || '');
    return {
      date:       r[0] ? Utilities.formatDate(new Date(r[0]), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss') : '',
      userId:     uid,
      name:       String(r[2] || ''),
      email:      String(r[3] || ''),
      department: deptMap[uid] || '',
      lesson:     String(r[4] || ''),
      score:      Number(r[5] || 0),
      total:      Number(r[6] || 0),
      pct:        String(r[7] || '0%'),
      pass:       String(r[8] || ''),
      timeUsed:   Number(r[9] || 0),
      examId:     String(r[10] || ''),
      setId:      String(r[12] || ''),
    };
  });

  return { success: true, rows: rows, total: rows.length };
}

// ─────────────────────────────────────────────────────────────────
//  สถิติส่วนตัว + วิเคราะห์จุดอ่อน
// ─────────────────────────────────────────────────────────────────
function getMyStats(userId) {
  if (!userId) return { success: false, message: 'ไม่พบ userId' };

  // 1. Summary จาก _SummaryStats
  var userSummary = { totalAttempts:0, totalPass:0, bestScore:0, avgScore:0, lastAttempt:'' };
  var rank = null, totalUsers = 0;
  var sumSheet = getSheet(SHEET_SUMMARY);
  if (sumSheet) {
    var sRows = sumSheet.getDataRange().getValues().slice(1).filter(function(r){ return Number(r[2])>0; });
    totalUsers = sRows.length;
    var sorted = sRows.slice().sort(function(a,b){ return (Number(b[3])||0)-(Number(a[3])||0); });
    sorted.forEach(function(r,i) {
      if (String(r[0]).trim() === String(userId).trim()) {
        rank = i + 1;
        userSummary = {
          totalAttempts: Number(r[2])||0,
          totalPass:     Number(r[3])||0,
          bestScore:     Number(r[4])||0,
          lastAttempt:   r[5] ? Utilities.formatDate(new Date(r[5]),'Asia/Bangkok','dd/MM/yyyy') : '',
          avgScore:      Math.round(Number(r[6])||0),
        };
      }
    });
  }

  // 2. Subject breakdown จาก Results (scan user rows เท่านั้น)
  var subjectMap = {};
  var resSheet = getSheet(SHEET_RESULTS);
  if (resSheet) {
    var allRes = resSheet.getDataRange().getValues().slice(1);
    allRes.filter(function(r){ return String(r[1]).trim()===String(userId).trim(); })
      .slice(-500)
      .forEach(function(r) {
        var subj = String(r[4]||'ไม่ระบุ');
        var pct  = parseInt(String(r[7]||'0').replace('%',''))||0;
        var pass = String(r[8])==='ผ่าน';
        if (!subjectMap[subj]) subjectMap[subj]={ subject:subj, attempts:0, pass:0, totalPct:0 };
        subjectMap[subj].attempts++;
        if (pass) subjectMap[subj].pass++;
        subjectMap[subj].totalPct += pct;
      });
  }

  var subjectStats = Object.keys(subjectMap).map(function(k) {
    var s = subjectMap[k];
    return {
      subject:   s.subject,
      attempts:  s.attempts,
      passCount: s.pass,
      passRate:  s.attempts>0 ? Math.round(s.pass/s.attempts*100) : 0,
      avgScore:  s.attempts>0 ? Math.round(s.totalPct/s.attempts) : 0,
    };
  }).sort(function(a,b){ return a.passRate-b.passRate; });

  return {
    success: true,
    summary: {
      totalAttempts: userSummary.totalAttempts,
      totalPass:     userSummary.totalPass,
      totalFail:     userSummary.totalAttempts - userSummary.totalPass,
      bestScore:     userSummary.bestScore,
      avgScore:      userSummary.avgScore,
      lastAttempt:   userSummary.lastAttempt,
      passRate:      userSummary.totalAttempts>0 ? Math.round(userSummary.totalPass/userSummary.totalAttempts*100) : 0,
      rank:          rank,
      totalUsers:    totalUsers,
    },
    subjectStats: subjectStats,
  };
}

// ─────────────────────────────────────────────────────────────────
//  Leaderboard — top 20 + อันดับของ caller
// ─────────────────────────────────────────────────────────────────
function getLeaderboard(userId) {
  if (!userId) return { success: false, message: 'ไม่พบ userId' };

  var sumSheet = getSheet(SHEET_SUMMARY);
  if (!sumSheet) return { success:true, leaderboard:[], myRank:null, myEntry:null, totalUsers:0 };

  // Join picture+fullName จาก Users
  var picMap = {};
  try {
    var uRows = getSheet('Users').getDataRange().getValues().slice(1);
    uRows.forEach(function(r){ if(r[0]) picMap[String(r[0])]={ pic:String(r[7]||''), full:String(r[3]||'') }; });
  } catch(_){}

  var sRows = sumSheet.getDataRange().getValues().slice(1)
    .filter(function(r){ return Number(r[2])>0; });

  var sorted = sRows.slice().sort(function(a,b){
    var d = (Number(b[3])||0)-(Number(a[3])||0);
    return d!==0 ? d : (Number(b[6])||0)-(Number(a[6])||0);
  });

  var top20 = sorted.slice(0,20).map(function(r,i) {
    var uid = String(r[0]); var ex = picMap[uid]||{};
    return {
      rank:          i+1,
      userId:        uid,
      displayName:   String(r[1]||ex.full||'ไม่ระบุ'),
      pictureUrl:    ex.pic||'',
      totalAttempts: Number(r[2])||0,
      totalPass:     Number(r[3])||0,
      bestScore:     Number(r[4])||0,
      avgScore:      Math.round(Number(r[6])||0),
      isMe:          uid===String(userId),
    };
  });

  var myIdx = sorted.findIndex(function(r){ return String(r[0])===String(userId); });
  var myRank = myIdx!==-1 ? myIdx+1 : null;
  var myEntry = null;
  if (myIdx!==-1) {
    var mr = sorted[myIdx]; var me = picMap[String(mr[0])]||{};
    myEntry = {
      rank:myRank, userId:String(mr[0]),
      displayName:String(mr[1]||me.full||''), pictureUrl:me.pic||'',
      totalAttempts:Number(mr[2])||0, totalPass:Number(mr[3])||0,
      bestScore:Number(mr[4])||0, avgScore:Math.round(Number(mr[6])||0),
    };
  }

  return { success:true, leaderboard:top20, myRank:myRank, myEntry:myEntry, totalUsers:sorted.length };
}

// ─────────────────────────────────────────────────────────────────
//  ประกาศ (Announcements)
// ─────────────────────────────────────────────────────────────────
function getAnnouncements() {
  var sh = getSheet(SHEET_ANNOUNCE);
  if (!sh) return { success:true, announcements:[] };
  var rows = sh.getDataRange().getValues().slice(1)
    .filter(function(r){ return r[0]; })
    .map(function(r) {
      return {
        id:        String(r[0]),
        title:     String(r[1]||''),
        body:      String(r[2]||''),
        type:      String(r[3]||'info'),
        pinned:    r[4]===true||String(r[4]).toUpperCase()==='TRUE',
        createdAt: r[5] ? Utilities.formatDate(new Date(r[5]),'Asia/Bangkok','dd/MM/yyyy') : '',
      };
    })
    .sort(function(a,b){ return (b.pinned?1:0)-(a.pinned?1:0); });
  return { success:true, announcements:rows };
}

function addAnnouncement(body) {
  if (!isAdmin(body.callerUserId)) return { success:false, message:'ไม่มีสิทธิ์' };
  var sh = _ensureSheet(SHEET_ANNOUNCE, ['id','title','body','type','pinned','createdAt','createdBy']);
  var id = 'ANN_'+Date.now();
  sh.appendRow([id, body.title||'', body.body||'', body.type||'info', body.pinned||false, new Date(), body.callerUserId]);
  return { success:true, id:id };
}

function deleteAnnouncement(body) {
  if (!isAdmin(body.callerUserId)) return { success:false, message:'ไม่มีสิทธิ์' };
  var sh = getSheet(SHEET_ANNOUNCE);
  if (!sh) return { success:false, message:'ไม่พบ sheet' };
  var data = sh.getDataRange().getValues();
  for (var i=1; i<data.length; i++) {
    if (String(data[i][0])===String(body.id)) { sh.deleteRow(i+1); return { success:true }; }
  }
  return { success:false, message:'ไม่พบประกาศ' };
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

  // เพิ่ม myAttempts + myBestScore ต่อ set (scan Results)
  try {
    var resSheet = getSheet(SHEET_RESULTS);
    if (resSheet && userId) {
      var resRows = resSheet.getDataRange().getValues().slice(1)
        .filter(function(r){ return String(r[1]).trim()===String(userId).trim() && r[12]; });
      var attMap = {}, bestMap = {};
      resRows.forEach(function(r) {
        var sid = String(r[12]);
        attMap[sid]  = (attMap[sid]||0)+1;
        var pct = parseInt(String(r[7]||'0').replace('%',''))||0;
        bestMap[sid] = Math.max(bestMap[sid]||0, pct);
      });
      sets.forEach(function(s) {
        s.myAttempts  = attMap[s.setId]  || 0;
        s.myBestScore = bestMap[s.setId] || 0;
      });
    }
  } catch(_) {}

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
    if (!token || !chatId) {
      console.log('Telegram: missing token or chatId');
      return false;
    }
    const res = UrlFetchApp.fetch(
      'https://api.telegram.org/bot' + token + '/sendMessage',
      {
        method:             'post',
        muteHttpExceptions: true,
        payload: {
          chat_id:    String(chatId),
          text:       String(text),
          parse_mode: 'HTML',
        },
      }
    );
    const body   = res.getContentText();
    console.log('Telegram response:', body);
    const result = JSON.parse(body);
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
  const props  = PropertiesService.getScriptProperties();
  const token  = props.getProperty('TG_BOT_TOKEN') || '';
  const chatId = props.getProperty('TG_CHAT_ID')   || '';
  if (!token || !chatId) {
    return { success: false, message: 'ยังไม่ได้ตั้งค่า Bot Token หรือ Chat ID' };
  }
  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
  // ส่งตรงๆ เพื่อดู response
  try {
    const res  = UrlFetchApp.fetch(
      'https://api.telegram.org/bot' + token + '/sendMessage',
      {
        method: 'post', muteHttpExceptions: true,
        payload: {
          chat_id:    String(chatId),
          text:       `✅ <b>ทดสอบการแจ้งเตือน</b>\n\n🏫 ระบบข้อสอบออนไลน์\n🕐 เวลา: ${now}\n\nการแจ้งเตือนทำงานปกติ!`,
          parse_mode: 'HTML',
        },
      }
    );
    const body   = res.getContentText();
    const result = JSON.parse(body);
    console.log('testTelegramNotify response:', body);
    return {
      success:   result.ok === true,
      message:   result.ok ? 'ส่งสำเร็จ! ตรวจสอบ Telegram ของคุณ' : ('Telegram API error: ' + (result.description || body)),
      apiResult: result,
    };
  } catch (e) {
    return { success: false, message: 'Exception: ' + e.toString() };
  }
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

// ── Rich Menu Management ─────────────────────────────────────

// ดึงรายการ Rich Menu ทั้งหมดของ bot
function getRichMenuList(callerUserId) {
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/richmenu/list', {
    method: 'get', muteHttpExceptions: true,
    headers: { 'Authorization': 'Bearer ' + LINE_CHANNEL_TOKEN }
  });
  if (res.getResponseCode() !== 200) return { success: false, message: res.getContentText() };
  const { richmenus } = JSON.parse(res.getContentText());
  return {
    success: true,
    richMenus: (richmenus || []).map(m => ({
      richMenuId:  m.richMenuId,
      name:        m.name,
      chatBarText: m.chatBarText,
      selected:    m.selected,
      size:        m.size,
      areaCount:   (m.areas || []).length,
    })),
  };
}

// ดึงรูป Rich Menu เป็น base64 dataURL (สำหรับ preview ใน Admin UI)
function getRichMenuImage(richMenuId, callerUserId) {
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  if (!richMenuId) return { success: false, message: 'ไม่พบ richMenuId' };
  try {
    const res = UrlFetchApp.fetch(
      'https://api.line.me/v2/bot/richmenu/' + encodeURIComponent(richMenuId) + '/content',
      { method: 'get', muteHttpExceptions: true,
        headers: { 'Authorization': 'Bearer ' + LINE_CHANNEL_TOKEN } }
    );
    if (res.getResponseCode() !== 200) return { success: false, message: 'ไม่พบรูป: ' + res.getContentText() };
    const mime    = (res.getHeaders()['Content-Type'] || 'image/jpeg').split(';')[0];
    const base64  = Utilities.base64Encode(res.getContent());
    return { success: true, dataUrl: 'data:' + mime + ';base64,' + base64 };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// helper: เขียน richMenuId ลง column L ของ user ใน sheet
function _writeRichMenuIdToSheet(targetUserId, richMenuIdVal) {
  const sheet = getSheet(SHEET_USERS);
  if (!sheet) return;
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(targetUserId).trim()) {
      sheet.getRange(i + 1, 12).setValue(richMenuIdVal || '');
      return;
    }
  }
}

// Link rich menu ให้ user คนเดียว
function linkRichMenu(body) {
  const { callerUserId, targetUserId, richMenuId } = body || {};
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  if (!targetUserId || !richMenuId) return { success: false, message: 'ข้อมูลไม่ครบ' };
  const res = UrlFetchApp.fetch(
    'https://api.line.me/v2/bot/user/' + encodeURIComponent(targetUserId) + '/richmenu/' + encodeURIComponent(richMenuId),
    { method: 'post', muteHttpExceptions: true,
      headers: { 'Authorization': 'Bearer ' + LINE_CHANNEL_TOKEN } }
  );
  if (res.getResponseCode() !== 200) return { success: false, message: res.getContentText() };
  _writeRichMenuIdToSheet(targetUserId, richMenuId);
  invalidateCache('users_rows');
  return { success: true };
}

// Unlink rich menu จาก user คนเดียว
function unlinkRichMenu(body) {
  const { callerUserId, targetUserId } = body || {};
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  if (!targetUserId) return { success: false, message: 'ไม่พบ targetUserId' };
  const res = UrlFetchApp.fetch(
    'https://api.line.me/v2/bot/user/' + encodeURIComponent(targetUserId) + '/richmenu',
    { method: 'delete', muteHttpExceptions: true,
      headers: { 'Authorization': 'Bearer ' + LINE_CHANNEL_TOKEN } }
  );
  if (res.getResponseCode() !== 200) return { success: false, message: res.getContentText() };
  _writeRichMenuIdToSheet(targetUserId, '');
  invalidateCache('users_rows');
  return { success: true };
}

// Bulk link rich menu ให้หลาย user พร้อมกัน (สูงสุด 150 คนต่อ request)
function bulkLinkRichMenu(body) {
  const { callerUserId, userIds, richMenuId } = body || {};
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  if (!Array.isArray(userIds) || !userIds.length || !richMenuId)
    return { success: false, message: 'ข้อมูลไม่ครบ' };

  const headers = { 'Authorization': 'Bearer ' + LINE_CHANNEL_TOKEN, 'Content-Type': 'application/json' };
  let successCount = 0, failCount = 0;

  for (let i = 0; i < userIds.length; i += 150) {
    const batch = userIds.slice(i, i + 150);
    const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/richmenu/bulk/link', {
      method: 'post', muteHttpExceptions: true, headers,
      payload: JSON.stringify({ richMenuId, userIds: batch }),
    });
    if (res.getResponseCode() === 200) successCount += batch.length;
    else { failCount += batch.length; console.log('bulk link error:', res.getContentText()); }
  }

  // อัปเดต column L ใน sheet สำหรับ user ที่ส่งสำเร็จ
  if (successCount > 0) {
    const sheet = getSheet(SHEET_USERS);
    if (sheet) {
      const rows = sheet.getDataRange().getValues();
      const uidSet = new Set(userIds.map(u => String(u).trim()));
      for (let i = 1; i < rows.length; i++) {
        if (uidSet.has(String(rows[i][0]).trim())) {
          sheet.getRange(i + 1, 12).setValue(richMenuId);
        }
      }
      invalidateCache('users_rows');
    }
  }
  return { success: true, successCount, failCount, total: userIds.length };
}

// ดึง Rich Menu ที่ user ใช้อยู่ + รายละเอียด rich menu
function getUserRichMenu(targetUserId, callerUserId) {
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  if (!targetUserId) return { success: false, message: 'ไม่พบ userId' };

  const headers = { 'Authorization': 'Bearer ' + LINE_CHANNEL_TOKEN };

  // 1) หา richMenuId ที่ link กับ user นี้
  const linkRes = UrlFetchApp.fetch(
    'https://api.line.me/v2/bot/user/' + encodeURIComponent(targetUserId) + '/richmenu',
    { method: 'get', muteHttpExceptions: true, headers }
  );

  if (linkRes.getResponseCode() === 404) {
    return { success: true, linked: false, message: 'ผู้ใช้นี้ไม่มี Rich Menu ที่กำหนดเฉพาะ (ใช้ default หรือไม่มี)' };
  }
  if (linkRes.getResponseCode() !== 200) {
    return { success: false, message: 'LINE API error: ' + linkRes.getContentText() };
  }

  const { richMenuId } = JSON.parse(linkRes.getContentText());

  // 2) ดึงรายละเอียด rich menu
  const menuRes = UrlFetchApp.fetch(
    'https://api.line.me/v2/bot/richmenu/' + richMenuId,
    { method: 'get', muteHttpExceptions: true, headers }
  );

  let menuDetail = null;
  if (menuRes.getResponseCode() === 200) {
    menuDetail = JSON.parse(menuRes.getContentText());
  }

  return {
    success:    true,
    linked:     true,
    richMenuId,
    name:       menuDetail?.name        || '',
    chatBarText:menuDetail?.chatBarText || '',
    selected:   menuDetail?.selected    ?? null,
    size:       menuDetail?.size        || null,
    areas:      (menuDetail?.areas || []).map(a => ({
      label:  a.action?.label || a.action?.text || a.action?.type || '',
      type:   a.action?.type  || '',
      data:   a.action?.data  || a.action?.uri  || a.action?.text || '',
    })),
  };
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
//  Sync Picture URL จาก LINE API → column H
//  รันจาก GAS Editor ได้โดยตรง (ไม่ต้อง parameter)
// ─────────────────────────────────────────
// ── รันครั้งเดียวเพื่อ authorize + ติดตั้ง trigger อัตโนมัติ ──
function firstTimeSetup() {
  // 1) ทดสอบ UrlFetchApp (บังคับขอ permission)
  UrlFetchApp.fetch('https://api.line.me/v2/bot/info', {
    method: 'get',
    muteHttpExceptions: true,
    headers: { 'Authorization': 'Bearer ' + LINE_CHANNEL_TOKEN }
  });

  // 2) ลบ trigger เก่า แล้วสร้างใหม่ทุก 10 นาที
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'syncAllLineProfilesScheduled') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('syncAllLineProfilesScheduled')
    .timeBased().everyMinutes(10).create();

  // 3) sync ทันทีเพื่อทดสอบ
  syncAllLineProfilesScheduled();

  console.log('✅ Setup done! Auto sync ทุก 10 นาที ติดตั้งแล้ว');
  console.log('📊 ดูผลใน PropertiesService: lastSyncUpdated / lastSyncFailed');
}

// ── debug: ทดสอบ LINE API กับ userId แถวแรกที่มีค่า ──────────
function debugLineApi() {
  const sheet   = getSheet(SHEET_USERS);
  const rows    = sheet.getRange(2, 1, Math.min(sheet.getLastRow() - 1, 5), 1).getValues();
  const firstId = rows.find(r => String(r[0]).trim())?.[0];
  if (!firstId) { console.log('No userId found'); return; }

  console.log('Testing userId:', firstId);
  const res  = UrlFetchApp.fetch(
    'https://api.line.me/v2/bot/profile/' + encodeURIComponent(firstId),
    { method: 'get', muteHttpExceptions: true,
      headers: { 'Authorization': 'Bearer ' + LINE_CHANNEL_TOKEN } }
  );
  console.log('HTTP Status:', res.getResponseCode());
  console.log('Response:', res.getContentText());
}

function syncPictureUrls() {
  const sheet    = getSheet(SHEET_USERS);
  const startRow = 2;
  const endRow   = Math.min(sheet.getLastRow(), startRow + 199); // สูงสุด 200 แถว

  let updated = 0, failed = 0, skipped = 0;

  for (var i = startRow; i <= endRow; i++) {
    var userId = sheet.getRange(i, 1).getValue(); // col A: lineUserId
    if (!userId) { skipped++; continue; }

    try {
      var res    = UrlFetchApp.fetch(
        'https://api.line.me/v2/bot/profile/' + userId,
        { method: 'get', muteHttpExceptions: true,
          headers: { 'Authorization': 'Bearer ' + LINE_CHANNEL_TOKEN } }
      );
      var result = JSON.parse(res.getContentText());

      if (result.pictureUrl) {
        sheet.getRange(i, 8).setValue(result.pictureUrl); // col H
        updated++;
      } else {
        // บันทึก error ไว้ดู (ถ้ามี)
        console.log('Row ' + i + ' no pictureUrl: ' + res.getContentText());
        failed++;
      }
    } catch (e) {
      console.log('Row ' + i + ' error: ' + e.toString());
      failed++;
    }

    if (i % 10 === 0) console.log('Progress: row ' + i);
    Utilities.sleep(300);
  }

  PropertiesService.getScriptProperties().setProperties({
    lastSyncTime:    new Date().toISOString(),
    lastSyncUpdated: String(updated),
    lastSyncFailed:  String(failed),
  });
  console.log('syncPictureUrls done — updated:' + updated + ' failed:' + failed + ' skipped:' + skipped);
}

// ─────────────────────────────────────────
//  LINE Profile Sync (trigger ทุก 10 นาที)
// ─────────────────────────────────────────

// ฟังก์ชันหลักที่ Time-driven Trigger เรียก (ไม่เช็ค admin)
// sync โปรไฟล์ LINE แบบ cursor-based ทำงานต่อเนื่องไม่รู้จบ
const SYNC_BATCH = 100;

function syncAllLineProfilesScheduled() {
  const sheet = getSheet(SHEET_USERS);
  if (!sheet) return;

  const allRows  = sheet.getDataRange().getValues();
  const dataRows = allRows.slice(1).filter(r => String(r[0]).trim()); // กรองแถวที่มี userId
  const total    = dataRows.length;
  if (total < 1) return;

  const props  = PropertiesService.getScriptProperties();
  let cursor   = parseInt(props.getProperty('profileSyncCursor') || '0');
  if (cursor >= total) cursor = 0;

  const end      = Math.min(cursor + SYNC_BATCH, total);
  const batch    = dataRows.slice(cursor, end);
  const sheetRow = cursor + 2; // 1-indexed + header

  let updated = 0, failed = 0;

  // เตรียม array สำหรับ batch write
  const nameArr  = batch.map(r => [r[1]]);
  const photoArr = batch.map(r => [r[7]]);

  for (let i = 0; i < batch.length; i++) {
    const uid = String(batch[i][0]).trim();
    const lp  = fetchLineProfile(uid);
    if (!lp) { failed++; continue; }
    if (lp.displayName) nameArr[i]  = [lp.displayName];
    if (lp.pictureUrl)  photoArr[i] = [lp.pictureUrl];
    updated++;
  }

  // batch write
  sheet.getRange(sheetRow, 2, batch.length, 1).setValues(nameArr);
  sheet.getRange(sheetRow, 8, batch.length, 1).setValues(photoArr);

  const nextCursor = end >= total ? 0 : end;
  const prevCycles = parseInt(props.getProperty('profileSyncCyclesDone') || '0');
  const cyclesDone = nextCursor === 0 ? prevCycles + 1 : prevCycles;

  props.setProperties({
    profileSyncCursor:     String(nextCursor),
    profileSyncTotal:      String(total),
    profileSyncLastBatch:  String(batch.length),
    profileSyncLastTime:   new Date().toISOString(),
    profileSyncUpdated:    String(updated),
    profileSyncFailed:     String(failed),
    profileSyncCyclesDone: String(cyclesDone),
    lastSyncTime:          new Date().toISOString(),
    lastSyncUpdated:       String(updated),
    lastSyncFailed:        String(failed),
  });

  console.log('Profile sync — cursor:' + cursor + '→' + nextCursor + '/' + total + ' updated:' + updated + ' failed:' + failed);
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

  // ── CacheService (30s) ────────────────────────
  const cache    = CacheService.getScriptCache();
  const cacheKey = 'members_' + callerUserId;
  const cached   = cache.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch (_) {}
  }

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
      studentId:         String(rows[i][6]  || ''),
      pictureUrl:        pictureUrl,
      joinDate:          formatDate(rows[i][8]),
      role:              String(rows[i][9]  || ''),
      department:        String(rows[i][10] || ''),
      richMenuId:        String(rows[i][11] || ''),
      lineFound:         !!pictureUrl,
      linePictureUrl:    pictureUrl,
      lineDisplayName:   displayName,
      lineStatusMessage: '',
    });
  }

  const result = {
    success:      true,
    members,
    lastSyncTime: props.lastSyncTime || '',
  };

  try { cache.put(cacheKey, JSON.stringify(result), 30); } catch (_) {}
  return result;
}

// ─────────────────────────────────────────
//  Trigger Management
// ─────────────────────────────────────────

// ─────────────────────────────────────────
//  Rich Menu Sync Trigger (ทำงานไม่รู้จบ)
//  วนไปเรื่อยๆ ทีละ 100 user ต่อรอบ
// ─────────────────────────────────────────
const RM_BATCH = 100;

function syncRichMenusBatch() {
  const sheet    = getSheet(SHEET_USERS);
  if (!sheet) return;

  const allRows  = sheet.getDataRange().getValues();
  const dataRows = allRows.slice(1); // ข้าม header
  const total    = dataRows.length;
  if (total === 0) return;

  const props    = PropertiesService.getScriptProperties();
  let   cursor   = parseInt(props.getProperty('rmSyncCursor') || '0', 10);
  if (isNaN(cursor) || cursor >= total) cursor = 0; // wrap กลับต้น

  const end      = Math.min(cursor + RM_BATCH, total);
  const batch    = dataRows.slice(cursor, end); // 100 แถว

  const headers  = { 'Authorization': 'Bearer ' + LINE_CHANNEL_TOKEN };
  let updated = 0, noMenu = 0, failed = 0;

  // เก็บผล [rowIndex, richMenuId] แล้ว batch write ครั้งเดียว
  const writes = []; // { sheetRow, value }

  for (let i = 0; i < batch.length; i++) {
    const uid = String(batch[i][0] || '').trim();
    if (!uid) continue;

    try {
      const res  = UrlFetchApp.fetch(
        'https://api.line.me/v2/bot/user/' + encodeURIComponent(uid) + '/richmenu',
        { method: 'get', muteHttpExceptions: true, headers }
      );
      const code = res.getResponseCode();
      const sheetRow = cursor + i + 2; // +2 = header row + 1-indexed

      if (code === 200) {
        const rmId = JSON.parse(res.getContentText()).richMenuId || '';
        writes.push({ sheetRow, value: rmId });
        updated++;
      } else if (code === 404) {
        writes.push({ sheetRow, value: '' }); // ไม่มี rich menu เฉพาะ
        noMenu++;
      } else {
        failed++;
      }
    } catch (e) {
      failed++;
      console.log('rmSync error uid=' + uid + ': ' + e);
    }
  }

  // batch write column L
  if (writes.length > 0) {
    writes.forEach(w => sheet.getRange(w.sheetRow, 12).setValue(w.value));
    invalidateCache('users_rows');
  }

  // คำนวณ cursor ถัดไป (วนไม่รู้จบ)
  const nextCursor = end >= total ? 0 : end;

  // บันทึกสถานะ
  props.setProperties({
    rmSyncCursor:      String(nextCursor),
    rmSyncTotal:       String(total),
    rmSyncLastBatch:   `${cursor + 1}–${end}`,
    rmSyncLastTime:    new Date().toISOString(),
    rmSyncUpdated:     String(updated),
    rmSyncNoMenu:      String(noMenu),
    rmSyncFailed:      String(failed),
    rmSyncCyclesDone:  String(
      parseInt(props.getProperty('rmSyncCyclesDone') || '0', 10) +
      (nextCursor === 0 ? 1 : 0)
    ),
  });

  console.log(`rmSync batch ${cursor + 1}–${end}/${total} | updated:${updated} noMenu:${noMenu} failed:${failed} | next:${nextCursor}`);
}

// ดูสถานะ Rich Menu Sync
function getRichMenuSyncStatus(callerUserId) {
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  const props    = PropertiesService.getScriptProperties().getProperties();
  const triggers = ScriptApp.getProjectTriggers();
  const hasRmTrigger = triggers.some(t => t.getHandlerFunction() === 'syncRichMenusBatch');

  let lastTimeTh = '(ยังไม่เคยรัน)';
  if (props.rmSyncLastTime) {
    try { lastTimeTh = Utilities.formatDate(new Date(props.rmSyncLastTime), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss'); } catch (_) {}
  }
  return {
    success:        true,
    hasRmTrigger,
    total:          parseInt(props.rmSyncTotal    || '0', 10),
    cursor:         parseInt(props.rmSyncCursor   || '0', 10),
    lastBatch:      props.rmSyncLastBatch   || '—',
    lastTime:       lastTimeTh,
    updated:        props.rmSyncUpdated     || '0',
    noMenu:         props.rmSyncNoMenu      || '0',
    failed:         props.rmSyncFailed      || '0',
    cyclesDone:     props.rmSyncCyclesDone  || '0',
  };
}

function setupRichMenuTriggerApi(callerUserId) {
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  try {
    // ลบ trigger เก่าก่อน
    ScriptApp.getProjectTriggers().forEach(t => {
      if (t.getHandlerFunction() === 'syncRichMenusBatch') ScriptApp.deleteTrigger(t);
    });
    ScriptApp.newTrigger('syncRichMenusBatch').timeBased().everyMinutes(10).create();
    // reset cursor แล้วรันทันที
    PropertiesService.getScriptProperties().setProperty('rmSyncCursor', '0');
    syncRichMenusBatch();
    return { success: true, message: 'ติดตั้ง Rich Menu Sync Trigger ทุก 10 นาทีแล้ว' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function removeRichMenuTriggerApi(callerUserId) {
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  try {
    ScriptApp.getProjectTriggers().forEach(t => {
      if (t.getHandlerFunction() === 'syncRichMenusBatch') ScriptApp.deleteTrigger(t);
    });
    return { success: true, message: 'ลบ Rich Menu Sync Trigger แล้ว' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// ติดตั้ง Time-driven Trigger ทุก 10 นาที
// ** รันฟังก์ชันนี้ครั้งเดียวจาก Apps Script Editor หรือเรียกผ่าน Admin UI **
function setupHourlyTrigger() {
  // ลบ trigger เก่าของ syncAllLineProfilesScheduled ก่อน
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'syncAllLineProfilesScheduled') ScriptApp.deleteTrigger(t);
  });

  ScriptApp.newTrigger('syncAllLineProfilesScheduled')
    .timeBased()
    .everyMinutes(10)
    .create();

  // รัน sync ทันทีหลังติดตั้ง
  syncAllLineProfilesScheduled();

  console.log('✅ Trigger (every 10 min) installed & first sync done.');
}

// ลบเฉพาะ sync trigger (ไม่ลบ trigger อื่น)
function removeSyncTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'syncAllLineProfilesScheduled') ScriptApp.deleteTrigger(t);
  });
  console.log('Sync trigger removed.');
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

  const hasTrigger = triggers.some(t => t.funcName === 'syncAllLineProfilesScheduled');

  // แปลง profileSyncLastTime → เวลาไทย
  let profileSyncLastTimeLocal = '(ยังไม่เคย sync)';
  const pst = props.profileSyncLastTime || '';
  if (pst) {
    try {
      profileSyncLastTimeLocal = Utilities.formatDate(new Date(pst), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss');
    } catch (_) { profileSyncLastTimeLocal = pst; }
  }

  return {
    success:          true,
    triggers,
    hasHourlyTrigger: hasTrigger,
    hasSyncTrigger:   hasTrigger,
    lastSyncTime:     lastSyncLocal,
    lastSyncUpdated:  props.lastSyncUpdated || '0',
    lastSyncFailed:   props.lastSyncFailed  || '0',
    // cursor-based stats
    cursor:      parseInt(props.profileSyncCursor     || '0'),
    total:       parseInt(props.profileSyncTotal      || '0'),
    lastBatch:   parseInt(props.profileSyncLastBatch  || '0'),
    cyclesDone:  parseInt(props.profileSyncCyclesDone || '0'),
    updated:     parseInt(props.profileSyncUpdated    || '0'),
    failed:      parseInt(props.profileSyncFailed     || '0'),
    lastTime:    profileSyncLastTimeLocal,
  };
}

function checkLineToken(key) {
  if (key !== 'EXAM2025') return { success: false, message: 'Unauthorized' };
  // เช็ค token ด้วย /bot/info
  const botInfo = UrlFetchApp.fetch('https://api.line.me/v2/bot/info', {
    method: 'get', muteHttpExceptions: true,
    headers: { 'Authorization': 'Bearer ' + LINE_CHANNEL_TOKEN }
  });
  // เช็ค userId แถวแรกที่มีค่า
  const sheet   = getSheet(SHEET_USERS);
  const rows    = sheet.getRange(2, 1, Math.min(sheet.getLastRow() - 1, 3), 1).getValues();
  const firstId = rows.find(r => String(r[0]).trim())?.[0] || '';
  let userResp  = '';
  if (firstId) {
    const r = UrlFetchApp.fetch('https://api.line.me/v2/bot/profile/' + firstId, {
      method: 'get', muteHttpExceptions: true,
      headers: { 'Authorization': 'Bearer ' + LINE_CHANNEL_TOKEN }
    });
    userResp = r.getContentText();
  }
  return {
    success:      true,
    botInfo:      JSON.parse(botInfo.getContentText()),
    botStatus:    botInfo.getResponseCode(),
    firstUserId:  firstId,
    userApiResp:  userResp ? JSON.parse(userResp) : null,
  };
}

function runSyncNow(key) {
  if (key !== 'EXAM2025') return { success: false, message: 'Unauthorized' };
  syncPictureUrls();
  const props = PropertiesService.getScriptProperties().getProperties();
  return {
    success:      true,
    updatedCount: Number(props.lastSyncUpdated || 0),
    failedCount:  Number(props.lastSyncFailed  || 0),
    lastSyncTime: props.lastSyncTime || '',
  };
}

function syncPictureUrlsApi(callerUserId) {
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  syncPictureUrls();
  const props = PropertiesService.getScriptProperties().getProperties();
  return {
    success:      true,
    updatedCount: Number(props.lastSyncUpdated || 0),
    failedCount:  Number(props.lastSyncFailed  || 0),
    lastSyncTime: props.lastSyncTime || '',
  };
}

function setupSyncTriggerApi(callerUserId) {
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  try {
    setupHourlyTrigger();
    return { success: true, message: 'ติดตั้ง trigger ทุก 10 นาทีแล้ว และ sync ครั้งแรกเสร็จแล้ว' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function removeSyncTriggerApi(callerUserId) {
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  try {
    removeSyncTrigger();
    return { success: true, message: 'ลบ trigger แล้ว' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// ดึงข้อมูลของตัวเอง (สมาชิกทั่วไป ไม่ต้องเป็น admin)
function getMyProfile(userId) {
  if (!userId) return { success: false, message: 'ไม่พบ userId' };
  const sheet = getSheet(SHEET_USERS);
  if (!sheet) return { success: false, message: 'ไม่พบ Sheet' };
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() !== String(userId).trim()) continue;
    return {
      success:     true,
      lineUserId:  String(rows[i][0]  || ''),
      displayName: String(rows[i][1]  || ''),
      status:      String(rows[i][2]  || ''),
      fullName:    String(rows[i][3]  || ''),
      email:       String(rows[i][4]  || ''),
      phone:       String(rows[i][5]  || ''),
      studentId:   String(rows[i][6]  || ''),
      pictureUrl:  String(rows[i][7]  || ''),
      joinDate:    formatDate(rows[i][8]),
      role:        String(rows[i][9]  || ''),
      department:  String(rows[i][10] || ''),
      richMenuId:  String(rows[i][11] || ''),
    };
  }
  return { success: false, message: 'ไม่พบข้อมูลสมาชิก' };
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

// ════════════════════════════════════════════════
//  Courses Management
// ════════════════════════════════════════════════

function _ensureCoursesSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh = ss.getSheetByName(SHEET_COURSES);
  if (!sh) {
    sh = ss.insertSheet(SHEET_COURSES);
    sh.appendRow(['courseId', 'name', 'isOpen', 'createdAt']);
    // default courses
    const now = new Date();
    sh.appendRow(['c1', 'หลักสูตร 1', true,  now]);
    sh.appendRow(['c2', 'หลักสูตร 2', true,  now]);
    sh.appendRow(['c3', 'หลักสูตร 3', true,  now]);
  }
  return sh;
}

// getCourses — publicOnly=true: เฉพาะที่เปิด, false: ทั้งหมด (admin)
function getCourses(params) {
  const { userId } = params || {};
  const adminOnly = !!userId && isAdmin(userId);

  // CacheService 5 min (public courses ไม่ค่อยเปลี่ยน)
  if (!adminOnly) {
    const cache    = CacheService.getScriptCache();
    const cached   = cache.get('courses_public');
    if (cached) { try { return JSON.parse(cached); } catch (_) {} }
    const sh   = _ensureCoursesSheet();
    const rows = sh.getDataRange().getValues().slice(1);
    const courses = rows
      .filter(r => String(r[0]).trim())
      .map(r => ({
        courseId: String(r[0] || ''),
        name:     String(r[1] || ''),
        isOpen:   r[2] === true || String(r[2]).toLowerCase() === 'true',
        createdAt: r[3] ? formatDate(r[3]) : '',
      }))
      .filter(c => c.isOpen);
    const result = { success: true, courses };
    try { cache.put('courses_public', JSON.stringify(result), 300); } catch (_) {}
    return result;
  }

  const sh   = _ensureCoursesSheet();
  const rows = sh.getDataRange().getValues().slice(1);
  const courses = rows
    .filter(r => String(r[0]).trim())
    .map(r => ({
      courseId: String(r[0] || ''),
      name:     String(r[1] || ''),
      isOpen:   r[2] === true || String(r[2]).toLowerCase() === 'true',
      createdAt: r[3] ? formatDate(r[3]) : '',
    }));
  return { success: true, courses };
}

function addCourse(body) {
  const { callerUserId, name } = body || {};
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  if (!name || !String(name).trim()) return { success: false, message: 'กรุณากรอกชื่อหลักสูตร' };
  const sh  = _ensureCoursesSheet();
  const id  = 'c' + Date.now();
  sh.appendRow([id, String(name).trim(), true, new Date()]);
  try { CacheService.getScriptCache().remove('courses_public'); } catch (_) {}
  return { success: true, courseId: id };
}

function updateCourse(body) {
  const { callerUserId, courseId, name } = body || {};
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  if (!courseId) return { success: false, message: 'ไม่พบ courseId' };
  const sh   = _ensureCoursesSheet();
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(courseId).trim()) {
      if (name !== undefined) sh.getRange(i + 1, 2).setValue(String(name).trim());
      try { CacheService.getScriptCache().remove('courses_public'); } catch (_) {}
      return { success: true };
    }
  }
  return { success: false, message: 'ไม่พบหลักสูตร' };
}

function toggleCourse(body) {
  const { callerUserId, courseId } = body || {};
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  if (!courseId) return { success: false, message: 'ไม่พบ courseId' };
  const sh   = _ensureCoursesSheet();
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(courseId).trim()) {
      const cur = rows[i][2] === true || String(rows[i][2]).toLowerCase() === 'true';
      sh.getRange(i + 1, 3).setValue(!cur);
      try { CacheService.getScriptCache().remove('courses_public'); } catch (_) {}
      return { success: true, isOpen: !cur };
    }
  }
  return { success: false, message: 'ไม่พบหลักสูตร' };
}

function deleteCourse(body) {
  const { callerUserId, courseId } = body || {};
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  if (!courseId) return { success: false, message: 'ไม่พบ courseId' };
  const sh   = _ensureCoursesSheet();
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(courseId).trim()) {
      sh.deleteRow(i + 1);
      try { CacheService.getScriptCache().remove('courses_public'); } catch (_) {}
      return { success: true };
    }
  }
  return { success: false, message: 'ไม่พบหลักสูตร' };
}

// ══════════════════════════════════════════════════════════════
//  LAYER 1: PRE-AGGREGATED STATS
//  อัพเดตทุกครั้งที่มีการส่งข้อสอบ — ลด admin stats O(n) → O(1)
// ══════════════════════════════════════════════════════════════

// สร้าง sheet ถ้ายังไม่มี + คืน sheet object
function _ensureSheet(name, headers) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh   = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    const hdr = sh.getRange(1, 1, 1, headers.length);
    hdr.setFontWeight('bold');
    hdr.setBackground('#374151');
    hdr.setFontColor('#ffffff');
  }
  return sh;
}

// อัพเดต _SummaryStats: userId | displayName | totalAttempts | totalPass | bestScore | lastAttempt | avgScore
function _updateSummaryStats(userId, displayName, pct, isPass) {
  const sh   = _ensureSheet(SHEET_SUMMARY, ['userId','displayName','totalAttempts','totalPass','bestScore','lastAttempt','avgScore']);
  const data = sh.getDataRange().getValues();
  let rowIdx = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(userId).trim()) { rowIdx = i; break; }
  }
  if (rowIdx === -1) {
    sh.appendRow([userId, displayName || '', 1, isPass ? 1 : 0, pct, new Date(), pct]);
  } else {
    var r        = data[rowIdx];
    var attempts = (Number(r[2]) || 0) + 1;
    var passes   = (Number(r[3]) || 0) + (isPass ? 1 : 0);
    var best     = Math.max(Number(r[4]) || 0, pct);
    var avg      = Math.round(((Number(r[6]) || 0) * (Number(r[2]) || 0) + pct) / attempts);
    sh.getRange(rowIdx + 1, 2, 1, 6).setValues([[displayName || r[1] || '', attempts, passes, best, new Date(), avg]]);
  }
}

// อัพเดต _DailyStats: date | attempts | pass | fail
function _updateDailyStat(isPass) {
  const sh    = _ensureSheet(SHEET_DAILY, ['date','attempts','pass','fail']);
  const today = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
  const data  = sh.getDataRange().getValues();
  var rowIdx  = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === today) { rowIdx = i; break; }
  }
  if (rowIdx === -1) {
    sh.appendRow([today, 1, isPass ? 1 : 0, isPass ? 0 : 1]);
  } else {
    var r = data[rowIdx];
    sh.getRange(rowIdx + 1, 2, 1, 3).setValues([[
      (Number(r[1]) || 0) + 1,
      (Number(r[2]) || 0) + (isPass ? 1 : 0),
      (Number(r[3]) || 0) + (isPass ? 0 : 1),
    ]]);
  }
}

// ══════════════════════════════════════════════════════════════
//  LAYER 3: ARCHIVE — ย้ายข้อมูลเก่า > 6 เดือน → Results_YYYY
//  เรียกด้วยตนเอง หรือตั้ง Monthly Trigger อัตโนมัติ
// ══════════════════════════════════════════════════════════════

function _archiveOldResultsInternal() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_RESULTS);
  if (!sheet || sheet.getLastRow() <= 1) return { archived: 0, kept: 0 };

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 6); // เก็บ 6 เดือนใน active sheet

  const allRows = sheet.getDataRange().getValues();
  const header  = allRows[0];

  // แบ่ง rows เป็น archive vs keep
  const toArchive   = [];
  const archiveIdxs = []; // row index (1-based) ที่จะลบ

  for (var i = 1; i < allRows.length; i++) {
    const rowDate = new Date(allRows[i][0]);
    if (isNaN(rowDate) || rowDate < cutoff) {
      toArchive.push(allRows[i]);
      archiveIdxs.push(i + 1);
    }
  }

  if (toArchive.length === 0) return { archived: 0, kept: sheet.getLastRow() - 1 };

  // จัดกลุ่มตามปี
  const byYear = {};
  toArchive.forEach(function(row) {
    const y = (new Date(row[0])).getFullYear() || new Date().getFullYear();
    if (!byYear[y]) byYear[y] = [];
    byYear[y].push(row);
  });

  // เขียนลง archive sheets (Results_YYYY)
  var totalWritten = 0;
  Object.keys(byYear).forEach(function(year) {
    const rows        = byYear[year];
    const archiveName = 'Results_' + year;
    var archSheet     = ss.getSheetByName(archiveName);
    if (!archSheet) {
      archSheet = ss.insertSheet(archiveName);
      archSheet.appendRow(header);
      archSheet.setFrozenRows(1);
      const hdr = archSheet.getRange(1, 1, 1, header.length);
      hdr.setFontWeight('bold');
      hdr.setBackground('#4a5568');
      hdr.setFontColor('#ffffff');
    }
    const lastRow = archSheet.getLastRow();
    archSheet.getRange(lastRow + 1, 1, rows.length, rows[0].length).setValues(rows);
    totalWritten += rows.length;
  });

  // ลบแถวเก่าออกจาก active sheet (จากล่างขึ้นบนเพื่อไม่ให้ index เลื่อน)
  for (var j = archiveIdxs.length - 1; j >= 0; j--) {
    sheet.deleteRow(archiveIdxs[j]);
  }

  // บันทึกเวลา archive ล่าสุด
  try {
    const props = PropertiesService.getScriptProperties();
    props.setProperty('lastArchiveTime',  new Date().toISOString());
    props.setProperty('lastArchiveCount', String(totalWritten));
  } catch (_) {}

  // Clear stats cache
  try { CacheService.getScriptCache().remove('adminStats_all'); } catch (_) {}

  return { archived: totalWritten, kept: sheet.getLastRow() - 1 };
}

function archiveOldResults(callerUserId) {
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  try {
    const r = _archiveOldResultsInternal();
    return { success: true, archived: r.archived, kept: r.kept };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// Scheduled trigger handler (รันโดย Time-based Trigger ทุกวันที่ 1)
function archiveOldResultsScheduled() {
  try { _archiveOldResultsInternal(); } catch (_) {}
}

function setupArchiveTrigger(callerUserId) {
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  ScriptApp.getProjectTriggers()
    .filter(function(t) { return t.getHandlerFunction() === 'archiveOldResultsScheduled'; })
    .forEach(function(t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('archiveOldResultsScheduled')
    .timeBased().onMonthDay(1).atHour(2).create();
  return { success: true, message: 'ตั้ง Archive Trigger สำเร็จ (รันทุกวันที่ 1 เวลา 02:00 น.)' };
}

function removeArchiveTrigger(callerUserId) {
  if (!isAdmin(callerUserId)) return { success: false, message: 'ไม่มีสิทธิ์' };
  var removed = 0;
  ScriptApp.getProjectTriggers()
    .filter(function(t) { return t.getHandlerFunction() === 'archiveOldResultsScheduled'; })
    .forEach(function(t) { ScriptApp.deleteTrigger(t); removed++; });
  return { success: true, removed: removed };
}
