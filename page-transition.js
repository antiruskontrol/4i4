(function() {
  const style = document.createElement('style');
  style.textContent = `
    #page-fade-veil {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      background-color: #000000;
      background-position: center center;
      background-repeat: no-repeat;
      background-size: cover;
      z-index: 2147483647;
      pointer-events: none;
      opacity: 1;
      transition: opacity 0.65s ease-in-out;
    }
    #page-fade-veil.hidden {
      opacity: 0;
    }
    #page-fade-veil.is-back-transition {
      background-image: url('./backtransist.webp');
    }
  `;
  (document.head || document.documentElement).appendChild(style);

  const veil = document.createElement('div');
  veil.id = 'page-fade-veil';

  // Прихований аудіоплеєр для звукової доріжки з transmit.mp4 (без відео)
  const backAudio = document.createElement('audio');
  backAudio.src = './transmit.mp4';
  backAudio.preload = 'auto';
  backAudio.style.display = 'none';

  // Якщо прийшли сюди зворотним переходом — показуємо постер при відкритті нової сторінки
  const wasBack = sessionStorage.getItem('4i4_back_transition') === '1';
  if (wasBack) {
    veil.classList.add('is-back-transition');
    sessionStorage.removeItem('4i4_back_transition');
  }

  function mountAndReveal() {
    if (document.body) {
      if (!veil.parentNode) document.body.appendChild(veil);
      if (!backAudio.parentNode) document.body.appendChild(backAudio);
    }
    const revealDelay = wasBack ? 450 : 0;
    setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          veil.classList.add('hidden');
        });
      });
    }, revealDelay);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAndReveal);
  } else {
    mountAndReveal();
  }

  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      veil.classList.remove('is-back-transition');
      veil.classList.add('hidden');
    }
  });

  // Визначаємо, чи є посилання зворотним переходом
  function isBackNavigationLink(link) {
    if (link.dataset.transition === 'back') return true;
    if (link.classList.contains('nav-btn') || link.classList.contains('back-btn')) return true;
    const text = (link.textContent || '').trim().toLowerCase();
    if (text.includes('до виставок') || text.includes('повернутися') || text.startsWith('←')) return true;
    return false;
  }

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || link.target === '_blank') return;
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;

    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return;

    e.preventDefault();
    if (document.body) {
      if (!veil.parentNode) document.body.appendChild(veil);
      if (!backAudio.parentNode) document.body.appendChild(backAudio);
    }

    const isBack = isBackNavigationLink(link);
    let transitionDuration = 600;

    if (isBack) {
      veil.classList.add('is-back-transition');
      sessionStorage.setItem('4i4_back_transition', '1');
      transitionDuration = 1100; // Трохи довший час для звуку та перегляду постера
      try {
        backAudio.currentTime = 0;
        backAudio.play().catch(() => {});
      } catch (err) {}
    } else {
      veil.classList.remove('is-back-transition');
      sessionStorage.removeItem('4i4_back_transition');
    }

    void veil.offsetWidth;
    veil.classList.remove('hidden');

    setTimeout(() => {
      window.location.href = link.href;
    }, transitionDuration);
  });
})();