(() => {
  const CATS = {
    preparation: '準備風景',
    'festival-day': '文化祭当日',
    awards: '表彰・振り返り'
  };
  const GROUPS = {
    grade1: '1学年',
    grade2: '2学年',
    grade3: '3学年',
    club: '部活動',
    other: 'その他'
  };
  const $ = id => document.getElementById(id);
  const cfg = window.MEKOUSAI_CONFIG || {};
  const base = String(cfg.apiBase || '').replace(/\/$/, '');
  const configured = base && !base.includes('REPLACE-WITH-WORKER');
  const TOKEN_KEY = 'mekousai-editor-token-v1';

  let token = localStorage.getItem(TOKEN_KEY) || '';
  let queue = [];
  let photos = [];
  const selected = new Set();

  const status = $('editor-status');
  const loginPanel = $('login-panel');
  const loginForm = $('login-form');
  const passcode = $('passcode');
  const app = $('editor-app');
  const toast = $('editor-toast');
  const logout = $('logout-button');

  const uploadForm = $('upload-form');
  const uploadCategory = $('upload-category');
  const uploadGroupField = $('upload-festival-group-field');
  const uploadGroup = $('upload-festival-group');
  const uploadDate = $('upload-date');
  const commonCaption = $('upload-caption');
  const applyCommon = $('apply-common-caption');
  const filesInput = $('upload-files');
  const queueEl = $('upload-queue');
  const publishedInput = $('upload-published');
  const uploadButton = $('upload-button');
  const fileSummary = $('file-summary');
  const progress = $('upload-progress');
  const progressText = $('upload-progress-text');

  const manageCategory = $('manage-category');
  const manageGroupField = $('manage-festival-group-field');
  const manageGroup = $('manage-festival-group');
  const list = $('editor-list');
  const selectionCount = $('bulk-selection-count');
  const selectAll = $('select-all-button');
  const clearSelection = $('clear-selection-button');
  const bulkPublish = $('bulk-publish-button');
  const bulkUnpublish = $('bulk-unpublish-button');
  const bulkEditor = $('bulk-editor');
  const bulkGroupField = $('bulk-group-field');
  const bulkGroup = $('bulk-group');
  const bulkDate = $('bulk-date');
  const bulkCaptionMode = $('bulk-caption-mode');
  const bulkCaption = $('bulk-caption');
  const bulkVisibility = $('bulk-visibility');
  const bulkApply = $('bulk-apply-button');

  Object.entries(CATS).forEach(([value, label]) => {
    uploadCategory.add(new Option(label, value));
    manageCategory.add(new Option(label, value));
  });

  uploadGroup.add(new Option('分類を選択してください', '', true, true));
  uploadGroup.options[0].disabled = true;
  Object.entries(GROUPS).forEach(([value, label]) => uploadGroup.add(new Option(label, value)));

  manageGroup.add(new Option('すべて', ''));
  manageGroup.add(new Option('未分類（既存写真）', 'unassigned'));
  Object.entries(GROUPS).forEach(([value, label]) => manageGroup.add(new Option(label, value)));

  bulkGroup.add(new Option('変更しない', ''));
  Object.entries(GROUPS).forEach(([value, label]) => bulkGroup.add(new Option(label, value)));

  uploadDate.value = new Date().toISOString().slice(0, 10);
  manageGroup.value = '';

  function notify(message, ms = 3000) {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(notify.t);
    notify.t = setTimeout(() => { toast.hidden = true; }, ms);
  }

  function setStatus(ok, message) {
    status.classList.toggle('is-ok', ok);
    status.classList.toggle('is-bad', !ok);
    status.textContent = message;
  }

  async function api(path, opts = {}) {
    const headers = new Headers(opts.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const request = { ...opts, headers };
    delete request.json;
    if (opts.json !== undefined) {
      headers.set('Content-Type', 'application/json');
      request.body = JSON.stringify(opts.json);
    }
    const res = await fetch(`${base}${path}`, request);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  function showApp() {
    loginPanel.classList.add('editor-hidden');
    app.classList.remove('editor-hidden');
  }

  function showLogin() {
    app.classList.add('editor-hidden');
    loginPanel.classList.remove('editor-hidden');
  }

  function syncGroupFields() {
    uploadGroupField.hidden = uploadCategory.value !== 'festival-day';
    manageGroupField.hidden = manageCategory.value !== 'festival-day';
    bulkGroupField.hidden = manageCategory.value !== 'festival-day';
  }

  async function validate() {
    if (!configured) {
      setStatus(false, 'Cloudflare API 未接続');
      loginForm.querySelector('button').disabled = true;
      return;
    }
    try {
      const health = await api('/api/health');
      setStatus(Boolean(health.ok), health.ok ? 'Cloudflare 接続済み' : '設定未完了');
    } catch {
      setStatus(false, 'APIへ接続できません');
    }
    if (!token) {
      showLogin();
      return;
    }
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
    const button = loginForm.querySelector('button');
    button.disabled = true;
    try {
      const data = await api('/api/login', { method: 'POST', json: { passcode: passcode.value } });
      token = data.token;
      localStorage.setItem(TOKEN_KEY, token);
      passcode.value = '';
      showApp();
      notify('ログインしました');
      await loadPhotos();
    } catch (err) {
      notify(err.message || 'ログインできませんでした', 3800);
    } finally {
      button.disabled = false;
    }
  });

  logout.addEventListener('click', () => {
    token = '';
    localStorage.removeItem(TOKEN_KEY);
    showLogin();
    notify('ログアウトしました');
  });

  uploadCategory.addEventListener('change', () => {
    if (uploadCategory.value === 'festival-day') uploadGroup.value = '';
    syncGroupFields();
  });

  manageCategory.addEventListener('change', () => {
    manageGroup.value = '';
    syncGroupFields();
    loadPhotos();
  });
  manageGroup.addEventListener('change', loadPhotos);
  syncGroupFields();

  filesInput.addEventListener('change', () => {
    const batch = [...filesInput.files];
    const stamp = Date.now();
    queue.push(...batch.map((file, i) => ({
      id: `${stamp}-${i}-${Math.random().toString(36).slice(2)}`,
      file,
      caption: '',
      state: 'ready',
      error: '',
      url: URL.createObjectURL(file)
    })));
    filesInput.value = '';
    resetProgress();
    renderQueue();
    if (batch.length) notify(`${batch.length}枚を送信キューに追加しました`);
  });

  function resetProgress() {
    progress.style.width = '0%';
    progressText.textContent = '';
    uploadButton.textContent = '選んだ写真をまとめて公開';
  }

  function queueLabel(item) {
    if (item.state === 'preparing') return '変換中…';
    if (item.state === 'uploading') return '送信中…';
    if (item.state === 'done') return '✓ 完了';
    if (item.state === 'failed') return `再送待ち：${item.error || '失敗'}`;
    return '送信待ち';
  }

  function renderQueue() {
    queueEl.textContent = '';
    const bytes = queue.reduce((sum, item) => sum + item.file.size, 0);
    fileSummary.textContent = queue.length
      ? `${queue.length}枚を送信待ち・合計 ${(bytes / 1048576).toFixed(1)}MB`
      : '未選択';

    queue.forEach((item, i) => {
      const card = document.createElement('article');
      card.className = `upload-item upload-status-${item.state}`;
      const img = document.createElement('img');
      img.src = item.url;
      img.alt = `${i + 1}枚目の選択写真`;
      const body = document.createElement('div');
      body.className = 'upload-item-body';
      const meta = document.createElement('div');
      meta.className = 'upload-item-meta';
      const name = document.createElement('strong');
      name.textContent = `${i + 1}. ${item.file.name || '写真'}`;
      const state = document.createElement('span');
      state.className = 'upload-item-status';
      state.textContent = queueLabel(item);
      meta.append(name, state);
      const caption = document.createElement('textarea');
      caption.maxLength = 500;
      caption.placeholder = 'この写真だけのコメント（任意）';
      caption.value = item.caption;
      const locked = ['preparing', 'uploading', 'done'].includes(item.state);
      caption.disabled = locked;
      caption.addEventListener('input', () => { item.caption = caption.value; });
      const remove = button('この写真を除外', 'editor-mini-button');
      remove.disabled = locked;
      remove.addEventListener('click', () => {
        URL.revokeObjectURL(item.url);
        queue = queue.filter(x => x !== item);
        renderQueue();
      });
      body.append(meta, caption, remove);
      card.append(img, body);
      queueEl.appendChild(card);
    });
  }

  applyCommon.addEventListener('click', () => {
    if (!queue.length) return notify('先に写真を選んでください');
    const text = commonCaption.value.trim();
    if (!text) return notify('共通コメントを入力してください');
    let count = 0;
    queue.forEach(item => {
      if (item.state !== 'done') {
        item.caption = text;
        count++;
      }
    });
    renderQueue();
    notify(`${count}枚に共通コメントを適用しました`);
  });

  async function resize(file) {
    let source, width, height, close = () => {};
    if ('createImageBitmap' in window) {
      try {
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        source = bitmap;
        width = bitmap.width;
        height = bitmap.height;
        close = () => bitmap.close?.();
      } catch {}
    }
    if (!source) {
      const url = URL.createObjectURL(file);
      try {
        source = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = url;
        });
        width = source.naturalWidth;
        height = source.naturalHeight;
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    const scale = Math.min(1, 1800 / Math.max(width, height));
    const outW = Math.max(1, Math.round(width * scale));
    const outH = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(source, 0, 0, outW, outH);
    close();
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('画像変換に失敗しました')), 'image/jpeg', .84);
    });
    return { blob, width: outW, height: outH };
  }

  uploadForm.addEventListener('submit', async event => {
    event.preventDefault();
    const pending = queue.filter(item => item.state !== 'done');
    if (!pending.length) return notify('写真を選んでください');
    if (uploadCategory.value === 'festival-day' && !uploadGroup.value) {
      return notify('文化祭当日の分類を選んでください', 4200);
    }

    const category = uploadCategory.value;
    const group = category === 'festival-day' ? uploadGroup.value : '';
    const taken = uploadDate.value || '';
    const pub = publishedInput.checked;
    uploadButton.disabled = true;
    applyCommon.disabled = true;
    let done = 0, ok = 0, ng = 0;

    try {
      for (let i = 0; i < pending.length; i++) {
        const item = pending[i];
        try {
          item.state = 'preparing';
          item.error = '';
          renderQueue();
          const converted = await resize(item.file);
          item.state = 'uploading';
          renderQueue();
          const form = new FormData();
          form.append('file', converted.blob, `mekousai-${Date.now()}-${i + 1}.jpg`);
          form.append('category', category);
          if (category === 'festival-day') form.append('festival_group', group);
          form.append('taken_on', taken);
          form.append('caption', item.caption.trim());
          form.append('published', pub ? '1' : '0');
          form.append('width', String(converted.width));
          form.append('height', String(converted.height));
          await api('/api/photos', { method: 'POST', body: form });
          item.state = 'done';
          ok++;
        } catch (err) {
          item.state = 'failed';
          item.error = err.message || 'アップロード失敗';
          ng++;
        }
        done++;
        progress.style.width = `${Math.round(done / pending.length * 100)}%`;
        progressText.textContent = `${done}/${pending.length}枚処理済み（成功 ${ok}・失敗 ${ng}）`;
        renderQueue();
      }

      manageCategory.value = category;
      manageGroup.value = category === 'festival-day' ? group : '';
      syncGroupFields();
      await loadPhotos();

      if (ng) {
        uploadButton.textContent = `失敗した${ng}枚を再送`;
        notify(`${ok}枚成功・${ng}枚失敗。失敗分だけ再送できます。`, 5200);
      } else {
        const total = ok;
        commonCaption.value = '';
        queue.forEach(item => URL.revokeObjectURL(item.url));
        queue = [];
        renderQueue();
        resetProgress();
        notify(`${total}枚を追加しました`, 3400);
      }
    } finally {
      uploadButton.disabled = false;
      applyCommon.disabled = false;
    }
  });

  async function loadPhotos() {
    if (!token) return;
    selected.clear();
    updateBulk();
    list.textContent = '読み込み中…';
    try {
      let path = `/api/admin/photos?category=${encodeURIComponent(manageCategory.value)}`;
      if (manageCategory.value === 'festival-day' && manageGroup.value) {
        path += `&group=${encodeURIComponent(manageGroup.value)}`;
      }
      const data = await api(path);
      photos = Array.isArray(data.photos) ? data.photos : [];
      renderPhotos();
    } catch (err) {
      photos = [];
      list.textContent = err.message || '読み込みに失敗しました';
    }
  }

  function updateBulk() {
    const count = selected.size;
    selectionCount.textContent = `${count}枚選択中`;
    bulkPublish.disabled = !count;
    bulkUnpublish.disabled = !count;
    clearSelection.disabled = !count;
    selectAll.disabled = !photos.length || count === photos.length;
    bulkApply.disabled = !count;
    bulkEditor.hidden = !count;
    bulkGroupField.hidden = manageCategory.value !== 'festival-day';
  }

  function setSelected(id, on) {
    on ? selected.add(id) : selected.delete(id);
    const card = [...list.querySelectorAll('[data-photo-id]')].find(item => item.dataset.photoId === id);
    if (card) {
      card.classList.toggle('is-selected', on);
      const checkbox = card.querySelector('.editor-select-checkbox');
      if (checkbox) checkbox.checked = on;
    }
    updateBulk();
  }

  selectAll.addEventListener('click', () => {
    photos.forEach(photo => selected.add(photo.id));
    list.querySelectorAll('.editor-photo').forEach(card => {
      card.classList.add('is-selected');
      const checkbox = card.querySelector('.editor-select-checkbox');
      if (checkbox) checkbox.checked = true;
    });
    updateBulk();
  });

  clearSelection.addEventListener('click', () => {
    selected.clear();
    list.querySelectorAll('.editor-photo').forEach(card => {
      card.classList.remove('is-selected');
      const checkbox = card.querySelector('.editor-select-checkbox');
      if (checkbox) checkbox.checked = false;
    });
    updateBulk();
  });

  bulkPublish.addEventListener('click', () => quickVisibility(true));
  bulkUnpublish.addEventListener('click', () => quickVisibility(false));

  async function quickVisibility(pub) {
    const ids = [...selected];
    if (!ids.length) return;
    bulkPublish.disabled = true;
    bulkUnpublish.disabled = true;
    let ok = 0, ng = 0;
    for (const id of ids) {
      try {
        await api(`/api/photos/${id}`, { method: 'PATCH', json: { published: pub } });
        ok++;
      } catch {
        ng++;
      }
    }
    notify(ng ? `${ok}枚変更・${ng}枚失敗` : `${ok}枚を${pub ? '公開' : '非公開'}にしました`, ng ? 4200 : 2800);
    await loadPhotos();
  }

  bulkCaptionMode.addEventListener('change', () => {
    bulkCaption.disabled = bulkCaptionMode.value !== 'replace';
    if (bulkCaptionMode.value !== 'replace') bulkCaption.value = '';
  });
  bulkCaption.disabled = true;

  bulkApply.addEventListener('click', async () => {
    const ids = [...selected];
    if (!ids.length) return notify('写真を選択してください');

    const body = {};
    if (manageCategory.value === 'festival-day' && bulkGroup.value) body.festivalGroup = bulkGroup.value;
    if (bulkDate.value) body.takenOn = bulkDate.value;
    if (bulkCaptionMode.value === 'replace') body.caption = bulkCaption.value.trim();
    if (bulkCaptionMode.value === 'clear') body.caption = '';
    if (bulkVisibility.value === 'published') body.published = true;
    if (bulkVisibility.value === 'unpublished') body.published = false;

    if (!Object.keys(body).length) {
      return notify('変更する項目を1つ以上指定してください', 4200);
    }

    const summary = [];
    if (body.festivalGroup) summary.push(`分類→${GROUPS[body.festivalGroup]}`);
    if (body.takenOn) summary.push(`日付→${body.takenOn}`);
    if (Object.hasOwn(body, 'caption')) summary.push(body.caption ? 'コメント置換' : 'コメント削除');
    if (Object.hasOwn(body, 'published')) summary.push(body.published ? '公開' : '非公開');
    if (!confirm(`${ids.length}枚に一括適用します。\n${summary.join(' / ')}`)) return;

    bulkApply.disabled = true;
    let ok = 0, ng = 0;
    for (const id of ids) {
      try {
        await api(`/api/photos/${id}`, { method: 'PATCH', json: body });
        ok++;
      } catch {
        ng++;
      }
    }

    notify(ng ? `${ok}枚変更・${ng}枚失敗` : `${ok}枚を一括編集しました`, ng ? 4400 : 3000);
    resetBulkEditor();
    await loadPhotos();
  });

  function resetBulkEditor() {
    bulkGroup.value = '';
    bulkDate.value = '';
    bulkCaptionMode.value = 'none';
    bulkCaption.value = '';
    bulkCaption.disabled = true;
    bulkVisibility.value = 'none';
  }

  function renderPhotos() {
    list.textContent = '';
    selected.clear();
    updateBulk();
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
      if (photo.published) img.src = photo.url;
      else img.classList.add('is-unpublished');
      img.alt = '';

      const selectLabel = document.createElement('label');
      selectLabel.className = 'editor-select-label';
      const check = document.createElement('input');
      check.type = 'checkbox';
      check.className = 'editor-select-checkbox';
      check.setAttribute('aria-label', 'この写真を一括編集の対象にする');
      const selectText = document.createElement('span');
      selectText.textContent = '選択';
      selectLabel.append(check, selectText);
      check.addEventListener('change', () => setSelected(photo.id, check.checked));
      visual.addEventListener('click', event => {
        if (event.target.closest('.editor-select-label')) return;
        setSelected(photo.id, !selected.has(photo.id));
      });

      const statusPill = document.createElement('span');
      statusPill.className = `photo-visibility-pill ${photo.published ? 'is-public' : 'is-private'}`;
      statusPill.textContent = photo.published ? '公開中' : '非公開';
      visual.append(img, selectLabel, statusPill);

      const controls = document.createElement('div');
      controls.className = 'editor-photo-controls';

      const captionLabel = fieldLabel('コメント');
      const caption = document.createElement('input');
      caption.type = 'text';
      caption.maxLength = 500;
      caption.value = photo.caption || '';
      caption.placeholder = '一言コメント';
      captionLabel.appendChild(caption);

      const dateLabel = fieldLabel('撮影日');
      const date = document.createElement('input');
      date.type = 'date';
      date.value = photo.takenOn || '';
      dateLabel.appendChild(date);

      controls.append(captionLabel, dateLabel);

      let group = null;
      if (photo.category === 'festival-day') {
        const groupLabel = fieldLabel('当日の分類');
        group = document.createElement('select');
        const unassigned = new Option('未分類（既存写真）', 'unassigned');
        unassigned.disabled = true;
        group.add(unassigned);
        Object.entries(GROUPS).forEach(([value, label]) => group.add(new Option(label, value)));
        group.value = photo.festivalGroup || 'unassigned';
        groupLabel.appendChild(group);
        controls.append(groupLabel);
      }

      const visibilityLabel = fieldLabel('公開状態');
      const visibility = document.createElement('select');
      visibility.add(new Option('公開中', '1'));
      visibility.add(new Option('非公開', '0'));
      visibility.value = photo.published ? '1' : '0';
      visibilityLabel.appendChild(visibility);
      controls.append(visibilityLabel);

      const row = document.createElement('div');
      row.className = 'editor-row';
      const save = button('この写真を保存', 'editor-button secondary');
      const cover = button(photo.isCover ? '代表写真' : '代表にする', 'editor-button secondary');
      cover.disabled = Boolean(photo.isCover);
      const del = button('削除', 'editor-button danger');
      row.append(save, cover, del);
      controls.append(row);
      card.append(visual, controls);
      list.append(card);

      save.addEventListener('click', async () => {
        try {
          const body = {
            caption: caption.value.trim(),
            takenOn: date.value || null,
            published: visibility.value === '1'
          };
          if (group && group.value !== 'unassigned') body.festivalGroup = group.value;
          await api(`/api/photos/${photo.id}`, { method: 'PATCH', json: body });
          notify('保存しました');
          await loadPhotos();
        } catch (err) {
          notify(err.message || '保存に失敗しました');
        }
      });

      cover.addEventListener('click', async () => {
        try {
          await api(`/api/photos/${photo.id}/cover`, { method: 'POST' });
          notify('代表写真にしました');
          await loadPhotos();
        } catch (err) {
          notify(err.message || '代表写真の変更に失敗しました');
        }
      });

      del.addEventListener('click', async () => {
        if (!confirm('この写真を削除しますか？')) return;
        try {
          await api(`/api/photos/${photo.id}`, { method: 'DELETE' });
          notify('削除しました');
          await loadPhotos();
        } catch (err) {
          notify(err.message || '削除に失敗しました');
        }
      });
    });
  }

  function fieldLabel(text) {
    const label = document.createElement('label');
    label.className = 'editor-card-field';
    const span = document.createElement('span');
    span.textContent = text;
    label.appendChild(span);
    return label;
  }

  function button(text, className) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = className;
    b.textContent = text;
    return b;
  }

  validate();
})();
