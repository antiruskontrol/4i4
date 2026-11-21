const DEFAULT_SB_URL = "https://supabase.co";
const DEFAULT_SB_KEY = "sb_publishable_RoJhAV7fKgo2XsK8sWTKQQ_Pok8i6oK";
const ADMIN_BACKEND_URL = "https://" + "fouri4" + "-copilot-" + "backend." + "onrender.com";
let STAFF_SLOTS = [
  { id: "staff_01", name: "" },
  { id: "staff_02", name: "" },
  { id: "staff_03", name: "" }
];
let isAdminUnlocked = false;
let localPeer = null;
let selectedSessionId = null;
let clearedAfterId = {};
let activePollTimer = null;

function normalizeSlots(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return STAFF_SLOTS;
  return raw.map(function (item) {
    if (typeof item === "string") return { id: item, name: "" };
    return { id: item.id || "staff_01", name: item.name || "" };
  });
}

function resolveSbCfg(cfg) {
  return {
    sbUrl: (cfg && cfg.sbUrl) ? cfg.sbUrl : DEFAULT_SB_URL,
    sbKey: (cfg && cfg.sbKey) ? cfg.sbKey : DEFAULT_SB_KEY
  };
}

function rebuildStaffUI(selectedId) {
  var topSel = document.getElementById("staff-select");
  var cfgSel = document.getElementById("cfg-slot-select");
  var cur = selectedId || (topSel ? topSel.value : "staff_01") || "staff_01";
  if (!STAFF_SLOTS.some(function (s) { return s.id === cur; })) {
    cur = STAFF_SLOTS[0] ? STAFF_SLOTS[0].id : "staff_01";
  }

  if (topSel) {
    topSel.innerHTML = "";
    STAFF_SLOTS.forEach(function (s) {
      var opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.name ? (s.name + " (" + s.id + ")") : s.id;
      topSel.appendChild(opt);
    });
    topSel.value = cur;
  }

  if (cfgSel) {
    cfgSel.innerHTML = "";
    STAFF_SLOTS.forEach(function (s) {
      var opt = document.createElement("option");
      opt.value = s.id;
      var isMine = (s.id === cur);
      if (isMine) {
        opt.textContent = s.id + " — ваш поточний" + (s.name ? " (" + s.name + ")" : "");
      } else if (s.name) {
        opt.textContent = s.id + " — зайнято (" + s.name + ")";
      } else {
        opt.textContent = s.id + " — вільний стаф";
      }
      cfgSel.appendChild(opt);
    });
    cfgSel.value = cur;
  }

  renderAdminSlotsList(); if (typeof loadAdminDialogs === 'function' && isAdminUnlocked) loadAdminDialogs();
  updateStaffSelectLabels();
}

function renderAdminSlotsList() {
  var box = document.getElementById("admin-slots-list");
  if (!box) return;
  box.innerHTML = "";
  STAFF_SLOTS.forEach(function (s) {
    var row = document.createElement("label");
    row.style.cssText = "display:flex;align-items:center;gap:8px;margin:0;padding:5px 8px;border-radius:8px;background:rgba(15,23,42,0.85);color:#e2e8f0;font-size:11px;cursor:pointer;";
    var cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = s.id;
    cb.disabled = (s.id === "staff_01");
    var lbl = document.createElement("span");
    lbl.textContent = s.id + " — " + (s.name ? s.name : "вільний") + (s.id === "staff_01" ? " (базовий)" : "");
    row.appendChild(cb);
    row.appendChild(lbl);
    box.appendChild(row);
  });
}
function switchTab(tabName) {
  document.querySelectorAll(".tab").forEach(function(x) {
    x.classList.toggle("active", x.getAttribute("data-t") === tabName);
  });
  document.querySelectorAll(".pane").forEach(function(x) {
    x.classList.toggle("active", x.id === "pane-" + tabName);
  });
  if (tabName === "clients") {
    chrome.storage.local.get(["sbUrl", "sbKey"], function(cfg) { loadClients(resolveSbCfg(cfg)); });
  }
}

document.querySelectorAll(".tab").forEach(function(b) {
  b.addEventListener("click", function() { switchTab(b.getAttribute("data-t")); });
});

function setBadge(status) {
  var txt = "ON";
  var clr = "#16a34a";
  if (status === "busy") { txt = "BUSY"; clr = "#dc2626"; }
  else if (status === "offline") { txt = "OFF"; clr = "#475569"; }
  chrome.action.setBadgeText({ text: txt });
  chrome.action.setBadgeBackgroundColor({ color: clr });
}

function getStaffDisplay() {
  var sel = document.getElementById("staff-select");
  var stId = sel ? sel.value : "staff_01";
  var inp = document.getElementById("staff-name");
  var nm = inp ? inp.value.trim() : "";
  return nm ? (nm + " (" + stId + ")") : stId;
}

function updateStaffSelectLabels() {
  var sel = document.getElementById("staff-select");
  var inp = document.getElementById("staff-name");
  if (!sel) return;
  var nm = inp ? inp.value.trim() : "";
  Array.from(sel.options).forEach(function(opt) {
    opt.textContent = (opt.value === sel.value && nm) ? (nm + " (" + opt.value + ")") : opt.value;
  });
}

function callPeer(targetId) {
  navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(function(stream) {
    if (!localPeer) localPeer = new Peer();
    localPeer.on("open", function() {
      const call = localPeer.call(targetId, stream);
      call.on("stream", function(rem) { document.getElementById("team-audio").srcObject = rem; });
    });
  }).catch(function(err) {
    alert("Помилка доступу до мікрофона: " + err.message);
  });
}

function renderTeam(myId) {
  const box = document.getElementById("team-box");
  box.innerHTML = "";
  STAFF_SLOTS.forEach(function(slotObj) { var id = slotObj.id;
    if (id === myId) return;
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = "<strong>Співробітник " + id + "</strong><div class='row'><button class='btn' data-a='1'>🎙 Аудіодзвінок</button><button class='btn' data-v='1'>📹 Відеозв'язок</button></div>";
    div.querySelector("[data-a]").addEventListener("click", function() { callPeer("4i4_staff_" + id); });
    div.querySelector("[data-v]").addEventListener("click", function() { callPeer("4i4_staff_" + id); });
    box.appendChild(div);
  });
}

async function loadMessages(cfg, sid, container, clientLabel, forceHistory) {
  try {
    const r = await fetch(cfg.sbUrl + "/rest/v1/chat_messages?session_id=eq." + encodeURIComponent(sid) + "&order=id.asc", {
      headers: { apikey: cfg.sbKey }
    });
    const rows = await r.json();
    if (!Array.isArray(rows)) return;

    if (forceHistory) {
      delete clearedAfterId[sid];
    }

    const minId = clearedAfterId[sid] || 0;
    const visibleRows = rows.filter(function(m) { return !m.id || m.id > minId; });
    const prevScrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 30;

    container.innerHTML = "";
    container._lastRows = rows;
    container._visibleRows = visibleRows;

    if (visibleRows.length === 0) {
      container.innerHTML = "<div class='msg' style='color:#64748b;'>Поле виводу порожнє. Натисніть 📜 Історія, щоб завантажити попередній діалог.</div>";
      return;
    }

    visibleRows.forEach(function(m) {
      const p = document.createElement("div");
      p.className = "msg " + (m.sender === "staff" ? "staff" : "");
      const stName = (!m.file_url && m.file_name) ? m.file_name : getStaffDisplay();
      const author = m.sender === "staff" ? stName : (clientLabel || "Клієнт");
      const textVal = m.content || m.text || "";

const spanAuthor = document.createElement("span");
spanAuthor.className = "msg-author";
spanAuthor.textContent = "[" + author + "]: ";
const spanText = document.createElement("span");
spanText.textContent = textVal;
p.appendChild(spanAuthor);
p.appendChild(spanText);
container.appendChild(p);
});
if (prevScrollBottom || forceHistory) {
container.scrollTop = container.scrollHeight;
}
} catch (e) {
container.innerHTML = "Помилка читання чату";
}
}
function renderActiveSessionCard(cfg, sessionObj, allSessions) {
  const box = document.getElementById("sessions-box");
  if (!sessionObj) return;
  selectedSessionId = sessionObj.id;

  const proj = sessionObj.project_id || "ai-copilot-4i4";
  const clientTitle = sessionObj.client_name || "Клієнт";
  const magic = "https://antiruskontrol.github.io/4i4/projects.html?project=" + encodeURIComponent(proj) + "&room=" + encodeURIComponent(sessionObj.id);

  box.innerHTML = "";
  const card = document.createElement("div");
  card.className = "card";

  const head = document.createElement("div");
  head.className = "dialog-head";

  const titleWrap = document.createElement("div");
  const nameStrong = document.createElement("strong");
  nameStrong.style.color = "#10b981";
  nameStrong.textContent = clientTitle + " ";
  const projSpan = document.createElement("span");
  projSpan.style.fontSize = "11px";
  projSpan.style.color = "#94a3b8";
  projSpan.textContent = "(" + proj + ")";
  titleWrap.appendChild(nameStrong);
  titleWrap.appendChild(projSpan);

  const tools = document.createElement("div");
  tools.className = "dialog-tools";

  const copyBtn = document.createElement("button");
  copyBtn.className = "icon-btn";
  copyBtn.title = "Копіювати діалог";
  copyBtn.textContent = "📋";

  const clearBtn = document.createElement("button");
  clearBtn.className = "icon-btn";
  clearBtn.title = "Очистити поле виводу";
  clearBtn.textContent = "🧹";

  const histBtn = document.createElement("button");
  histBtn.className = "icon-btn";
  histBtn.title = "Історія (завантажити попередній діалог)";
  histBtn.textContent = "📜";

  tools.appendChild(copyBtn);
  tools.appendChild(clearBtn);
  tools.appendChild(histBtn);
  head.appendChild(titleWrap);
  head.appendChild(tools);

  const msgsEl = document.createElement("div");
  msgsEl.className = "msgs";

  const rowSend = document.createElement("div");
  rowSend.className = "row";
  const inp = document.createElement("input");
  inp.style.flex = "1";
  inp.placeholder = "Відповідь клієнту...";
  const sendBtn = document.createElement("button");
  sendBtn.className = "btn";
  sendBtn.textContent = "Надіслати";
  rowSend.appendChild(inp);
  rowSend.appendChild(sendBtn);

  const rowActions = document.createElement("div");
  rowActions.className = "row";
  const callBtn = document.createElement("button");
  callBtn.className = "btn";
  callBtn.textContent = "📞 Виклик";
  const linkBtn = document.createElement("button");
  linkBtn.className = "btn";
  linkBtn.textContent = "🔗 Magic Call Link";
  rowActions.appendChild(callBtn);
  rowActions.appendChild(linkBtn);

  card.appendChild(head);
  card.appendChild(msgsEl);
  card.appendChild(rowSend);
  card.appendChild(rowActions);

  loadMessages(cfg, sessionObj.id, msgsEl, clientTitle, false);

  if (activePollTimer) clearInterval(activePollTimer);
  activePollTimer = setInterval(function() {
    if (!document.body.contains(card) || selectedSessionId !== sessionObj.id) {
      clearInterval(activePollTimer);
      return;
    }
    loadMessages(cfg, sessionObj.id, msgsEl, clientTitle, false);
  }, 2200);

  copyBtn.addEventListener("click", function() {
    const rows = msgsEl._visibleRows || [];
    if (rows.length === 0) return;
    const plain = rows.map(function(m) {
      const stName = (!m.file_url && m.file_name) ? m.file_name : getStaffDisplay();
      const author = m.sender === "staff" ? stName : clientTitle;
      return "[" + author + "]: " + (m.content || m.text || "");
    }).join("\n");
    navigator.clipboard.writeText(plain).then(function() {
      copyBtn.textContent = "✅";
      setTimeout(function() { copyBtn.textContent = "📋"; }, 1400);
    });
  });

  clearBtn.addEventListener("click", function() {
    const allRows = msgsEl._lastRows || [];
    const maxId = allRows.reduce(function(acc, m) { return (m.id && m.id > acc) ? m.id : acc; }, 0);
    clearedAfterId[sessionObj.id] = maxId;
    msgsEl.textContent = "";
    const emptyNote = document.createElement("div");
    emptyNote.className = "msg";
    emptyNote.style.color = "#64748b";
    emptyNote.textContent = "Поле виводу очищено. Натисніть 📜 Історія для перегляду попередніх повідомлень.";
    msgsEl.appendChild(emptyNote);
    msgsEl._visibleRows = [];
  });

  histBtn.addEventListener("click", function() {
    histBtn.textContent = "⏳";
    loadMessages(cfg, sessionObj.id, msgsEl, clientTitle, true).then(function() {
      histBtn.textContent = "📜";
    });
  });

  async function sendReply() {
    const val = inp.value.trim();
    if (!val) return;
    inp.value = "";
    await fetch(cfg.sbUrl + "/rest/v1/chat_messages", {
      method: "POST",
      headers: { apikey: cfg.sbKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionObj.id,
        project_id: proj,
        sender: "staff",
        text: val,
        file_name: getStaffDisplay()
      })
    });
    loadMessages(cfg, sessionObj.id, msgsEl, clientTitle, false);
  }

  sendBtn.addEventListener("click", sendReply);
  inp.addEventListener("keydown", function(e) { if (e.key === "Enter") sendReply(); });

  callBtn.addEventListener("click", function() { callPeer("4i4_client_" + sessionObj.id); });
  linkBtn.addEventListener("click", function() {
    navigator.clipboard.writeText(magic);
    linkBtn.textContent = "✅ Скопійовано";
    setTimeout(function() { linkBtn.textContent = "🔗 Magic Call Link"; }, 1400);
  });

  box.appendChild(card);
  renderClientsDropdown(cfg, allSessions);
}
function renderClientsDropdown(cfg, sessions) {
const dd = document.getElementById("clients-dropdown");
if (!dd) return;
dd.innerHTML = "";
if (!Array.isArray(sessions) || sessions.length === 0) {
dd.innerHTML = "Немає активних клієнтів";
return;
}
sessions.forEach(function(s) {
const item = document.createElement("div");
item.className = "client-dd-item" + (s.id === selectedSessionId ? " active" : "");
const cName = s.client_name || "Клієнт";
const pName = s.project_id || "проєкт";
item.innerHTML = "" + cName + "" + pName + "";
item.addEventListener("click", function() {
switchTab("clients");
renderActiveSessionCard(cfg, s, sessions);
});
dd.appendChild(item);
});
}
async function loadClients(cfg) {
const box = document.getElementById("sessions-box");
if (!cfg.sbUrl || !cfg.sbKey) {
box.innerHTML = "Supabase ще не підключеноПерейдіть у вкладку «Налаштування», вставте SUPABASE_URL та SUPABASE_ANON_KEY і натисніть «Зберегти ключі».Відкрити налаштування";
document.getElementById("go-cfg-btn").addEventListener("click", function() { switchTab("cfg"); });
return;
}
box.innerHTML = "Оновлення списку клієнтів із Supabase...";
try {
const res = await fetch(cfg.sbUrl + "/rest/v1/chat_sessions?select=*&order=updated_at.desc&limit=25", {
headers: { apikey: cfg.sbKey }
});
if (!res.ok) {
box.innerHTML = "Помилка Supabase (" + res.status + "). Перевірте налаштування.";
return;
}
const sessions = await res.json();
renderClientsDropdown(cfg, sessions);
if (!Array.isArray(sessions) || sessions.length === 0) {
box.innerHTML = "Активних діалогів поки немаєНапишіть тестове повідомлення у віджеті чату на сторінці projects.html.";
return;
}
var activeSession = sessions.find(function(x) { return x.id === selectedSessionId; }); if (!activeSession) activeSession = sessions.slice(0, 1).pop();
renderActiveSessionCard(cfg, activeSession, sessions);
} catch (err) {
    box.innerHTML = "<div class='card' style='color:#f87171;'>Error: " + (err && err.message ? err.message : String(err)) + "</div>";
  }
}

chrome.storage.local.get(["staffId", "staffName", "status", "sbUrl", "sbKey", "staffList"], function(rawCfg) {
  STAFF_SLOTS = normalizeSlots(rawCfg.staffList);
  const cfg = resolveSbCfg(rawCfg);
  if (!rawCfg.sbUrl || !rawCfg.sbKey) {
    chrome.storage.local.set({ sbUrl: cfg.sbUrl, sbKey: cfg.sbKey });
  }
  const st = rawCfg.staffId || "staff_01";
  const md = rawCfg.status || "online";
  if (rawCfg.staffName) {
    STAFF_SLOTS = STAFF_SLOTS.map(function (s) {
      return s.id === st ? { id: s.id, name: rawCfg.staffName } : s;
    });
  }
  rebuildStaffUI(st);
  document.getElementById("status-select").value = md;
  document.getElementById("sb-url").value = cfg.sbUrl;
  document.getElementById("sb-key").value = cfg.sbKey;
  if (document.getElementById("staff-name")) {
    document.getElementById("staff-name").value = rawCfg.staffName || "";
  }
  updateStaffSelectLabels();
  setBadge(md);
  renderTeam(document.getElementById("staff-select").value);
  loadClients(cfg);
});

document.getElementById("staff-select").addEventListener("change", function(e) {
  var newId = e.target.value;
  var slot = STAFF_SLOTS.find(function (s) { return s.id === newId; });
  var nm = slot ? slot.name : "";
  if (document.getElementById("staff-name")) document.getElementById("staff-name").value = nm;
  chrome.storage.local.set({ staffId: newId, staffName: nm });
  chrome.runtime.sendMessage({ type: "REINIT_PEER", staffId: newId }).catch(function() {});
  rebuildStaffUI(newId);
  renderTeam(newId);
});

document.getElementById("status-select").addEventListener("change", function(e) {
  chrome.storage.local.set({ status: e.target.value });
  setBadge(e.target.value);
});

document.getElementById("save-cfg").addEventListener("click", function() {
  var chosenId = document.getElementById("cfg-slot-select") ? document.getElementById("cfg-slot-select").value : document.getElementById("staff-select").value;
  var staffName = document.getElementById("staff-name") ? document.getElementById("staff-name").value.trim() : "";
  STAFF_SLOTS = STAFF_SLOTS.map(function (s) {
    return s.id === chosenId ? { id: s.id, name: staffName } : s;
});
chrome.storage.local.set({ staffId: chosenId, staffName: staffName, staffList: STAFF_SLOTS }, function() {
chrome.runtime.sendMessage({ type: "REINIT_PEER", staffId: chosenId }).catch(function() {});
rebuildStaffUI(chosenId);
renderTeam(chosenId);
document.getElementById("cfg-info").textContent = "✅ Профіль збережено!";
setTimeout(function () { document.getElementById("cfg-info").textContent = ""; switchTab("clients"); }, 550);
});
});
document.getElementById("toggle-admin-login").addEventListener("click", function () {
var authBox = document.getElementById("admin-auth-box");
var panelBox = document.getElementById("admin-panel-box");
if (isAdminUnlocked) {
panelBox.style.display = (panelBox.style.display === "none") ? "block" : "none";
return;
}
authBox.style.display = (authBox.style.display === "none") ? "block" : "none";
if (authBox.style.display === "block") document.getElementById("admin-pin-input").focus();
});
async function verifyAndUnlockAdmin() {
var pinInp = document.getElementById("admin-pin-input");
var statusEl = document.getElementById("admin-auth-status");
var btn = document.getElementById("admin-login-btn");
var pin = pinInp ? pinInp.value.trim() : "";
if (!pin) { statusEl.textContent = "Введіть ADMIN_PIN."; return; }
btn.disabled = true;
statusEl.style.color = "#38bdf8";
statusEl.textContent = "Перевірка через Render...";
try {
var res = await fetch(ADMIN_BACKEND_URL + "/api/verify-admin", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ adminPin: pin })
});
if (!res.ok) {
statusEl.style.color = "#f87171";
statusEl.textContent = "Невірний ADMIN_PIN.";
btn.disabled = false;
return;
}
isAdminUnlocked = true;
pinInp.value = "";
statusEl.textContent = "";
document.getElementById("admin-auth-box").style.display = "none";
document.getElementById("admin-panel-box").style.display = "block";
renderAdminSlotsList(); if (typeof loadAdminDialogs === 'function' && isAdminUnlocked) loadAdminDialogs();
} catch (e) {
statusEl.style.color = "#f87171";
statusEl.textContent = "Помилка з'єднання з Render.";
} finally {
btn.disabled = false;
}
}
document.getElementById("admin-login-btn").addEventListener("click", verifyAndUnlockAdmin);
document.getElementById("admin-pin-input").addEventListener("keydown", function (e) { if (e.key === "Enter") verifyAndUnlockAdmin(); });
document.getElementById("admin-logout-btn").addEventListener("click", function () {
isAdminUnlocked = false;
document.getElementById("admin-panel-box").style.display = "none";
});
document.getElementById("add-slot-btn").addEventListener("click", function () {
if (!isAdminUnlocked) return;
var maxNum = 0;
STAFF_SLOTS.forEach(function (s) {
var m = /^staff_(\d+)$/.exec(s.id);
if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
});
var nextNum = maxNum + 1;
var nextId = "staff_" + (nextNum < 10 ? "0" + nextNum : String(nextNum));
STAFF_SLOTS.push({ id: nextId, name: "" });
chrome.storage.local.set({ staffList: STAFF_SLOTS }, function () {
var cur = document.getElementById("staff-select").value;
rebuildStaffUI(cur);
renderTeam(cur);
document.getElementById("slot-status").textContent = "✅ Додано слот: " + nextId;
});
});
document.getElementById("del-slot-btn").addEventListener("click", function () {
if (!isAdminUnlocked) return;
var checked = Array.from(document.querySelectorAll("#admin-slots-list input[type='checkbox']:checked")).map(function (c) { return c.value; });
if (checked.length === 0) {
document.getElementById("slot-status").textContent = "Позначте чекбоксами слоти для видалення.";
return;
}
STAFF_SLOTS = STAFF_SLOTS.filter(function (s) { return s.id === "staff_01" || checked.indexOf(s.id) === -1; });
chrome.storage.local.set({ staffList: STAFF_SLOTS }, function () {
var cur = document.getElementById("staff-select").value;
if (!STAFF_SLOTS.some(function (s) { return s.id === cur; })) cur = "staff_01";
rebuildStaffUI(cur);
renderTeam(cur);
document.getElementById("slot-status").textContent = "🗑 Видалено слотів: " + checked.length;
});
});
document.getElementById("save-sb-btn").addEventListener("click", function () {
var sbUrl = document.getElementById("sb-url").value.trim() || DEFAULT_SB_URL;
while (sbUrl.endsWith("/")) { sbUrl = sbUrl.slice(0, -1); }
var sbKey = document.getElementById("sb-key").value.trim() || DEFAULT_SB_KEY;
chrome.storage.local.set({ sbUrl: sbUrl, sbKey: sbKey }, function () {
document.getElementById("slot-status").textContent = "✅ Ключі Supabase оновлено!";
});
});(function bindHelpAndQuickAdmin() {
  var helpBtn = document.getElementById("help-toggle-btn");
  var closeBtn = document.getElementById("help-close-btn");
  var quickBtn = document.getElementById("quick-admin-call");
  var staffSel = document.getElementById("staff-select");
  var prevTab = "clients";

  function syncQuickBtn() {
    if (!quickBtn || !staffSel) return;
    quickBtn.style.display = (staffSel.value === "staff_01") ? "none" : "inline-flex";
  }
  if (staffSel) {
    staffSel.addEventListener("change", syncQuickBtn);
    setTimeout(syncQuickBtn, 200);
  }
  if (quickBtn) {
    quickBtn.addEventListener("click", function () {
      if (typeof callPeer === "function") callPeer("4i4_staff_staff_01");
    });
  }
  if (helpBtn) {
    helpBtn.addEventListener("click", function () {
      var helpPane = document.getElementById("pane-help");
      if (helpPane && helpPane.classList.contains("active")) {
        switchTab(prevTab);
        return;
      }
      var activeTab = document.querySelector(".tab.active");
      if (activeTab) prevTab = activeTab.getAttribute("data-t") || "clients";
      document.querySelectorAll(".tab").forEach(function (x) { x.classList.remove("active"); });
      document.querySelectorAll(".pane").forEach(function (x) { x.classList.remove("active"); });
      if (helpPane) helpPane.classList.add("active");
    });
  }
  if (closeBtn) {
    closeBtn.addEventListener("click", function () { switchTab(prevTab); });
  }
})();
async function loadAdminDialogs() {
  var box = document.getElementById("admin-dialogs-list");
  var stEl = document.getElementById("dialogs-admin-status");
  if (!box) return;
  box.innerHTML = "<div style='font-size:11px;color:#94a3b8;padding:4px;'>Завантаження діалогів...</div>";
  chrome.storage.local.get(["sbUrl", "sbKey"], async function (rawCfg) {
    var cfg = resolveSbCfg(rawCfg);
    try {
      var res = await fetch(cfg.sbUrl + "/rest/v1/chat_sessions?select=id,client_name,project_id,updated_at&order=updated_at.desc&limit=50", {
        headers: { apikey: cfg.sbKey }
      });
      var rows = await res.json();
      box.innerHTML = "";
      if (!Array.isArray(rows) || rows.length === 0) {
        box.innerHTML = "<div style='font-size:11px;color:#64748b;padding:4px;'>Діалогів у базі немає.</div>";
        return;
      }
      rows.forEach(function (s) {
        var row = document.createElement("label");
        row.style.cssText = "display:flex;align-items:center;gap:8px;margin:0;padding:5px 8px;border-radius:8px;background:rgba(15,23,42,0.85);color:#e2e8f0;font-size:11px;cursor:pointer;";
        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.value = s.id;
        var lbl = document.createElement("span");
        lbl.style.cssText = "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
        lbl.textContent = (s.client_name || "Клієнт") + " • " + (s.project_id || "проєкт");
        lbl.title = s.id;
        row.appendChild(cb);
        row.appendChild(lbl);
        box.appendChild(row);
      });
      if (stEl) stEl.textContent = "";
    } catch (e) {
      box.innerHTML = "<div style='font-size:11px;color:#f87171;padding:4px;'>Помилка читання діалогів.</div>";
    }
  });
}

(function bindAdminDialogsManager() {
  var refBtn = document.getElementById("refresh-admin-dialogs-btn");
  var delBtn = document.getElementById("del-dialogs-btn");
  var stEl = document.getElementById("dialogs-admin-status");

  if (refBtn) {
    refBtn.addEventListener("click", function () {
      if (isAdminUnlocked) loadAdminDialogs();
    });
  }

  if (delBtn) {
    delBtn.addEventListener("click", function () {
      if (!isAdminUnlocked) return;
      var checked = Array.from(document.querySelectorAll("#admin-dialogs-list input[type='checkbox']:checked")).map(function (c) { return c.value; });
      if (checked.length === 0) {
        stEl.style.color = "#f87171";
        stEl.textContent = "Позначте чекбоксами діалоги для видалення.";
        return;
      }
      delBtn.disabled = true;
      stEl.style.color = "#38bdf8";
      stEl.textContent = "Видалення з Supabase...";

      chrome.storage.local.get(["sbUrl", "sbKey"], async function (rawCfg) {
        var cfg = resolveSbCfg(rawCfg);
        var inFilter = "(" + checked.map(function (id) { return '"' + id.replace(/"/g, "") + '"'; }).join(",") + ")";
        try {
          await fetch(cfg.sbUrl + "/rest/v1/chat_messages?session_id=in." + encodeURIComponent(inFilter), {
            method: "DELETE",
            headers: { apikey: cfg.sbKey, Prefer: "return=minimal" }
          });
          var delSessRes = await fetch(cfg.sbUrl + "/rest/v1/chat_sessions?id=in." + encodeURIComponent(inFilter), {
            method: "DELETE",
            headers: { apikey: cfg.sbKey, Prefer: "return=minimal" }
          });
          if (!delSessRes.ok) throw new Error("HTTP " + delSessRes.status);

          if (checked.indexOf(selectedSessionId) !== -1) {
            selectedSessionId = null;
          }
          stEl.style.color = "#6ee7b7";
          stEl.textContent = "✅ Видалено діалогів: " + checked.length;
          await loadAdminDialogs();
          loadClients(cfg);
        } catch (err) {
          stEl.style.color = "#f87171";
          stEl.textContent = "Помилка видалення: " + err.message;
        } finally {
          delBtn.disabled = false;
        }
      });
    });
  }
})();