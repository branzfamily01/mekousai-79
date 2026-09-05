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
  function notify(text){ if(!toast)return; toast.textContent=text; toast.hidden=false; clearTimeout(notify.t); notify.t=setTimeout(()=>toast.hidden=true,3200); }
  async function setCover(group, photoId){
    const token = localStorage.getItem(TOKEN_KEY) || '';
    const res = await fetch(`${base}/api/festival-folders/${encodeURIComponent(group)}/cover`, { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`}, body:JSON.stringify({photoId}) });
    const data = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }
  function enhance(){
    const group = manageCategory.value === 'festival-day' ? manageGroup.value : '';
    if (!labels[group]) return;
    list.querySelectorAll('.editor-photo[data-photo-id]').forEach(card => {
      if (card.querySelector('.festival-group-cover-button')) return;
      const id = card.dataset.photoId;
      const row = card.querySelector('.editor-photo-controls .editor-row');
      if (!row) return;
      const button = document.createElement('button');
      button.type='button'; button.className='editor-button secondary festival-group-cover-button';
      button.textContent=`${labels[group]}の代表画像にする`;
      const published = card.querySelector('.photo-visibility-pill')?.classList.contains('is-public');
      if (!published) { button.disabled=true; button.title='公開中の写真だけ代表画像にできます'; }
      button.addEventListener('click', async () => {
        button.disabled=true;
        try { await setCover(group,id); notify(`${labels[group]}の代表画像に設定しました`); }
        catch(err){ notify(err.message || '代表画像を設定できませんでした'); }
        finally { if(published) button.disabled=false; }
      });
      row.insertBefore(button, row.lastElementChild);
    });
  }
  new MutationObserver(enhance).observe(list,{childList:true,subtree:true});
  manageCategory.addEventListener('change',()=>setTimeout(enhance,0));
  manageGroup.addEventListener('change',()=>setTimeout(enhance,0));
  enhance();
})();
