try {
  self.window = self; importScripts("supabase.min.js", "rtc-bridge.js");
} catch (e) {}

let bgPendingOffer = null;
let bgTtsTimer = null;

function stopBgAlert() {
  if (bgTtsTimer) {
    clearInterval(bgTtsTimer);
    bgTtsTimer = null;
  }
  try { if (chrome.tts) chrome.tts.stop(); } catch (e) {}
}

function startBgTtsRing(caller) {
  stopBgAlert();
  const phrase = "Вхідний дзвінок від клієнта";
  try {
    if (chrome.tts) {
      chrome.tts.speak(phrase, { lang: "uk-UA", rate: 1.05 });
      bgTtsTimer = setInterval(function () {
        try { chrome.tts.speak(phrase, { lang: "uk-UA", rate: 1.05 }); } catch (e) {}
      }, 4200);
    }
  } catch (e) {}
}

function openOrFocusPopoutWindow(cb) {
  var targetUrl = chrome.runtime.getURL("popup.html?popout=1");
  chrome.windows.getAll({ populate: true }, function(wins) {
    var existing = (wins || []).find(function(w) {
      return w.type === "popup" && (w.tabs || []).some(function(t) { return t.url && t.url.indexOf("popup.html?popout=1") !== -1; });
    });
    if (existing) {
      chrome.windows.update(existing.id, { focused: true, drawAttention: true });
      if (cb) cb(true);
      return;
    }
    chrome.windows.create({ url: targetUrl, type: "popup", width: 446, height: 690, focused: true }, function(win) {
      if (cb) cb(!!win);
    });
  });
}

function initBgRtcListener() {
  if (typeof self.FourI4RtcBridge === "undefined") return;
  chrome.storage.local.get(["sbUrl", "sbKey"], function (res) {
    const sbUrl = (res.sbUrl && res.sbUrl.indexOf(".supabase.co") !== -1) ? res.sbUrl : "https://yaayswqunsgtimxnvgnc.supabase.co";
    const sbKey = res.sbKey || "sb_publishable_RoJhAV7fKgo2XsK8sWTKQQ_Pok8i6oK";
    self.FourI4RtcBridge.init({
      roleId: "*",
      supabaseUrl: sbUrl,
      supabaseAnonKey: sbKey,
      onIncoming: function (offerPayload) {
        if (!offerPayload || !offerPayload.callId) return;
        bgPendingOffer = offerPayload;
        const caller = offerPayload.callerLabel || offerPayload.from || "Клієнт із сайту";
        startBgTtsRing(caller);
        chrome.notifications.create("call_" + offerPayload.callId, {
          type: "basic",
          iconUrl: "icon128.png",
          title: "Вхідний дзвінок — Студія 4і4",
          message: "Виклик від: " + caller,
          requireInteraction: true
        });
        openOrFocusPopoutWindow(function () {
          setTimeout(function () {
            if (bgPendingOffer && bgPendingOffer.callId === offerPayload.callId) {
              chrome.runtime.sendMessage({ type: "OFFSCREEN_HAS_CALL", caller: caller, offerPayload: offerPayload }).catch(function () {});
            }
          }, 600);
          setTimeout(function () {
            if (bgPendingOffer && bgPendingOffer.callId === offerPayload.callId) {
              chrome.runtime.sendMessage({ type: "OFFSCREEN_HAS_CALL", caller: caller, offerPayload: offerPayload }).catch(function () {});
            }
          }, 1500);
        });
        self.FourI4RtcBridge.registerIncomingSession(offerPayload.callId, function () {
          if (bgPendingOffer && bgPendingOffer.callId === offerPayload.callId) {
            bgPendingOffer = null;
            stopBgAlert();
            chrome.runtime.sendMessage({ type: "OFFSCREEN_CALL_ENDED" }).catch(function () {});
          }
        });
      }
    });
  });
}

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  if (!msg || !msg.type) return;
  if (msg.type === "STOP_RING" || msg.type === "END_CALL" || msg.type === "PAUSE_OFFSCREEN_PEER") {
    stopBgAlert();
    if (msg.type === "PAUSE_OFFSCREEN_PEER" && bgPendingOffer) { var _o = bgPendingOffer; bgPendingOffer = null; bgPendingOffer = _o;
      const offer = bgPendingOffer;
      const caller = offer.callerLabel || offer.from || "Клієнт із сайту";
      setTimeout(function () {
        chrome.runtime.sendMessage({ type: "OFFSCREEN_HAS_CALL", caller: caller, offerPayload: offer }).catch(function () {});
      }, 200);
    }
    if (msg.type === "END_CALL") {
      if (msg.rejected && bgPendingOffer && self.FourI4RtcBridge) {
        self.FourI4RtcBridge.rejectIncomingCall(bgPendingOffer.callId);
      }
      bgPendingOffer = null;
    }
    return;
  }
  if (msg.type === "OPEN_POPOUT") {
    openOrFocusPopoutWindow(function(ok) {
      if (sendResponse) sendResponse({ ok: ok });
    });
    return true;
  }
});

chrome.runtime.onInstalled.addListener(initBgRtcListener);
chrome.runtime.onStartup.addListener(initBgRtcListener);
initBgRtcListener();

try {
  if (chrome.alarms) {
    chrome.alarms.create("keep_bg_rtc", { periodInMinutes: 0.4 });
    chrome.alarms.onAlarm.addListener(function (a) {
      if (a && a.name === "keep_bg_rtc") initBgRtcListener();
    });
  }
} catch (e) {}