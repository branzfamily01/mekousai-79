import galleryApi from './gallery-r2.js';

const PREP_CATEGORIES = ['preparation', 'creation', 'after-school', 'rehearsal', 'final-prep'];
const PREP_SET = new Set(PREP_CATEGORIES);
const FESTIVAL_GROUPS = new Set(['grade1', 'grade2', 'grade3', 'club', 'other', 'chuyasai']);
const META_ROOT = '_mekousai/meta';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 準備期間の5分類は元のR2カテゴリをそのまま見せる。
    // 文化祭当日のみ、未分類保持と中夜祭互換処理を行う。
    if (request.method === 'GET' && (path === '/api/photos' || path === '/api/admin/photos')) {
      const category = url.searchParams.get('category');
      if (category === 'festival-day') {
        return festivalPhotos(request, env, ctx, path === '/api/admin/photos');
      }
    }

    if (request.method === 'POST' && path === '/api/photos') {
      return normalizedUpload(request, env, ctx);
    }

    if (request.method === 'PATCH' && /^\/api\/photos\/[0-9a-f-]+$/i.test(path)) {
      return normalizedPatch(request, env, ctx);
    }

    return galleryApi.fetch(request, env, ctx);
  }
};

async function festivalPhotos(request, env, ctx, admin) {
  const url = new URL(request.url);
  const requestedGroup = url.searchParams.get('group');
  if (requestedGroup && requestedGroup !== 'unassigned' && !FESTIVAL_GROUPS.has(requestedGroup)) {
    return json({ error: '当日写真の分類が不正です。' }, 400, 'no-store');
  }

  const next = new URL(url);
  next.searchParams.delete('group');
  const response = await galleryApi.fetch(new Request(next, request), env, ctx);
  if (!response.ok) return response;
  const payload = await response.json();
  const source = Array.isArray(payload.photos) ? payload.photos : [];

  const photos = await Promise.all(source.map(async photo => {
    const actual = await rawFestivalGroup(env, photo.id);
    return { ...photo, festivalGroup: actual || 'unassigned' };
  }));

  const filtered = requestedGroup
    ? photos.filter(photo => photo.festivalGroup === requestedGroup)
    : photos;
  return json({ category: 'festival-day', photos: filtered }, 200, admin ? 'no-store' : 'public, max-age=30');
}

async function normalizedUpload(request, env, ctx) {
  const form = await request.clone().formData();
  const category = String(form.get('category') || '');
  const requestedGroup = category === 'festival-day' ? String(form.get('festival_group') || '') : '';
  let changed = false;
  let desiredGroup = null;

  // 準備期間カテゴリは preparation に潰さず、そのまま保存する。
  if (PREP_SET.has(category)) {
    // no-op: gallery-r2.js が元のカテゴリとして保存する
  }

  if (category === 'festival-day') {
    if (!FESTIVAL_GROUPS.has(requestedGroup)) {
      return json({ error: '文化祭当日の写真は、学年・部活動・その他・中夜祭から分類を選んでください。' }, 400, 'no-store');
    }
    if (requestedGroup === 'chuyasai') {
      form.set('festival_group', 'other');
      desiredGroup = 'chuyasai';
      changed = true;
    }
  }

  const forwarded = changed
    ? new Request(request.url, { method: 'POST', headers: withoutContentType(request.headers), body: form })
    : request;
  const response = await galleryApi.fetch(forwarded, env, ctx);
  if (!desiredGroup || !response.ok) return response;

  const payload = await response.json();
  const id = payload?.photo?.id;
  if (!id) return json(payload, response.status, 'no-store');
  await setRawFestivalGroup(env, id, desiredGroup);
  if (payload.photo) payload.photo.festivalGroup = desiredGroup;
  return json(payload, response.status, 'no-store');
}

async function normalizedPatch(request, env, ctx) {
  const body = await request.clone().json().catch(() => null);
  if (!body || typeof body !== 'object' || !Object.hasOwn(body, 'festivalGroup')) {
    return galleryApi.fetch(request, env, ctx);
  }

  let desiredGroup = null;
  if (body.festivalGroup === '' || body.festivalGroup === null || body.festivalGroup === 'unassigned') {
    delete body.festivalGroup;
  } else if (!FESTIVAL_GROUPS.has(String(body.festivalGroup))) {
    return json({ error: '当日写真の分類が不正です。' }, 400, 'no-store');
  } else if (body.festivalGroup === 'chuyasai') {
    desiredGroup = 'chuyasai';
    body.festivalGroup = 'other';
  }

  const headers = new Headers(request.headers);
  headers.set('Content-Type', 'application/json');
  const replacement = new Request(request.url, { method: 'PATCH', headers, body: JSON.stringify(body) });
  const response = await galleryApi.fetch(replacement, env, ctx);
  if (!desiredGroup || !response.ok) return response;

  const id = request.url.match(/\/api\/photos\/([0-9a-f-]+)$/i)?.[1];
  const payload = await response.json();
  if (id) await setRawFestivalGroup(env, id, desiredGroup);
  if (payload?.photo) payload.photo.festivalGroup = desiredGroup;
  return json(payload, response.status, 'no-store');
}

async function rawFestivalGroup(env, id) {
  const object = await env.MEDIA.get(`${META_ROOT}/festival-day/${id}.json`);
  if (!object) return null;
  try {
    const meta = await object.json();
    return FESTIVAL_GROUPS.has(meta?.festivalGroup) ? meta.festivalGroup : null;
  } catch {
    return null;
  }
}

async function setRawFestivalGroup(env, id, group) {
  const key = `${META_ROOT}/festival-day/${id}.json`;
  const object = await env.MEDIA.get(key);
  if (!object) return;
  const meta = await object.json();
  meta.festivalGroup = group;
  meta.updatedAt = new Date().toISOString();
  await env.MEDIA.put(key, JSON.stringify(meta), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' }
  });
}

function withoutContentType(source) {
  const headers = new Headers(source);
  headers.delete('Content-Type');
  return headers;
}

function json(body, status = 200, cacheControl = 'no-store') {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cacheControl,
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
