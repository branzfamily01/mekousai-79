(() => {
  const items = Array.isArray(window.MEKOUSAI_PROGRAMS) ? window.MEKOUSAI_PROGRAMS : [];
  const byId = new Map(items.map(item => [item.id, item]));
  const patch = (id, values) => { const item = byId.get(id); if (item) Object.assign(item, values); };

  // 公式プログラム写真の対応修正
  patch('3-1', { spriteIndex: 1, venue: '講義室1・2｜9/5 11:30–12:00・14:10–14:40｜9/6 9:20–9:50・12:30–13:00' });
  patch('3-2', { spriteIndex: 0, venue: '視聴覚室｜9/5 10:20–10:50・13:00–13:30｜9/6 11:20–11:50・14:10–14:40' });
  patch('3-3', { venue: '講義室1・2｜9/5 10:10–10:50・12:50–13:30｜9/6 10:30–11:10・13:50–14:30' });
  patch('3-4', { venue: '音楽室｜9/5 10:30–11:00・13:10–13:40｜9/6 10:50–11:20・13:30–14:00' });
  patch('3-5', { venue: '視聴覚室｜9/5 11:30–12:10・14:10–14:50｜9/6 10:00–10:40・12:50–13:30' });
  patch('3-6', { venue: '音楽室｜9/5 11:40–12:10・14:20–14:50｜9/6 9:40–10:10・12:10–12:40' });

  patch('2-1', { spriteIndex: 7, sourceGenre: '飲食店', webCategory: '飲食' });
  patch('2-2', { spriteIndex: 6 });
  patch('2-3', { spriteIndex: 9 });
  patch('2-4', { spriteIndex: 8, sourceGenre: '飲食店', webCategory: '飲食' });
  patch('1-1', { spriteIndex: 13 });
  patch('1-2', { spriteIndex: 12 });
  patch('1-3', { spriteIndex: 15 });
  patch('1-4', { spriteIndex: 14 });

  // 部活動写真の対応修正
  patch('c-flower', { spriteIndex: 8, venue: '3年5組｜9/5・6' });
  patch('c-tea', { spriteIndex: 10, venue: '1階和室｜9/5・6' });
  patch('c-calligraphy', { spriteIndex: 9, venue: '3年4組（展示）／体育館（パフォーマンス）｜9/6 9:30–9:50' });
  patch('c-photo', { spriteIndex: 15, venue: '3年1組｜9/5・6' });
  patch('c-science', { spriteIndex: 14, venue: '6階生物室｜9/5・6' });

  patch('c-art', { venue: '3年6組｜9/5・6' });
  patch('c-karuta', { venue: '3年3組｜9/5・6' });
  patch('c-homemade', { venue: '5階調理室前｜9/5・6（販売14:00〜）' });
  patch('c-wind', { venue: '体育館｜9/5 11:50–12:40｜9/6 14:00–14:50' });
  patch('c-folk', { venue: '体育館｜9/5 10:20–11:20｜9/6 12:10–13:10' });
  patch('c-dance', { venue: '体育館｜9/5 14:00–14:30｜9/6 10:30–11:00' });
  patch('c-student', { groupType: '生徒会', venue: '学校全体＋3年2組｜9/5・6', sourceGenre: 'スタンプラリー・学校紹介' });

  // 沖縄探究学習は昼夜祭ではなく、通常の文化祭展示
  patch('v-okinawa', {
    group: '総合・探究係',
    groupType: '総合・探究係',
    sourceGenre: '総合探究',
    title: '沖縄探究学習展示',
    venue: '2年1組・2年2組｜9/5・6',
    webCategory: '学校紹介・探究'
  });

  // 「有志」に入っていた企画は、沖縄探究学習を除き昼夜祭専用枠へ分離
  const dayNightIds = items.filter(item => item.id?.startsWith('v-') && item.id !== 'v-okinawa').map(item => item.id);
  dayNightIds.forEach(id => patch(id, {
    groupType: '昼夜祭',
    venue: '体育館｜9/5 15:30–17:30（在校生限定）',
    note: '昼夜祭は在校生のみ参加できます。一般来場者・保護者の方はご覧いただけません。'
  }));

  // 参加団体紹介の正式表記に合わせる
  patch('v-meguro', { group: 'MAGURO', title: '奏でてワクワク 目黒のMAGURO' });
  patch('v-namekime', { title: 'He is mine' });
  patch('v-bluebird', { sourceGenre: '演奏', title: 'ブルーバード' });
  patch('v-mmu', { title: 'Meguro Music Union' });
  patch('v-cinderella', { title: '10匹のシンデレラ' });

  // 既存データに抜けていた参加団体を追加
  if (!byId.has('c-chorus')) {
    items.push({
      id: 'c-chorus', group: '合唱部', groupType: '部活動', sourceGenre: '合唱', title: '合唱発表',
      description: '合唱部による文化祭発表です。',
      venue: '体育館｜9/5 13:10–13:30｜9/6 11:20–11:40',
      webCategory: '音楽・ダンス', sprite: null, spriteIndex: 0, note: ''
    });
  }
  if (!byId.has('v-dance26')) {
    items.push({
      id: 'v-dance26', group: 'ダンス部26期', groupType: '昼夜祭', sourceGenre: 'ダンス', title: 'ダンスパフォーマンス',
      description: 'ダンス部26期による昼夜祭パフォーマンスです。',
      venue: '体育館｜9/5 15:30–17:30（在校生限定）',
      webCategory: '音楽・ダンス', sprite: null, spriteIndex: 0,
      note: '昼夜祭は在校生のみ参加できます。一般来場者・保護者の方はご覧いただけません。'
    });
  }
})();
