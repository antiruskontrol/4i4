(function() {
  const style = document.createElement('style');
  style.textContent = `
    #page-fade-veil {
      position: fixed; inset: 0; background: #000; z-index: 99999;
      pointer-events: none; opacity: 1; transition: opacity 0.6s ease-in-out;
    }
    #page-fade-veil.hidden { opacity: 0; }
  `;
  document.head.appendChild(style);

  const veil = document.createElement('div');
  veil.id = 'page-fade-veil';
  document.documentElement.appendChild(veil);

  const reveal = () => requestAnimationFrame(() => requestAnimationFrame(() => veil.classList.add('hidden')));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', reveal);
  else reveal();

  window.addEventListener('pageshow', (e) => { if (e.persisted) veil.classList.add('hidden'); });

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || link.target === '_blank') return;
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;

    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return;

    e.preventDefault();
    veil.classList.remove('hidden');
    setTimeout(() => { location.href = link.href; }, 560);
  });
})();