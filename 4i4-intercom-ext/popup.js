const STAFF_LIST = ["staff_01", "staff_02", "staff_03"];
let localPeer = null;
let selectedSessionId = null;
let clearedAfterId = {};
let activePollTimer = null;

function switchTab(tabName) {
  document.querySelectorAll(".tab").forEach(function(x) {
    x.classList.toggle("active", x.getAttribute("data-t") === tabName);
  });
  document.querySelectorAll(".pane").forEach(function(x) {
    x.classList.toggle("active", x.id === "pane-" + tabName);
  });
  if (tabName === "clients") {
    chrome.storage.local.get(["sbUrl", "sbKey"], function(cfg) { loadClients(cfg); });
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
  STAFF_LIST.forEach(function(id) {
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

chrome.storage.local.get(["staffId", "staffName", "status", "sbUrl", "sbKey"], function(cfg) {
const st = cfg.staffId || "staff_01";
const md = cfg.status || "online";
document.getElementById("staff-select").value = st;
document.getElementById("status-select").value = md;
document.getElementById("sb-url").value = cfg.sbUrl || "";
document.getElementById("sb-key").value = cfg.sbKey || "";
if (document.getElementById("staff-name")) {
document.getElementById("staff-name").value = cfg.staffName || "";
}
updateStaffSelectLabels();
setBadge(md);
renderTeam(st);
loadClients(cfg);
});
document.getElementById("staff-select").addEventListener("change", function(e) {
chrome.storage.local.set({ staffId: e.target.value });
chrome.runtime.sendMessage({ type: "REINIT_PEER", staffId: e.target.value }).catch(function() {});
updateStaffSelectLabels();
renderTeam(e.target.value);
});
document.getElementById("status-select").addEventListener("change", function(e) {
chrome.storage.local.set({ status: e.target.value });
setBadge(e.target.value);
});
document.getElementById("save-cfg").addEventListener("click", function() {
var sbUrl = document.getElementById("sb-url").value.trim();
while (sbUrl.endsWith("/")) { sbUrl = sbUrl.slice(0, -1); }
const sbKey = document.getElementById("sb-key").value.trim();
const staffName = document.getElementById("staff-name") ? document.getElementById("staff-name").value.trim() : "";
chrome.storage.local.set({ sbUrl: sbUrl, sbKey: sbKey, staffName: staffName }, function() {
updateStaffSelectLabels();
document.getElementById("cfg-info").textContent = "Налаштування збережено!";
switchTab("clients");
});
});