(function () {
  var bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("4i4_local_chat") : null;
  var activeSessionId = new URLSearchParams(window.location.search).get("room") || localStorage.getItem("4i4_chat_session") || ("sess_" + Math.random().toString(36).slice(2, 10));
  localStorage.setItem("4i4_chat_session", activeSessionId);

  var currentProject = null;
  var peerInstance = null;
  var activeCall = null;
  var localStream = null;
  var isMuted = false;
  var isCamOff = false;
  var rtChannel = null;

  function esc(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function getLocalStore() {
    try { return JSON.parse(localStorage.getItem("4i4_local_msgs") || "[]"); } catch (e) { return []; }
  }
  function saveLocalMsg(msg) {
    var arr = getLocalStore();
    arr.push(msg);
    localStorage.setItem("4i4_local_msgs", JSON.stringify(arr.slice(-200)));
    if (bc) bc.postMessage({ type: "msg", payload: msg });
  }

  function initPeer(onReady) {
    if (peerInstance && !peerInstance.destroyed) { if (onReady) onReady(peerInstance); return; }
    window.ensureCommsSdk().then(function () {
      if (!window.Peer) return;
      var myPeerId = "4i4_client_" + activeSessionId;
      peerInstance = new window.Peer(myPeerId);
      peerInstance.on("open", function () { if (onReady) onReady(peerInstance); });
      peerInstance.on("call", function (call) {
        showIncomingCallBanner(call);
      });
    });
  }

  function showIncomingCallBanner(call) {
    var box = document.getElementById("pchat-call-stage");
    if (!box) return;
    box.style.display = "block";
    box.innerHTML = '<div style="padding:14px;border-radius:14px;background:rgba(16,185,129,0.2);border:1px solid #10b981;display:flex;justify-content:space-between;align-items:center;">' +
      '<span>📞 Вхідний виклик від спеціаліста студії «4і4»...</span>' +
      '<div style="display:flex;gap:8px;">' +
      '<button id="pchat-ans-btn" style="padding:6px 14px;border-radius:999px;background:#10b981;color:#060b19;font-weight:700;border:none;cursor:pointer;">Відповісти</button>' +
      '<button id="pchat-rej-btn" style="padding:6px 12px;border-radius:999px;background:#7f1d1d;color:#fff;border:none;cursor:pointer;">✕</button>' +
      '</div></div>';
    document.getElementById("pchat-ans-btn").onclick = function () {
      navigator.mediaDevices.getUserMedia({ audio: true, video: true }).catch(function () {
        return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      }).then(function (stream) {
        localStream = stream;
        call.answer(stream);
        bindCallStream(call, stream);
      });
    };
    document.getElementById("pchat-rej-btn").onclick = function () { call.close(); box.style.display = "none"; };
  }

  function startCall(withVideo) {
    if (!currentProject) return;
    var staffPeerId = "4i4_staff_" + (currentProject.assignedStaffId || "staff_01");
    initPeer(function (peer) {
      navigator.mediaDevices.getUserMedia({ audio: true, video: !!withVideo }).then(function (stream) {
        localStream = stream;
        var call = peer.call(staffPeerId, stream);
        bindCallStream(call, stream);
      }).catch(function (err) {
        alert("Не вдалося отримати доступ до мікрофона/камери: " + err.message);
      });
    });
  }

  function bindCallStream(call, myStream) {
    activeCall = call;
    var stage = document.getElementById("pchat-call-stage");
    if (!stage) return;
    stage.style.display = "block";
    stage.innerHTML = [
      '<div style="background:#040814;border:1px solid #38bdf8;border-radius:16px;padding:12px;">',
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">',
      '<video id="pchat-remote-vid" autoplay playsinline style="width:100%;height:160px;background:#0b132b;border-radius:10px;object-fit:cover;"></video>',
      '<video id="pchat-local-vid" autoplay muted playsinline style="width:100%;height:160px;background:#0b132b;border-radius:10px;object-fit:cover;"></video>',
      '</div>',
      '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">',
      '<button id="pchat-mute-btn" style="padding:6px 14px;border-radius:999px;background:#1e293b;border:1px solid #475569;color:#fff;cursor:pointer;">🎙️ Мікрофон</button>',
      '<button id="pchat-cam-btn" style="padding:6px 14px;border-radius:999px;background:#1e293b;border:1px solid #475569;color:#fff;cursor:pointer;">📹 Камера</button>',
      '<button id="pchat-scr-btn" style="padding:6px 14px;border-radius:999px;background:rgba(56,189,248,0.2);border:1px solid #38bdf8;color:#bae6fd;cursor:pointer;">🖥️ Показ екрана</button>',
      '<button id="pchat-end-btn" style="padding:6px 16px;border-radius:999px;background:#dc2626;color:#fff;border:none;font-weight:700;cursor:pointer;">Завершити</button>',
      '</div></div>'
    ].join("");

    var locVid = document.getElementById("pchat-local-vid");
    if (locVid) locVid.srcObject = myStream;

    call.on("stream", function (remStream) {
      var remVid = document.getElementById("pchat-remote-vid");
      if (remVid) remVid.srcObject = remStream;
    });
    call.on("close", endCall);

    document.getElementById("pchat-mute-btn").onclick = function () {
      isMuted = !isMuted;
      myStream.getAudioTracks().forEach(function (t) { t.enabled = !isMuted; });
      this.style.opacity = isMuted ? "0.5" : "1";
    };
    document.getElementById("pchat-cam-btn").onclick = function () {
      isCamOff = !isCamOff;
      myStream.getVideoTracks().forEach(function (t) { t.enabled = !isCamOff; });
      this.style.opacity = isCamOff ? "0.5" : "1";
    };
    document.getElementById("pchat-scr-btn").onclick = function () {
      if (!navigator.mediaDevices.getDisplayMedia) return;
      navigator.mediaDevices.getDisplayMedia({ video: true }).then(function (scrStream) {
        var track = scrStream.getVideoTracks()[0];
        if (locVid) locVid.srcObject = scrStream;
        if (call.peerConnection) {
          var sender = call.peerConnection.getSenders().find(function (s) { return s.track && s.track.kind === "video"; });
          if (sender) sender.replaceTrack(track);
        }
      });
    };
    document.getElementById("pchat-end-btn").onclick = endCall;
  }

  function endCall() {
    if (activeCall) { try { activeCall.close(); } catch (e) {} activeCall = null; }
    if (localStream) { localStream.getTracks().forEach(function (t) { t.stop(); }); localStream = null; }
    var stage = document.getElementById("pchat-call-stage");
    if (stage) { stage.style.display = "none"; stage.innerHTML = ""; }
  }

  function appendMsgBubble(m) {
    var feed = document.getElementById("pchat-feed");
    if (!feed) return;
    var isClient = m.sender === "client";
    var fileHtml = "";
    if (m.file_url) {
      if (/\.(webp|png|jpg|jpeg|gif)$/i.test(m.file_name || m.file_url) || m.file_url.indexOf("data:image") === 0) {
        fileHtml = '<div style="margin-top:6px;"><img src="' + esc(m.file_url) + '" style="max-width:200px;border-radius:10px;display:block;"></div>';
      } else {
        fileHtml = '<div style="margin-top:6px;"><a href="' + esc(m.file_url) + '" target="_blank" style="color:#38bdf8;text-decoration:underline;">📎 ' + esc(m.file_name || "Файл") + '</a></div>';
      }
    }
    var row = document.createElement("div");
    row.style.cssText = "display:flex;flex-direction:column;align-items:" + (isClient ? "flex-end" : "flex-start") + ";margin-bottom:8px;";
    row.innerHTML = '<div style="max-width:82%;padding:9px 14px;border-radius:16px;font-size:0.9rem;line-height:1.45;background:' +
      (isClient ? "rgba(16,185,129,0.22);border:1px solid rgba(16,185,129,0.45);color:#ecfdf5;" : "rgba(30,41,59,0.9);border:1px solid rgba(56,189,248,0.3);color:#f1f5f9;") +
      '">' + (m.text ? '<div>' + esc(m.text) + '</div>' : '') + fileHtml + '</div>';
    feed.appendChild(row);
    feed.scrollTop = feed.scrollHeight;
  }

  function syncSessionAndLoad(sb) {
    var feed = document.getElementById("pchat-feed");
    if (!feed) return;
    feed.innerHTML = "";
    var name = localStorage.getItem("4i4_client_name") || "Гість";
    var email = localStorage.getItem("4i4_client_email") || "";

    if (!sb) {
      getLocalStore().filter(function (x) { return x.session_id === activeSessionId; }).forEach(appendMsgBubble);
      return;
    }

    sb.from("chat_sessions").upsert({
      id: activeSessionId,
      project_id: currentProject.id,
      staff_id: currentProject.assignedStaffId || "staff_01",
      client_name: name,
      client_email: email,
      updated_at: new Date().toISOString()
    }).then(function () {
      return sb.from("chat_messages").select("*").eq("session_id", activeSessionId).order("created_at", { ascending: true });
    }).then(function (res) {
      if (res && Array.isArray(res.data)) res.data.forEach(appendMsgBubble);
    });

    if (rtChannel) { try { sb.removeChannel(rtChannel); } catch (e) {} }
    rtChannel = sb.channel("room_" + activeSessionId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: "session_id=eq." + activeSessionId }, function (payload) {
        if (payload.new && payload.new.sender !== "client") appendMsgBubble(payload.new);
      })
      .on("presence", { event: "sync" }, function () {})
      .subscribe(function (status) {
        if (status === "SUBSCRIBED") {
          rtChannel.track({ session_id: activeSessionId, project_id: currentProject.id, online_at: new Date().toISOString() });
        }
      });
  }

  function sendMessage(text, fileUrl, fileName) {
    if (!text && !fileUrl) return;
    var msg = {
      session_id: activeSessionId,
      project_id: currentProject.id,
sender: "client",
text: text || "",
file_url: fileUrl || "",
file_name: fileName || "",
created_at: new Date().toISOString()
};
appendMsgBubble(msg);
window.ensureCommsSdk().then(function (sb) {
if (!sb) { saveLocalMsg(msg); return; }
sb.from("chat_sessions").upsert({
id: activeSessionId,
project_id: currentProject.id,
staff_id: currentProject.assignedStaffId || "staff_01",
client_name: localStorage.getItem("4i4_client_name") || "Гість",
client_email: localStorage.getItem("4i4_client_email") || "",
updated_at: new Date().toISOString()
}).then(function () {
return sb.from("chat_messages").insert(msg);
});
});
}
window.mountProjectChat = function (project, autoOpen) {
currentProject = project;
var inspector = document.getElementById("project-inspector");
if (!inspector) return;
var old = document.getElementById("project-chat-widget");
if (old) old.remove();
if (!project || !project.chatEnabled) return;
var savedName = localStorage.getItem("4i4_client_name") || "";
var savedEmail = localStorage.getItem("4i4_client_email") || "";
var isRoomLink = !!new URLSearchParams(window.location.search).get("room");
var wrap = document.createElement("div");
wrap.id = "project-chat-widget";
wrap.style.cssText = "margin-top:16px;padding:18px 20px;border-radius:20px;background:rgba(6,11,25,0.82);border:1px solid rgba(16,185,129,0.4);box-shadow:0 12px 32px rgba(0,0,0,0.4);";
wrap.innerHTML = "";
    var hRow = document.createElement("div");
    hRow.style.cssText = "display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;";
    var hTitle = document.createElement("strong");
    hTitle.style.cssText = "color:#6ee7b7;font-size:1rem;";
    hTitle.textContent = "💬 Живий діалог зі спеціалістом";
    var btnBox = document.createElement("div");
    btnBox.style.cssText = "display:flex;gap:8px;";
    var vBtn = document.createElement("button");
    vBtn.type = "button"; vBtn.id = "pchat-voice-btn"; vBtn.textContent = "🎙️ Голосовий";
    vBtn.style.cssText = "padding:7px 14px;border-radius:999px;background:rgba(56,189,248,0.18);border:1px solid #38bdf8;color:#bae6fd;font-size:0.85rem;cursor:pointer;";
    var vidBtn = document.createElement("button");
    vidBtn.type = "button"; vidBtn.id = "pchat-video-btn"; vidBtn.textContent = "📹 Відеодзвінок";
    vidBtn.style.cssText = "padding:7px 14px;border-radius:999px;background:rgba(16,185,129,0.2);border:1px solid #10b981;color:#6ee7b7;font-size:0.85rem;cursor:pointer;";
    btnBox.append(vBtn, vidBtn); hRow.append(hTitle, btnBox);

    var stage = document.createElement("div");
    stage.id = "pchat-call-stage"; stage.style.cssText = "display:none;margin-bottom:12px;";

    var uRow = document.createElement("div");
    uRow.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;";
    var nInp = document.createElement("input");
    nInp.id = "pchat-name"; nInp.value = savedName; nInp.placeholder = "Ваше ім'я";
    nInp.style.cssText = "padding:8px 12px;border-radius:999px;background:#0b132b;border:1px solid #334155;color:#fff;font-size:0.85rem;";
    var eInp = document.createElement("input");
    eInp.id = "pchat-email"; eInp.value = savedEmail; eInp.placeholder = "Email для зв'язку";
    eInp.style.cssText = "padding:8px 12px;border-radius:999px;background:#0b132b;border:1px solid #334155;color:#fff;font-size:0.85rem;";
    uRow.append(nInp, eInp);

    var feed = document.createElement("div");
    feed.id = "pchat-feed";
    feed.style.cssText = "height:170px;overflow-y:auto;padding:10px;border-radius:14px;background:rgba(11,19,43,0.75);border:1px solid rgba(255,255,255,0.06);margin-bottom:10px;";

    var fRow = document.createElement("div");
    fRow.style.cssText = "display:flex;gap:8px;align-items:center;";
    var fLbl = document.createElement("label");
    fLbl.textContent = "📎";
    fLbl.style.cssText = "padding:9px 13px;border-radius:999px;background:#1e293b;border:1px solid #475569;color:#cbd5e1;cursor:pointer;";
    var fInp = document.createElement("input");
    fInp.type = "file"; fInp.id = "pchat-file"; fInp.style.display = "none";
    fLbl.appendChild(fInp);
    var mInp = document.createElement("input");
    mInp.id = "pchat-input"; mInp.placeholder = "Напишіть запитання...";
    mInp.style.cssText = "flex:1;padding:10px 16px;border-radius:999px;background:#0b132b;border:1px solid #38bdf8;color:#fff;";
    var sBtn = document.createElement("button");
    sBtn.type = "button"; sBtn.id = "pchat-send-btn"; sBtn.textContent = "Надіслати";
    sBtn.style.cssText = "padding:10px 20px;border-radius:999px;background:#10b981;color:#060b19;font-weight:700;border:none;cursor:pointer;";
    fRow.append(fLbl, mInp, sBtn);

    wrap.append(hRow, stage, uRow, feed, fRow);
inspector.appendChild(wrap);
if (autoOpen || isRoomLink) wrap.scrollIntoView({ behavior: "smooth", block: "nearest" });
document.getElementById("pchat-name").oninput = function () { localStorage.setItem("4i4_client_name", this.value); };
document.getElementById("pchat-email").oninput = function () { localStorage.setItem("4i4_client_email", this.value); };
document.getElementById("pchat-voice-btn").onclick = function () { startCall(false); };
document.getElementById("pchat-video-btn").onclick = function () { startCall(true); };
var inp = document.getElementById("pchat-input");
document.getElementById("pchat-send-btn").onclick = function () {
var val = inp.value.trim();
if (!val) return;
inp.value = "";
sendMessage(val);
};
inp.addEventListener("keydown", function (e) { if (e.key === "Enter") document.getElementById("pchat-send-btn").click(); });
document.getElementById("pchat-file").onchange = function () {
var file = this.files[0];
if (!file) return;
window.ensureCommsSdk().then(function (sb) {
if (!sb) {
var r = new FileReader();
r.onload = function () { sendMessage("", r.result, file.name); };
r.readAsDataURL(file);
return;
}
var path = activeSessionId + "/" + Date.now() + "" + file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
sb.storage.from(window.CHAT_CONFIG.storageBucket || "chat-files").upload(path, file).then(function (up) {
if (up.error) throw up.error;
var pub = sb.storage.from(window.CHAT_CONFIG.storageBucket || "chat-files").getPublicUrl(path);
sendMessage("", pub.data.publicUrl, file.name);
}).catch(function () {
var r = new FileReader();
r.onload = function () { sendMessage("", r.result, file.name); };
r.readAsDataURL(file);
});
});
};
window.ensureCommsSdk().then(function (sb) {
syncSessionAndLoad(sb);
initPeer();
});
};
if (bc) {
bc.onmessage = function (ev) {
if (ev.data && ev.data.type === "msg" && ev.data.payload.session_id === activeSessionId && ev.data.payload.sender !== "client") {
appendMsgBubble(ev.data.payload);
}
};
}
})();