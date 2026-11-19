(function () {
  function initNeonUI() {
    const style = document.createElement('style');
    style.id = 'global-neon-ui-styles';
    style.textContent = `
      .nav-btn, .neon-btn, .view-btn, .back-btn {
        border-radius: 999px !important;
      }

      a.brand {
        display: inline-flex;
        align-items: center;
        padding: 8px 18px;
        border-radius: 999px;
        border: 1px solid transparent;
        transition: transform 0.35s cubic-bezier(0.22, 1.35, 0.36, 1),
                    color 0.3s ease,
                    text-shadow 0.3s ease,
                    box-shadow 0.3s ease,
                    border-color 0.3s ease,
                    background 0.3s ease;
        will-change: transform;
      }
      a.brand:hover {
        transform: scale(1.07);
        color: #fff8dc !important;
        border-color: rgba(255, 215, 90, 0.65);
        background: rgba(255, 190, 60, 0.10);
        text-shadow: 0 0 8px #fff, 0 0 18px #ffd76a, 0 0 32px #ff9900 !important;
        box-shadow: 0 0 14px rgba(255, 215, 90, 0.65), 0 0 30px rgba(255, 150, 0, 0.35);
      }

      .nav-btn:hover, .btn-gold:hover, .adm-btn:hover, .back-btn:hover {
        transform: translateY(-2px);
        border-color: #ffd76a !important;
        color: #fff !important;
        box-shadow: 0 0 14px rgba(255, 230, 150, 0.85), 0 0 28px rgba(212, 175, 55, 0.65) !important;
      }

      a[href="#cooperation"]:hover, .view-btn:hover {
        transform: translateY(-2px);
        border-color: #7dd3fc !important;
        color: #ffffff !important;
        background: rgba(56, 189, 248, 0.14) !important;
        text-shadow: 0 0 8px rgba(125, 211, 252, 0.95);
        box-shadow: 0 0 14px rgba(56, 189, 248, 0.85), 0 0 30px rgba(56, 189, 248, 0.5) !important;
      }

      .adm-btn-del:hover {
        transform: translateY(-2px);
        box-shadow: 0 0 14px rgba(239, 68, 68, 0.8), 0 0 28px rgba(239, 68, 68, 0.45) !important;
      }

      #adm-preview-folder:hover {
        transform: translateY(-2px);
        box-shadow: 0 0 14px rgba(34, 197, 94, 0.8), 0 0 28px rgba(34, 197, 94, 0.45) !important;
      }

      @keyframes uiNeonFlash {
        0% {
          background: rgba(255, 245, 200, 0.95) !important;
          color: #05070d !important;
          border-color: #ffffff !important;
          box-shadow: 0 0 24px #ffffff, 0 0 48px #ffd76a !important;
          transform: scale(1.06);
        }
        100% {
          transform: scale(1);
        }
      }
      @keyframes uiCyanFlash {
        0% {
          background: rgba(186, 230, 253, 0.95) !important;
          color: #041222 !important;
          border-color: #ffffff !important;
          box-shadow: 0 0 24px #ffffff, 0 0 48px #38bdf8 !important;
          transform: scale(1.06);
        }
        100% {
          transform: scale(1);
        }
      }
      .ui-is-flashing {
        animation: uiNeonFlash 0.38s ease-out forwards !important;
      }
      .ui-is-flashing-cyan {
        animation: uiCyanFlash 0.38s ease-out forwards !important;
      }
    `;
    document.head.appendChild(style);

    document.querySelectorAll('a[href="index.html"], a[href="./index.html"], a[href="/4i4/"]').forEach(link => {
      link.setAttribute('data-transition', 'back');
    });

    document.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest('button, .nav-btn, .neon-btn, a.brand, .view-btn, .back-btn, .adm-btn, .coop-submit, .coop-copilot-link');
      if (!btn) return;
      const isCyan = btn.getAttribute('href') === '#cooperation' || btn.classList.contains('coop-submit') || btn.classList.contains('view-btn');
      const cls = isCyan ? 'ui-is-flashing-cyan' : 'ui-is-flashing';
      btn.classList.remove('ui-is-flashing', 'ui-is-flashing-cyan');
      void btn.offsetWidth;
      btn.classList.add(cls);
      setTimeout(() => btn.classList.remove(cls), 420);
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNeonUI);
  } else {
    initNeonUI();
  }
})();