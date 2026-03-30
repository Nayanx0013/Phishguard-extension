var DEFAULT_API = "https://nayanx0013-phishguard-extension.hf.space";

function getApiBase(cb) {
  chrome.storage.local.get("apiUrl", function(d) {
    cb(d.apiUrl && d.apiUrl.trim() ? d.apiUrl.trim() : DEFAULT_API);
  });
}

function getAdminKey(cb) {
  chrome.storage.local.get("adminKey", function(d) {
    cb(d.adminKey || "");
  });
}

chrome.runtime.onInstalled.addListener(function(details) {
  chrome.contextMenus.removeAll(function() {
    chrome.contextMenus.create({ id:"scan-link", title:"Scan with PhishGuard", contexts:["link"] });
    chrome.contextMenus.create({ id:"scan-page", title:"Scan this page",       contexts:["page"] });
  });
  chrome.storage.local.get(["installDate","apiUrl"], function(d) {
    if (!d.installDate) {
      chrome.storage.local.set({
        installDate:    Date.now(),
        apiUrl:         DEFAULT_API,
        adminKey:       "",
        weeklyBlocked:  0,
        sessionBlocked: 0,
        securityScore:  0,
        scanned:        0,
        blocked:        0,
        safe:           0,
        theme:          "dark",
        settings: {
          autoScan:      true,
          notifications: true,
          autoBlock:     true,
          vtEnabled:     true,
          sensitivity:   "medium",
          threshold:     40
        }
      });
    } else {
      chrome.storage.local.get("settings", function(s) {
        var ex       = s.settings || {};
        ex.autoBlock = true;
        var upd      = { settings: ex };
        if (!d.apiUrl) upd.apiUrl = DEFAULT_API;
        chrome.storage.local.set(upd);
      });
    }
  });
  updateBadge();
});

chrome.contextMenus.onClicked.addListener(function(info, tab) {
  var url = info.menuItemId === "scan-link" ? info.linkUrl : (tab && tab.url);
  if (!url) return;
  doScan(url, function(data, err) {
    var ph   = !err && data && data.result === "PHISHING";
    var conf = data && data.confidence ? " (" + data.confidence + "%)" : "";
    chrome.notifications.create("pg-ctx-" + Date.now(), {
      type:"basic", iconUrl:"icons/icon48.png", priority: ph ? 2 : 1,
      title:   err ? "PhishGuard — Offline" : ph ? "PHISHING DETECTED" : "Link is Safe",
      message: err ? "Cannot reach backend" : ph
        ? "Blocked" + conf + ": " + url.substring(0,55)
        : "Safe" + conf + ": " + url.substring(0,55)
    });
  });
});

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {

  if (msg.type === "SCAN_URL") {
    doScan(msg.url, function(d, e) {
      sendResponse(e ? { success:false, error:e } : { success:true, data:d });
    });
    return true;
  }

  if (msg.type === "REPORT_URL") {
    if (!msg.url || !/^https?:\/\//i.test(msg.url)) {
      sendResponse({ success:false, error:"Invalid URL scheme" });
      return true;
    }
    getApiBase(async function(base) {
      try {
        const res = await fetch(base + "/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: msg.url, label: msg.label, note: msg.note || "" })
        });
        if (!res.ok) {
          const text = await res.text();
          console.error("Report failed:", res.status, text);
          sendResponse({ success:false, error:"Server error: " + res.status });
          return;
        }
        const data = await res.json();
        sendResponse({ success:true, data });
      } catch (err) {
        console.error("Network error:", err);
        sendResponse({ success:false, error:"Network error: " + err.message });
      }
    });
    return true;
  }

  if (msg.type === "GET_HISTORY") {
    var lim = msg.limit || 10;
    getApiBase(function(base) {
      fetch(base + "/history?limit=" + lim)
      .then(function(r) { return r.json(); })
      .then(function(d) { sendResponse({ success:true, data:d }); })
      .catch(function()  { sendResponse({ success:false, data:[] }); });
    });
    return true;
  }

  if (msg.type === "GET_STATS") {
    getApiBase(function(base) {
      fetch(base + "/stats")
      .then(function(r) { return r.json(); })
      .then(function(d) { sendResponse({ success:true, data:d }); })
      .catch(function() { sendResponse({ success:false, data:null }); });
    });
    return true;
  }

  if (msg.type === "PING_API") {
    getApiBase(function(base) {
      var ctrl = new AbortController();
      setTimeout(function() { ctrl.abort(); }, 5000);
      fetch(base + "/", { signal:ctrl.signal })
      .then(function(r) { return r.json(); })
      .then(function(d) { sendResponse({ success:true, data:d, url:base }); })
      .catch(function(e) { sendResponse({ success:false, error:e.message, url:base }); });
    });
    return true;
  }

  if (msg.type === "RELOAD_MODELS") {
    getApiBase(function(base) {
      getAdminKey(function(key) {
        var headers = { "Content-Type":"application/json" };
        if (key) headers["X-Admin-Key"] = key;
        fetch(base + "/reload", { method:"POST", headers:headers })
        .then(function(r) { return r.json(); })
        .then(function(d) { sendResponse({ success:true, data:d }); })
        .catch(function(e) { sendResponse({ success:false, error:e.message }); });
      });
    });
    return true;
  }

  if (msg.type === "RETRAIN_STATUS") {
    getApiBase(function(base) {
      fetch(base + "/retrain/status")
      .then(function(r) { return r.json(); })
      .then(function(d) { sendResponse({ success:true, data:d }); })
      .catch(function(e) { sendResponse({ success:false, error:e.message }); });
    });
    return true;
  }

  if (msg.type === "RETRAIN_TRIGGER") {
    getApiBase(function(base) {
      getAdminKey(function(key) {
        var headers = { "Content-Type":"application/json" };
        if (key) headers["X-Admin-Key"] = key;
        fetch(base + "/retrain/trigger", { method:"POST", headers:headers })
        .then(function(r) { return r.json(); })
        .then(function(d) { sendResponse({ success:true, data:d }); })
        .catch(function(e) { sendResponse({ success:false, error:e.message }); });
      });
    });
    return true;
  }

  if (msg.type === "SCAN_BATCH") {
    getApiBase(function(base) {
      fetch(base + "/predict/batch", {
        method:  "POST",
        headers: { "Content-Type":"application/json" },
        body:    JSON.stringify({ urls: (msg.urls || []).slice(0,50) })
      })
      .then(function(r) { return r.json(); })
      .then(function(d) { sendResponse({ success:true, data:d }); })
      .catch(function(e) { sendResponse({ success:false, error:e.message }); });
    });
    return true;
  }

  if (msg.type === "UPDATE_BADGE") { updateBadge(); sendResponse({ success:true }); }
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status !== "complete" || !tab.url) return;

  var skip = ["chrome://","about:","chrome-extension://","moz-extension://","http://localhost","http://127.0.0.1"];
  for (var i = 0; i < skip.length; i++) {
    if (tab.url.indexOf(skip[i]) === 0) return;
  }

  if (!/^https?:\/\//i.test(tab.url)) return;

  chrome.storage.local.get(["settings","bypassList","whitelist","blocklist"], function(store) {
    var s      = store.settings   || {};
    var bypass = store.bypassList || [];
    var userWL = store.whitelist  || [];
    var userBL = store.blocklist  || [];

    if (s.autoScan === false) return;

    try {
      var domain = new URL(tab.url).hostname.toLowerCase().replace("www.","");
      if (userWL.some(function(d){ return domain === d || domain.endsWith("."+d); })) return;
    } catch(e) {}

    if (bypass.includes(tab.url)) return;
    
    
    
    try {
      var bypassDomain = new URL(tab.url).hostname.toLowerCase().replace("www.","");
      if (bypass.some(function(u) {
        try { return new URL(u).hostname.toLowerCase().replace("www.","") === bypassDomain; }
        catch(e) { return false; }
      })) return;
    } catch(e) {}

    try {
      var bld = new URL(tab.url).hostname.toLowerCase().replace("www.","");
      if (userBL.some(function(d){ return bld === d || bld.endsWith("."+d); })) {
        chrome.storage.local.get(["sessionBlocked","weeklyBlocked"], function(d) {
          chrome.storage.local.set({
            sessionBlocked: (d.sessionBlocked||0)+1,
            weeklyBlocked:  (d.weeklyBlocked||0)+1
          });
          updateBadge((d.sessionBlocked||0)+1);
        });
        chrome.tabs.update(tabId, {
          url: chrome.runtime.getURL("warning.html") +
               "?url=" + encodeURIComponent(tab.url) + "&conf=99&source=blocklist"
        });
        return;
      }
    } catch(e) {}

    doScan(tab.url, function(result, err) {
      if (err || !result || result.result !== "PHISHING") return;

      var conf      = result.confidence || 0;
      var threshold = s.threshold !== undefined ? s.threshold : 40;

      chrome.storage.local.get(["sessionBlocked","weeklyBlocked"], function(d) {
        chrome.storage.local.set({
          sessionBlocked: (d.sessionBlocked||0)+1,
          weeklyBlocked:  (d.weeklyBlocked||0)+1
        });
        updateBadge((d.sessionBlocked||0)+1);
      });

      addScore(10);

      if (s.notifications !== false) {
        chrome.notifications.create("pg-threat-"+Date.now(), {
          type:"basic", iconUrl:"icons/icon48.png", priority:2,
          title:   "PhishGuard — Threat Blocked",
          message: "Phishing ("+conf+"%): " + tab.url.substring(0,65)
        });
      }

      if (conf >= threshold) {
        chrome.tabs.update(tabId, {
          url: chrome.runtime.getURL("warning.html") +
               "?url=" + encodeURIComponent(tab.url) + "&conf=" + conf
        });
      }
    });
  });
});

function doScan(url, cb) {
  if (!url || !/^https?:\/\//i.test(url)) {
    cb(null, "Invalid URL scheme");
    return;
  }
  getApiBase(function(base) {
    fetch(base + "/predict", {
      method:  "POST",
      headers: { "Content-Type":"application/json" },
      body:    JSON.stringify({ url:url })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) { cb(d, null); })
    .catch(function(e) { cb(null, e.message); });
  });
}

function updateBadge(n) {
  if (n !== undefined) { setBadge(n); return; }
  chrome.storage.local.get("sessionBlocked", function(d){ setBadge(d.sessionBlocked||0); });
}

function setBadge(n) {
  chrome.action.setBadgeText({ text: n>0 ? String(n) : "" });
  if (n>0) chrome.action.setBadgeBackgroundColor({ color:"#ef4444" });
}

function addScore(pts) {
  chrome.storage.local.get("securityScore", function(d){
    chrome.storage.local.set({ securityScore: Math.min((d.securityScore||0)+pts, 9999) });
  });
}