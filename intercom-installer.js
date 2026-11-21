(function () {
  var BACKEND_URL = "https://" + "fouri4" + "-copilot-" + "backend." + "onrender.com";
  if (document.getElementById("i4-ext-dock")) return;

  var style = document.createElement("style");
  style.textContent = [
    "#i4-ext-dock{position:fixed;bottom:20px;right:78px;z-index:960;font-family:inherit;}",
    "#i4-ext-trigger{width:48px;height:48px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-size:1.25rem;color:#10b981;background:rgba(6,11,25,0.92);border:1px solid rgba(16,185,129,0.55);box-shadow:0 8px 24px rgba(0,0,0,0.45),0 0 14px rgba(16,185,129,0.2);cursor:pointer;transition:transform .2s ease,box-shadow .2s ease;}",
    "#i4-ext-dock:hover #i4-ext-trigger,#i4-ext-dock.open #i4-ext-trigger{transform:translateY(-2px);box-shadow:0 12px 28px rgba(0,0,0,0.55),0 0 20px rgba(16,185,129,0.45);border-color:#10b981;}",
    "#i4-ext-popover{position:absolute;bottom:58px;right:0;width:310px;padding:16px 18px;border-radius:22px;background:rgba(6,11,25,0.96);backdrop-filter:blur(16px);border:1px solid rgba(56,189,248,0.45);box-shadow:0 18px 42px rgba(0,0,0,0.65),0 0 24px rgba(56,189,248,0.18);color:#e2e8f0;opacity:0;visibility:hidden;transform:translateY(8px);transition:opacity .22s ease,transform .22s ease,visibility .22s;}",
    "#i4-ext-dock:hover #i4-ext-popover,#i4-ext-dock.open #i4-ext-popover{opacity:1;visibility:visible;transform:translateY(0);}",
    ".i4-ext-badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:.72rem;font-weight:700;letter-spacing:.04em;background:rgba(16,185,129,0.16);color:#6ee7b7;border:1px solid rgba(16,185,129,0.4);margin-bottom:8px;}",
    ".i4-ext-title{margin:0 0 6px;font-size:1rem;font-weight:700;color:#fff;}",
    ".i4-ext-desc{margin:0 0 10px;font-size:.82rem;line-height:1.45;color:#94a3b8;}",
    ".i4-ext-list{margin:0 0 12px;padding:0;list-style:none;font-size:.79rem;color:#cbd5e1;display:grid;gap:4px;}",
    ".i4-ext-row{display:flex;gap:6px;align-items:center;}",
    ".i4-ext-pin{flex:1;min-width:0;padding:8px 13px;border-radius:999px;background:rgba(15,23,42,0.9);border:1px solid rgba(56,189,248,0.4);color:#fff;font-size:.82rem;outline:none;}",
    ".i4-ext-pin:focus{border-color:#38bdf8;box-shadow:0 0 0 2px rgba(56,189,248,0.2);}",
    ".i4-ext-btn{padding:8px 14px;border-radius:999px;border:none;background:linear-gradient(135deg,#10b981,#059669);color:#04130d;font-weight:700;font-size:.82rem;cursor:pointer;white-space:nowrap;transition:filter .15s;}",
    ".i4-ext-btn:hover{filter:brightness(1.1);}",
    ".i4-ext-btn:disabled{opacity:.6;cursor:wait;}",
    ".i4-ext-msg{margin-top:8px;font-size:.78rem;line-height:1.4;color:#6ee7b7;}"
  ].join("");
  document.head.appendChild(style);

  var dock = document.createElement("div");
  dock.id = "i4-ext-dock";

  var trigger = document.createElement("button");
  trigger.type = "button";
  trigger.id = "i4-ext-trigger";
  trigger.title = "4i4 Studio Intercom — Встановити розширення";
  trigger.textContent = "🎧";

  var pop = document.createElement("div");
  pop.id = "i4-ext-popover";

  var badge = document.createElement("span");
  badge.className = "i4-ext-badge";
  badge.textContent = "CHROME EXTENSION • MV3";

  var title = document.createElement("h4");
  title.className = "i4-ext-title";
  title.textContent = "4i4 Studio Intercom";

  var desc = document.createElement("p");
  desc.className = "i4-ext-desc";
  desc.textContent = "Операторський пульт студії «4і4» для миттєвого зв'язку з клієнтами прямо з браузера:";

  var list = document.createElement("ul");
  list.className = "i4-ext-list";
  [
    "💬 Живі чати клієнтів та повна історія сесій",
    "📞 WebRTC аудіо/відео дзвінки та показ екрана",
    "🔗 Генератор Magic Call Link в один клік",
    "🔔 Фонові сповіщення та звуковий рингтон"
  ].forEach(function (txt) {
    var li = document.createElement("li");
    li.textContent = txt;
    list.appendChild(li);
  });

  var row = document.createElement("div");
  row.className = "i4-ext-row";

  var pinInput = document.createElement("input");
  pinInput.type = "password";
  pinInput.className = "i4-ext-pin";
  pinInput.placeholder = "LOAD_PIN";
  pinInput.inputMode = "numeric";
  pinInput.value = localStorage.getItem("loadPin") || "";

  var installBtn = document.createElement("button");
  installBtn.type = "button";
  installBtn.className = "i4-ext-btn";
  installBtn.textContent = "⬇ Встановити";

  var statusEl = document.createElement("div");
  statusEl.className = "i4-ext-msg";

  row.appendChild(pinInput);
  row.appendChild(installBtn);
  pop.appendChild(badge);
  pop.appendChild(title);
  pop.appendChild(desc);
  pop.appendChild(list);
  pop.appendChild(row);
  pop.appendChild(statusEl);
  dock.appendChild(trigger);
  dock.appendChild(pop);
  document.body.appendChild(dock);

  var currentExtVersion = "";
  fetch("4i4-intercom-ext/manifest.json?v=" + Date.now())
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (m) {
      if (m && m.version) {
        currentExtVersion = String(m.version).trim();
        badge.textContent = "CHROME EXTENSION • MV3 • v" + currentExtVersion;
      }
    })
    .catch(function () {});

  trigger.addEventListener("click", function () {
    dock.classList.toggle("open");
    if (dock.classList.contains("open")) pinInput.focus();
  });

  async function handleInstall() {
    var pin = pinInput.value.trim();
    if (!pin) {
      statusEl.style.color = "#f87171";
      statusEl.textContent = "Введіть LOAD_PIN для завантаження.";
      pinInput.focus();
      return;
    }
    installBtn.disabled = true;
    statusEl.style.color = "#38bdf8";
    statusEl.textContent = "Перевірка LOAD_PIN через Render...";

    try {
      var res = await fetch(BACKEND_URL + "/api/verify-load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loadPin: pin })
      });
      if (!res.ok) {
        statusEl.style.color = "#f87171";
        statusEl.textContent = "Доступ заборонено: невірний LOAD_PIN.";
        installBtn.disabled = false;
        return;
      }
      localStorage.setItem("loadPin", pin);

      if (!currentExtVersion) {
        try {
          var mRes = await fetch("4i4-intercom-ext/manifest.json?v=" + Date.now());
          if (mRes.ok) {
            var mData = await mRes.json();
            if (mData && mData.version) currentExtVersion = String(mData.version).trim();
          }
        } catch (err) {}
      }

      var fileName = currentExtVersion
        ? ("4i4-intercom-ext-v" + currentExtVersion + ".zip")
        : "4i4-intercom-ext.zip";

      statusEl.style.color = "#6ee7b7";
      statusEl.textContent = "PIN підтверджено! Завантажуємо " + fileName + "...";

      var zipRes = await fetch(fileName + "?t=" + Date.now());
      if (!zipRes.ok) {
        zipRes = await fetch("4i4-intercom-ext.zip?t=" + Date.now());
      }
      if (!zipRes.ok) throw new Error("ZIP not found");

      var directHref = zipRes.ok ? fileName : "4i4-intercom-ext.zip";
      var downloadName = zipRes.ok ? fileName : ("4i4-intercom-ext-v" + (currentExtVersion || "1.0.0") + ".zip");
      var a = document.createElement("a");
      a.style.display = "none";
      a.href = directHref;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        if (a.parentNode) a.parentNode.removeChild(a);
      }, 3000);

      statusEl.textContent = "✅ Архів " + fileName + " завантажено! Розпакуйте його → відкрийте chrome://extensions → увімкніть «Режим розробника» → «Завантажити розпаковане».";
    } catch (e) {
statusEl.style.color = "#f87171";
statusEl.textContent = "Помилка з'єднання з сервером перевірки. Спробуйте ще раз.";
} finally {
installBtn.disabled = false;
}
}
installBtn.addEventListener("click", handleInstall);
pinInput.addEventListener("keydown", function (e) {
if (e.key === "Enter") handleInstall();
});
})();rn