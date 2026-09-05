(() => {
  const categories = {
    preparation: '準備風景', creation: '制作の手元', 'after-school': '放課後', rehearsal: 'リハーサル',
    'final-prep': '開催直前', 'festival-day': '文化祭当日', awards: '表彰・振り返り'
  };
  const festivalGroups = { grade1: '1学年', grade2: '2学年', grade3: '3学年', club: '部活動', other: 'その他' };
  const cfg = window.MEKOUSAI_CONFIG || {};
  const apiBase = String(cfg.apiBase || '').replace(/\/$/, '');
  const configured = apiBase && !apiBase.includes('REPLACE-WITH-WORKER');
  const TOKEN_KEY = 'mekousai-editor-token-v1';
  const UPLOAD_CONCURRENCY = 3;
  const BULK_CONCURRENCY = 4;
  let token = localStorage.getItem(TOKEN_KEY) || '';
  let uploadItems = [];
  let managedPhotos = [];
  const selectedPhotoIds = new Set();

  const $ = id => document.getElementById(id);
  const status = $('editor-status');
  const loginPanel = $('login-panel');
  const loginForm = $('login-form');
  const passcode = $('passcode');
  const app = $('editor-app');
  const uploadForm = $('upload-form');
  const uploadCategory = $('upload-category');
  const uploadFestivalGroupField = $('upload-festival-group-field');
  const uploadFestivalGroup = $('upload-festival-group');
  const manageCategory = $('manage-category');
  const manageFestivalGroupField = $('manage-festival-group-field');
  const manageFestivalGroup = $('manage-festival-group');
  const uploadDate = $('upload-date');
  const uploadCaption = $('upload-caption');
  const applyCommonCaption = $('apply-common-caption');
  const uploadFiles = $('upload-files');
  const uploadQueue = $('upload-queue');
  const uploadPublished = $('upload-published');
  const uploadButton = $('upload-button');
  const fileSummary = $('file-summary');
  const progress = $('upload-progress');
  const progressText = $('upload-progress-text');
  const list = $('editor-list');
  const logoutButton = $('logout-button');
  const toast = $('editor-toast');
  const selectionCount = $('bulk-selection-count');
  const selectAllButton = $('select-all-button');
  const clearSelectionButton = $('clear-selection-button');
  const bulkPublishButton = $('bulk-publish-button');
  const bulkUnpublishButton = $('bulk-unpublish-button');

  Object.entries(categories).forEach(([value, label]) => {
    uploadCategory.add(new Option(label, value));
    manageCategory.add(new Option(label, value));
  });
  Object.entries(festivalGroups).forEach(([value, label]) => {
    uploadFestivalGroup.add(new Option(label, value));
    manageFestivalGroup.add(new Option(label, value));
  });
  uploadFestivalGroup.value = 'grade1';
  manageFestivalGroup.value = 'other';
  uploadDate.value = new Date().toISOString().slice(0, 10);

  function showToast(message, ms = 2600) {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => { toast.hidden = true; }, ms);
  }
  function setConnected(ok, text) {
    status.classList.toggle('is-ok', ok);
    status.classList.toggle('is-bad', !ok);
    status.textContent = text;
  }
  async function api(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const opts = { ...options, headers };
    delete opts.json;
    if (options.json !== undefined) {
      headers.set('Content-Type', 'application/json');
      opts.body = JSON.stringify(options.json);
    }
    const res = await fetch(`${apiBase}${path}`, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }
  function showApp() { loginPanel.classList.add('editor-hidden'); app.classList.remove('editor-hidden'); }
  function showLogin() { app.classList.add('editor-hidden'); loginPanel.classList.remove('editor-hidden'); }
  function updateFestivalFields() {
    uploadFestivalGroupField.hidden = uploadCategory.value !== 'festival-day';
    manageFestivalGroupField.hidden = manageCategory.value !== 'festival-day';
  }

  async function validateSession() {
    if (!configured) {
      setConnected(false, 'Cloudflare API 未接続');
      loginForm.querySelector('button').disabled = true;
      return;
    }
    try {
      const health = await api('/api/health');
      setConnected(Boolean(health.ok), health.ok ? 'Cloudflare 接続済み' : '設定未完了');
    } catch {
      setConnected(false, 'APIへ接続できません');
    }
    if (!token) { showLogin(); return; }
    try {
      await api('/api/admin/me');
      showApp();
      await loadPhotos();
    } catch {
      token = '';
      localStorage.removeItem(TOKEN_KEY);
      showLogin();
    }
  }

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const buttonEl = loginForm.querySelector('button');
    buttonEl.disabled = true;
    try {
      const data = await api('/api/login', { method: 'POST', json: { passcode: passcode.value } });
      token = data.token;
      localStorage.setItem(TOKEN_KEY, token);
      passcode.value = '';
      showApp();
      showToast('ログインしました');
      await loadPhotos();
    } catch (err) {
      showToast(err.message || 'ログインできませんでした', 3600);
    } finally {
      buttonEl.disabled = false;
    }
  });
  logoutButton.addEventListener('click', () => {
    token = '';
    localStorage.removeItem(TOKEN_KEY);
    showLogin();
    showToast('ログアウトしました');
  });

  uploadCategory.addEventListener('change', updateFestivalFields);
  manageCategory.addEventListener('change', () => {
    if (manageCategory.value === 'festival-day') manageFestivalGroup.value = 'other';
    updateFestivalFields();
    loadPhotos();
  });
  manageFestivalGroup.addEventListener('change', loadPhotos);
  updateFestivalFields();

  function clearUploadItems() {
    uploadItems.forEach(item => { if (item.previewUrl) URL.revokeObjectURL(item.previewUrl); });
    uploadItems = [];
    uploadFiles.value = '';
    fileSummary.textContent = '未選択';
    uploadQueue.textContent = '';
    uploadButton.textContent = '選んだ写真をまとめて公開';
    progress.style.width = '0%';
    progressText.textContent = '';
  }

  uploadFiles.addEventListener('change', () => {
    uploadItems.forEach(item => { if (item.previewUrl) URL.revokeObjectURL(item.previewUrl); });
    const stamp = Date.now();
    uploadItems = [...uploadFiles.files].map((file, index) => ({
      id: `${stamp}-${index}-${Math.random().toString(36).slice(2)}`,
      file,
      caption: '',
      status: 'ready',
      error: '',
      previewUrl: URL.createObjectURL(file)
    }));
    const totalBytes = uploadItems.reduce((sum, item) => sum + item.file.size, 0);
    fileSummary.textContent = uploadItems.length ? `${uploadItems.length}枚選択・合計 ${(totalBytes / 1024 / 1024).toFixed(1)}MB` : '未選択';
    progress.style.width = '0%';
    progressText.textContent = '';
    uploadButton.textContent = '選んだ写真をまとめて公開';
    renderUploadQueue();
  });

  function statusLabel(item) {
    if (item.status === 'preparing') return '変換中…';
    if (item.status === 'uploading') return '送信中…';
    if (item.status === 'done') return '✓ 完了';
    if (item.status === 'failed') return `再送待ち：${item.error || '失敗'}`;
    return '送信待ち';
  }
  function findUploadCard(id) {
    return [...uploadQueue.querySelectorAll('[data-upload-id]')].find(el => el.dataset.uploadId === id) || null;
  }
  function refreshUploadItem(item) {
    const card = findUploadCard(item.id);
    if (!card) return;
    card.className = `upload-item upload-status-${item.status}`;
    const s = card.querySelector('.upload-item-status');
    if (s) s.textContent = statusLabel(item);
    const textarea = card.querySelector('textarea');
    const remove = card.querySelector('.editor-mini-button');
    const busy = item.status === 'preparing' || item.status === 'uploading';
    if (textarea) textarea.disabled = busy || item.status === 'done';
    if (remove) remove.disabled = busy || item.status === 'done';
  }
  function renderUploadQueue() {
    uploadQueue.textContent = '';
    if (!uploadItems.length) return;
    uploadItems.forEach((item, index) => {
      const card = document.createElement('article');
      card.className = `upload-item upload-status-${item.status}`;
      card.dataset.uploadId = item.id;
      const thumb = document.createElement('img');
      thumb.src = item.previewUrl;
      thumb.alt = `${index + 1}枚目の選択写真`;
      const body = document.createElement('div');
      body.className = 'upload-item-body';
      const meta = document.createElement('div');
      meta.className = 'upload-item-meta';
      const name = document.createElement('strong');
      name.textContent = `${index + 1}. ${item.file.name || '写真'}`;
      const itemStatus = document.createElement('span');
      itemStatus.className = 'upload-item-status';
      itemStatus.textContent = statusLabel(item);
      meta.append(name, itemStatus);
      const caption = document.createElement('textarea');
      caption.maxLength = 500;
      caption.placeholder = 'この写真だけのコメント（任意）';
      caption.value = item.caption;
      caption.disabled = item.status === 'uploading' || item.status === 'preparing' || item.status === 'done';
      caption.addEventListener('input', () => { item.caption = caption.value; });
      const remove = button('この写真を除外', 'editor-mini-button');
      remove.disabled = item.status === 'uploading' || item.status === 'preparing' || item.status === 'done';
      remove.addEventListener('click', () => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        uploadItems = uploadItems.filter(x => x.id !== item.id);
        fileSummary.textContent = uploadItems.length ? `${uploadItems.length}枚を送信対象にしています` : '未選択';
        renderUploadQueue();
      });
      body.append(meta, caption, remove);
      card.append(thumb, body);
      uploadQueue.appendChild(card);
    });
  }

  applyCommonCaption.addEventListener('click', () => {
    if (!uploadItems.length) return showToast('先に写真を選んでください');
    const value = uploadCaption.value.trim();
    if (!value) return showToast('共通コメントを入力してください');
    let count = 0;
    uploadItems.forEach(item => {
      if (item.status === 'done') return;
      item.caption = value;
      count += 1;
    });
    renderUploadQueue();
    showToast(`${count}枚に共通コメントを適用しました`);
  });

  async function decodeToCanvas(file) {
    let bitmap;
    if ('createImageBitmap' in window) {
      try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch {}
    }
    let width, height, draw;
    if (bitmap) {
      width = bitmap.width;
      height = bitmap.height;
      draw = (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h);
    } else {
      const url = URL.createObjectURL(file);
      try {
        const img = await new Promise((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = reject;
          el.src = url;
        });
        width = img.naturalWidth;
        height = img.naturalHeight;
        draw = (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h);
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    const maxSide = 1800;
    const scale = Math.min(1, maxSide / Math.max(width, height));
    const outW = Math.max(1, Math.round(width * scale));
    const outH = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, outW, outH);
    draw(ctx, outW, outH);
    if (bitmap?.close) bitmap.close();
    const blob = await new Promise((resolve, reject) => canvas.toBlob(
      b => b ? resolve(b) : reject(new Error('画像変換に失敗しました')),
      'image/jpeg', .84
    ));
    return { blob, width: outW, height: outH };
  }

  async function runPool(items, concurrency, worker) {
    let next = 0;
    async function runner() {
      while (true) {
        const index = next++;
        if (index >= items.length) return;
        await worker(items[index], index);
      }
    }
    const count = Math.min(concurrency, items.length);
    await Promise.all(Array.from({ length: count }, () => runner()));
  }

  uploadForm.addEventListener('submit', async event => {
    event.preventDefault();
    const pending = uploadItems.filter(item => item.status !== 'done');
    if (!pending.length) return showToast('写真を選んでください');

    const category = uploadCategory.value;
    const festivalGroup = category === 'festival-day' ? uploadFestivalGroup.value : '';
    const takenOn = uploadDate.value || '';
    const published = uploadPublished.checked;
    uploadButton.disabled = true;
    applyCommonCaption.disabled = true;
    progress.style.width = '0%';
    let finished = 0;
    let succeeded = 0;
    let failed = 0;

    try {
      await runPool(pending, UPLOAD_CONCURRENCY, async (item, index) => {
        try {
          item.status = 'preparing';
          item.error = '';
          refreshUploadItem(item);
          const converted = await decodeToCanvas(item.file);
          item.status = 'uploading';
          refreshUploadItem(item);
          const form = new FormData();
          form.append('file', converted.blob, `mekousai-${Date.now()}-${index + 1}.jpg`);
          form.append('category', category);
          if (category === 'festival-day') form.append('festival_group', festivalGroup);
          form.append('taken_on', takenOn);
          form.append('caption', item.caption.trim());
          form.append('published', published ? '1' : '0');
          form.append('width', String(converted.width));
          form.append('height', String(converted.height));
          await api('/api/photos', { method: 'POST', body: form });
          item.status = 'done';
          succeeded += 1;
        } catch (err) {
          item.status = 'failed';
          item.error = err.message || 'アップロード失敗';
          failed += 1;
        } finally {
          finished += 1;
          refreshUploadItem(item);
          progress.style.width = `${Math.round((finished / pending.length) * 100)}%`;
          progressText.textContent = `${finished}/${pending.length}枚処理済み（成功 ${succeeded}・失敗 ${failed}）`;
        }
      });

      manageCategory.value = category;
      if (category === 'festival-day') manageFestivalGroup.value = festivalGroup;
      updateFestivalFields();
      await loadPhotos();

      if (failed) {
        uploadButton.textContent = `失敗した${failed}枚を再送`;
        showToast(`${succeeded}枚成功・${failed}枚失敗。失敗分だけ再送できます。`, 5200);
      } else {
        const total = succeeded;
        uploadCaption.value = '';
        clearUploadItems();
        showToast(`${total}枚を追加しました`, 3400);
      }
    } finally {
      uploadButton.disabled = false;
      applyCommonCaption.disabled = false;
    }
  });

  async function loadPhotos() {
    if (!token) return;
    selectedPhotoIds.clear();
    updateBulkToolbar();
    list.textContent = '読み込み中…';
    try {
      let path = `/api/admin/photos?category=${encodeURIComponent(manageCategory.value)}`;
      if (manageCategory.value === 'festival-day') path += `&group=${encodeURIComponent(manageFestivalGroup.value)}`;
      const data = await api(path);
      managedPhotos = Array.isArray(data.photos) ? data.photos : [];
      renderPhotos(managedPhotos);
    } catch (err) {
      managedPhotos = [];
      list.textContent = err.message || '読み込みに失敗しました';
    }
  }

  function findPhotoCard(photoId) {
    return [...list.querySelectorAll('[data-photo-id]')].find(el => el.dataset.photoId === photoId) || null;
  }
  function toggleSelected(photoId, force) {
    const next = force === undefined ? !selectedPhotoIds.has(photoId) : force;
    if (next) selectedPhotoIds.add(photoId); else selectedPhotoIds.delete(photoId);
    const card = findPhotoCard(photoId);
    if (card) {
      card.classList.toggle('is-selected', next);
      const checkbox = card.querySelector('.editor-select-checkbox');
      if (checkbox) checkbox.checked = next;
    }
    updateBulkToolbar();
  }
  function updateBulkToolbar() {
    const count = selectedPhotoIds.size;
    selectionCount.textContent = `${count}枚選択中`;
    bulkPublishButton.disabled = count === 0;
    bulkUnpublishButton.disabled = count === 0;
    clearSelectionButton.disabled = count === 0;
    selectAllButton.disabled = !managedPhotos.length || count === managedPhotos.length;
  }

  selectAllButton.addEventListener('click', () => {
    managedPhotos.forEach(photo => selectedPhotoIds.add(photo.id));
    list.querySelectorAll('.editor-photo').forEach(card => {
      card.classList.add('is-selected');
      const checkbox = card.querySelector('.editor-select-checkbox');
      if (checkbox) checkbox.checked = true;
    });
    updateBulkToolbar();
  });
  clearSelectionButton.addEventListener('click', () => {
    selectedPhotoIds.clear();
    list.querySelectorAll('.editor-photo').forEach(card => {
      card.classList.remove('is-selected');
      const checkbox = card.querySelector('.editor-select-checkbox');
      if (checkbox) checkbox.checked = false;
    });
    updateBulkToolbar();
  });
  bulkPublishButton.addEventListener('click', () => bulkSetPublished(true));
  bulkUnpublishButton.addEventListener('click', () => bulkSetPublished(false));

  async function bulkSetPublished(published) {
    const ids = [...selectedPhotoIds];
    if (!ids.length) return;
    bulkPublishButton.disabled = true;
    bulkUnpublishButton.disabled = true;
    let success = 0;
    let failed = 0;
    await runPool(ids, BULK_CONCURRENCY, async id => {
      try {
        await api(`/api/photos/${id}`, { method: 'PATCH', json: { published } });
        success += 1;
      } catch {
        failed += 1;
      }
    });
    showToast(
      failed ? `${success}枚変更・${failed}枚失敗` : `${success}枚を${published ? '公開' : '非公開'}にしました`,
      failed ? 4200 : 2800
    );
    await loadPhotos();
  }

  function renderPhotos(photos) {
    list.textContent = '';
    selectedPhotoIds.clear();
    updateBulkToolbar();
    if (!photos.length) {
      list.textContent = 'この分類にはまだ写真がありません。';
      return;
    }
    photos.forEach(photo => {
      const card = document.createElement('article');
      card.className = 'editor-photo';
      card.dataset.photoId = photo.id;

      const visual = document.createElement('div');
      visual.className = 'editor-photo-visual';
      const img = document.createElement('img');
      img.src = photo.published ? photo.url : '';
      img.alt = '';
      if (!photo.published) {
        img.removeAttribute('src');
        img.classList.add('is-unpublished');
      }
      const select = document.createElement('input');
      select.type = 'checkbox';
      select.className = 'editor-select-checkbox';
      select.setAttribute('aria-label', '一括操作の対象に選択');
      select.addEventListener('change', () => toggleSelected(photo.id, select.checked));
      visual.addEventListener('click', event => {
        if (event.target === select) return;
        toggleSelected(photo.id);
      });
      const selectBadge = document.createElement('span');
      selectBadge.className = 'editor-select-badge';
      selectBadge.textContent = '✓';
      visual.append(img, select, selectBadge);
      card.appendChild(visual);

      const controls = document.createElement('div');
      controls.className = 'editor-photo-controls';
      const caption = document.createElement('input');
      caption.type = 'text';
      caption.maxLength = 500;
      caption.value = photo.caption || '';
      caption.placeholder = '一言コメント';
      const date = document.createElement('input');
      date.type = 'date';
      date.value = photo.takenOn || '';
      controls.append(caption, date);

      let groupSelect = null;
      if (photo.category === 'festival-day') {
        groupSelect = document.createElement('select');
        groupSelect.className = 'editor-photo-group';
        Object.entries(festivalGroups).forEach(([value, label]) => groupSelect.add(new Option(label, value)));
        groupSelect.value = photo.festivalGroup || 'other';
        controls.appendChild(groupSelect);
      }

      const row = document.createElement('div');
      row.className = 'editor-row';
      const publishedLabel = document.createElement('label');
      const published = document.createElement('input');
      published.type = 'checkbox';
      published.checked = Boolean(photo.published);
      publishedLabel.append(published, ' 公開');
      const save = button('保存', 'editor-button secondary');
      const cover = button(photo.isCover ? '代表写真' : '代表にする', 'editor-button secondary');
      cover.disabled = Boolean(photo.isCover);
      const del = button('削除', 'editor-button danger');
      row.append(publishedLabel, save, cover, del);
      controls.appendChild(row);
      card.appendChild(controls);
      list.appendChild(card);

      save.addEventListener('click', async () => {
        try {
          const body = { caption: caption.value.trim(), takenOn: date.value || null, published: published.checked };
          if (groupSelect) body.festivalGroup = groupSelect.value;
          await api(`/api/photos/${photo.id}`, { method: 'PATCH', json: body });
          showToast('保存しました');
          await loadPhotos();
        } catch (e) { showToast(e.message); }
      });
      cover.addEventListener('click', async () => {
        try {
          await api(`/api/photos/${photo.id}/cover`, { method: 'POST' });
          showToast('代表写真にしました');
          await loadPhotos();
        } catch (e) { showToast(e.message); }
      });
      del.addEventListener('click', async () => {
        if (!confirm('この写真を削除しますか？')) return;
        try {
          await api(`/api/photos/${photo.id}`, { method: 'DELETE' });
          showToast('削除しました');
          await loadPhotos();
        } catch (e) { showToast(e.message); }
      });
    });
  }

  function button(text, className) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = className;
    b.textContent = text;
    return b;
  }

  validateSession();
})();
