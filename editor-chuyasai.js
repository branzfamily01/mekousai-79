(() => {
  const VALUE = 'chuyasai';
  const LABEL = '中夜祭';
  const TOKEN_KEY = 'mekousai-editor-token-v1';
  const $ = id => document.getElementById(id);

  function addOption(select) {
    if (!select || [...select.options].some(option => option.value === VALUE)) return;
    select.add(new Option(LABEL, VALUE));
  }

  function addStaticOptions() {
    addOption($('upload-festival-group'));
    addOption($('manage-festival-group'));
    addOption($('bulk-group'));
    const intro = document.querySelector('.editor-title p');
    if (intro) intro.textContent = '準備写真はひとまとめ。当日の写真は学年・部活動・その他・中夜祭に分けて管理できます。投稿後の写真も、選択したものだけまとめて編集できます。';
  }

  function groupSelectsInList() {
    return [...document.querySelectorAll('#editor-list .editor-card-field')]
      .filter(label => label.querySelector(':scope > span')?.textContent.trim() === '当日の分類')
      .map(label => label.querySelector('select'))
      .filter(Boolean);
  }

  async function syncRenderedGroups() {
    addStaticOptions();
    const selects = groupSelectsInList();
    selects.forEach(addOption);
    if (!selects.length || $('manage-category')?.value !== 'festival-day') return;

    const token = localStorage.getItem(TOKEN_KEY) || '';
    if (!token) return;
    let path = '/api/admin/photos?category=festival-day';
    const filter = $('manage-festival-group')?.value || '';
    if (filter) path += `&group=${encodeURIComponent(filter)}`;

    try {
      const res = await fetch(path, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      if (!res.ok) return;
      const data = await res.json();
      const byId = new Map((data.photos || []).map(photo => [photo.id, photo.festivalGroup]));
      document.querySelectorAll('#editor-list .editor-photo').forEach(card => {
        const value = byId.get(card.dataset.photoId);
        if (value !== VALUE) return;
        const label = [...card.querySelectorAll('.editor-card-field')]
          .find(item => item.querySelector(':scope > span')?.textContent.trim() === '当日の分類');
        const select = label?.querySelector('select');
        if (select) {
          addOption(select);
          select.value = VALUE;
        }
      });
    } catch {}
  }

  addStaticOptions();
  syncRenderedGroups();

  const list = $('editor-list');
  if (list) {
    let timer = null;
    new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(syncRenderedGroups, 40);
    }).observe(list, { childList: true, subtree: true });
  }

  $('manage-category')?.addEventListener('change', () => setTimeout(syncRenderedGroups, 80));
  $('manage-festival-group')?.addEventListener('change', () => setTimeout(syncRenderedGroups, 120));

  const bulkApply = $('bulk-apply-button');
  bulkApply?.addEventListener('click', () => {
    if ($('bulk-group')?.value !== VALUE) return;
    const original = window.confirm;
    window.confirm = message => {
      window.confirm = original;
      return original(String(message).replace('分類→undefined', `分類→${LABEL}`));
    };
    setTimeout(() => { if (window.confirm !== original) window.confirm = original; }, 0);
  }, true);
})();
