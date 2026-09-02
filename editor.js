(() => {
  const categories = {
    'preparation': '準備風景', 'creation': '制作の手元', 'after-school': '放課後', 'rehearsal': 'リハーサル',
    'final-prep': '開催直前', 'festival-day': '文化祭当日', 'awards': '表彰・振り返り'
  };
  const cfg = window.MEKOUSAI_CONFIG || {};
  const apiBase = String(cfg.apiBase || '').replace(/\/$/, '');
  const configured = apiBase && !apiBase.includes('REPLACE-WITH-WORKER');
  const TOKEN_KEY = 'mekousai-editor-token-v1';
  let token = localStorage.getItem(TOKEN_KEY) || '';

  const status = document.getElementById('editor-status');
  const loginPanel = document.getElementById('login-panel');
  const loginForm = document.getElementById('login-form');
  const passcode = document.getElementById('passcode');
  const app = document.getElementById('editor-app');
  const uploadForm = document.getElementById('upload-form');
  const uploadCategory = document.getElementById('upload-category');
  const manageCategory = document.getElementById('manage-category');
  const uploadDate = document.getElementById('upload-date');
  const uploadCaption = document.getElementById('upload-caption');
  const uploadFiles = document.getElementById('upload-files');
  const uploadPublished = document.getElementById('upload-published');
  const uploadButton = document.getElementById('upload-button');
  const fileSummary = document.getElementById('file-summary');
  const progress = document.getElementById('upload-progress');
  const list = document.getElementById('editor-list');
  const logoutButton = document.getElementById('logout-button');
  const toast = document.getElementById('editor-toast');

  Object.entries(categories).forEach(([value, label]) => {
    uploadCategory.add(new Option(label, value));
    manageCategory.add(new Option(label, value));
  });
  uploadDate.value = new Date().toISOString().slice(0, 10);

  function showToast(message, ms = 2600) {
    toast.textContent = message; toast.hidden = false;
    clearTimeout(showToast.t); showToast.t = setTimeout(() => { toast.hidden = true; }, ms);
  }
  function setConnected(ok, text) {
    status.classList.toggle('is-ok', ok); status.classList.toggle('is-bad', !ok); status.textContent = text;
  }
  async function api(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (options.json !== undefined) { headers.set('Content-Type', 'application/json'); options.body = JSON.stringify(options.json); }
    const res = await fetch(`${apiBase}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }
  function showApp() { loginPanel.classList.add('editor-hidden'); app.classList.remove('editor-hidden'); }
  function showLogin() { app.classList.add('editor-hidden'); loginPanel.classList.remove('editor-hidden'); }

  async function validateSession() {
    if (!configured) { setConnected(false, 'Cloudflare API 未接続'); loginForm.querySelector('button').disabled = true; return; }
    try {
      const health = await api('/api/health');
      setConnected(Boolean(health.ok), health.ok ? 'Cloudflare 接続済み' : '設定未完了');
    } catch { setConnected(false, 'APIへ接続できません'); }
    if (!token) { showLogin(); return; }
    try { await api('/api/admin/me'); showApp(); await loadPhotos(); }
    catch { token = ''; localStorage.removeItem(TOKEN_KEY); showLogin(); }
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = loginForm.querySelector('button'); button.disabled = true;
    try {
      const data = await api('/api/login', { method: 'POST', json: { passcode: passcode.value } });
      token = data.token; localStorage.setItem(TOKEN_KEY, token); passcode.value = ''; showApp(); showToast('ログインしました'); await loadPhotos();
    } catch (err) { showToast(err.message || 'ログインできませんでした', 3600); }
    finally { button.disabled = false; }
  });
  logoutButton.addEventListener('click', () => { token=''; localStorage.removeItem(TOKEN_KEY); showLogin(); showToast('ログアウトしました'); });

  uploadFiles.addEventListener('change', () => {
    const files = [...uploadFiles.files];
    fileSummary.textContent = files.length ? `${files.length}枚選択・合計 ${(files.reduce((n,f)=>n+f.size,0)/1024/1024).toFixed(1)}MB` : '未選択';
  });

  async function decodeToCanvas(file) {
    let bitmap;
    if ('createImageBitmap' in window) {
      try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch {}
    }
    let width, height, draw;
    if (bitmap) {
      width = bitmap.width; height = bitmap.height; draw = (ctx,w,h) => ctx.drawImage(bitmap,0,0,w,h);
    } else {
      const url = URL.createObjectURL(file);
      try {
        const img = await new Promise((resolve,reject) => { const el=new Image(); el.onload=()=>resolve(el); el.onerror=reject; el.src=url; });
        width = img.naturalWidth; height = img.naturalHeight; draw = (ctx,w,h)=>ctx.drawImage(img,0,0,w,h);
      } finally { URL.revokeObjectURL(url); }
    }
    const maxSide = 1800;
    const scale = Math.min(1, maxSide / Math.max(width,height));
    const outW = Math.max(1, Math.round(width*scale)); const outH = Math.max(1, Math.round(height*scale));
    const canvas = document.createElement('canvas'); canvas.width=outW; canvas.height=outH;
    const ctx = canvas.getContext('2d', { alpha:false }); ctx.fillStyle='#fff'; ctx.fillRect(0,0,outW,outH); draw(ctx,outW,outH);
    if (bitmap && bitmap.close) bitmap.close();
    const blob = await new Promise((resolve,reject) => canvas.toBlob((b)=>b?resolve(b):reject(new Error('画像変換に失敗しました')), 'image/jpeg', .84));
    return { blob, width: outW, height: outH };
  }

  uploadForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const files = [...uploadFiles.files];
    if (!files.length) return showToast('写真を選んでください');
    uploadButton.disabled = true; progress.style.width = '0%';
    try {
      for (let i=0; i<files.length; i++) {
        showToast(`${i+1}/${files.length}枚目を準備中…`, 1200);
        const converted = await decodeToCanvas(files[i]);
        const form = new FormData();
        form.append('file', converted.blob, `mekousai-${Date.now()}-${i+1}.jpg`);
        form.append('category', uploadCategory.value);
        form.append('taken_on', uploadDate.value || '');
        form.append('caption', uploadCaption.value.trim());
        form.append('published', uploadPublished.checked ? '1' : '0');
        form.append('width', String(converted.width)); form.append('height', String(converted.height));
        await api('/api/photos', { method:'POST', body:form });
        progress.style.width = `${Math.round(((i+1)/files.length)*100)}%`;
      }
      uploadFiles.value=''; fileSummary.textContent='未選択'; uploadCaption.value='';
      showToast(`${files.length}枚を追加しました`, 3200); manageCategory.value = uploadCategory.value; await loadPhotos();
    } catch (err) { showToast(err.message || 'アップロードに失敗しました', 4200); }
    finally { uploadButton.disabled=false; setTimeout(()=>{progress.style.width='0%';},900); }
  });

  manageCategory.addEventListener('change', loadPhotos);

  async function loadPhotos() {
    if (!token) return;
    list.textContent = '読み込み中…';
    try {
      const data = await api(`/api/admin/photos?category=${encodeURIComponent(manageCategory.value)}`);
      renderPhotos(data.photos || []);
    } catch (err) { list.textContent = err.message || '読み込みに失敗しました'; }
  }

  function renderPhotos(photos) {
    list.textContent='';
    if (!photos.length) { list.textContent='このカテゴリにはまだ写真がありません。'; return; }
    photos.forEach((photo) => {
      const card = document.createElement('article'); card.className='editor-photo';
      const img = document.createElement('img'); img.src = photo.published ? photo.url : ''; img.alt='';
      if (!photo.published) { img.removeAttribute('src'); img.style.background='#ddd'; }
      card.appendChild(img);
      const controls = document.createElement('div'); controls.className='editor-photo-controls';
      const caption = document.createElement('input'); caption.type='text'; caption.maxLength=500; caption.value=photo.caption || ''; caption.placeholder='一言コメント';
      const date = document.createElement('input'); date.type='date'; date.value=photo.takenOn || '';
      const row = document.createElement('div'); row.className='editor-row';
      const publishedLabel = document.createElement('label'); const published = document.createElement('input'); published.type='checkbox'; published.checked=Boolean(photo.published); publishedLabel.append(published,' 公開');
      const save = button('保存','editor-button secondary');
      const cover = button(photo.isCover ? '代表写真' : '代表にする','editor-button secondary'); cover.disabled=Boolean(photo.isCover);
      const del = button('削除','editor-button danger');
      row.append(publishedLabel, save, cover, del);
      controls.append(caption,date,row); card.appendChild(controls); list.appendChild(card);
      save.addEventListener('click', async () => { try { await api(`/api/photos/${photo.id}`, {method:'PATCH', json:{caption:caption.value.trim(), takenOn:date.value || null, published:published.checked}}); showToast('保存しました'); await loadPhotos(); } catch(e){showToast(e.message);} });
      cover.addEventListener('click', async () => { try { await api(`/api/photos/${photo.id}/cover`, {method:'POST'}); showToast('代表写真にしました'); await loadPhotos(); } catch(e){showToast(e.message);} });
      del.addEventListener('click', async () => { if (!confirm('この写真を削除しますか？')) return; try { await api(`/api/photos/${photo.id}`, {method:'DELETE'}); showToast('削除しました'); await loadPhotos(); } catch(e){showToast(e.message);} });
    });
  }
  function button(text, className) { const b=document.createElement('button'); b.type='button'; b.className=className; b.textContent=text; return b; }

  validateSession();
})();
