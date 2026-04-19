import { GAS_URL } from '../config';

// Expose GAS_URL globally สำหรับ ErrorBoundary sendBeacon fallback
try { if (typeof window !== 'undefined') window.GAS_URL = GAS_URL; } catch (_) {}

// ─────────────────────────────────────────────────────────────
//  Client Token Generator — สำหรับ idempotency ใน saveResult
// ─────────────────────────────────────────────────────────────
export function genClientToken() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch (_) {}
  return 'ct_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
}

// ─────────────────────────────────────────────────────────────
//  Global Error Reporter — for unhandled window errors
// ─────────────────────────────────────────────────────────────
let _errorReportThrottle = 0;
export function reportError(message, opts = {}) {
  const now = Date.now();
  if (now - _errorReportThrottle < 2000) return; // กัน spam 2s
  _errorReportThrottle = now;
  try {
    apiPost({
      action:  'logError',
      severity: opts.severity || 'error',
      message:  String(message || '').slice(0, 500),
      stack:    String(opts.stack || '').slice(0, 2000),
      context:  String(opts.context || '').slice(0, 500),
      screen:   opts.screen || (typeof window !== 'undefined' ? window.location.hash : ''),
      userId:   opts.userId || (() => {
        try { const p = JSON.parse(localStorage.getItem('profile') || '{}'); return p.userId || p.lineUserId || ''; }
        catch (_) { return ''; }
      })(),
      ua: (typeof navigator !== 'undefined') ? String(navigator.userAgent).slice(0, 200) : '',
    }).catch(() => {});
  } catch (_) {}
}

// ติดตั้ง global handlers ครั้งเดียว
try {
  if (typeof window !== 'undefined' && !window.__errorHandlersInstalled) {
    window.__errorHandlersInstalled = true;
    window.addEventListener('error', (e) => {
      try { reportError(e.message || 'window error', { stack: e.error && e.error.stack, context: (e.filename || '') + ':' + (e.lineno || '') }); } catch (_) {}
    });
    window.addEventListener('unhandledrejection', (e) => {
      try {
        const reason = e.reason;
        reportError(
          (reason && reason.message) || String(reason || 'unhandled promise rejection'),
          { stack: reason && reason.stack, context: 'unhandledrejection' }
        );
      } catch (_) {}
    });
  }
} catch (_) {}


// ─────────────────────────────────────────────────────────────
//  localStorage cache helpers
// ─────────────────────────────────────────────────────────────
export function lsSet(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch (_) {}
}

export function lsGet(key, ttlMs) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > ttlMs) return null;
    return data;
  } catch (_) { return null; }
}

export function lsDel(key) {
  try { localStorage.removeItem(key); } catch (_) {}
}

// ─────────────────────────────────────────────────────────────
//  Fetch with timeout (15s)
// ─────────────────────────────────────────────────────────────
function fetchWithTimeout(url, options = {}, ms = 15000) {
  const ctrl = new AbortController();
  const tid   = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...options, signal: ctrl.signal, redirect: 'follow' })
    .finally(() => clearTimeout(tid));
}

// ─────────────────────────────────────────────────────────────
//  API helpers
// ─────────────────────────────────────────────────────────────
export async function apiGet(action, params = {}) {
  const url = new URL(GAS_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetchWithTimeout(url.toString());
  return res.json();
}

export async function apiPost(body, ms) {
  const res = await fetchWithTimeout(GAS_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'text/plain' },
    body:    JSON.stringify(body),
  }, ms);
  return res.json();
}

// ─────────────────────────────────────────────────────────────
//  Cached GET — ลอง localStorage ก่อน ถ้าหมดอายุค่อย fetch จาก GAS
//  stale-while-revalidate: คืนค่า stale ทันที แล้ว refetch ใน background
// ─────────────────────────────────────────────────────────────
export async function apiGetCached(action, params = {}, ttlMs = 300_000) {
  const cacheKey = 'gc_' + action + '_' + JSON.stringify(params);

  // ถ้ามี cache ที่ยังสด → คืนทันทีพร้อม background revalidate
  const hit = lsGet(cacheKey, ttlMs);
  if (hit !== null) {
    // revalidate หลังคืน (stale-while-revalidate)
    apiGet(action, params).then(d => {
      if (d && d.success !== false) lsSet(cacheKey, d);
    }).catch(() => {});
    return hit;
  }

  // ไม่มี cache → fetch ตรง
  const data = await apiGet(action, params);
  if (data && data.success !== false) lsSet(cacheKey, data);
  return data;
}

// ─────────────────────────────────────────────────────────────
//  Invalidate cache key prefix (eg. after write ops)
// ─────────────────────────────────────────────────────────────
export function lsInvalidate(actionPrefix) {
  try {
    const prefix = 'gc_' + actionPrefix;
    Object.keys(localStorage)
      .filter(k => k.startsWith(prefix))
      .forEach(k => localStorage.removeItem(k));
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────────
//  #9 Offline queue — เก็บ POST ที่ล้มเหลว แล้ว sync ภายหลัง
// ─────────────────────────────────────────────────────────────
const OFFLINE_QUEUE_KEY = 'offline_post_queue';

function _getQueue() {
  try { return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]'); } catch (_) { return []; }
}

function _saveQueue(q) {
  try { localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q)); } catch (_) {}
}

export function getOfflineQueueCount() {
  return _getQueue().length;
}

/** POST ที่ offline-safe: ถ้าไม่มีเน็ต จะเก็บลง queue แล้วคืน { success: true, queued: true } */
export async function apiPostQueued(body) {
  try {
    const res = await fetchWithTimeout(GAS_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain' },
      body:    JSON.stringify(body),
    });
    return res.json();
  } catch (_) {
    const q = _getQueue();
    q.push({ ...body, _queuedAt: Date.now() });
    _saveQueue(q);
    return { success: true, queued: true };
  }
}

/** Sync queued items เมื่อกลับมาออนไลน์ — คืนจำนวนรายการที่ sync สำเร็จ */
export async function syncOfflineQueue() {
  const q = _getQueue();
  if (!q.length) return 0;
  const remaining = [];
  let synced = 0;
  for (const item of q) {
    try {
      const res  = await fetchWithTimeout(GAS_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'text/plain' },
        body:    JSON.stringify(item),
      });
      const data = await res.json();
      if (data && data.success !== false) synced++;
      else remaining.push(item);
    } catch (_) {
      remaining.push(item);
    }
  }
  _saveQueue(remaining);
  return synced;
}
