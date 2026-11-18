(function() {
  const style = document.createElement('style');
  style.textContent = `
    #page-fade-veil {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      background: #000000;
      z-index: 2147483647;
      pointer-events: none;
      opacity: 1;
      transition: opacity 0.6s ease-in-out;
    }
    #page-fade-veil.hidden {
      opacity: 0;
    }
  `;
  (document.head || document.documentElement).appendChild(style);

  const veil = document.createElement('div');
  veil.id = 'page-fade-veil';

  function mountAndReveal() {
    if (!veil.parentNode && document.body) {
      document.body.appendChild(veil);
    }
    // Подвійний requestAnimationFrame гарантує, що браузер відмалює opacity: 1 перед початком fade-in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        veil.classList.add('hidden');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAndReveal);
  } else {
    mountAndReveal();
  }

  // Коректне повернення через кнопку "Назад" у браузері (bfcache)
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      veil.classList.add('hidden');
    }
  });

  // Плавний fade-out перед переходом за внутрішнім посиланням
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || link.target === '_blank') return;
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;

    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return;

    e.preventDefault();
    if (!veil.parentNode && document.body) {
      document.body.appendChild(veil);
    }
    // Форсуємо reflow перед зняттям класу hidden для гарантованої анімації затемнення
    void veil.offsetWidth;
    veil.classList.remove('hidden');

    setTimeout(() => {
      window.location.href = link.href;
    }, 580);
  });
})();