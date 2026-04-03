var params     = new URLSearchParams(window.location.search);
var blockedUrl = params.get("url")      || "Unknown URL";
var confParam  = params.get("conf")     || null;
var source     = params.get("source")   || "ml";
var verdict    = params.get("verdict")  || "PHISHING";

document.getElementById("blockedUrl").textContent = blockedUrl;

// ── SUSPICIOUS yellow state ───────────────────────────────────────────────────
if (verdict === "SUSPICIOUS") {
  var card  = document.querySelector(".card");
  var h1    = document.querySelector("h1");
  var sub   = document.querySelector(".sub");
  var shield = document.querySelector(".shield");
  if (card)   { card.style.borderColor  = "rgba(255,170,0,0.4)"; card.style.boxShadow = "0 0 60px rgba(255,170,0,0.15)"; }
  if (h1)     { h1.textContent = "SUSPICIOUS SITE"; h1.style.color = "#ffaa00"; }
  if (sub)    { sub.textContent = "PhishGuard detected risk signals — proceed with caution"; }
  if (shield) { shield.textContent = "⚠️"; }
  // Show proceed button immediately for SUSPICIOUS (no double-click needed)
  var proceedBtn = document.getElementById("btnProceed");
  if (proceedBtn) {
    proceedBtn.style.borderColor = "rgba(255,170,0,0.4)";
    proceedBtn.style.color       = "#ffaa00";
  }
  var blob1 = document.querySelector(".blob1");
  if (blob1) blob1.style.background = "radial-gradient(circle,rgba(255,170,0,0.3),transparent 70%)";
}
// ─────────────────────────────────────────────────────────────────────────────

if (confParam) {
  document.getElementById("confBadge").textContent = "Confidence: " + confParam + "%";
} else {
  chrome.storage.local.get("apiUrl", function(d) {
    var base = d.apiUrl || "https://nayanx0013-phishguard-extension.hf.space";
    fetch(base + "/predict", {
      method:  "POST",
      headers: { "Content-Type":"application/json" },
      body:    JSON.stringify({ url: blockedUrl })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var c = data.confidence || "High Risk";
      document.getElementById("confBadge").textContent = "Confidence: " + c + "%";

      var reasons = [];

      if (data.models && data.models.random_forest === "PHISHING")
        reasons.push("ML Random Forest model flagged this URL");
      if (data.models && data.models.lstm === "PHISHING")
        reasons.push("Neural Network flagged this URL");
      if (data.virustotal && data.virustotal.vt_result === "PHISHING")
        reasons.push("VirusTotal: " + (data.virustotal.vt_ratio||"flagged") + " engines detected threat");
      if (data.models && data.models.google_safebrowsing === "PHISHING")
        reasons.push("Google Safe Browsing flagged this URL");
      if (data.weighted_score)
        reasons.push("Combined threat score: " + (data.weighted_score*100).toFixed(1) + "%");

      var ns = data.new_signals || {};
      if (ns.typosquatting)
        reasons.push("Typosquatting — domain mimics a trusted brand");
      if (ns.homograph_attack)
        reasons.push("Homograph attack — uses lookalike characters");
      if (ns.redirect_suspicious)
        reasons.push("Suspicious redirect chain (" + ns.redirect_hops + " hops)");
      if (ns.high_risk_country)
        reasons.push("Hosted in a high-risk country");
      if (ns.is_proxy_hosting)
        reasons.push("Hosted on anonymous proxy / datacenter");

      if (data.features) {
        var f = data.features;
        if (f.brand_impersonation)   reasons.push("Brand impersonation detected");
        if (f.suspicious_tld)        reasons.push("Suspicious domain extension");
        if (f.high_entropy_domain)   reasons.push("Algorithmically generated domain");
        if (f.has_ip)                reasons.push("IP address used instead of domain name");
        if (!f.is_https)             reasons.push("No HTTPS encryption");
        if (f.title_brand_mismatch)  reasons.push("Page title impersonates a known brand");
        if (f.form_external_action)  reasons.push("Login form submits data to external domain");
        if (f.is_new_domain && f.domain_age_days > -1)
          reasons.push("Very new domain (" + f.domain_age_days + " days old)");
      }

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

document.getElementById("btnBack").addEventListener("click", function() {
  chrome.tabs.getCurrent(function(tab) {
    if (tab) {
      chrome.tabs.update(tab.id, { url:"chrome://newtab/" });
    } else {
      window.location.href = "chrome://newtab/";
    }
  });
});

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
    // FIX H5: Store bypass with timestamp — expires after 24 hours
    chrome.storage.local.get("bypassList", function(d) {
      var list = d.bypassList || [];
      var now = Date.now();
      var BYPASS_TTL = 24 * 60 * 60 * 1000;
      // Clean expired entries
      list = list.filter(function(entry) {
        if (typeof entry === "string") return false;
        return (now - entry.ts) < BYPASS_TTL;
      });
      list.push({ url: blockedUrl, ts: now });
      chrome.storage.local.set({ bypassList:list }, function() {
        chrome.tabs.getCurrent(function(tab) {
          if (tab) {
            chrome.tabs.update(tab.id, { url:blockedUrl });
          } else {
            window.location.href = blockedUrl;
          }
        });
      });
    });
  }
});