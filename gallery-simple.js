(() => {
  const categories = {
    preparation: ['準備風景', 'PREPARATION', '文化祭に向けた準備の様子です。'],
    creation: ['制作の手元', 'MAKING', '装飾や作品づくりの手元を集めました。'],
    'after-school': ['放課後', 'AFTER SCHOOL', '放課後に進む準備の様子です。'],
    rehearsal: ['リハーサル', 'REHEARSAL', '本番に向けた練習や確認の様子です。'],
    'final-prep': ['開催直前', 'FINAL PREP', '開催直前の仕上げの様子です。'],
    'festival-day': ['文化祭当日', 'FESTIVAL DAYS', '当日の写真をまとめて見ることも、学年・部活動・中夜祭ごとに見ることもできます。'],
    awards: ['表彰・振り返り', 'AFTER THE FESTIVAL', '努力が実を結ぶ瞬間と、文化祭を終えたあとの言葉。']
  };
  const groups = { grade1:'1学年', grade2:'2学年', grade3:'3学年', club:'部活動', other:'その他', chuyasai:'中夜祭' };
  const params = new URLSearchParams(location.search);
  const requested = params.get('category');
  const category = categories[requested] ? requested : 'preparation';
  let group = null;
  if (category === 'festival-day' && groups[params.get('group')]) group = params.get('group');

  if (requested !== category || (category === 'festival-day' && params.has('group') && !group)) {
    const next = new URL(location.href);
    next.searchParams.set('category', category);
    if (!group) next.searchParams.delete('group');
    history.replaceState(null, '', next);
  }

  const [title, kicker, description] = categories[category];
  const groupLabel = group ? groups[group] : '';
  document.title = `${title}${groupLabel ? `｜${groupLabel}` : ''}｜第79回 目高祭`;
  document.getElementById('gallery-title').textContent = title;
  document.getElementById('gallery-kicker').textContent = kicker;
  document.getElementById('gallery-description').textContent = description;

  const folderNav = document.getElementById('festival-folder-nav');
  if (category === 'festival-day' && folderNav) {
    folderNav.hidden = false;
    addFolderLink(folderNav, null, 'すべて', !group);
    Object.entries(groups).forEach(([value, label]) => addFolderLink(folderNav, value, label, value === group));
  }

  function addFolderLink(nav, value, label, active) {
    const a = document.createElement('a');
    a.href = value ? `gallery.html?category=festival-day&group=${encodeURIComponent(value)}` : 'gallery.html?category=festival-day';
    a.className = active ? 'is-active' : '';
    if (active) a.setAttribute('aria-current', 'page');
    const strong = document.createElement('strong'); strong.textContent = label;
    const small = document.createElement('small'); small.textContent = active ? '表示中' : '写真を見る';
    a.append(strong, small); nav.appendChild(a);
  }

  const grid = document.getElementById('gallery-grid');
  const state = document.getElementById('gallery-state');
  const total = document.getElementById('gallery-total');
  const lightbox = document.getElementById('gallery-lightbox');
  const lightboxImage = document.getElementById('lightbox-image');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxCounter = document.getElementById('lightbox-counter');
  const closeBtn = lightbox.querySelector('.lightbox-close');
  const prevBtn = lightbox.querySelector('.lightbox-prev');
  const nextBtn = lightbox.querySelector('.lightbox-next');
  let photos = [], current = 0, pointerStart = null;
  const cfg = window.MEKOUSAI_CONFIG || {};
  const apiBase = String(cfg.apiBase || '').replace(/\/$/, '');
  const configured = apiBase && !apiBase.includes('REPLACE-WITH-WORKER');
  const fmtDate = value => { if (!value) return ''; const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value); return m ? `${Number(m[2])}月${Number(m[3])}日` : value; };
  function render(){ grid.textContent=''; state.hidden=photos.length>0; if(!photos.length){ state.textContent=group?`${groupLabel}の写真はまだありません。`:'まだ写真はありません。写真が追加されると、ここに自動で並びます。'; total.textContent=group?`${groupLabel}｜0 PHOTOS`:'0 PHOTOS'; return;} total.textContent=group?`${groupLabel}｜${photos.length} PHOTOS`:`${photos.length} PHOTOS`; photos.forEach((photo,index)=>{ const figure=document.createElement('figure'); figure.className='gallery-card'; const openButton=document.createElement('button'); openButton.type='button'; openButton.setAttribute('aria-label',`${index+1}枚目の写真を拡大`); const img=document.createElement('img'); img.src=photo.url; img.alt=photo.caption||`${title}の写真 ${index+1}`; img.loading=index<4?'eager':'lazy'; img.decoding='async'; openButton.appendChild(img); openButton.addEventListener('click',()=>open(index)); figure.appendChild(openButton); const caption=document.createElement('figcaption'); if(photo.takenOn){ const time=document.createElement('time'); time.dateTime=photo.takenOn; time.textContent=fmtDate(photo.takenOn); caption.appendChild(time);} if(photo.caption){ const p=document.createElement('p'); p.textContent=photo.caption; caption.appendChild(p);} figure.appendChild(caption); grid.appendChild(figure); }); }
  function showCurrent(){ const photo=photos[current]; if(!photo)return; lightboxImage.src=photo.url; lightboxImage.alt=photo.caption||`${title}の写真 ${current+1}`; lightboxCaption.textContent=[fmtDate(photo.takenOn),photo.caption].filter(Boolean).join('｜'); lightboxCounter.textContent=`${current+1} / ${photos.length}`; }
  function open(index){ current=index; showCurrent(); lightbox.hidden=false; document.body.style.overflow='hidden'; closeBtn.focus(); }
  function close(){ lightbox.hidden=true; document.body.style.overflow=''; lightboxImage.removeAttribute('src'); }
  function move(step){ if(!photos.length)return; current=(current+step+photos.length)%photos.length; showCurrent(); }
  closeBtn.addEventListener('click',close); prevBtn.addEventListener('click',()=>move(-1)); nextBtn.addEventListener('click',()=>move(1)); lightbox.addEventListener('click',e=>{if(e.target===lightbox)close();}); document.addEventListener('keydown',e=>{if(lightbox.hidden)return;if(e.key==='Escape')close();if(e.key==='ArrowLeft')move(-1);if(e.key==='ArrowRight')move(1);}); lightbox.addEventListener('pointerdown',e=>{pointerStart=e.clientX;}); lightbox.addEventListener('pointerup',e=>{if(pointerStart===null)return;const delta=e.clientX-pointerStart;pointerStart=null;if(Math.abs(delta)>55)move(delta>0?-1:1);});
  if(!configured){state.textContent='写真公開システムの接続準備中です。';total.textContent='準備中';return;} let endpoint=`${apiBase}/api/photos?category=${encodeURIComponent(category)}`; if(group) endpoint+=`&group=${encodeURIComponent(group)}`; fetch(endpoint,{headers:{Accept:'application/json'}}).then(res=>{if(!res.ok)throw new Error(`HTTP ${res.status}`);return res.json();}).then(payload=>{photos=Array.isArray(payload.photos)?payload.photos:[];render();}).catch(()=>{state.hidden=false;state.className='gallery-error';state.textContent='写真の読み込みに失敗しました。少し時間をおいて再読み込みしてください。';total.textContent='読み込みエラー';});
})();
