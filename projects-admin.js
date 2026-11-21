(function () {
  var SITE_BASE = "https://github.io";
  var apiBase = "https://fouri4-copilot-backend.onrender.com";
  var adminToken = sessionStorage.getItem("4i4_admin_token") || "";
  var memProjects = JSON.parse(localStorage.getItem("4i4_projects_draft") || "null") || JSON.parse(JSON.stringify(window.PROJECTS_DATA || []));
  var memMediaFiles = {};
  var editingIndex = 0;
  var activeTab = "content";
  var STAFF = [
    { id: "staff_01", name: "Олександр (Lead / AI)" },
    { id: "staff_02", name: "Марія (Арт-директор)" },
    { id: "staff_03", name: "Дмитро (Full-Stack)" }
  ];

  var gearBtn = document.getElementById("open-projects-admin");
  if (!gearBtn) return;

  function esc(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function buildCaseSeoHtml(p) {
    var seo = p.seo || {};
    var title = seo.metaTitle || (p.title + " — Студія «4і4»");
    var desc = seo.metaDescription || ("Кейс студії «4і4» («Чагарники і Чорнобривці»): " + p.title);
    var kw = seo.keywords || "студія 4і4, Чагарники і Чорнобривці, веб-розробка, AI";
    var schemaType = seo.schemaType || "SoftwareApplication";
    var canonical = SITE_BASE + "/projects/" + p.id + ".html";
    var ogImg = p.logo ? (SITE_BASE + "/" + p.logo.replace(/^\.\//, "")) : (SITE_BASE + "/poster1.png");

    var jsonLd = JSON.stringify({
      "@context": "https://schema.org",
      "@type": schemaType,
      "name": p.title,
      "description": desc,
      "url": canonical,
      "image": ogImg,
      "author": { "@type": "Organization", "name": "Студія «4і4» (Чагарники і Чорнобривці)", "url": SITE_BASE }
    }, null, 2);

    var blocksHtml = (p.blocks || []).map(function (b) {
      if (b.type === "text") return '<section style="margin-bottom:22px;"><h2 style="color:#bae6fd;font-size:1.25rem;margin-bottom:8px;">' + esc(b.title) + '</h2><p style="line-height:1.7;color:#cbd5e1;">' + esc(b.content) + '</p></section>';
      if (b.type === "metrics") return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:22px;">' + (b.items || []).map(function (m) { return '<div style="padding:16px;border-radius:16px;background:rgba(15,23,42,0.8);border:1px solid rgba(56,189,248,0.25);"><div style="font-size:1.4rem;font-weight:700;color:#38bdf8;">' + esc(m.value) + '</div><div style="font-size:0.85rem;color:#94a3b8;">' + esc(m.label) + '</div></div>'; }).join("") + '</div>';
      if (b.type === "gallery") return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin-bottom:22px;">' + (b.items || []).map(function (it) { var src = it.repoPath ? ("../" + it.repoPath) : it.src; return '<figure style="border-radius:14px;overflow:hidden;background:#0b132b;border:1px solid rgba(255,255,255,0.1);"><img src="' + esc(src) + '" alt="' + esc(it.alt || p.title) + '" style="width:100%;height:200px;object-fit:cover;display:block;"><figcaption style="padding:8px 12px;font-size:0.82rem;color:#94a3b8;">' + esc(it.caption) + '</figcaption></figure>'; }).join("") + '</div>';
      if (b.type === "video" && b.src) return '<section style="margin-bottom:22px;"><h2 style="color:#bae6fd;font-size:1.2rem;margin-bottom:8px;">' + esc(b.label) + '</h2><video src="../' + esc(b.src) + '" poster="../' + esc(b.poster || "") + '" controls style="width:100%;border-radius:16px;background:#000;"></video></section>';
      return "";
    }).join("\n");

    return [
      '<!DOCTYPE html>',
      '<html lang="uk">',
      '<head>',
      '  <meta charset="UTF-8">',
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
      '  <title>' + esc(title) + '</title>',
      '  <meta name="description" content="' + esc(desc) + '">',
      '  <meta name="keywords" content="' + esc(kw) + '">',
      '  <link rel="canonical" href="' + esc(canonical) + '">',
      '  <meta property="og:type" content="article">',
      '  <meta property="og:title" content="' + esc(title) + '">',
      '  <meta property="og:description" content="' + esc(desc) + '">',
      '  <meta property="og:image" content="' + esc(ogImg) + '">',
      '  <meta property="og:url" content="' + esc(canonical) + '">',
      '  <meta name="twitter:card" content="summary_large_image">',
      '  <script type="application/ld+json">' + jsonLd + '<\/script>',
      '  <script src="../page-transition.js"><\/script>',
      '  <style>*{box-sizing:border-box;margin:0;padding:0}body{min-height:100vh;background:radial-gradient(circle at 15% 20%,#0f1f42 0%,#060b19 65%);color:#f1f5f9;font-family:system-ui,-apple-system,sans-serif;padding:96px 24px 48px}.top-nav{position:fixed;top:0;left:0;width:100%;height:72px;padding:0 28px;display:flex;align-items:center;justify-content:space-between;background:rgba(6,11,25,0.88);backdrop-filter:blur(14px);border-bottom:1px solid rgba(255,255,255,0.08);z-index:900}.case-wrap{max-width:920px;margin:0 auto;background:rgba(13,22,45,0.78);backdrop-filter:blur(16px);border:1px solid rgba(56,189,248,0.25);border-radius:24px;padding:36px}.badge{display:inline-block;padding:5px 14px;border-radius:999px;font-size:0.8rem;background:rgba(16,185,129,0.15);color:#6ee7b7;border:1px solid rgba(16,185,129,0.35);margin-bottom:12px}h1{font-size:2rem;margin-bottom:24px}</style>',
      '</head>',
      '<body>',
      '  <header class="top-nav"><a href="../projects.html?project=' + esc(p.id) + '" class="neon-btn"><span>← Усі проєкти</span></a><a href="#cooperation" class="neon-btn"><span>Співпраця</span></a></header>',
      '  <main class="case-wrap"><article>',
      '    <span class="badge">' + esc(p.category || "Кейс студії 4і4") + '</span>',
      '    <h1>' + esc(p.title) + '</h1>',
      blocksHtml,
      '    <div style="margin-top:28px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.1);display:flex;gap:14px;flex-wrap:wrap;">',
      '      <a href="../projects.html?project=' + esc(p.id) + '" class="neon-btn"><span>Відкрити у вітрині проєктів →</span></a>',
      '      <a href="#cooperation" class="neon-btn"><span>Замовити схожий проєкт</span></a>',
      '    </div>',
      '  </article></main>',
      '  <script src="../cooperation-hub.js?v=20"><\/script>',
      '  <script src="../ui-neon-effects.js?v=19"><\/script>',
      '</body>',
      '</html>'
    ].join("\n");
  }

  function fileToWebp(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onerror = reject;
      r.onload = function () {
        if (file.type === "image/webp" || /\.webp$/i.test(file.name)) return resolve(r.result);
        var img = new Image();
        img.onload = function () {
          var c = document.createElement("canvas");
          c.width = img.width; c.height = img.height;
          c.getContext("2d").drawImage(img, 0, 0);
          resolve(c.toDataURL("image/webp", 0.88));
        };
        img.onerror = reject;
        img.src = r.result;
      };
      r.readAsDataURL(file);
    });
  }

  function ensureModal() {
    if (document.getElementById("projects-admin-modal")) return;
    var modal = document.createElement("div");
    modal.id = "projects-admin-modal";
    modal.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(4,8,20,0.92);backdrop-filter:blur(16px);display:none;align-items:center;justify-content:center;padding:20px;color:#f1f5f9;font-family:system-ui,sans-serif;";
    modal.innerHTML = [
      '<div style="width:100%;max-width:1080px;max-height:88vh;background:#0b132b;border:1px solid rgba(56,189,248,0.45);border-radius:24px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,0.8);">',
      '<div style="padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;justify-content:space-between;align-items:center;background:rgba(6,11,25,0.75);flex-shrink:0;">',
      '<h2 style="font-size:1.2rem;color:#38bdf8;">⚙ Адмін-студія «4і4» — Конструктор та SEO-комбайн</h2>',
      '<button id="close-projects-admin" style="background:none;border:none;color:#94a3b8;font-size:1.5rem;cursor:pointer;">✕</button>',
      '</div>',
      '<div id="admin-auth-box" style="padding:48px 24px;text-align:center;display:none;">',
      '<input type="password" id="admin-pass-input" placeholder="Пароль адміністратора..." style="padding:12px 20px;border-radius:999px;border:1px solid #38bdf8;background:#060b19;color:#fff;width:280px;margin-right:10px;">',
      '<button id="admin-login-btn" style="padding:12px 26px;border-radius:999px;background:#10b981;color:#060b19;font-weight:700;border:none;cursor:pointer;">Увійти</button>',
      '<p id="admin-auth-err" style="color:#f87171;margin-top:12px;"></p>',
      '</div>',
      '<div id="admin-workspace" style="padding:18px 24px;overflow-y:auto;display:none;flex-direction:column;gap:14px;flex:1;">',
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:12px;">',
      '<select id="admin-project-select" style="padding:9px 14px;border-radius:999px;background:#060b19;color:#fff;border:1px solid #38bdf8;min-width:210px;"></select>',
      '<button id="adm-proj-up" style="padding:8px 12px;border-radius:999px;background:#060b19;border:1px solid #475569;color:#fff;cursor:pointer;">▲</button>',
      '<button id="adm-proj-down" style="padding:8px 12px;border-radius:999px;background:#060b19;border:1px solid #475569;color:#fff;cursor:pointer;">▼</button>',
'<button id="adm-proj-new" style="padding:8px 14px;border-radius:999px;background:rgba(16,185,129,0.2);border:1px solid #10b981;color:#6ee7b7;cursor:pointer;">+ Новий</button>',
'<button id="adm-proj-dup" style="padding:8px 14px;border-radius:999px;background:#060b19;border:1px solid #475569;color:#e2e8f0;cursor:pointer;">Копія</button>',
'<button id="adm-proj-del" style="padding:8px 14px;border-radius:999px;background:rgba(239,68,68,0.18);border:1px solid #ef4444;color:#fca5a5;cursor:pointer;">Видалити</button>',
'<button id="adm-preview-btn" style="padding:8px 14px;border-radius:999px;background:#060b19;border:1px solid #38bdf8;color:#bae6fd;cursor:pointer;">👁 Прев\u02BCю</button>',
'<button id="adm-seo-dl-btn" style="padding:8px 14px;border-radius:999px;background:#060b19;border:1px solid #38bdf8;color:#bae6fd;cursor:pointer;">📄 SEO-сторінка</button>',
'<button id="adm-export-btn" style="padding:8px 14px;border-radius:999px;background:#060b19;border:1px solid #38bdf8;color:#bae6fd;cursor:pointer;">⬇ JS-файл</button>',
'<button id="adm-publish-btn" style="padding:8px 16px;border-radius:999px;background:linear-gradient(135deg,#0284c7,#2563eb);border:1px solid #38bdf8;color:#fff;font-weight:600;cursor:pointer;">🚀 Опублікувати</button><button id="adm-logout-btn" style="padding:8px 12px;border-radius:999px;background:transparent;border:1px solid #64748b;color:#94a3b8;cursor:pointer;">Вийти</button>',
'</div>',
'<div style="display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:10px;">',
'<button class="adm-tab" data-tab="content" style="padding:8px 16px;border-radius:999px;border:1px solid #38bdf8;background:rgba(56,189,248,0.2);color:#fff;cursor:pointer;">1. Картка та Блоки</button>',
'<button class="adm-tab" data-tab="actions" style="padding:8px 16px;border-radius:999px;border:1px solid #475569;background:transparent;color:#cbd5e1;cursor:pointer;">2. Кнопки дії (actions)</button>',
'<button class="adm-tab" data-tab="seo" style="padding:8px 16px;border-radius:999px;border:1px solid #475569;background:transparent;color:#cbd5e1;cursor:pointer;">3. SEO та Живий чат</button>',
'</div>',
'<div id="adm-tab-body" style="display:flex;flex-direction:column;gap:14px;"></div>',
'</div>'
].join("");
document.body.appendChild(modal);
document.getElementById("close-projects-admin").onclick = function () { modal.style.display = "none"; };
document.getElementById("admin-login-btn").onclick = verifyAdmin;
document.getElementById("admin-pass-input").addEventListener("keydown", function (e) { if (e.key === "Enter") verifyAdmin(); });
modal.querySelectorAll(".adm-tab").forEach(function (btn) {
btn.onclick = function () {
activeTab = btn.dataset.tab;
modal.querySelectorAll(".adm-tab").forEach(function (b) {
b.style.borderColor = b.dataset.tab === activeTab ? "#38bdf8" : "#475569";
b.style.background = b.dataset.tab === activeTab ? "rgba(56,189,248,0.2)" : "transparent";
});
renderWorkspace();
};
});
}
function verifyAdmin() {
var pass = document.getElementById("admin-pass-input").value.trim();
var err = document.getElementById("admin-auth-err");
if (!pass) return;
err.textContent = "Перевірка...";
fetch(apiBase + "/api/verify-admin", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ adminPin: pass })
}).then(function (res) {
if (!res.ok) throw new Error("Auth failed");
adminToken = pass; sessionStorage.setItem("4i4_admin_token", pass); localStorage.setItem("adminPin", pass); err.textContent = ""; openWorkspace();
}).catch(function () {
if (location.hostname === "127.0.0.1" || location.hostname === "localhost") {
adminToken = pass; sessionStorage.setItem("4i4_admin_token", pass); localStorage.setItem("adminPin", pass); err.textContent = ""; openWorkspace();
} else { err.textContent = "Невірний пароль або сервер Render недоступний."; }
});
}
function openWorkspace() {
document.getElementById("admin-auth-box").style.display = "none";
document.getElementById("admin-workspace").style.display = "flex";
var sel = document.getElementById("admin-project-select");
sel.onchange = function () { editingIndex = Number(sel.value); renderWorkspace(); };
document.getElementById("adm-proj-up").onclick = function () {
if (editingIndex > 0) { var t = memProjects[editingIndex-1]; memProjects[editingIndex-1] = memProjects[editingIndex]; memProjects[editingIndex] = t; editingIndex--; window.PROJECTS_DATA = JSON.parse(JSON.stringify(memProjects)); if (window.rebuildProjectsShowcase) window.rebuildProjectsShowcase(memProjects[editingIndex].id); renderWorkspace(); }
};
document.getElementById("adm-proj-down").onclick = function () {
if (editingIndex < memProjects.length-1) { var t = memProjects[editingIndex+1]; memProjects[editingIndex+1] = memProjects[editingIndex]; memProjects[editingIndex] = t; editingIndex++; window.PROJECTS_DATA = JSON.parse(JSON.stringify(memProjects)); if (window.rebuildProjectsShowcase) window.rebuildProjectsShowcase(memProjects[editingIndex].id); renderWorkspace(); }
};
document.getElementById("adm-proj-new").onclick = function () {
memProjects.push({ id: "project-" + Date.now().toString().slice(-5), title: "Новий проєкт 4і4", category: "AI / Веб-рішення", logo: "images/projects/copilot-logo.svg", accentColor: "#10b981", assignedStaffId: "staff_01", chatEnabled: true, seo: { metaTitle: "", metaDescription: "", keywords: "", schemaType: "SoftwareApplication" }, blocks: [{ type: "text", title: "Опис", content: "" }], actions: [{ label: "Обговорити", type: "coop", color: "gold" }] });
editingIndex = memProjects.length - 1; renderWorkspace();
};
document.getElementById("adm-proj-dup").onclick = function () {
var c = JSON.parse(JSON.stringify(memProjects[editingIndex])); c.id += "-copy"; c.title += " (Копія)";
memProjects.splice(editingIndex + 1, 0, c); editingIndex++; window.PROJECTS_DATA = JSON.parse(JSON.stringify(memProjects)); if (window.rebuildProjectsShowcase) window.rebuildProjectsShowcase(memProjects[editingIndex].id); renderWorkspace();
};
document.getElementById("adm-proj-del").onclick = function () { if (memProjects.length <= 1) { alert("Має залишитися хоча б один проєкт у вітрині."); return; } var cur = memProjects[editingIndex]; if (!confirm("Видалити проєкт «" + (cur.title || cur.id) + "»?")) return; memProjects.splice(editingIndex, 1); editingIndex = Math.max(0, editingIndex - 1); window.PROJECTS_DATA = JSON.parse(JSON.stringify(memProjects)); if (window.rebuildProjectsShowcase) window.rebuildProjectsShowcase(memProjects[editingIndex].id); renderWorkspace(); };
document.getElementById("adm-preview-btn").onclick = function () { window.PROJECTS_DATA = JSON.parse(JSON.stringify(memProjects)); if (typeof window.rebuildProjectsShowcase === "function") window.rebuildProjectsShowcase(memProjects[editingIndex].id); var box = document.getElementById("admin-workspace"); var rootModal = box ? box.parentElement.parentElement : null; if (rootModal) rootModal.style.display = "none"; };
document.getElementById("adm-seo-dl-btn").onclick = function () {
var cur = memProjects[editingIndex];
if (!cur) return;
var html = buildCaseSeoHtml(cur);
var a = document.createElement("a");
a.href = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
a.download = cur.id + ".html";
a.click();
};
document.getElementById("adm-export-btn").onclick = function () {
var a = document.createElement("a");
a.href = URL.createObjectURL(new Blob(["window.PROJECTS_DATA = " + JSON.stringify(memProjects, null, 2) + ";\n"], { type: "application/javascript;charset=utf-8" }));
a.download = "projects-data.js"; a.click();
};
document.getElementById("adm-publish-btn").onclick = function () {
var st = document.getElementById("adm-status-msg"); if (!st) { st = document.createElement("div"); st.id = "adm-status-msg"; st.style.cssText = "padding:6px 14px;font-size:12px;font-weight:600;"; var pubBtn = document.getElementById("adm-publish-btn"); if (pubBtn && pubBtn.parentElement) pubBtn.parentElement.appendChild(st); else document.body.appendChild(st); } st.style.color = "#38bdf8"; st.textContent = "Збереження карток та публікація в GitHub...";
var files = [{ path: "projects-data.js", content: "window.PROJECTS_DATA = " + JSON.stringify(memProjects, null, 2) + ";\n" }];
memProjects.forEach(function (pr) {
files.push({ path: "projects/" + pr.id + ".html", content: buildCaseSeoHtml(pr) });
});
Object.keys(memMediaFiles).forEach(function (path) { var parts = memMediaFiles[path].split(","); var b64 = parts[1] || parts[0]; if (b64) files.push({ path: path, contentBase64: b64 }); });
var commitMsg = "feat(seo): оновлення кейсів та SEO-сторінок 4і4";
var isLocal = (location.hostname === "127.0.0.1" || location.hostname === "localhost");
var targetUrl = isLocal ? "/api/local-publish" : (apiBase + "/api/publish");
var reqBody = isLocal ? { message: commitMsg, files: files } : { password: adminToken, message: commitMsg, files: files };

fetch(targetUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(reqBody) })
.then(function (r) { return r.json().catch(function () { return {}; }).then(function (data) { if (!r.ok || data.ok === false) throw new Error(data.error || data.push || ("HTTP " + r.status)); return data; }); })
.then(function () {
  window.PROJECTS_DATA = JSON.parse(JSON.stringify(memProjects));
  try { localStorage.removeItem("4i4_projects_draft"); } catch (e) {}
  if (typeof window.rebuildProjectsShowcase === "function") window.rebuildProjectsShowcase(memProjects[editingIndex].id);
  st.style.color = "#6ee7b7";
  st.textContent = isLocal
    ? ("✓ Збережено локально і запушено в GitHub (" + memProjects.length + " карток)!")
    : ("✓ Опубліковано (" + memProjects.length + " SEO-сторінок)!");
})
.catch(function (e) { st.style.color = "#f87171"; st.textContent = "Помилка: " + e.message; });
};
renderWorkspace();
}
function renderWorkspace() {
  var sel = document.getElementById("admin-project-select");
  sel.innerHTML = memProjects.map(function (pr, i) {
    return '<option value="' + i + '"' + (i === editingIndex ? ' selected' : '') + '>#' + (i + 1) + ' — ' + esc(pr.title || pr.id) + '</option>';
  }).join("");
  var p = memProjects[editingIndex];
  var body = document.getElementById("adm-tab-body");
  if (!p || !body) return;

  var inpStyle = 'padding:9px 14px;border-radius:999px;background:#060b19;border:1px solid #334155;color:#f8fafc;font-size:0.88rem;width:100%;';
  var cardStyle = 'background:rgba(15,23,42,0.85);border:1px solid rgba(56,189,248,0.28);border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:10px;';

  if (activeTab === "content") {
    p.blocks = p.blocks || [];
    var blocksHtml = p.blocks.map(function (b, idx) {
      var inner = "";
      if (b.type === "text") {
        inner = '<input data-b-idx="' + idx + '" data-b-key="title" value="' + esc(b.title || "") + '" placeholder="Заголовок блоку" style="' + inpStyle + '">' +
                '<textarea data-b-idx="' + idx + '" data-b-key="content" rows="3" placeholder="Текст блоку..." style="padding:10px 14px;border-radius:14px;background:#060b19;border:1px solid #334155;color:#f8fafc;width:100%;">' + esc(b.content || "") + '</textarea>';
      } else if (b.type === "video") {
        inner = '<input data-b-idx="' + idx + '" data-b-key="label" value="' + esc(b.label || "") + '" placeholder="Підпис відео" style="' + inpStyle + '">' +
                '<input data-b-idx="' + idx + '" data-b-key="src" value="' + esc(b.src || "") + '" placeholder="URL відео (.mp4 або embed)" style="' + inpStyle + '">' +
                '<input data-b-idx="' + idx + '" data-b-key="poster" value="' + esc(b.poster || "") + '" placeholder="URL постера (необовʼязково)" style="' + inpStyle + '">';
      } else if (b.type === "metrics") {
        inner = (b.items || []).map(function (m, mi) {
          return '<div style="display:flex;gap:8px;"><input data-b-idx="' + idx + '" data-m-idx="' + mi + '" data-m-key="label" value="' + esc(m.label || "") + '" placeholder="Назва показника" style="' + inpStyle + '">' +
                 '<input data-b-idx="' + idx + '" data-m-idx="' + mi + '" data-m-key="value" value="' + esc(m.value || "") + '" placeholder="Значення (напр. 99%)" style="' + inpStyle + '"></div>';
        }).join("") + '<button type="button" data-add-metric="' + idx + '" style="align-self:flex-start;padding:6px 14px;border-radius:999px;background:#0f172a;border:1px solid #38bdf8;color:#bae6fd;cursor:pointer;">+ Метрика</button>';
      } else if (b.type === "gallery") {
        inner = '<div style="display:flex;gap:8px;flex-wrap:wrap;">' + (b.items || []).map(function (it, gi) {
          return '<div style="position:relative;width:84px;height:84px;border-radius:10px;overflow:hidden;border:1px solid #38bdf8;">' +
                 '<img src="' + esc(it.src) + '" style="width:100%;height:100%;object-fit:cover;">' +
                 '<button type="button" data-del-gal="' + idx + ':' + gi + '" style="position:absolute;top:2px;right:2px;background:#ef4444;color:#fff;border:none;border-radius:999px;width:20px;height:20px;cursor:pointer;font-size:11px;">✕</button></div>';
        }).join("") + '</div>' +
        '<label style="display:inline-block;padding:7px 14px;border-radius:999px;background:rgba(16,185,129,0.2);border:1px solid #10b981;color:#6ee7b7;cursor:pointer;font-size:0.85rem;">+ Завантажити WebP/Фото<input type="file" data-gal-upload="' + idx + '" multiple accept="image/*" style="display:none;"></label>';
      }
      return '<div style="' + cardStyle + '">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;">' +
        '<strong style="color:#38bdf8;font-size:0.82rem;">БЛОК #' + (idx + 1) + ' — ' + b.type.toUpperCase() + '</strong>' +
        '<div style="display:flex;gap:6px;">' +
        '<button type="button" data-b-move="' + idx + ':-1" style="padding:4px 10px;border-radius:999px;background:#060b19;border:1px solid #475569;color:#fff;cursor:pointer;">▲</button>' +
        '<button type="button" data-b-move="' + idx + ':1" style="padding:4px 10px;border-radius:999px;background:#060b19;border:1px solid #475569;color:#fff;cursor:pointer;">▼</button>' +
        '<button type="button" data-b-del="' + idx + '" style="padding:4px 10px;border-radius:999px;background:rgba(239,68,68,0.2);border:1px solid #ef4444;color:#fca5a5;cursor:pointer;">✕</button>' +
        '</div></div>' + inner + '</div>';
    }).join("");

    body.innerHTML =
      '<div style="' + cardStyle + '">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
      '<div><label style="font-size:0.78rem;color:#94a3b8;">Назва проєкту</label><input data-p-field="title" value="' + esc(p.title || "") + '" style="' + inpStyle + '"></div>' +
      '<div><label style="font-size:0.78rem;color:#94a3b8;">ID (латиницею для URL)</label><input data-p-field="id" value="' + esc(p.id || "") + '" style="' + inpStyle + '"></div>' +
      '<div><label style="font-size:0.78rem;color:#94a3b8;">Категорія / бейдж</label><input data-p-field="category" value="' + esc(p.category || "") + '" style="' + inpStyle + '"></div>' +
      '<div><label style="font-size:0.78rem;color:#94a3b8;">Шлях до логотипа / обкладинки</label><input data-p-field="logo" value="' + esc(p.logo || "") + '" style="' + inpStyle + '"></div>' +
      '</div>' +
      '<div><label style="font-size:0.78rem;color:#94a3b8;">Короткий опис (підзаголовок)</label><input data-p-field="subtitle" value="' + esc(p.subtitle || "") + '" style="' + inpStyle + '"></div>' +
      '<div><label style="font-size:0.78rem;color:#94a3b8;">Колір неонового акценту</label><input type="color" data-p-field="accentColor" value="' + esc(p.accentColor || "#10b981") + '" style="width:100%;height:38px;border-radius:999px;border:1px solid #334155;background:#060b19;cursor:pointer;"></div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
      '<button type="button" data-add-block="text" style="padding:8px 14px;border-radius:999px;background:#0f172a;border:1px solid #38bdf8;color:#bae6fd;cursor:pointer;">+ Текст</button>' +
      '<button type="button" data-add-block="gallery" style="padding:8px 14px;border-radius:999px;background:#0f172a;border:1px solid #10b981;color:#6ee7b7;cursor:pointer;">+ Галерея WebP</button>' +
      '<button type="button" data-add-block="video" style="padding:8px 14px;border-radius:999px;background:#0f172a;border:1px solid #a855f7;color:#e9d5ff;cursor:pointer;">+ Відео</button>' +
      '<button type="button" data-add-block="metrics" style="padding:8px 14px;border-radius:999px;background:#0f172a;border:1px solid #f59e0b;color:#fde68a;cursor:pointer;">+ Метрики</button>' +
      '</div>' + blocksHtml;

    body.querySelectorAll("[data-p-field]").forEach(function (el) { el.oninput = function () { p[el.dataset.pField] = el.value; try { localStorage.setItem("4i4_projects_draft", JSON.stringify(memProjects)); } catch (e) {} }; });
    body.querySelectorAll("[data-b-key]").forEach(function (el) { el.oninput = function () { p.blocks[el.dataset.bIdx][el.dataset.bKey] = el.value; try { localStorage.setItem("4i4_projects_draft", JSON.stringify(memProjects)); } catch (e) {} }; });
    body.querySelectorAll("[data-m-key]").forEach(function (el) { el.oninput = function () { p.blocks[el.dataset.bIdx].items[el.dataset.mIdx][el.dataset.mKey] = el.value; }; });
    body.querySelectorAll("[data-add-metric]").forEach(function (btn) { btn.onclick = function () { p.blocks[btn.dataset.addMetric].items.push({ label: "Показник", value: "100%" }); renderWorkspace(); }; });
    body.querySelectorAll("[data-del-gal]").forEach(function (btn) {
      btn.onclick = function () {
        var pts = btn.dataset.delGal.split(":").map(Number);
        p.blocks[pts[0]].items.splice(pts[1], 1);
        renderWorkspace();
      };
    });
    body.querySelectorAll("[data-gal-upload]").forEach(function (inp) {
      inp.onchange = function () {
        var bIdx = Number(inp.dataset.galUpload);
        p.blocks[bIdx].items = p.blocks[bIdx].items || [];
        Array.from(inp.files).reduce(function (prom, file) {
          return prom.then(function () { return fileToWebp(file); }).then(function (webp) {
            var name = file.name.replace(/\.[^.]+$/, "") + ".webp";
            var rel = "images/projects/" + p.id + "/" + name;
            memMediaFiles[rel] = webp;
            p.blocks[bIdx].items.push({ src: webp, repoPath: rel, alt: p.title, caption: name });
          });
        }, Promise.resolve()).then(renderWorkspace);
      };
    });
body.querySelectorAll("[data-add-block]").forEach(function (btn) {
btn.onclick = function () {
var t = btn.dataset.addBlock;
if (t === "text") p.blocks.push({ type: "text", title: "Заголовок", content: "" });
if (t === "gallery") p.blocks.push({ type: "gallery", items: [] });
if (t === "video") p.blocks.push({ type: "video", label: "Відео", src: "", poster: "" });
if (t === "metrics") p.blocks.push({ type: "metrics", items: [{ label: "KPI", value: "99%" }] });
renderWorkspace();
};
});
body.querySelectorAll("[data-b-move]").forEach(function (btn) {
btn.onclick = function () {
var pts = btn.dataset.bMove.split(":").map(Number);
var i = pts[0], ni = pts[0] + pts[1];
if (ni >= 0 && ni < p.blocks.length) {
var tmp = p.blocks[i];
p.blocks[i] = p.blocks[ni];
p.blocks[ni] = tmp;
renderWorkspace();
}
};
});
body.querySelectorAll("[data-b-del]").forEach(function (btn) {
btn.onclick = function () { p.blocks.splice(Number(btn.dataset.bDel), 1); renderWorkspace(); };
});
}
if (activeTab === "actions") {
  p.actions = p.actions || [];
  var selStyle = "padding:8px 10px;border-radius:10px;border:1px solid rgba(56,189,248,0.4);background:#060b19;color:#f1f5f9;font-size:12px;";
  body.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:10px;flex-wrap:wrap;">' +
      '<span style="font-size:12px;color:#94a3b8;">Налаштуйте кнопки, які відображаються внизу картки проєкту:</span>' +
      '<button type="button" id="adm-add-act" style="padding:8px 14px;border-radius:999px;border:1px solid #10b981;background:rgba(16,185,129,0.16);color:#6ee7b7;font-size:12px;font-weight:700;cursor:pointer;">+ Додати кнопку</button>' +
    '</div>' +
    (p.actions.length === 0
      ? '<div style="padding:18px;text-align:center;border:1px dashed rgba(148,163,184,0.3);border-radius:14px;color:#94a3b8;font-size:12px;">Кнопок ще немає. Натисніть «+ Додати кнопку».</div>'
      : p.actions.map(function (a, idx) {
          var isLink = (!a.type || a.type === "link");
          var urlPlaceholder = isLink ? "https://... або сторінка.html" : "Автоматично для типу «" + a.type + "»";
          return '<div style="display:grid;grid-template-columns:1.2fr 1.1fr 1.4fr 0.8fr auto;gap:8px;align-items:center;padding:10px;margin-bottom:8px;border-radius:12px;background:rgba(6,11,25,0.75);border:1px solid rgba(56,189,248,0.28);">' +
            '<input data-a-idx="' + idx + '" data-a-key="label" value="' + esc(a.label || "") + '" placeholder="Назва кнопки" style="' + inpStyle + ';margin:0;">' +
            '<select data-a-idx="' + idx + '" data-a-key="type" style="' + selStyle + '">' +
              '<option value="link"' + (a.type === "link" ? " selected" : "") + '>🔗 Посилання (link)</option>' +
              '<option value="coop"' + (a.type === "coop" ? " selected" : "") + '>🤝 Співпраця (coop)</option>' +
              '<option value="chat"' + (a.type === "chat" ? " selected" : "") + '>💬 Живий чат (chat)</option>' +
              '<option value="copilot"' + (a.type === "copilot" ? " selected" : "") + '>🤖 AI-Копілот</option>' +
            '</select>' +
            '<input data-a-idx="' + idx + '" data-a-key="url" value="' + esc(a.url || "") + '" placeholder="' + urlPlaceholder + '"' + (isLink ? '' : ' disabled') + ' style="' + inpStyle + ';margin:0;' + (isLink ? '' : 'opacity:0.45;cursor:not-allowed;') + '">' +
            '<select data-a-idx="' + idx + '" data-a-key="color" style="' + selStyle + '">' +
              '<option value="cyan"' + ((a.color || "cyan") === "cyan" ? " selected" : "") + '>🔵 Cyan</option>' +
              '<option value="gold"' + (a.color === "gold" ? " selected" : "") + '>🟡 Gold</option>' +
              '<option value="orange"' + (a.color === "orange" ? " selected" : "") + '>🟠 Orange</option>' +
              '<option value="green"' + (a.color === "green" ? " selected" : "") + '>🟢 Green</option>' +
            '</select>' +
            '<button type="button" data-a-del="' + idx + '" title="Видалити кнопку" style="width:32px;height:32px;border-radius:8px;border:1px solid rgba(248,113,113,0.55);background:rgba(239,68,68,0.16);color:#fca5a5;font-weight:700;cursor:pointer;">✕</button>' +
          '</div>';
        }).join(""));

  var saveDraft = function () {
    try { localStorage.setItem("4i4_projects_draft", JSON.stringify(memProjects)); } catch (e) {}
  };
  body.querySelectorAll("[data-a-key]").forEach(function (el) {
    var handler = function () {
      var idx = Number(el.dataset.aIdx);
      var key = el.dataset.aKey;
      p.actions[idx][key] = el.value;
      saveDraft();
      if (key === "type") renderWorkspace();
    };
    el.oninput = handler;
    el.onchange = handler;
  });
  body.querySelectorAll("[data-a-del]").forEach(function (btn) {
    btn.onclick = function () {
      p.actions.splice(Number(btn.dataset.aDel), 1);
      saveDraft();
      renderWorkspace();
    };
  });
  var addActBtn = document.getElementById("adm-add-act");
  if (addActBtn) {
    addActBtn.onclick = function () {
      p.actions.push({ label: "Нова кнопка", type: "link", url: "https://", color: "cyan" });
      saveDraft();
      renderWorkspace();
    };
  }
}
if (activeTab === "seo") {
p.seo = p.seo || { metaTitle: "", metaDescription: "", keywords: "", schemaType: "SoftwareApplication" };
var stfOpts = STAFF.map(function (s) {
return '<option value="' + s.id + '"' + (p.assignedStaffId === s.id ? ' selected' : '') + '>' + esc(s.name) + '';
}).join("");
body.innerHTML =
'' +
'SEO Meta Title<input data-seo="metaTitle" value="' + esc(p.seo.metaTitle || "") + '" style="' + inpStyle + '">' +
'Тип Schema.org (JSON-LD)' +
'' +
'<option value="SoftwareApplication"' + (p.seo.schemaType === "SoftwareApplication" ? " selected" : "") + '>SoftwareApplication' +
'<option value="CreativeWork"' + (p.seo.schemaType === "CreativeWork" ? " selected" : "") + '>CreativeWork' +
'<option value="WebSite"' + (p.seo.schemaType === "WebSite" ? " selected" : "") + '>WebSite' +
'' +
'SEO Meta Description' +
'' + esc(p.seo.metaDescription || "") + '' +
'Ключові слова (Keywords)<input data-seo="keywords" value="' + esc(p.seo.keywords || "") + '" style="' + inpStyle + '">' +
'' +
'' +
'<input type="checkbox" id="adm-chat-tg"' + (p.chatEnabled ? " checked" : "") + '> Живий чат онлайн у картці проєкту' +
'Відповідальний оператор (Intercom)' + stfOpts + '' +
'Render Backend API URL' +
'';
body.querySelectorAll("[data-seo]").forEach(function (el) { el.oninput = function () { p.seo[el.dataset.seo] = el.value; }; });
var chatTg = document.getElementById("adm-chat-tg"); if (chatTg) chatTg.onchange = function (e) { p.chatEnabled = e.target.checked; };
var stfSel = document.getElementById("adm-stf-sel"); if (stfSel) stfSel.onchange = function (e) { p.assignedStaffId = e.target.value; };
var apiInp = document.getElementById("adm-api-inp"); if (apiInp) apiInp.oninput = function (e) { apiBase = e.target.value.trim(); localStorage.setItem("4i4_render_api", apiBase); };
}
var logoutBtn = document.getElementById("adm-logout-btn");
if (logoutBtn) {
logoutBtn.onclick = function () {
adminToken = "";
sessionStorage.removeItem("4i4_admin_token");
localStorage.removeItem("adminPin");
document.getElementById("admin-workspace").style.display = "none";
document.getElementById("admin-auth-box").style.display = "block";
};
}
}gearBtn.addEventListener("click", function () {
ensureModal();
document.getElementById("projects-admin-modal").style.display = "flex";
if (adminToken) openWorkspace();
else { document.getElementById("admin-auth-box").style.display = "block"; document.getElementById("admin-workspace").style.display = "none"; }
});
})();