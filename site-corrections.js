(() => {
  const whenReady = (fn) => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  };

  whenReady(() => {
    document.querySelectorAll('.program-book-frame img').forEach(img => {
      img.src = 'program-cover.jpg';
      img.alt = '第79回目高祭 公式プログラム表紙';
    });

    const journalTitle = document.querySelector('.journal-heading h2');
    if (journalTitle) journalTitle.innerHTML = '文化祭はもう<span class="mobile-title-break"><br></span>始まっている。';
    const programBookTitle = document.querySelector('.program-book-copy h2');
    if (programBookTitle) programBookTitle.textContent = '今年の目高祭を一冊に。';
    const headingStyle = document.createElement('style');
    headingStyle.textContent = `
      .journal-heading h2,.program-book-copy h2{font-size:clamp(2rem,4.4vw,4.5rem);line-height:1.06;text-wrap:balance;word-break:keep-all;overflow-wrap:normal}
      .mobile-title-break{display:none}
      @media(max-width:640px){
        .journal-heading h2,.program-book-copy h2{max-width:100%;font-size:clamp(2rem,10vw,2.65rem);line-height:1.12;word-break:normal;overflow-wrap:anywhere;text-wrap:balance}
        .mobile-title-break{display:inline}
      }
    `;
    document.head.appendChild(headingStyle);

    const journalIntro = document.querySelector('.journal-intro p');
    if (journalIntro) journalIntro.textContent = '準備の放課後から、本番の熱気、そして表彰の瞬間まで。目高生がつくる第79回目高祭を、写真で追いかけます。';
    document.querySelectorAll('.photo-caption').forEach(caption => {
      const title = caption.querySelector('h3')?.textContent.trim();
      if (title === '準備風景') {
        const p = caption.querySelector('p');
        if (p) p.textContent = '教室装飾の様子';
      }
    });

    const registration = document.querySelector('.registration-closed');
    if (registration) {
      const h2 = registration.querySelector('h2');
      const p = registration.querySelector('p');
      if (h2) h2.textContent = '一般・中学生の来場申し込み受け付けは終了しました。';
      if (p) p.textContent = '卒業生および在校生保護者の方はご自由にご来場いただけます。';
    }

    const programBookCopy = document.querySelector('.program-book-copy > p');
    if (programBookCopy) {
      programBookCopy.textContent = '第79回目高祭の公式プログラム表紙。ビビッドな市松模様と「一瞬の煌めきを 一生の思い出に」のメッセージは、ポスターと並ぶもう一つのキービジュアルです。';
    }

    const map = document.getElementById('map');
    if (map) {
      map.innerHTML = `
        <div class="section-kicker"><span>FLOOR GUIDE</span> 校内案内</div>
        <div class="floor-guide-program-only">
          <p>校舎案内図については、公式プログラムをご覧ください。</p>
        </div>`;
    }

    const notices = document.getElementById('notices');
    if (notices) {
      notices.innerHTML = `
        <div class="section-kicker"><span>NOTICE</span> ご来場の皆さまへ</div>
        <div class="notice-layout">
          <div><h2>現在のご案内</h2><span aria-hidden="true" class="notice-symbol">!</span></div>
          <ol class="notice-list">
            <li><span>01</span><div><strong>一般・中学生の来場申し込み受け付けは終了しました。</strong><p>卒業生および在校生保護者の方はご自由にご来場いただけます。</p></div></li>
            <li><span>02</span><div><strong>一般公開時間</strong><p>9月5日（土）10:00–15:00 ／ 9月6日（日）9:00–15:00</p></div></li>
            <li><span>03</span><div><strong>9月5日の中夜祭は在校生限定です。</strong><p>一般来場者・中学生・保護者・卒業生の方はご覧いただけません。詳しい参加団体は専用ページで確認できます。</p></div></li>
          </ol>
        </div>
        <a class="button button-dark notice-button" href="https://www.metro.ed.jp/meguro-h/news/2026/08/79_1.html" rel="noreferrer" target="_blank">学校公式の目高祭案内を見る <span>↗</span></a>`;
    }

    const timetable = document.getElementById('timetable');
    if (timetable) {
      const heading = timetable.querySelector('.section-heading-row');
      if (heading) {
        const simple = document.createElement('div');
        simple.className = 'timetable-heading-simple';
        simple.innerHTML = '<div class="section-kicker"><span>TIMETABLE</span></div><h2>タイムテーブル</h2>';
        heading.replaceWith(simple);
      }
      timetable.querySelectorAll('.timetable-note').forEach(el => el.remove());
    }

    const floorByVenue = new Map([
      ['講義室1・2', '講義室1・2（4階）'],
      ['視聴覚室', '視聴覚室（6階）'],
      ['音楽室', '音楽室（6階）']
    ]);
    document.querySelectorAll('.timeline-venue-head, .timeline-venue h4').forEach(el => {
      const key = el.textContent.trim();
      if (floorByVenue.has(key)) el.textContent = floorByVenue.get(key);
    });

    const inlineDayNight = document.querySelector('.homepage-daynight');
    if (inlineDayNight) {
      const entry = document.createElement('section');
      entry.className = 'daynight-entry-card';
      entry.innerHTML = `
        <div>
          <span>STUDENTS ONLY</span>
          <h3>9/5 中夜祭</h3>
          <p>在校生限定の校内イベントです。一般来場者・中学生・保護者・卒業生の方はご覧いただけません。参加団体の詳細は専用ページにまとめています。</p>
        </div>
        <a href="daynight.html">中夜祭ページを見る <b>→</b></a>`;
      inlineDayNight.replaceWith(entry);
    }

    document.querySelectorAll('a[href="programs.html?view=daynight"]').forEach(a => { a.href = 'daynight.html'; });

    // 念のため、残存する旧表記をDOM上でも全置換する。
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      if (node.nodeValue && node.nodeValue.includes('昼夜祭')) node.nodeValue = node.nodeValue.replaceAll('昼夜祭', '中夜祭');
    });
  });
})();