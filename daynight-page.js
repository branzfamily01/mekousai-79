(() => {
  const items = Array.isArray(window.MEKOUSAI_PROGRAMS) ? window.MEKOUSAI_PROGRAMS : [];
  const order = [
    'v-4d','v-namekime','v-nicht','v-7th','v-hamburg','v-apoai','v-meguro','v-bluebird',
    'v-jyobara','v-dance26','v-miss11','v-maverick','v-mmu','v-cinderella'
  ];
  const rank = new Map(order.map((id, index) => [id, index]));
  const dayNightItems = items
    .filter(item => item.groupType === '中夜祭')
    .sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));

  const grid = document.getElementById('daynight-grid');
  const count = document.getElementById('daynight-count');
  if (!grid) return;
  if (count) count.textContent = `${dayNightItems.length}団体`;

  const pos = (index, cols, rows) => {
    const col = index % cols, row = Math.floor(index / cols);
    return { bx: cols === 1 ? '0%' : `${(col / (cols - 1)) * 100}%`, by: rows === 1 ? '0%' : `${(row / (rows - 1)) * 100}%` };
  };

  dayNightItems.forEach(item => {
    const card = document.createElement('article');
    card.className = 'program-card daynight-program-card';
    const visual = document.createElement('div');
    if (item.sprite) {
      visual.className = `program-visual sprite-${item.sprite}`;
      const cols = 3, rows = item.sprite === 'classes' ? 6 : 9;
      const p = pos(item.spriteIndex, cols, rows);
      visual.style.setProperty('--bx', p.bx);
      visual.style.setProperty('--by', p.by);
    } else visual.className = 'program-visual no-program-image';
    visual.setAttribute('role', 'img');
    visual.setAttribute('aria-label', `${item.group} ${item.title} 公式プログラム掲載ビジュアル`);
    card.appendChild(visual);

    const copy = document.createElement('div'); copy.className = 'program-copy';
    const tags = document.createElement('div'); tags.className = 'program-tags';
    [item.group, item.sourceGenre].filter(Boolean).forEach(text => { const tag = document.createElement('span'); tag.textContent = text; tags.appendChild(tag); });
    copy.appendChild(tags);
    const h = document.createElement('h3'); h.textContent = item.title; copy.appendChild(h);
    const d = document.createElement('p'); d.textContent = item.description || '中夜祭参加団体です。'; copy.appendChild(d);
    const place = document.createElement('p'); place.className = 'program-place'; place.textContent = '中夜祭：体育館｜9/5 15:30–17:30（在校生限定）'; copy.appendChild(place);
    card.appendChild(copy); grid.appendChild(card);
  });
})();