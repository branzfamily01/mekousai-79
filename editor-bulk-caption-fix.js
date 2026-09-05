(() => {
  const run = () => {
    const mode = document.getElementById('bulk-caption-mode');
    const caption = document.getElementById('bulk-caption');
    if (!mode || !caption) return;

    caption.disabled = false;
    caption.placeholder = 'ここに入力すると、自動で「入力内容に置き換える」になります';

    caption.addEventListener('input', () => {
      if (caption.value.length > 0) {
        mode.value = 'replace';
      } else if (mode.value === 'replace') {
        mode.value = 'none';
      }
      caption.disabled = false;
    });

    mode.addEventListener('change', () => {
      if (mode.value === 'clear') caption.value = '';
      caption.disabled = false;
    });

    // editor.js がモード変更時に disabled を戻しても、すぐ入力可能へ復元する。
    const observer = new MutationObserver(() => {
      if (caption.disabled) caption.disabled = false;
    });
    observer.observe(caption, { attributes: true, attributeFilter: ['disabled'] });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();
