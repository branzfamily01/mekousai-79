window.MEKOUSAI_CONFIG = Object.freeze({
  // Cloudflare Workers Static Assets では公開サイトと写真APIを同一Originで配信する。
  // Netlify/GitHub Pages時代の固定workers.dev URLは不要。
  apiBase: window.location.origin
});

(() => {
  const VERSION = '20260904-home-2';
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
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  };

  // iPhone/Safariの旧キャッシュを避け、今回の修正版を確実に読む。
  load(`site-corrections.js?v=${VERSION}`);
  load(`site-remove-chorus.js?v=${VERSION}`);
  load(`bgm-continuity.js?v=${VERSION}`);
  load(`bgm-player-v2.js?v=${VERSION}`);
})();
