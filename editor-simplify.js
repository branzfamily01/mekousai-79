(() => {
  setTimeout(() => {
    const LEGACY = new Set(['creation', 'after-school', 'rehearsal', 'final-prep']);
    const uploadCategory = document.getElementById('upload-category');
    const manageCategory = document.getElementById('manage-category');
    const uploadGroup = document.getElementById('upload-festival-group');
    const manageGroup = document.getElementById('manage-festival-group');
    const uploadForm = document.getElementById('upload-form');
    const list = document.getElementById('editor-list');
    const toast = document.getElementById('editor-toast');

    if (!uploadCategory || !manageCategory || !uploadGroup || !manageGroup || !uploadForm) return;

    const intro = document.querySelector('.editor-title p');
    if (intro) intro.textContent = '準備写真はひとまとめ。当日の写真だけ、学年・部活動・その他に分けて管理します。';

    [uploadCategory, manageCategory].forEach(select => {
      [...select.options].forEach(option => {
        if (LEGACY.has(option.value)) option.remove();
      });
    });

    if (![...uploadGroup.options].some(option => option.value === '')) {
      const placeholder = new Option('分類を選択してください', '', true, true);
      placeholder.disabled = true;
      uploadGroup.insertBefore(placeholder, uploadGroup.firstChild);
    }
    uploadGroup.value = '';

    if (![...manageGroup.options].some(option => option.value === 'unassigned')) {
      manageGroup.insertBefore(new Option('未分類（既存写真）', 'unassigned'), manageGroup.firstChild);
    }

    function notify(message, ms = 3400) {
      if (!toast) return;
      toast.textContent = message;
      toast.hidden = false;
      clearTimeout(notify.t);
      notify.t = setTimeout(() => { toast.hidden = true; }, ms);
    }

    uploadCategory.addEventListener('change', () => {
      if (uploadCategory.value === 'festival-day') uploadGroup.value = '';
    });

    manageCategory.addEventListener('change', () => {
      if (manageCategory.value !== 'festival-day') return;
      setTimeout(() => {
        manageGroup.value = 'unassigned';
        manageGroup.dispatchEvent(new Event('change', { bubbles: true }));
      }, 0);
    });

    uploadForm.addEventListener('submit', event => {
      if (uploadCategory.value !== 'festival-day' || uploadGroup.value) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      notify('文化祭当日の写真は、1学年・2学年・3学年・部活動・その他から分類を選んでください。', 4800);
    }, true);

    const patchGroupSelects = root => {
      const targets = [];
      if (root instanceof Element && root.matches('.editor-photo-group')) targets.push(root);
      if (root instanceof Element) targets.push(...root.querySelectorAll('.editor-photo-group'));
      targets.forEach(select => {
        if (![...select.options].some(option => option.value === 'unassigned')) {
          select.insertBefore(new Option('未分類（既存写真）', 'unassigned'), select.firstChild);
        }
        if (select.value === '') select.value = 'unassigned';
      });
    };

    if (list) {
      patchGroupSelects(list);
      new MutationObserver(records => {
        records.forEach(record => record.addedNodes.forEach(node => {
          if (node instanceof Element) patchGroupSelects(node);
        }));
      }).observe(list, { childList: true, subtree: true });
    }
  }, 0);
})();
