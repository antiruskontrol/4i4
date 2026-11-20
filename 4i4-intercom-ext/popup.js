const STAFF_LIST = ["staff_01", "staff_02", "staff_03"];
let localPeer = null;

document.querySelectorAll(".tab").forEach(function(b) {
  b.addEventListener("click", function() {
    document.querySelectorAll(".tab").forEach(function(x) { x.classList.remove("active"); });
    document.querySelectorAll(".pane").forEach(function(x) { x.classList.remove("active"); });
    b.classList.add("active");
    document.getElementById("pane-" + b.getAttribute("data-t")).classList.add("active");
  });
});

function setBadge(status) {
  const map = { online: ["ON", "#16a34a"], busy: ["BUSY", "#dc2626"], offline: ["OFF", "#475569"] };
  const item = map[status] || map.online;
  chrome.action.setBadgeText({ text: item });
  chrome.action.setBadgeBackgroundColor({ color: item });
}

function callPeer(targetId) {
  navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(function(stream) {
    if (!localPeer) localPeer = new Peer();
    localPeer.on("open", function() {
      const call = localPeer.call(targetId, stream);
      call.on("stream", function(rem) { document.getElementById("team-audio").srcObject = rem; });
    });
  });
}

function renderTeam(myId) {
  const box = document.getElementById("team-box");
  box.innerHTML = "";
  STAFF_LIST.forEach(function(id) {
    if (id === myId) return;
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = "<strong>Співробітник " + id + "</strong><div class=\"row\"><button class=\"btn\" data-a=\"1\">🎙 Аудіодзвінок</button><button class=\"btn\" data-v=\"1\">📹 Відеозв'язок</button></div>";
    div.querySelector("[data-a]").addEventListener("click", function() { callPeer("4i4_staff_" + id); });
    div.querySelector("[data-v]").addEventListener("click", function() { callPeer("4i4_staff_" + id); });
    box.appendChild(div);
  });
}

async function loadMessages(cfg, sid, container) {
  const r = await fetch(cfg.sbUrl + "/rest/v1/chat_messages?session_id=eq." + sid + "&order=created_at.asc", {
    headers: { apikey: cfg.sbKey, Authorization: "Bearer " + cfg.sbKey }
  });
  const rows = await r.json();
  container.innerHTML = "";
  (rows || []).forEach(function(m) {
    const p = document.createElement("div");
    p.className = "msg " + (m.sender === "staff" ? "staff" : "");
    p.textContent = "[" + (m.sender || "client") + "]: " + (m.content || m.text || "");
    container.appendChild(p);
  });
}

async function loadClients(cfg) {
  const box = document.getElementById("sessions-box");
  if (!cfg.sbUrl || !cfg.sbKey) {
    box.innerHTML = "<div class=\"card\">Вкажіть SUPABASE_URL та SUPABASE_ANON_KEY у вкладці «Налаштування».</div>";
    return;
  }
  const res = await fetch(cfg.sbUrl + "/rest/v1/chat_sessions?select=*&order=created_at.desc&limit=10", {
    headers: { apikey: cfg.sbKey, Authorization: "Bearer " + cfg.sbKey }
  });
  const sessions = await res.json();
  box.innerHTML = "";
  (sessions || []).forEach(function(s) {
    const card = document.createElement("div");
    card.className = "card";
    const proj = s.project_id || "ai-copilot-4i4";
    const magic = "https://github.io" + encodeURIComponent(proj) + "&room=" + encodeURIComponent(s.id);
    card.innerHTML = "<div><strong>" + (s.client_name || "Клієнт") + "</strong> (" + proj + ")</div>" +
      "<div class=\"msgs\"></div>" +
      "<div class=\"row\"><input style=\"flex:1;\" placeholder=\"Відповідь...\"><button class=\"btn\" data-send=\"1\">Надіслати</button></div>" +
      "<div class=\"row\"><button class=\"btn\" data-call=\"1\">📞 Виклик</button><button class=\"btn\" data-link=\"1\">🔗 Magic Call Link</button></div>";
    const msgsEl = card.querySelector(".msgs");
    const inp = card.querySelector("input");
    loadMessages(cfg, s.id, msgsEl);
    card.querySelector("[data-send]").addEventListener("click", async function() {
      if (!inp.value.trim()) return;
      await fetch(cfg.sbUrl + "/rest/v1/chat_messages", {
        method: "POST",
        headers: { apikey: cfg.sbKey, Authorization: "Bearer " + cfg.sbKey, "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: s.id, sender: "staff", content: inp.value.trim() })
      });
      inp.value = "";
      loadMessages(cfg, s.id, msgsEl);
    });
    card.querySelector("[data-call]").addEventListener("click", function() { callPeer("4i4_client_" + s.id); });
    card.querySelector("[data-link]").addEventListener("click", function() { navigator.clipboard.writeText(magic); });
    box.appendChild(card);
  });
}

chrome.storage.local.get(["staffId", "status", "sbUrl", "sbKey"], function(cfg) {
  const st = cfg.staffId || "staff_01";
  const md = cfg.status || "online";
  document.getElementById("staff-select").value = st;
  document.getElementById("status-select").value = md;
  document.getElementById("sb-url").value = cfg.sbUrl || "";
  document.getElementById("sb-key").value = cfg.sbKey || "";
  setBadge(md);
  renderTeam(st);
  loadClients(cfg);
});

document.getElementById("staff-select").addEventListener("change", function(e) {
  chrome.storage.local.set({ staffId: e.target.value });
  chrome.runtime.sendMessage({ type: "REINIT_PEER", staffId: e.target.value });
  renderTeam(e.target.value);
});

document.getElementById("status-select").addEventListener("change", function(e) {
  chrome.storage.local.set({ status: e.target.value });
  setBadge(e.target.value);
});

document.getElementById("save-cfg").addEventListener("click", function() {
  const sbUrl = document.getElementById("sb-url").value.trim().replace(/\/+$/, "");
  const sbKey = document.getElementById("sb-key").value.trim();
  chrome.storage.local.set({ sbUrl: sbUrl, sbKey: sbKey }, function() {
    document.getElementById("cfg-info").textContent = "Ключі збережено!";
    loadClients({ sbUrl: sbUrl, sbKey: sbKey });
  });
});