(() => {
  const STATE_KEY = 'mekousai-bgm-session-v6';
  const NAV_KEY = 'mekousai-bgm-internal-nav';

  const readState = () => {
    try { return JSON.parse(sessionStorage.getItem(STATE_KEY) || '{}'); }
    catch { return {}; }
  };

  const markInternalNavigation = () => {
    const state = readState();
    if (!state.playing) return;
    try { sessionStorage.setItem(NAV_KEY, '1'); } catch {}
  };

  // app.js には location.href で移動する写真カードがあるため、
  // 通常の <a> だけでなく、そのクリックもサイト内遷移として記録する。
  document.addEventListener('pointerdown', event => {
    const anchor = event.target.closest?.('a[href]');
    if (anchor) {
      let url;
      try { url = new URL(anchor.href, location.href); } catch { return; }
      if (url.origin === location.origin) markInternalNavigation();
      else {
        try { sessionStorage.removeItem(NAV_KEY); } catch {}
      }
      return;
    }

    if (event.target.closest?.('.photo-entry,.future-chapters article,.photo-gallery-link')) {
      markInternalNavigation();
    }
  }, true);

  // 戻る/進む・同一サイト内のページ再読込でも、再生中だった状態を引き継ぐ。
  const state = readState();
  if (state.playing) {
    try { sessionStorage.setItem(NAV_KEY, '1'); } catch {}
  }
})();
