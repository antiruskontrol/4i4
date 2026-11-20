const STAFF_LIST = ["staff_01", "staff_02", "staff_03"];
let localPeer = null;

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
  try {
    const r = await fetch(cfg.sbUrl + "/rest/v1/chat_messages?session_id=eq." + sid + "&order=created_at.asc", {
      headers: { apikey: cfg.sbKey }
    });
    const rows = await r.json();
    container.innerHTML = "";
    if (!Array.isArray(rows) || rows.length === 0) {
      container.innerHTML = "<div class=\"msg\" style=\"color:#64748b;\">Повідомлень поки немає...</div>";
      return;
    }
    rows.forEach(function(m) {
      const p = document.createElement("div");
      p.className = "msg " + (m.sender === "staff" ? "staff" : "");
      p.textContent = "[" + (m.sender || "client") + "]: " + (m.content || m.text || "");
      container.appendChild(p);
    });
  } catch (e) {
    container.innerHTML = "<div class=\"msg\" style=\"color:#f87171;\">Помилка читання чату</div>";
  }
}

async function loadClients(cfg) {
  const box = document.getElementById("sessions-box");
  if (!cfg.sbUrl || !cfg.sbKey) {
    box.innerHTML = "<div class=\"card\"><strong>Supabase ще не підключено</strong><div style=\"font-size:11px;color:#94a3b8;margin-top:6px;\">Перейдіть у вкладку «Налаштування», вставте SUPABASE_URL та SUPABASE_ANON_KEY і натисніть «Зберегти ключі».</div><div class=\"row\"><button class=\"btn\" id=\"go-cfg-btn\">Відкрити налаштування</button></div></div>";
    document.getElementById("go-cfg-btn").addEventListener("click", function() { switchTab("cfg"); });
    return;
  }
  box.innerHTML = "<div class=\"card\" style=\"color:#38bdf8;\">Оновлення списку клієнтів із Supabase...</div>";
  try {
    const res = await fetch(cfg.sbUrl + "/rest/v1/chat_sessions?select=*&order=updated_at.desc&limit=10", {
      headers: { apikey: cfg.sbKey }
    });
    if (!res.ok) {
      box.innerHTML = "<div class=\"card\" style=\"color:#f87171;\">Помилка Supabase (" + res.status + "). Перевірте, чи виконано supabase-setup.sql та чи правильні ключі.</div>";
      return;
    }
    const sessions = await res.json();
    if (!Array.isArray(sessions) || sessions.length === 0) {
      box.innerHTML = "<div class=\"card\"><strong>Активних діалогів поки немає</strong><div style=\"font-size:11px;color:#94a3b8;margin-top:4px;\">Напишіть тестове повідомлення у віджеті чату на сторінці projects.html, а потім натисніть «Клієнти» ще раз.</div></div>";
      return;
    }
    box.innerHTML = "";
    sessions.forEach(function(s) {
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
          headers: { apikey: cfg.sbKey, "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: s.id, sender: "staff", text: inp.value.trim() })
        });
        inp.value = "";
        loadMessages(cfg, s.id, msgsEl);
      });
      card.querySelector("[data-call]").addEventListener("click", function() { callPeer("4i4_client_" + s.id); });
      card.querySelector("[data-link]").addEventListener("click", function() { navigator.clipboard.writeText(magic); });
      box.appendChild(card);
    });
  } catch (err) {
    box.innerHTML = "<div class=\"card\" style=\"color:#f87171;\">Немає з'єднання із Supabase. Перевірте SUPABASE_URL.</div>";
  }
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
  chrome.runtime.sendMessage({ type: "REINIT_PEER", staffId: e.target.value }).catch(function() {});
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
    switchTab("clients");
  });
});