(function () {
  function initCooperationHub() {
    const trigger = document.querySelector('a[href="#cooperation"]');
    if (!trigger) return;

    const style = document.createElement('style');
    style.textContent = `
      #coop-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(5, 8, 18, 0.50);
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transition: opacity 1.0s ease, visibility 1.0s ease;
        z-index: 998;
      }
      #coop-backdrop.is-open {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
      }
      #coop-modal {
        position: fixed;
        top: 76px;
        left: 50%;
        transform: translateX(-50%);
        width: min(940px, 94vw);
        background: rgba(11, 16, 30, 0.96);
        border: 1px solid rgba(56, 189, 248, 0.55);
        box-shadow: 0 0 24px rgba(56, 189, 248, 0.35), 0 0 52px rgba(56, 189, 248, 0.15);
        border-radius: 16px;
        padding: 22px;
        color: #f8fafc;
        font-family: system-ui, -apple-system, sans-serif;
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transition: opacity 1.0s ease, visibility 1.0s ease;
        z-index: 999;
      }
      #coop-modal.is-open {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
      }
      .coop-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        align-items: start;
      }
      @media (max-width: 780px) {
        .coop-grid { grid-template-columns: 1fr; }
        #coop-modal { top: 64px; max-height: 85vh; overflow-y: auto; }
      }
      .coop-card {
        background: rgba(18, 26, 46, 0.85);
        border: 1.5px solid rgba(56, 189, 248, 0.25);
        border-radius: 12px;
        padding: 16px;
        will-change: transform, box-shadow, border-color;
        transition:
          transform 1.36s cubic-bezier(0.22, 1.35, 0.36, 1),
          border-color 1.1s ease,
          box-shadow 1.3s cubic-bezier(0.22, 1, 0.36, 1),
          background 1.1s ease;
        display: flex;
        flex-direction: column;
      }
      .coop-card:hover {
        transform: translateY(-4px) scale(1.015);
        border-color: #38bdf8;
        background: rgba(22, 33, 58, 0.98);
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45), 0 0 16px rgba(56, 189, 248, 0.55), 0 0 36px rgba(56, 189, 248, 0.25);
      }
      .coop-card.is-active {
        transform: translateY(-5px) scale(1.02);
        border-color: #7dd3fc;
        background: rgba(24, 38, 66, 0.99);
        box-shadow: 0 16px 36px rgba(0, 0, 0, 0.55), 0 0 24px rgba(56, 189, 248, 0.85), 0 0 54px rgba(56, 189, 248, 0.42);
      }
      .coop-card-title {
        font-size: 16px;
        font-weight: 700;
        color: #38bdf8;
        text-shadow: 0 0 10px rgba(56, 189, 248, 0.35);
        margin-bottom: 6px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .coop-arrow {
        display: inline-block;
        transition: transform 1.3s cubic-bezier(0.22, 1.4, 0.36, 1);
      }
      .coop-card:hover .coop-arrow,
      .coop-card.is-active .coop-arrow {
        transform: translateY(2px) scale(1.15);
      }
      .coop-card-hint {
        font-size: 13px;
        color: #cbd5e1;
        line-height: 1.45;
      }
      .coop-drawer {
        display: grid;
        grid-template-rows: 0fr;
        opacity: 0;
        transition:
          grid-template-rows 1.36s cubic-bezier(0.22, 1.25, 0.36, 1),
          opacity 1.1s ease,
          margin-top 1.2s cubic-bezier(0.22, 1.25, 0.36, 1);
      }
      .coop-drawer-inner {
        overflow: hidden;
        padding: 4px;
      }
      .coop-card:hover .coop-drawer,
      .coop-card.is-active .coop-drawer {
        grid-template-rows: 1fr;
        opacity: 1;
        margin-top: 12px;
      }
      .coop-input, .coop-textarea {
        width: 100%;
        box-sizing: border-box;
        background: rgba(10, 15, 28, 0.95);
        border: 1.5px solid rgba(56, 189, 248, 0.32);
        border-radius: 8px;
        padding: 9px 11px;
        color: #f8fafc;
        font-size: 13px;
        margin-bottom: 9px;
        outline: none;
        transition: border-color 0.9s ease, box-shadow 0.9s ease, background 0.9s ease;
      }
      .coop-input:hover, .coop-textarea:hover {
        border-color: #38bdf8;
        box-shadow: 0 0 12px rgba(56, 189, 248, 0.45);
      }
      .coop-input:focus, .coop-textarea:focus {
        border-color: #7dd3fc;
        background: rgba(14, 22, 42, 0.99);
        box-shadow: 0 0 18px rgba(56, 189, 248, 0.72), 0 0 30px rgba(56, 189, 248, 0.35);
      }
      .coop-textarea { min-height: 68px; resize: vertical; }
      .coop-submit {
        width: 100%;
        padding: 10px;
        border: 1.5px solid #38bdf8;
        border-radius: 8px;
        background: rgba(2, 132, 199, 0.25);
        color: #e0f2fe;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
        transition:
          transform 1.0s cubic-bezier(0.22, 1.4, 0.36, 1),
          background 0.9s ease,
          box-shadow 0.9s ease,
          border-color 0.9s ease,
          color 0.9s ease;
      }
      .coop-submit:hover {
        transform: translateY(-2px);
        background: #38bdf8;
        color: #041222;
        box-shadow: 0 0 18px rgba(56, 189, 248, 0.65), 0 0 32px rgba(56, 189, 248, 0.3);
      }
      .coop-submit:focus, .coop-submit:active {
        border-color: #bae6fd;
        box-shadow: 0 0 26px rgba(56, 189, 248, 0.95), 0 0 48px rgba(56, 189, 248, 0.5);
      }
      .coop-submit:disabled { opacity: 0.6; cursor: wait; }
      .coop-copilot-link {
        display: block;
        text-align: center;
        margin-top: 9px;
        padding: 8px;
        border-radius: 8px;
        border: 1.5px solid rgba(251, 191, 36, 0.45);
        color: #fbbf24;
        font-size: 12.5px;
        text-decoration: none;
        transition:
          transform 1.0s cubic-bezier(0.22, 1.4, 0.36, 1),
          background 0.9s ease,
          box-shadow 0.9s ease,
          border-color 0.9s ease;
      }
      .coop-copilot-link:hover {
        transform: translateY(-2px);
        border-color: #fbbf24;
        background: rgba(251, 191, 36, 0.15);
        box-shadow: 0 0 16px rgba(251, 191, 36, 0.5), 0 0 28px rgba(251, 191, 36, 0.25);
      }
      .coop-copilot-link:focus, .coop-copilot-link:active {
        border-color: #fde68a;
        box-shadow: 0 0 24px rgba(251, 191, 36, 0.8), 0 0 42px rgba(251, 191, 36, 0.4);
      }
      .coop-status {
        font-size: 12.5px;
        margin-top: 8px;
        text-align: center;
        min-height: 16px;
        transition: opacity 0.9s ease;
      }
    `;
    document.head.appendChild(style);

    const backdrop = document.createElement('div');
    backdrop.id = 'coop-backdrop';

    const modal = document.createElement('div');
    modal.id = 'coop-modal';
    modal.innerHTML = `
      <div class="coop-grid">
        <div class="coop-card" data-card="client">
          <div class="coop-card-title"><span>Вам потрібно від нас</span> <span class="coop-arrow">↓</span></div>
          <div class="coop-card-hint">Замовлення вебсайту, розширення, застосунку або індивідуального AI-копілота.</div>
          <div class="coop-drawer">
            <div class="coop-drawer-inner">
              <form class="coop-form" data-type="Вам потрібно від нас (Клієнт)">
                <input class="coop-input" type="text" name="from_name" placeholder="Як до вас звертатися?" required>
                <input class="coop-input" type="email" name="reply_to" placeholder="Пошта для відповіді" required>
                <textarea class="coop-textarea" name="message" placeholder="Введіть ваше запитання або коротко опишіть ідею..." required></textarea>
                <button class="coop-submit" type="submit">Надіслати запит студії</button>
                <div class="coop-status"></div>
              </form>
              <a href="copilot.html" class="coop-copilot-link">Або сформувати ТЗ і бюджет з AI-Копілотом →</a>
            </div>
          </div>
        </div>

        <div class="coop-card" data-card="partner">
          <div class="coop-card-title"><span>Нам потрібно від вас</span> <span class="coop-arrow">↓</span></div>
          <div class="coop-card-hint">Партнерство, арт-колаборації, участь у виставках або посилення виробничої ланки.</div>
          <div class="coop-drawer">
            <div class="coop-drawer-inner">
              <form class="coop-form" data-type="Нам потрібно від вас (Партнерство)">
                <input class="coop-input" type="text" name="from_name" placeholder="Як до вас звертатися?" required>
                <input class="coop-input" type="email" name="reply_to" placeholder="Пошта для відповіді" required>
                <textarea class="coop-textarea" name="message" placeholder="Ваше запитання, портфоліо або пропозиція співпраці..." required></textarea>
                <button class="coop-submit" type="submit">Запропонувати співпрацю</button>
                <div class="coop-status"></div>
              </form>
              <a href="copilot.html" class="coop-copilot-link">Або обговорити формат через AI-Копілота →</a>
            </div>
          </div>
        </div>

        <div class="coop-card" data-card="copilot">
          <div class="coop-card-title"><span>Допомога AI-Копілота</span> <span class="coop-arrow">→</span></div>
          <div class="coop-card-hint">ШІ-асистент студії за 2 хвилини допоможе сформувати технічне завдання, оцінити бюджет та ризики проєкту.</div>
          <div class="coop-drawer">
            <div class="coop-drawer-inner">
              <p style="font-size:12.5px;color:#94a3b8;margin:4px 0 12px;">Ідеально, якщо ідея ще формується і потрібна структурована оцінка перед стартом.</p>
Перейти на сторінку Копілота




`;
document.body.appendChild(backdrop);
document.body.appendChild(modal);
let closeTimer = null;
let isLockedByFocus = false;
function openHub() {
clearTimeout(closeTimer);
backdrop.classList.add('is-open');
modal.classList.add('is-open');
}
function scheduleClose() {
if (isLockedByFocus) return;
clearTimeout(closeTimer);
closeTimer = setTimeout(() => {
backdrop.classList.remove('is-open');
modal.classList.remove('is-open');
}, 450);
}
trigger.addEventListener('mouseenter', openHub);
trigger.addEventListener('mouseleave', scheduleClose);
trigger.addEventListener('click', (e) => {
e.preventDefault();
if (modal.classList.contains('is-open')) {
isLockedByFocus = false;
backdrop.classList.remove('is-open');
modal.classList.remove('is-open');
} else {
openHub();
}
});
modal.addEventListener('mouseenter', openHub);
modal.addEventListener('mouseleave', scheduleClose);
modal.addEventListener('focusin', (e) => {
isLockedByFocus = true;
modal.querySelectorAll('.coop-card').forEach(c => c.classList.remove('is-active'));
const card = e.target.closest('.coop-card');
if (card) card.classList.add('is-active');
});
backdrop.addEventListener('click', () => {
isLockedByFocus = false;
modal.querySelectorAll('.coop-card').forEach(c => c.classList.remove('is-active'));
backdrop.classList.remove('is-open');
modal.classList.remove('is-open');
});
modal.querySelectorAll('.coop-card-title').forEach(titleEl => {
titleEl.addEventListener('click', () => {
const card = titleEl.closest('.coop-card');
modal.querySelectorAll('.coop-card').forEach(c => { if (c !== card) c.classList.remove('is-active'); });
card.classList.toggle('is-active');
});
});
modal.querySelectorAll('.coop-form').forEach(form => {
form.addEventListener('submit', function (e) {
e.preventDefault();
const btn = form.querySelector('.coop-submit');
const status = form.querySelector('.coop-status');
const direction = form.getAttribute('data-type');
const nameVal = form.querySelector('[name="from_name"]').value.trim();
const emailVal = form.querySelector('[name="reply_to"]').value.trim();
const msgVal = form.querySelector('[name="message"]').value.trim();
btn.disabled = true;
status.style.color = '#38bdf8';
status.textContent = 'Надсилаємо запит...';
const fullBody = 'Напрямок: ' + direction + '\nВід: ' + nameVal + '\nПошта: ' + emailVal + '\n\nПовідомлення:\n' + msgVal;
const params = {
subject: direction,
title: direction,
from_name: nameVal,
user_name: nameVal,
name: nameVal,
reply_to: emailVal,
user_email: emailVal,
email: emailVal,
message: fullBody,
text: fullBody,
body: fullBody,
content: fullBody,
description: fullBody,
details: fullBody,
user_message: fullBody
};
if (window.emailjs && typeof window.emailjs.send === 'function') {
window.emailjs.send('default', 'default', params)
.then(() => {
status.style.color = '#4ade80';
status.textContent = 'Успішно надіслано! Ми відповімо вам на пошту.';
form.reset();
btn.disabled = false;
})
.catch(() => {
status.style.color = '#f87171';
status.textContent = 'Помилка відправки. Спробуйте ще раз або напишіть через Копілота.';
btn.disabled = false;
});
} else {
status.style.color = '#fbbf24';
status.textContent = 'Модуль email.js не завантажено на сторінці.';
btn.disabled = false;
}
});
});
}
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', initCooperationHub);
} else {
initCooperationHub();
}
})();