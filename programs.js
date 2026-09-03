(() => {
  const items = Array.isArray(window.MEKOUSAI_PROGRAMS) ? window.MEKOUSAI_PROGRAMS : [];
  const publicItems = items.filter(item => item.groupType !== '昼夜祭');
  const dayNightItems = items.filter(item => item.groupType === '昼夜祭');
  const grid = document.getElementById('program-grid');
  const count = document.getElementById('result-count');
  const heading = document.getElementById('result-heading');
  const search = document.getElementById('program-search');
  const params=new URLSearchParams(location.search); let group=params.get('group')||'all', cat=params.get('cat')||'all', q=params.get('q')||'';
  const norm = s => String(s || '').toLowerCase().replace(/\s+/g,'');

  // プログラム画像のspriteは、紙面の企画順に並べたもの。
  function pos(index, cols, rows){ const col=index%cols,row=Math.floor(index/cols); return {bx: cols===1?'0%':`${(col/(cols-1))*100}%`, by: rows===1?'0%':`${(row/(rows-1))*100}%`}; }
  function addVisual(card,item){
    const visual=document.createElement('div');
    if(item.sprite){
      visual.className=`program-visual sprite-${item.sprite}`;
      const cols=3, rows=item.sprite==='classes'?6:9, p=pos(item.spriteIndex,cols,rows);
      visual.style.setProperty('--bx',p.bx); visual.style.setProperty('--by',p.by);
    }else{
      visual.className='program-visual no-program-image';
    }
    visual.setAttribute('role','img');
    visual.setAttribute('aria-label',`${item.group} ${item.title} 公式プログラム掲載情報`);
    card.appendChild(visual);
  }
  function render(){
    const nq=norm(q);
    const filtered=publicItems.filter(item => (group==='all'||item.groupType===group||item.group===group) && (cat==='all'||item.webCategory===cat) && (!nq||norm([item.group,item.title,item.sourceGenre,item.description,item.venue,item.webCategory].join(' ')).includes(nq)));
    grid.textContent=''; count.textContent=`${filtered.length}企画`;
    heading.textContent = group==='all' ? 'すべての一般公開企画' : `${group}の企画`;
    if(!filtered.length){ const e=document.createElement('div'); e.className='no-results'; e.textContent='条件に合う企画がありません。絞り込みを変更してください。'; grid.appendChild(e); return; }
    filtered.forEach(item => {
      const card=document.createElement('article'); card.className='program-card';
      addVisual(card,item);
      const copy=document.createElement('div'); copy.className='program-copy';
      const tags=document.createElement('div'); tags.className='program-tags'; [item.group,item.sourceGenre,item.webCategory].filter(Boolean).forEach(t=>{const s=document.createElement('span');s.textContent=t;tags.appendChild(s)}); copy.appendChild(tags);
      const h=document.createElement('h3'); h.textContent=item.title; copy.appendChild(h);
      const d=document.createElement('p'); d.textContent=item.description; copy.appendChild(d);
      if(item.venue){ const v=document.createElement('p'); v.className='program-place'; v.textContent=`会場・時間：${item.venue}`; copy.appendChild(v); }
      card.appendChild(copy); grid.appendChild(card);
    });
  }
  function renderDayNight(){
    if(!dayNightItems.length) return null;
    const host=document.createElement('section'); host.className='daynight-festival'; host.id='daynight-festival';
    host.innerHTML=`<div class="daynight-festival__head"><div><span class="daynight-festival__badge">STUDENTS ONLY</span><h2>9/5 昼夜祭</h2></div><div class="daynight-festival__time">体育館｜15:30–17:30</div></div><p class="daynight-festival__notice">昼夜祭は在校生のみが参加する校内イベントです。一般来場者・保護者の方はご覧いただけません。一般公開の催しとは別枠で掲載しています。</p><p class="daynight-festival__report">昼夜祭の様子は、後日このサイトで写真レポートとして紹介します。</p>`;
    const list=document.createElement('div'); list.className='daynight-groups';
    dayNightItems.forEach(item=>{ const card=document.createElement('article'); card.className='daynight-group'; const name=document.createElement('strong');name.textContent=item.group;const title=document.createElement('span');title.textContent=item.title;card.append(name,title);list.appendChild(card); });
    host.appendChild(list); grid.insertAdjacentElement('afterend',host); return host;
  }
  document.querySelectorAll('[data-group]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-group]').forEach(b=>b.classList.remove('is-active'));btn.classList.add('is-active');group=btn.dataset.group;render();}));
  document.querySelectorAll('[data-cat]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-cat]').forEach(b=>b.classList.remove('is-active'));btn.classList.add('is-active');cat=btn.dataset.cat;render();}));
  document.querySelectorAll('[data-jump]').forEach(btn=>btn.addEventListener('click',()=>{group=btn.dataset.jump;document.querySelectorAll('[data-group]').forEach(b=>b.classList.toggle('is-active',b.dataset.group===group));render();document.querySelector('.p-controls').scrollIntoView({behavior:'smooth',block:'start'});}));
  if(q) search.value=q; document.querySelectorAll('[data-group]').forEach(b=>b.classList.toggle('is-active',b.dataset.group===group)); document.querySelectorAll('[data-cat]').forEach(b=>b.classList.toggle('is-active',b.dataset.cat===cat)); search.addEventListener('input',()=>{q=search.value;render();});
  render(); const dayNightHost=renderDayNight();
  if(params.get('view')==='daynight' && dayNightHost) requestAnimationFrame(()=>dayNightHost.scrollIntoView({behavior:'smooth',block:'start'}));
})();