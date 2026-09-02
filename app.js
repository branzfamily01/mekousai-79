(() => {
  const root = document.getElementById('bgm-player');
  if (!root) return;

  const audio = root.querySelector('audio');
  const panel = root.querySelector('.cassette-player');
  const toggle = root.querySelector('.bgm-toggle');
  const toggleLabel = root.querySelector('.bgm-toggle-label');
  const playingDot = root.querySelector('.bgm-playing-dot');
  const playButton = root.querySelector('.cassette-play');
  const playIcon = playButton.querySelector('span');
  const playText = playButton.querySelector('b');
  const closeButton = root.querySelector('.cassette-close');
  const volumeInput = root.querySelector('.volume-control input');
  const volumeOutput = root.querySelector('.volume-control output');
  const statusText = root.querySelector('.cassette-status-text');
  const statusLed = root.querySelector('.status-led');
  const reels = [...root.querySelectorAll('.cassette-reel')];

  const STORAGE_KEY = 'mekousai-bgm-state-v1';
  const DEFAULT_VOLUME = 0.22;
  const FADE_MS = 1600;
  let fadeFrame = null;
  let playing = false;
  let panelOpen = false;
  let desiredPlaying = false;
  let targetVolume = DEFAULT_VOLUME;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const isMobileLike = () => window.matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  function readState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        volume: clamp(Number.isFinite(parsed.volume) ? parsed.volume : DEFAULT_VOLUME, 0, 1),
        currentTime: Math.max(0, Number.isFinite(parsed.currentTime) ? parsed.currentTime : 0),
        shouldPlay: Boolean(parsed.shouldPlay),
        panelOpen: Boolean(parsed.panelOpen),
      };
    } catch {
      return { volume: DEFAULT_VOLUME, currentTime: 0, shouldPlay: false, panelOpen: false };
    }
  }

  function saveState(patch = {}) {
    const state = {
      volume: targetVolume,
      currentTime: audio.currentTime || 0,
      shouldPlay: desiredPlaying,
      panelOpen,
      ...patch,
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }

  function setPanel(open) {
    panelOpen = open;
    panel.hidden = !open;
    root.dataset.open = open ? 'true' : 'false';
    toggle.setAttribute('aria-expanded', String(open));
    toggleLabel.textContent = open ? 'BGMを閉じる' : 'BGMを聴く';
    saveState({ panelOpen: open });
  }

  function renderPlaybackState(nextPlaying, message) {
    playing = nextPlaying;
    playButton.setAttribute('aria-label', nextPlaying ? 'BGMを停止' : 'BGMを再生');
    playIcon.textContent = nextPlaying ? 'Ⅱ' : '▶';
    playText.textContent = nextPlaying ? 'STOP' : 'PLAY';
    statusText.textContent = message || (nextPlaying ? '再生中' : '停止中');
    statusLed.classList.toggle('is-on', nextPlaying);
    playingDot.hidden = !nextPlaying;
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
    desiredPlaying = true;
    try {
      await audio.play();
      fadeIn();
      renderPlaybackState(true, '再生中');
      saveState({ shouldPlay: true });
    } catch {
      desiredPlaying = false;
      renderPlaybackState(false, 'タップして再生');
      saveState({ shouldPlay: false });
    }
  }

  function pause() {
    cancelFade();
    audio.pause();
    desiredPlaying = false;
    renderPlaybackState(false, '停止中');
    saveState({ shouldPlay: false, currentTime: audio.currentTime || 0 });
  }

  toggle.addEventListener('click', () => setPanel(!panelOpen));
  closeButton.addEventListener('click', () => setPanel(false));
  playButton.addEventListener('click', () => playing ? pause() : void play());

  volumeInput.addEventListener('input', () => {
    targetVolume = clamp(Number(volumeInput.value), 0, 1);
    volumeOutput.textContent = `${Math.round(targetVolume * 100)}%`;
    if (playing && fadeFrame === null) audio.volume = targetVolume;
    saveState({ volume: targetVolume });
  });

  const saved = readState();
  targetVolume = saved.volume;
  volumeInput.value = String(targetVolume);
  volumeOutput.textContent = `${Math.round(targetVolume * 100)}%`;
  audio.volume = targetVolume;
  desiredPlaying = saved.shouldPlay;
  setPanel(saved.panelOpen);

  const restore = () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = saved.currentTime % audio.duration;
    }

    // Mobile always opens in a stopped state. Desktop tries to restore playback;
    // if the browser blocks autoplay, the saved position is kept for one-tap resume.
    if (saved.shouldPlay && !isMobileLike()) {
      audio.play().then(() => {
        desiredPlaying = true;
        fadeIn();
        renderPlaybackState(true, '再生中');
      }).catch(() => {
        desiredPlaying = false;
        renderPlaybackState(false, saved.currentTime > 0 ? '続きから再生できます' : '停止中');
        saveState({ shouldPlay: false });
      });
    } else {
      desiredPlaying = false;
      renderPlaybackState(false, saved.currentTime > 0 ? '続きから再生できます' : '停止中');
      if (isMobileLike()) saveState({ shouldPlay: false });
    }
  };

  if (audio.readyState >= 1) restore();
  else audio.addEventListener('loadedmetadata', restore, { once: true });

  const persist = () => saveState({ currentTime: audio.currentTime || 0 });
  window.addEventListener('pagehide', persist);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') persist();
  });
})();
