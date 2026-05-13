const API = 'http://localhost:8000';

const VERDICT_CONFIG = {
  SAFE:       { icon: '✅', color: '#00FF88', cls: 'verdict-safe' },
  SUSPICIOUS: { icon: '⚠️', color: '#FFD700', cls: 'verdict-suspicious' },
  SCAM:       { icon: '🚨', color: '#FF4757', cls: 'verdict-scam' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  loadStats();
  await initCurrentTab();

  document.getElementById('checkPageBtn').addEventListener('click', checkCurrentPage);
  document.getElementById('quickScanBtn').addEventListener('click', quickScan);
  document.getElementById('quickInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') quickScan();
  });

  // Check if we have a pre-loaded URL from context menu
  chrome.storage.session.get(['pendingUrl'], (data) => {
    if (data.pendingUrl) {
      document.getElementById('quickInput').value = data.pendingUrl;
      chrome.storage.session.remove(['pendingUrl']);
      quickScan();
    }
  });
});

async function initCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      const urlEl = document.getElementById('currentUrl');
      const displayUrl = tab.url.length > 45 ? tab.url.substring(0, 45) + '...' : tab.url;
      urlEl.textContent = displayUrl;
      urlEl.title = tab.url;
      urlEl.dataset.fullUrl = tab.url;
    }
  } catch {
    document.getElementById('currentUrl').textContent = 'Could not get page URL';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Scan functions
// ─────────────────────────────────────────────────────────────────────────────

async function checkCurrentPage() {
  const urlEl = document.getElementById('currentUrl');
  const url = urlEl.dataset.fullUrl || urlEl.textContent;
  if (!url || url === 'Loading...' || url === 'Could not get page URL') return;

  showLoading(true);
  try {
    const result = await scanUrl(url);
    showResult(result, 'resultArea', 'resultCard', 'resultIcon', 'resultVerdict', 'resultConfidence', 'resultReasons');
  } catch (err) {
    showOfflineError('resultArea');
  } finally {
    showLoading(false);
  }
}

async function quickScan() {
  const input = document.getElementById('quickInput').value.trim();
  if (!input) return;

  const quickResultArea = document.getElementById('quickResultArea');
  quickResultArea.classList.add('hidden');

  try {
    let result;
    if (input.startsWith('http://') || input.startsWith('https://') || input.startsWith('www.')) {
      result = await scanUrl(input);
    } else if (input.includes('@') && !input.includes(' ')) {
      // Likely UPI ID
      result = await scanUpi(input);
    } else {
      result = await scanText(input);
    }
    showResult(result, 'quickResultArea', 'quickResultCard', 'quickResultIcon', 'quickResultVerdict', null, 'quickResultReasons', true);
  } catch {
    showOfflineError('quickResultArea');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// API calls
// ─────────────────────────────────────────────────────────────────────────────

async function scanUrl(url) {
  const res = await fetch(`${API}/api/scan/url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error('API error');
  return res.json();
}

async function scanText(text) {
  const res = await fetch(`${API}/api/scan/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, type: 'sms' }),
  });
  if (!res.ok) throw new Error('API error');
  return res.json();
}

async function scanUpi(upiId) {
  const res = await fetch(`${API}/api/scan/upi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ upi_id: upiId }),
  });
  if (!res.ok) throw new Error('API error');
  return res.json();
}

async function loadStats() {
  try {
    const res = await fetch(`${API}/api/stats`);
    const data = await res.json();
    document.getElementById('statsText').textContent =
      `🛡️ ${(data.total_users_protected || 0).toLocaleString('en-IN')} Indians protected today`;
  } catch {
    // Backend offline — stats not critical
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UI helpers
// ─────────────────────────────────────────────────────────────────────────────

function showLoading(show) {
  const loadingArea = document.getElementById('loadingArea');
  const resultArea = document.getElementById('resultArea');
  const checkBtn = document.getElementById('checkPageBtn');

  if (show) {
    loadingArea.classList.remove('hidden');
    resultArea.classList.add('hidden');
    checkBtn.disabled = true;
  } else {
    loadingArea.classList.add('hidden');
    checkBtn.disabled = false;
  }
}

function showResult(result, areaId, cardId, iconId, verdictId, confId, reasonsId, mini = false) {
  const config = VERDICT_CONFIG[result.verdict] || VERDICT_CONFIG.SUSPICIOUS;
  const area = document.getElementById(areaId);
  const card = document.getElementById(cardId);
  const icon = document.getElementById(iconId);
  const verdict = document.getElementById(verdictId);
  const reasons = document.getElementById(reasonsId);

  area.classList.remove('hidden');
  card.className = `result-card${mini ? ' mini' : ''} ${config.cls}`;
  icon.textContent = config.icon;
  verdict.textContent = result.verdict;
  verdict.style.color = config.color;

  if (confId) {
    const conf = document.getElementById(confId);
    conf.textContent = `Confidence: ${result.confidence}%`;
  }

  const reasonList = result.reasons || result.reasons_english || [];
  reasons.innerHTML = reasonList.slice(0, 3).map(r =>
    `<div class="reason-item"><span style="color:${config.color}">›</span><span>${r}</span></div>`
  ).join('');
}

function showOfflineError(areaId) {
  const area = document.getElementById(areaId);
  area.classList.remove('hidden');
  area.innerHTML = `
    <div class="offline-banner">
      ⚠️ Backend offline<br/>
      <small>Start the PhishGuard server on port 8000</small>
    </div>
  `;
}
