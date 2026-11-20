let peer = null;
let currentCall = null;
let ringInterval = null;
let audioCtx = null;

function playRingTone() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, t);
    osc.frequency.setValueAtTime(659.25, t + 0.16);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.45);
  } catch (e) {}
}

function stopRing() {
  if (ringInterval) { clearInterval(ringInterval); ringInterval = null; }
}

function startPeer(staffId) {
  if (peer) { try { peer.destroy(); } catch (e) {} }
  const id = "4i4_staff_" + (staffId || "staff_01");
  peer = new Peer(id);
  peer.on("call", function(call) {
    currentCall = call;
    stopRing();
    playRingTone();
    ringInterval = setInterval(playRingTone, 2200);
    chrome.runtime.sendMessage({ type: "INCOMING_CALL_ALERT", caller: call.peer });
  });
}

chrome.runtime.onMessage.addListener(function(msg) {
  if (!msg || !msg.type) return;
  if (msg.type === "REINIT_PEER") startPeer(msg.staffId);
  if (msg.type === "STOP_RING") stopRing();
  if (msg.type === "ANSWER_CALL" && currentCall) {
    stopRing();
    navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(function(stream) {
      currentCall.answer(stream);
      currentCall.on("stream", function(remote) {
        document.getElementById("remote-audio").srcObject = remote;
      });
    });
  }
  if (msg.type === "END_CALL" && currentCall) {
    stopRing();
    try { currentCall.close(); } catch (e) {}
    currentCall = null;
  }
});

chrome.runtime.sendMessage({ type: "OFFSCREEN_READY" });