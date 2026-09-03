window.MEKOUSAI_CONFIG = Object.freeze({
  // Cloudflare Worker deployment後、この1行だけ実URLへ変更します。
  apiBase: "https://REPLACE-WITH-WORKER.workers.dev"
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
})();
