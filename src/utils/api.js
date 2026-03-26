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
//  API helpers
// ─────────────────────────────────────────────────────────────
export async function apiGet(action, params = {}) {
  const url = new URL(GAS_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url.toString(), { redirect: 'follow' });
  return res.json();
}

export async function apiPost(body) {
  const res = await fetch(GAS_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'text/plain' },
    body:    JSON.stringify(body),
    redirect: 'follow',
  });
  return res.json();
}

// ─────────────────────────────────────────────────────────────
//  Cached GET — ลอง localStorage ก่อน ถ้าหมดอายุค่อย fetch จาก GAS
// ─────────────────────────────────────────────────────────────
export async function apiGetCached(action, params = {}, ttlMs = 300_000) {
  const cacheKey = 'gc_' + action + '_' + JSON.stringify(params);
  const hit = lsGet(cacheKey, ttlMs);
  if (hit !== null) return hit;
  const data = await apiGet(action, params);
  if (data && (data.success !== false)) lsSet(cacheKey, data);
  return data;
}
