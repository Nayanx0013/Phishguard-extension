

var params     = new URLSearchParams(window.location.search);
var blockedUrl = params.get("url")    || "Unknown URL";
var confParam  = params.get("conf")   || null;
var source     = params.get("source") || "ml";  // "ml" or "blocklist"

// Show blocked URL immediately
document.getElementById("blockedUrl").textContent = blockedUrl;

// Show confidence badge
if (confParam) {
  document.getElementById("confBadge").textContent = "Confidence: " + confParam + "%";
} else {
  // Fetch from backend to get full data
  chrome.storage.local.get("apiUrl", function(d) {
    var base = d.apiUrl || "https://nayanx0013-phishguard-extension.hf.space";
    fetch(base + "/predict", {
      method:  "POST",
      headers: { "Content-Type":"application/json" },
      body:    JSON.stringify({ url: blockedUrl })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      // confidence
      var c = data.confidence || "High Risk";
      document.getElementById("confBadge").textContent = "Confidence: " + c + "%";

      // Build reasons list from full /predict response
      var reasons = [];

      // models.random_forest from app.py
      if (data.models && data.models.random_forest === "PHISHING")
        reasons.push("ML Random Forest model flagged this URL");

      // models.lstm from app.py
      if (data.models && data.models.lstm === "PHISHING")
        reasons.push("Neural Network flagged this URL");

      // virustotal from app.py
      if (data.virustotal && data.virustotal.vt_result === "PHISHING")
        reasons.push("VirusTotal: " + (data.virustotal.vt_ratio||"flagged") + " engines detected threat");

      // Google Safe Browsing — new in v4.0
      if (data.models && data.models.google_safebrowsing === "PHISHING")
        reasons.push("Google Safe Browsing flagged this URL");

      // weighted_score from app.py
      if (data.weighted_score)
        reasons.push("Combined threat score: " + (data.weighted_score*100).toFixed(1) + "%");

      // new_signals — v4.0
      var ns = data.new_signals || {};
      if (ns.typosquatting)
        reasons.push("Typosquatting — domain mimics a trusted brand");
      if (ns.homograph_attack)
        reasons.push("Homograph attack — uses lookalike characters (e.g. pаypal)");
      if (ns.redirect_suspicious)
        reasons.push("Suspicious redirect chain (" + ns.redirect_hops + " hops)");
      if (ns.high_risk_country)
        reasons.push("Hosted in a high-risk country");
      if (ns.is_proxy_hosting)
        reasons.push("Hosted on anonymous proxy / datacenter");

      // features from app.py — 42 keys in v4.0
      if (data.features) {
        var f = data.features;
        if (f.brand_impersonation)   reasons.push("Brand impersonation detected");
        if (f.suspicious_tld)        reasons.push("Suspicious domain extension");
        if (f.high_entropy_domain)   reasons.push("Algorithmically generated domain");
        if (f.has_ip)                reasons.push("IP address used instead of domain name");
        if (!f.is_https)             reasons.push("No HTTPS encryption");
        if (f.title_brand_mismatch)  reasons.push("Page title impersonates a known brand");
        if (f.has_password_field && f.suspicious_tld)
          reasons.push("Password field on a suspicious domain");
        if (f.form_external_action)  reasons.push("Login form submits data to external domain");
        if (f.has_hidden_iframe)     reasons.push("Hidden iframe detected on page");
        if (f.is_new_domain && f.domain_age_days > -1)
          reasons.push("Very new domain (" + f.domain_age_days + " days old)");
        if (f.low_cert_history)
          reasons.push("Domain has very few SSL certificates issued (new/disposable)");
      }

      // Always add safety warnings
      reasons.push("Do not enter any personal information");
      reasons.push("Do not enter passwords or payment details");

      var ul = document.getElementById("reasonsList");
      ul.innerHTML = "";
      reasons.slice(0, 6).forEach(function(r) {
        var li = document.createElement("li");
        li.textContent = r;
        ul.appendChild(li);
      });
    })
    .catch(function() {
      document.getElementById("confBadge").textContent = "Confidence: High Risk";
    });
  });
}

// If blocked by user blocklist (not ML)
if (source === "blocklist") {
  var ul = document.getElementById("reasonsList");
  if (ul) {
    ul.innerHTML = "";
    ["You manually blocked this domain in PhishGuard settings",
     "Do not enter any personal information",
     "Do not enter passwords or payment details"].forEach(function(r) {
      var li = document.createElement("li");
      li.textContent = r;
      ul.appendChild(li);
    });
  }
}

// ── GO BACK TO SAFETY ────────────────────────────────────────────────────────
document.getElementById("btnBack").addEventListener("click", function() {
  chrome.tabs.getCurrent(function(tab) {
    chrome.tabs.update(tab.id, { url:"chrome://newtab/" });
  });
});

// ── TWO-CLICK PROCEED (no confirm() dialog) ───────────────────────────────────
var proceedBtn    = document.getElementById("btnProceed");
var proceedClicks = 0;
var proceedTimer  = null;

proceedBtn.addEventListener("click", function() {
  if (blockedUrl === "Unknown URL") return;
  proceedClicks++;

  if (proceedClicks === 1) {
    proceedBtn.textContent       = "⚠️ CLICK AGAIN TO CONFIRM";
    proceedBtn.style.borderColor = "rgba(239,68,68,0.6)";
    proceedBtn.style.color       = "#f87171";
    proceedTimer = setTimeout(function(){
      proceedClicks                = 0;
      proceedBtn.textContent       = "I understand the risk, proceed";
      proceedBtn.style.borderColor = "";
      proceedBtn.style.color       = "";
    }, 3000);
  } else {
    clearTimeout(proceedTimer);
    proceedClicks = 0;
    chrome.storage.local.get("bypassList", function(d) {
      var list = d.bypassList || [];
      if (!list.includes(blockedUrl)) list.push(blockedUrl);
      // Keep bypass for full session
      chrome.storage.local.set({ bypassList:list }, function() {
        chrome.tabs.getCurrent(function(tab) {
          chrome.tabs.update(tab.id, { url:blockedUrl });
        });
      });
    });
  }
});