(() => {
  const run=()=>{
    const phaseNav=document.querySelector('.phase-nav');
    if(!phaseNav)return;
    const links=[...phaseNav.querySelectorAll('a')];
    const routes={
      '準備期間':'#preparation',
      '文化祭当日':'gallery.html?category=festival-day',
      '表彰・振り返り':'gallery.html?category=awards'
    };
    links.forEach(a=>{
      const label=a.querySelector('strong')?.textContent.trim();
      if(routes[label])a.href=routes[label];
    });
    document.querySelector('.future-chapters')?.remove();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();