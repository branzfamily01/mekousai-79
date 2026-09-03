(() => {
  const whenReady = (fn) => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  };

  whenReady(() => {
    // 公式プログラム表紙はJPEGを優先して確実に表示する。
    document.querySelectorAll('.program-book-frame img').forEach(img => {
      img.src = 'program-cover.jpg';
      img.alt = '第79回目高祭 公式プログラム表紙';
    });

    // 長い見出しが不自然に3段以上へ割れないよう、改行を外してバランス調整する。
    const journalTitle = document.querySelector('.journal-heading h2');
    if (journalTitle) journalTitle.textContent = '文化祭は、もう始まっている。';
    const programBookTitle = document.querySelector('.program-book-copy h2');
    if (programBookTitle) programBookTitle.textContent = '今年の目高祭を、一冊に。';
    const headingStyle = document.createElement('style');
    headingStyle.textContent = `
      .journal-heading h2,.program-book-copy h2{font-size:clamp(2rem,4.4vw,4.5rem);line-height:1.06;text-wrap:balance;word-break:keep-all;overflow-wrap:normal}
      @media(max-width:640px){.journal-heading h2,.program-book-copy h2{font-size:clamp(2rem,9vw,3rem);line-height:1.08}}
    `;
    document.head.appendChild(headingStyle);

    // 写真で見る目高祭の説明文・準備風景キャプションを簡潔化する。
    const journalIntro = document.querySelector('.journal-intro p');
    if (journalIntro) journalIntro.textContent = '準備の放課後から、本番の熱気、そして表彰の瞬間まで。目高生がつくる第79回目高祭を、写真で追いかけます。';
    document.querySelectorAll('.photo-caption').forEach(caption => {
      const title = caption.querySelector('h3')?.textContent.trim();
      if (title === '準備風景') {
        const p = caption.querySelector('p');
        if (p) p.textContent = '教室装飾の様子';
      }
    });

    // トップの来場申込案内を最新文言へ更新する。
    const registration = document.querySelector('.registration-closed');
    if (registration) {
      const h2 = registration.querySelector('h2');
      const p = registration.querySelector('p');
      if (h2) h2.textContent = '一般・中学生の来場申し込み受け付けは終了しました。';
      if (p) p.innerHTML = '<strong>一般来場枠は定員に達しています。中学生・保護者の方のお申し込みも締め切りました。</strong> 卒業生および在校生保護者の方はご自由にご来場いただけます。';
    }

    // 校舎案内図はWeb掲載しない。案内文だけを残す。
    const map = document.getElementById('map');
    if (map) {
      map.innerHTML = `
        <div class="section-kicker"><span>FLOOR GUIDE</span> 校内案内</div>
        <div class="floor-guide-program-only">
          <p>校舎案内図については、公式プログラムをご覧ください。</p>
          <a class="button button-primary" href="#official-program">公式プログラムを見る <span>↘</span></a>
        </div>`;
    }

    // お知らせ欄も来場条件・昼夜祭の対象者を最新化する。
    const notices = document.getElementById('notices');
    if (notices) {
      notices.innerHTML = `
        <div class="section-kicker"><span>NOTICE</span> ご来場の皆さまへ</div>
        <div class="notice-layout">
          <div><h2>現在のご案内</h2><span aria-hidden="true" class="notice-symbol">!</span></div>
          <ol class="notice-list">
            <li><span>01</span><div><strong>一般・中学生の来場申し込み受け付けは終了しました。</strong><p>一般来場枠は定員に達しています。中学生・保護者の方のお申し込みも締め切りました。卒業生および在校生保護者の方はご自由にご来場いただけます。</p></div></li>
            <li><span>02</span><div><strong>一般公開時間</strong><p>9月5日（土）10:00–15:00 ／ 9月6日（日）9:00–15:00</p></div></li>
            <li><span>03</span><div><strong>9月5日の昼夜祭は在校生限定です。</strong><p>一般来場者・中学生・保護者・卒業生の方はご覧いただけません。詳しい参加団体は専用ページで確認できます。</p></div></li>
          </ol>
        </div>
        <a class="button button-dark notice-button" href="https://www.metro.ed.jp/meguro-h/news/2026/08/79_1.html" rel="noreferrer" target="_blank">学校公式の目高祭案内を見る <span>↗</span></a>`;
    }

    // タイムテーブルの会場見出しに階数を追加する。
    const floorByVenue = new Map([
      ['講義室1・2', '講義室1・2（4階）'],
      ['視聴覚室', '視聴覚室（6階）'],
      ['音楽室', '音楽室（6階）']
    ]);
    document.querySelectorAll('.timeline-venue-head, .timeline-venue h4').forEach(el => {
      const key = el.textContent.trim();
      if (floorByVenue.has(key)) el.textContent = floorByVenue.get(key);
    });

    // 昼夜祭は一覧をトップに直接展開せず、専用ページへの入口だけを表示する。
    const inlineDayNight = document.querySelector('.homepage-daynight');
    if (inlineDayNight) {
      const entry = document.createElement('section');
      entry.className = 'daynight-entry-card';
      entry.innerHTML = `
        <div>
          <span>STUDENTS ONLY</span>
          <h3>9/5 昼夜祭</h3>
          <p>在校生限定の校内イベントです。一般来場者・中学生・保護者・卒業生の方はご覧いただけません。参加団体の詳細は専用ページにまとめています。</p>
        </div>
        <a href="daynight.html">昼夜祭ページを見る <b>→</b></a>`;
      inlineDayNight.replaceWith(entry);
    }

    // トップの「昼夜祭」導線も専用ページへ直接移動させる。
    document.querySelectorAll('a[href="programs.html?view=daynight"]').forEach(a => { a.href = 'daynight.html'; });
  });
})();
