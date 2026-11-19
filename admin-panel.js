(function() {
  const BACKEND_URL = 'https://' + 'fouri4' + '-copilot-' + 'backend.' + 'onrender.com';
  const STORAGE_KEY = 'studio_exhibitions_data';

  const css = `
    .adm-gear { position: fixed; bottom: 22px; right: 24px; z-index: 950; background: rgba(10,12,18,0.75); border: 1px solid rgba(212,175,55,0.4); border-radius: 50%; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; color: rgba(212,175,55,0.8); font-size: 1.4rem; cursor: pointer; transition: 0.3s; backdrop-filter: blur(4px); }
    .adm-gear:hover, .adm-gear.authed { color: #ffd700; border-color: #d4af37; box-shadow: 0 0 18px rgba(212,175,55,0.55); }
    .adm-modal { position: fixed; inset: 0; background: rgba(2,3,6,0.92); z-index: 2500; display: none; align-items: center; justify-content: center; padding: 16px; backdrop-filter: blur(6px); font-family: 'Segoe UI', sans-serif; }
    .adm-modal.open { display: flex; }
    .adm-box { background: #0e1017; border: 1px solid rgba(212,175,55,0.45); border-radius: 16px; max-width: 680px; width: 100%; max-height: 92vh; overflow-y: auto; padding: 26px; position: relative; color: #f4f1ea; box-shadow: 0 20px 50px rgba(0,0,0,0.95); }
    .adm-box h3 { color: #d4af37; font-size: 1.35rem; font-weight: 400; margin-bottom: 16px; }
    .adm-sec { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px; margin-bottom: 14px; }
    .adm-lbl { display: block; font-size: 0.78rem; color: #d4af37; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.06em; }
    .adm-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap; }
    .adm-in { flex: 1; min-width: 140px; background: #06070a; border: 1px solid rgba(255,255,255,0.18); color: #f4f1ea; padding: 9px 11px; border-radius: 8px; font-size: 0.9rem; }
    .adm-in:focus { outline: none; border-color: #d4af37; }
    .adm-btn { background: #d4af37; color: #000; border: none; padding: 9px 14px; border-radius: 8px; font-weight: 600; font-size: 0.82rem; text-transform: uppercase; cursor: pointer; transition: 0.2s; white-space: nowrap; }
    .adm-btn:hover { box-shadow: 0 0 14px rgba(212,175,55,0.5); }
    .adm-btn-del { background: rgba(239,68,68,0.2); color: #f87171; border: 1px solid rgba(239,68,68,0.45); }
    .adm-btn-del:hover { background: #ef4444; color: #fff; }
    .adm-btn-sec { background: transparent; color: #d4af37; border: 1px solid rgba(212,175,55,0.5); }
    .adm-close { position: absolute; top: 14px; right: 18px; background: none; border: none; color: #94a3b8; font-size: 1.6rem; cursor: pointer; }
    .adm-drop { border: 1px dashed rgba(212,175,55,0.5); border-radius: 10px; padding: 18px; text-align: center; color: #94a3b8; cursor: pointer; transition: 0.25s; margin-bottom: 12px; font-size: 0.88rem; }
    .adm-drop.over { background: rgba(212,175,55,0.12); border-color: #ffd700; color: #fff; }
    .adm-thumbs { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 10px; max-height: 240px; overflow-y: auto; padding: 4px; }
    .adm-thumb { position: relative; aspect-ratio: 1; border-radius: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,0.15); background: #000; }
    .adm-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .adm-thumb input[type="checkbox"] { position: absolute; top: 6px; left: 6px; width: 16px; height: 16px; accent-color: #d4af37; cursor: pointer; }
    .adm-thumb span { position: absolute; bottom: 4px; right: 6px; background: rgba(0,0,0,0.75); color: #d4af37; font-size: 0.72rem; padding: 1px 5px; border-radius: 4px; }
    .adm-st { font-size: 0.85rem; color: #38bdf8; text-align: center; margin-top: 8px; min-height: 1.2em; }
  `;

  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const gear = document.createElement('button');
  gear.className = 'adm-gear' + (localStorage.getItem('adminPin') ? ' authed' : '');
  gear.innerHTML = '⚙'; gear.title = 'Адмін-студія виставок'; document.body.appendChild(gear);
  const modal = document.createElement('div');
  modal.className = 'adm-modal';
  modal.innerHTML = `
    <div class="adm-box">
      <button class="adm-close" id="adm-x">&times;</button>
      <h3>Адмін-студія виставок <span style="font-size:0.75rem;color:#4ade80;border:1px solid rgba(74,222,128,0.45);padding:2px 8px;border-radius:999px;vertical-align:middle;margin-left:6px;">v7</span></h3>

      <div id="adm-auth">
        <p style="color:#94a3b8;font-size:0.9rem;margin-bottom:12px;">Вхід через сервер Render:</p>
        <div class="adm-row">
          <input type="password" id="adm-pwd" class="adm-in" style="color:#fff;letter-spacing:0.08em;" placeholder="Введіть ADMIN_PIN" inputmode="numeric"><button type="button" id="adm-eye" class="adm-btn adm-btn-sec" title="Показати/приховати">👁</button>
          <button class="adm-btn" id="adm-login-btn">Увійти</button>
        </div>
      </div>

      <div id="adm-workspace" style="display:none;">
        <!-- Рівень 1: Художники (Сторінки виставки) -->
        <div class="adm-sec">
          <label class="adm-lbl">1. Сторінка художника (Зала):</label>
          <div class="adm-row">
            <select id="adm-artist-sel" class="adm-in"></select>
            <button class="adm-btn adm-btn-del" id="adm-del-artist">Видалити</button>
          </div>
          <div class="adm-row" style="margin-bottom:0;">
            <input type="text" id="adm-new-artist-name" class="adm-in" placeholder="Ім'я нового художника (напр. Тарас Шевченко)">
            <input type="text" id="adm-new-artist-id" class="adm-in" placeholder="ID латиницею (напр. shevchenko)">
            <button class="adm-btn" id="adm-add-artist">+ Додати</button>
          </div>
        </div>

        <!-- Рівень 2: Експозиції обраного художника -->
        <div class="adm-sec">
          <label class="adm-lbl">2. Експозиція на сторінці художника:</label>
          <div class="adm-row">
            <select id="adm-exp-sel" class="adm-in"></select>
            <button class="adm-btn adm-btn-del" id="adm-del-exp">Видалити</button>
          </div>
          <div class="adm-row" style="margin-bottom:0;">
            <input type="text" id="adm-new-exp-title" class="adm-in" placeholder="Назва (напр. POV №2: Новий погляд)">
            <input type="text" id="adm-new-exp-folder" class="adm-in" placeholder="Папка (напр. pov2)">
            <button class="adm-btn" id="adm-add-exp">+ Додати</button>
          </div>
        </div>

        <!-- Рівень 3: Картини обраної експозиції -->
        <div class="adm-sec">
          <label class="adm-lbl">3. Картини обраної експозиції:</label>
          <div class="adm-drop" id="adm-dropzone">
            Перетягніть сюди файли (Drag &amp; Drop) або натисніть для вибору картин
            <input type="file" id="adm-file-input" multiple accept="image/*" style="display:none;">
          </div>
          <div id="adm-thumbs-grid" class="adm-thumbs"></div>
          <div class="adm-row" style="margin-top:10px;margin-bottom:0;">
            <input type="file" id="adm-folder-input" webkitdirectory directory multiple accept="image/*" style="display:none;">
            <button class="adm-btn adm-btn-sec" id="adm-preview-folder" style="border-color:#22c55e;color:#4ade80;">Попередній перегляд</button>
            <button class="adm-btn" id="adm-add-pics">+ Додати картини</button><button class="adm-btn adm-btn-del" id="adm-del-pics">Видалити обрані</button>
            <button class="adm-btn adm-btn-sec" id="adm-select-all">Виділити всі</button>
          </div>
        </div>

        <div class="adm-row" style="margin-bottom:0;">
          <button class="adm-btn" id="adm-export-all" style="flex:2;">Опублікувати на сайт (GitHub)</button>
          <button class="adm-btn adm-btn-sec" id="adm-logout" style="flex:1;">Вийти</button>
        </div>
      </div>
      <div class="adm-st" id="adm-status"></div>
    </div>
  `;
  document.body.appendChild(modal);

  let memData = null;

  function getData() {
    if (memData) return memData;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { memData = JSON.parse(saved); return memData; } catch {}
    }
    memData = (typeof EXHIBITIONS_DATA !== 'undefined') ? JSON.parse(JSON.stringify(EXHIBITIONS_DATA)) : [];
    return memData;
  }

  function saveData(data) {
    memData = data;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // Якщо розмір base64 перевищує 5 МБ ліміту localStorage, дані залишаються в memData до публікації на GitHub
    }
  }
  const statusEl = document.getElementById('adm-status');
  const artistSel = document.getElementById('adm-artist-sel');
  const expSel = document.getElementById('adm-exp-sel');
  const thumbsGrid = document.getElementById('adm-thumbs-grid');

  function refreshUI(keepArtistId, keepExpId) {
    const data = getData();
    artistSel.innerHTML = data.map(a => `<option value="${a.id}">${a.artist}</option>`).join('');
    const pageId = location.pathname.split('/').pop().replace('.html', '');
    if (keepArtistId && data.some(a => a.id === keepArtistId)) artistSel.value = keepArtistId;
    else if (data.some(a => a.id === pageId)) artistSel.value = pageId;

    const artist = data.find(a => a.id === artistSel.value);
    const secs = artist && artist.sections ? artist.sections : [];
    expSel.innerHTML = secs.length
      ? secs.map(s => `<option value="${s.id}">${s.title} (${s.artworksCount || 0})</option>`).join('')
      : '<option value="">— Немає експозицій —</option>';
    if (keepExpId && secs.some(s => s.id === keepExpId)) expSel.value = keepExpId;
    renderThumbs();
  }

  function renderThumbs() {
    thumbsGrid.innerHTML = '';
    const data = getData();
    const artist = data.find(a => a.id === artistSel.value);
    const sec = artist && artist.sections ? artist.sections.find(s => s.id === expSel.value) : null;
    if (!sec || !sec.artworksCount) {
      thumbsGrid.innerHTML = '<div style="grid-column:1/-1;color:#94a3b8;font-size:0.85rem;text-align:center;padding:12px;">У цій експозиції поки немає картин.</div>';
      return;
    }
    const customList = sec.customImages || [];
    for (let i = 0; i < sec.artworksCount; i++) {
      const src = customList[i] || `./${sec.folder}/${i + 1}.webp`;
      const div = document.createElement('div');
      div.className = 'adm-thumb';
      div.innerHTML = `<img src="${src}" loading="lazy"><input type="checkbox" data-idx="${i}"><span>#${i + 1}</span>`;
      thumbsGrid.appendChild(div);
    }
  }

  async function filesToWebp(files) {
    const res = [];
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      if (f.type === 'image/webp' || f.name.toLowerCase().endsWith('.webp')) {
        const directUrl = await new Promise(r => {
          const reader = new FileReader();
          reader.onload = e => r(e.target.result);
          reader.readAsDataURL(f);
        });
        res.push(directUrl);
        continue;
      }
      const dataUrl = await new Promise(r => {
        const reader = new FileReader();
        reader.onload = e => {
          const img = new Image();
          img.onload = () => {
            const c = document.createElement('canvas');
            const scale = Math.min(1, 1800 / Math.max(img.width, img.height));
            c.width = Math.round(img.width * scale);
            c.height = Math.round(img.height * scale);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            r(c.toDataURL('image/webp', 0.85));
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(f);
      });
      res.push(dataUrl);
    }
    return res;
  }

  async function handleUpload(fileList) {
    const data = getData();
    const artist = data.find(a => a.id === artistSel.value);
    const newTitleEl = document.getElementById('adm-new-exp-title');
    const newFolderEl = document.getElementById('adm-new-exp-folder');
    if (artist && newTitleEl && newTitleEl.value.trim()) {
      const title = newTitleEl.value.trim();
      if (!artist.sections) artist.sections = [];
      const povNum = artist.sections.filter(s => s.id !== 'originals').length + 1;
      const rawFolder = (newFolderEl && newFolderEl.value.trim()) ? newFolderEl.value.trim().replace(/^\/+|\/+$/g, '') : `pov${povNum}`;
      const basePrefix = `images/${artist.id}/`;
      const folder = rawFolder.startsWith(basePrefix) ? rawFolder : basePrefix + rawFolder.split('/').pop();
      const newId = 'exp-' + Date.now();
      artist.sections.push({
        id: newId, badge: `POV №${povNum}`, title, desc: 'Кураторська експозиція.',
        folder, coverImage: `${folder}/1.webp`, artworksCount: 0, glowColor: 'rgba(56, 189, 248, 0.55)'
      });
      expSel.innerHTML += `<option value="${newId}">${title}</option>`;
      expSel.value = newId;
      newTitleEl.value = ''; if (newFolderEl) newFolderEl.value = '';
    }
    const sec = artist && artist.sections ? artist.sections.find(s => s.id === expSel.value) : null;
    if (sec && sec.id === 'originals' && !confirm('Увага! Обрано першу плитку "Оригінали". Додати картини саме туди? (Скасувати — якщо хочете створити нову експозицію)')) {
      statusEl.textContent = 'Скасовано. Введіть назву нової експозиції у поле вище.'; return;
    }
    if (!sec) { statusEl.textContent = 'Спочатку оберіть або створіть експозицію!'; return; }
    const allWebp = Array.from(fileList).every(f => f.type === 'image/webp' || f.name.toLowerCase().endsWith('.webp')); statusEl.textContent = allWebp ? 'Зчитування готових WebP...' : 'Конвертація у WebP...';
    const webps = await filesToWebp(fileList);
    if (!sec.customImages) {
      sec.customImages = Array.from({ length: sec.artworksCount || 0 }, (_, i) => `./${sec.folder}/${i + 1}.webp`);
    }
    sec.customImages.push(...webps);
    sec.artworksCount = sec.customImages.length;
    if (sec.artworksCount > 0) sec.coverImage = sec.customImages[0];
    saveData(data);
    refreshUI(artist.id, sec.id);
    statusEl.textContent = `Додано ${webps.length} картин!`;
  }

  gear.onclick = () => {
    const authed = !!localStorage.getItem('adminPin');
    document.getElementById('adm-auth').style.display = authed ? 'none' : 'block';
    document.getElementById('adm-workspace').style.display = authed ? 'block' : 'none';
    statusEl.textContent = '';
    if (authed) refreshUI();
    modal.classList.add('open');
  };

  document.getElementById('adm-x').onclick = () => { modal.classList.remove('open'); location.reload(); };
  artistSel.onchange = () => refreshUI(artistSel.value);
  expSel.onchange = () => renderThumbs();
  document.getElementById('adm-eye').onclick = () => { const p = document.getElementById('adm-pwd'); p.type = p.type === 'password' ? 'text' : 'password'; }; document.getElementById('adm-login-btn').onclick = async () => {
    const pass = document.getElementById('adm-pwd').value.trim();
    if (!pass) return;
    statusEl.textContent = 'Перевірка ПІН-коду на Render...';
    try {
      const r = await fetch(`${BACKEND_URL}/api/verify-admin`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPin: pass })
      });
      if (r.ok) {
        localStorage.setItem('adminPin', pass);
        gear.classList.add('authed');
        document.getElementById('adm-auth').style.display = 'none';
        document.getElementById('adm-workspace').style.display = 'block';
        refreshUI();
        statusEl.textContent = 'Доступ підтверджено!';
      } else { statusEl.textContent = 'Невірний ПІН-код.'; }
    } catch { statusEl.textContent = 'Сервер Render прокидається, спробуйте за 10 сек.'; }
  };

  document.getElementById('adm-add-artist').onclick = () => {
    const name = document.getElementById('adm-new-artist-name').value.trim();
    const id = document.getElementById('adm-new-artist-id').value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!name || !id) { statusEl.textContent = 'Вкажіть ім’я та ID латиницею!'; return; }
    const data = getData();
    if (data.some(a => a.id === id)) { statusEl.textContent = 'Художник із таким ID вже існує!'; return; }
    data.push({
      id, artist: name, category: 'Нова зала', subtitle: `Персональна виставкова зала: ${name}.`,
      folder: `images/${id}`, tileImage: `${id}title.webp`, pageUrl: `${id}.html`,
      glowColor: 'rgba(212, 175, 55, 0.55)', sections: []
    });
    saveData(data);
    refreshUI(id);
    statusEl.textContent = `Художника «${name}» додано! Скопіюйте hall-template.html у ${id}.html.`;
  };

  document.getElementById('adm-del-artist').onclick = () => {
    const id = artistSel.value;
    if (!id || !confirm('Видалити сторінку цього художника зі списку?')) return;
    saveData(getData().filter(a => a.id !== id));
    refreshUI();
    statusEl.textContent = 'Художника видалено.';
  };

  document.getElementById('adm-add-exp').onclick = () => {
    const title = document.getElementById('adm-new-exp-title').value.trim();
    let rawFolder = document.getElementById('adm-new-exp-folder').value.trim().replace(/^\/+|\/+$/g, '');
    if (!title) { statusEl.textContent = 'Вкажіть назву нової експозиції!'; return; } if (!rawFolder) { const n = (getData().find(a => a.id === artistSel.value)?.sections || []).filter(s => s.id !== 'originals').length + 1; rawFolder = 'pov' + n; }
    const data = getData();
    const artist = data.find(a => a.id === artistSel.value);
    if (!artist) return;
    const basePrefix = `images/${artist.id}/`;
    const folder = rawFolder.startsWith(basePrefix) ? rawFolder : basePrefix + rawFolder.split('/').pop();
    if (!artist.sections) artist.sections = [];
    const newId = 'exp-' + Date.now();
    artist.sections.push({
      id: newId, badge: 'POV', title, desc: 'Кураторська експозиція.',
      folder, coverImage: `${folder}/1.webp`, artworksCount: 0, glowColor: 'rgba(56, 189, 248, 0.55)'
    });
    saveData(data);
    refreshUI(artist.id, newId);
    statusEl.textContent = 'Нову експозицію додано!';
  };

  document.getElementById('adm-del-exp').onclick = () => {
    const data = getData();
    const artist = data.find(a => a.id === artistSel.value);
    if (!artist || !expSel.value || !confirm('Видалити цю експозицію?')) return;
    artist.sections = artist.sections.filter(s => s.id !== expSel.value);
    saveData(data);
    refreshUI(artist.id);
    statusEl.textContent = 'Експозицію видалено.';
  };

  const dz = document.getElementById('adm-dropzone'), fi = document.getElementById('adm-file-input');
  dz.onclick = () => fi.click(); document.getElementById("adm-add-pics").onclick = () => fi.click();

  const folderInput = document.getElementById('adm-folder-input');
  document.getElementById('adm-preview-folder').onclick = () => {
    folderInput.value = '';
    folderInput.click();
  };

  folderInput.onchange = (e) => {
    const rawFiles = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    if (!rawFiles.length) {
      statusEl.textContent = 'У вибраній папці не знайдено зображень.';
      return;
    }
    rawFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    const oldOv = document.getElementById('adm-full-preview-overlay');
    if (oldOv) oldOv.remove();

    const ov = document.createElement('div');
    ov.id = 'adm-full-preview-overlay';
    ov.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;background:#07090e;z-index:99999;overflow-y:auto;font-family:"Segoe UI",system-ui,sans-serif;color:#f4f1ea;padding-bottom:80px;';
    ov.innerHTML = `
      <style>
        #adm-full-preview-overlay .fp-bar {
          position:sticky;top:0;z-index:10;background:rgba(11,15,25,0.96);backdrop-filter:blur(10px);
          border-bottom:1px solid rgba(212,175,55,0.4);padding:14px 24px;
          display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;
        }
        #adm-full-preview-overlay .fp-title { font-size:1.1rem;color:#d4af37;font-weight:500; }
        #adm-full-preview-overlay .fp-cnt { font-size:0.95rem;color:#4ade80;font-weight:600;margin-left:12px; }
        #adm-full-preview-overlay .fp-acts { display:flex;gap:10px;align-items:center;flex-wrap:wrap; }
        #adm-full-preview-overlay .fp-btn {
          padding:10px 18px;border-radius:8px;font-weight:600;font-size:0.85rem;
          text-transform:uppercase;cursor:pointer;transition:0.2s;border:1px solid transparent;
        }
        #adm-full-preview-overlay .fp-sec { background:transparent;color:#d4af37;border-color:rgba(212,175,55,0.5); }
        #adm-full-preview-overlay .fp-sec:hover { background:rgba(212,175,55,0.12); }
        #adm-full-preview-overlay .fp-close { background:rgba(239,68,68,0.18);color:#f87171;border-color:rgba(239,68,68,0.45); }
        #adm-full-preview-overlay .fp-close:hover { background:#ef4444;color:#fff; }
        #adm-full-preview-overlay .fp-pub {
          background:#22c55e;color:#04130a;border-color:#4ade80;box-shadow:0 0 18px rgba(34,197,94,0.45);
        }
        #adm-full-preview-overlay .fp-pub:hover { background:#4ade80;box-shadow:0 0 26px rgba(74,222,128,0.8);transform:translateY(-1px); }
        #adm-full-preview-overlay .fp-pub:disabled { opacity:0.4;cursor:not-allowed;transform:none;box-shadow:none; }
        #adm-full-preview-overlay .fp-grid {
          display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:16px;padding:22px 24px;
        }
        #adm-full-preview-overlay .fp-card {
          position:relative;background:#0e121c;border-radius:12px;overflow:hidden;
          border:3px solid rgba(255,255,255,0.12);cursor:pointer;transition:0.2s ease;display:flex;flex-direction:column;
        }
        #adm-full-preview-overlay .fp-card:hover { transform:translateY(-3px);border-color:rgba(255,255,255,0.35); }
        #adm-full-preview-overlay .fp-card.selected {
          border-color:#22c55e;box-shadow:0 0 18px rgba(34,197,94,0.55),inset 0 0 12px rgba(34,197,94,0.2);
        }
        #adm-full-preview-overlay .fp-card img { width:100%;aspect-ratio:1;object-fit:cover;display:block;background:#000; }
        #adm-full-preview-overlay .fp-chk {
          position:absolute;top:10px;left:10px;width:22px;height:22px;accent-color:#22c55e;cursor:pointer;z-index:2;
        }
        #adm-full-preview-overlay .fp-num {
          position:absolute;top:10px;right:10px;background:rgba(0,0,0,0.78);color:#d4af37;font-size:0.78rem;padding:2px 7px;border-radius:6px;
        }
        #adm-full-preview-overlay .fp-name {
          padding:8px 10px;font-size:0.8rem;color:#cbd5e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
          background:#0b0e17;border-top:1px solid rgba(255,255,255,0.06);
        }
        #adm-full-preview-overlay .fp-card.selected .fp-name { color:#86efac; }
      </style>
      <div class="fp-bar">
        <div>
          <span class="fp-title">Попередній перегляд картин (v7)</span>
          <span class="fp-cnt" id="fp-sel-count">Обрано: 0 з 0</span>
        </div>
        <div class="fp-acts">
          <button type="button" class="fp-btn fp-sec" id="fp-toggle-all">Зняти / Виділити всі</button>
          <button type="button" class="fp-btn fp-pub" id="fp-publish">Публікувати на сайті</button>
          <button type="button" class="fp-btn fp-close" id="fp-cancel">Закрити</button>
        </div>
      </div>
      <div class="fp-grid" id="fp-grid"></div>
    `;
    document.body.appendChild(ov);

    const grid = ov.querySelector('#fp-grid');
    const countEl = ov.querySelector('#fp-sel-count');
    const pubBtn = ov.querySelector('#fp-publish');
    const selected = new Set();
    const objectUrls = [];

    function cleanupAndClose() {
      objectUrls.forEach(u => URL.revokeObjectURL(u));
      ov.remove();
    }

    function updateCounter() {
      countEl.textContent = `Обрано: ${selected.size} з ${rawFiles.length}`;
      pubBtn.disabled = selected.size === 0;
    }

    rawFiles.forEach((file, idx) => {
      const url = URL.createObjectURL(file);
      objectUrls.push(url);
      const card = document.createElement('div');
      card.className = 'fp-card';
      card.innerHTML = `<input type="checkbox" class="fp-chk"><span class="fp-num">#${idx + 1}</span><img src="${url}" loading="lazy"><div class="fp-name" title="${file.name}">${file.name}</div>`;
      const cb = card.querySelector('.fp-chk');
      card.addEventListener('click', (ev) => {
        if (ev.target !== cb) cb.checked = !cb.checked;
        if (cb.checked) { selected.add(idx); card.classList.add('selected'); }
        else { selected.delete(idx); card.classList.remove('selected'); }
        updateCounter();
      });
      grid.appendChild(card);
    });

    updateCounter();

    ov.querySelector('#fp-toggle-all').onclick = () => {
      const selectAll = selected.size < rawFiles.length;
      grid.querySelectorAll('.fp-card').forEach((card, idx) => {
        const cb = card.querySelector('.fp-chk');
        cb.checked = selectAll;
        if (selectAll) { selected.add(idx); card.classList.add('selected'); }
        else { selected.delete(idx); card.classList.remove('selected'); }
      });
      updateCounter();
    };

    ov.querySelector('#fp-cancel').onclick = cleanupAndClose;

    pubBtn.onclick = async () => {
      const chosen = rawFiles.filter((_, idx) => selected.has(idx));
      if (!chosen.length) return;
      cleanupAndClose();
      await handleUpload(chosen);
      const exportBtn = document.getElementById('adm-export-all');
      if (exportBtn) exportBtn.click();
    };
  };
  fi.onchange = e => handleUpload(e.target.files);
  dz.ondragover = e => { e.preventDefault(); dz.classList.add('over'); };
  dz.ondragleave = () => dz.classList.remove('over');
  dz.ondrop = e => { e.preventDefault(); dz.classList.remove('over'); handleUpload(e.dataTransfer.files); };

  document.getElementById('adm-select-all').onclick = () => {
    const boxes = thumbsGrid.querySelectorAll('input[type="checkbox"]');
    const allChecked = Array.from(boxes).every(b => b.checked);
    boxes.forEach(b => b.checked = !allChecked);
  };

  document.getElementById('adm-del-pics').onclick = () => {
    const checked = Array.from(thumbsGrid.querySelectorAll('input:checked')).map(b => parseInt(b.dataset.idx, 10));
    if (!checked.length) { statusEl.textContent = 'Позначте чекбоксами картини для видалення.'; return; }
    const data = getData();
    const artist = data.find(a => a.id === artistSel.value);
    const sec = artist && artist.sections ? artist.sections.find(s => s.id === expSel.value) : null;
    if (!sec) return;
    if (!sec.customImages) sec.customImages = Array.from({ length: sec.artworksCount }, (_, i) => `./${sec.folder}/${i + 1}.webp`);
    sec.customImages = sec.customImages.filter((_, idx) => !checked.includes(idx));
    sec.artworksCount = sec.customImages.length;
    saveData(data);
    refreshUI(artist.id, sec.id);
    statusEl.textContent = `Видалено ${checked.length} картин.`;
  };

  document.getElementById('adm-export-all').onclick = async () => {
    const adminPin = localStorage.getItem('adminPin') || '';
    if (!adminPin) { statusEl.textContent = 'Потрібна повторна авторизація!'; return; }
    statusEl.textContent = 'Підготовка та публікація файлів у GitHub...';

    const clean = JSON.parse(JSON.stringify(getData()));
    const filesToUpload = [];
    let tplHtml = '';
    try { const tRes = await fetch('./hall-template.html'); if (tRes.ok) tplHtml = await tRes.text(); } catch {}

    clean.forEach(a => {
      if (tplHtml && a.pageUrl && a.pageUrl !== '#' && !['prymachenko.html', 'narbut.html', 'marchuk.html'].includes(a.pageUrl)) {
        const b64Page = btoa(unescape(encodeURIComponent(tplHtml)));
        filesToUpload.push({ path: a.pageUrl, contentBase64: b64Page });
      }
      (a.sections || []).forEach(s => {
        if (s.customImages) {
          s.customImages.forEach((src, i) => {
            if (src.startsWith('data:image/webp')) {
              const b64 = src.split(',').pop();
              filesToUpload.push({ path: `${s.folder}/${i + 1}.webp`, contentBase64: b64 });
            }
          });
          delete s.customImages;
          s.coverImage = `${s.folder}/1.webp`;
        }
      });
    });

    const jsText = 'const EXHIBITIONS_DATA = ' + JSON.stringify(clean, null, 2) + ';\n';
    const b64Js = btoa(unescape(encodeURIComponent(jsText)));
    filesToUpload.push({ path: 'gallery-data.js', contentBase64: b64Js });

    try {
      const res = await fetch(`${BACKEND_URL}/api/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPin, files: filesToUpload, commitMessage: 'Публікація через Адмін-студію 4i4' })
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || 'Помилка сервера');
      saveData(clean);
      statusEl.textContent = `Успішно опубліковано (${out.count} файлів)! Сайт оновиться за 30–40 сек.`;
    } catch (err) {
      statusEl.textContent = 'Помилка публікації: ' + err.message;
    }
  };

  document.getElementById('adm-logout').onclick = () => {
    localStorage.removeItem('adminPin');
    gear.classList.remove('authed');
    modal.classList.remove('open');
  };
})();