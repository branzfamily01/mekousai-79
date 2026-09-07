(() => {
  if (!('IntersectionObserver' in window)) return;

  const targets = [
    ...document.querySelectorAll('.hero-goals, .date-card, .poster-stage, .journal-heading, .photo-mosaic, .intro-grid, .facts-row, .highlights-copy, .program-book-copy, .program-book-stage, .program-gateway, .timetable, .map-section, .access, .notices')
  ];

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -28px 0px' });

  targets.forEach((el) => el.classList.add('fade-up'));
  document.documentElement.classList.add('enhance-ready');
  targets.forEach((el) => observer.observe(el));

  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
})();
