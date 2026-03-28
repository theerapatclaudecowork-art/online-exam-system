import { GAS_URL } from '../config';

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

export async function apiPost(body) {
  const res = await fetchWithTimeout(GAS_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'text/plain' },
    body:    JSON.stringify(body),
  });
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
