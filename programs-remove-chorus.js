(() => {
  const items = Array.isArray(window.MEKOUSAI_PROGRAMS) ? window.MEKOUSAI_PROGRAMS : [];
  const index = items.findIndex(item => item.id === 'c-chorus' || item.group === '合唱部');
  if (index >= 0) items.splice(index, 1);
})();
