(function initPopoutAndCalls() {
  function setupPopout() {
    var btn = document.getElementById("op-popout-btn");
    if (!btn) return;
    if (window.location.search.indexOf("popout=1") !== -1) {
      document.body.classList.add("is-popout");
      btn.style.display = "none";
      return;
    }
    btn.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      var url = chrome.runtime.getURL("popup.html?popout=1");
      if (chrome.windows && typeof chrome.windows.create === "function") {
        chrome.windows.create({ url: url, type: "popup", width: 446, height: 690 }, function () {
          if (chrome.runtime.lastError) chrome.tabs.create({ url: url });
        });
      } else {
        chrome.tabs.create({ url: url });
      }
    });
  }

  window.focusIntercomWindow = function () {
    if (chrome.windows && chrome.windows.getCurrent) {
      chrome.windows.getCurrent(function (win) {
        if (win && win.id) chrome.windows.update(win.id, { focused: true, drawAttention: true });
      });
    }
  };

  var opPeer = null;
  var currentRegisteredPeerId = null;
  var pendingIncomingCall = null;
  var liveCall = null;
  var liveStream = null;
  var opMicMuted = false;
  var opHasMic = false;
  var meterTimer = null;
  var meterCtx = null;

  function updatePeerBadge(text, ok) {
    var b = document.getElementById("op-peer-status-badge");
    if (!b) {
      var top = document.querySelector(".top");
      if (!top) return;
      b = document.createElement("span");
      b.id = "op-peer-status-badge";
      b.style.cssText = "font-size:10px;padding:2px 7px;border-radius:999px;border:1px solid rgba(56,189,248,0.4);background:rgba(2,6,23,0.7);color:#7dd3fc;";
      top.appendChild(b);
    }
    b.textContent = text;
    b.style.borderColor = ok ? "rgba(16,185,129,0.65)" : "rgba(245,158,11,0.65)";
    b.style.color = ok ? "#6ee7b7" : "#fcd34d";
  }

  var localRingTimer = null;
  var localRingCtx = null;

  function buildRingWavDataUrl() {
  try {
    var sr = 22050;
    var dur = 0.55;
    var numSamples = Math.floor(sr * dur);
    var dataSize = numSamples * 2;
    var buf = new ArrayBuffer(44 + dataSize);
    var v = new DataView(buf);
    function wStr(off, s) { for (var i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); }
    wStr(0, "RIFF");
    v.setUint32(4, 36 + dataSize, true);
    wStr(8, "WAVE");
    wStr(12, "fmt ");
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, 1, true);
    v.setUint32(24, sr, true);
    v.setUint32(28, sr * 2, true);
    v.setUint16(32, 2, true);
    v.setUint16(34, 16, true);
    wStr(36, "data");
    v.setUint32(40, dataSize, true);
    for (var i = 0; i < numSamples; i++) {
      var t = i / sr;
      var freq = t < 0.18 ? 587.33 : 880.0;
      var env = Math.max(0, 1 - (t / dur)) * 0.55;
      var sample = Math.sin(2 * Math.PI * freq * t) * env;
      v.setInt16(44 + i * 2, Math.max(-32767, Math.min(32767, Math.floor(sample * 32767))), true);
    }
    var bytes = new Uint8Array(buf);
    var bin = "";
    for (var j = 0; j < bytes.length; j++) bin += String.fromCharCode(bytes[j]);
    return "data:audio/wav;base64," + btoa(bin);
  } catch (e) { return ""; }
}
var cachedRingUrl = null;
function playHtmlAudioChime() {
  try {
    if (!cachedRingUrl) cachedRingUrl = buildRingWavDataUrl();
    if (!cachedRingUrl) return;
    var a = new Audio(cachedRingUrl);
    a.volume = 0.85;
    a.play().catch(function () {});
  } catch (e) {}
}
  function playLocalChime() { playHtmlAudioChime(); return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!localRingCtx) localRingCtx = new AC();
      if (localRingCtx.state === "suspended") localRingCtx.resume();
      var t = localRingCtx.currentTime;
      var osc = localRingCtx.createOscillator();
      var gain = localRingCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, t);
      osc.frequency.setValueAtTime(880, t + 0.16);
      gain.gain.setValueAtTime(0.24, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.connect(gain);
      gain.connect(localRingCtx.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    } catch (e) {}
  }

  function startPopupRing() {
    stopPopupRing();
    playLocalChime();
    localRingTimer = setInterval(playLocalChime, 1800);
    chrome.runtime.sendMessage({ type: "START_RING" }).catch(function () {});
  }

  function stopPopupRing() {
    if (localRingTimer) {
      clearInterval(localRingTimer);
      localRingTimer = null;
    }
    chrome.runtime.sendMessage({ type: "STOP_RING" }).catch(function () {});
  }

  function stopMeter() {
    if (meterTimer) { clearInterval(meterTimer); meterTimer = null; }
    if (meterCtx) { try { meterCtx.close(); } catch (e) {} meterCtx = null; }
  }

  function createSilentAudio() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        var ctx = new AC();
        var dst = ctx.createMediaStreamDestination();
        var osc = ctx.createOscillator();
        var g = ctx.createGain();
        g.gain.value = 0.00001;
        osc.connect(g);
        g.connect(dst);
        osc.start();
        return dst.stream;
      }
    } catch (e) {}
    return new MediaStream();
  }

  function getOpStream(wantVideo) {
    opHasMic = false;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return Promise.resolve(createSilentAudio());
    }
    return navigator.mediaDevices.getUserMedia({ audio: true, video: !!wantVideo }).then(function (s) {
      opHasMic = s.getAudioTracks().length > 0;
      return s;
    }).catch(function () {
      if (wantVideo) {
        return navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(function (s) {
          opHasMic = s.getAudioTracks().length > 0;
          return s;
        });
      }
      throw new Error("no-mic");
    }).catch(function () {
      return createSilentAudio();
    });
  }

  var incomingCancelPollTimer = null;
  var activeIncomingCallId = null;
  var ringStartedAtMs = 0;

  function stopIncomingCancelWatch() {
    if (incomingCancelPollTimer) {
      clearInterval(incomingCancelPollTimer);
      incomingCancelPollTimer = null;
    }
    activeIncomingCallId = null;
    ringStartedAtMs = 0;
  }

  function startIncomingCancelWatch(callObj) { stopIncomingCancelWatch(); return;
    stopIncomingCancelWatch();
    activeIncomingCallId = (callObj && callObj.metadata && callObj.metadata.callId) ? String(callObj.metadata.callId) : "";
    ringStartedAtMs = Date.now();
    incomingCancelPollTimer = setInterval(function () {
      var hasBox = !!document.getElementById("op-call-floating-box");
      if (!pendingIncomingCall && !hasBox) {
        stopIncomingCancelWatch();
        return;
      }
      if (liveCall) {
        stopIncomingCancelWatch();
        return;
      }
      try {
        var pc = pendingIncomingCall && pendingIncomingCall.peerConnection;
        if (pc && (pc.iceConnectionState === "failed" || pc.iceConnectionState === "closed" || pc.connectionState === "failed" || pc.connectionState === "closed")) {
          closeCallOverlay();
          return;
        }
      } catch (e) {}
      try {
        var sbUrl = (typeof SUPABASE_URL !== "undefined" && SUPABASE_URL) ? SUPABASE_URL : (window.CHAT_CONFIG && window.CHAT_CONFIG.supabaseUrl);
        var sbKey = (typeof SUPABASE_ANON_KEY !== "undefined" && SUPABASE_ANON_KEY) ? SUPABASE_ANON_KEY : (window.CHAT_CONFIG && window.CHAT_CONFIG.supabaseAnonKey);
        if (!sbUrl || !sbKey) return;
        var sinceIso = new Date(ringStartedAtMs - 5000).toISOString();
        var q = sbUrl + "/rest/v1/chat_messages?select=text,created_at&text=like." + encodeURIComponent("[CALL_CANCEL:%") + "&created_at=gte." + encodeURIComponent(sinceIso) + "&order=created_at.desc&limit=5";
        fetch(q, {
          headers: { "apikey": sbKey }
        }).then(function (r) { return r.ok ? r.json() : []; }).then(function (rows) {
          if ((!pendingIncomingCall && !document.getElementById("op-call-floating-box")) || !Array.isArray(rows) || !rows.length) return;
          for (var i = 0; i < rows.length; i++) {
            var txt = String(rows[i].text || "");
            if (!activeIncomingCallId || txt.indexOf("[CALL_CANCEL:" + activeIncomingCallId + "]") === 0 || txt.indexOf("[CALL_CANCEL:any]") === 0) {
              chrome.runtime.sendMessage({ type: "END_CALL", rejected: false }).catch(function () {});
              closeCallOverlay();
              return;
            }
          }
        }).catch(function () {});
      } catch (e) {}
    }, 600);
  }

  function closeCallOverlay() {
    stopIncomingCancelWatch();
    stopPopupRing();
    stopMeter();
    opMicMuted = false;
    if (pendingIncomingCall) { try { pendingIncomingCall.close(); } catch (e) {} pendingIncomingCall = null; }
    if (liveCall) { try { liveCall.close(); } catch (e) {} liveCall = null; }
    if (liveStream) { liveStream.getTracks().forEach(function (t) { try { t.stop(); } catch (e) {} }); liveStream = null; }
    var box = document.getElementById("op-call-floating-box");
    if (box) box.remove();
    if (opPeer && !opPeer.destroyed) {
      if (opPeer.disconnected) {
        try { opPeer.reconnect(); } catch (e) {}
      } else if (opPeer.open && currentRegisteredPeerId) {
        updatePeerBadge("📡 Лінія: " + currentRegisteredPeerId.replace("4i4_staff_", ""), true);
      }
    } else {
      currentRegisteredPeerId = null;
      setTimeout(registerOperatorPeer, 200);
    }
  }

  function ensureOverlayBox() {
    var box = document.getElementById("op-call-floating-box");
    if (!box) {
      box = document.createElement("div");
      box.id = "op-call-floating-box";
      box.style.cssText = "position:fixed;top:54px;left:10px;right:10px;z-index:99999;background:#071024;border:2px solid #38bdf8;border-radius:14px;padding:12px;box-shadow:0 14px 36px rgba(0,0,0,0.9),0 0 24px rgba(56,189,248,0.45);color:#f8fafc;font-size:12px;pointer-events:auto;";
      document.body.appendChild(box);
    }
    box.textContent = "";
    return box;
  }

  function makeBtn(label, css) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.style.cssText = css + ";cursor:pointer;pointer-events:auto;position:relative;z-index:100000;";
    return b;
  }

  function startOpLevelMeter(st, btnEl) {
    stopMeter();
    try {
      var tracks = st.getAudioTracks();
      if (!tracks || !tracks.length || !tracks || tracks.readyState !== "live") return;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      meterCtx = new AC();
      if (meterCtx.state === "suspended") meterCtx.resume();
      var src = meterCtx.createMediaStreamSource(new MediaStream([tracks]));
      var an = meterCtx.createAnalyser();
      an.fftSize = 256;
      src.connect(an);
      var buf = new Uint8Array(an.frequencyBinCount);
meterTimer = setInterval(function () {
if (!btnEl || !document.body.contains(btnEl) || opMicMuted || !opHasMic) return;
an.getByteFrequencyData(buf);
var s = 0;
for (var i = 0; i < buf.length; i++) s += buf[i];
var glow = Math.min(24, Math.round((s / buf.length) * 1.4));
btnEl.style.boxShadow = glow > 2 ? ("0 0 " + glow + "px 3px rgba(16,185,129,0.95)") : "0 0 10px rgba(16,185,129,0.45)";
}, 100);
} catch (e) {}
}
function renderActiveCallUI(call, myStream, callerLabel) {
stopPopupRing();
liveCall = call;
liveStream = myStream;
opMicMuted = false;
var box = ensureOverlayBox();
box.style.borderColor = "#10b981";
var head = document.createElement("div");
head.style.cssText = "font-weight:700;color:#6ee7b7;margin-bottom:8px;text-align:center;";
head.textContent = "🟢 На зв’язку: " + callerLabel;
box.appendChild(head);
var vid = document.createElement("video");
vid.id = "op-live-remote-vid";
vid.autoplay = true;
vid.playsInline = true;
vid.style.cssText = "width:100%;max-height:150px;background:#020617;border-radius:10px;margin-bottom:8px;display:none;object-fit:cover;";
box.appendChild(vid);
var aud = document.createElement("audio");
aud.id = "op-live-remote-aud";
aud.autoplay = true;
box.appendChild(aud);
var row = document.createElement("div");
row.style.cssText = "display:flex;gap:8px;justify-content:center;flex-wrap:wrap;";
var micBtn = makeBtn("🎙️ Мікрофон (вкл)", "padding:7px 14px;border-radius:999px;border:1px solid #10b981;background:rgba(16,185,129,0.25);color:#ecfdf5;font-weight:700;");
var endBtn = makeBtn("Завершити", "padding:7px 16px;border-radius:999px;border:none;background:#dc2626;color:#fff;font-weight:700;");
endBtn.onclick = closeCallOverlay;
row.appendChild(micBtn);
row.appendChild(endBtn);
box.appendChild(row);
function syncMicBtn() {
if (!opHasMic) {
micBtn.style.borderColor = "#f59e0b";
micBtn.style.background = "rgba(180,83,9,0.35)";
micBtn.style.boxShadow = "none";
micBtn.textContent = "🎙️ Підкл. мікрофон";
} else if (opMicMuted) {
micBtn.style.borderColor = "#ef4444";
micBtn.style.background = "rgba(153,27,27,0.85)";
micBtn.style.boxShadow = "0 0 10px rgba(239,68,68,0.5)";
micBtn.textContent = "🔇 Мікрофон вимкн.";
} else {
micBtn.style.borderColor = "#10b981";
micBtn.style.background = "rgba(16,185,129,0.25)";
micBtn.style.boxShadow = "0 0 10px rgba(16,185,129,0.5)";
micBtn.textContent = "🎙️ Мікрофон (вкл)";
}
}
syncMicBtn();
if (opHasMic) startOpLevelMeter(myStream, micBtn);
micBtn.onclick = function () {
if (!opHasMic || opMicMuted) {
navigator.mediaDevices.getUserMedia({ audio: true }).then(function (ms) {
var nts = ms.getAudioTracks();
if (!nts || !nts.length) return;
var nt = nts;
liveStream.getAudioTracks().forEach(function (t) { try { t.stop(); } catch (e) {} liveStream.removeTrack(t); });
liveStream.addTrack(nt);
if (liveCall && liveCall.peerConnection && typeof liveCall.peerConnection.getSenders === "function") {
var sender = liveCall.peerConnection.getSenders().find(function (s) { return (s.track && s.track.kind === "audio") || !s.track; });
if (sender && typeof sender.replaceTrack === "function") sender.replaceTrack(nt).catch(function () {});
}
opHasMic = true;
opMicMuted = false;
syncMicBtn();
startOpLevelMeter(liveStream, micBtn);
}).catch(function () {
alert("Мікрофон вимкнений у Windows або заблокований.");
});
return;
}
opMicMuted = true;
stopMeter();
liveStream.getAudioTracks().forEach(function (t) { t.enabled = false; try { t.stop(); } catch (e) {} });
if (liveCall && liveCall.peerConnection && typeof liveCall.peerConnection.getSenders === "function") {
liveCall.peerConnection.getSenders().forEach(function (s) {
if (s.track && s.track.kind === "audio" && typeof s.replaceTrack === "function") s.replaceTrack(null).catch(function () {});
});
}
syncMicBtn();
};
call.on("stream", function (remStream) {
aud.srcObject = remStream;
aud.play().catch(function () {});
var vTracks = remStream.getVideoTracks ? remStream.getVideoTracks() : [];
if (vTracks.length > 0 && vTracks.readyState === "live") {
vid.style.display = "block";
vid.srcObject = remStream;
vid.play().catch(function () {});
}
});
call.on("close", closeCallOverlay);
call.on("error", closeCallOverlay);
}
function showIncomingCallUI(incomingCall) {
if (pendingIncomingCall && pendingIncomingCall !== incomingCall) {
try { pendingIncomingCall.close(); } catch (e) {}
}
pendingIncomingCall = incomingCall;
if (window.focusIntercomWindow) window.focusIntercomWindow();
startPopupRing();
startIncomingCancelWatch(incomingCall);
incomingCall.on("close", function () {
if (pendingIncomingCall === incomingCall) closeCallOverlay();
});
incomingCall.on("error", function () {
if (pendingIncomingCall === incomingCall) closeCallOverlay();
});
var rawFrom = String(incomingCall.peer || "Абонент");
var callerLabel = rawFrom.indexOf("4i4_client_") === 0 ? ("Клієнт із сайту (" + rawFrom.slice(11, 21) + ")") : rawFrom.replace("4i4_staff_", "");
var box = ensureOverlayBox();
box.style.borderColor = "#fbbf24";
var title = document.createElement("div");
title.style.cssText = "font-weight:700;color:#fde68a;margin-bottom:10px;text-align:center;";
title.textContent = "📲 Вхідний дзвінок: " + callerLabel;
box.appendChild(title);
var row = document.createElement("div");
row.style.cssText = "display:flex;gap:8px;justify-content:center;flex-wrap:wrap;";
var ansBtn = makeBtn("📞 Відповісти", "padding:8px 14px;border-radius:999px;border:none;background:#10b981;color:#052e16;font-weight:800;");
var vidBtn = makeBtn("📹 З відео", "padding:8px 12px;border-radius:999px;border:1px solid #38bdf8;background:rgba(56,189,248,0.25);color:#bae6fd;font-weight:700;");
var rejBtn = makeBtn("✖ Відхилити", "padding:8px 12px;border-radius:999px;border:none;background:#dc2626;color:#fff;font-weight:700;");
function accept(withVid) {
var callObj = pendingIncomingCall;
pendingIncomingCall = null;
if (!callObj) return;
stopPopupRing();
ansBtn.disabled = true;
vidBtn.disabled = true;
getOpStream(withVid).then(function (st) {
callObj.answer(st);
renderActiveCallUI(callObj, st, callerLabel);
});
}
ansBtn.onclick = function () { accept(false); };
vidBtn.onclick = function () { accept(true); };
rejBtn.onclick = function () {
var callObj = pendingIncomingCall;
stopPopupRing();
if (callObj && callObj.peer && opPeer && !opPeer.destroyed) {
try {
var dc = opPeer.connect(callObj.peer, { reliable: true });
if (dc) {
dc.on("open", function () {
try { dc.send({ type: "CALL_REJECTED" }); } catch (e) {}
setTimeout(function () { try { dc.close(); } catch (e) {} closeCallOverlay(); }, 180);
});
setTimeout(closeCallOverlay, 350);
return;
}
} catch (e) {}
}
closeCallOverlay();
};
row.appendChild(ansBtn);
row.appendChild(vidBtn);
row.appendChild(rejBtn);
box.appendChild(row);
}
function showOffscreenProxiedCallUI(callerPeer) {
var rawFrom = String(callerPeer || "Абонент");
var callerLabel = rawFrom.indexOf("4i4_client_") === 0 ? ("Клієнт із сайту (" + rawFrom.slice(11, 21) + ")") : rawFrom.replace("4i4_staff_", "");
var box = ensureOverlayBox();
box.style.borderColor = "#fbbf24";
var title = document.createElement("div");
title.style.cssText = "font-weight:700;color:#fde68a;margin-bottom:10px;text-align:center;";
title.textContent = "📲 Вхідний дзвінок (фонова лінія): " + callerLabel;
box.appendChild(title);
var row = document.createElement("div");
row.style.cssText = "display:flex;gap:8px;justify-content:center;flex-wrap:wrap;";
var ansBtn = makeBtn("📞 Відповісти", "padding:8px 14px;border-radius:999px;border:none;background:#10b981;color:#052e16;font-weight:800;");
var rejBtn = makeBtn("✖ Відхилити", "padding:8px 12px;border-radius:999px;border:none;background:#dc2626;color:#fff;font-weight:700;");
ansBtn.onclick = function () {
chrome.runtime.sendMessage({ type: "ANSWER_CALL", withVideo: false }).catch(function () {});
var b = ensureOverlayBox();
b.style.borderColor = "#10b981";
var st = document.createElement("div");
st.style.cssText = "font-weight:700;color:#6ee7b7;margin-bottom:8px;text-align:center;";
st.textContent = "🟢 На зв’язку (фонове аудіо): " + callerLabel;
b.appendChild(st);
var endRow = document.createElement("div");
endRow.style.cssText = "display:flex;justify-content:center;";
var endB = makeBtn("Завершити", "padding:7px 16px;border-radius:999px;border:none;background:#dc2626;color:#fff;font-weight:700;");
endB.onclick = function () {
chrome.runtime.sendMessage({ type: "END_CALL", rejected: false }).catch(function () {});
closeCallOverlay();
};
endRow.appendChild(endB);
b.appendChild(endRow);
};
rejBtn.onclick = function () {
chrome.runtime.sendMessage({ type: "END_CALL", rejected: true }).catch(function () {});
closeCallOverlay();
};
row.appendChild(ansBtn);
row.appendChild(rejBtn);
box.appendChild(row);
}
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) { if (msg && msg.type === "PING_INTERCOM_WINDOW") { sendResponse({ open: true }); return true; }
if (msg && msg.type === "OFFSCREEN_HAS_CALL") {
if (msg.offerPayload && typeof handleNativeIncomingOffer === "function") {
handleNativeIncomingOffer(msg.offerPayload);
} else if (msg.caller) {
showOffscreenProxiedCallUI(msg.caller);
startIncomingCancelWatch(null);
}
} else if (msg && msg.type === "OFFSCREEN_CALL_ENDED") {
closeCallOverlay();
}
});
function handleNativeIncomingOffer(offerPayload) {
  if (!offerPayload || !offerPayload.callId) return;
  if ((pendingIncomingCall && pendingIncomingCall._callId === offerPayload.callId) || (liveCall && liveCall._callId === offerPayload.callId)) return;
  if (liveCall) {
    if (window.FourI4RtcBridge) window.FourI4RtcBridge.rejectIncomingCall(offerPayload.callId);
    return;
  }
  var streamHandlers = [];
  var closeHandlers = [];
  var nativeCallAdapter = {
    _isNativeRtc: true,
    _callId: offerPayload.callId,
    _offerPayload: offerPayload,
    _rtcSession: null,
    peer: offerPayload.callerLabel || offerPayload.from || "Клієнт із сайту",
    metadata: { callId: offerPayload.callId },
    peerConnection: null,
    on: function (ev, fn) {
      if (ev === "stream") streamHandlers.push(fn);
      if (ev === "close" || ev === "error") closeHandlers.push(fn);
    },
    answer: function (localSt) {
      var self = this;
      if (!window.FourI4RtcBridge) return;
      var s = window.FourI4RtcBridge.answerIncomingCall(offerPayload, localSt, {
        onRemoteStream: function (rem) {
          streamHandlers.forEach(function (fn) { try { fn(rem); } catch (e) {} });
        },
        onRemoteClose: function () {
          closeHandlers.forEach(function (fn) { try { fn(); } catch (e) {} });
          closeCallOverlay();
        }
      });
      self._rtcSession = s;
      self.peerConnection = s ? s.pc : null;
    },
    close: function () {
      if (this._rtcSession) {
        try { this._rtcSession.close("hangup"); } catch (e) {}
        this._rtcSession = null;
      } else if (window.FourI4RtcBridge) {
        window.FourI4RtcBridge.rejectIncomingCall(offerPayload.callId);
      }
    }
  };
  if (window.FourI4RtcBridge) {
    window.FourI4RtcBridge.registerIncomingSession(offerPayload.callId, function () {
      if (pendingIncomingCall === nativeCallAdapter || liveCall === nativeCallAdapter) {
        closeCallOverlay();
      }
    });
  }
  showIncomingCallUI(nativeCallAdapter);
}

function handleNativeIncomingOffer(offerPayload) {
  if (!offerPayload || !offerPayload.callId) return;
  if ((pendingIncomingCall && pendingIncomingCall._callId === offerPayload.callId) || (liveCall && liveCall._callId === offerPayload.callId)) return;
  if (liveCall) {
    if (window.FourI4RtcBridge) window.FourI4RtcBridge.rejectIncomingCall(offerPayload.callId);
    return;
  }
  var streamHandlers = [];
  var closeHandlers = [];
  var nativeCallAdapter = {
    _isNativeRtc: true,
    _callId: offerPayload.callId,
    _offerPayload: offerPayload,
    _rtcSession: null,
    peer: offerPayload.callerLabel || offerPayload.from || "Клієнт із сайту",
    metadata: { callId: offerPayload.callId },
    peerConnection: null,
    on: function (ev, fn) {
      if (ev === "stream") streamHandlers.push(fn);
      if (ev === "close" || ev === "error") closeHandlers.push(fn);
    },
    answer: function (localSt) {
      var self = this;
      if (!window.FourI4RtcBridge) return;
      var s = window.FourI4RtcBridge.answerIncomingCall(offerPayload, localSt, {
        onRemoteStream: function (rem) {
          streamHandlers.forEach(function (fn) { try { fn(rem); } catch (e) {} });
        },
        onRemoteClose: function () {
          closeHandlers.forEach(function (fn) { try { fn(); } catch (e) {} });
          closeCallOverlay();
        }
      });
      self._rtcSession = s;
      self.peerConnection = s ? s.pc : null;
    },
    close: function () {
      if (this._rtcSession) {
        try { this._rtcSession.close("hangup"); } catch (e) {}
        this._rtcSession = null;
      } else if (window.FourI4RtcBridge) {
        window.FourI4RtcBridge.rejectIncomingCall(offerPayload.callId);
      }
    }
  };
  if (window.FourI4RtcBridge) {
    window.FourI4RtcBridge.registerIncomingSession(offerPayload.callId, function () {
      if (pendingIncomingCall === nativeCallAdapter || liveCall === nativeCallAdapter) {
        closeCallOverlay();
      }
    });
  }
  showIncomingCallUI(nativeCallAdapter);
}

function handleNativeIncomingOffer(offerPayload) {
  if (!offerPayload || !offerPayload.callId) return;
  if ((pendingIncomingCall && pendingIncomingCall._callId === offerPayload.callId) || (liveCall && liveCall._callId === offerPayload.callId)) return;
  if (liveCall) {
    if (window.FourI4RtcBridge) window.FourI4RtcBridge.rejectIncomingCall(offerPayload.callId);
    return;
  }
  var streamHandlers = [];
  var closeHandlers = [];
  var nativeCallAdapter = {
    _isNativeRtc: true,
    _callId: offerPayload.callId,
    _offerPayload: offerPayload,
    _rtcSession: null,
    peer: offerPayload.callerLabel || offerPayload.from || "Клієнт із сайту",
    metadata: { callId: offerPayload.callId },
    peerConnection: null,
    on: function (ev, fn) {
      if (ev === "stream") streamHandlers.push(fn);
      if (ev === "close" || ev === "error") closeHandlers.push(fn);
    },
    answer: function (localSt) {
      var self = this;
      if (!window.FourI4RtcBridge) return;
      var s = window.FourI4RtcBridge.answerIncomingCall(offerPayload, localSt, {
        onRemoteStream: function (rem) {
          streamHandlers.forEach(function (fn) { try { fn(rem); } catch (e) {} });
        },
        onRemoteClose: function () {
          closeHandlers.forEach(function (fn) { try { fn(); } catch (e) {} });
          closeCallOverlay();
        }
      });
      self._rtcSession = s;
      self.peerConnection = s ? s.pc : null;
    },
    close: function () {
      if (this._rtcSession) {
        try { this._rtcSession.close("hangup"); } catch (e) {}
        this._rtcSession = null;
      } else if (window.FourI4RtcBridge) {
        window.FourI4RtcBridge.rejectIncomingCall(offerPayload.callId);
      }
    }
  };
  if (window.FourI4RtcBridge) {
    window.FourI4RtcBridge.registerIncomingSession(offerPayload.callId, function () {
      if (pendingIncomingCall === nativeCallAdapter || liveCall === nativeCallAdapter) {
        closeCallOverlay();
      }
    });
  }
  showIncomingCallUI(nativeCallAdapter);
}

function registerOperatorPeer() {
  chrome.runtime.sendMessage({ type: "PAUSE_OFFSCREEN_PEER" }).catch(function () {});
  chrome.storage.local.get(["staffId", "sbUrl", "sbKey"], function (res) {
    var topSel = document.getElementById("staff-select");
    var roleId = (topSel && topSel.value) ? topSel.value : (res.staffId || "staff_01");
    var desiredPeerId = "4i4_staff_" + roleId;
    var sbUrl = (res.sbUrl && res.sbUrl.indexOf(".supabase.co") !== -1) ? res.sbUrl : "https://supabase.co";
    var sbKey = res.sbKey || "sb_publishable_RoJhAV7fKgo2XsK8sWTKQQ_Pok8i6oK";

    if (window.FourI4RtcBridge) {
      window.FourI4RtcBridge.init({
        roleId: roleId,
        supabaseUrl: sbUrl,
        supabaseAnonKey: sbKey,
        onIncoming: handleNativeIncomingOffer,
        onStatus: function (st, ok) {
          if (ok) {
            updatePeerBadge("📡 Лінія: " + roleId, true);
          } else {
            updatePeerBadge("📡 Підключення " + roleId + "...", false);
          }
        }
      });
    }

    if (typeof Peer === "undefined") return;
    if (opPeer && !opPeer.destroyed && currentRegisteredPeerId === desiredPeerId) {
      if (opPeer.disconnected) { try { opPeer.reconnect(); } catch (e) {} }
      return;
    }
    if (opPeer && !opPeer.destroyed) {
      try { opPeer.destroy(); } catch (e) {}
    }
    currentRegisteredPeerId = desiredPeerId;
    opPeer = new Peer(desiredPeerId);
    opPeer.on("open", function () {
      updatePeerBadge("📡 Лінія: " + roleId, true);
    });
    opPeer.on("disconnected", function () {
      if (opPeer && !opPeer.destroyed) {
        try { opPeer.reconnect(); } catch (e) {}
      }
    });
    opPeer.on("connection", function (conn) {
      conn.on("data", function (data) {
        if (data && data.type === "CALL_ENDED") {
          closeCallOverlay();
        }
      });
    });
    opPeer.on("call", function (incomingCall) {
      showIncomingCallUI(incomingCall);
    });
    opPeer.on("error", function (err) {
      if (window.FourI4RtcBridge && window.FourI4RtcBridge.isReady()) {
        updatePeerBadge("📡 Лінія: " + roleId, true);
      }
    });
  });
}
window.addEventListener("beforeunload", function () {
stopIncomingCancelWatch();
stopPopupRing();
if (opPeer && !opPeer.destroyed) {
try { opPeer.destroy(); } catch (e) {}
}
var topSel = document.getElementById("staff-select");
var roleId = (topSel && topSel.value) ? topSel.value : "staff_01";
chrome.runtime.sendMessage({ type: "RESUME_OFFSCREEN_PEER", staffId: roleId }).catch(function () {});
});
function boot() {
setupPopout();
setTimeout(registerOperatorPeer, 200);
setInterval(function () {
var topSel = document.getElementById("staff-select");
if (topSel && topSel.value && currentRegisteredPeerId !== ("4i4_staff_" + topSel.value)) {
registerOperatorPeer();
} else if (opPeer && opPeer.disconnected && !opPeer.destroyed) {
try { opPeer.reconnect(); } catch (e) {}
}
}, 1500);
}
if (document.readyState === "loading") {
document.addEventListener("DOMContentLoaded", boot);
} else {
boot();
}
})();