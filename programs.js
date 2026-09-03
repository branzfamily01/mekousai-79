(() => {
  const items = Array.isArray(window.MEKOUSAI_PROGRAMS) ? window.MEKOUSAI_PROGRAMS : [];
  const publicItems = items.filter(item => item.groupType !== '中夜祭');
  const grid = document.getElementById('program-grid');
  const count = document.getElementById('result-count');
  const heading = document.getElementById('result-heading');
  const search = document.getElementById('program-search');
  const params = new URLSearchParams(location.search);
  let group = params.get('group') || 'all';
  let cat = params.get('cat') || 'all';
  let q = params.get('q') || '';
  const norm = s => String(s || '').toLowerCase().replace(/\s+/g, '');

  function pos(index, cols, rows) {
    const col = index % cols, row = Math.floor(index / cols);
    return {
      bx: cols === 1 ? '0%' : `${(col / (cols - 1)) * 100}%`,
      by: rows === 1 ? '0%' : `${(row / (rows - 1)) * 100}%`
    };
  }

  function addVisual(card, item) {
    const customImage = item.id === 'c-english-quest'
      ? (window.MEKOUSAI_ENGLISH_QUEST_IMAGE || item.customImage || '')
      : (item.customImage || '');

    if (customImage) {
      const visual = document.createElement('div');
      visual.className = 'program-visual custom-program-image';
      const img = document.createElement('img');
      img.src = customImage;
      img.alt = `${item.group} ${item.title} 企画ビジュアル`;
      img.loading = item.id === 'c-english-quest' ? 'eager' : 'lazy';
      img.decoding = 'sync';
      if (item.id === 'c-english-quest') {
        img.fetchPriority = 'high';
        visual.dataset.imageSource = 'english-quest-image';
        visual.style.backgroundColor = '#fff';
        visual.style.backgroundImage = `url("${customImage}")`;
        visual.style.backgroundRepeat = 'no-repeat';
        visual.style.backgroundPosition = 'center';
        visual.style.backgroundSize = 'contain';
      }
      img.style.width = '100%';
      img.style.height = item.id === 'c-english-quest' ? 'auto' : '100%';
      img.style.maxHeight = item.id === 'c-english-quest' ? '560px' : 'none';
      img.style.display = 'block';
      img.style.objectFit = 'contain';
      img.style.objectPosition = 'center';
      img.style.background = 'transparent';
      img.addEventListener('load', () => visual.classList.add('image-loaded'), { once: true });
      img.addEventListener('error', () => {
        /* background-image uses the same actual JPEG as a second rendering path on Safari */
        visual.classList.add('image-fallback');
        img.remove();
      }, { once: true });
      visual.appendChild(img);
      card.appendChild(visual);
      return;
    }

    const visual = document.createElement('div');
    if (item.sprite) {
      visual.className = `program-visual sprite-${item.sprite}`;
      const cols = 3, rows = item.sprite === 'classes' ? 6 : 9, p = pos(item.spriteIndex, cols, rows);
      visual.style.setProperty('--bx', p.bx);
      visual.style.setProperty('--by', p.by);
    } else {
      visual.className = 'program-visual no-program-image';
      if (item.id === 'c-english-quest') visual.textContent = 'English Quest';
    }
    visual.setAttribute('role', 'img');
    visual.setAttribute('aria-label', `${item.group} ${item.title} 企画ビジュアル`);
    card.appendChild(visual);
  }

  function render() {
    const nq = norm(q);
    const filtered = publicItems.filter(item =>
      (group === 'all' || item.groupType === group || item.group === group) &&
      (cat === 'all' || item.webCategory === cat) &&
      (!nq || norm([item.group, item.title, item.sourceGenre, item.description, item.venue, item.webCategory].join(' ')).includes(nq))
    );

    grid.textContent = '';
    count.textContent = `${filtered.length}企画`;
    heading.textContent = group === 'all' ? 'すべての一般公開企画' : `${group}の企画`;

    if (!filtered.length) {
      const e = document.createElement('div');
      e.className = 'no-results';
      e.textContent = '条件に合う企画がありません。絞り込みを変更してください。';
      grid.appendChild(e);
      return;
    }

    filtered.forEach(item => {
      const card = document.createElement('article');
      card.className = 'program-card';
      if (item.id === 'c-english-quest') card.classList.add('english-quest-card');
      addVisual(card, item);

      const copy = document.createElement('div');
      copy.className = 'program-copy';
      const tags = document.createElement('div');
      tags.className = 'program-tags';
      [...new Set([item.group, item.sourceGenre, item.webCategory].filter(Boolean))].forEach(t => {
        const s = document.createElement('span');
        s.textContent = t;
        tags.appendChild(s);
      });
      copy.appendChild(tags);

      const h = document.createElement('h3');
      h.textContent = item.title;
      copy.appendChild(h);

      const d = document.createElement('p');
      d.textContent = item.description;
      copy.appendChild(d);

      if (item.venue) {
        const v = document.createElement('p');
        v.className = 'program-place';
        v.textContent = `会場・時間：${item.venue}`;
        copy.appendChild(v);
      }

      card.appendChild(copy);
      grid.appendChild(card);
    });
  }

  document.querySelectorAll('[data-group]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-group]').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    group = btn.dataset.group;
    render();
  }));

  document.querySelectorAll('[data-cat]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-cat]').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    cat = btn.dataset.cat;
    render();
  }));

  document.querySelectorAll('[data-jump]').forEach(btn => btn.addEventListener('click', () => {
    group = btn.dataset.jump;
    document.querySelectorAll('[data-group]').forEach(b => b.classList.toggle('is-active', b.dataset.group === group));
    render();
    document.querySelector('.p-controls').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));

  if (q) search.value = q;
  document.querySelectorAll('[data-group]').forEach(b => b.classList.toggle('is-active', b.dataset.group === group));
  document.querySelectorAll('[data-cat]').forEach(b => b.classList.toggle('is-active', b.dataset.cat === cat));
  search.addEventListener('input', () => { q = search.value; render(); });
  render();
})();