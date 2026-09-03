const CATEGORIES = ['preparation','creation','after-school','rehearsal','final-prep','festival-day','awards'];
const CATEGORY_SET = new Set(CATEGORIES);
const MAX_FILE_BYTES = 12 * 1024 * 1024;
const ALLOWED_MIME = new Map([['image/jpeg','jpg'],['image/png','png'],['image/webp','webp'],['image/avif','avif']]);
const SESSION_SECONDS = 60 * 60 * 12;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;
const META_ROOT = '_mekousai/meta';
const AUTH_ROOT = '_mekousai/auth';

export default {
  async fetch(request, env) {
    try {
      if (!env.MEDIA) throw new HttpError(503, 'R2 bucket が未接続です。');
      return await route(request, env);
    } catch (error) {
      console.error('mekousai-gallery-r2', error);
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof HttpError ? error.message : 'サーバー処理に失敗しました。';
      return json({ error: message }, status);
    }
  }
};

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
  if (path === '/api/health' && request.method === 'GET') return json({ ok: Boolean(env.MEDIA), service: 'mekousai-gallery-r2' });
  if (path === '/api/categories' && request.method === 'GET') return getCategories(request, env);
  if (path === '/api/photos' && request.method === 'GET') return getPublicPhotos(request, env, url);
  if (path.startsWith('/media/') && request.method === 'GET') return getMedia(request, env, path.slice('/media/'.length));
  if (path === '/api/login' && request.method === 'POST') return login(request, env);

  if (path.startsWith('/api/admin/') || (path.startsWith('/api/photos') && request.method !== 'GET')) {
    if (!(await isAuthorized(request, env))) return json({ error: '編集者ログインが必要です。' }, 401);
  }
  if (path === '/api/admin/me' && request.method === 'GET') return json({ ok: true });
  if (path === '/api/admin/photos' && request.method === 'GET') return getAdminPhotos(request, env, url);
  if (path === '/api/photos' && request.method === 'POST') return uploadPhoto(request, env);

  let match = path.match(/^\/api\/photos\/([0-9a-f-]+)$/i);
  if (match && request.method === 'PATCH') return patchPhoto(request, env, match[1]);
  if (match && request.method === 'DELETE') return deletePhoto(request, env, match[1]);
  match = path.match(/^\/api\/photos\/([0-9a-f-]+)\/cover$/i);
  if (match && request.method === 'POST') return setCover(request, env, match[1]);
  return json({ error: 'Not found' }, 404);
}

function cors() {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  };
}
function json(body, status = 200, extra = {}) {
  const headers = new Headers(cors());
  if (extra.cacheControl) headers.set('Cache-Control', extra.cacheControl);
  return new Response(JSON.stringify(body), { status, headers });
}
function requireCategory(value) {
  const category = String(value || '');
  if (!CATEGORY_SET.has(category)) throw new HttpError(400, 'カテゴリが不正です。');
  return category;
}
function cleanCaption(value) { return String(value || '').trim().slice(0, 500); }
function cleanDate(value) {
  if (!value) return null;
  const s = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new HttpError(400, '撮影日の形式が不正です。');
  return s;
}
function clampInt(value, min, max) {
  const n = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;
}
function metaKey(category, id) { return `${META_ROOT}/${category}/${id}.json`; }
function authKey(ipHash) { return `${AUTH_ROOT}/${ipHash}.json`; }
function mediaUrl(request, objectKey) {
  const origin = new URL(request.url).origin;
  return `${origin}/media/${objectKey.split('/').map(encodeURIComponent).join('/')}`;
}
function mapPhoto(request, meta) {
  return {
    id: meta.id,
    category: meta.category,
    caption: meta.caption || '',
    takenOn: meta.takenOn || null,
    published: Boolean(meta.published),
    isCover: Boolean(meta.isCover),
    sortOrder: Number(meta.sortOrder || 0),
    width: meta.width || null,
    height: meta.height || null,
    bytes: meta.bytes || null,
    createdAt: meta.createdAt,
    url: mediaUrl(request, meta.objectKey)
  };
}

async function readJsonObject(bucket, key) {
  const obj = await bucket.get(key);
  if (!obj) return null;
  try { return await obj.json(); } catch { return null; }
}
async function writeJsonObject(bucket, key, value) {
  await bucket.put(key, JSON.stringify(value), { httpMetadata: { contentType: 'application/json; charset=utf-8' } });
}
async function listCategoryMeta(env, category) {
  const prefix = `${META_ROOT}/${category}/`;
  const metas = [];
  let cursor;
  do {
    const page = await env.MEDIA.list({ prefix, cursor, limit: 1000 });
    const chunk = await Promise.all(page.objects.map(obj => readJsonObject(env.MEDIA, obj.key)));
    metas.push(...chunk.filter(Boolean));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return metas;
}
function sortMetas(items) {
  return [...items].sort((a, b) => {
    if (Boolean(a.isCover) !== Boolean(b.isCover)) return a.isCover ? -1 : 1;
    const dateCmp = String(b.takenOn || '').localeCompare(String(a.takenOn || ''));
    if (dateCmp) return dateCmp;
    const orderCmp = Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
    if (orderCmp) return orderCmp;
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });
}
async function findMeta(env, id) {
  for (const category of CATEGORIES) {
    const key = metaKey(category, id);
    const meta = await readJsonObject(env.MEDIA, key);
    if (meta) return { meta, key };
  }
  return null;
}

async function getCategories(request, env) {
  const categories = [];
  for (const category of CATEGORIES) {
    const all = sortMetas(await listCategoryMeta(env, category));
    const published = all.filter(item => item.published);
    if (!published.length) continue;
    categories.push({ category, count: published.length, coverUrl: mediaUrl(request, published[0].objectKey) });
  }
  return json({ categories }, 200, { cacheControl: 'public, max-age=30' });
}
async function getPublicPhotos(request, env, url) {
  const category = requireCategory(url.searchParams.get('category'));
  const photos = sortMetas(await listCategoryMeta(env, category)).filter(item => item.published).map(meta => mapPhoto(request, meta));
  return json({ category, photos }, 200, { cacheControl: 'public, max-age=30' });
}
async function getAdminPhotos(request, env, url) {
  const category = requireCategory(url.searchParams.get('category'));
  const photos = sortMetas(await listCategoryMeta(env, category)).map(meta => mapPhoto(request, meta));
  return json({ category, photos });
}
async function getMedia(request, env, encodedKey) {
  const key = encodedKey.split('/').map(decodeURIComponent).join('/');
  const match = key.match(/\/([0-9a-f-]+)\.[a-z0-9]+$/i);
  if (!match) return new Response('Not found', { status: 404 });
  const found = await findMeta(env, match[1]);
  if (!found?.meta?.published || found.meta.objectKey !== key) return new Response('Not found', { status: 404 });
  const object = await env.MEDIA.get(key);
  if (!object?.body) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('ETag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=3600');
  headers.set('X-Content-Type-Options', 'nosniff');
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
  const published = String(form.get('published')) === '1';
  const width = clampInt(form.get('width'), 1, 20000);
  const height = clampInt(form.get('height'), 1, 20000);
  const id = crypto.randomUUID();
  const objectKey = `photos/${category}/${id}.${ext}`;
  const now = new Date().toISOString();
  const existing = await listCategoryMeta(env, category);
  const sortOrder = existing.reduce((max, x) => Math.max(max, Number(x.sortOrder || 0)), -1) + 1;
  const isCover = published && !existing.some(x => x.published && x.isCover);
  const meta = { id, objectKey, category, caption, takenOn, mimeType: file.type, width, height, bytes: file.size, published, isCover, sortOrder, createdAt: now, updatedAt: now };
  await env.MEDIA.put(objectKey, file.stream(), { httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=3600' }, customMetadata: { photoId: id, category } });
  try { await writeJsonObject(env.MEDIA, metaKey(category, id), meta); }
  catch (error) { await env.MEDIA.delete(objectKey); throw error; }
  return json({ photo: mapPhoto(request, meta) }, 201);
}

async function patchPhoto(request, env, id) {
  const found = await findMeta(env, id);
  if (!found) throw new HttpError(404, '写真が見つかりません。');
  const { meta, key } = found;
  const body = await request.json().catch(() => ({}));
  const wasCover = Boolean(meta.isCover);
  meta.caption = Object.hasOwn(body, 'caption') ? cleanCaption(body.caption) : meta.caption;
  meta.takenOn = Object.hasOwn(body, 'takenOn') ? cleanDate(body.takenOn) : meta.takenOn;
  meta.published = Object.hasOwn(body, 'published') ? Boolean(body.published) : Boolean(meta.published);
  if (!meta.published) meta.isCover = false;
  meta.updatedAt = new Date().toISOString();
  await writeJsonObject(env.MEDIA, key, meta);
  if (wasCover && !meta.isCover) await ensureCover(env, meta.category);
  return json({ photo: mapPhoto(request, meta) });
}
async function setCover(request, env, id) {
  const found = await findMeta(env, id);
  if (!found) throw new HttpError(404, '写真が見つかりません。');
  const target = found.meta;
  const all = await listCategoryMeta(env, target.category);
  const now = new Date().toISOString();
  await Promise.all(all.map(async meta => {
    const shouldCover = meta.id === id;
    if (Boolean(meta.isCover) === shouldCover && (!shouldCover || meta.published)) return;
    meta.isCover = shouldCover;
    if (shouldCover) meta.published = true;
    meta.updatedAt = now;
    await writeJsonObject(env.MEDIA, metaKey(meta.category, meta.id), meta);
  }));
  return json({ ok: true });
}
async function deletePhoto(request, env, id) {
  const found = await findMeta(env, id);
  if (!found) throw new HttpError(404, '写真が見つかりません。');
  await Promise.all([env.MEDIA.delete(found.meta.objectKey), env.MEDIA.delete(found.key)]);
  if (found.meta.isCover) await ensureCover(env, found.meta.category);
  return json({ ok: true });
}
async function ensureCover(env, category) {
  const all = sortMetas(await listCategoryMeta(env, category));
  if (all.some(x => x.published && x.isCover)) return;
  const candidate = all.find(x => x.published);
  if (!candidate) return;
  candidate.isCover = true;
  candidate.updatedAt = new Date().toISOString();
  await writeJsonObject(env.MEDIA, metaKey(category, candidate.id), candidate);
}

async function login(request, env) {
  if (!env.EDITOR_PASSCODE || !env.SESSION_SECRET) return json({ error: '編集者認証のSecretが未設定です。' }, 503);
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipHash = await sha256Hex(`${env.SESSION_SECRET}:${ip}`);
  const key = authKey(ipHash);
  const now = Date.now();
  const attempt = await readJsonObject(env.MEDIA, key);
  if (attempt && now - Number(attempt.windowStart) < LOGIN_WINDOW_MS && Number(attempt.failures) >= LOGIN_MAX_FAILURES) {
    return json({ error: 'ログイン試行が多すぎます。10分後に再試行してください。' }, 429);
  }
  const body = await request.json().catch(() => ({}));
  const ok = safeEqual(String(body.passcode || ''), String(env.EDITOR_PASSCODE));
  if (!ok) {
    const next = (!attempt || now - Number(attempt.windowStart) >= LOGIN_WINDOW_MS)
      ? { windowStart: now, failures: 1 }
      : { windowStart: Number(attempt.windowStart), failures: Number(attempt.failures || 0) + 1 };
    await writeJsonObject(env.MEDIA, key, next);
    return json({ error: 'パスコードが違います。' }, 401);
  }
  await env.MEDIA.delete(key);
  return json({ token: await issueToken(env.SESSION_SECRET), expiresIn: SESSION_SECONDS });
}
async function issueToken(secret) {
  const payload = base64url(new TextEncoder().encode(JSON.stringify({ iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+SESSION_SECONDS, nonce: crypto.randomUUID() })));
  const sig = await hmac(secret, payload);
  return `${payload}.${sig}`;
}
async function isAuthorized(request, env) {
  if (!env.SESSION_SECRET) return false;
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const [payload, sig, extra] = token.split('.');
  if (!payload || !sig || extra) return false;
  const expected = await hmac(env.SESSION_SECRET, payload);
  if (!safeEqual(sig, expected)) return false;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(base64urlDecode(payload)));
    return Number(parsed.exp || 0) > Math.floor(Date.now()/1000);
  } catch { return false; }
}
async function hmac(secret, value) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return base64url(new Uint8Array(sig));
}
async function sha256Hex(value) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  return [...digest].map(b => b.toString(16).padStart(2,'0')).join('');
}
function base64url(bytes) {
  let binary=''; for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function base64urlDecode(value) {
  const padded = value.replace(/-/g,'+').replace(/_/g,'/') + '='.repeat((4-value.length%4)%4);
  const binary = atob(padded); return Uint8Array.from(binary, c => c.charCodeAt(0));
}
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0; for (let i=0;i<a.length;i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
