window.MEKOUSAI_CONFIG = Object.freeze({
  // Cloudflare Workers Static Assets では公開サイトと写真APIを同一Originで配信する。
  // Netlify/GitHub Pages時代の固定workers.dev URLは不要。
  apiBase: window.location.origin
});

(() => {
  const load = (src) => {
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    document.head.appendChild(script);
  };
  load('site-corrections.js');
  load('site-remove-chorus.js');
  load('bgm-player-v2.js');
})();
