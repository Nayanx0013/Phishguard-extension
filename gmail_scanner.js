

var scanned = new Map();

function makeShield(result) {
  var span = document.createElement("span");
  span.style.cssText = [
    "display:inline-flex","align-items:center","margin-left:5px",
    "cursor:pointer","font-size:13px","vertical-align:middle",
    "transition:opacity .2s"
  ].join(";");
  updateShield(span, result);
  return span;
}

function updateShield(span, result, data) {
  var conf = data && data.confidence ? " ("+data.confidence+"%)" : "";
  var vtr  = data && data.virustotal && data.virustotal.vt_ratio !== "N/A"
    ? " · VT:"+data.virustotal.vt_ratio : "";

  if (result === "PHISHING") {
    span.textContent = "🚨";
    span.title       = "⚠️ PhishGuard: PHISHING DETECTED"+conf+vtr;
  } else if (result === "SAFE") {
    span.textContent = "✅";
    span.title       = "✅ PhishGuard: Safe link"+conf+vtr;
  } else {
    span.textContent = "🛡️";
    span.title       = "🛡️ PhishGuard: Scanning...";
  }
}

function scanLink(link) {
  var url = link.href;
  if (!url || !url.startsWith("http") || scanned.has(url)) return;
  scanned.set(url, "pending");

  var shield = makeShield("pending");
  link.parentNode && link.after(shield);

  // Route through background.js → POST /predict on Railway
  chrome.runtime.sendMessage({ type:"SCAN_URL", url:url }, function(response) {
    if (chrome.runtime.lastError || !response || !response.success) {
      scanned.set(url, "error");
      updateShield(shield, "error");
      shield.title = "PhishGuard: Backend unreachable";
      // Retry once after 5s
      setTimeout(function() {
        if (scanned.get(url) === "error") {
          scanned.delete(url);
          link.dataset.pgScanned = "";
        }
      }, 5000);
      return;
    }

    var data   = response.data;
    var result = data.result; // "SAFE" or "PHISHING"
    scanned.set(url, result);
    updateShield(shield, result, data);

    if (result === "PHISHING") {
      // Strike through phishing links in Gmail
      link.style.cssText = "color:#ef4444!important;text-decoration:line-through!important;opacity:0.7!important;";

      // Click on shield opens warning page
      shield.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        var conf = data.confidence || 0;
        chrome.runtime.sendMessage({
          type: "SCAN_URL",
          url:  "chrome-extension://warning?url="+encodeURIComponent(url)+"&conf="+conf
        });
        // Open warning page in new tab
        window.open(
          chrome.runtime.getURL("warning.html") +
          "?url=" + encodeURIComponent(url) +
          "&conf=" + conf,
          "_blank"
        );
      });
    }
  });
}

function scanAllLinks() {
 
  var selectors = [
    ".a3s a[href]",
    ".gmail_quote a[href]",
    "[data-message-id] a[href]",
    ".ii.gt a[href]"
  ];
  selectors.forEach(function(sel) {
    document.querySelectorAll(sel).forEach(function(link) {
      if (!link.dataset.pgScanned && link.href && link.href.startsWith("http")) {
        link.dataset.pgScanned = "1";
        scanLink(link);
      }
    });
  });
}


var observer = new MutationObserver(function() {
  scanAllLinks();
});
observer.observe(document.body, { childList:true, subtree:true });

// Initial scan after Gmail loads
setTimeout(scanAllLinks, 2000);