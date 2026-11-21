(function () {
  var defaultSbUrl = "https://yaayswqunsgtimxnvgnc.supabase.co";
  var savedUrl = "";
  try { savedUrl = (localStorage.getItem("4i4_sb_url") || "").trim(); } catch (e) {}
  if (!savedUrl || savedUrl === "https://supabase.co" || savedUrl.indexOf(".supabase.co") === -1) {
    savedUrl = defaultSbUrl;
    try { localStorage.removeItem("4i4_sb_url"); } catch (e) {}
  }
  window.CHAT_CONFIG = {
    supabaseUrl: savedUrl,
    supabaseAnonKey: (function () {
      try { return localStorage.getItem("4i4_sb_key") || "sb_publishable_RoJhAV7fKgo2XsK8sWTKQQ_Pok8i6oK"; } catch (e) {}
      return "sb_publishable_RoJhAV7fKgo2XsK8sWTKQQ_Pok8i6oK";
    })(),
    storageBucket: "chat-files",
    peerHost: "://peerjs.com",
    emailjs: {
      serviceId: "service_ihkh6et",
      templateId: "template_ixw0wxg",
      userId: "dbQbev4DmfsbbelAg"
    }
  };
})();

window.ensureCommsSdk = function () {
  if (window._4i4SdkPromise && window.Peer && window.supabase) {
    return window._4i4SdkPromise;
  }
  function loadScript(src, globalCheck) {
    return new Promise(function (resolve) {
      if (globalCheck && window[globalCheck]) return resolve(true);
      var existing = document.querySelector('script[src="' + src + '"]');
      if (existing) existing.remove();
      var s = document.createElement("script");
      s.src = src;
      s.onload = function () { resolve(true); };
      s.onerror = function () { resolve(false); };
      document.head.appendChild(s);
    });
  }
  window._4i4SdkPromise = Promise.all([
    window.supabase ? Promise.resolve(true) : loadScript("lib/supabase.min.js", "supabase"),
    window.Peer ? Promise.resolve(true) : loadScript("lib/peerjs.min.js", "Peer").then(function () {
      return window.Peer ? true : loadScript("https://unpkg.com", "Peer");
    })
  ]).then(function () {
    var cfg = window.CHAT_CONFIG || {};
    if (cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase && !window._4i4Supabase) {
      window._4i4Supabase = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    }
    if (!window.Peer) window._4i4SdkPromise = null;
    return window._4i4Supabase || null;
  });
  return window._4i4SdkPromise;
};