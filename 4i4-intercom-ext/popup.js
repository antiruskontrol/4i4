function openFileSmartPreview(url, rawLabel) {
  if (!url) return;
  var cleanName = String(rawLabel || "file").replace(/^📎\s*Файл:\s*/i, "").trim() || "file";
  var lower = (cleanName + " " + url.slice(0, 80)).toLowerCase();

  var isImg = /\.(png|jpe?g|webp|gif|svg|bmp)(\?|$)/i.test(lower) || url.indexOf("data:image/") === 0;
  var isVid = /\.(mp4|webm|ogg|mov)(\?|$)/i.test(lower) || url.indexOf("data:video/") === 0;
  var isTxt = /\.(txt|md|json|js|ts|jsx|tsx|html?|css|ps1|bat|sh|py|sql|xml|ya?ml|csv|log|ini|env)(\?|$)/i.test(lower) || url.indexOf("data:text/") === 0 || url.indexOf("data:application/json") === 0;

  if (!isImg && !isVid && !isTxt) {
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: url });
    } else {
      window.open(url, "_blank", "noopener");
    }
    return;
  }

  var modal = document.getElementById("i4-file-preview-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "i4-file-preview-modal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(2,6,23,0.92);z-index:99999;display:flex;flex-direction:column;padding:12px;backdrop-filter:blur(6px);";
    document.body.appendChild(modal);
  }
  modal.style.display = "flex";
  modal.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding-bottom:8px;border-bottom:1px solid rgba(56,189,248,0.3);">' +
      '<strong style="font-size:12px;color:#38bdf8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">👁 ' + cleanName + '</strong>' +
      '<div style="display:flex;gap:6px;flex-shrink:0;">' +
        '<a href="' + url + '" download="' + cleanName + '" class="btn" style="text-decoration:none;border-color:#10b981;color:#6ee7b7;">⬇ Зберегти</a>' +
        '<button type="button" id="i4-prev-close" class="icon-btn" style="width:26px;height:26px;">✕</button>' +
      '</div>' +
    '</div>' +
    '<div id="i4-prev-body" style="flex:1;overflow:auto;margin-top:10px;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,0.75);border-radius:12px;padding:8px;">' +
      '<span style="color:#94a3b8;font-size:11px;">Завантаження попереднього перегляду...</span>' +
    '</div>';

  document.getElementById("i4-prev-close").onclick = function () {
    modal.style.display = "none";
    modal.innerHTML = "";
  };

  var bodyEl = document.getElementById("i4-prev-body");
  if (isImg) {
    bodyEl.innerHTML = '<img src="' + url + '" style="max-width:100%;max-height:100%;border-radius:8px;object-fit:contain;">';
  } else if (isVid) {
    bodyEl.innerHTML = '<video src="' + url + '" controls autoplay style="max-width:100%;max-height:100%;border-radius:8px;"></video>';
  } else if (isTxt) {
    fetch(url).then(function (r) { return r.text(); }).then(function (txt) {
      bodyEl.style.alignItems = "flex-start";
      bodyEl.style.justifyContent = "flex-start";
      var pre = document.createElement("pre");
      pre.style.cssText = "margin:0;width:100%;white-space:pre-wrap;word-break:break-word;font-family:Consolas,monospace;font-size:11px;line-height:1.45;color:#e2e8f0;";
      pre.textContent = txt.slice(0, 50000);
      bodyEl.innerHTML = "";
      bodyEl.appendChild(pre);
    }).catch(function () {
      bodyEl.innerHTML = '<span style="color:#f87171;font-size:11px;">Не вдалося прочитати текст файлу. Натисніть «⬇ Зберегти».</span>';
    });
  }
}
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

function getFirstActiveStaffId() {
  var active = STAFF_SLOTS.find(function (s) { return s.id !== "staff_01"; });
  return active ? active.id : "staff_02";
}

function rebuildStaffUI(selectedId) {
  var topSel = document.getElementById("staff-select");
  var cfgSel = document.getElementById("cfg-slot-select");
  var cur = (selectedId && selectedId !== "staff_01") ? selectedId : (topSel && topSel.value !== "staff_01" ? topSel.value : getFirstActiveStaffId());
  if (!STAFF_SLOTS.some(function (s) { return s.id === cur && s.id !== "staff_01"; })) {
    cur = getFirstActiveStaffId();
  }

  if (topSel) {
    topSel.innerHTML = "";
    STAFF_SLOTS.forEach(function (s) {
      var opt = document.createElement("option");
      opt.value = s.id;
      if (s.id === "staff_01") {
        opt.disabled = true;
        opt.style.color = "#64748b";
        opt.textContent = "🔒 staff_01 (системний)";
      } else {
        opt.textContent = s.name ? (s.name + " (" + s.id + ")") : s.id;
      }
      topSel.appendChild(opt);
    });
    topSel.value = cur;
  }

  if (cfgSel) {
    cfgSel.innerHTML = "";
    STAFF_SLOTS.forEach(function (s) {
      var opt = document.createElement("option");
      opt.value = s.id;
      if (s.id === "staff_01") {
        opt.disabled = true;
        opt.style.color = "#64748b";
        opt.textContent = "🔒 staff_01 — системний (заблоковано)";
      } else {
        var isMine = (s.id === cur);
        if (isMine) {
          opt.textContent = s.id + " — ваш поточний" + (s.name ? " (" + s.name + ")" : "");
        } else if (s.name) {
          opt.textContent = s.id + " — зайнято (" + s.name + ")";
        } else {
          opt.textContent = s.id + " — вільний стаф";
        }
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
  if (!sel) return;
  Array.from(sel.options).forEach(function(opt) {
    if (opt.value === "staff_01") {
      opt.disabled = true;
      opt.style.color = "#64748b";
      opt.textContent = "🔒 staff_01 (системний)";
      return;
    }
    var slot = STAFF_SLOTS.find(function(s) { return s.id === opt.value; });
    var nm = slot ? slot.name : "";
    opt.textContent = nm ? (nm + " (" + opt.value + ")") : opt.value;
  });
}

var activeTeamCall = null;
var activeTeamStream = null;
var activeDmRoomId = null;
var teamDmPollTimer = null;

function endTeamCall() {
  if (activeTeamCall) { try { activeTeamCall.close(); } catch (e) {} activeTeamCall = null; }
  if (activeTeamStream) { activeTeamStream.getTracks().forEach(function (t) { t.stop(); }); activeTeamStream = null; }
  var banner = document.getElementById("team-call-banner");
  var vid = document.getElementById("team-remote-vid");
  if (vid) { vid.srcObject = null; vid.style.display = "none"; }
  if (banner) banner.style.display = "none";
}

function callPeer(targetId, withVideo, labelName) {
  navigator.mediaDevices.getUserMedia({ audio: true, video: !!withVideo }).then(function (stream) {
    activeTeamStream = stream;
    if (!localPeer) localPeer = new Peer();
    var banner = document.getElementById("team-call-banner");
    var stTxt = document.getElementById("team-call-status");
    var vid = document.getElementById("team-remote-vid");
    if (banner && stTxt) {
      banner.style.display = "block";
      stTxt.textContent = (withVideo ? "📹 Відеовиклик: " : "🎙 Аудіовиклик: ") + (labelName || targetId) + "...";
    }
    var hangup = document.getElementById("team-hangup-btn");
    if (hangup) hangup.onclick = endTeamCall;

    function dial() {
      const call = localPeer.call(targetId, stream);
      if (!call) return;
      activeTeamCall = call;
      call.on("stream", function (rem) {
        if (stTxt) stTxt.textContent = "🟢 На зв'язку: " + (labelName || targetId);
        if (withVideo && vid) {
          vid.style.display = "block";
          vid.srcObject = rem;
        } else {
          document.getElementById("team-audio").srcObject = rem;
        }
      });
      call.on("close", endTeamCall);
    }

    if (localPeer.open) dial();
    else localPeer.on("open", dial);
  }).catch(function (err) {
    alert("Помилка доступу до мікрофона/камери: " + err.message);
  });
}

function getPresenceMeta(dirEntry) {
  if (!dirEntry || !dirEntry.last_seen) return { dot: "⚫", label: "не в мережі", online: false, color: "#64748b" };
  var diff = Date.now() - new Date(dirEntry.last_seen).getTime();
  var fresh = !isNaN(diff) && diff < 300000;
  if (fresh && dirEntry.status === "online") return { dot: "🟢", label: "в мережі", online: true, color: "#34d399" };
  if (fresh && dirEntry.status === "busy") return { dot: "🟡", label: "зайнятий", online: true, color: "#fbbf24" };
  return { dot: "⚫", label: "не в мережі", online: false, color: "#64748b" };
}

function getTeamDmRoomId(idA, idB) {
  var pair = [String(idA || ""), String(idB || "")].sort();
  return "team_dm_" + pair.join("_");
}

function openTeamDm(myId, peerSlot, triggerFilePicker) {
  var teamPane = document.getElementById("pane-team");
  if (!teamPane) return;

  var box = document.getElementById("team-dm-box");
  if (!box) {
    box = document.createElement("div");
    box.id = "team-dm-box";
    box.className = "card";
    box.style.cssText = "border-color:rgba(56,189,248,0.55);margin-top:8px;background:rgba(8,14,28,0.95);";
    box.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
        '<strong id="team-dm-title" style="font-size:12px;color:#38bdf8;">💬 Внутрішній чат</strong>' +
        '<button type="button" id="team-dm-close" class="icon-btn" style="width:22px;height:22px;font-size:10px;">✕</button>' +
      '</div>' +
      '<div id="team-dm-msgs" class="msgs" style="height:135px;margin-top:0;"></div>' +
      '<div class="row" style="margin-top:6px;">' +
        '<input id="team-dm-file" type="file" style="display:none;">' +
        '<button type="button" id="team-dm-file-btn" class="icon-btn" title="Надіслати файл колезі" style="width:28px;height:28px;flex-shrink:0;">📎</button>' +
        '<input id="team-dm-input" style="flex:1;min-width:0;" placeholder="Повідомлення колезі...">' +
        '<button type="button" id="team-dm-send" class="btn" style="background:#0284c7;color:#fff;">➤</button>' +
      '</div>';
    teamPane.appendChild(box);
  }

  var titleEl = document.getElementById("team-dm-title");
  var msgsEl = document.getElementById("team-dm-msgs");
  var inp = document.getElementById("team-dm-input");
  var sendBtn = document.getElementById("team-dm-send");
  var closeBtn = document.getElementById("team-dm-close");
  var fBtn = document.getElementById("team-dm-file-btn");
  var fInp = document.getElementById("team-dm-file");

  activeDmRoomId = getTeamDmRoomId(myId, peerSlot.id);
  var peerTitle = peerSlot.name ? (peerSlot.name + " (" + peerSlot.id + ")") : peerSlot.id;
  titleEl.textContent = "💬 Чат з " + peerTitle;
  box.style.display = "block";
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  msgsEl.innerHTML = "<div style='color:#94a3b8;'>Завантаження...</div>";

  if (closeBtn) {
    closeBtn.onclick = function () {
      box.style.display = "none";
      activeDmRoomId = null;
      if (teamDmPollTimer) clearInterval(teamDmPollTimer);
    };
  }

  function fetchDm() {
    if (!activeDmRoomId) return;
    chrome.storage.local.get(["sbUrl", "sbKey"], function (rawCfg) {
      var cfg = resolveSbCfg(rawCfg);
      if (!cfg.sbUrl || !cfg.sbKey) return;
      fetch(cfg.sbUrl + "/rest/v1/chat_messages?session_id=eq." + encodeURIComponent(activeDmRoomId) + "&order=id.asc", {
        headers: { apikey: cfg.sbKey }
      }).then(function (r) { return r.json(); }).then(function (rows) {
        if (!Array.isArray(rows)) return;
        msgsEl.innerHTML = "";
        if (rows.length === 0) {
          msgsEl.innerHTML = "<div style='color:#64748b;'>Повідомлень поки немає. Напишіть колезі!</div>";
          return;
        }
        rows.forEach(function (m) {
          var div = document.createElement("div");
          div.className = "msg staff";
          var author = m.file_name || "Колега";
          
          var bodyTxt = m.text || m.content || "";
          var cleanFname = bodyTxt.replace(/^📎\s*Файл:\s*/i, "").trim() || "file";
          div.innerHTML = "<span class='msg-author'>" + author + ":</span> " + bodyTxt;
          if (m.file_url) {
            var actSpan = document.createElement("span");
            actSpan.style.cssText = "display:inline-flex;gap:6px;margin-left:6px;";
            var openBtn = document.createElement("button");
            openBtn.type = "button";
            openBtn.textContent = "👁 Відкрити";
            openBtn.style.cssText = "background:rgba(56,189,248,0.18);border:1px solid #38bdf8;color:#bae6fd;border-radius:999px;padding:1px 8px;font-size:10px;cursor:pointer;";
            openBtn.onclick = function () { openFileSmartPreview(m.file_url, cleanFname); };

            var saveLink = document.createElement("a");
            saveLink.href = m.file_url;
            saveLink.download = cleanFname;
            saveLink.textContent = "⬇ Зберегти";
            saveLink.style.cssText = "background:rgba(16,185,129,0.18);border:1px solid #10b981;color:#6ee7b7;border-radius:999px;padding:1px 8px;font-size:10px;text-decoration:none;";

            actSpan.appendChild(openBtn);
            actSpan.appendChild(saveLink);
            div.appendChild(actSpan);
          }
          msgsEl.appendChild(div);
        });
        msgsEl.scrollTop = msgsEl.scrollHeight;
      }).catch(function () {});
    });
  }

  function sendDm() {
    var txt = inp ? inp.value.trim() : "";
    if (!txt || !activeDmRoomId) return;
    inp.value = "";
    chrome.storage.local.get(["sbUrl", "sbKey"], function (rawCfg) {
      var cfg = resolveSbCfg(rawCfg);
      var myLabel = getStaffDisplay();
      fetch(cfg.sbUrl + "/rest/v1/chat_sessions", {
        method: "POST",
        headers: { apikey: cfg.sbKey, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({
          id: activeDmRoomId,
          project_id: "_team_dm",
          staff_id: "archived",
          client_name: "Team DM: " + activeDmRoomId,
          updated_at: new Date().toISOString()
        })
      }).then(function () {
        return fetch(cfg.sbUrl + "/rest/v1/chat_messages", {
          method: "POST",
          headers: { apikey: cfg.sbKey, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({
            session_id: activeDmRoomId,
            sender: "staff",
            project_id: "_team_dm", text: txt,
            file_name: myLabel
          })
        });
      }).then(function () { fetchDm(); }).catch(function () {});
    });
  }

  function uploadAndSendTeamFile(file) {
    if (!file || !activeDmRoomId) return;
    msgsEl.innerHTML += "<div style='color:#38bdf8;'>Надсилання файлу " + file.name + "...</div>";
    chrome.storage.local.get(["sbUrl", "sbKey"], async function (rawCfg) {
      var cfg = resolveSbCfg(rawCfg);
      var myLabel = getStaffDisplay();
      var safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      var path = activeDmRoomId + "/" + Date.now() + "_" + safeName;
      var fileUrl = "";
      try {
        var upRes = await fetch(cfg.sbUrl + "/storage/v1/object/chat-files/" + path, {
          method: "POST",
          headers: { apikey: cfg.sbKey, "Content-Type": file.type || "application/octet-stream", "x-upsert": "true" },
          body: file
        });
        if (upRes.ok) fileUrl = cfg.sbUrl + "/storage/v1/object/public/chat-files/" + path;
      } catch (e) {}
      if (!fileUrl && file.size <= 1048576) {
        fileUrl = await new Promise(function (resolve) {
          var r = new FileReader();
          r.onload = function () { resolve(r.result); };
          r.onerror = function () { resolve(""); };
          r.readAsDataURL(file);
        });
      }
      if (!fileUrl) { alert("Не вдалося завантажити файл."); return; }
      await fetch(cfg.sbUrl + "/rest/v1/chat_sessions", {
        method: "POST",
        headers: { apikey: cfg.sbKey, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ id: activeDmRoomId, project_id: "_team_dm", staff_id: "archived", client_name: "Team DM: " + activeDmRoomId, updated_at: new Date().toISOString() })
      });
      await fetch(cfg.sbUrl + "/rest/v1/chat_messages", {
        method: "POST",
        headers: { apikey: cfg.sbKey, "Content-Type": "application/json", Prefer: "return=minimal" },
body: JSON.stringify({ session_id: activeDmRoomId, sender: "staff", project_id: "_team_dm", text: "📎 Файл: " + file.name, file_url: fileUrl, file_name: myLabel })
});
fetchDm();
});
}
if (fBtn && fInp) {
fBtn.onclick = function () { fInp.value = ""; fInp.click(); };
fInp.onchange = function () { if (fInp.files && fInp.files.item(0)) uploadAndSendTeamFile(fInp.files.item(0)); };
}
if (sendBtn) sendBtn.onclick = sendDm;
if (inp) inp.onkeydown = function (e) { if (e.key === "Enter") sendDm(); };
fetchDm();
if (teamDmPollTimer) clearInterval(teamDmPollTimer);
teamDmPollTimer = setInterval(fetchDm, 3000);
if (triggerFilePicker && fInp) {
setTimeout(function () { fInp.value = ""; fInp.click(); }, 120);
}
}function renderTeam(myId) {
  const box = document.getElementById("team-box");
  if (!box) return;
  chrome.storage.local.get(["sbUrl", "sbKey"], function (rawCfg) {
    var cfg = resolveSbCfg(rawCfg);
    var dirPromise = (cfg.sbUrl && cfg.sbKey)
      ? fetch(cfg.sbUrl + "/rest/v1/chat_sessions?id=eq.4i4_team_directory&select=client_name&limit=1", {
          headers: { apikey: cfg.sbKey }
        }).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; })
      : Promise.resolve([]);

    dirPromise.then(function (rows) {
      var dirMap = {};
      if (Array.isArray(rows) && rows.length > 0 && rows.at(0) && rows.at(0).client_name) {
        try {
          var arr = JSON.parse(rows.at(0).client_name);
          if (Array.isArray(arr)) arr.forEach(function (x) { if (x && x.id) dirMap[x.id] = x; });
        } catch (e) {}
      }
      box.innerHTML = "";
      STAFF_SLOTS.forEach(function (slotObj) {
        var id = slotObj.id;
        if (id === myId) return;
        const div = document.createElement("div");
        div.className = "card";
        if (id === "staff_01") {
          div.style.opacity = "0.45";
          div.style.borderColor = "#334155";
          div.innerHTML = "<strong style='color:#64748b;'>🔒 staff_01 (системний архів)</strong><div class='row'><button class='btn' disabled style='color:#64748b;border-color:#334155;cursor:not-allowed;'>Недоступно для зв'язку</button></div>";
          box.appendChild(div);
          return;
        }
        var meta = (typeof getPresenceMeta === "function")
          ? getPresenceMeta(dirMap[id])
          : { dot: "⚫", label: "не в мережі", online: false, color: "#94a3b8" };
        var title = slotObj.name ? (slotObj.name + " (" + id + ")") : ("Співробітник " + id);
        if (!meta.online) div.style.opacity = "0.82";
        div.innerHTML =
          "<div style='display:flex;justify-content:space-between;align-items:center;'>" +
            "<strong>" + meta.dot + " " + title + "</strong>" +
            "<span style='font-size:10px;font-weight:600;color:" + meta.color + ";'>" + meta.label + "</span>" +
          "</div>" +
          "<div class='row'>" +
            "<button class='btn' data-a='1'>🎙 Аудіо</button>" +
            "<button class='btn' data-v='1'>📹 Відео</button>" +
            "<button class='btn' data-dm='1' style='border-color:#10b981;color:#6ee7b7;'>💬 Чат</button>" +
            "<button class='btn' data-f='1' style='border-color:#38bdf8;color:#bae6fd;'>📎 Файл</button>" +
          "</div>";
        div.querySelector("[data-a]").addEventListener("click", function () { callPeer("4i4_staff_" + id, false, title); });
        div.querySelector("[data-v]").addEventListener("click", function () { callPeer("4i4_staff_" + id, true, title); });
        div.querySelector("[data-dm]").addEventListener("click", function () { openTeamDm(myId, slotObj, false); });
        div.querySelector("[data-f]").addEventListener("click", function () { openTeamDm(myId, slotObj, true); });
        box.appendChild(div);
      });
    });
  });
}

(function bindQuickTeamTabSwitch() {
  var teamTabBtn = document.querySelector(".tab[data-t='team']");
  if (teamTabBtn) {
    teamTabBtn.addEventListener("click", function () {
      var sel = document.getElementById("staff-select");
      renderTeam(sel ? sel.value : getFirstActiveStaffId());
    });
  }
})();
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
var curStaffEl = document.getElementById("staff-select");
var curStaff = curStaffEl ? curStaffEl.value : "staff_01";
var staffFilter = (curStaff === "staff_01")
  ? "or=(staff_id.eq.staff_01,staff_id.is.null)"
  : ("staff_id=eq." + encodeURIComponent(curStaff));
const res = await fetch(cfg.sbUrl + "/rest/v1/chat_sessions?select=*&" + staffFilter + "&order=updated_at.desc&limit=25", {
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
  const st = (rawCfg.staffId && rawCfg.staffId !== "staff_01") ? rawCfg.staffId : getFirstActiveStaffId();
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
  syncTeamDirectoryToSupabase(STAFF_SLOTS); loadClients(cfg);
});

document.getElementById("staff-select").addEventListener("change", function(e) {
  var newId = e.target.value;
  var slot = STAFF_SLOTS.find(function (s) { return s.id === newId; });
  var nm = slot ? slot.name : "";
  if (document.getElementById("staff-name")) document.getElementById("staff-name").value = nm;
  chrome.storage.local.set({ staffId: newId, staffName: nm });
  chrome.runtime.sendMessage({ type: "REINIT_PEER", staffId: newId }).catch(function() {});
  selectedSessionId = null;
  rebuildStaffUI(newId);
  renderTeam(newId);
  chrome.storage.local.get(["sbUrl", "sbKey"], function(c) { loadClients(resolveSbCfg(c)); });
});

document.getElementById("status-select").addEventListener("change", function(e) {
  chrome.storage.local.set({ status: e.target.value });
  setBadge(e.target.value);
  syncTeamDirectoryToSupabase(STAFF_SLOTS);
});

document.getElementById("save-cfg").addEventListener("click", function() {
  var chosenId = document.getElementById("cfg-slot-select") ? document.getElementById("cfg-slot-select").value : document.getElementById("staff-select").value;
  var staffName = document.getElementById("staff-name") ? document.getElementById("staff-name").value.trim() : "";
  STAFF_SLOTS = STAFF_SLOTS.map(function (s) {
    return s.id === chosenId ? { id: s.id, name: staffName } : s;
});
syncTeamDirectoryToSupabase(STAFF_SLOTS); chrome.storage.local.set({ staffId: chosenId, staffName: staffName, staffList: STAFF_SLOTS }, function() {
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
syncTeamDirectoryToSupabase(STAFF_SLOTS); chrome.storage.local.set({ staffList: STAFF_SLOTS }, function () {
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
syncTeamDirectoryToSupabase(STAFF_SLOTS); chrome.storage.local.set({ staffList: STAFF_SLOTS }, function () {
var cur = document.getElementById("staff-select").value;
if (!STAFF_SLOTS.some(function (s) { return s.id === cur && s.id !== "staff_01"; })) cur = getFirstActiveStaffId();
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
  var quickBtn = null;
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
      switchTab("team");
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
function syncTeamDirectoryToSupabase(slots) {
  chrome.storage.local.get(["sbUrl", "sbKey", "staffId", "status"], function (rawCfg) {
    var cfg = resolveSbCfg(rawCfg);
    if (!cfg.sbUrl || !cfg.sbKey) return;
    var topSel = document.getElementById("staff-select");
    var stSel = document.getElementById("status-select");
    var activeId = (topSel && topSel.value) ? topSel.value : (rawCfg.staffId || "");
    var activeStatus = (stSel && stSel.value) ? stSel.value : (rawCfg.status || "online");
    var baseList = Array.isArray(slots) && slots.length ? slots : STAFF_SLOTS;

    fetch(cfg.sbUrl + "/rest/v1/chat_sessions?id=eq.4i4_team_directory&select=client_name&limit=1", {
      headers: { apikey: cfg.sbKey }
    }).then(function (r) { return r.ok ? r.json() : []; }).then(function (rows) {
      var prevMap = {};
      if (Array.isArray(rows) && rows.length > 0 && rows[0].client_name) {
        try {
          var prevArr = JSON.parse(rows[0].client_name);
          if (Array.isArray(prevArr)) {
            prevArr.forEach(function (item) { if (item && item.id) prevMap[item.id] = item; });
          }
        } catch (e) {}
      }
      var nowIso = new Date().toISOString();
      var enriched = baseList.map(function (s) {
        var old = prevMap[s.id] || {};
        var isMe = (s.id === activeId);
        return {
          id: s.id,
          name: s.name || "",
          status: isMe ? activeStatus : (old.status || "offline"),
          last_seen: isMe ? nowIso : (old.last_seen || "")
        };
      });
      return fetch(cfg.sbUrl + "/rest/v1/chat_sessions", {
        method: "POST",
        headers: {
          apikey: cfg.sbKey,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal"
        },
        body: JSON.stringify({
          id: "4i4_team_directory",
          project_id: "_system",
          staff_id: "archived",
          client_name: JSON.stringify(enriched),
          updated_at: nowIso
        })
      });
    }).catch(function () {});
  });
}

setInterval(function () {
  if (typeof syncTeamDirectoryToSupabase === "function") {
    syncTeamDirectoryToSupabase(STAFF_SLOTS);
  }
}, 25000);

function updateRestoreBtnState() {
  var restoreBtn = document.getElementById("restore-dialogs-btn");
  if (!restoreBtn) return;
  var archivedChecked = document.querySelectorAll("#admin-dialogs-list input[type='checkbox'][data-archived='1']:checked").length;
  if (archivedChecked > 0) {
    restoreBtn.disabled = false;
    restoreBtn.style.borderColor = "#10b981";
    restoreBtn.style.color = "#6ee7b7";
    restoreBtn.style.opacity = "1";
    restoreBtn.style.cursor = "pointer";
  } else {
    restoreBtn.disabled = true;
    restoreBtn.style.borderColor = "#475569";
    restoreBtn.style.color = "#64748b";
    restoreBtn.style.opacity = "0.5";
    restoreBtn.style.cursor = "not-allowed";
  }
}

async function loadAdminDialogs() {
  var box = document.getElementById("admin-dialogs-list");
  var stEl = document.getElementById("dialogs-admin-status");
  if (!box) return;
  box.innerHTML = "<div style='font-size:11px;color:#94a3b8;padding:4px;'>Завантаження діалогів...</div>";
  updateRestoreBtnState();
  chrome.storage.local.get(["sbUrl", "sbKey"], async function (rawCfg) {
    var cfg = resolveSbCfg(rawCfg);
    try {
      var res = await fetch(cfg.sbUrl + "/rest/v1/chat_sessions?select=id,client_name,project_id,staff_id,updated_at&id=neq.4i4_team_directory&project_id=not.in.(_system,_team_dm)&order=updated_at.desc&limit=50", {
        headers: { apikey: cfg.sbKey }
      });
      var rows = await res.json();
      box.innerHTML = "";
      if (!Array.isArray(rows) || rows.length === 0) {
        box.innerHTML = "<div style='font-size:11px;color:#64748b;padding:4px;'>Діалогів у базі немає.</div>";
        updateRestoreBtnState();
        return;
      }
      rows.forEach(function (s) {
        var row = document.createElement("label");
        row.style.cssText = "display:flex;align-items:center;gap:8px;margin:0;padding:5px 8px;border-radius:8px;background:rgba(15,23,42,0.85);color:#e2e8f0;font-size:11px;cursor:pointer;";
        var isArchived = s.staff_id === "archived";
        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.value = s.id;
        cb.dataset.archived = isArchived ? "1" : "0";
        var lbl = document.createElement("span");
        lbl.style.cssText = "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
        lbl.textContent = (s.client_name || "Клієнт") + " • " + (s.project_id || "проєкт") + (isArchived ? " [приховано]" : "");
        if (isArchived) lbl.style.color = "#94a3b8";
        lbl.title = s.id;
        row.appendChild(cb);
        row.appendChild(lbl);
        box.appendChild(row);
      });
      updateRestoreBtnState();
    } catch (err) {
      if (stEl) {
        stEl.style.color = "#f87171";
        stEl.textContent = "Помилка завантаження: " + err.message;
      }
    }
  });
}

(function bindAdminDialogsManager() {
  var listBox = document.getElementById("admin-dialogs-list");
  var refBtn = document.getElementById("refresh-admin-dialogs-btn");
  var restoreBtn = document.getElementById("restore-dialogs-btn");
  var hideBtn = document.getElementById("hide-dialogs-btn");
  var delBtn = document.getElementById("del-dialogs-btn");
  var stEl = document.getElementById("dialogs-admin-status");

  if (listBox) {
    listBox.addEventListener("change", updateRestoreBtnState);
  }

  if (refBtn) {
    refBtn.addEventListener("click", function () {
      if (isAdminUnlocked) loadAdminDialogs();
    });
  }

  if (restoreBtn) {
    restoreBtn.addEventListener("click", function () {
      if (!isAdminUnlocked || restoreBtn.disabled) return;
      var checked = Array.from(document.querySelectorAll("#admin-dialogs-list input[type='checkbox'][data-archived='1']:checked")).map(function (c) { return c.value; });
      if (checked.length === 0) return;
      restoreBtn.disabled = true;
      stEl.style.color = "#38bdf8";
      stEl.textContent = "Відновлення у вікно клієнтів...";

      chrome.storage.local.get(["sbUrl", "sbKey"], async function (rawCfg) {
        var cfg = resolveSbCfg(rawCfg);
        var inFilter = "(" + checked.map(function (id) { return '"' + id.replace(/"/g, "") + '"'; }).join(",") + ")";
        try {
          var patchRes = await fetch(cfg.sbUrl + "/rest/v1/chat_sessions?id=in." + encodeURIComponent(inFilter), {
            method: "PATCH",
            headers: {
              apikey: cfg.sbKey,
              "Content-Type": "application/json",
              Prefer: "return=minimal"
            },
            body: JSON.stringify({ staff_id: null })
          });
          if (!patchRes.ok) throw new Error("HTTP " + patchRes.status);

          stEl.style.color = "#6ee7b7";
          stEl.textContent = "♻ Відновлено діалогів: " + checked.length;
          await loadAdminDialogs();
          syncTeamDirectoryToSupabase(STAFF_SLOTS); loadClients(cfg);
        } catch (err) {
          stEl.style.color = "#f87171";
          stEl.textContent = "Помилка відновлення: " + err.message;
          updateRestoreBtnState();
        }
      });
    });
  }

  if (hideBtn) {
    hideBtn.addEventListener("click", function () {
      if (!isAdminUnlocked) return;
      var checked = Array.from(document.querySelectorAll("#admin-dialogs-list input[type='checkbox']:checked")).map(function (c) { return c.value; });
      if (checked.length === 0) {
        stEl.style.color = "#f87171";
        stEl.textContent = "Позначте чекбоксами діалоги для приховування.";
        return;
      }
      hideBtn.disabled = true;
      stEl.style.color = "#38bdf8";
      stEl.textContent = "Приховування у всіх операторів...";

      chrome.storage.local.get(["sbUrl", "sbKey"], async function (rawCfg) {
        var cfg = resolveSbCfg(rawCfg);
        var inFilter = "(" + checked.map(function (id) { return '"' + id.replace(/"/g, "") + '"'; }).join(",") + ")";
        try {
          var patchRes = await fetch(cfg.sbUrl + "/rest/v1/chat_sessions?id=in." + encodeURIComponent(inFilter), {
            method: "PATCH",
            headers: {
              apikey: cfg.sbKey,
              "Content-Type": "application/json",
              Prefer: "return=minimal"
            },
            body: JSON.stringify({ staff_id: "archived" })
          });
          if (!patchRes.ok) throw new Error("HTTP " + patchRes.status);

          if (checked.indexOf(selectedSessionId) !== -1) {
            selectedSessionId = null;
          }
          stEl.style.color = "#6ee7b7";
          stEl.textContent = "👁 Приховано з вікна клієнтів: " + checked.length;
          await loadAdminDialogs();
          syncTeamDirectoryToSupabase(STAFF_SLOTS); loadClients(cfg);
        } catch (err) {
          stEl.style.color = "#f87171";
          stEl.textContent = "Помилка приховування: " + err.message;
        } finally {
          hideBtn.disabled = false;
        }
      });
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
          stEl.textContent = "✅ Видалено з бази: " + checked.length;
          await loadAdminDialogs();
          syncTeamDirectoryToSupabase(STAFF_SLOTS); loadClients(cfg);
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



(function initQuickClientsHub() {
  var btn = document.getElementById("quick-clients-btn"); var wrap = document.getElementById("quick-clients-wrap") || (btn ? btn.parentElement : null);

  if (!btn || !wrap) return;

  var menu = document.getElementById("quick-clients-menu");
  if (!menu) {
    menu = document.createElement("div");
    menu.id = "quick-clients-menu";
    menu.style.cssText = "display:none;position:absolute;top:115%;left:0;min-width:295px;max-height:280px;overflow-y:auto;background:#0b132b;border:1px solid rgba(56,189,248,0.55);border-radius:14px;padding:6px;z-index:9999;box-shadow:0 12px 28px rgba(0,0,0,0.8);";
    wrap.appendChild(menu);
  }

  var hiddenFileInp = document.createElement("input");
  hiddenFileInp.type = "file";
  hiddenFileInp.style.display = "none";
  document.body.appendChild(hiddenFileInp);
  var targetFileSession = null;

  hiddenFileInp.addEventListener("change", function () {
    var file = hiddenFileInp.files && hiddenFileInp.files.item(0);
    if (!file || !targetFileSession) return;
    var sess = targetFileSession;
    targetFileSession = null;
    chrome.storage.local.get(["sbUrl", "sbKey"], async function (rawCfg) {
      var cfg = resolveSbCfg(rawCfg);
      var myLabel = getStaffDisplay();
      var safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      var path = sess.id + "/" + Date.now() + "_" + safeName;
      var fileUrl = "";
      try {
        var upRes = await fetch(cfg.sbUrl + "/storage/v1/object/chat-files/" + path, {
          method: "POST",
          headers: { apikey: cfg.sbKey, "Content-Type": file.type || "application/octet-stream", "x-upsert": "true" },
          body: file
        });
        if (upRes.ok) fileUrl = cfg.sbUrl + "/storage/v1/object/public/chat-files/" + path;
      } catch (e) {}
      if (!fileUrl && file.size <= 1048576) {
        fileUrl = await new Promise(function (resolve) {
          var r = new FileReader();
          r.onload = function () { resolve(r.result); };
          r.onerror = function () { resolve(""); };
          r.readAsDataURL(file);
        });
      }
      if (!fileUrl) { alert("Не вдалося завантажити файл."); return; }
      await fetch(cfg.sbUrl + "/rest/v1/chat_messages", {
        method: "POST",
        headers: { apikey: cfg.sbKey, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({
          session_id: sess.id,
          project_id: sess.project_id || "general",
          sender: "staff",
          text: "📎 Файл: " + file.name,
          file_url: fileUrl,
          file_name: myLabel
        })
      });
      selectedSessionId = sess.id;
      switchTab("clients");
      loadClients(cfg);
    });
  });

  function renderQuickClientsList() {
    menu.innerHTML = "<div style='font-size:11px;color:#94a3b8;padding:6px;'>Оновлення списку клієнтів...</div>";
    chrome.storage.local.get(["sbUrl", "sbKey"], function (rawCfg) {
      var cfg = resolveSbCfg(rawCfg);
      var topSel = document.getElementById("staff-select");
      var curStaff = (topSel && topSel.value && topSel.value !== "staff_01") ? topSel.value : getFirstActiveStaffId();
      var url = cfg.sbUrl + "/rest/v1/chat_sessions?select=id,client_name,project_id,staff_id,updated_at&staff_id=eq." + encodeURIComponent(curStaff) + "&order=updated_at.desc&limit=20";

      fetch(url, { headers: { apikey: cfg.sbKey } })
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.json();
        })
        .then(function (rows) {
          menu.innerHTML = "";
          var validRows = Array.isArray(rows) ? rows.filter(function (r) {
            return r && r.id && r.id !== "4i4_team_directory" && r.project_id !== "_system" && r.project_id !== "_team_dm";
          }) : [];

          if (validRows.length === 0) {
            menu.innerHTML = "<div style='font-size:11px;color:#64748b;padding:8px;'>Активних клієнтів для " + curStaff + " немає.</div>";
            return;
          }

          validRows.forEach(function (s) {
            var isRecent = s.updated_at && (Date.now() - new Date(s.updated_at).getTime() < 300000);
            var dot = isRecent ? "🟢" : "⚫";
            var item = document.createElement("div");
            item.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:6px;padding:6px 8px;border-radius:10px;background:rgba(15,23,42,0.9);margin-bottom:4px;border:1px solid rgba(56,189,248,0.22);";

            var info = document.createElement("div");
            info.style.cssText = "min-width:0;flex:1;";
            info.innerHTML =
              "<div style='font-size:11.5px;font-weight:600;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'>" + dot + " " + (s.client_name || "Клієнт") + "</div>" +
              "<div style='font-size:10px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'>" + (s.project_id || "проєкт") + "</div>";

            var acts = document.createElement("div");
            acts.style.cssText = "display:flex;gap:4px;flex-shrink:0;";
            acts.innerHTML =
              "<button type='button' class='icon-btn' data-act='voice' title='Голосовий дзвінок' style='width:24px;height:24px;font-size:11px;'>🎙</button>" +
              "<button type='button' class='icon-btn' data-act='video' title='Відеодзвінок' style='width:24px;height:24px;font-size:11px;border-color:#10b981;color:#6ee7b7;'>📹</button>" +
              "<button type='button' class='icon-btn' data-act='chat' title='Відкрити діалог' style='width:24px;height:24px;font-size:11px;'>💬</button>" +
              "<button type='button' class='icon-btn' data-act='file' title='Надіслати файл' style='width:24px;height:24px;font-size:11px;'>📎</button>";

            acts.querySelector("[data-act='voice']").onclick = function () {
              menu.style.display = "none";
              callPeer("4i4_client_" + s.id, false, s.client_name || "Клієнт");
            };
            acts.querySelector("[data-act='video']").onclick = function () {
              menu.style.display = "none";
              callPeer("4i4_client_" + s.id, true, s.client_name || "Клієнт");
            };
            acts.querySelector("[data-act='chat']").onclick = function () {
              menu.style.display = "none";
              selectedSessionId = s.id;
              switchTab("clients");
              loadClients(cfg);
            };
            acts.querySelector("[data-act='file']").onclick = function () {
              menu.style.display = "none";
              targetFileSession = s;
              hiddenFileInp.value = "";
              hiddenFileInp.click();
            };

            item.appendChild(info);
            item.appendChild(acts);
            menu.appendChild(item);
          });
        })
        .catch(function (err) {
          menu.innerHTML = "<div style='font-size:11px;color:#f87171;padding:6px;'>Помилка: " + (err && err.message ? err.message : "немає зв'язку") + "</div>";
        });
    });
  }

  btn.addEventListener("click", function (ev) {
    ev.preventDefault();
    ev.stopPropagation();
    var isOpen = menu.style.display === "block";
    menu.style.display = isOpen ? "none" : "block";
    if (!isOpen) renderQuickClientsList();
  });

  document.addEventListener("click", function (ev) {
    if (wrap && !wrap.contains(ev.target)) {
      menu.style.display = "none";
    }
  });
})();

(function renderExtVersionBadge() {
  var el = document.getElementById("ext-ver-badge");
  if (!el) return;
  try {
    var m = (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getManifest) ? chrome.runtime.getManifest() : null;
    if (m && m.version) el.textContent = "v" + m.version;
  } catch (e) {}
})();

(function bindAdminStaff01Mode() {
  var btn = document.getElementById("admin-view-staff01-btn");
  if (!btn) return;
  btn.addEventListener("click", function () {
    if (!isAdminUnlocked) return;
    var topSel = document.getElementById("staff-select");
    if (!topSel) return;
    var opt01 = Array.from(topSel.options).find(function (o) { return o.value === "staff_01"; });
    if (topSel.value === "staff_01") {
      if (opt01) {
        opt01.disabled = true;
        opt01.style.color = "#64748b";
        opt01.textContent = "🔒 staff_01 (системний)";
      }
      var nextId = getFirstActiveStaffId();
      topSel.value = nextId;
      btn.style.background = "rgba(2, 132, 199, 0.25)";
      btn.style.borderColor = "#38bdf8";
      btn.style.color = "#bae6fd";
      btn.textContent = "👁 Режим staff_01";
      selectedSessionId = null;
      chrome.storage.local.get(["sbUrl", "sbKey"], function (c) { loadClients(resolveSbCfg(c)); });
      return;
    }
    if (opt01) {
      opt01.disabled = false;
      opt01.style.color = "#34d399";
      opt01.textContent = "🛡 staff_01 (Адмін-архів)";
    }
    topSel.value = "staff_01";
    btn.style.background = "rgba(16, 185, 129, 0.25)";
    btn.style.borderColor = "#10b981";
    btn.style.color = "#6ee7b7";
    btn.textContent = "✅ У режимі staff_01";
    selectedSessionId = null;
    switchTab("clients");
    chrome.storage.local.get(["sbUrl", "sbKey"], function (c) { loadClients(resolveSbCfg(c)); });
  });
})();
