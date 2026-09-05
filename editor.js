(() => {
  const CATS = {
    preparation:'準備風景', creation:'制作の手元', 'after-school':'放課後', rehearsal:'リハーサル',
    'final-prep':'開催直前', 'festival-day':'文化祭当日', awards:'表彰・振り返り'
  };
  const GROUPS = { grade1:'1学年', grade2:'2学年', grade3:'3学年', club:'部活動', other:'その他' };
  const $ = id => document.getElementById(id);
  const cfg = window.MEKOUSAI_CONFIG || {};
  const base = String(cfg.apiBase || '').replace(/\/$/, '');
  const configured = base && !base.includes('REPLACE-WITH-WORKER');
  const TOKEN_KEY = 'mekousai-editor-token-v1';
  let token = localStorage.getItem(TOKEN_KEY) || '';
  let queue = [];
  let photos = [];
  const selected = new Set();

  const status=$('editor-status'), loginPanel=$('login-panel'), loginForm=$('login-form'), passcode=$('passcode'), app=$('editor-app');
  const uploadForm=$('upload-form'), uploadCategory=$('upload-category'), uploadGroupField=$('upload-festival-group-field'), uploadGroup=$('upload-festival-group');
  const uploadDate=$('upload-date'), commonCaption=$('upload-caption'), applyCommon=$('apply-common-caption'), filesInput=$('upload-files'), queueEl=$('upload-queue');
  const publishedInput=$('upload-published'), uploadButton=$('upload-button'), fileSummary=$('file-summary'), progress=$('upload-progress'), progressText=$('upload-progress-text');
  const manageCategory=$('manage-category'), manageGroupField=$('manage-festival-group-field'), manageGroup=$('manage-festival-group'), list=$('editor-list');
  const logout=$('logout-button'), toast=$('editor-toast'), selectionCount=$('bulk-selection-count'), selectAll=$('select-all-button'), clearSelection=$('clear-selection-button');
  const bulkPublish=$('bulk-publish-button'), bulkUnpublish=$('bulk-unpublish-button');

  Object.entries(CATS).forEach(([v,l]) => { uploadCategory.add(new Option(l,v)); manageCategory.add(new Option(l,v)); });
  Object.entries(GROUPS).forEach(([v,l]) => { uploadGroup.add(new Option(l,v)); manageGroup.add(new Option(l,v)); });
  uploadGroup.value='grade1'; manageGroup.value='other'; uploadDate.value=new Date().toISOString().slice(0,10);

  const notify = (msg, ms=2800) => {
    toast.textContent=msg; toast.hidden=false; clearTimeout(notify.t); notify.t=setTimeout(()=>toast.hidden=true,ms);
  };
  const setStatus = (ok,msg) => {
    status.classList.toggle('is-ok',ok); status.classList.toggle('is-bad',!ok); status.textContent=msg;
  };
  async function api(path, opts={}) {
    const headers=new Headers(opts.headers||{});
    if(token) headers.set('Authorization',`Bearer ${token}`);
    const request={...opts,headers}; delete request.json;
    if(opts.json!==undefined){ headers.set('Content-Type','application/json'); request.body=JSON.stringify(opts.json); }
    const res=await fetch(`${base}${path}`,request);
    const data=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error||`HTTP ${res.status}`);
    return data;
  }
  const showApp = () => { loginPanel.classList.add('editor-hidden'); app.classList.remove('editor-hidden'); };
  const showLogin = () => { app.classList.add('editor-hidden'); loginPanel.classList.remove('editor-hidden'); };
  function syncGroupFields(){
    uploadGroupField.hidden=uploadCategory.value!=='festival-day';
    manageGroupField.hidden=manageCategory.value!=='festival-day';
  }

  async function validate(){
    if(!configured){ setStatus(false,'Cloudflare API 未接続'); loginForm.querySelector('button').disabled=true; return; }
    try{ const h=await api('/api/health'); setStatus(Boolean(h.ok),h.ok?'Cloudflare 接続済み':'設定未完了'); }
    catch{ setStatus(false,'APIへ接続できません'); }
    if(!token){ showLogin(); return; }
    try{ await api('/api/admin/me'); showApp(); await loadPhotos(); }
    catch{ token=''; localStorage.removeItem(TOKEN_KEY); showLogin(); }
  }
  loginForm.addEventListener('submit',async e=>{
    e.preventDefault(); const b=loginForm.querySelector('button'); b.disabled=true;
    try{ const d=await api('/api/login',{method:'POST',json:{passcode:passcode.value}}); token=d.token; localStorage.setItem(TOKEN_KEY,token); passcode.value=''; showApp(); notify('ログインしました'); await loadPhotos(); }
    catch(err){ notify(err.message||'ログインできませんでした',3800); }
    finally{ b.disabled=false; }
  });
  logout.addEventListener('click',()=>{ token=''; localStorage.removeItem(TOKEN_KEY); showLogin(); notify('ログアウトしました'); });

  uploadCategory.addEventListener('change',syncGroupFields);
  manageCategory.addEventListener('change',()=>{ if(manageCategory.value==='festival-day') manageGroup.value='other'; syncGroupFields(); loadPhotos(); });
  manageGroup.addEventListener('change',loadPhotos);
  syncGroupFields();

  filesInput.addEventListener('change',()=>{
    const batch=[...filesInput.files], stamp=Date.now();
    queue.push(...batch.map((file,i)=>({ id:`${stamp}-${i}-${Math.random().toString(36).slice(2)}`, file, caption:'', state:'ready', error:'', url:URL.createObjectURL(file) })));
    filesInput.value='';
    resetProgress(); renderQueue();
    if(batch.length) notify(`${batch.length}枚を送信キューに追加しました`);
  });
  function resetProgress(){ progress.style.width='0%'; progressText.textContent=''; uploadButton.textContent='選んだ写真をまとめて公開'; }
  function queueLabel(item){
    return item.state==='preparing'?'変換中…':item.state==='uploading'?'送信中…':item.state==='done'?'✓ 完了':item.state==='failed'?`再送待ち：${item.error||'失敗'}`:'送信待ち';
  }
  function renderQueue(){
    queueEl.textContent='';
    const bytes=queue.reduce((s,x)=>s+x.file.size,0);
    fileSummary.textContent=queue.length?`${queue.length}枚を送信待ち・合計 ${(bytes/1048576).toFixed(1)}MB`:'未選択';
    queue.forEach((item,i)=>{
      const card=document.createElement('article'); card.className=`upload-item upload-status-${item.state}`;
      const img=document.createElement('img'); img.src=item.url; img.alt=`${i+1}枚目の選択写真`;
      const body=document.createElement('div'); body.className='upload-item-body';
      const meta=document.createElement('div'); meta.className='upload-item-meta';
      const name=document.createElement('strong'); name.textContent=`${i+1}. ${item.file.name||'写真'}`;
      const st=document.createElement('span'); st.className='upload-item-status'; st.textContent=queueLabel(item); meta.append(name,st);
      const caption=document.createElement('textarea'); caption.maxLength=500; caption.placeholder='この写真だけのコメント（任意）'; caption.value=item.caption;
      const locked=['preparing','uploading','done'].includes(item.state); caption.disabled=locked; caption.addEventListener('input',()=>item.caption=caption.value);
      const remove=btn('この写真を除外','editor-mini-button'); remove.disabled=locked;
      remove.addEventListener('click',()=>{ URL.revokeObjectURL(item.url); queue=queue.filter(x=>x!==item); renderQueue(); });
      body.append(meta,caption,remove); card.append(img,body); queueEl.appendChild(card);
    });
  }
  applyCommon.addEventListener('click',()=>{
    if(!queue.length) return notify('先に写真を選んでください');
    const text=commonCaption.value.trim(); if(!text) return notify('共通コメントを入力してください');
    let n=0; queue.forEach(x=>{ if(x.state!=='done'){ x.caption=text; n++; } }); renderQueue(); notify(`${n}枚に共通コメントを適用しました`);
  });

  async function resize(file){
    let source,w,h,close=()=>{};
    if('createImageBitmap' in window){
      try{ const b=await createImageBitmap(file,{imageOrientation:'from-image'}); source=b; w=b.width; h=b.height; close=()=>b.close?.(); }catch{}
    }
    if(!source){
      const url=URL.createObjectURL(file);
      try{ source=await new Promise((ok,ng)=>{ const im=new Image(); im.onload=()=>ok(im); im.onerror=ng; im.src=url; }); w=source.naturalWidth; h=source.naturalHeight; }
      finally{ URL.revokeObjectURL(url); }
    }
    const scale=Math.min(1,1800/Math.max(w,h)), outW=Math.max(1,Math.round(w*scale)), outH=Math.max(1,Math.round(h*scale));
    const canvas=document.createElement('canvas'); canvas.width=outW; canvas.height=outH;
    const ctx=canvas.getContext('2d',{alpha:false}); ctx.fillStyle='#fff'; ctx.fillRect(0,0,outW,outH); ctx.drawImage(source,0,0,outW,outH); close();
    const blob=await new Promise((ok,ng)=>canvas.toBlob(b=>b?ok(b):ng(new Error('画像変換に失敗しました')),'image/jpeg',.84));
    return {blob,width:outW,height:outH};
  }

  uploadForm.addEventListener('submit',async e=>{
    e.preventDefault(); const pending=queue.filter(x=>x.state!=='done'); if(!pending.length) return notify('写真を選んでください');
    const category=uploadCategory.value, group=category==='festival-day'?uploadGroup.value:'', taken=uploadDate.value||'', pub=publishedInput.checked;
    uploadButton.disabled=true; applyCommon.disabled=true; let done=0,ok=0,ng=0;
    try{
      for(let i=0;i<pending.length;i++){
        const item=pending[i];
        try{
          item.state='preparing'; item.error=''; renderQueue(); const converted=await resize(item.file);
          item.state='uploading'; renderQueue();
          const form=new FormData(); form.append('file',converted.blob,`mekousai-${Date.now()}-${i+1}.jpg`); form.append('category',category);
          if(category==='festival-day') form.append('festival_group',group);
          form.append('taken_on',taken); form.append('caption',item.caption.trim()); form.append('published',pub?'1':'0'); form.append('width',String(converted.width)); form.append('height',String(converted.height));
          await api('/api/photos',{method:'POST',body:form}); item.state='done'; ok++;
        }catch(err){ item.state='failed'; item.error=err.message||'アップロード失敗'; ng++; }
        done++; progress.style.width=`${Math.round(done/pending.length*100)}%`; progressText.textContent=`${done}/${pending.length}枚処理済み（成功 ${ok}・失敗 ${ng}）`; renderQueue();
      }
      manageCategory.value=category; if(category==='festival-day') manageGroup.value=group; syncGroupFields(); await loadPhotos();
      if(ng){ uploadButton.textContent=`失敗した${ng}枚を再送`; notify(`${ok}枚成功・${ng}枚失敗。失敗分だけ再送できます。`,5200); }
      else{ const total=ok; commonCaption.value=''; queue.forEach(x=>URL.revokeObjectURL(x.url)); queue=[]; renderQueue(); resetProgress(); notify(`${total}枚を追加しました`,3400); }
    }finally{ uploadButton.disabled=false; applyCommon.disabled=false; }
  });

  async function loadPhotos(){
    if(!token) return; selected.clear(); updateBulk(); list.textContent='読み込み中…';
    try{
      let path=`/api/admin/photos?category=${encodeURIComponent(manageCategory.value)}`;
      if(manageCategory.value==='festival-day') path+=`&group=${encodeURIComponent(manageGroup.value)}`;
      const data=await api(path); photos=Array.isArray(data.photos)?data.photos:[]; renderPhotos();
    }catch(err){ photos=[]; list.textContent=err.message||'読み込みに失敗しました'; }
  }
  function updateBulk(){
    const n=selected.size; selectionCount.textContent=`${n}枚選択中`; bulkPublish.disabled=!n; bulkUnpublish.disabled=!n; clearSelection.disabled=!n; selectAll.disabled=!photos.length||n===photos.length;
  }
  function setSelected(id,on){
    on?selected.add(id):selected.delete(id); const card=[...list.querySelectorAll('[data-photo-id]')].find(x=>x.dataset.photoId===id);
    if(card){ card.classList.toggle('is-selected',on); const c=card.querySelector('.editor-select-checkbox'); if(c)c.checked=on; } updateBulk();
  }
  selectAll.addEventListener('click',()=>{ photos.forEach(p=>selected.add(p.id)); list.querySelectorAll('.editor-photo').forEach(c=>{c.classList.add('is-selected');c.querySelector('.editor-select-checkbox').checked=true;}); updateBulk(); });
  clearSelection.addEventListener('click',()=>{ selected.clear(); list.querySelectorAll('.editor-photo').forEach(c=>{c.classList.remove('is-selected');c.querySelector('.editor-select-checkbox').checked=false;}); updateBulk(); });
  bulkPublish.addEventListener('click',()=>bulkVisibility(true)); bulkUnpublish.addEventListener('click',()=>bulkVisibility(false));
  async function bulkVisibility(pub){
    const ids=[...selected]; if(!ids.length)return; bulkPublish.disabled=true; bulkUnpublish.disabled=true; let ok=0,ng=0;
    for(const id of ids){ try{ await api(`/api/photos/${id}`,{method:'PATCH',json:{published:pub}}); ok++; }catch{ ng++; } }
    notify(ng?`${ok}枚変更・${ng}枚失敗`:`${ok}枚を${pub?'公開':'非公開'}にしました`,ng?4200:2800); await loadPhotos();
  }

  function renderPhotos(){
    list.textContent=''; selected.clear(); updateBulk();
    if(!photos.length){ list.textContent='この分類にはまだ写真がありません。'; return; }
    photos.forEach(photo=>{
      const card=document.createElement('article'); card.className='editor-photo'; card.dataset.photoId=photo.id;
      const visual=document.createElement('div'); visual.className='editor-photo-visual';
      const img=document.createElement('img'); if(photo.published)img.src=photo.url; else img.classList.add('is-unpublished'); img.alt='';
      const check=document.createElement('input'); check.type='checkbox'; check.className='editor-select-checkbox'; check.setAttribute('aria-label','一括操作の対象に選択'); check.addEventListener('change',()=>setSelected(photo.id,check.checked));
      visual.addEventListener('click',e=>{ if(e.target!==check)setSelected(photo.id,!selected.has(photo.id)); });
      const badge=document.createElement('span'); badge.className='editor-select-badge'; badge.textContent='✓'; visual.append(img,check,badge);
      const controls=document.createElement('div'); controls.className='editor-photo-controls';
      const caption=document.createElement('input'); caption.type='text'; caption.maxLength=500; caption.value=photo.caption||''; caption.placeholder='一言コメント';
      const date=document.createElement('input'); date.type='date'; date.value=photo.takenOn||''; controls.append(caption,date);
      let group=null; if(photo.category==='festival-day'){ group=document.createElement('select'); group.className='editor-photo-group'; Object.entries(GROUPS).forEach(([v,l])=>group.add(new Option(l,v))); group.value=photo.festivalGroup||'other'; controls.append(group); }
      const row=document.createElement('div'); row.className='editor-row'; const pubLabel=document.createElement('label'), pub=document.createElement('input'); pub.type='checkbox'; pub.checked=Boolean(photo.published); pubLabel.append(pub,' 公開');
      const save=btn('保存','editor-button secondary'), cover=btn(photo.isCover?'代表写真':'代表にする','editor-button secondary'), del=btn('削除','editor-button danger'); cover.disabled=Boolean(photo.isCover); row.append(pubLabel,save,cover,del); controls.append(row); card.append(visual,controls); list.append(card);
      save.addEventListener('click',async()=>{ try{ const body={caption:caption.value.trim(),takenOn:date.value||null,published:pub.checked}; if(group)body.festivalGroup=group.value; await api(`/api/photos/${photo.id}`,{method:'PATCH',json:body}); notify('保存しました'); await loadPhotos(); }catch(err){notify(err.message);} });
      cover.addEventListener('click',async()=>{ try{await api(`/api/photos/${photo.id}/cover`,{method:'POST'});notify('代表写真にしました');await loadPhotos();}catch(err){notify(err.message);} });
      del.addEventListener('click',async()=>{ if(!confirm('この写真を削除しますか？'))return; try{await api(`/api/photos/${photo.id}`,{method:'DELETE'});notify('削除しました');await loadPhotos();}catch(err){notify(err.message);} });
    });
  }
  function btn(text,cls){ const b=document.createElement('button'); b.type='button'; b.className=cls; b.textContent=text; return b; }
  validate();
})();
