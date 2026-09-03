(() => {
  const removeChoir = () => {
    document.querySelectorAll('.timeline-event, .venue-column li').forEach(node => {
      const name = node.querySelector('strong, span')?.textContent?.trim();
      if (name === '合唱部') node.remove();
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', removeChoir, { once: true });
  else removeChoir();
  requestAnimationFrame(removeChoir);
})();
