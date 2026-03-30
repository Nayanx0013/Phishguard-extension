var urlDisplay        = document.getElementById("urlDisplay");
var resultBox         = document.getElementById("resultBox");
var resultIcon        = document.getElementById("resultIcon");
var resultTitle       = document.getElementById("resultTitle");
var resultSubtitle    = document.getElementById("resultSubtitle");
var scanProgress      = document.getElementById("scanProgress");
var confidenceSection = document.getElementById("confidenceSection");
var confPercent       = document.getElementById("confPercent");
var confFill          = document.getElementById("confFill");
var featuresGrid      = document.getElementById("featuresGrid");
var rescanBtn         = document.getElementById("rescanBtn");
var scannedCount      = document.getElementById("scannedCount");
var blockedCount      = document.getElementById("blockedCount");
var safeCount         = document.getElementById("safeCount");
var riskMeter         = document.getElementById("riskMeter");
var riskFill          = document.getElementById("riskFill");
var riskLabel         = document.getElementById("riskLabel");
var threatExplanation = document.getElementById("threatExplanation");
var resultActions     = document.getElementById("resultActions");
var scoreNum          = document.getElementById("scoreNum");
var scoreLevel        = document.getElementById("scoreLevel");
var themeBtn          = document.getElementById("themeBtn");

var currentUrl    = "";
var currentResult = null;

// FIX: Updated to correct dashboard URL (no stray quote)
var HF_DASHBOARD = "https://nayanx0013-phishguard-extension.hf.space/dashboard";

function showToast(msg, isError) {
  var t = document.getElementById("pg-toast");
  if (!t) return;
  t.textContent      = msg;
  t.style.background = isError ? "rgba(239,68,68,0.18)"  : "rgba(16,185,129,0.18)";
  t.style.border     = isError ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(0,255,136,0.5)";
  t.style.color      = isError ? "#f87171" : "#34d399";
  t.style.opacity    = "1";
  t.style.transform  = "translateX(-50%) translateY(0)";
  clearTimeout(t._t);
  t._t = setTimeout(function() {
    t.style.opacity   = "0";
    t.style.transform = "translateX(-50%) translateY(20px)";
  }, 2500);
}

function switchTab(name, btn) {
  document.querySelectorAll(".tab-content").forEach(function(t) { t.classList.remove("active"); });
  document.querySelectorAll(".tab-btn").forEach(function(b) { b.classList.remove("active"); });
  document.getElementById("tab-" + name).classList.add("active");
  btn.classList.add("active");
  if (name !== "scan") {
    ["modelBreakdown","confidenceSection","featuresGrid",
     "riskMeter","threatExplanation","resultActions"].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.classList.add("hidden");
    });
  }
  if (name === "history")  loadHistory();
  if (name === "settings") loadSettings();
}

function initTheme() {
  chrome.storage.local.get("theme", function(d) {
    var theme = d.theme || "dark";
    document.body.dataset.theme = theme;
    if (themeBtn) themeBtn.textContent = theme === "dark" ? "🌙" : "☀️";
  });
}
if (themeBtn) {
  themeBtn.addEventListener("click", function() {
    var next = document.body.dataset.theme === "dark" ? "light" : "dark";
    document.body.dataset.theme = next;
    themeBtn.textContent = next === "dark" ? "🌙" : "☀️";
    chrome.storage.local.set({ theme: next });
  });
}

function loadStats() {
  chrome.storage.local.get(["scanned","blocked","safe","securityScore"], function(d) {
    if (scannedCount) scannedCount.textContent = d.scanned || 0;
    if (blockedCount) blockedCount.textContent = d.blocked || 0;
    if (safeCount)    safeCount.textContent    = d.safe    || 0;
    updateScoreDisplay(d.securityScore || 0);
  });
}

function updateStats(isPhishing) {
  chrome.storage.local.get(["scanned","blocked","safe"], function(d) {
    var scanned = (d.scanned||0) + 1;
    var blocked = isPhishing ? (d.blocked||0) + 1 : (d.blocked||0);
    var safe    = !isPhishing ? (d.safe||0) + 1   : (d.safe||0);
    chrome.storage.local.set({ scanned: scanned, blocked: blocked, safe: safe });
    if (scannedCount) scannedCount.textContent = scanned;
    if (blockedCount) blockedCount.textContent = blocked;
    if (safeCount)    safeCount.textContent    = safe;
  });
}

function updateScoreDisplay(score) {
  if (scoreNum) scoreNum.textContent = score;
  if (scoreLevel) {
    var levels = [[0,"ROOKIE"],[100,"AGENT"],[500,"HUNTER"],[1000,"GUARDIAN"],[2000,"ELITE"],[5000,"LEGEND"]];
    var lv = levels[0][1];
    for (var i = 0; i < levels.length; i++) { if (score >= levels[i][0]) lv = levels[i][1]; }
    scoreLevel.textContent = lv;
  }
}

function resetStats() {
  var btn = document.getElementById("btn-reset-stats");
  if (!btn) return;
  if (btn.dataset.confirming === "1") {
    chrome.storage.local.set({ scanned:0, blocked:0, safe:0, securityScore:0, sessionBlocked:0, weeklyBlocked:0 });
    loadStats();
    chrome.action.setBadgeText({ text:"" });
    btn.textContent = "🗑 RESET STATS";
    btn.dataset.confirming = "0";
    showToast("Stats reset ✓");
  } else {
    btn.textContent = "⚠️ CONFIRM RESET?";
    btn.dataset.confirming = "1";
    setTimeout(function() { btn.textContent = "🗑 RESET STATS"; btn.dataset.confirming = "0"; }, 3000);
  }
}

function animateProgress(callback) {
  var p = 0;
  var iv = setInterval(function() {
    p += Math.random() * 12;
    if (p >= 90) { clearInterval(iv); callback(); }
    if (scanProgress) scanProgress.style.width = Math.min(p, 90) + "%";
  }, 100);
}

function showRiskMeter(confidence, isPhishing) {
  if (!riskMeter) return;
  riskMeter.classList.remove("hidden");
  var score = isPhishing ? confidence : (100 - confidence);
  if (riskFill)  riskFill.style.width  = score + "%";
  if (riskLabel) riskLabel.textContent = score;
  if (score >= 70) {
    if (riskFill)  riskFill.style.background = "linear-gradient(90deg,#ef4444,#f97316)";
    if (riskLabel) riskLabel.style.color     = "#f87171";
  } else if (score >= 40) {
    if (riskFill)  riskFill.style.background = "linear-gradient(90deg,#f59e0b,#fbbf24)";
    if (riskLabel) riskLabel.style.color     = "#fbbf24";
  } else {
    if (riskFill)  riskFill.style.background = "linear-gradient(90deg,#10b981,#34d399)";
    if (riskLabel) riskLabel.style.color     = "#34d399";
  }
}

function buildExplanation(data) {
  if (!data || !data.features) return "";
  var f  = data.features;
  var ns = data.new_signals || {};
  var reasons = [];

  if (f.suspicious_tld)                          reasons.push("suspicious TLD");
  if (f.brand_impersonation)                     reasons.push("brand impersonation detected");
  if (f.high_entropy_domain)                     reasons.push("algorithmically generated domain");
  if (f.has_ip)                                  reasons.push("IP address used as domain");
  if (f.has_at)                                  reasons.push("@ symbol in URL");
  if (!f.is_https)                               reasons.push("no HTTPS");
  if (f.has_redirect)                            reasons.push("suspicious redirect");
  if (f.suspicious_keywords)                     reasons.push("phishing keywords in URL");
  if (f.is_new_domain && f.domain_age_days > -1) reasons.push("new domain (" + f.domain_age_days + " days old)");
  if (f.subdomain_count > 3)                     reasons.push(f.subdomain_count + " subdomains");
  if (f.url_length > 100)                        reasons.push("very long URL (" + f.url_length + " chars)");
  if (ns.typosquatting   || f.typosquatting)     reasons.push("typosquatting — mimics a trusted brand");
  if (ns.homograph_attack|| f.homograph_attack)  reasons.push("homograph/punycode attack");
  if (ns.gsb_flagged     || f.gsb_flagged)       reasons.push("flagged by Google Safe Browsing");
  if (ns.redirect_suspicious)                    reasons.push("suspicious redirect chain (" + ns.redirect_hops + " hops)");
  if (ns.high_risk_country)                      reasons.push("hosted in high-risk country");
  if (ns.is_proxy_hosting)                       reasons.push("hosted on proxy/datacenter");
  if (f.title_brand_mismatch)                    reasons.push("page title impersonates a brand");
  if (f.form_external_action)                    reasons.push("form submits to external domain");
  if (data.models && data.models.virustotal === "PHISHING")
    reasons.push("flagged by VirusTotal (" + ((data.virustotal && data.virustotal.vt_ratio) || "") + ")");
  if (data.weighted_score)
    reasons.push("threat score: " + (data.weighted_score * 100).toFixed(1) + "%");

  if (reasons.length === 0) return "";
  return "⚠️ Flagged: " + reasons.slice(0, 4).join(", ");
}

function renderFeatures(features) {
  if (!featuresGrid) return;
  featuresGrid.innerHTML = "";
  var labels = {
    url_length:"URL LENGTH", has_ip:"IP ADDRESS", has_at:"@ SYMBOL",
    is_https:"HTTPS", suspicious_keywords:"KEYWORDS", dot_count:"DOT COUNT",
    subdomain_count:"SUBDOMAINS", has_redirect:"REDIRECT", suspicious_tld:"SUSP TLD",
    brand_impersonation:"BRAND IMPERSON", high_entropy_domain:"HIGH ENTROPY",
    domain_entropy:"ENTROPY", typosquatting:"TYPOSQUAT", homograph_attack:"HOMOGRAPH",
    gsb_flagged:"GOOGLE GSB", high_risk_country:"RISK COUNTRY", is_proxy_hosting:"PROXY HOST"
  };
  for (var key in features) {
    if (!labels[key]) continue;
    var value = features[key];
    var item  = document.createElement("div");
    item.className = "fi";
    var dv, sc;
    if (typeof value === "boolean") {
      var badTrue  = ["has_ip","has_at","suspicious_keywords","has_redirect","suspicious_tld",
                      "brand_impersonation","high_entropy_domain","typosquatting",
                      "homograph_attack","gsb_flagged","high_risk_country","is_proxy_hosting"];
      var goodTrue = ["is_https"];
      if (goodTrue.indexOf(key) >= 0)    { sc = value ? "ok"  : "bad"; dv = value ? "YES ✓" : "NO ✗"; }
      else if (badTrue.indexOf(key) >= 0){ sc = value ? "bad" : "ok";  dv = value ? "YES ✗" : "NO ✓"; }
      else                               { sc = "neutral";              dv = value ? "YES"   : "NO";   }
    } else {
      if (key === "url_length")           sc = value > 75  ? "bad" : value > 50 ? "neutral" : "ok";
      else if (key === "dot_count")       sc = value > 4   ? "bad" : value > 2  ? "neutral" : "ok";
      else if (key === "subdomain_count") sc = value > 3   ? "bad" : value > 1  ? "neutral" : "ok";
      else if (key === "domain_entropy")  sc = value > 3.5 ? "bad" : "ok";
      else sc = "neutral";
      dv = typeof value === "number" ? parseFloat(value.toFixed(3)) : value;
    }
    item.innerHTML = '<div class="fi-lbl">' + labels[key] + '</div><div class="fi-val ' + sc + '">' + dv + '</div>';
    featuresGrid.appendChild(item);
  }
  var scanTab = document.getElementById("tab-scan");
  if (scanTab && scanTab.classList.contains("active")) {
    featuresGrid.classList.remove("hidden");
  }
}

function renderModelBreakdown(data) {
  var bd     = document.getElementById("modelBreakdown");
  var rfEl   = document.getElementById("rfResult");
  var lstmEl = document.getElementById("lstmResult");
  var vtEl   = document.getElementById("vtResult");
  var gsbEl  = document.getElementById("gsbResult");
  if (!bd) return;

  var models = data.models     || {};
  var vt     = data.virustotal || {};

  function setV(el, v) {
    if (!el) return;
    var isN = !v || v === "unavailable" || v === "UNAVAILABLE" || v === "N/A" || v === "TIMEOUT";
    el.textContent = isN ? "N/A" : v;
    el.className   = "mi-val " + (isN ? "na" : v === "PHISHING" ? "danger" : "safe");
  }

  setV(rfEl,   models.random_forest);
  setV(lstmEl, models.lstm);

  var vtAvail = vt.vt_result && vt.vt_result !== "UNAVAILABLE" && vt.vt_result !== "TIMEOUT";
  if (vtEl) {
    if (vtAvail) {
      vtEl.textContent = vt.vt_ratio || vt.vt_result;
      vtEl.className   = "mi-val " + (vt.positives > 0 ? "danger" : "safe");
    } else {
      vtEl.textContent = "N/A";
      vtEl.className   = "mi-val na";
    }
  }

  setV(gsbEl, models.google_safebrowsing);

  var scanTab = document.getElementById("tab-scan");
  if (scanTab && scanTab.classList.contains("active")) {
    bd.classList.remove("hidden");
  }
}

function showResult(data) {
  if (scanProgress) scanProgress.style.width = "100%";
  currentResult = data;

  var scanTabActive = document.getElementById("tab-scan") &&
                      document.getElementById("tab-scan").classList.contains("active");

  if (data.whitelisted) {
    setResultUI("safe", "✅", "WHITELISTED DOMAIN", "Trusted domain — always safe.", data.confidence || 100);
    if (scanTabActive && resultActions) resultActions.classList.remove("hidden");
    updateStats(false);
    return;
  }

  if (data.skipped) {
    setResultUI("safe", "✅", "INTERNAL PAGE", "Internal URL — not scanned.", 100);
    return;
  }

  var isPhishing = data.result === "PHISHING";
  var conf       = data.confidence || 0;

  setResultUI(
    isPhishing ? "danger" : "safe",
    isPhishing ? "🚨"     : "✅",
    isPhishing ? "PHISHING DETECTED" : "SITE IS SAFE",
    isPhishing ? "Do not enter credentials on this site!" : "No phishing indicators found.",
    conf
  );

  if (scanTabActive) showRiskMeter(conf, isPhishing);

  var exp = buildExplanation(data);
  if (threatExplanation) {
    if (exp && isPhishing && scanTabActive) {
      threatExplanation.textContent = exp;
      threatExplanation.classList.remove("hidden");
    } else {
      threatExplanation.classList.add("hidden");
    }
  }

  if (scanTabActive && resultActions) resultActions.classList.remove("hidden");

  if (scanTabActive && confidenceSection) {
    confidenceSection.classList.remove("hidden");
    if (confPercent) confPercent.textContent = conf + "%";
    if (confFill) {
      confFill.style.width      = conf + "%";
      confFill.style.background = isPhishing
        ? "linear-gradient(90deg,#ef4444,#f97316)"
        : "linear-gradient(90deg,#10b981,#34d399)";
    }
  }

  renderModelBreakdown(data);
  if (data.features) renderFeatures(data.features);
  updateStats(isPhishing);
}

function setResultUI(cls, icon, title, sub, conf) {
  var scanAnim = document.getElementById("scanAnim");
  var iconWrap = document.getElementById("resultIconWrap");
  if (scanAnim) scanAnim.classList.add("hidden");
  if (iconWrap) iconWrap.classList.remove("hidden");
  if (resultBox)      resultBox.className        = "result " + cls;
  if (resultIcon)     resultIcon.textContent     = icon;
  if (resultTitle)    resultTitle.textContent    = title;
  if (resultSubtitle) resultSubtitle.textContent = sub;
}

function showError(msg) {
  if (scanProgress) scanProgress.style.width = "100%";
  var scanAnim = document.getElementById("scanAnim");
  var iconWrap = document.getElementById("resultIconWrap");
  if (scanAnim) scanAnim.classList.add("hidden");
  if (iconWrap) iconWrap.classList.remove("hidden");
  if (resultBox)      resultBox.className        = "result warning";
  if (resultIcon)     resultIcon.textContent     = "⚠️";
  if (resultTitle)    resultTitle.textContent    = "BACKEND OFFLINE";
  if (resultSubtitle) resultSubtitle.textContent = msg || "Check your connection";
  if (riskMeter)      riskMeter.classList.add("hidden");
  if (resultActions)  resultActions.classList.add("hidden");
}

function scanURL(url) {
  currentUrl = url;
  if (urlDisplay) urlDisplay.textContent = url.length > 45 ? url.substring(0,45) + "..." : url;

  var scanAnim = document.getElementById("scanAnim");
  var iconWrap = document.getElementById("resultIconWrap");
  var bd       = document.getElementById("modelBreakdown");

  if (scanAnim) scanAnim.classList.remove("hidden");
  if (iconWrap) iconWrap.classList.add("hidden");
  if (resultBox)        resultBox.className        = "result scanning";
  if (resultTitle)      resultTitle.textContent    = "SCANNING...";
  if (resultSubtitle)   resultSubtitle.textContent = "RF · Neural Net · VirusTotal · GSB";
  if (confidenceSection)confidenceSection.classList.add("hidden");
  if (featuresGrid)     featuresGrid.classList.add("hidden");
  if (riskMeter)        riskMeter.classList.add("hidden");
  if (threatExplanation)threatExplanation.classList.add("hidden");
  if (resultActions)    resultActions.classList.add("hidden");
  if (bd)               bd.classList.add("hidden");
  if (scanProgress)     scanProgress.style.width = "0%";

  animateProgress(function() {
    chrome.runtime.sendMessage({ type:"SCAN_URL", url:url }, function(response) {
      if (chrome.runtime.lastError || !response || !response.success) {
        showError("Cannot connect to backend");
        return;
      }
      showResult(response.data);
    });
  });
}

function getCurrentTabAndScan() {
  chrome.tabs.query({ active:true, currentWindow:true }, function(tabs) {
    var url  = (tabs[0] && tabs[0].url) ? tabs[0].url : "";
    var skip = ["chrome://","about:","chrome-extension://","moz-extension://","file://"];
    for (var i = 0; i < skip.length; i++) {
      if (url.indexOf(skip[i]) === 0) {
        showError("Open a website to scan");
        if (urlDisplay) urlDisplay.textContent = "No webpage active";
        return;
      }
    }
    if (!url) { showError("No URL detected"); return; }
    scanURL(url);
  });
}

function reportUrl(label) {
  if (!currentUrl) return;
  chrome.runtime.sendMessage({ type:"REPORT_URL", url:currentUrl, label:label, note:"" }, function(r) {
    if (r && r.success) showToast("Reported as " + label.toUpperCase() + " ✓");
    else showToast("Could not reach backend", true);
  });
}

function shareWarning() {
  if (!currentUrl || !currentResult) return;
  var isPhishing = currentResult.result === "PHISHING";
  var conf       = currentResult.confidence || "";
  var msg = isPhishing
    ? "⚠️ PhishGuard Alert!\nPhishing site detected: " + currentUrl + "\nConfidence: " + conf + "%\nDo NOT enter credentials!\nStay safe online."
    : "✅ PhishGuard confirmed safe: " + currentUrl;
  chrome.tabs.create({ url: "https://wa.me/?text=" + encodeURIComponent(msg) });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

function loadHistory() {
  var list = document.getElementById("historyList");
  if (!list) return;
  list.innerHTML = '<div class="hist-empty">Loading...</div>';
  chrome.runtime.sendMessage({ type:"GET_HISTORY", limit:15 }, function(r) {
    if (!r || !r.success || !r.data || !r.data.length) {
      list.innerHTML = '<div class="hist-empty">NO SCAN HISTORY YET</div>';
      return;
    }
    list.innerHTML = "";
    r.data.forEach(function(item) {
      var conf    = item.confidence || 0;
      var ts      = item.timestamp ? item.timestamp.substring(0,16) : "";
      var vtRatio = item.vt_ratio && item.vt_ratio !== "N/A" ? " · VT:" + escHtml(item.vt_ratio) : "";
      var div = document.createElement("div");
      div.className = "hist-item";
      div.innerHTML =
          '<div class="hist-dot ' + escHtml(item.result) + '"></div>'
        + '<div class="hist-info">'
          + '<div class="hist-url">' + escHtml(item.url) + '</div>'
          + '<div class="hist-meta">' + escHtml(ts) + ' · ' + conf + '%' + vtRatio + '</div>'
        + '</div>'
        + '<span class="hist-badge ' + escHtml(item.result) + '">' + escHtml(item.result) + '</span>';
      div.addEventListener("click", (function(url) {
        return function() { rescanFromHistory(url); };
      })(item.url));
      list.appendChild(div);
    });
  });
}

function rescanFromHistory(url) {
  document.querySelectorAll(".tab-btn").forEach(function(b) { b.classList.remove("active"); });
  document.querySelectorAll(".tab-content").forEach(function(t) { t.classList.remove("active"); });
  var firstTab = document.querySelector(".tab-btn");
  if (firstTab) firstTab.classList.add("active");
  var scanTab = document.getElementById("tab-scan");
  if (scanTab) scanTab.classList.add("active");
  scanURL(url);
}

function loadSettings() {
  chrome.storage.local.get(["settings","apiUrl"], function(d) {
    var s = d.settings || {};
    function setChk(id, val) { var e = document.getElementById(id); if (e) e.checked = val !== false; }
    setChk("set-autoScan",      s.autoScan      !== false);
    setChk("set-vtEnabled",     s.vtEnabled     !== false);
    setChk("set-autoBlock",     s.autoBlock     === true);
    setChk("set-notifications", s.notifications !== false);
    var sens = document.getElementById("set-sensitivity");
    if (sens) sens.value = s.sensitivity || "medium";
  });
  checkApi();
}

function saveSetting(key, value) {
  chrome.storage.local.get("settings", function(d) {
    var s  = d.settings || {};
    s[key] = value;
    chrome.storage.local.set({ settings: s });
  });
}

function checkApi() {
  var el = document.getElementById("api-status");
  if (!el) return;
  el.textContent = "Checking...";
  chrome.runtime.sendMessage({ type:"PING_API" }, function(r) {
    if (r && r.success && r.data) {
      var d = r.data;
      el.textContent = "✅ Online · " +
        (d.feature_count || 42) + " features · " +
        (d.rf_model  ? "RF✓"  : "RF✗")  + " " +
        (d.nn_model  ? "NN✓"  : "NN✗")  + " " +
        (d.vt_enabled? "VT✓"  : "VT✗")  + " " +
        (d.gsb_enabled?"GSB✓" : "GSB✗");
      el.style.color = "#34d399";
    } else {
      el.textContent = "❌ Offline — check Hugging Face Space";
      el.style.color = "#f87171";
    }
  });
}

(function init() {
  initTheme();
  loadStats();
  getCurrentTabAndScan();

  if (rescanBtn) rescanBtn.addEventListener("click", getCurrentTabAndScan);

  var tabScan     = document.getElementById("tab-btn-scan");
  var tabHistory  = document.getElementById("tab-btn-history");
  var tabSettings = document.getElementById("tab-btn-settings");
  if (tabScan)     tabScan.addEventListener("click",     function() { switchTab("scan",     this); });
  if (tabHistory)  tabHistory.addEventListener("click",  function() { switchTab("history",  this); });
  if (tabSettings) tabSettings.addEventListener("click", function() { switchTab("settings", this); });

  var histRefreshBtn = document.getElementById("histRefreshBtn");
  if (histRefreshBtn) histRefreshBtn.addEventListener("click", loadHistory);

  var btnSafe  = document.getElementById("btn-report-safe");
  var btnPhish = document.getElementById("btn-report-phish");
  var btnShare = document.getElementById("btn-share");

  if (btnSafe)  btnSafe.addEventListener("click",  function() { if (!currentUrl) { showToast("No URL to report", true); return; } reportUrl("safe"); });
  if (btnPhish) btnPhish.addEventListener("click", function() { if (!currentUrl) { showToast("No URL to report", true); return; } reportUrl("phishing"); });
  if (btnShare) btnShare.addEventListener("click", function() { shareWarning(); });

  var intelBtn     = document.getElementById("intelBtn");
  var dashboardBtn = document.getElementById("dashboardBtn");
  if (intelBtn)     intelBtn.addEventListener("click",     function() { chrome.tabs.create({ url: HF_DASHBOARD }); });
  if (dashboardBtn) dashboardBtn.addEventListener("click", function() { chrome.tabs.create({ url: HF_DASHBOARD }); });

  [["set-autoScan","autoScan"],["set-vtEnabled","vtEnabled"],
   ["set-autoBlock","autoBlock"],["set-notifications","notifications"]].forEach(function(p) {
    var el = document.getElementById(p[0]);
    if (el) el.addEventListener("change", function() { saveSetting(p[1], this.checked); });
  });

  var sensEl = document.getElementById("set-sensitivity");
  if (sensEl) sensEl.addEventListener("change", function() { saveSetting("sensitivity", this.value); });

  var apiBtn = document.getElementById("btn-check-api");
  if (apiBtn) apiBtn.addEventListener("click", checkApi);

  var resetBtn = document.getElementById("btn-reset-stats");
  if (resetBtn) resetBtn.addEventListener("click", resetStats);
})();