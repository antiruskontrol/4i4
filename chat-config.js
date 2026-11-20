window.CHAT_CONFIG = {
  supabaseUrl: localStorage.getItem("4i4_sb_url") || "https://yaayswqunsgtimxnvgnc.supabase.co",
  supabaseAnonKey: localStorage.getItem("4i4_sb_key") || "sb_publishable_RoJhAV7fKgo2XsK8sWTKQQ_Pok8i6oK",
  storageBucket: "chat-files",
  peerHost: "0.peerjs.com",
  emailjs: {
    serviceId: "service_ihkh6et",
    templateId: "template_ixw0wxg",
    userId: "dbQbev4DmfsbbelAg"
  }
};

window.ensureCommsSdk = function () {
  if (window._4i4SdkPromise) return window._4i4SdkPromise;
  function loadScript(src) {
    return new Promise(function (resolve) {
      if (document.querySelector('script[src="' + src + '"]')) return resolve();
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = resolve;
      document.head.appendChild(s);
    });
  }
  window._4i4SdkPromise = Promise.all([
    window.supabase ? Promise.resolve() : loadScript("lib/supabase.min.js"),
    window.Peer ? Promise.resolve() : loadScript("lib/peerjs.min.js")
  ]).then(function () {
    var cfg = window.CHAT_CONFIG || {};
    if (cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase && !window._4i4Supabase) {
      window._4i4Supabase = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    }
    return window._4i4Supabase || null;
  });
  return window._4i4SdkPromise;
};