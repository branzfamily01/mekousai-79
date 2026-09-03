window.MEKOUSAI_CONFIG = Object.freeze({
  // Cloudflare Worker deployment後、この1行だけ実URLへ変更します。
  apiBase: "https://REPLACE-WITH-WORKER.workers.dev"
});

// 昼夜祭の団体一覧に4Dが欠けないよう、トップページ側の表示を補正する。
(() => {
  const apply = () => {
    const list = document.querySelector('.homepage-daynight .daynight-groups');
    if (!list) return;
    const exists = [...list.querySelectorAll('strong')].some(node => node.textContent.trim() === '4D');
    if (exists) return;
    const card = document.createElement('article');
    card.className = 'daynight-group';
    const name = document.createElement('strong');
    name.textContent = '4D';
    card.appendChild(name);
    list.prepend(card);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
})();
