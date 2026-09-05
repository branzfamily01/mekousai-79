(() => {
  const prep = [
    ['preparation','準備風景'],
    ['creation','制作の手元'],
    ['after-school','放課後'],
    ['rehearsal','リハーサル'],
    ['final-prep','開催直前']
  ];
  const upload = document.getElementById('upload-category');
  const manage = document.getElementById('manage-category');
  if (!upload || !manage) return;

  function ensure(select) {
    const existing = new Set([...select.options].map(o => o.value));
    const festival = [...select.options].find(o => o.value === 'festival-day') || null;
    prep.forEach(([value,label]) => {
      if (existing.has(value)) return;
      const option = new Option(label, value);
      if (festival) select.insertBefore(option, festival);
      else select.add(option);
      existing.add(value);
    });
  }
  ensure(upload);
  ensure(manage);
})();
