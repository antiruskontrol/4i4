(function () {
  function initNeonUI() {
    if (document.getElementById('global-neon-ui-styles')) return;

    const style = document.createElement('style');
    style.id = 'global-neon-ui-styles';
    style.textContent = `
      /* Скруглені капсульні кути ТІЛЬКИ для кнопок */
      a.nav-btn, a.ex-neon-btn, a.back-btn, a.brand, a.coop-copilot-link {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        border-radius: 999px !important;
      }
      a.coop-copilot-link {
        display: flex !important;
      }

      /* Помаранчева неонова кнопка "Чагарники і Чорнобривці" на сторінці виставок */
      a.brand-orange-btn {
        border: 1.5px solid rgba(255, 145, 0, 0.85) !important;
        color: #ffb84d !important;
        background: rgba(255, 115, 0, 0.10) !important;
        text-shadow: 0 0 8px rgba(255, 130, 0, 0.85), 0 0 18px rgba(255, 90, 0, 0.55) !important;
        box-shadow: 0 0 12px rgba(255, 130, 0, 0.35) !important;
        transition: transform 0.35s cubic-bezier(0.22, 1.35, 0.36, 1),
                    color 0.3s ease, border-color 0.3s ease, background 0.3s ease,
                    box-shadow 0.3s ease, text-shadow 0.3s ease !important;
      }
      a.brand-orange-btn:hover {
        transform: scale(1.07) !important;
        color: #ffffff !important;
        border-color: #ffaa33 !important;
        background: rgba(255, 125, 0, 0.24) !important;
        text-shadow: 0 0 8px #ffffff, 0 0 18px #ff9900, 0 0 34px #ff5500 !important;
        box-shadow: 0 0 18px rgba(255, 150, 0, 0.9), 0 0 36px rgba(255, 95, 0, 0.65) !important;
      }

      /* Бренд "Чагарники і Чорнобривці" у залах */
      a.brand {
        padding: 8px 18px;
        border: 1px solid transparent;
        transition: transform 0.35s cubic-bezier(0.22, 1.35, 0.36, 1),
                    color 0.3s ease, text-shadow 0.3s ease, box-shadow 0.3s ease,
                    border-color 0.3s ease, background 0.3s ease !important;
      }
      a.brand:hover {
        transform: scale(1.07) !important;
        color: #fff8dc !important;
        border-color: rgba(255, 215, 90, 0.65) !important;
        background: rgba(255, 190, 60, 0.12) !important;
        text-shadow: 0 0 8px #fff, 0 0 18px #ffd76a, 0 0 32px #ff9900 !important;
        box-shadow: 0 0 14px rgba(255, 215, 90, 0.65), 0 0 30px rgba(255, 150, 0, 0.35) !important;
      }

      /* Зовнішній неоновий ховер відповідного кольору для кнопок */
      .nav-btn:hover, .btn-gold:hover, .adm-btn:hover, .back-btn:hover, .ex-neon-btn:hover, #chat-send:hover {
        transform: translateY(-2px);
        border-color: #ffd76a !important;
        color: #fff !important;
        box-shadow: 0 0 14px rgba(255, 230, 150, 0.85), 0 0 28px rgba(212, 175, 55, 0.65) !important;
      }
      a[href="#cooperation"]:hover {
        transform: translateY(-2px);
        border-color: #7dd3fc !important;
        color: #ffffff !important;
        background: rgba(56, 189, 248, 0.18) !important;
        text-shadow: 0 0 8px rgba(125, 211, 252, 0.95);
        box-shadow: 0 0 14px rgba(56, 189, 248, 0.85), 0 0 30px rgba(56, 189, 248, 0.5) !important;
      }
      .adm-btn-del:hover {
        transform: translateY(-2px);
        box-shadow: 0 0 14px rgba(239, 68, 68, 0.8), 0 0 28px rgba(239, 68, 68, 0.45) !important;
      }
      #adm-preview-folder:hover, .fp-pub:hover {
        transform: translateY(-2px);
        box-shadow: 0 0 14px rgba(34, 197, 94, 0.8), 0 0 28px rgba(34, 197, 94, 0.45) !important;
      }

      /* Світловий спалах поверх кнопок (0.57s = +50% тривалості) */
      /* .ui-btn-host preserves fixed/absolute positioning */
      .ui-btn-host::after {
        content: "";
        position: absolute;
        inset: -2px;
        border-radius: inherit;
        pointer-events: none;
        opacity: 0;
        z-index: 5;
      }
      @keyframes uiOverlayFlash {
        0% {
          opacity: 1;
          transform: scale(1.06);
          background: var(--flash-bg, rgba(255, 230, 150, 0.92));
          box-shadow: 0 0 24px #ffffff, 0 0 50px var(--flash-glow, rgba(255, 195, 75, 0.95));
        }
        45% {
          opacity: 0.75;
          transform: scale(1.03);
        }
        100% {
          opacity: 0;
          transform: scale(1);
          background: transparent;
          box-shadow: none;
        }
      }
      .ui-btn-host.ui-do-flash::after {
        animation: uiOverlayFlash 1.71s ease-out forwards !important;
      }
    `;
    document.head.appendChild(style);

    const SITE_VERSION = 'v1.19';
    if (!document.getElementById('site-version-badge')) {
      const badge = document.createElement('div');
      badge.id = 'site-version-badge';
      badge.textContent = SITE_VERSION;
      badge.style.cssText = 'position:fixed;top:8px;right:12px;z-index:950;font-family:monospace,sans-serif;font-size:11px;font-weight:600;color:#4ade80;background:rgba(4,19,10,0.65);border:1px solid rgba(74,222,128,0.4);padding:2px 7px;border-radius:999px;pointer-events:none;letter-spacing:0.04em;box-shadow:0 0 8px rgba(34,197,94,0.25);';
      document.body.appendChild(badge);
    }

    if (!document.getElementById('site-global-footer')) {
      const isHome = !!document.getElementById('intro-container');
      const footer = document.createElement('footer');
      footer.id = 'site-global-footer';
      footer.textContent = '© АртВеб студія Чагарники і Чорнобривці Київ Україна 2026';

      if (isHome) {
        footer.style.cssText = 'position:fixed;bottom:14px;left:0;width:100%;text-align:center;z-index:20;pointer-events:none;font-family:"Montserrat","Segoe UI",sans-serif;font-size:12px;letter-spacing:0.08em;color:rgba(255,232,179,0.78);text-shadow:0 0 10px rgba(255,175,50,0.65),0 2px 6px rgba(0,0,0,0.9);padding:0 16px;';
      } else {
        footer.style.cssText = 'position:relative;z-index:10;width:100%;text-align:center;margin-top:48px;padding:22px 16px 28px;border-top:1px solid rgba(212,175,55,0.2);font-family:"Segoe UI",system-ui,sans-serif;font-size:0.86rem;letter-spacing:0.08em;color:rgba(244,241,234,0.72);text-shadow:0 0 10px rgba(212,175,55,0.35);';
      }
      document.body.appendChild(footer);
    }

    document.querySelectorAll('a[href="index.html"], a[href="./index.html"], a[href="/4i4/"]').forEach(link => {
      link.setAttribute('data-transition', 'back');
    });

    function flashButton(btn) {
      const href = (btn.getAttribute('href') || '').toLowerCase();
      const cls = (btn.className || '').toString().toLowerCase();
      const id = (btn.id || '').toLowerCase();

      let bg = 'rgba(255, 225, 145, 0.92)';
      let glow = 'rgba(255, 195, 75, 0.95)';

      if (cls.includes('brand-orange')) {
        bg = 'rgba(255, 200, 110, 0.95)';
        glow = 'rgba(255, 130, 0, 0.98)';
      } else if (cls.includes('del') || cls.includes('close') || id.includes('del') || id.includes('cancel')) {
        bg = 'rgba(254, 180, 180, 0.95)';
        glow = 'rgba(239, 68, 68, 0.98)';
      } else if (id.includes('preview') || cls.includes('pub')) {
        bg = 'rgba(134, 239, 172, 0.95)';
        glow = 'rgba(34, 197, 94, 0.98)';
      } else if (href === '#cooperation' || cls.includes('coop') || cls.includes('cyan') || cls.includes('primary')) {
        bg = 'rgba(186, 230, 253, 0.95)';
        glow = 'rgba(56, 189, 248, 0.98)';
      }

      btn.style.setProperty('--flash-bg', bg);
      btn.style.setProperty('--flash-glow', glow);
      if (getComputedStyle(btn).position === 'static') { btn.style.position = 'relative'; }
      btn.classList.add('ui-btn-host');
      btn.classList.remove('ui-do-flash');
      void btn.offsetWidth;
      btn.classList.add('ui-do-flash');
      setTimeout(() => btn.classList.remove('ui-do-flash'), 1800);
    }

    // Логіка карток і плиток повністю недоторканна — працюємо тільки з окремими кнопками
    function getButton(el) {
      if (!el || !el.closest) return null;
      if (el.closest('.tile, .exhibition-card, .coop-card, .fp-card, .adm-thumb')) return null;
      return el.closest('button, [role="button"], input[type="button"], input[type="submit"], a.nav-btn, a.ex-neon-btn, a.back-btn, a.brand, a.coop-copilot-link, .lb-nav');
    }

    document.addEventListener('pointerdown', (e) => {
      const btn = getButton(e.target);
      if (!btn || btn.classList.contains('neon-btn')) return;
      flashButton(btn);
    }, true);

    // Transition starts immediately without artificial click delay
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNeonUI);
  } else {
    initNeonUI();
  }
})();