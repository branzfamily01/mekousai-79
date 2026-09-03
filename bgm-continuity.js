(() => {
  const STATE_KEY = 'mekousai-bgm-session-v6';
  const NAV_KEY = 'mekousai-bgm-internal-nav';
  let externalLeaving = false;

  const readState = () => {
    try { return JSON.parse(sessionStorage.getItem(STATE_KEY) || '{}'); }
    catch { return {}; }
  };

  const markInternalNavigation = () => {
    const state = readState();
    if (!state.playing) return;
    try { sessionStorage.setItem(NAV_KEY, '1'); } catch {}
  };

  // 同一サイト内リンクは再生状態を引き継ぐ。外部リンクだけ明示的に終了扱いにする。
  document.addEventListener('pointerdown', event => {
    const anchor = event.target.closest?.('a[href]');
    if (!anchor) return;

    let url;
    try { url = new URL(anchor.href, location.href); } catch { return; }

    if (url.origin === location.origin) {
      externalLeaving = false;
      markInternalNavigation();
    } else {
      externalLeaving = true;
      try { sessionStorage.removeItem(NAV_KEY); } catch {}
    }
  }, true);

  // 写真カードなど app.js が location.href で遷移させるUIもサイト内遷移として扱う。
  document.addEventListener('click', event => {
    if (event.target.closest?.('.photo-entry,.future-chapters article,.photo-gallery-link')) {
      externalLeaving = false;
      markInternalNavigation();
    }
  }, true);

  // pagehide は通常リンク以外の location.href / history / 戻る・進むでも発生する。
  // サイト外リンクでない限り、再生中なら必ず「サイト内移動」として保存する。
  window.addEventListener('pagehide', () => {
    if (externalLeaving) return;
    markInternalNavigation();
  });

  // 前ページが再生中のまま遷移してきた場合、v2プレイヤー起動前に再開フラグを用意する。
  if (readState().playing) {
    try { sessionStorage.setItem(NAV_KEY, '1'); } catch {}
  }
})();
