(() => {
  const TOKEN_KEY = 'mekousai-editor-token-v1';
  const cfg = window.MEKOUSAI_CONFIG || {};
  const base = String(cfg.apiBase || '').replace(/\/$/, '');
  const labels = { grade1:'1学年', grade2:'2学年', grade3:'3学年', club:'部活動', other:'その他', chuyasai:'中夜祭' };
  const list = document.getElementById('editor-list');
  const manageCategory = document.getElementById('manage-category');
  const manageGroup = document.getElementById('manage-festival-group');
  const toast = document.getElementById('editor-toast');
  if (!list || !manageCategory || !manageGroup) return;

  let currentCoverId = null;
  let refreshSeq = 0;

  function notify(text, ms=4200){
    if(!toast)return;
    toast.textContent=text;
    toast.hidden=false;
    clearTimeout(notify.t);
    notify.t=setTimeout(()=>toast.hidden=true,ms);
  }

  async function getFolders(){
    const res = await fetch(`${base}/api/festival-folders?_=${Date.now()}`, {
      headers:{Accept:'application/json'}, cache:'no-store'
    });
    const data = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return Array.isArray(data.folders) ? data.folders : [];
  }

  async function setCover(group, photoId){
    const token = localStorage.getItem(TOKEN_KEY) || '';
    const res = await fetch(`${base}/api/festival-folders/${encodeURIComponent(group)}/cover`, {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
      body:JSON.stringify({photoId}),
      cache:'no-store'
    });
    const data = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  function hideLegacyCategoryCoverButtons(){
    if (manageCategory.value !== 'festival-day') return;
    list.querySelectorAll('.editor-photo-controls .editor-row button').forEach(btn => {
      const text = btn.textContent.trim();
      if (text === '代表にする' || text === '代表写真') {
        btn.hidden = true;
        btn.setAttribute('aria-hidden','true');
      }
    });
  }

  function paintButtons(group){
    list.querySelectorAll('.editor-photo[data-photo-id]').forEach(card => {
      const button = card.querySelector('.festival-group-cover-button');
      if (!button) return;
      const id = card.dataset.photoId;
      const published = card.querySelector('.photo-visibility-pill')?.classList.contains('is-public');
      const isCurrent = id === currentCoverId;
      button.classList.toggle('is-current-cover', isCurrent);
      if (isCurrent) {
        button.textContent = `✓ ${labels[group]}の代表画像に設定済み`;
        button.disabled = true;
        button.title = '現在このフォルダの代表画像です';
      } else {
        button.textContent = `${labels[group]}の代表画像にする`;
        button.disabled = !published;
        button.title = published ? '' : '公開中の写真だけ代表画像にできます';
      }
    });
  }

  async function refreshCoverState(group){
    const seq = ++refreshSeq;
    try {
      const folders = await getFolders();
      if (seq !== refreshSeq) return;
      currentCoverId = folders.find(x => x.group === group)?.coverPhotoId || null;
      paintButtons(group);
    } catch {
      // 表示補助の取得失敗は編集自体を止めない。
    }
  }

  function enhance(){
    hideLegacyCategoryCoverButtons();
    const group = manageCategory.value === 'festival-day' ? manageGroup.value : '';
    if (!labels[group]) return;

    list.querySelectorAll('.editor-photo[data-photo-id]').forEach(card => {
      if (card.querySelector('.festival-group-cover-button')) return;
      const id = card.dataset.photoId;
      const row = card.querySelector('.editor-photo-controls .editor-row');
      if (!row) return;
      const button = document.createElement('button');
      button.type='button';
      button.className='editor-button secondary festival-group-cover-button';
      button.textContent=`${labels[group]}の代表画像にする`;
      const published = card.querySelector('.photo-visibility-pill')?.classList.contains('is-public');
      if (!published) { button.disabled=true; button.title='公開中の写真だけ代表画像にできます'; }
      button.addEventListener('click', async () => {
        button.disabled=true;
        const previous = button.textContent;
        button.textContent='設定中…';
        try {
          await setCover(group,id);
          currentCoverId = id;
          paintButtons(group);
          notify(`✓ ${labels[group]}の代表画像を設定しました。ほかのフォルダの代表画像は変更していません。`, 5200);
        } catch(err){
          button.textContent=previous;
          if(published) button.disabled=false;
          notify(err.message || '代表画像を設定できませんでした');
        }
      });
      row.insertBefore(button, row.lastElementChild);
    });
    paintButtons(group);
  }

  function refreshForSelection(){
    currentCoverId = null;
    enhance();
    const group = manageCategory.value === 'festival-day' ? manageGroup.value : '';
    if (labels[group]) refreshCoverState(group);
  }

  new MutationObserver(() => {
    enhance();
  }).observe(list,{childList:true,subtree:true});

  manageCategory.addEventListener('change',()=>setTimeout(refreshForSelection,0));
  manageGroup.addEventListener('change',()=>setTimeout(refreshForSelection,0));
  refreshForSelection();
})();