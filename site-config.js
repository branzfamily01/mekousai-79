window.MEKOUSAI_CONFIG = Object.freeze({
  // Cloudflare Workers Static Assets では公開サイトと写真APIを同一Originで配信する。
  // Netlify/GitHub Pages時代の固定workers.dev URLは不要。
  apiBase: window.location.origin
});

(() => {
  const VERSION = '20260903-mobile-ui-1';
  const load = (src) => {
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    document.head.appendChild(script);
  };
  const loadCss = (href) => {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  };

  // iPhone/Safariで旧CSS・旧JSが残らないよう、今回のUI修正版だけversion queryを付ける。
  loadCss(`styles-07.css?v=${VERSION}`);
  load(`site-corrections.js?v=${VERSION}`);
  load('site-remove-chorus.js');
  load(`bgm-player-v2.js?v=${VERSION}`);
})();
