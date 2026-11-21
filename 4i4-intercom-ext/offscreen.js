let pendingNativeOffer = null;
let ringAudio = null;
let keepAliveAudio = null;

function makeWavBlobUrl(amplitude, durationSec) {
  const sr = 22050;
  const numSamples = Math.floor(sr * durationSec);
  const dataSize = numSamples * 2;
  const buf = new ArrayBuffer(44 + dataSize);
  const v = new DataView(buf);
  function wStr(off, s) { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); }
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
  for (let i = 0; i < numSamples; i++) {
    const t = i / sr;
    let sample = 0;
    if (amplitude > 0.001 && t < 0.55) {
      const freq = t < 0.18 ? 587.33 : 880.0;
      const env = Math.max(0, 1 - (t / 0.55)) * amplitude;
      sample = Math.sin(2 * Math.PI * freq * t) * env;
    } else if (amplitude <= 0.001) {
      sample = Math.sin(2 * Math.PI * 60 * t) * amplitude;
    }
    v.setInt16(44 + i * 2, Math.max(-32767, Math.min(32767, Math.floor(sample * 32767))), true);
  }
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}

function startSilentKeepAlive() {
  try {
    if (keepAliveAudio) return;
    keepAliveAudio = new Audio(makeWavBlobUrl(0.0002, 1.0));
    keepAliveAudio.loop = true;
    keepAliveAudio.volume = 0.01;
    keepAliveAudio.play().catch(function () {});
  } catch (e) {}
}

function startRingLoop() {
  try {
    if (!ringAudio) {
      ringAudio = new Audio(makeWavBlobUrl(0.85, 1.7));
      ringAudio.loop = true;
      ringAudio.volume = 1.0;
    }
    ringAudio.currentTime = 0;
    ringAudio.play().catch(function () {});
  } catch (e) {}
}

function stopRing() {
  if (ringAudio) {
    try {
      ringAudio.pause();
      ringAudio.currentTime = 0;
    } catch (e) {}
  }
}

function handleOffscreenNativeOffer(offerPayload) {
  if (!offerPayload || !offerPayload.callId) return;
  pendingNativeOffer = offerPayload;
  startRingLoop();
  if (window.FourI4RtcBridge) {
    window.FourI4RtcBridge.registerIncomingSession(offerPayload.callId, function () {
      if (pendingNativeOffer && pendingNativeOffer.callId === offerPayload.callId) {
        pendingNativeOffer = null;
        stopRing();
        chrome.runtime.sendMessage({ type: "OFFSCREEN_CALL_ENDED" }).catch(function () {});
      }
    });
  }
  const caller = offerPayload.callerLabel || offerPayload.from || "Клієнт із сайту";
  chrome.runtime.sendMessage({ type: "INCOMING_CALL_ALERT", caller: caller }).catch(function () {});
  setTimeout(function () {
    if (pendingNativeOffer && pendingNativeOffer.callId === offerPayload.callId) {
      chrome.runtime.sendMessage({ type: "OFFSCREEN_HAS_CALL", caller: caller, offerPayload: offerPayload }).catch(function () {});
    }
  }, 450);
}

function initOffscreenBridge() {
  startSilentKeepAlive();
  chrome.storage.local.get(["sbUrl", "sbKey"], function (res) {
    const sbUrl = (res.sbUrl && res.sbUrl.indexOf(".supabase.co") !== -1) ? res.sbUrl : "https://supabase.co";
    const sbKey = res.sbKey || "sb_publishable_RoJhAV7fKgo2XsK8sWTKQQ_Pok8i6oK";
    if (window.FourI4RtcBridge) {
      window.FourI4RtcBridge.init({
        roleId: "*",
        supabaseUrl: sbUrl,
        supabaseAnonKey: sbKey,
        onIncoming: handleOffscreenNativeOffer
      });
    }
  });
}

chrome.runtime.onMessage.addListener(function (msg) {
  if (!msg || !msg.type) return;
  if (msg.type === "START_RING") { startRingLoop(); return; }
  if (msg.type === "STOP_RING") { stopRing(); return; }
  if (msg.type === "REINIT_PEER" || msg.type === "RESUME_OFFSCREEN_PEER") {
    initOffscreenBridge();
    return;
  }
  if (msg.type === "PAUSE_OFFSCREEN_PEER") {
    if (pendingNativeOffer) {
      const offer = pendingNativeOffer;
      pendingNativeOffer = null;
      const caller = offer.callerLabel || offer.from || "Клієнт із сайту";
      setTimeout(function () {
        chrome.runtime.sendMessage({ type: "OFFSCREEN_HAS_CALL", caller: caller, offerPayload: offer }).catch(function () {});
      }, 150);
    }
    return;
  }
  if (msg.type === "END_CALL") {
    stopRing();
    if (pendingNativeOffer) {
      if (msg.rejected && window.FourI4RtcBridge) {
        window.FourI4RtcBridge.rejectIncomingCall(pendingNativeOffer.callId);
      }
      pendingNativeOffer = null;
    }
  }
});

initOffscreenBridge();
setInterval(initOffscreenBridge, 5000);
chrome.runtime.sendMessage({ type: "OFFSCREEN_READY" }).catch(function () {});