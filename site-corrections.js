(() => {
  const whenReady = (fn) => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  };

  whenReady(() => {
    const journalTitle = document.querySelector('.journal-heading h2');
    if (journalTitle) journalTitle.innerHTML = '文化祭はもう<span class="mobile-title-break"><br></span>始まっている。';

    const journalIntro = document.querySelector('.journal-intro p');
    if (journalIntro) journalIntro.textContent = '準備の放課後から、本番の熱気、そして表彰の瞬間まで。目高生がつくる第79回目高祭を、写真で追いかけます。';
    document.querySelectorAll('.photo-caption').forEach(caption => {
      const title = caption.querySelector('h3')?.textContent.trim();
      if (title === '準備風景') {
        const p = caption.querySelector('p');
        if (p) p.textContent = '教室装飾の様子';
      }
    });

    /* 「この一瞬を、みんなでつくる。」見出しは削除し、本文だけをトップの日付直下へ移動 */
    const intro = document.querySelector('.intro#about, #about.intro');
    const introCopy = intro?.querySelector('.intro-copy');
    const dateCard = document.querySelector('.hero .date-card');
    if (introCopy && dateCard) {
      const message = document.createElement('div');
      message.className = 'hero-festival-message';
      message.innerHTML = introCopy.innerHTML;
      dateCard.insertAdjacentElement('afterend', message);
    }
    if (intro) intro.remove();

    /* 重複セクションを丸ごと削除 */
    document.querySelector('.highlights')?.remove();
    document.querySelector('.official-program')?.remove();
    document.getElementById('notices')?.remove();
    document.getElementById('map')?.remove();

    /* 会場案内は独立メニューにせず、プログラム内にさりげなく案内 */
    document.querySelectorAll('a[href="#map"]').forEach(a => a.remove());
    const programGateway = document.getElementById('programs');
    if (programGateway && !programGateway.querySelector('.floor-guide-note')) {
      const note = document.createElement('p');
      note.className = 'floor-guide-note';
      note.textContent = '校舎案内図は、当日配布の公式プログラムをご覧ください。';
      const allButton = programGateway.querySelector('.program-all-button');
      if (allButton) allButton.insertAdjacentElement('afterend', note);
      else programGateway.appendChild(note);
    }

    const registration = document.querySelector('.registration-closed');
    if (registration) {
      const h2 = registration.querySelector('h2');
      const p = registration.querySelector('p');
      if (h2) h2.textContent = '一般・中学生の来場申し込み受け付けは終了しました。';
      if (p) p.textContent = '卒業生および在校生保護者の方はご自由にご来場いただけます。';
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

    const headingStyle = document.createElement('style');
    headingStyle.textContent = `
      .journal-heading h2{font-size:clamp(2rem,4.4vw,4.5rem);line-height:1.06;text-wrap:balance;word-break:keep-all;overflow-wrap:normal}
      .mobile-title-break{display:none}
      .hero-festival-message{max-width:680px;margin:22px 0 26px;padding:18px 20px;border-left:5px solid var(--pink,#ff63c7);background:rgba(255,255,255,.56);font-weight:700;line-height:1.8}
      .hero-festival-message p{margin:0}.hero-festival-message p+p{margin-top:10px}
      .floor-guide-note{margin:16px 0 0;font-size:.9rem;font-weight:700;opacity:.78}
      @media(max-width:640px){
        .journal-heading h2{max-width:100%;font-size:clamp(2rem,10vw,2.65rem);line-height:1.12;word-break:normal;overflow-wrap:anywhere;text-wrap:balance}
        .mobile-title-break{display:inline}
        .hero-festival-message{margin:18px 0 22px;padding:14px 15px;font-size:.92rem;line-height:1.75}
      }
    `;
    document.head.appendChild(headingStyle);

    /* 念のため、残存する旧表記をDOM上でも全置換する。 */
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      if (node.nodeValue && node.nodeValue.includes('昼夜祭')) node.nodeValue = node.nodeValue.replaceAll('昼夜祭', '中夜祭');
    });
  });
})();