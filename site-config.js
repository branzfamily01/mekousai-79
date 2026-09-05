window.MEKOUSAI_CONFIG = Object.freeze({
  // Cloudflare Workers Static Assets では公開サイトと写真APIを同一Originで配信する。
  // Netlify/GitHub Pages時代の固定workers.dev URLは不要。
  apiBase: window.location.origin
});

(() => {
  const VERSION = '20260903-bgm-programs-3';
  const PHOTO_VERSION = '20260905-ops8';
  const load = (src) => {
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    document.head.appendChild(script);
  };
  const loadCss = (href) => {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel='stylesheet';
    link.href=href;
    document.head.appendChild(link);
  };
  loadCss(`styles-07.css?v=${VERSION}`);
  loadCss(`gallery-ops.css?v=${PHOTO_VERSION}`);
  loadCss(`photo-simple.css?v=${PHOTO_VERSION}`);
  load(`site-corrections.js?v=${VERSION}`);
  load('site-remove-chorus.js');
  load(`bgm-continuity.js?v=${VERSION}`);
  load(`bgm-player-v2.js?v=${VERSION}`);
})();
