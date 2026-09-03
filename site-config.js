window.MEKOUSAI_CONFIG = Object.freeze({
  // Cloudflare Worker deployment後、この1行だけ実URLへ変更します。
  apiBase: "https://REPLACE-WITH-WORKER.workers.dev"
});

(() => {
  if (document.querySelector('script[src="site-corrections.js"]')) return;
  const script = document.createElement('script');
  script.src = 'site-corrections.js';
  script.defer = true;
  document.head.appendChild(script);
})();
