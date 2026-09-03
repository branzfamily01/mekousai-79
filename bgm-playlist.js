(() => {
  const boot = () => {
    if (window.__MEKOUSAI_BGM_BOOTED__) return;
    window.__MEKOUSAI_BGM_BOOTED__ = true;

    const tracks = [
      { title: 'Summer Sketchbook', src: 'Summer Sketchbook.mp3' },
      { title: 'Festival Rush', src: 'Festival Rush(1).mp3' },
      { title: 'After the Lights', src: 'After the Lights(1).mp3' },
      { title: 'One Brilliant Moment', src: 'One Brilliant Moment(1).mp3' },
      { title: 'First Spark', src: 'First Spark(1).mp3' },
      { title: 'After School Glow', src: 'After School Glow(1).mp3' }
    ];

    const STATE_KEY = 'mekousai-bgm-session-v4';
    const INTERNAL_NAV_KEY = 'mekousai-bgm-internal-nav';
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

    const style = document.createElement('style');
    style.textContent = `
      #bgm-player.mekousai-bgm-shared{position:fixed;right:14px;bottom:14px;z-index:9999;font-family:system-ui,-apple-system,"Hiragino Sans","Yu Gothic",sans-serif;color:#171717}
      #bgm-player.mekousai-bgm-shared *{box-sizing:border-box}
      #bgm-player .mekousai-bgm-panel{width:min(330px,calc(100vw - 28px));margin:0 0 8px auto;background:#fff9e8;border:2px solid #171717;border-radius:18px;box-shadow:7px 7px 0 #171717;padding:14px}
      #bgm-player .mekousai-bgm-title{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}
      #bgm-player .mekousai-bgm-title span{font-size:10px;font-weight:800;letter-spacing:.14em}
      #bgm-player .mekousai-bgm-title strong{display:block;font-size:17px;line-height:1.2;margin-top:3px}
      #bgm-player .mekousai-bgm-title small{display:block;margin-top:4px;color:#666;font-size:11px}
      #bgm-player .mekousai-bgm-close{border:0;background:transparent;font-size:24px;line-height:1;cursor:pointer;padding:0 2px}
      #bgm-player .mekousai-bgm-controls{display:grid;grid-template-columns:42px 1fr 42px;gap:7px;align-items:center}
      #bgm-player .mekousai-bgm-controls button{height:40px;border:2px solid #171717;border-radius:11px;background:#fff;cursor:pointer;font-weight:900}
      #bgm-player .mekousai-bgm-controls .mekousai-bgm-play{background:#ffd84f;font-size:16px}
      #bgm-player .mekousai-bgm-status{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:10px;font-size:11px;font-weight:700}
      #bgm-player .mekousai-bgm-volume{display:flex;align-items:center;gap:7px;margin-top:10px;font-size:10px;font-weight:800}
      #bgm-player .mekousai-bgm-volume input{width:100%}
      #bgm-player .mekousai-bgm-toggle{display:flex;align-items:center;gap:8px;margin-left:auto;border:2px solid #171717;border-radius:999px;background:#171717;color:#fff;padding:10px 14px;font-weight:800;box-shadow:4px 4px 0 #ffd84f;cursor:pointer}
      #bgm-player .mekousai-bgm-dot{width:8px;height:8px;border-radius:50%;background:#ff4d61;box-shadow:0 0 0 3px rgba(255,77,97,.18)}
      #bgm-player[data-playing="false"] .mekousai-bgm-dot{display:none}
      @media (max-width:600px){#bgm-player.mekousai-bgm-shared{right:10px;bottom:10px}#bgm-player .mekousai-bgm-panel{width:min(310px,calc(100vw - 20px))}}
    `;
    document.head.appendChild(style);

    let root = document.getElementById('bgm-player');
    if (!root) {
      root = document.createElement('div');
      root.id = 'bgm-player';
      document.body.appendChild(root);
    }
    root.className = 'mekousai-bgm-shared';
    root.innerHTML = `
      <audio preload="metadata"></audio>
      <section class="mekousai-bgm-panel" hidden aria-label="BGMプレイヤー">
        <div class="mekousai-bgm-title">
          <div><span>BGM • 6 TRACKS</span><strong class="mekousai-bgm-track">Summer Sketchbook</strong><small class="mekousai-bgm-track-no">1 / 6</small></div>
          <button class="mekousai-bgm-close" type="button" aria-label="BGMプレイヤーを閉じる">×</button>
        </div>
        <div class="mekousai-bgm-controls">
          <button class="mekousai-bgm-prev" type="button" aria-label="前の曲">‹</button>
          <button class="mekousai-bgm-play" type="button" aria-label="BGMを再生">▶ PLAY</button>
          <button class="mekousai-bgm-next" type="button" aria-label="次の曲">›</button>
        </div>
        <label class="mekousai-bgm-volume"><span>VOL</span><input aria-label="BGMの音量" type="range" min="0" max="1" step="0.01"><output></output></label>
        <div class="mekousai-bgm-status"><span class="mekousai-bgm-message">停止中</span><span>サイト内では再生状態を引き継ぎます</span></div>
      </section>
      <button class="mekousai-bgm-toggle" type="button" aria-expanded="false"><span class="mekousai-bgm-dot" aria-hidden="true"></span><span class="mekousai-bgm-toggle-label">BGMを聴く</span></button>
    `;

    const audio = root.querySelector('audio');
    const panel = root.querySelector('.mekousai-bgm-panel');
    const toggle = root.querySelector('.mekousai-bgm-toggle');
    const toggleLabel = root.querySelector('.mekousai-bgm-toggle-label');
    const close = root.querySelector('.mekousai-bgm-close');
    const play = root.querySelector('.mekousai-bgm-play');
    const prev = root.querySelector('.mekousai-bgm-prev');
    const next = root.querySelector('.mekousai-bgm-next');
    const trackTitle = root.querySelector('.mekousai-bgm-track');
    const trackNo = root.querySelector('.mekousai-bgm-track-no');
    const message = root.querySelector('.mekousai-bgm-message');
    const range = root.querySelector('.mekousai-bgm-volume input');
    const output = root.querySelector('.mekousai-bgm-volume output');

    const defaults = { index: 0, time: 0, volume: 0.22, playing: false, panelOpen: false };
    let state = { ...defaults };
    try {
      state = { ...defaults, ...JSON.parse(sessionStorage.getItem(STATE_KEY) || '{}') };
    } catch {}
    state.index = clamp(Number(state.index) || 0, 0, tracks.length - 1);
    state.time = Math.max(0, Number(state.time) || 0);
    state.volume = clamp(Number(state.volume) || defaults.volume, 0, 1);
    state.playing = Boolean(state.playing);
    state.panelOpen = Boolean(state.panelOpen);

    const resumeFromInternalPage = sessionStorage.getItem(INTERNAL_NAV_KEY) === '1';
    sessionStorage.removeItem(INTERNAL_NAV_KEY);
    if (!resumeFromInternalPage) state.playing = false;

    const persist = () => {
      try { sessionStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch {}
    };

    const render = () => {
      const t = tracks[state.index];
      trackTitle.textContent = t.title;
      trackNo.textContent = `${state.index + 1} / ${tracks.length}`;
      range.value = String(state.volume);
      output.textContent = `${Math.round(state.volume * 100)}%`;
      panel.hidden = !state.panelOpen;
      toggle.setAttribute('aria-expanded', String(state.panelOpen));
      toggleLabel.textContent = state.panelOpen ? 'BGMを閉じる' : 'BGMを聴く';
      play.textContent = state.playing ? 'Ⅱ STOP' : '▶ PLAY';
      play.setAttribute('aria-label', state.playing ? 'BGMを停止' : 'BGMを再生');
      root.dataset.playing = state.playing ? 'true' : 'false';
    };

    const setMessage = text => { message.textContent = text; };

    const loadTrack = (index, time = 0) => {
      state.index = (index + tracks.length) % tracks.length;
      state.time = Math.max(0, Number(time) || 0);
      audio.src = tracks[state.index].src;
      audio.volume = state.volume;
      audio.load();
      render();
      persist();
    };

    const tryPlay = async (fromResume = false) => {
      try {
        await audio.play();
        state.playing = true;
        setMessage(fromResume ? '再生を引き継ぎました' : '再生中');
      } catch {
        state.playing = false;
        setMessage(fromResume ? 'タップして再開してください' : 'タップして再生してください');
      }
      render();
      persist();
    };

    const stop = () => {
      audio.pause();
      state.playing = false;
      state.time = Number.isFinite(audio.currentTime) ? audio.currentTime : state.time;
      setMessage('停止中');
      render();
      persist();
    };

    const move = direction => {
      const shouldPlay = state.playing;
      loadTrack(state.index + direction, 0);
      if (shouldPlay) tryPlay(false);
    };

    audio.addEventListener('loadedmetadata', () => {
      if (state.time > 0 && Number.isFinite(audio.duration)) {
        try { audio.currentTime = Math.min(state.time, Math.max(0, audio.duration - 0.25)); } catch {}
      }
      if (resumeFromInternalPage && state.playing) tryPlay(true);
    }, { once: true });

    let saveTimer = 0;
    audio.addEventListener('timeupdate', () => {
      const now = performance.now();
      if (now - saveTimer < 700) return;
      saveTimer = now;
      state.time = Number.isFinite(audio.currentTime) ? audio.currentTime : state.time;
      state.playing = !audio.paused;
      persist();
    });

    audio.addEventListener('play', () => {
      state.playing = true;
      setMessage('再生中');
      render();
      persist();
    });
    audio.addEventListener('pause', () => {
      if (!audio.ended) {
        state.time = Number.isFinite(audio.currentTime) ? audio.currentTime : state.time;
        render();
        persist();
      }
    });
    audio.addEventListener('ended', () => {
      state.time = 0;
      state.playing = true;
      loadTrack(state.index + 1, 0);
      tryPlay(false);
    });

    let errors = 0;
    audio.addEventListener('loadeddata', () => { errors = 0; });
    audio.addEventListener('error', () => {
      errors += 1;
      if (errors >= tracks.length) {
        state.playing = false;
        setMessage('BGMファイルを確認してください');
        render();
        persist();
        return;
      }
      const shouldPlay = state.playing;
      loadTrack(state.index + 1, 0);
      if (shouldPlay) tryPlay(false);
    });

    toggle.addEventListener('click', () => {
      state.panelOpen = !state.panelOpen;
      render();
      persist();
    });
    close.addEventListener('click', () => {
      state.panelOpen = false;
      render();
      persist();
    });
    play.addEventListener('click', () => {
      if (audio.paused) tryPlay(false); else stop();
    });
    prev.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    range.addEventListener('input', () => {
      state.volume = clamp(Number(range.value), 0, 1);
      audio.volume = state.volume;
      render();
      persist();
    });

    document.addEventListener('click', event => {
      const a = event.target.closest?.('a[href]');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const raw = a.getAttribute('href') || '';
      if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) return;
      let url;
      try { url = new URL(a.href, location.href); } catch { return; }

      if (url.origin === location.origin) {
        const sameDocument = url.pathname === location.pathname && url.search === location.search;
        if (sameDocument) return;
        state.time = Number.isFinite(audio.currentTime) ? audio.currentTime : state.time;
        state.playing = !audio.paused;
        persist();
        try { sessionStorage.setItem(INTERNAL_NAV_KEY, '1'); } catch {}
      } else {
        state.playing = false;
        persist();
        try { sessionStorage.removeItem(INTERNAL_NAV_KEY); } catch {}
        audio.pause();
      }
    }, true);

    window.addEventListener('pagehide', () => {
      const internal = sessionStorage.getItem(INTERNAL_NAV_KEY) === '1';
      state.time = Number.isFinite(audio.currentTime) ? audio.currentTime : state.time;
      state.playing = internal ? !audio.paused : false;
      persist();
      audio.pause();
    });

    loadTrack(state.index, state.time);
    state.panelOpen = state.panelOpen;
    render();
  };

  if (document.readyState === 'complete') setTimeout(boot, 0);
  else window.addEventListener('load', () => setTimeout(boot, 0), { once: true });
})();
