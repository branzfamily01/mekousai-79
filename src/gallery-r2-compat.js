import galleryApi from './gallery-r2.js';

const PREP_CATEGORIES = ['preparation', 'creation', 'after-school', 'rehearsal', 'final-prep'];
const PREP_SET = new Set(PREP_CATEGORIES);
const FESTIVAL_GROUPS = new Set(['grade1', 'grade2', 'grade3', 'club', 'other']);
const META_ROOT = '_mekousai/meta';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'GET' && path === '/api/categories') {
      return collapsedCategories(request, env, ctx);
    }

    if (request.method === 'GET' && (path === '/api/photos' || path === '/api/admin/photos')) {
      const category = url.searchParams.get('category');
      if (category === 'preparation' || PREP_SET.has(category)) {
        return combinedPreparation(request, env, ctx, path === '/api/admin/photos');
      }
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

async function collapsedCategories(request, env, ctx) {
  const response = await galleryApi.fetch(request, env, ctx);
  if (!response.ok) return response;
  const payload = await response.json();
  const source = Array.isArray(payload.categories) ? payload.categories : [];
  const prep = source.filter(item => PREP_SET.has(item.category));
  const count = prep.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const categories = [];
  if (count > 0) {
    categories.push({
      category: 'preparation',
      count,
      coverUrl: prep.find(item => item.coverUrl)?.coverUrl || null
    });
  }
  for (const item of source) {
    if (PREP_SET.has(item.category)) continue;
    categories.push(item);
  }
  return json({ categories }, 200, 'public, max-age=30');
}

async function combinedPreparation(request, env, ctx, admin) {
  const url = new URL(request.url);
  const results = await Promise.all(PREP_CATEGORIES.map(async category => {
    const next = new URL(url);
    next.searchParams.set('category', category);
    next.searchParams.delete('group');
    const response = await galleryApi.fetch(new Request(next, request), env, ctx);
    if (!response.ok) return { error: response };
    const payload = await response.json();
    return { photos: Array.isArray(payload.photos) ? payload.photos : [] };
  }));
  const failed = results.find(item => item.error);
  if (failed) return failed.error;

  const photos = results.flatMap(item => item.photos).map(photo => ({ ...photo, category: 'preparation' }));
  photos.sort(sortPhotos);
  return json({ category: 'preparation', photos }, 200, admin ? 'no-store' : 'public, max-age=30');
}

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
  let changed = false;

  if (PREP_SET.has(category) && category !== 'preparation') {
    form.set('category', 'preparation');
    changed = true;
  }

  if (category === 'festival-day') {
    const group = String(form.get('festival_group') || '');
    if (!FESTIVAL_GROUPS.has(group)) {
      return json({ error: '文化祭当日の写真は、学年・部活動・その他から分類を選んでください。' }, 400, 'no-store');
    }
  }

  if (!changed) return galleryApi.fetch(request, env, ctx);
  const headers = new Headers(request.headers);
  headers.delete('Content-Type');
  const replacement = new Request(request.url, { method: 'POST', headers, body: form });
  return galleryApi.fetch(replacement, env, ctx);
}

async function normalizedPatch(request, env, ctx) {
  const body = await request.clone().json().catch(() => null);
  if (!body || typeof body !== 'object' || !Object.hasOwn(body, 'festivalGroup')) {
    return galleryApi.fetch(request, env, ctx);
  }
  if (body.festivalGroup === '' || body.festivalGroup === null || body.festivalGroup === 'unassigned') {
    delete body.festivalGroup;
  } else if (!FESTIVAL_GROUPS.has(String(body.festivalGroup))) {
    return json({ error: '当日写真の分類が不正です。' }, 400, 'no-store');
  }
  const headers = new Headers(request.headers);
  headers.set('Content-Type', 'application/json');
  const replacement = new Request(request.url, { method: 'PATCH', headers, body: JSON.stringify(body) });
  return galleryApi.fetch(replacement, env, ctx);
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

function sortPhotos(a, b) {
  if (Boolean(a.isCover) !== Boolean(b.isCover)) return a.isCover ? -1 : 1;
  const dateCmp = String(b.takenOn || '').localeCompare(String(a.takenOn || ''));
  if (dateCmp) return dateCmp;
  const orderCmp = Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
  if (orderCmp) return orderCmp;
  return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
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
