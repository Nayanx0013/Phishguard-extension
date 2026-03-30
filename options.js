var HF_API = "https://nayanx0013-phishguard-extension.hf.space";

function showPage(name) {
  document.querySelectorAll('.page').forEach(function(p){ p.classList.add('hidden'); });
  document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('active'); });
  var page = document.getElementById('page-'+name);
  if (page) page.classList.remove('hidden');
  var nav = document.querySelector('[data-page="'+name+'"]');
  if (nav) nav.classList.add('active');
  if (name==='stats')     loadStats();
  if (name==='server')    pingServer();
  if (name==='whitelist') renderList('whitelist');
  if (name==='blocklist') renderList('blocklist');
  if (name==='retrain')   loadRetrainStatus();
}

function toast(msg, err) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className   = 'toast show' + (err?' error':'');
  setTimeout(function(){ t.className='toast'; }, 2500);
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  chrome.storage.local.set({ theme:theme }, function(){ toast('Theme saved ✓'); });
}

function loadAllSettings() {
  chrome.storage.local.get(['settings','theme','apiUrl','adminKey'], function(d) {
    var s = d.settings || {};
    function setChk(id, v){ var e=document.getElementById(id); if(e) e.checked=v!==false; }
    setChk('s-autoScan',      s.autoScan      !== false);
    setChk('s-vtEnabled',     s.vtEnabled     !== false);
    setChk('s-gmailScan',     s.gmailScan     !== false);
    setChk('s-autoBlock',     s.autoBlock     === true);
    setChk('s-notifications', s.notifications !== false);
    setChk('s-badge',         s.badge         !== false);
    var sens = document.getElementById('s-sensitivity');
    if (sens) sens.value = s.sensitivity || 'medium';
    var thr = document.getElementById('s-threshold');
    if (thr) {
      thr.value = s.threshold || 40;
      var tv = document.getElementById('thresholdVal');
      if (tv) tv.textContent = s.threshold || 40;
    }
    var thm = document.getElementById('s-theme');
    if (thm) thm.value = d.theme || 'dark';
    document.body.dataset.theme = d.theme || 'dark';
    var apiInp = document.getElementById('s-apiUrl');
    if (apiInp) apiInp.value = d.apiUrl || HF_API;
    var vtInp = document.getElementById('s-vtKey');
    if (vtInp && d.vtKey) vtInp.value = d.vtKey;
    var adminInp = document.getElementById('s-adminKey');
    if (adminInp && d.adminKey) adminInp.value = d.adminKey;
  });
  updateDashboardLinks();
}

function updateDashboardLinks() {
  chrome.storage.local.get('apiUrl', function(d) {
    var base = d.apiUrl || HF_API;
    document.querySelectorAll('.dashboard-link').forEach(function(a) {
      a.href = base + '/dashboard';
    });
  });
}

function save(key, value) {
  chrome.storage.local.get('settings', function(d) {
    var s  = d.settings || {};
    s[key] = value;
    chrome.storage.local.set({ settings:s }, function(){ toast('Saved ✓'); });
  });
}

function saveApiUrl() {
  var inp = document.getElementById('s-apiUrl');
  var val = inp ? inp.value.trim() : '';
  if (!val) return;
  val = val.replace(/\/+$/, '');
  chrome.storage.local.set({ apiUrl:val }, function(){
    toast('API URL saved ✓');
    pingServer();
    updateDashboardLinks();
  });
}

function saveAdminKey() {
  var inp = document.getElementById('s-adminKey');
  var val = inp ? inp.value.trim() : '';
  chrome.storage.local.set({ adminKey:val }, function(){
    toast(val ? 'Admin key saved ✓' : 'Admin key cleared ✓');
  });
}

function pingServer() {
  var dot  = document.getElementById('apiDot');
  var text = document.getElementById('apiStatusText');
  if (!dot) return;
  dot.className    = 'status-dot loading';
  text.textContent = 'Checking...';
  chrome.runtime.sendMessage({ type:'PING_API' }, function(r) {
    if (r && r.success && r.data) {
      var d = r.data;
      dot.className    = 'status-dot on';
      text.textContent = 'Online · '+
        (d.feature_count||28)+' features · '+
        (d.rf_model?'RF✓':'RF✗')+' '+
        (d.nn_model?'NN✓':'NN✗')+' '+
        (d.vt_enabled?'VT✓':'VT✗')+' · '+
        (d.threat_feeds||0).toLocaleString()+' threats';
      var fc = document.getElementById('featureCount');
      if (fc) fc.textContent = d.feature_count || 28;
    } else {
      dot.className    = 'status-dot off';
      text.textContent = 'Offline — check Hugging Face Space';
    }
  });
}

function reloadModels() {
  chrome.runtime.sendMessage({ type:'RELOAD_MODELS' }, function(r) {
    if (r && r.success && r.data) {
      toast('Models reloaded: RF='+r.data.rf+' NN='+r.data.nn+' ✓');
    } else if (r && r.data && r.data.error === 'Unauthorized — invalid or missing X-Admin-Key') {
      toast('Admin key required — set it in API Server settings', true);
    } else {
      toast('Failed — backend offline or wrong admin key', true);
    }
  });
}

function loadStats() {
  chrome.storage.local.get(['scanned','blocked','safe','securityScore'], function(d) {
    var sc    = d.scanned       || 0;
    var bl    = d.blocked       || 0;
    var sf    = d.safe          || 0;
    var score = d.securityScore || 0;
    function setText(id,v){ var e=document.getElementById(id); if(e) e.textContent=v; }
    setText('opt-scanned', sc);
    setText('opt-blocked', bl);
    setText('opt-safe',    sf);
    setText('opt-rate',    sc>0 ? Math.round(bl/sc*100)+'%' : '0%');
    setText('opt-scoreNum', score);
    var levels = [[0,'ROOKIE'],[100,'AGENT'],[500,'HUNTER'],[1000,'GUARDIAN'],[2000,'ELITE'],[5000,'LEGEND']];
    var lv = levels[0][1];
    for (var i=0;i<levels.length;i++) { if(score>=levels[i][0]) lv=levels[i][1]; }
    setText('opt-scoreLevel', lv);
    var bars = [[100,'prog1'],[500,'prog2'],[1000,'prog3'],[2000,'prog4']];
    bars.forEach(function(b) {
      var pb = document.getElementById(b[1]);
      if (pb) pb.style.width = Math.min(score/b[0]*100,100)+'%';
    });
  });
}

function resetStats() {
  var btn = document.getElementById('reset-stats-btn');
  if (!btn) return;
  if (btn.dataset.confirming==='1') {
    chrome.storage.local.set({ scanned:0, blocked:0, safe:0, securityScore:0, sessionBlocked:0, weeklyBlocked:0 });
    loadStats();
    toast('Stats reset ✓');
    btn.textContent = '🗑 RESET ALL STATS';
    btn.dataset.confirming = '0';
  } else {
    btn.textContent = '⚠️ CLICK AGAIN TO CONFIRM';
    btn.dataset.confirming = '1';
    setTimeout(function(){ btn.textContent='🗑 RESET ALL STATS'; btn.dataset.confirming='0'; }, 3000);
  }
}

function loadRetrainStatus() {
  chrome.runtime.sendMessage({ type:'RETRAIN_STATUS' }, function(r) {
    if (!r || !r.success || !r.data) return;
    var d = r.data;
    function setText(id,v){ var e=document.getElementById(id); if(e) e.textContent=v; }
    setText('rt-safe',    d.pending_safe_reports     || 0);
    setText('rt-phish',   d.pending_phishing_reports || 0);
    setText('rt-vsafe',   d.verified_safe_urls       || 0);
    setText('rt-vphish',  d.verified_phishing_urls   || 0);
    setText('rt-wl',      d.dynamic_whitelist_size   || 0);
    setText('rt-running', d.is_retraining ? 'YES' : 'NO');
    if (d.last_retrain_info) {
      var acc = d.last_retrain_info.accuracy;
      setText('rt-acc',    acc ? (acc*100).toFixed(1)+'%' : 'N/A');
      setText('rt-status', d.last_retrain_info.status || 'N/A');
    }
    if (d.thresholds) {
      setText('rt-thresh-safe',  d.thresholds.safe_reports_needed);
      setText('rt-thresh-phish', d.thresholds.phishing_reports_needed);
      setText('rt-thresh-min',   d.thresholds.min_to_trigger_retrain);
      setText('rt-thresh-acc',   d.thresholds.min_accuracy_to_replace
        ? (d.thresholds.min_accuracy_to_replace*100).toFixed(0)+'%' : 'N/A');
    }
  });
}

function triggerRetrain() {
  var btn = document.getElementById('retrain-trigger-btn');
  if (btn) { btn.textContent='⏳ RETRAINING...'; btn.disabled=true; }
  chrome.runtime.sendMessage({ type:'RETRAIN_TRIGGER' }, function(r) {
    if (r && r.success && r.data) {
      var d = r.data;
      if (d.status==='triggered')
        toast('Retrain started with '+d.count+' URLs ✓');
      else if (d.status==='already_running')
        toast('Retrain already running...', true);
      else
        toast(d.message || 'No data to retrain', true);
    } else if (r && r.data && r.data.error === 'Unauthorized — invalid or missing X-Admin-Key') {
      toast('Admin key required — set it in API Server settings', true);
    } else {
      toast('Backend offline or wrong admin key', true);
    }
    setTimeout(function(){
      if (btn) { btn.textContent='⚡ TRIGGER RETRAIN'; btn.disabled=false; }
      loadRetrainStatus();
    }, 2000);
  });
}

function renderList(type) {
  chrome.storage.local.get(type, function(d) {
    var list = d[type] || [];
    var elId = type==='whitelist'?'wl-list':'bl-list';
    var el   = document.getElementById(elId);
    if (!el) return;
    if (!list.length) { el.innerHTML='<div class="empty-msg">NO DOMAINS ADDED YET</div>'; return; }
    el.innerHTML = list.map(function(domain) {
      return '<div class="domain-tag"><span>'+domain+'</span>'+
        '<button class="del" data-domain="'+domain+'" data-type="'+type+'">×</button></div>';
    }).join('');
    el.querySelectorAll('.del').forEach(function(btn) {
      btn.addEventListener('click', function(){ removeFromList(this.dataset.type, this.dataset.domain); });
    });
  });
}

// ── UPDATED: addToList now syncs whitelist domains to backend server ──────────
function addToList(type) {
  var inpId = type==='whitelist'?'wl-input':'bl-input';
  var inp   = document.getElementById(inpId);
  if (!inp) return;
  var val = inp.value.trim().toLowerCase().replace(/^https?:\/\//,'').replace(/\/.*/,'');
  if (!val || !val.includes('.')) { toast('Enter valid domain e.g. example.com', true); return; }
  chrome.storage.local.get(type, function(d) {
    var list = d[type] || [];
    if (list.includes(val)) { toast('Already in list', true); return; }
    list.push(val);
    var update = {}; update[type]=list;
    chrome.storage.local.set(update, function(){
      inp.value=''; renderList(type); toast('Added: '+val+' ✓');
      // Sync to backend server if whitelist — no retrain triggered
      if (type === 'whitelist') {
        chrome.runtime.sendMessage({ type:'WHITELIST_ADD', domain: val }, function(r) {
          if (r && r.success) {
            toast('Synced to server ✓');
          } else {
            // Still saved locally — server sync failed silently
            toast('Saved locally (server sync failed)', false);
          }
        });
      }
    });
  });
}
// ─────────────────────────────────────────────────────────────────────────────

function removeFromList(type, domain) {
  chrome.storage.local.get(type, function(d) {
    var list = (d[type]||[]).filter(function(x){ return x!==domain; });
    var update = {}; update[type]=list;
    chrome.storage.local.set(update, function(){ renderList(type); toast('Removed: '+domain); });
  });
}

var clearConfirming = {};
function clearList(type) {
  var btnId = type==='whitelist'?'wl-clear-btn':'bl-clear-btn';
  var btn   = document.getElementById(btnId);
  if (!btn) return;
  if (clearConfirming[type]) {
    var update = {}; update[type]=[];
    chrome.storage.local.set(update, function(){ renderList(type); toast(type+' cleared ✓'); });
    btn.textContent = '🗑 CLEAR ALL';
    clearConfirming[type] = false;
  } else {
    clearConfirming[type] = true;
    btn.textContent = '⚠️ CONFIRM?';
    setTimeout(function(){ clearConfirming[type]=false; btn.textContent='🗑 CLEAR ALL'; }, 3000);
  }
}

function exportList(type) {
  chrome.storage.local.get(type, function(d) {
    var list = d[type] || [];
    var blob = new Blob([list.join('\n')], { type:'text/plain' });
    var a    = document.createElement('a');
    a.href   = URL.createObjectURL(blob);
    a.download = 'phishguard_'+type+'.txt';
    a.click();
  });
}

function exportCSV() {
  chrome.runtime.sendMessage({ type:'GET_HISTORY', limit:1000 }, function(r) {
    if (!r || !r.success || !r.data) { toast('Failed or no data', true); return; }
    var rows = r.data;
    var csv = ['URL,Result,RF Model,Neural Net,VT Result,VT Ratio,Confidence,Timestamp']
      .concat(rows.map(function(r) {
        return '"'+r.url+'",'
          +r.result+','
          +(r.ml_result||'N/A')+','
          +(r.lstm_result||'N/A')+','
          +(r.vt_result||'N/A')+','
          +(r.vt_ratio||'N/A')+','
          +(r.confidence||0)+'%,'
          +(r.timestamp||'');
      })).join('\n');
    var blob = new Blob([csv], { type:'text/csv' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'phishguard_history.csv';
    a.click();
    toast('CSV downloaded ✓');
  });
}

function exportJSON() {
  chrome.runtime.sendMessage({ type:'GET_HISTORY', limit:1000 }, function(r) {
    if (!r || !r.success || !r.data) { toast('Failed or no data', true); return; }
    var blob = new Blob([JSON.stringify(r.data,null,2)], { type:'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'phishguard_history.json';
    a.click();
    toast('JSON downloaded ✓');
  });
}

function exportSettings() {
  chrome.storage.local.get(null, function(d) {
    var blob = new Blob([JSON.stringify(d,null,2)], { type:'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'phishguard_settings.json';
    a.click();
    toast('Settings exported ✓');
  });
}

function importSettings(input) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);
      chrome.storage.local.set(data, function(){ loadAllSettings(); toast('Settings imported ✓'); });
    } catch(err) { toast('Invalid file', true); }
  };
  reader.readAsText(file);
}

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.nav-item[data-page]').forEach(function(item) {
    item.addEventListener('click', function(){ showPage(this.dataset.page); });
  });

  [['s-autoScan','autoScan'],['s-vtEnabled','vtEnabled'],['s-gmailScan','gmailScan']].forEach(function(p) {
    var el = document.getElementById(p[0]);
    if (el) el.addEventListener('change', function(){ save(p[1], this.checked); });
  });

  [['s-autoBlock','autoBlock'],['s-notifications','notifications'],['s-badge','badge']].forEach(function(p) {
    var el = document.getElementById(p[0]);
    if (el) el.addEventListener('change', function(){ save(p[1], this.checked); });
  });

  var sens = document.getElementById('s-sensitivity');
  if (sens) sens.addEventListener('change', function(){ save('sensitivity', this.value); });

  var thm = document.getElementById('s-theme');
  if (thm) thm.addEventListener('change', function(){ applyTheme(this.value); });

  var thr = document.getElementById('s-threshold');
  if (thr) thr.addEventListener('input', function(){
    var tv = document.getElementById('thresholdVal');
    if (tv) tv.textContent = this.value;
    save('threshold', parseInt(this.value));
  });

  var pingBtn   = document.getElementById('ping-btn');
  var reloadBtn = document.getElementById('reload-btn');
  var apiSave   = document.getElementById('api-save-btn');
  var adminSave = document.getElementById('admin-save-btn');
  if (pingBtn)   pingBtn.addEventListener('click',   pingServer);
  if (reloadBtn) reloadBtn.addEventListener('click', reloadModels);
  if (apiSave)   apiSave.addEventListener('click',   saveApiUrl);
  if (adminSave) adminSave.addEventListener('click', saveAdminKey);

  var wlAdd = document.getElementById('wl-add-btn');
  var wlExp = document.getElementById('wl-export-btn');
  var wlClr = document.getElementById('wl-clear-btn');
  if (wlAdd) wlAdd.addEventListener('click', function(){ addToList('whitelist'); });
  if (wlExp) wlExp.addEventListener('click', function(){ exportList('whitelist'); });
  if (wlClr) wlClr.addEventListener('click', function(){ clearList('whitelist'); });
  var wlInp = document.getElementById('wl-input');
  if (wlInp) wlInp.addEventListener('keydown', function(e){ if(e.key==='Enter') addToList('whitelist'); });

  var blAdd = document.getElementById('bl-add-btn');
  var blExp = document.getElementById('bl-export-btn');
  var blClr = document.getElementById('bl-clear-btn');
  if (blAdd) blAdd.addEventListener('click', function(){ addToList('blocklist'); });
  if (blExp) blExp.addEventListener('click', function(){ exportList('blocklist'); });
  if (blClr) blClr.addEventListener('click', function(){ clearList('blocklist'); });
  var blInp = document.getElementById('bl-input');
  if (blInp) blInp.addEventListener('keydown', function(e){ if(e.key==='Enter') addToList('blocklist'); });

  var resetBtn = document.getElementById('reset-stats-btn');
  if (resetBtn) resetBtn.addEventListener('click', resetStats);

  var rtBtn = document.getElementById('retrain-trigger-btn');
  if (rtBtn) rtBtn.addEventListener('click', triggerRetrain);

  var csvBtn    = document.getElementById('csv-btn');
  var jsonBtn   = document.getElementById('json-btn');
  var expCfgBtn = document.getElementById('export-cfg-btn');
  var impInp    = document.getElementById('import-input');
  if (csvBtn)    csvBtn.addEventListener('click',    exportCSV);
  if (jsonBtn)   jsonBtn.addEventListener('click',   exportJSON);
  if (expCfgBtn) expCfgBtn.addEventListener('click', exportSettings);
  if (impInp)    impInp.addEventListener('change',   function(){ importSettings(this); });

  loadAllSettings();
  pingServer();
});