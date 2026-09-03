(() => {
  const TRACKS = [
    { title: 'Summer Sketchbook', src: 'Summer Sketchbook.mp3' },
    { title: 'Festival Rush', src: 'Festival Rush(1).mp3' },
    { title: 'After the Lights', src: 'After the Lights(1).mp3' },
    { title: 'One Brilliant Moment', src: 'One Brilliant Moment(1).mp3' },
    { title: 'First Spark', src: 'First Spark(1).mp3' },
    { title: 'After School Glow', src: 'After School Glow(1).mp3' }
  ];

  const STATE_KEY = 'mekousai-bgm-session-v5';
  const INTERNAL_NAV_KEY = 'mekousai-bgm-internal-nav';
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const boot = () => {
    if (window.__MEKOUSAI_BGM_V2_BOOTED__) return;
    window.__MEKOUSAI_BGM_V2_BOOTED__ = true;

    const style = document.createElement('style');
    style.textContent = `
      #bgm-player.mekousai-bgm-v2{position:fixed;right:14px;bottom:14px;z-index:9999;font-family:system-ui,-apple-system,"Hiragino Sans","Yu Gothic",sans-serif;color:#171717}
      #bgm-player.mekousai-bgm-v2 *{box-sizing:border-box}
      #bgm-player .bgm-v2-panel{width:min(330px,calc(100vw - 28px));margin:0 0 8px auto;background:#fff9e8;border:2px solid #171717;border-radius:18px;box-shadow:7px 7px 0 #171717;padding:14px}
      #bgm-player .bgm-v2-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:10px}
      #bgm-player .bgm-v2-kicker{font-size:10px;font-weight:900;letter-spacing:.14em}
      #bgm-player .bgm-v2-title{display:block;font-size:17px;line-height:1.2;margin-top:3px}
      #bgm-player .bgm-v2-trackno{display:block;margin-top:4px;color:#666;font-size:11px}
      #bgm-player .bgm-v2-close{border:0;background:transparent;font-size:24px;line-height:1;cursor:pointer}
      #bgm-player .bgm-v2-controls{display:grid;grid-template-columns:46px 1fr 46px;gap:8px;align-items:center}
      #bgm-player .bgm-v2-controls button{height:42px;border:2px solid #171717;border-radius:11px;background:#fff;cursor:pointer;font-weight:900;font-size:18px}
      #bgm-player .bgm-v2-controls .bgm-v2-play{background:#ffd84f;font-size:14px}
      #bgm-player .bgm-v2-volume{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:10px;font-weight:900}
      #bgm-player .bgm-v2-volume input{width:100%}
      #bgm-player .bgm-v2-status{display:flex;justify-content:space-between;gap:10px;margin-top:9px;font-size:11px;font-weight:700}
      #bgm-player .bgm-v2-toggle{display:flex;align-items:center;gap:8px;margin-left:auto;border:2px solid #171717;border-radius:999px;background:#171717;color:#fff;padding:10px 14px;font-weight:800;box-shadow:4px 4px 0 #ffd84f;cursor:pointer}
      #bgm-player .bgm-v2-dot{width:8px;height:8px;border-radius:50%;background:#ff4d61}
      #bgm-player[data-playing="false"] .bgm-v2-dot{display:none}
      @media(max-width:600px){#bgm-player.mekousai-bgm-v2{right:10px;bottom:10px}#bgm-player .bgm-v2-panel{width:min(310px,calc(100vw - 20px))}}
    `;
    document.head.appendChild(style);

    let root = document.getElementById('bgm-player');
    if (!root) {
      root = document.createElement('div');
      root.id = 'bgm-player';
      document.body.appendChild(root);
    }

    root.className = 'mekousai-bgm-v2';
    root.innerHTML = `
      <audio preload="metadata"></audio>
      <section class="bgm-v2-panel" hidden aria-label="BGMプレイヤー">
        <div class="bgm-v2-head">
          <div><span class="bgm-v2-kicker">BGM • 6 TRACKS</span><strong class="bgm-v2-title"></strong><small class="bgm-v2-trackno"></small></div>
          <button class="bgm-v2-close" type="button" aria-label="閉じる">×</button>
        </div>
        <div class="bgm-v2-controls">
          <button class="bgm-v2-prev" type="button" aria-label="前の曲">←</button>
          <button class="bgm-v2-play" type="button" aria-label="再生">▶ PLAY</button>
          <button class="bgm-v2-next" type="button" aria-label="次の曲">→</button>
        </div>
        <label class="bgm-v2-volume"><span>VOL</span><input type="range" min="0" max="1" step="0.01"><output></output></label>
        <div class="bgm-v2-status"><span class="bgm-v2-message">停止中</span><span>← / → は1曲ずつ移動</span></div>
      </section>
      <button class="bgm-v2-toggle" type="button" aria-expanded="false"><span class="bgm-v2-dot" aria-hidden="true"></span><span class="bgm-v2-toggle-label">BGMを聴く</span></button>
    `;

    const audio = root.querySelector('audio');
    const panel = root.querySelector('.bgm-v2-panel');
    const toggle = root.querySelector('.bgm-v2-toggle');
    const toggleLabel = root.querySelector('.bgm-v2-toggle-label');
    const close = root.querySelector('.bgm-v2-close');
    const prev = root.querySelector('.bgm-v2-prev');
    const next = root.querySelector('.bgm-v2-next');
    const play = root.querySelector('.bgm-v2-play');
    const title = root.querySelector('.bgm-v2-title');
    const trackNo = root.querySelector('.bgm-v2-trackno');
    const message = root.querySelector('.bgm-v2-message');
    const range = root.querySelector('.bgm-v2-volume input');
    const output = root.querySelector('.bgm-v2-volume output');

    const defaults = { index: 0, time: 0, volume: 0.22, playing: false, panelOpen: false };
    let state = { ...defaults };
    try { state = { ...defaults, ...JSON.parse(sessionStorage.getItem(STATE_KEY) || '{}') }; } catch {}
    state.index = ((Number(state.index) || 0) % TRACKS.length + TRACKS.length) % TRACKS.length;
    state.time = Math.max(0, Number(state.time) || 0);
    state.volume = clamp(Number(state.volume) || defaults.volume, 0, 1);
    state.playing = Boolean(state.playing);
    state.panelOpen = Boolean(state.panelOpen);

    const resumeInternal = sessionStorage.getItem(INTERNAL_NAV_KEY) === '1';
    sessionStorage.removeItem(INTERNAL_NAV_KEY);
    if (!resumeInternal) state.playing = false;

    const save = () => {
      try { sessionStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch {}
    };

    const render = () => {
      title.textContent = TRACKS[state.index].title;
      trackNo.textContent = `${state.index + 1} / ${TRACKS.length}`;
      range.value = String(state.volume);
      output.textContent = `${Math.round(state.volume * 100)}%`;
      panel.hidden = !state.panelOpen;
      toggle.setAttribute('aria-expanded', String(state.panelOpen));
      toggleLabel.textContent = state.panelOpen ? 'BGMを閉じる' : 'BGMを聴く';
      play.textContent = state.playing ? 'Ⅱ STOP' : '▶ PLAY';
      root.dataset.playing = state.playing ? 'true' : 'false';
    };

    const setMessage = text => { message.textContent = text; };

    const loadTrack = (index, time = 0) => {
      state.index = ((index % TRACKS.length) + TRACKS.length) % TRACKS.length;
      state.time = Math.max(0, Number(time) || 0);
      audio.pause();
      audio.src = TRACKS[state.index].src;
      audio.volume = state.volume;
      audio.load();
      render();
      save();
    };

    const start = async (resume = false) => {
      try {
        await audio.play();
        state.playing = true;
        setMessage(resume ? '再生を引き継ぎました' : '再生中');
      } catch {
        state.playing = false;
        setMessage('再生できません。音源ファイルをご確認ください');
      }
      render();
      save();
    };

    const stop = () => {
      state.time = Number.isFinite(audio.currentTime) ? audio.currentTime : state.time;
      audio.pause();
      state.playing = false;
      setMessage('停止中');
      render();
      save();
    };

    const step = direction => {
      const keepPlaying = !audio.paused || state.playing;
      loadTrack(state.index + direction, 0);
      setMessage(`${state.index + 1} / ${TRACKS.length}`);
      if (keepPlaying) start(false);
    };

    audio.addEventListener('loadedmetadata', () => {
      if (state.time > 0 && Number.isFinite(audio.duration)) {
        try { audio.currentTime = Math.min(state.time, Math.max(0, audio.duration - 0.25)); } catch {}
      }
      if (resumeInternal && state.playing) start(true);
    }, { once: true });

    audio.addEventListener('timeupdate', () => {
      state.time = Number.isFinite(audio.currentTime) ? audio.currentTime : state.time;
      state.playing = !audio.paused;
      save();
    });

    audio.addEventListener('play', () => {
      state.playing = true;
      setMessage('再生中');
      render();
      save();
    });

    audio.addEventListener('pause', () => {
      if (!audio.ended) {
        state.time = Number.isFinite(audio.currentTime) ? audio.currentTime : state.time;
        save();
      }
    });

    audio.addEventListener('ended', () => {
      state.playing = true;
      loadTrack(state.index + 1, 0);
      start(false);
    });

    // 重要: 読み込みエラー時に勝手に次曲へ飛ばさない。
    // これにより右/左矢印は必ず「1クリック = 1曲移動」になる。
    audio.addEventListener('error', () => {
      state.playing = false;
      setMessage(`この曲の音源を読み込めません（${state.index + 1} / ${TRACKS.length}）`);
      render();
      save();
    });

    prev.addEventListener('click', () => step(-1));
    next.addEventListener('click', () => step(1));
    play.addEventListener('click', () => audio.paused ? start(false) : stop());
    toggle.addEventListener('click', () => { state.panelOpen = !state.panelOpen; render(); save(); });
    close.addEventListener('click', () => { state.panelOpen = false; render(); save(); });
    range.addEventListener('input', () => {
      state.volume = clamp(Number(range.value), 0, 1);
      audio.volume = state.volume;
      render();
      save();
    });

    document.addEventListener('click', event => {
      const a = event.target.closest?.('a[href]');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const raw = a.getAttribute('href') || '';
      if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) return;
      let url;
      try { url = new URL(a.href, location.href); } catch { return; }

      if (url.origin === location.origin) {
        if (url.pathname === location.pathname && url.search === location.search) return;
        state.time = Number.isFinite(audio.currentTime) ? audio.currentTime : state.time;
        state.playing = !audio.paused;
        save();
        try { sessionStorage.setItem(INTERNAL_NAV_KEY, '1'); } catch {}
      } else {
        state.playing = false;
        save();
        try { sessionStorage.removeItem(INTERNAL_NAV_KEY); } catch {}
        audio.pause();
      }
    }, true);

    window.addEventListener('pagehide', () => {
      const internal = sessionStorage.getItem(INTERNAL_NAV_KEY) === '1';
      state.time = Number.isFinite(audio.currentTime) ? audio.currentTime : state.time;
      state.playing = internal ? !audio.paused : false;
      save();
      audio.pause();
    });

    loadTrack(state.index, state.time);
    render();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
