(() => {
  const addCss = href => {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link=document.createElement('link'); link.rel='stylesheet'; link.href=href; document.head.appendChild(link);
  };
  addCss('styles-04.css');
  addCss('styles-07.css');
  addCss('gallery-system.css');
  addCss('daynight.css');
})();

// BGM: starts stopped; leaving the page/tab always stops playback.
(() => {
  const root=document.getElementById('bgm-player'); if(!root) return;
  const audio=root.querySelector('audio'), panel=root.querySelector('.cassette-player'), toggle=root.querySelector('.bgm-toggle');
  const label=root.querySelector('.bgm-toggle-label'), dot=root.querySelector('.bgm-playing-dot'), play=root.querySelector('.cassette-play');
  const icon=play?.querySelector('span'), playText=play?.querySelector('b'), close=root.querySelector('.cassette-close');
  const range=root.querySelector('.volume-control input'), out=root.querySelector('.volume-control output');
  const status=root.querySelector('.cassette-status-text'), led=root.querySelector('.status-led'), reels=[...root.querySelectorAll('.cassette-reel')];
  const KEY='mekousai-bgm-preferences-v2', DEFAULT=.22, FADE=1600; let frame=null, playing=false, open=false, volume=DEFAULT;
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  try{const x=JSON.parse(localStorage.getItem(KEY)||'{}');volume=clamp(Number.isFinite(x.volume)?x.volume:DEFAULT,0,1);open=Boolean(x.panelOpen)}catch{}
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify({volume,panelOpen:open}))}catch{}};
  const setPanel=v=>{open=v;if(panel)panel.hidden=!v;root.dataset.open=v?'true':'false';toggle?.setAttribute('aria-expanded',String(v));if(label)label.textContent=v?'BGMを閉じる':'BGMを聴く';save()};
  const render=(v,msg)=>{playing=v;if(play)play.setAttribute('aria-label',v?'BGMを停止':'BGMを再生');if(icon)icon.textContent=v?'Ⅱ':'▶';if(playText)playText.textContent=v?'STOP':'PLAY';if(status)status.textContent=msg||(v?'再生中':'停止中');led?.classList.toggle('is-on',v);if(dot)dot.hidden=!v;reels.forEach(r=>r.classList.toggle('is-spinning',v))};
  const cancel=()=>{if(frame!==null)cancelAnimationFrame(frame);frame=null};
  const fade=()=>{cancel();const target=volume,start=Math.min(target,.045),t0=performance.now();audio.volume=start;const tick=t=>{const p=clamp((t-t0)/FADE,0,1),e=1-Math.pow(1-p,3);audio.volume=start+(target-start)*e;if(p<1&&!audio.paused)frame=requestAnimationFrame(tick);else frame=null};frame=requestAnimationFrame(tick)};
  const stop=()=>{cancel();audio.pause();try{audio.currentTime=0}catch{}render(false,'停止中')};
  const start=async()=>{try{audio.currentTime=0;await audio.play();fade();render(true,'再生中')}catch{render(false,'タップして再生')}};
  toggle?.addEventListener('click',()=>setPanel(!open));close?.addEventListener('click',()=>setPanel(false));play?.addEventListener('click',()=>playing?stop():void start());
  range?.addEventListener('input',()=>{volume=clamp(Number(range.value),0,1);if(out)out.textContent=`${Math.round(volume*100)}%`;if(playing&&frame===null)audio.volume=volume;save()});
  audio.volume=volume;if(range)range.value=String(volume);if(out)out.textContent=`${Math.round(volume*100)}%`;setPanel(open);render(false,'停止中');
  window.addEventListener('pagehide',stop);window.addEventListener('beforeunload',stop);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')stop()});
})();

// Current official-program cover and visitor-policy wording.
(() => {
  document.querySelectorAll('.program-book-frame img').forEach(img=>{img.src='program-cover.avif'});
  const map=document.getElementById('map');
  if(map) map.innerHTML=`<div class="section-kicker"><span>FLOOR GUIDE</span> 校舎案内図</div><div class="map-grid"><div><h2>校舎案内図は、<br>現在確認中です。</h2><p class="map-lead">文化祭の栞をもとに掲載準備を進めます。Web公開の可否は管理職確認後に確定し、このページへ反映します。</p><a class="button button-primary" href="#access">学校へのアクセスを見る <span>↘</span></a></div><div aria-label="校舎案内図 掲載可否確認中" class="floor-board safe-map-board"><div class="floor-title"><span>SCHOOL MAP</span><strong>校舎案内図</strong></div><div aria-hidden="true" class="safe-map-icon">⌂</div><p class="safe-map-message">掲載可否を<br><strong>確認中</strong></p><small>栞を確認後、案内図付きのページを準備します。</small><span aria-hidden="true" class="map-tape"></span></div></div>`;
  const notices=document.getElementById('notices');
  if(notices) notices.innerHTML=`<div class="section-kicker"><span>NOTICE</span> ご来場の皆さまへ</div><div class="notice-layout"><div><h2>現在のご案内</h2><span aria-hidden="true" class="notice-symbol">!</span></div><ol class="notice-list"><li><span>01</span><div><strong>来場申込受付は終了しました。</strong><p>一般来場枠も定員に達しています。</p></div></li><li><span>02</span><div><strong>一般公開時間</strong><p>9月5日（土）10:00–15:00 ／ 9月6日（日）9:00–15:00</p></div></li><li><span>03</span><div><strong>9月5日の中夜祭は在校生限定です。</strong><p>一般来場者・保護者の方はご覧いただけません。後日、写真レポートを掲載予定です。</p></div></li><li><span>04</span><div><strong>校舎案内図は掲載可否を確認中です。</strong><p>栞の案内図をもとにページを準備し、公開のON/OFFは管理職確認後に確定します。</p></div></li></ol></div><a class="button button-dark notice-button" href="https://www.metro.ed.jp/meguro-h/news/2026/08/79_1.html" rel="noreferrer" target="_blank">学校公式の目高祭案内を見る <span>↗</span></a>`;

  const volunteer=document.querySelector('.program-paths a[href="programs.html?group=有志"]');
  if(volunteer){
    volunteer.href='programs.html?view=daynight';
    const strong=volunteer.querySelector('strong'), small=volunteer.querySelector('small');
    if(strong) strong.textContent='中夜祭';
    if(small) small.textContent='在校生限定・後日写真レポート';
  }
})();

// Timetable: vertical time axis × venue columns, making overlaps easy to compare.
(() => {
  const section=document.getElementById('timetable'); if(!section) return;
  const day=(dayNo,date,hours,events)=>`<article class="timeline-day"><header><span>DAY ${dayNo}</span><strong>${date}</strong><small>${hours}</small></header><div class="timeline-scroll"><div class="timeline-grid"><div class="timeline-corner">TIME</div><div class="timeline-venue-head">体育館</div><div class="timeline-venue-head">講義室1・2</div><div class="timeline-venue-head">視聴覚室</div><div class="timeline-venue-head">音楽室</div><div class="timeline-time-axis"><span style="--m:0">09:00</span><span style="--m:60">10:00</span><span style="--m:120">11:00</span><span style="--m:180">12:00</span><span style="--m:240">13:00</span><span style="--m:300">14:00</span><span style="--m:360">15:00</span></div>${events}</div></div></article>`;
  const venue=(name,items)=>`<section class="timeline-venue"><h4>${name}</h4><div class="timeline-events">${items.map(x=>`<div class="timeline-event ${x[4]}" style="--start:${x[0]};--duration:${x[1]}"><time>${x[2]}</time><strong>${x[3]}</strong></div>`).join('')}</div></section>`;
  const d1=[
    venue('体育館',[[80,60,'10:20–11:20','フォークソング部','music'],[170,50,'11:50–12:40','吹奏楽部','music'],[250,20,'13:10–13:30','合唱部','music'],[300,30,'14:00–14:30','ダンス部','dance']]),
    venue('講義室1・2',[[70,40,'10:10–10:50','3年3組','play'],[150,30,'11:30–12:00','3年1組','play'],[230,40,'12:50–13:30','3年3組','play'],[310,30,'14:10–14:40','3年1組','play']]),
    venue('視聴覚室',[[80,30,'10:20–10:50','3年2組','play'],[150,40,'11:30–12:10','3年5組','play'],[240,30,'13:00–13:30','3年2組','play'],[310,40,'14:10–14:50','3年5組','play']]),
    venue('音楽室',[[90,30,'10:30–11:00','3年4組','play'],[160,30,'11:40–12:10','3年6組','play'],[250,30,'13:10–13:40','3年4組','play'],[320,30,'14:20–14:50','3年6組','play']])
  ].join('');
  const d2=[
    venue('体育館',[[30,20,'09:30–09:50','書道部','culture'],[90,30,'10:30–11:00','ダンス部','dance'],[140,20,'11:20–11:40','合唱部','music'],[190,60,'12:10–13:10','フォークソング部','music'],[300,50,'14:00–14:50','吹奏楽部','music']]),
    venue('講義室1・2',[[20,30,'09:20–09:50','3年1組','play'],[90,40,'10:30–11:10','3年3組','play'],[210,30,'12:30–13:00','3年1組','play'],[290,40,'13:50–14:30','3年3組','play']]),
    venue('視聴覚室',[[60,40,'10:00–10:40','3年5組','play'],[140,30,'11:20–11:50','3年2組','play'],[230,40,'12:50–13:30','3年5組','play'],[310,30,'14:10–14:40','3年2組','play']]),
    venue('音楽室',[[40,30,'09:40–10:10','3年6組','play'],[110,30,'10:50–11:20','3年4組','play'],[190,30,'12:10–12:40','3年6組','play'],[270,30,'13:30–14:00','3年4組','play']])
  ].join('');
  const dayNightGroups=['ハンバーグπ','舐メキメ','nicht','7th floor','アポアイ！','MAGURO','ゆめゆめゆいま～る','女バラブ','ダンス部26期','Miss11','MAVERICK','Meguro Music Union','男子バスケットボール部精鋭'];
  const dayNight=`<section class="daynight-festival homepage-daynight"><div class="daynight-festival__head"><div><span class="daynight-festival__badge">STUDENTS ONLY</span><h3>9/5 中夜祭</h3></div><div class="daynight-festival__time">体育館｜15:30–17:30</div></div><p class="daynight-festival__notice">中夜祭は在校生のみが参加する校内イベントです。一般来場者・保護者の方はご覧いただけません。一般公開のタイムテーブルとは分けて掲載しています。</p><p class="daynight-festival__report">当日の様子は後日、写真レポートとしてこのサイトに掲載予定です。</p><div class="daynight-groups">${dayNightGroups.map(name=>`<article class="daynight-group"><strong>${name}</strong></article>`).join('')}</div></section>`;
  section.innerHTML=`<div class="section-heading-row"><div><div class="section-kicker"><span>TIMETABLE</span> タイムテーブル</div><h2>同じ時刻を、<br>横に見比べる。</h2></div><p>縦軸が時間、横軸が会場です。バーの高さと位置で上演時間を比較できるので、重なっている企画や次に移動できる企画が一目で分かります。</p></div><p class="timetable-note">公式プログラム掲載時刻をWeb用に可視化しています。スマートフォンでは左右にスクロールして全会場を比較できます。</p><div class="timeline-days">${day('01','9月5日（土）','一般公開 10:00–15:00',d1)}${day('02','9月6日（日）','一般公開 9:00–15:00',d2)}</div>${dayNight}`;
})();

// Photo-journal cards open category galleries; API hydration is optional until Cloudflare is connected.
(() => {
  const map=new Map([['準備風景','preparation'],['制作の手元','creation'],['放課後','after-school'],['リハーサル','rehearsal'],['開催直前','final-prep'],['文化祭当日','festival-day'],['表彰・振り返り','awards']]);
  const targets=[];
  document.querySelectorAll('.photo-entry,.future-chapters article').forEach(node=>{const category=map.get(node.querySelector('h3')?.textContent.trim());if(!category)return;node.classList.add('photo-gallery-link');node.dataset.galleryCategory=category;node.tabIndex=0;const go=()=>location.href=`gallery.html?category=${encodeURIComponent(category)}`;node.addEventListener('click',e=>{if(!e.target.closest('a,button,input,select,textarea'))go()});node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}});const cap=node.querySelector('.photo-caption');if(cap&&!cap.querySelector('.gallery-open-label')){const x=document.createElement('span');x.className='gallery-open-label';x.innerHTML='写真を見る <b aria-hidden="true">↗</b>';cap.appendChild(x)}targets.push(node)});
  if(!targets.length)return;
  const hydrate=()=>{const base=String(window.MEKOUSAI_CONFIG?.apiBase||'').replace(/\/$/,'');if(!base||base.includes('REPLACE-WITH-WORKER'))return;fetch(`${base}/api/categories`).then(r=>r.ok?r.json():Promise.reject()).then(data=>{const m=new Map((data.categories||[]).map(x=>[x.category,x]));targets.forEach(t=>{const x=m.get(t.dataset.galleryCategory);if(!x?.count)return;t.classList.add('has-gallery-items');const cover=t.querySelector('.empty-photo');if(cover&&x.coverUrl){cover.classList.add('gallery-cover','has-cover-image');cover.textContent='';const img=document.createElement('img');img.src=x.coverUrl;img.alt='';img.loading='lazy';const badge=document.createElement('small');badge.className='gallery-count';badge.textContent=`${x.count} PHOTOS`;cover.append(img,badge)}})}).catch(()=>{})};
  if(window.MEKOUSAI_CONFIG)hydrate();else{const s=document.createElement('script');s.src='site-config.js';s.onload=hydrate;document.head.appendChild(s)}
})();
