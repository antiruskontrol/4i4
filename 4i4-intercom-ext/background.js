async function syncPeerToOffscreen() {
  if (!chrome.offscreen) return;
  try {
    const has = await chrome.offscreen.hasDocument();
    if (!has) {
      await chrome.offscreen.createDocument({
        url: "offscreen.html",
        reasons: ["AUDIO_PLAYBACK"],
        justification: "Фоновий WebRTC та звуковий сигнал виклику 4i4"
      });
    }
  } catch (e) {}
  chrome.storage.local.get(["staffId"], function(res) {
    chrome.runtime.sendMessage({ type: "REINIT_PEER", staffId: res.staffId || "staff_01" }).catch(function() {});
  });
}

chrome.runtime.onMessage.addListener(function(msg) {
  if (!msg || !msg.type) return;
  if (msg.type === "OFFSCREEN_READY") {
    chrome.storage.local.get(["staffId"], function(res) {
      chrome.runtime.sendMessage({ type: "REINIT_PEER", staffId: res.staffId || "staff_01" }).catch(function() {});
    });
  }
  if (msg.type === "INCOMING_CALL_ALERT") {
    chrome.notifications.create("call_" + Date.now(), {
      type: "basic",
      iconUrl: "icon128.png",
      title: "Вхідний дзвінок — Студія 4і4",
      message: "Виклик від: " + (msg.caller || "клієнта"),
      requireInteraction: true
    });
  }
});

chrome.runtime.onInstalled.addListener(syncPeerToOffscreen);
chrome.runtime.onStartup.addListener(syncPeerToOffscreen);
syncPeerToOffscreen();