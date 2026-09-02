(() => {
  const categories = {
    'preparation': ['準備風景', 'PREPARATION', '教室装飾や企画会議。文化祭が形になっていく途中の景色。'],
    'creation': ['制作の手元', 'MAKING', '看板、衣装、作品。目高祭をつくる手元に寄って見る。'],
    'after-school': ['放課後', 'AFTER SCHOOL', '授業が終わったあとの校内。仲間と試行錯誤する時間。'],
    'rehearsal': ['リハーサル', 'REHEARSAL', '本番へ向けて、音・動き・段取りを重ねる。'],
    'final-prep': ['開催直前', 'FINAL PREP', '完成した教室と最後の仕上げ。開幕前の高揚感。'],
    'festival-day': ['文化祭当日', 'FESTIVAL DAYS', 'ステージ、展示、模擬店。2日間の熱気と笑顔。'],
    'awards': ['表彰・振り返り', 'AFTER THE FESTIVAL', '努力が実を結ぶ瞬間と、文化祭を終えたあとの言葉。']
  };
  const params = new URLSearchParams(location.search);
  const category = categories[params.get('category')] ? params.get('category') : 'preparation';
  const [title, kicker, description] = categories[category];
  document.title = `${title}｜第79回 目高祭`;
  document.getElementById('gallery-title').textContent = title;
  document.getElementById('gallery-kicker').textContent = kicker;
  document.getElementById('gallery-description').textContent = description;

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
  let photos = [];
  let current = 0;
  let pointerStart = null;

  const cfg = window.MEKOUSAI_CONFIG || {};
  const apiBase = String(cfg.apiBase || '').replace(/\/$/, '');
  const configured = apiBase && !apiBase.includes('REPLACE-WITH-WORKER');

  const fmtDate = (value) => {
    if (!value) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    return m ? `${Number(m[2])}月${Number(m[3])}日` : value;
  };

  function render() {
    grid.textContent = '';
    state.hidden = photos.length > 0;
    if (!photos.length) {
      state.textContent = 'まだ写真はありません。写真が追加されると、ここに自動で並びます。';
      total.textContent = '0 PHOTOS';
      return;
    }
    total.textContent = `${photos.length} PHOTOS`;
    photos.forEach((photo, index) => {
      const figure = document.createElement('figure');
      figure.className = 'gallery-card';
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', `${index + 1}枚目の写真を拡大`);
      const img = document.createElement('img');
      img.src = photo.url;
      img.alt = photo.caption || `${title}の写真 ${index + 1}`;
      img.loading = index < 4 ? 'eager' : 'lazy';
      img.decoding = 'async';
      button.appendChild(img);
      button.addEventListener('click', () => open(index));
      figure.appendChild(button);
      const caption = document.createElement('figcaption');
      if (photo.takenOn) {
        const time = document.createElement('time');
        time.dateTime = photo.takenOn;
        time.textContent = fmtDate(photo.takenOn);
        caption.appendChild(time);
      }
      if (photo.caption) {
        const p = document.createElement('p');
        p.textContent = photo.caption;
        caption.appendChild(p);
      }
      figure.appendChild(caption);
      grid.appendChild(figure);
    });
  }

  function showCurrent() {
    const photo = photos[current];
    if (!photo) return;
    lightboxImage.src = photo.url;
    lightboxImage.alt = photo.caption || `${title}の写真 ${current + 1}`;
    lightboxCaption.textContent = [fmtDate(photo.takenOn), photo.caption].filter(Boolean).join('｜');
    lightboxCounter.textContent = `${current + 1} / ${photos.length}`;
  }
  function open(index) {
    current = index;
    showCurrent();
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }
  function close() {
    lightbox.hidden = true;
    document.body.style.overflow = '';
    lightboxImage.removeAttribute('src');
  }
  function move(step) {
    if (!photos.length) return;
    current = (current + step + photos.length) % photos.length;
    showCurrent();
  }
  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', () => move(-1));
  nextBtn.addEventListener('click', () => move(1));
  lightbox.addEventListener('click', (event) => { if (event.target === lightbox) close(); });
  document.addEventListener('keydown', (event) => {
    if (lightbox.hidden) return;
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowLeft') move(-1);
    if (event.key === 'ArrowRight') move(1);
  });
  lightbox.addEventListener('pointerdown', (event) => { pointerStart = event.clientX; });
  lightbox.addEventListener('pointerup', (event) => {
    if (pointerStart === null) return;
    const delta = event.clientX - pointerStart;
    pointerStart = null;
    if (Math.abs(delta) > 55) move(delta > 0 ? -1 : 1);
  });

  if (!configured) {
    state.textContent = '写真公開システムの接続準備中です。';
    total.textContent = '準備中';
    return;
  }

  fetch(`${apiBase}/api/photos?category=${encodeURIComponent(category)}`, { headers: { Accept: 'application/json' } })
    .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
    .then((payload) => { photos = Array.isArray(payload.photos) ? payload.photos : []; render(); })
    .catch(() => {
      state.hidden = false;
      state.className = 'gallery-error';
      state.textContent = '写真の読み込みに失敗しました。少し時間をおいて再読み込みしてください。';
      total.textContent = '読み込みエラー';
    });
})();
