(() => {
  if (!document.querySelector('link[href="styles-04.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'styles-04.css';
    document.head.appendChild(link);
  }
})();

(() => {
  const root = document.getElementById('bgm-player');
  if (!root) return;

  const audio = root.querySelector('audio');
  const panel = root.querySelector('.cassette-player');
  const toggle = root.querySelector('.bgm-toggle');
  const toggleLabel = root.querySelector('.bgm-toggle-label');
  const playingDot = root.querySelector('.bgm-playing-dot');
  const playButton = root.querySelector('.cassette-play');
  const playIcon = playButton?.querySelector('span');
  const playText = playButton?.querySelector('b');
  const closeButton = root.querySelector('.cassette-close');
  const volumeInput = root.querySelector('.volume-control input');
  const volumeOutput = root.querySelector('.volume-control output');
  const statusText = root.querySelector('.cassette-status-text');
  const statusLed = root.querySelector('.status-led');
  const reels = [...root.querySelectorAll('.cassette-reel')];

  const STORAGE_KEY = 'mekousai-bgm-preferences-v2';
  const DEFAULT_VOLUME = 0.22;
  const FADE_MS = 1600;
  let fadeFrame = null;
  let playing = false;
  let panelOpen = false;
  let targetVolume = DEFAULT_VOLUME;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function readPreferences() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        volume: clamp(Number.isFinite(parsed.volume) ? parsed.volume : DEFAULT_VOLUME, 0, 1),
        panelOpen: Boolean(parsed.panelOpen),
      };
    } catch {
      return { volume: DEFAULT_VOLUME, panelOpen: false };
    }
  }

  function savePreferences() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ volume: targetVolume, panelOpen }));
    } catch {}
  }

  function setPanel(open) {
    panelOpen = open;
    if (panel) panel.hidden = !open;
    root.dataset.open = open ? 'true' : 'false';
    toggle?.setAttribute('aria-expanded', String(open));
    if (toggleLabel) toggleLabel.textContent = open ? 'BGMを閉じる' : 'BGMを聴く';
    savePreferences();
  }

  function renderPlaybackState(nextPlaying, message) {
    playing = nextPlaying;
    if (playButton) playButton.setAttribute('aria-label', nextPlaying ? 'BGMを停止' : 'BGMを再生');
    if (playIcon) playIcon.textContent = nextPlaying ? 'Ⅱ' : '▶';
    if (playText) playText.textContent = nextPlaying ? 'STOP' : 'PLAY';
    if (statusText) statusText.textContent = message || (nextPlaying ? '再生中' : '停止中');
    statusLed?.classList.toggle('is-on', nextPlaying);
    if (playingDot) playingDot.hidden = !nextPlaying;
    reels.forEach((reel) => reel.classList.toggle('is-spinning', nextPlaying));
  }

  function cancelFade() {
    if (fadeFrame !== null) cancelAnimationFrame(fadeFrame);
    fadeFrame = null;
  }

  function fadeIn() {
    cancelFade();
    const target = clamp(targetVolume, 0, 1);
    const start = Math.min(target, 0.045);
    const started = performance.now();
    audio.volume = start;

    const tick = (now) => {
      const progress = clamp((now - started) / FADE_MS, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      audio.volume = start + (target - start) * eased;
      if (progress < 1 && !audio.paused) fadeFrame = requestAnimationFrame(tick);
      else fadeFrame = null;
    };
    fadeFrame = requestAnimationFrame(tick);
  }

  async function play() {
    try {
      audio.currentTime = 0;
      await audio.play();
      fadeIn();
      renderPlaybackState(true, '再生中');
    } catch {
      renderPlaybackState(false, 'タップして再生');
    }
  }

  function stop(message = '停止中') {
    cancelFade();
    audio.pause();
    try { audio.currentTime = 0; } catch {}
    renderPlaybackState(false, message);
  }

  // BGMは「そのページを見ている間だけ」。
  // タブ切替・別ページへの移動・ブラウザを閉じた時点で自動停止し、次ページで自動再開しない。
  function stopForLeave() {
    if (!audio.paused || playing) stop('停止中');
  }

  toggle?.addEventListener('click', () => setPanel(!panelOpen));
  closeButton?.addEventListener('click', () => setPanel(false));
  playButton?.addEventListener('click', () => playing ? stop() : void play());

  volumeInput?.addEventListener('input', () => {
    targetVolume = clamp(Number(volumeInput.value), 0, 1);
    if (volumeOutput) volumeOutput.textContent = `${Math.round(targetVolume * 100)}%`;
    if (playing && fadeFrame === null) audio.volume = targetVolume;
    savePreferences();
  });

  const saved = readPreferences();
  targetVolume = saved.volume;
  if (volumeInput) volumeInput.value = String(targetVolume);
  if (volumeOutput) volumeOutput.textContent = `${Math.round(targetVolume * 100)}%`;
  audio.volume = targetVolume;
  setPanel(saved.panelOpen);
  renderPlaybackState(false, '停止中');

  window.addEventListener('pagehide', stopForLeave);
  window.addEventListener('beforeunload', stopForLeave);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') stopForLeave();
  });
})();

// Photo journal links + live Cloudflare gallery summary.
(() => {
  const cardMap = new Map([
    ['準備風景', 'preparation'],
    ['制作の手元', 'creation'],
    ['放課後', 'after-school'],
    ['リハーサル', 'rehearsal'],
    ['開催直前', 'final-prep'],
    ['文化祭当日', 'festival-day'],
    ['表彰・振り返り', 'awards'],
  ]);

  if (!document.querySelector('link[href="gallery-system.css"]')) {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = 'gallery-system.css';
    document.head.appendChild(style);
  }

  const targets = [];
  document.querySelectorAll('.photo-entry, .future-chapters article').forEach((node) => {
    const title = node.querySelector('h3')?.textContent.trim();
    const category = cardMap.get(title);
    if (!category) return;
    node.classList.add('photo-gallery-link');
    node.dataset.galleryCategory = category;
    node.setAttribute('role', 'link');
    node.tabIndex = 0;
    const go = () => { location.href = `gallery.html?category=${encodeURIComponent(category)}`; };
    node.addEventListener('click', (event) => {
      if (!event.target.closest('a,button,input,select,textarea')) go();
    });
    node.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        go();
      }
    });
    if (node.classList.contains('photo-entry')) {
      const caption = node.querySelector('.photo-caption');
      if (caption && !caption.querySelector('.gallery-open-label')) {
        const label = document.createElement('span');
        label.className = 'gallery-open-label';
        label.innerHTML = '写真を見る <b aria-hidden="true">↗</b>';
        caption.appendChild(label);
      }
    }
    targets.push(node);
  });

  if (!targets.length) return;

  const hydrate = () => {
    const cfg = window.MEKOUSAI_CONFIG || {};
    const apiBase = String(cfg.apiBase || '').replace(/\/$/, '');
    if (!apiBase || apiBase.includes('REPLACE-WITH-WORKER')) return;
    fetch(`${apiBase}/api/categories`, { headers: { Accept: 'application/json' } })
      .then((res) => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)))
      .then((payload) => {
        const summaries = new Map((payload.categories || []).map((item) => [item.category, item]));
        targets.forEach((target) => {
          const item = summaries.get(target.dataset.galleryCategory);
          if (!item || !item.count) return;
          target.classList.add('has-gallery-items');
          const existing = target.querySelector('.gallery-count');
          if (existing) existing.textContent = `${item.count} PHOTOS`;
          else {
            const count = document.createElement('small');
            count.className = 'gallery-count';
            count.textContent = `${item.count} PHOTOS`;
            (target.querySelector('.empty-photo') || target).appendChild(count);
          }
          const cover = target.querySelector('.empty-photo');
          if (cover && item.coverUrl) {
            cover.classList.add('gallery-cover', 'has-cover-image');
            cover.textContent = '';
            const img = document.createElement('img');
            img.src = item.coverUrl;
            img.alt = '';
            img.loading = 'lazy';
            const badge = document.createElement('small');
            badge.className = 'gallery-count';
            badge.textContent = `${item.count} PHOTOS`;
            cover.append(img, badge);
          }
        });
      })
      .catch(() => {});
  };

  if (window.MEKOUSAI_CONFIG) hydrate();
  else {
    const script = document.createElement('script');
    script.src = 'site-config.js';
    script.onload = hydrate;
    script.onerror = () => {};
    document.head.appendChild(script);
  }
})();

// Current public visitor information (confirmed 2026-09-03).
(() => {
  const hero = document.querySelector('.hero');
  const photoJournal = document.getElementById('photo-journal');
  if (hero && photoJournal && !document.querySelector('.registration-closed')) {
    const section = document.createElement('section');
    section.className = 'registration-closed';
    section.setAttribute('aria-labelledby', 'registration-status-title');
    section.innerHTML = `<div class="registration-closed-inner">
      <span class="registration-stamp">APPLICATION CLOSED</span>
      <div><h2 id="registration-status-title">来場申込受付は終了しました。</h2>
      <p><strong>一般来場枠は定員に達しています。</strong> ご来場予定の方は、学校からの案内をご確認ください。</p></div>
      <a href="https://www.metro.ed.jp/meguro-h/news/2026/08/79_1.html" target="_blank" rel="noreferrer">学校公式の目高祭案内 <span>↗</span></a>
    </div>`;
    hero.after(section);
  }

  const map = document.getElementById('map');
  if (map) {
    map.innerHTML = `<div class="section-kicker"><span>VISITOR GUIDE</span> 会場案内</div>
      <div class="map-grid"><div>
        <h2>校内マップは、<br>ご来場の方へ当日ご案内します。</h2>
        <p class="map-lead">安全管理のため、教室配置などの詳細な校内マップはWeb上では公開しません。ご来場後の案内に従って、目高祭をお楽しみください。</p>
        <a class="button button-primary" href="#access">学校へのアクセスを見る <span>↘</span></a>
      </div>
      <div class="floor-board safe-map-board" aria-label="校内マップは来場者へ当日案内">
        <div class="floor-title"><span>FOR VISITORS</span><strong>校内マップ</strong></div>
        <div class="safe-map-icon" aria-hidden="true">⌂</div>
        <p class="safe-map-message">詳細な校内配置は<br><strong>Web非公開</strong></p>
        <small>当日、ご来場の方へご案内します。</small><span class="map-tape" aria-hidden="true"></span>
      </div></div>`;
  }

  const notices = document.getElementById('notices');
  if (notices) {
    notices.innerHTML = `<div class="section-heading-row compact"><div>
      <div class="section-kicker"><span>NOTICE</span> ご来場の皆さまへ</div><h2>現在のご案内</h2>
      </div><span class="notice-mark" aria-hidden="true">!</span></div>
      <ol class="notice-list">
        <li><span>01</span><p><strong>来場申込受付は終了しました。</strong> 一般来場枠も定員に達しています。</p></li>
        <li><span>02</span><p>ご来場予定の方は、学校からの最新案内をご確認ください。</p></li>
        <li><span>03</span><p>タイムスケジュール・企画詳細は、文化祭の栞を確認後、この特設サイトへ順次反映します。</p></li>
        <li><span>04</span><p>安全管理のため、詳細な校内マップはWeb上では公開せず、当日ご来場の方へご案内します。</p></li>
      </ol>
      <a class="official-notice-link" href="https://www.metro.ed.jp/meguro-h/news/2026/08/79_1.html" target="_blank" rel="noreferrer">学校公式の目高祭案内を見る <span>↗</span></a>`;

    if (!document.getElementById('official-links')) {
      const official = document.createElement('section');
      official.className = 'official-links section';
      official.id = 'official-links';
      official.innerHTML = `<div class="section-heading-row compact"><div>
        <div class="section-kicker"><span>OFFICIAL LINKS</span> 公式情報</div><h2>学校公式アカウント</h2>
        </div><p class="official-links-intro">最新の学校情報は、公式SNS・公式ホームページでもご確認いただけます。</p></div>
        <div class="official-link-grid">
          <a class="official-link-card official-instagram" href="https://www.instagram.com/tokyo.metropolitan.meguro.high/" target="_blank" rel="noreferrer"><span>Instagram</span><strong>@tokyo.metropolitan.meguro.high</strong><small>学校公式Instagram ↗</small></a>
          <a class="official-link-card official-x" href="https://x.com/meguro_hs" target="_blank" rel="noreferrer"><span>X</span><strong>@meguro_hs</strong><small>学校公式X ↗</small></a>
          <a class="official-link-card official-web" href="https://www.metro.ed.jp/meguro-h/" target="_blank" rel="noreferrer"><span>WEB</span><strong>東京都立目黒高等学校</strong><small>公式ホームページ ↗</small></a>
        </div>`;
      notices.after(official);
    }
  }
})();
