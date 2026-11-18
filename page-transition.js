(function() {
  const style = document.createElement('style');
  style.textContent = `
    #page-fade-veil {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      background-color: #000000;
      z-index: 2147483646;
      pointer-events: none;
      opacity: 1;
      transition: opacity 0.65s ease-in-out;
    }
    #page-fade-veil.hidden {
      opacity: 0;
    }
    #back-poster-layer {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      background-color: #000000;
      background-image: url('./backtransist.webp');
      background-position: center center;
      background-repeat: no-repeat;
      background-size: cover;
      z-index: 2147483647;
      pointer-events: none;
      opacity: 0;
      transition: opacity 1.8s ease-in-out;
    }
    #back-poster-layer.visible {
      opacity: 1;
    }
  `;
  (document.head || document.documentElement).appendChild(style);

  const veil = document.createElement('div');
  veil.id = 'page-fade-veil';

  const posterLayer = document.createElement('div');
  posterLayer.id = 'back-poster-layer';

  const backAudio = document.createElement('audio');
  backAudio.src = './transmit.mp4';
  backAudio.preload = 'auto';
  backAudio.style.display = 'none';

  function mountAndReveal() {
    if (document.body) {
      if (!veil.parentNode) document.body.appendChild(veil);
      if (!posterLayer.parentNode) document.body.appendChild(posterLayer);
      if (!backAudio.parentNode) document.body.appendChild(backAudio);
    }
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

  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      posterLayer.classList.remove('visible');
      veil.classList.add('hidden');
    }
  });

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
      if (!posterLayer.parentNode) document.body.appendChild(posterLayer);
      if (!backAudio.parentNode) document.body.appendChild(backAudio);
    }

    const isBack = isBackNavigationLink(link);

    if (isBack) {
      // 1. Одразу перекриваємо нижню сторінку чорним шаром, щоб при fade-out постера не блимав старий екран
      veil.style.transition = 'opacity 0.8s ease-in-out';
      veil.classList.remove('hidden');

      // 2. Запускаємо звук
      try {
        backAudio.currentTime = 0;
        backAudio.play().catch(() => {});
      } catch (err) {}

      // 3. Плавний fade-in постера (0 -> 1.8 сек)
      void posterLayer.offsetWidth;
      posterLayer.classList.add('visible');

      // 4. Через 3.2 сек починаємо плавний fade-out постера у чорний екран (3.2 -> 5.0 сек)
      setTimeout(() => {
        posterLayer.classList.remove('visible');
      }, 3200);

      // 5. Рівно на 5.0 сек під чорним екраном переходимо на попередню сторінку
      setTimeout(() => {
        window.location.href = link.href;
      }, 5000);
    } else {
      void veil.offsetWidth;
      veil.classList.remove('hidden');
      setTimeout(() => {
        window.location.href = link.href;
      }, 600);
    }
  });
})();