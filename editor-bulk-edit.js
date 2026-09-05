(() => {
  setTimeout(() => {
    const toolbar = document.getElementById('bulk-toolbar');
    const list = document.getElementById('editor-list');
    const manageCategory = document.getElementById('manage-category');
    const manageGroup = document.getElementById('manage-festival-group');
    const toast = document.getElementById('editor-toast');
    if (!toolbar || !list || !manageCategory) return;

    const TOKEN_KEY = 'mekousai-editor-token-v1';
    const apiBase = String(window.MEKOUSAI_CONFIG?.apiBase || '').replace(/\/$/, '');
    const groups = {
      grade1: '1学年',
      grade2: '2学年',
      grade3: '3学年',
      club: '部活動',
      other: 'その他'
    };

    function notify(message, ms = 3600) {
      if (!toast) return;
      toast.textContent = message;
      toast.hidden = false;
      clearTimeout(notify.t);
      notify.t = setTimeout(() => { toast.hidden = true; }, ms);
    }

    async function api(path, body) {
      const token = localStorage.getItem(TOKEN_KEY) || '';
      const res = await fetch(`${apiBase}${path}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    }

    const panel = document.createElement('section');
    panel.className = 'editor-bulk-edit-panel';
    panel.id = 'bulk-edit-panel';
    panel.innerHTML = `
      <div class="editor-bulk-edit-head">
        <div>
          <h3>選択した写真を一括編集</h3>
          <p>変更した項目だけ、チェックした写真すべてに反映します。</p>
        </div>
        <span class="editor-bulk-edit-badge" id="bulk-edit-target-count">0枚</span>
      </div>
      <div class="editor-bulk-edit-grid">
        <label class="editor-field" id="bulk-folder-field">
          <span>当日のフォルダ</span>
          <select id="bulk-folder">
            <option value="">変更しない</option>
            ${Object.entries(groups).map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}
          </select>
          <small>文化祭当日の写真を表示中のときだけ使えます。</small>
        </label>

        <label class="editor-field">
          <span>日付</span>
          <select id="bulk-date-mode">
            <option value="keep">変更しない</option>
            <option value="set">指定日に変更</option>
            <option value="clear">日付を削除</option>
          </select>
          <input id="bulk-date" type="date" disabled>
        </label>

        <label class="editor-field full">
          <span>コメント</span>
          <select id="bulk-caption-mode">
            <option value="keep">変更しない</option>
            <option value="set">同じコメントに置き換える</option>
            <option value="clear">コメントを削除</option>
          </select>
          <textarea id="bulk-caption" maxlength="500" placeholder="選択した写真すべてに入れるコメント" disabled></textarea>
        </label>

        <label class="editor-field">
          <span>公開状態</span>
          <select id="bulk-published">
            <option value="">変更しない</option>
            <option value="1">公開する</option>
            <option value="0">非公開にする</option>
          </select>
        </label>
      </div>
      <div class="editor-bulk-edit-actions">
        <button class="editor-button" id="bulk-apply-button" type="button" disabled>選択した写真に反映</button>
        <small>空欄の項目は変更されません。</small>
      </div>`;
    toolbar.insertAdjacentElement('afterend', panel);

    const targetCount = document.getElementById('bulk-edit-target-count');
    const folderField = document.getElementById('bulk-folder-field');
    const folder = document.getElementById('bulk-folder');
    const dateMode = document.getElementById('bulk-date-mode');
    const dateInput = document.getElementById('bulk-date');
    const captionMode = document.getElementById('bulk-caption-mode');
    const captionInput = document.getElementById('bulk-caption');
    const published = document.getElementById('bulk-published');
    const applyButton = document.getElementById('bulk-apply-button');

    function selectedCards() {
      return [...list.querySelectorAll('.editor-photo.is-selected[data-photo-id]')];
    }

    function refreshSelectionUi() {
      const n = selectedCards().length;
      targetCount.textContent = `${n}枚`;
      applyButton.disabled = n === 0;
      const isFestival = manageCategory.value === 'festival-day';
      folder.disabled = !isFestival;
      folderField.classList.toggle('is-disabled', !isFestival);
      if (!isFestival) folder.value = '';
    }

    dateMode.addEventListener('change', () => {
      dateInput.disabled = dateMode.value !== 'set';
      if (dateMode.value !== 'set') dateInput.value = '';
    });
    captionMode.addEventListener('change', () => {
      captionInput.disabled = captionMode.value !== 'set';
      if (captionMode.value !== 'set') captionInput.value = '';
    });
    manageCategory.addEventListener('change', refreshSelectionUi);

    function enhanceCard(card) {
      if (!(card instanceof Element) || !card.matches('.editor-photo')) return;
      if (card.dataset.bulkEditEnhanced === '1') return;
      card.dataset.bulkEditEnhanced = '1';

      const badge = card.querySelector('.editor-select-badge');
      if (badge) badge.remove();

      const selection = card.querySelector('.editor-select-checkbox');
      if (selection) {
        selection.setAttribute('aria-label', 'この写真を一括編集の対象にする');
        selection.title = '一括編集の対象にする';
        const hint = document.createElement('span');
        hint.className = 'editor-select-hint';
        hint.textContent = '一括編集';
        selection.insertAdjacentElement('afterend', hint);
      }

      const row = card.querySelector('.editor-row');
      const publishCheckbox = row
        ? [...row.querySelectorAll('input[type="checkbox"]')].find(input => !input.classList.contains('editor-select-checkbox'))
        : null;
      if (publishCheckbox) {
        const label = publishCheckbox.closest('label');
        if (label) {
          const select = document.createElement('select');
          select.className = 'editor-individual-publish-select';
          select.setAttribute('aria-label', 'この写真の公開状態');
          select.add(new Option('公開中', '1'));
          select.add(new Option('非公開', '0'));
          select.value = publishCheckbox.checked ? '1' : '0';
          select.addEventListener('change', () => {
            publishCheckbox.checked = select.value === '1';
          });
          label.textContent = '';
          const text = document.createElement('span');
          text.textContent = '公開状態';
          publishCheckbox.hidden = true;
          label.append(text, publishCheckbox, select);
          label.classList.add('editor-publish-field');
        }
      }
    }

    function enhanceAllCards() {
      list.querySelectorAll('.editor-photo').forEach(enhanceCard);
      refreshSelectionUi();
    }

    list.addEventListener('click', () => queueMicrotask(refreshSelectionUi));
    list.addEventListener('change', () => queueMicrotask(refreshSelectionUi));
    document.getElementById('select-all-button')?.addEventListener('click', () => queueMicrotask(refreshSelectionUi));
    document.getElementById('clear-selection-button')?.addEventListener('click', () => queueMicrotask(refreshSelectionUi));

    new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => {
        if (!(node instanceof Element)) return;
        if (node.matches('.editor-photo')) enhanceCard(node);
        node.querySelectorAll?.('.editor-photo').forEach(enhanceCard);
      }));
      refreshSelectionUi();
    }).observe(list, { childList: true, subtree: true });

    applyButton.addEventListener('click', async () => {
      const cards = selectedCards();
      if (!cards.length) return notify('一括編集する写真を選択してください。');

      const body = {};
      if (manageCategory.value === 'festival-day' && folder.value) body.festivalGroup = folder.value;

      if (dateMode.value === 'set') {
        if (!dateInput.value) return notify('変更する日付を選んでください。');
        body.takenOn = dateInput.value;
      } else if (dateMode.value === 'clear') {
        body.takenOn = null;
      }

      if (captionMode.value === 'set') {
        body.caption = captionInput.value.trim();
      } else if (captionMode.value === 'clear') {
        body.caption = '';
      }

      if (published.value === '1') body.published = true;
      if (published.value === '0') body.published = false;

      if (!Object.keys(body).length) return notify('変更する項目を1つ以上指定してください。');

      applyButton.disabled = true;
      const originalText = applyButton.textContent;
      let ok = 0;
      let failed = 0;
      try {
        for (let i = 0; i < cards.length; i++) {
          const id = cards[i].dataset.photoId;
          applyButton.textContent = `${i + 1}/${cards.length}枚を更新中…`;
          try {
            await api(`/api/photos/${encodeURIComponent(id)}`, body);
            ok++;
          } catch {
            failed++;
          }
        }

        notify(failed ? `${ok}枚を更新・${failed}枚は更新できませんでした。` : `${ok}枚をまとめて更新しました。`, failed ? 5200 : 3400);

        folder.value = '';
        dateMode.value = 'keep';
        dateInput.value = '';
        dateInput.disabled = true;
        captionMode.value = 'keep';
        captionInput.value = '';
        captionInput.disabled = true;
        published.value = '';

        if (manageCategory.value === 'festival-day' && manageGroup) {
          manageGroup.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          manageCategory.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } finally {
        applyButton.textContent = originalText;
        refreshSelectionUi();
      }
    });

    enhanceAllCards();
  }, 0);
})();
