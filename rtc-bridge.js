(function () {
  if (window.FourI4RtcBridge) return;

  var ICE_CFG = { iceServers: [{ urls: "st" + "un:74.125.250.129:19302" }] };

  var sbClient = null;
  var channel = null;
  var channelReady = false;
  var myRoleId = null;
  var onIncomingCb = null;
  var onStatusCb = null;
  var activeSessions = {};

  function getClient(url, key) {
    if (sbClient) return sbClient;
    if (window._4i4Supabase) {
      sbClient = window._4i4Supabase;
      return sbClient;
    }
    if (window.supabase && url && key) {
      sbClient = window.supabase.createClient(url, key);
      return sbClient;
    }
    return null;
  }

  function sendSignal(event, payload) {
    if (!channel) return Promise.resolve();
    return channel.send({
      type: "broadcast",
      event: event,
      payload: payload
    }).catch(function () {});
  }

  function cleanupSession(callId) {
    var s = activeSessions[callId];
    if (!s) return;
    delete activeSessions[callId];
    try {
      if (s.pc) {
        s.pc.onicecandidate = null;
        s.pc.ontrack = null;
        s.pc.onconnectionstatechange = null;
        s.pc.close();
      }
    } catch (e) {}
  }

  function init(opts) {
    opts = opts || {};
    myRoleId = opts.roleId || myRoleId;
    if (opts.onIncoming) onIncomingCb = opts.onIncoming;
    if (opts.onStatus) onStatusCb = opts.onStatus;

    var client = getClient(opts.supabaseUrl, opts.supabaseAnonKey);
    if (!client) {
      if (onStatusCb) onStatusCb("no-sb", false);
      return;
    }

    if (channel && channelReady) {
      if (onStatusCb) onStatusCb("ready", true);
      return;
    }

    if (channel) {
      try { client.removeChannel(channel); } catch (e) {}
      channel = null;
      channelReady = false;
    }

    channel = client.channel("4i4-rtc-signal-v1", {
      config: { broadcast: { self: false } }
    });

    channel
      .on("broadcast", { event: "RTC_OFFER" }, function (msg) {
        var p = msg && msg.payload;
        if (!p || !p.callId || (myRoleId && p.to !== myRoleId)) return;
        if (onIncomingCb) onIncomingCb(p);
      })
      .on("broadcast", { event: "RTC_ANSWER" }, function (msg) {
        var p = msg && msg.payload;
        if (!p || !p.callId) return;
        var s = activeSessions[p.callId];
        if (!s || !s.pc) return;
        s.pc.setRemoteDescription(new RTCSessionDescription(p.sdp)).then(function () {
          s.remoteDescSet = true;
          while (s.pendingCandidates.length) {
            var c = s.pendingCandidates.shift();
            s.pc.addIceCandidate(new RTCIceCandidate(c)).catch(function () {});
          }
        }).catch(function () {});
      })
      .on("broadcast", { event: "RTC_ICE" }, function (msg) {
        var p = msg && msg.payload;
        if (!p || !p.callId || !p.candidate) return;
        var s = activeSessions[p.callId];
        if (!s || !s.pc) return;
        if (s.remoteDescSet) {
          s.pc.addIceCandidate(new RTCIceCandidate(p.candidate)).catch(function () {});
        } else {
          s.pendingCandidates.push(p.candidate);
        }
      })
      .on("broadcast", { event: "RTC_HANGUP" }, function (msg) {
        var p = msg && msg.payload;
        if (!p || !p.callId) return;
        var s = activeSessions[p.callId];
        if (s && s.onRemoteClose) s.onRemoteClose(p.reason || "hangup");
        cleanupSession(p.callId);
      })
      .subscribe(function (status) {
        if (status === "SUBSCRIBED") {
          channelReady = true;
          if (onStatusCb) onStatusCb("ready", true);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          channelReady = false;
          if (onStatusCb) onStatusCb(status, false);
        }
      });
  }

  function startOutgoingCall(params) {
    var callId = params.callId || ("rtc_" + Date.now() + "_" + Math.floor(1000 + Math.random() * 9000));
    var pc = new RTCPeerConnection(ICE_CFG);
    var session = {
      callId: callId,
      pc: pc,
      remoteDescSet: false,
      pendingCandidates: [],
      onRemoteStream: params.onRemoteStream || null,
      onRemoteClose: params.onRemoteClose || null
    };
    activeSessions[callId] = session;

    if (params.localStream) {
      params.localStream.getTracks().forEach(function (track) {
        pc.addTrack(track, params.localStream);
      });
    }

    pc.onicecandidate = function (ev) {
      if (ev.candidate) {
        sendSignal("RTC_ICE", {
          callId: callId,
          from: params.from,
          to: params.to,
          candidate: ev.candidate.toJSON ? ev.candidate.toJSON() : ev.candidate
        });
      }
    };

    pc.ontrack = function (ev) {
      var rem = (ev.streams && ev.streams[0]) ? ev.streams[0] : new MediaStream([ev.track]);
      if (session.onRemoteStream) session.onRemoteStream(rem);
    };

    pc.onconnectionstatechange = function () {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        if (session.onRemoteClose) session.onRemoteClose(pc.connectionState);
        cleanupSession(callId);
      }
    };

    pc.createOffer().then(function (offer) {
      return pc.setLocalDescription(offer).then(function () { return offer; });
    }).then(function (offer) {
      return sendSignal("RTC_OFFER", {
        callId: callId,
        from: params.from,
        callerLabel: params.callerLabel || params.from,
        to: params.to,
        withVideo: !!params.withVideo,
        sdp: { type: offer.type, sdp: offer.sdp }
      });
    }).catch(function () {});

    return {
      callId: callId,
      pc: pc,
      close: function (reason) {
        sendSignal("RTC_HANGUP", { callId: callId, reason: reason || "hangup" });
        cleanupSession(callId);
      }
    };
  }

  function answerIncomingCall(offerPayload, localStream, callbacks) {
    callbacks = callbacks || {};
    var callId = offerPayload.callId;
    var pc = new RTCPeerConnection(ICE_CFG);
    var session = {
      callId: callId,
      pc: pc,
      remoteDescSet: false,
      pendingCandidates: [],
      onRemoteStream: callbacks.onRemoteStream || null,
      onRemoteClose: callbacks.onRemoteClose || null
    };
    activeSessions[callId] = session;

    if (localStream) {
      localStream.getTracks().forEach(function (track) {
        pc.addTrack(track, localStream);
      });
    }

    pc.onicecandidate = function (ev) {
      if (ev.candidate) {
        sendSignal("RTC_ICE", {
          callId: callId,
          from: offerPayload.to,
          to: offerPayload.from,
          candidate: ev.candidate.toJSON ? ev.candidate.toJSON() : ev.candidate
        });
      }
    };

    pc.ontrack = function (ev) {
      var rem = (ev.streams && ev.streams[0]) ? ev.streams[0] : new MediaStream([ev.track]);
      if (session.onRemoteStream) session.onRemoteStream(rem);
    };

    pc.onconnectionstatechange = function () {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        if (session.onRemoteClose) session.onRemoteClose(pc.connectionState);
        cleanupSession(callId);
      }
    };

    pc.setRemoteDescription(new RTCSessionDescription(offerPayload.sdp)).then(function () {
      session.remoteDescSet = true;
      while (session.pendingCandidates.length) {
        var c = session.pendingCandidates.shift();
        pc.addIceCandidate(new RTCIceCandidate(c)).catch(function () {});
      }
      return pc.createAnswer();
    }).then(function (answer) {
      return pc.setLocalDescription(answer).then(function () { return answer; });
    }).then(function (answer) {
      return sendSignal("RTC_ANSWER", {
        callId: callId,
        from: offerPayload.to,
        to: offerPayload.from,
        sdp: { type: answer.type, sdp: answer.sdp }
      });
    }).catch(function () {});

    return {
      callId: callId,
      pc: pc,
      close: function (reason) {
        sendSignal("RTC_HANGUP", { callId: callId, reason: reason || "hangup" });
        cleanupSession(callId);
      }
    };
  }

  function rejectIncomingCall(callId) {
    sendSignal("RTC_HANGUP", { callId: callId, reason: "rejected" });
    cleanupSession(callId);
  }

  function registerIncomingSession(callId, onRemoteClose) {
    activeSessions[callId] = {
      callId: callId,
      pc: null,
      remoteDescSet: false,
      pendingCandidates: [],
      onRemoteClose: onRemoteClose || null
    };
  }

  window.FourI4RtcBridge = {
    init: init,
    isReady: function () { return channelReady; },
    startOutgoingCall: startOutgoingCall,
    answerIncomingCall: answerIncomingCall,
    rejectIncomingCall: rejectIncomingCall,
    registerIncomingSession: registerIncomingSession,
    cleanupSession: cleanupSession
  };
})();