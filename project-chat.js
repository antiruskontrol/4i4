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
    if (peerInstance && !peerInstance.destroyed) {
      if (peerInstance.disconnected) {
        try { peerInstance.reconnect(); } catch (e) {}
      }
      if (peerInstance.open && !peerInstance.disconnected) {
        if (onReady) onReady(peerInstance);
        return;
      }
      var waited = false;
      var onceOpen = function () {
        if (waited) return;
        waited = true;
        if (onReady) onReady(peerInstance);
      };
      peerInstance.once("open", onceOpen);
      setTimeout(function () {
        if (!waited && peerInstance && peerInstance.open) onceOpen();
      }, 1200);
      return;
    }
    window.ensureCommsSdk().then(function () {
      if (!window.Peer) { alert("Модуль WebRTC (PeerJS) не завантажився. Перевірте lib/peerjs.min.js або інтернет."); return; }
      peerInstance = new window.Peer();
      peerInstance.on("open", function () { if (onReady) onReady(peerInstance); });
      peerInstance.on("call", function (call) {
        showIncomingCallBanner(call);
      });
      peerInstance.on("error", function (err) {
        if (err && err.type === "unavailable-id") {
          try { peerInstance.destroy(); } catch (e) {}
          peerInstance = null;
          setTimeout(function () { initPeer(onReady); }, 300);
        }
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

  function computeSessionId(projId, clientName, staffOverride) {
    var st = staffOverride || getSelectedStaffId() || "staff_01";
    var raw = (projId || "proj") + "_" + (clientName || "guest").trim().toLowerCase() + "_" + st;
    var hash = 0;
    for (var i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    var sid = "sess_" + Math.abs(hash).toString(36) + "_" + st;
    localStorage.setItem("4i4_chat_session", sid);
    return sid;
  }

  function getSelectedStaffId() {
    var sel = document.getElementById("pchat-staff-select");
    if (sel && sel.value) return sel.value;
    if (currentProject && currentProject.id) {
      var saved = localStorage.getItem("4i4_selected_staff_" + currentProject.id);
      if (saved) return saved;
    }
    var fb = (currentProject && currentProject.assignedStaffId && currentProject.assignedStaffId !== "staff_01") ? currentProject.assignedStaffId : "staff_02"; return fb;
  }

  var latestStaffDirectory = [];

  function formatStaffPresence(st) {
    if (!st) return { dot: "⚫", label: "не в мережі", color: "#94a3b8", online: false };
    var fresh = false;
    if (st.last_seen) {
      var diffMs = Date.now() - new Date(st.last_seen).getTime();
      fresh = !isNaN(diffMs) && diffMs < 90000;
    }
    if (fresh && st.status === "online") {
      return { dot: "🟢", label: "в мережі", color: "#34d399", online: true };
    }
    if (fresh && st.status === "busy") {
      return { dot: "🟡", label: "зайнятий", color: "#fbbf24", online: true };
    }
    return { dot: "⚫", label: "не в мережі", color: "#94a3b8", online: false };
  }

  function updateDialogPresenceBadge() {
    var badge = document.getElementById("pchat-presence-badge");
    var sel = document.getElementById("pchat-staff-select");
    if (!badge || !sel) return;
    var curId = sel.value;
    var st = latestStaffDirectory.find(function (x) { return x && x.id === curId; });
    var pr = formatStaffPresence(st);
    var titleName = st && st.name ? (st.name + " (" + curId + ")") : curId;
    badge.style.color = pr.color;
    badge.style.borderColor = pr.online ? "rgba(16,185,129,0.45)" : "rgba(148,163,184,0.3)";
    badge.style.background = pr.online ? "rgba(16,185,129,0.12)" : "rgba(15,23,42,0.75)";
    badge.textContent = pr.dot + " " + titleName + " • " + pr.label;
  }

  function populateStaffSelector(selEl) {
    if (!selEl) return;
    var rawDefault = (currentProject && currentProject.assignedStaffId && currentProject.assignedStaffId !== "staff_01")
      ? currentProject.assignedStaffId
      : "staff_02";
    var savedId = (currentProject && currentProject.id) ? localStorage.getItem("4i4_selected_staff_" + currentProject.id) : "";
    if (savedId === "staff_01") savedId = "";
    var activeVal = savedId || rawDefault;

    function applyList(list) {
      latestStaffDirectory = Array.isArray(list) ? list : [];
      var clean = latestStaffDirectory.filter(function (x) { return x && x.id && x.id !== "staff_01"; });
      if (clean.length === 0) {
        clean = [{ id: rawDefault, name: "", status: "offline" }];
      }
      var prev = (selEl.value && selEl.value !== "staff_01") ? selEl.value : activeVal;
      selEl.innerHTML = "";

      var sysOpt = document.createElement("option");
      sysOpt.value = "staff_01";
      sysOpt.disabled = true;
      sysOpt.style.color = "#64748b";
      sysOpt.textContent = "🔒 staff_01 (системний)";
      selEl.appendChild(sysOpt);

      clean.forEach(function (st) {
        var opt = document.createElement("option");
        opt.value = st.id;
        var pr = formatStaffPresence(st);
        var baseLabel = st.name ? (st.name + " (" + st.id + ")") : st.id;
        opt.textContent = pr.dot + " " + baseLabel + " — " + pr.label;
        selEl.appendChild(opt);
      });

      if (clean.some(function (x) { return x.id === prev; })) {
        selEl.value = prev;
      } else {
        selEl.value = clean[0].id;
      }
      if (currentProject && currentProject.id && selEl.value && selEl.value !== "staff_01") {
        localStorage.setItem("4i4_selected_staff_" + currentProject.id, selEl.value);
      }
      updateDialogPresenceBadge();
    }

    applyList([{ id: rawDefault, name: "", status: "offline" }]);

    var cfg = window.CHAT_CONFIG || {};
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return;

    function fetchDirectory() {
      fetch(cfg.supabaseUrl + "/rest/v1/chat_sessions?id=eq.4i4_team_directory&select=client_name&limit=1", {
        headers: { apikey: cfg.supabaseAnonKey }
      }).then(function (r) { return r.ok ? r.json() : []; }).then(function (rows) {
        if (Array.isArray(rows) && rows.length > 0 && rows[0].client_name) {
          var parsed = JSON.parse(rows[0].client_name);
          if (Array.isArray(parsed) && parsed.length > 0) {
            applyList(parsed);
            return;
          }
        }
        if (Array.isArray(cfg.staffList) && cfg.staffList.length > 0) {
          applyList(cfg.staffList);
        }
      }).catch(function () {});
    }

    fetchDirectory();
    if (window._4i4DirPoll) clearInterval(window._4i4DirPoll);
    window._4i4DirPoll = setInterval(fetchDirectory, 15000);
  }
  var hasRealMic = false;

  function createSilentFallbackStream() {
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        var ctx = new AudioCtx();
        var dst = ctx.createMediaStreamDestination();
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        gain.gain.value = 0.00001;
        osc.connect(gain);
        gain.connect(dst);
        osc.start();
        var st = dst.stream;
        st._isSilentFallback = true;
        return st;
      }
    } catch (e) {}
    var empty = new MediaStream();
    empty._isSilentFallback = true;
    return empty;
  }

  function acquireClientMediaStream(withVideo) {
    hasRealMic = false;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return Promise.resolve(createSilentFallbackStream());
    }
    var primary = { audio: true, video: !!withVideo };
    return navigator.mediaDevices.getUserMedia(primary).then(function (s) {
      hasRealMic = s.getAudioTracks().length > 0;
      return s;
    }).catch(function () {
      if (withVideo) {
        return navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(function (s) {
          hasRealMic = s.getAudioTracks().length > 0;
          return s;
        });
      }
      throw new Error("no-audio");
    }).catch(function () {
      if (withVideo) {
        return navigator.mediaDevices.getUserMedia({ audio: false, video: true }).then(function (vidStream) {
          var silent = createSilentFallbackStream();
          silent.getAudioTracks().forEach(function (t) { vidStream.addTrack(t); });
          return vidStream;
        });
      }
      throw new Error("no-devices");
    }).catch(function () {
      return createSilentFallbackStream();
    });
  }

  function renderMicWarningBanner(call, myStream) {
    var oldWarn = document.getElementById("pchat-mic-warn");
    if (oldWarn) oldWarn.remove();
    if (hasRealMic) return;
    var stage = document.getElementById("pchat-call-stage");
    if (!stage) return;

    var warn = document.createElement("div");
    warn.id = "pchat-mic-warn";
    warn.style.cssText = "margin-bottom:10px;padding:10px 12px;border-radius:12px;background:rgba(245,158,11,0.14);border:1px solid rgba(251,191,36,0.55);color:#fef3c7;font-size:0.82rem;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;";
    warn.innerHTML = '<span>🎙️ <b>Мікрофон не знайдено або вимкнено в системі</b> — співрозмовник вас не чує.</span>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
      '<a href="ms-settings:sound" id="pchat-win-mic-btn" style="padding:5px 11px;border-radius:999px;background:rgba(251,191,36,0.22);border:1px solid #fbbf24;color:#fef08a;text-decoration:none;font-weight:600;cursor:pointer;">⚙️ Налаштування звуку</a>' +
      '<button type="button" id="pchat-retry-mic-btn" style="padding:5px 11px;border-radius:999px;background:rgba(16,185,129,0.22);border:1px solid #10b981;color:#6ee7b7;font-weight:600;cursor:pointer;">🔄 Підключити</button>' +
      '</div>';
    stage.prepend(warn);

    var retryBtn = document.getElementById("pchat-retry-mic-btn");
    if (retryBtn) {
      retryBtn.onclick = function () {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(function (micStream) {
          var newTrack = micStream.getAudioTracks()[0];
          if (!newTrack) return;
          myStream.getAudioTracks().forEach(function (t) { t.stop(); myStream.removeTrack(t); });
          myStream.addTrack(newTrack);
          if (call && call.peerConnection) {
            var sender = call.peerConnection.getSenders().find(function (s) { return s.track && s.track.kind === "audio"; });
            if (sender) { sender.replaceTrack(newTrack); }
            else { call.peerConnection.addTrack(newTrack, myStream); }
          }
          hasRealMic = true;
          warn.remove();
        }).catch(function () {
          alert("Мікрофон усе ще вимкнений у Windows або заблокований у браузері.");
        });
      };
    }
  }

  var clientManualHangup = false;

  function showCallNoticeBanner(msgText, isWarn) {
    var host = document.getElementById("pchat-call-stage") || document.getElementById("pchat-box") || document.body;
    var old = document.getElementById("pchat-reject-notice");
    if (old) old.remove();
    var banner = document.createElement("div");
    banner.id = "pchat-reject-notice";
    banner.style.cssText = "margin:8px 0;padding:10px 14px;border-radius:12px;background:rgba(153,27,27,0.88);border:1.5px solid #f87171;color:#fef2f2;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:space-between;gap:10px;box-shadow:0 8px 24px rgba(0,0,0,0.45);z-index:9999;";
    var txt = document.createElement("span");
    txt.textContent = msgText || "📵 Оператор відхилив виклик або зараз зайнятий.";
    var closeX = document.createElement("button");
    closeX.type = "button";
    closeX.textContent = "✖";
    closeX.style.cssText = "background:rgba(255,255,255,0.15);border:none;color:#fff;border-radius:999px;width:24px;height:24px;cursor:pointer;font-weight:700;flex-shrink:0;";
    closeX.onclick = function () { banner.remove(); };
    banner.appendChild(txt);
    banner.appendChild(closeX);
    if (host.parentNode && host.id === "pchat-call-stage") {
      host.parentNode.insertBefore(banner, host);
    } else {
      host.insertBefore(banner, host.firstChild);
    }
    setTimeout(function () { if (banner && banner.parentNode) banner.remove(); }, 9000);
  }

  function startCall(withVideo) {
    if (!currentProject) return;
    clientManualHangup = false;
    var oldNotice = document.getElementById("pchat-reject-notice");
    if (oldNotice) oldNotice.remove();
    var targetStaffRole = getSelectedStaffId();
    var staffPeerId = "4i4_staff_" + targetStaffRole;
    window.ensureCommsSdk().then(function () {
      var cfg = window.CHAT_CONFIG || {};
      if (!window.FourI4RtcBridge) {
        alert("Модуль WebRTC не завантажився. Оновіть сторінку.");
        return;
      }
      window.FourI4RtcBridge.init({
        roleId: "client_" + activeSessionId,
        supabaseUrl: cfg.supabaseUrl,
        supabaseAnonKey: cfg.supabaseAnonKey
      });
      acquireClientMediaStream(withVideo).then(function (stream) {
        localStream = stream;
        var callId = "call_" + Date.now() + "_" + Math.floor(1000 + Math.random() * 9000);
        window._activeCallId = callId;
        window._activeStaffPeerId = staffPeerId;
        var clientNameInp = document.getElementById("pchat-name");
        var clientLabel = (clientNameInp && clientNameInp.value.trim()) ? clientNameInp.value.trim() : ("Клієнт (" + activeSessionId.slice(0, 8) + ")");
        var wasAnswered = false;
        var fakeCall = {
          peer: staffPeerId,
          _callId: callId,
          peerConnection: null, on: function () {},
          close: function () {
            if (this._rtcHandle) {
              try { this._rtcHandle.close("hangup"); } catch (e) {}
              this._rtcHandle = null;
            }
          }
        };
        bindCallStream(fakeCall, stream);
        setTimeout(function () {
          var rtcHandle = window.FourI4RtcBridge.startOutgoingCall({
            callId: callId,
            from: "client_" + activeSessionId,
            callerLabel: clientLabel,
            to: targetStaffRole,
            withVideo: withVideo,
            localStream: stream,
            onRemoteStream: function (remStream) {
              wasAnswered = true;
              var remVid = document.getElementById("pchat-remote-vid");
              if (remVid) remVid.srcObject = remStream;
            },
            onRemoteClose: function (reason) {
              var shouldNotifyReject = !wasAnswered && !clientManualHangup;
              endCall();
              if (shouldNotifyReject) {
                showCallNoticeBanner(reason === "rejected"
                  ? "📵 Оператор відхилив виклик або зараз зайнятий. Спробуйте зателефонувати трохи пізніше або напишіть у чат."
                  : "📵 Виклик завершено оператором або лінія тимчасово зайнята.", true);
              }
            }
          });
          fakeCall._rtcHandle = rtcHandle;
          fakeCall.peerConnection = rtcHandle.pc;
          renderMicWarningBanner(fakeCall, stream);
        }, window.FourI4RtcBridge.isReady() ? 50 : 450);
      }).catch(function (err) {
        alert("Не вдалося встановити виклик: " + err.message);
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
    var wasAnswered = false;

    if (peerInstance && !peerInstance._hasRejectListener) {
      peerInstance._hasRejectListener = true;
      peerInstance.on("connection", function (conn) {
        conn.on("data", function (data) {
          if (data && data.type === "CALL_REJECTED") {
            clientManualHangup = true;
            endCall();
            showCallNoticeBanner("📵 Оператор відхилив виклик або зараз зайнятий. Спробуйте зателефонувати трохи пізніше або напишіть у чат.", true);
          }
        });
      });
    }

    call.on("stream", function (remStream) {
      wasAnswered = true;
      var remVid = document.getElementById("pchat-remote-vid");
      if (remVid) remVid.srcObject = remStream;
    });
    call.on("close", function () {
      var shouldNotifyReject = !wasAnswered && !clientManualHangup;
      endCall();
      if (shouldNotifyReject) {
        showCallNoticeBanner("📵 Виклик відхилено оператором або лінія тимчасово зайнята.", true);
      }
    });

    var muteBtn = document.getElementById("pchat-mute-btn");
    var micMeterTimer = null;
    var micAudioCtx = null;

    function syncAudioTracksMuteState(muted) {
      if (myStream) {
        myStream.getAudioTracks().forEach(function (t) { t.enabled = !muted; });
      }
      if (localStream) {
        localStream.getAudioTracks().forEach(function (t) { t.enabled = !muted; });
      }
      if (call && call.peerConnection && typeof call.peerConnection.getSenders === "function") {
        call.peerConnection.getSenders().forEach(function (sender) {
          if (sender.track && sender.track.kind === "audio") {
            sender.track.enabled = !muted;
          }
        });
      }
    }

    function startMicLevelMeter(stream) {
      if (micMeterTimer) { clearInterval(micMeterTimer); micMeterTimer = null; }
      if (micAudioCtx) { try { micAudioCtx.close(); } catch (e) {} micAudioCtx = null; }
      try {
        var tracks = stream.getAudioTracks();
        if (!tracks || !tracks.length) return;
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        micAudioCtx = new AC();
        if (micAudioCtx.state === "suspended") micAudioCtx.resume();
        var src = micAudioCtx.createMediaStreamSource(new MediaStream([tracks]));
        var analyser = micAudioCtx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        var data = new Uint8Array(analyser.frequencyBinCount);
        micMeterTimer = setInterval(function () {
          var b = document.getElementById("pchat-mute-btn");
          if (!b) { clearInterval(micMeterTimer); return; }
          if (isMuted || !hasRealMic) return;
          analyser.getByteFrequencyData(data);
          var sum = 0;
          for (var i = 0; i < data.length; i++) sum += data[i];
          var avg = sum / data.length;
          var glow = Math.min(34, Math.round(avg * 1.4));
          if (glow > 2) {
            b.style.setProperty("box-shadow", "0 0 " + glow + "px 4px rgba(16, 185, 129, 0.95)", "important");
          } else {
            b.style.setProperty("box-shadow", "0 0 12px rgba(16, 185, 129, 0.45)", "important");
          }
        }, 100);
      } catch (e) {}
    }

    function applyMuteBtnVisual() {
      var b = document.getElementById("pchat-mute-btn");
      if (!b) return;
      if (!hasRealMic) {
        b.style.setProperty("opacity", "0.75", "important");
        b.style.setProperty("border-color", "#f59e0b", "important");
        b.textContent = "🎙️ Підключити мікрофон";
        return;
      }
      if (isMuted) {
        b.style.setProperty("opacity", "0.85", "important");
        b.style.setProperty("border-color", "#ef4444", "important");
        b.style.setProperty("background", "rgba(127, 29, 29, 0.75)", "important");
        b.style.setProperty("box-shadow", "0 0 14px rgba(239, 68, 68, 0.55)", "important");
        b.textContent = "🔇 Мікрофон вимкн.";
      } else {
        b.style.setProperty("opacity", "1", "important");
        b.style.setProperty("border-color", "#10b981", "important");
        b.style.setProperty("background", "rgba(16, 185, 129, 0.25)", "important");
        b.style.setProperty("box-shadow", "0 0 14px rgba(16, 185, 129, 0.55)", "important");
        b.textContent = "🎙️ Мікрофон (вкл)";
      }
    }

    applyMuteBtnVisual();
    if (hasRealMic) startMicLevelMeter(myStream);

    if (muteBtn) {
      muteBtn.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (!hasRealMic) {
          navigator.mediaDevices.getUserMedia({ audio: true }).then(function (micStream) {
            var newTrack = micStream.getAudioTracks();
            if (!newTrack) return;
            myStream.getAudioTracks().forEach(function (t) { t.stop(); myStream.removeTrack(t); });
            myStream.addTrack(newTrack);
            if (call && call.peerConnection) {
              var sender = call.peerConnection.getSenders().find(function (s) { return s.track && s.track.kind === "audio"; });
              if (sender) { sender.replaceTrack(newTrack); }
              else { call.peerConnection.addTrack(newTrack, myStream); }
            }
            hasRealMic = true;
            isMuted = false;
            syncAudioTracksMuteState(false);
            applyMuteBtnVisual();
            startMicLevelMeter(myStream);
            var oldWarn = document.getElementById("pchat-mic-warn");
            if (oldWarn) oldWarn.remove();
          }).catch(function () {
            alert("Мікрофон вимкнений у Windows або заблокований у браузері.");
          });
          return;
        }
        isMuted = !isMuted;
        syncAudioTracksMuteState(isMuted);
        applyMuteBtnVisual();
      });
    }

    document.getElementById("pchat-cam-btn").onclick = function () {
      var btn = this;
      var vTracks = myStream.getVideoTracks();
      if (vTracks.length > 0) {
        isCamOff = !isCamOff;
        vTracks.forEach(function (t) { t.enabled = !isCamOff; });
        if (locVid) locVid.srcObject = myStream;
        btn.style.opacity = isCamOff ? "0.5" : "1";
        return;
      }
      navigator.mediaDevices.getUserMedia({ video: true }).then(function (camStream) {
        var camTrack = camStream.getVideoTracks()[0];
        if (!camTrack) return;
        myStream.addTrack(camTrack);
        if (locVid) locVid.srcObject = myStream;
        isCamOff = false;
        btn.style.opacity = "1";
        if (call.peerConnection) {
          var sender = call.peerConnection.getSenders().find(function (s) { return s.track && s.track.kind === "video"; });
          if (sender) { sender.replaceTrack(camTrack); }
          else { call.peerConnection.addTrack(camTrack, myStream); }
        }
      }).catch(function (err) {
        alert("Не вдалося увімкнути камеру: " + err.message);
      });
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
    document.getElementById("pchat-end-btn").onclick = function () {
      clientManualHangup = true;
      endCall();
    };
  }

  function sendSupabaseCallCancel(callId) { return;
    try {
      var cfg = window.CHAT_CONFIG || {};
      if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !currentProject) return;
      var payload = {
        session_id: activeSessionId,
        project_id: currentProject.id || String(currentProject),
        sender: "client",
        text: "[CALL_CANCEL:" + (callId || "any") + "]"
      };
      fetch(cfg.supabaseUrl + "/rest/v1/chat_messages", {
        method: "POST",
        headers: {
          "apikey": cfg.supabaseAnonKey,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

  function notifyOperatorCallEnded(callId, targetPeer) {
    sendSupabaseCallCancel(callId);
    try {
      var sent = false;
      if (window._activeDataConn && window._activeDataConn.open) {
        window._activeDataConn.send({ type: "CALL_ENDED", callId: callId });
        sent = true;
      }
      if (!sent && peerInstance && !peerInstance.destroyed && targetPeer) {
        var dc = peerInstance.connect(targetPeer, { reliable: true });
        if (dc) {
          dc.on("open", function () {
            try { dc.send({ type: "CALL_ENDED", callId: callId }); } catch (e) {}
            setTimeout(function () { try { dc.close(); } catch (e) {} }, 150);
          });
        }
      }
    } catch (e) {}
  }

  function endCall() {
    var c = activeCall;
    var callId = (c && c._callId) || window._activeCallId || "";
    var targetPeer = (c && c.peer) || window._activeStaffPeerId || "";
    if (c || callId) {
      notifyOperatorCallEnded(callId, targetPeer);
    }
    window._activeCallId = null;
    if (window._activeDataConn) {
      var oldDc = window._activeDataConn;
      window._activeDataConn = null;
      setTimeout(function () { try { oldDc.close(); } catch (e) {} }, 250);
    }
    if (c) {
      activeCall = null;
      try { c.close(); } catch (e) {}
      setTimeout(function () { try { c.close(); } catch (e) {} }, 220);
    }
    if (localStream) { localStream.getTracks().forEach(function (t) { t.stop(); }); localStream = null; }
    var stage = document.getElementById("pchat-call-stage");
    if (stage) { stage.style.display = "none"; stage.innerHTML = ""; }
    if (peerInstance && !peerInstance.destroyed && peerInstance.disconnected) {
      try { peerInstance.reconnect(); } catch (e) {}
    }
  }

  window.addEventListener("beforeunload", function () {
    if (activeCall || window._activeCallId) {
      var cid = (activeCall && activeCall._callId) || window._activeCallId || "";
      var tpeer = (activeCall && activeCall.peer) || window._activeStaffPeerId || "";
      notifyOperatorCallEnded(cid, tpeer);
    }
    if (peerInstance && !peerInstance.destroyed) {
      try { peerInstance.destroy(); } catch (e) {}
    }
  });

  function appendMsgBubble(m) {
    if (m && typeof m.text === "string" && m.text.indexOf("[CALL_CANCEL:") === 0) return;
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
    var clientName = m._authorName || localStorage.getItem("4i4_client_name") || "Ви";
    var staffName = (!m.file_url && m.file_name) ? m.file_name : "Спеціаліст";
    var authorLabel = isClient ? clientName : staffName;
    var row = document.createElement("div");
    row.style.cssText = "display:flex;flex-direction:column;align-items:" + (isClient ? "flex-end" : "flex-start") + ";margin-bottom:8px;";
    row.innerHTML = '<div style="font-size:0.74rem;font-weight:600;color:#10b981;text-shadow:0 0 8px rgba(16,185,129,0.55);margin:0 8px 3px;">' + esc(authorLabel) + '</div>' +
      '<div style="max-width:82%;padding:9px 14px;border-radius:16px;font-size:0.9rem;line-height:1.45;background:' +
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
      staff_id: getSelectedStaffId(),
      client_name: name,
      client_email: email,
      updated_at: new Date().toISOString()
    }).then(function () {
      return sb.from("chat_messages").select("*").eq("session_id", activeSessionId).order("created_at", { ascending: true });
    }).then(function (res) {
      var seenIds = {};
      if (res && Array.isArray(res.data)) {
        res.data.forEach(function (m) {
          if (m.id) seenIds[m.id] = true;
          appendMsgBubble(m);
        });
      }
      if (window._4i4ClientPoll) clearInterval(window._4i4ClientPoll);
      window._4i4ClientPoll = setInterval(function () {
        var curFeed = document.getElementById("pchat-feed");
        if (!curFeed) { clearInterval(window._4i4ClientPoll); return; }
        var cfg = window.CHAT_CONFIG || {};
        if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return;
        fetch(cfg.supabaseUrl + "/rest/v1/chat_messages?session_id=eq." + encodeURIComponent(activeSessionId) + "&order=id.asc", {
          headers: { apikey: cfg.supabaseAnonKey }
        }).then(function (resp) { return resp.json(); }).then(function (rows) {
          if (Array.isArray(rows)) {
            rows.forEach(function (m) {
              if (m.id && seenIds[m.id]) return;
              if (m.id) seenIds[m.id] = true;
              if (m.sender !== "client") appendMsgBubble(m);
            });
          }
        }).catch(function () {});
      }, 2000);
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

  var sessionOwnerName = localStorage.getItem("4i4_client_name") || "";
function sendMessage(text, fileUrl, fileName) {
    var typedName = (document.getElementById("pchat-name") ? document.getElementById("pchat-name").value.trim() : "") || localStorage.getItem("4i4_client_name") || "";
    var isNewBranch = false;
    if (typedName && typedName !== sessionOwnerName) {
      sessionOwnerName = typedName;
      activeSessionId = computeSessionId(currentProject.id, typedName, getSelectedStaffId());
      localStorage.setItem("4i4_chat_session", activeSessionId);
      localStorage.setItem("4i4_client_name", typedName);
      var fBox = document.getElementById("pchat-feed");
      if (fBox) fBox.innerHTML = "";
      isNewBranch = true;
    }
    if (!text && !fileUrl) return;
    var msg = { session_id: activeSessionId,

      project_id: currentProject.id,
sender: "client",
text: text || "",
file_url: fileUrl || "",
file_name: fileName || "",
created_at: new Date().toISOString()
};
    var dbMsg = Object.assign({}, msg);
    msg._authorName = localStorage.getItem("4i4_client_name") || "Ви";
    appendMsgBubble(msg);
    var cfg = window.CHAT_CONFIG || {};
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) { saveLocalMsg(msg); return; }
    var sessPayload = { id: activeSessionId, project_id: currentProject.id, staff_id: getSelectedStaffId(), client_name: localStorage.getItem("4i4_client_name") || "Гість", client_email: localStorage.getItem("4i4_client_email") || "", updated_at: new Date().toISOString() };
    fetch(cfg.supabaseUrl + "/rest/v1/chat_sessions", { method: "POST", headers: { apikey: cfg.supabaseAnonKey, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(sessPayload) }).then(function (r1) {
      if (!r1.ok) throw new Error("chat_sessions HTTP " + r1.status);
      return fetch(cfg.supabaseUrl + "/rest/v1/chat_messages", { method: "POST", headers: { apikey: cfg.supabaseAnonKey, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(dbMsg) });
    }).then(function (r2) {
      if (!r2.ok) throw new Error("chat_messages HTTP " + r2.status);
      if (isNewBranch) {
        var fBox = document.getElementById("pchat-feed");
        if (fBox) fBox.innerHTML = "";
        window.ensureCommsSdk().then(function (sb) { syncSessionAndLoad(sb); initPeer(); });
      }
    }).catch(function (err) {
      console.error("[4i4 Chat] Send failed:", err);
      saveLocalMsg(msg);
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
    hTitle.innerHTML = '💬 Живий діалог зі спеціалістом <span id="pchat-presence-badge" style="display:inline-block;margin-left:8px;padding:3px 10px;border-radius:999px;font-size:0.76rem;font-weight:600;border:1px solid rgba(148,163,184,0.3);background:rgba(15,23,42,0.75);color:#94a3b8;vertical-align:middle;">⚫ перевірка статусу...</span>';
    var btnBox = document.createElement("div");
    btnBox.style.cssText = "display:flex;gap:8px;";
    var vBtn = document.createElement("button");
    vBtn.type = "button"; vBtn.id = "pchat-voice-btn"; vBtn.textContent = "🎙️ Голосовий";
    vBtn.style.cssText = "padding:7px 14px;border-radius:999px;background:rgba(56,189,248,0.18);border:1px solid #38bdf8;color:#bae6fd;font-size:0.85rem;cursor:pointer;";
    var vidBtn = document.createElement("button");
    vidBtn.type = "button"; vidBtn.id = "pchat-video-btn"; vidBtn.textContent = "📹 Відеодзвінок";
    vidBtn.style.cssText = "padding:7px 14px;border-radius:999px;background:rgba(16,185,129,0.2);border:1px solid #10b981;color:#6ee7b7;font-size:0.85rem;cursor:pointer;";
    btnBox.style.flexWrap = "wrap";
    btnBox.style.alignItems = "center";
    var staffSel = document.createElement("select");
    staffSel.id = "pchat-staff-select";
    staffSel.title = "Оберіть спеціаліста для чату та дзвінка";
    staffSel.style.cssText = "padding:7px 12px;border-radius:999px;background:#0b132b;border:1px solid rgba(56,189,248,0.45);color:#e2e8f0;font-size:0.85rem;cursor:pointer;outline:none;";
    populateStaffSelector(staffSel);
    staffSel.onchange = function () {
      var chosen = this.value; updateDialogPresenceBadge();
      if (currentProject && currentProject.id) {
        localStorage.setItem("4i4_selected_staff_" + currentProject.id, chosen);
      }
      if (!isRoomLink && currentProject && currentProject.id) {
        var curName = (document.getElementById("pchat-name") ? document.getElementById("pchat-name").value.trim() : "") || localStorage.getItem("4i4_client_name") || "Гість";
        activeSessionId = computeSessionId(currentProject.id, curName, chosen);
        var fBox = document.getElementById("pchat-feed");
        if (fBox) fBox.innerHTML = "";
        window.ensureCommsSdk().then(function (sb) {
          syncSessionAndLoad(sb);
          initPeer();
        });
      }
    };
    btnBox.append(staffSel, vBtn, vidBtn); hRow.append(hTitle, btnBox);

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
var lastBoundName = localStorage.getItem("4i4_client_name") || "";
document.getElementById("pchat-name").oninput = function () {
  localStorage.setItem("4i4_client_name", this.value);
};
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
if (!isRoomLink && currentProject && currentProject.id) {
  var initClientName = (document.getElementById("pchat-name") ? document.getElementById("pchat-name").value.trim() : "") || localStorage.getItem("4i4_client_name") || "Гість";
  activeSessionId = computeSessionId(currentProject.id, initClientName, getSelectedStaffId());
}
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