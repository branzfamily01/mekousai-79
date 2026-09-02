const CATEGORIES = new Set(['preparation','creation','after-school','rehearsal','final-prep','festival-day','awards']);
const MAX_FILE_BYTES = 12 * 1024 * 1024;
const ALLOWED_MIME = new Map([['image/jpeg','jpg'],['image/png','png'],['image/webp','webp'],['image/avif','avif']]);
const SESSION_SECONDS = 60 * 60 * 12;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;

export default {
  async fetch(request, env) {
    try {
      return await route(request, env);
    } catch (error) {
      console.error('mekousai-gallery-api', error);
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof HttpError ? error.message : 'サーバー処理に失敗しました。';
      return json(request, env, { error: message }, status);
    }
  }
};

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (request.method === 'OPTIONS') return preflight(request, env);
  if (path === '/api/health' && request.method === 'GET') {
    return json(request, env, { ok: Boolean(env.DB && env.MEDIA), service: 'mekousai-gallery-api' });
  }
  if (path === '/api/categories' && request.method === 'GET') return getCategories(request, env);
  if (path === '/api/photos' && request.method === 'GET') return getPublicPhotos(request, env, url);
  if (path.startsWith('/media/') && request.method === 'GET') return getMedia(request, env, path.slice('/media/'.length));
  if (path === '/api/login' && request.method === 'POST') return login(request, env);

  if (path.startsWith('/api/admin/') || (path.startsWith('/api/photos') && request.method !== 'GET')) {
    if (!(await isAuthorized(request, env))) return json(request, env, { error: '編集者ログインが必要です。' }, 401);
  }
  if (path === '/api/admin/me' && request.method === 'GET') return json(request, env, { ok: true });
  if (path === '/api/admin/photos' && request.method === 'GET') return getAdminPhotos(request, env, url);
  if (path === '/api/photos' && request.method === 'POST') return uploadPhoto(request, env);

  let match = path.match(/^\/api\/photos\/([0-9a-f-]+)$/i);
  if (match && request.method === 'PATCH') return patchPhoto(request, env, match[1]);
  if (match && request.method === 'DELETE') return deletePhoto(request, env, match[1]);
  match = path.match(/^\/api\/photos\/([0-9a-f-]+)\/cover$/i);
  if (match && request.method === 'POST') return setCover(request, env, match[1]);
  return json(request, env, { error: 'Not found' }, 404);
}

function allowedOrigin(request, env) {
  const origin = request.headers.get('Origin');
  if (!origin) return null;
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean);
  return allowed.includes(origin) ? origin : null;
}
function cors(request, env) {
  const h = new Headers();
  const origin = allowedOrigin(request, env);
  if (origin) h.set('Access-Control-Allow-Origin', origin);
  h.set('Vary', 'Origin');
  h.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  h.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  h.set('Access-Control-Max-Age', '86400');
  return h;
}
function preflight(request, env) {
  if (request.headers.get('Origin') && !allowedOrigin(request, env)) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: cors(request, env) });
}
function json(request, env, body, status = 200, extra = {}) {
  const headers = cors(request, env); headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', extra.cacheControl || 'no-store');
  return new Response(JSON.stringify(body), { status, headers });
}
function requireCategory(value) {
  const category = String(value || '');
  if (!CATEGORIES.has(category)) throw new HttpError(400, 'カテゴリが不正です。');
  return category;
}
function cleanCaption(value) { return String(value || '').trim().slice(0, 500); }
function cleanDate(value) {
  if (!value) return null;
  const s = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new HttpError(400, '撮影日の形式が不正です。');
  return s;
}
function mediaUrl(request, objectKey) {
  const origin = new URL(request.url).origin;
  return `${origin}/media/${objectKey.split('/').map(encodeURIComponent).join('/')}`;
}
function mapPhoto(request, row) {
  return {
    id: row.id, category: row.category, caption: row.caption || '', takenOn: row.taken_on || null,
    published: Boolean(row.published), isCover: Boolean(row.is_cover), sortOrder: row.sort_order || 0,
    width: row.width || null, height: row.height || null, bytes: row.bytes || null,
    createdAt: row.created_at, url: mediaUrl(request, row.object_key)
  };
}

async function getCategories(request, env) {
  const result = await env.DB.prepare(`SELECT * FROM photos WHERE published = 1 ORDER BY category ASC, is_cover DESC, COALESCE(taken_on,'') DESC, sort_order ASC, created_at DESC`).all();
  const map = new Map();
  for (const row of result.results || []) {
    const item = map.get(row.category) || { category: row.category, count: 0, coverUrl: null };
    item.count += 1;
    if (!item.coverUrl) item.coverUrl = mediaUrl(request, row.object_key);
    map.set(row.category, item);
  }
  return json(request, env, { categories: [...map.values()] }, 200, { cacheControl: 'public, max-age=30' });
}
async function getPublicPhotos(request, env, url) {
  const category = requireCategory(url.searchParams.get('category'));
  const result = await env.DB.prepare(`SELECT * FROM photos WHERE category = ?1 AND published = 1 ORDER BY is_cover DESC, COALESCE(taken_on,'') DESC, sort_order ASC, created_at DESC`).bind(category).all();
  return json(request, env, { category, photos: (result.results || []).map(row => mapPhoto(request, row)) }, 200, { cacheControl: 'public, max-age=30' });
}
async function getAdminPhotos(request, env, url) {
  const category = requireCategory(url.searchParams.get('category'));
  const result = await env.DB.prepare(`SELECT * FROM photos WHERE category = ?1 ORDER BY is_cover DESC, COALESCE(taken_on,'') DESC, sort_order ASC, created_at DESC`).bind(category).all();
  return json(request, env, { category, photos: (result.results || []).map(row => mapPhoto(request, row)) });
}
async function getMedia(request, env, encodedKey) {
  const key = encodedKey.split('/').map(decodeURIComponent).join('/');
  const row = await env.DB.prepare(`SELECT published FROM photos WHERE object_key = ?1`).bind(key).first();
  if (!row || !row.published) return new Response('Not found', { status: 404 });
  const object = await env.MEDIA.get(key);
  if (!object || !object.body) return new Response('Not found', { status: 404 });
  const headers = new Headers(); object.writeHttpMetadata(headers); headers.set('ETag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable'); headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(object.body, { headers });
}

async function uploadPhoto(request, env) {
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) throw new HttpError(400, '写真ファイルがありません。');
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) throw new HttpError(413, '写真は1枚12MB以下にしてください。');
  const ext = ALLOWED_MIME.get(file.type);
  if (!ext) throw new HttpError(415, 'JPEG / PNG / WebP / AVIF の写真のみ対応しています。');
  const category = requireCategory(form.get('category'));
  const caption = cleanCaption(form.get('caption'));
  const takenOn = cleanDate(form.get('taken_on'));
  const published = String(form.get('published')) === '1' ? 1 : 0;
  const width = clampInt(form.get('width'), 1, 20000);
  const height = clampInt(form.get('height'), 1, 20000);
  const id = crypto.randomUUID();
  const objectKey = `photos/${category}/${id}.${ext}`;
  const now = new Date().toISOString();
  const orderRow = await env.DB.prepare(`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM photos WHERE category = ?1`).bind(category).first();
  const sortOrder = Number(orderRow?.next_order || 0);
  await env.MEDIA.put(objectKey, file.stream(), { httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' }, customMetadata: { photoId: id } });
  try {
    const coverRow = await env.DB.prepare(`SELECT COUNT(*) AS n FROM photos WHERE category = ?1 AND published = 1 AND is_cover = 1`).bind(category).first();
    const isCover = published && Number(coverRow?.n || 0) === 0 ? 1 : 0;
    await env.DB.prepare(`INSERT INTO photos (id, object_key, category, caption, taken_on, mime_type, width, height, bytes, published, is_cover, sort_order, created_at, updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?13)`)
      .bind(id, objectKey, category, caption, takenOn, file.type, width, height, file.size, published, isCover, sortOrder, now).run();
  } catch (error) { await env.MEDIA.delete(objectKey); throw error; }
  const row = await env.DB.prepare(`SELECT * FROM photos WHERE id = ?1`).bind(id).first();
  return json(request, env, { photo: mapPhoto(request, row) }, 201);
}

async function patchPhoto(request, env, id) {
  const row = await env.DB.prepare(`SELECT * FROM photos WHERE id = ?1`).bind(id).first();
  if (!row) throw new HttpError(404, '写真が見つかりません。');
  const body = await request.json();
  const caption = Object.hasOwn(body, 'caption') ? cleanCaption(body.caption) : row.caption;
  const takenOn = Object.hasOwn(body, 'takenOn') ? cleanDate(body.takenOn) : row.taken_on;
  const published = Object.hasOwn(body, 'published') ? (body.published ? 1 : 0) : row.published;
  const isCover = published ? row.is_cover : 0;
  const now = new Date().toISOString();
  await env.DB.prepare(`UPDATE photos SET caption=?1, taken_on=?2, published=?3, is_cover=?4, updated_at=?5 WHERE id=?6`).bind(caption, takenOn, published, isCover, now, id).run();
  if (!published && row.is_cover) await ensureCover(env, row.category);
  const next = await env.DB.prepare(`SELECT * FROM photos WHERE id = ?1`).bind(id).first();
  return json(request, env, { photo: mapPhoto(request, next) });
}
async function setCover(request, env, id) {
  const row = await env.DB.prepare(`SELECT * FROM photos WHERE id = ?1`).bind(id).first();
  if (!row) throw new HttpError(404, '写真が見つかりません。');
  await env.DB.batch([
    env.DB.prepare(`UPDATE photos SET is_cover=0, updated_at=?1 WHERE category=?2`).bind(new Date().toISOString(), row.category),
    env.DB.prepare(`UPDATE photos SET is_cover=1, published=1, updated_at=?1 WHERE id=?2`).bind(new Date().toISOString(), id)
  ]);
  return json(request, env, { ok: true });
}
async function deletePhoto(request, env, id) {
  const row = await env.DB.prepare(`SELECT * FROM photos WHERE id = ?1`).bind(id).first();
  if (!row) throw new HttpError(404, '写真が見つかりません。');
  await env.MEDIA.delete(row.object_key);
  await env.DB.prepare(`DELETE FROM photos WHERE id = ?1`).bind(id).run();
  if (row.is_cover) await ensureCover(env, row.category);
  return json(request, env, { ok: true });
}
async function ensureCover(env, category) {
  const existing = await env.DB.prepare(`SELECT id FROM photos WHERE category=?1 AND published=1 AND is_cover=1 LIMIT 1`).bind(category).first();
  if (existing) return;
  const candidate = await env.DB.prepare(`SELECT id FROM photos WHERE category=?1 AND published=1 ORDER BY COALESCE(taken_on,'') DESC, created_at DESC LIMIT 1`).bind(category).first();
  if (candidate) await env.DB.prepare(`UPDATE photos SET is_cover=1 WHERE id=?1`).bind(candidate.id).run();
}

async function login(request, env) {
  if (!env.EDITOR_PASSCODE || !env.SESSION_SECRET) return json(request, env, { error: '編集者認証のSecretが未設定です。' }, 503);
  if (request.headers.get('Origin') && !allowedOrigin(request, env)) return json(request, env, { error: 'この編集画面からはログインできません。' }, 403);
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipHash = await sha256Hex(`${env.SESSION_SECRET}:${ip}`);
  const now = Date.now();
  const attempt = await env.DB.prepare(`SELECT window_start, failures FROM auth_attempts WHERE ip_hash=?1`).bind(ipHash).first();
  if (attempt && now - Number(attempt.window_start) < LOGIN_WINDOW_MS && Number(attempt.failures) >= LOGIN_MAX_FAILURES) {
    return json(request, env, { error: 'ログイン試行が多すぎます。10分後に再試行してください。' }, 429);
  }
  const body = await request.json().catch(() => ({}));
  const ok = safeEqual(String(body.passcode || ''), String(env.EDITOR_PASSCODE));
  if (!ok) {
    if (!attempt || now - Number(attempt.window_start) >= LOGIN_WINDOW_MS) {
      await env.DB.prepare(`INSERT INTO auth_attempts (ip_hash, window_start, failures) VALUES (?1,?2,1) ON CONFLICT(ip_hash) DO UPDATE SET window_start=excluded.window_start, failures=1`).bind(ipHash, now).run();
    } else {
      await env.DB.prepare(`UPDATE auth_attempts SET failures=failures+1 WHERE ip_hash=?1`).bind(ipHash).run();
    }
    return json(request, env, { error: 'パスコードが違います。' }, 401);
  }
  await env.DB.prepare(`DELETE FROM auth_attempts WHERE ip_hash=?1`).bind(ipHash).run();
  return json(request, env, { token: await issueToken(env.SESSION_SECRET), expiresIn: SESSION_SECONDS });
}
async function issueToken(secret) {
  const payload = base64url(new TextEncoder().encode(JSON.stringify({ iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+SESSION_SECONDS, nonce: crypto.randomUUID() })));
  const sig = await hmac(secret, payload); return `${payload}.${sig}`;
}
async function isAuthorized(request, env) {
  if (!env.SESSION_SECRET) return false;
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return false;
  const token = auth.slice(7); const [payload, sig, extra] = token.split('.');
  if (!payload || !sig || extra) return false;
  const expected = await hmac(env.SESSION_SECRET, payload); if (!safeEqual(sig, expected)) return false;
  try {
    const data = JSON.parse(new TextDecoder().decode(base64urlDecode(payload)));
    return Number(data.exp) > Math.floor(Date.now()/1000);
  } catch { return false; }
}
async function hmac(secret, value) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
  return base64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))));
}
async function sha256Hex(value) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  return [...bytes].map(b => b.toString(16).padStart(2,'0')).join('');
}
function base64url(bytes) {
  let binary=''; for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function base64urlDecode(value) {
  const normalized = value.replace(/-/g,'+').replace(/_/g,'/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded); return Uint8Array.from(binary, c => c.charCodeAt(0));
}
function safeEqual(a,b) {
  const x=new TextEncoder().encode(a), y=new TextEncoder().encode(b); let diff=x.length^y.length;
  const len=Math.max(x.length,y.length); for(let i=0;i<len;i++) diff |= (x[i%x.length]||0) ^ (y[i%y.length]||0); return diff===0;
}
function clampInt(value,min,max) { const n=Number.parseInt(String(value||''),10); return Number.isFinite(n) ? Math.min(max,Math.max(min,n)) : null; }
class HttpError extends Error { constructor(status,message){ super(message); this.status=status; } }
